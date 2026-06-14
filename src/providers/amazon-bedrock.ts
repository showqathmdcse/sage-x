// ============================================
// Amazon Bedrock Provider
// ============================================
import * as crypto from 'crypto';
import * as https from 'https';
import * as zlib from 'zlib';
import {
  IModelProvider,
  Message,
  ToolDefinition,
  StreamCallback,
  AppConfig,
} from '../types';

/**
 * Amazon Bedrock provider using direct HTTP calls with AWS Signature V4.
 * No SDK dependency — works through corporate proxies (Zscaler etc.)
 * by disabling TLS certificate verification on the request agent.
 */
export class AmazonBedrockProvider implements IModelProvider {
  name: 'amazon-bedrock' = 'amazon-bedrock';
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    const creds = this.config.credentials['amazon-bedrock'];
    return !!(creds?.accessKeyId && creds?.secretAccessKey && creds?.region);
  }

  async chat(
    messages: Message[],
    tools: ToolDefinition[],
    onStream?: StreamCallback
  ): Promise<Message> {
    const creds = this.config.credentials['amazon-bedrock']!;
    const region = creds.region;
    const modelId = this.config.activeModel;

    // Build Bedrock Converse API request body
    const systemPrompt = messages.find((m) => m.role === 'system');

    // Sanitize messages: ensure all tool calls have matching tool results
    const sanitized = this.sanitizeMessages(messages.filter((m) => m.role !== 'system'));
    const conversationMessages = this.buildBedrockMessages(sanitized);

    const body: any = {
      modelId,
      messages: conversationMessages,
      inferenceConfig: {
        maxTokens: this.config.maxOutputTokens,
        temperature: this.config.temperature,
      },
    };

    if (systemPrompt) {
      body.system = [{ text: systemPrompt.content }];
    }

    if (tools.length > 0) {
      body.toolConfig = {
        tools: tools.map((t) => ({
          toolSpec: {
            name: t.name,
            description: t.description,
            inputSchema: { json: t.parameters },
          },
        })),
      };
    }

    const endpoint = `bedrock-runtime.${region}.amazonaws.com`;
    const bodyStr = JSON.stringify(body);

    // Always use non-streaming for reliable tool call arguments.
    // Streaming binary parser can lose data on large tool args (e.g. file contents).
    // We emit the text content through onStream to keep the UX responsive.
    const result = await this.nonStreamRequest(endpoint, region, creds, bodyStr);

    if (onStream && result.content) {
      onStream(result.content);
    }

    return result;
  }

  // ─── Direct HTTPS requests with SigV4 ────────────────────────

  private async nonStreamRequest(
    endpoint: string,
    region: string,
    creds: any,
    bodyStr: string
  ): Promise<Message> {
    const reqPath = '/model/' + this.config.activeModel + '/converse';
    const headers = this.signRequest('POST', endpoint, reqPath, bodyStr, region, creds);

    const data = await this.httpsRequest(endpoint, reqPath, headers, bodyStr);

    let parsed: any;
    try {
      parsed = JSON.parse(data);
    } catch (err: any) {
      // If JSON parsing fails, the response might be binary/compressed
      throw new Error(
        `Failed to parse Bedrock response (${data.length} bytes, first 200: ${data.slice(0, 200)}): ${err.message}`
      );
    }

    return this.parseBedrockResponse(parsed);
  }

  private async streamRequest(
    endpoint: string,
    region: string,
    creds: any,
    bodyStr: string,
    onStream: StreamCallback
  ): Promise<Message> {
    const reqPath = '/model/' + this.config.activeModel + '/converse-stream';
    const headers = this.signRequest('POST', endpoint, reqPath, bodyStr, region, creds);

    return new Promise((resolve, reject) => {
      const agent = new https.Agent({ rejectUnauthorized: false });

      const req = https.request(
        {
          hostname: endpoint,
          port: 443,
          path: reqPath,
          method: 'POST',
          headers,
          agent,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            let errBody = '';
            res.on('data', (chunk) => (errBody += chunk.toString()));
            res.on('end', () => {
              reject(new Error(this.formatError(res.statusCode!, errBody, creds.region)));
            });
            return;
          }

          let fullContent = '';
          const toolCalls: Map<string, { id: string; name: string; args: string }> = new Map();
          let currentToolUseId = '';
          let usageData: any = null;
          let binaryBuffer = Buffer.alloc(0);

          res.on('data', (chunk: Buffer) => {
            binaryBuffer = Buffer.concat([binaryBuffer, Buffer.from(chunk)]);

            // Parse AWS Event Stream binary frames
            while (binaryBuffer.length >= 12) {
              const totalLength = binaryBuffer.readUInt32BE(0);
              const headersLength = binaryBuffer.readUInt32BE(4);

              if (binaryBuffer.length < totalLength) break; // wait for more data

              // Parse headers to get :event-type
              const headersStart = 12;
              const headersEnd = 12 + headersLength;
              const eventType = this.parseEventHeaders(binaryBuffer, headersStart, headersEnd);

              // Extract payload (between headers and message CRC)
              const payloadStart = headersEnd;
              const payloadEnd = totalLength - 4;

              if (payloadEnd > payloadStart) {
                try {
                  const payload = binaryBuffer.subarray(payloadStart, payloadEnd).toString('utf-8');
                  const data = JSON.parse(payload);

                  switch (eventType) {
                    case 'contentBlockDelta': {
                      const delta = data.delta;
                      if (delta?.text) {
                        fullContent += delta.text;
                        onStream(delta.text);
                      }
                      // Tool use input comes as string chunks of JSON
                      if (delta?.toolUse !== undefined && currentToolUseId && toolCalls.has(currentToolUseId)) {
                        const input = delta.toolUse.input;
                        if (typeof input === 'string') {
                          toolCalls.get(currentToolUseId)!.args += input;
                        } else if (input !== undefined && input !== null) {
                          // If it arrives as a full object (non-streaming), merge it
                          const tc = toolCalls.get(currentToolUseId)!;
                          tc.args = JSON.stringify(input);
                        }
                      }
                      break;
                    }
                    case 'contentBlockStart': {
                      if (data.start?.toolUse) {
                        const tu = data.start.toolUse;
                        currentToolUseId = tu.toolUseId;
                        toolCalls.set(currentToolUseId, {
                          id: tu.toolUseId,
                          name: tu.name,
                          args: '',
                        });
                      }
                      break;
                    }
                    case 'metadata': {
                      if (data.usage) {
                        usageData = data.usage;
                      }
                      break;
                    }
                  }
                } catch {
                  // skip non-JSON payloads
                }
              }

              // Advance buffer past this message
              binaryBuffer = binaryBuffer.subarray(totalLength);
            }
          });

          res.on('end', () => {
            const result: Message = { role: 'assistant', content: fullContent };
            if (usageData) {
              result.usage = {
                inputTokens: usageData.inputTokens || 0,
                outputTokens: usageData.outputTokens || 0,
              };
            }
            if (toolCalls.size > 0) {
              result.toolCalls = Array.from(toolCalls.values()).map((tc) => {
                let args: Record<string, any> = {};
                try {
                  args = JSON.parse(tc.args || '{}');
                } catch {
                  // If args are malformed, try to salvage or use empty
                  args = { _raw: tc.args };
                }
                return { id: tc.id, name: tc.name, arguments: args };
              });
            }
            resolve(result);
          });

          res.on('error', reject);
        }
      );

      req.on('error', (err: any) => {
        reject(new Error(this.formatError(0, err.message, creds.region)));
      });

      req.write(bodyStr);
      req.end();
    });
  }

  /**
   * Parse AWS Event Stream headers to extract :event-type.
   * Header format: [name_len:1][name:N][type:1][value_len:2][value:N]
   * Type 7 = string (with 2-byte length prefix)
   */
  private parseEventHeaders(buf: Buffer, start: number, end: number): string {
    let offset = start;
    while (offset < end) {
      const nameLen = buf.readUInt8(offset);
      offset += 1;
      const name = buf.subarray(offset, offset + nameLen).toString('utf-8');
      offset += nameLen;
      const type = buf.readUInt8(offset);
      offset += 1;

      if (type === 7) {
        // String type: 2-byte length prefix
        const valueLen = buf.readUInt16BE(offset);
        offset += 2;
        const value = buf.subarray(offset, offset + valueLen).toString('utf-8');
        offset += valueLen;
        if (name === ':event-type') return value;
      } else if (type === 6) {
        // UUID: 16 bytes
        offset += 16;
      } else if (type === 8) {
        // Timestamp: 8 bytes
        offset += 8;
      } else if (type === 0) {
        // Bool true: 0 bytes
      } else if (type === 1) {
        // Bool false: 0 bytes
      } else if (type === 2) {
        // Byte: 1 byte
        offset += 1;
      } else if (type === 3) {
        // Short: 2 bytes
        offset += 2;
      } else if (type === 4) {
        // Int: 4 bytes
        offset += 4;
      } else if (type === 5) {
        // Long: 8 bytes
        offset += 8;
      } else {
        // Unknown type, can't continue
        break;
      }
    }
    return '';
  }

  private httpsRequest(
    hostname: string,
    path: string,
    headers: Record<string, string>,
    body: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const agent = new https.Agent({ rejectUnauthorized: false });

      const req = https.request(
        { hostname, port: 443, path, method: 'POST', headers, agent },
        (res) => {
          const chunks: Buffer[] = [];

          // Handle compressed responses
          const encoding = res.headers['content-encoding'];
          let stream: NodeJS.ReadableStream = res;

          if (encoding === 'gzip') {
            stream = res.pipe(zlib.createGunzip());
          } else if (encoding === 'deflate') {
            stream = res.pipe(zlib.createInflate());
          }

          stream.on('data', (chunk: Buffer) => {
            chunks.push(Buffer.from(chunk));
          });

          stream.on('end', () => {
            const data = Buffer.concat(chunks).toString('utf-8');
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(this.formatError(res.statusCode, data, this.config.credentials['amazon-bedrock']!.region)));
            } else {
              resolve(data);
            }
          });

          stream.on('error', reject);
          res.on('error', reject);
        }
      );

      req.on('error', (err: any) => {
        reject(new Error(this.formatError(0, err.message, this.config.credentials['amazon-bedrock']!.region)));
      });

      req.write(body);
      req.end();
    });
  }

  // ─── AWS Signature V4 ────────────────────────────────────────

  private signRequest(
    method: string,
    host: string,
    path: string,
    body: string,
    region: string,
    creds: any
  ): Record<string, string> {
    const service = 'bedrock';
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);
    const amzDate = dateStamp + 'T' + now.toISOString().replace(/[-:]/g, '').slice(9, 15) + 'Z';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Host': host,
      'X-Amz-Date': amzDate,
    };

    if (creds.sessionToken) {
      headers['X-Amz-Security-Token'] = creds.sessionToken;
    }

    // Step 1: Canonical request
    // URI-encode each path segment for the canonical URI (SigV4 requirement)
    const canonicalUri = path
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');

    const signedHeaderKeys = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort();
    const signedHeaders = signedHeaderKeys.join(';');

    const canonicalHeaders = signedHeaderKeys
      .map((k) => `${k}:${headers[Object.keys(headers).find((h) => h.toLowerCase() === k)!].trim()}`)
      .join('\n') + '\n';

    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

    const canonicalRequest = [
      method,
      canonicalUri,
      '', // query string
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // Step 2: String to sign
    const canonicalRequestHash = crypto
      .createHash('sha256')
      .update(canonicalRequest)
      .digest('hex');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    // Step 3: Signing key
    const kDate = this.hmac('AWS4' + creds.secretAccessKey, dateStamp);
    const kRegion = this.hmac(kDate, region);
    const kService = this.hmac(kRegion, service);
    const kSigning = this.hmac(kService, 'aws4_request');

    // Step 4: Signature
    const signature = crypto
      .createHmac('sha256', kSigning)
      .update(stringToSign)
      .digest('hex');

    headers['Authorization'] =
      `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return headers;
  }

  private hmac(key: string | Buffer, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data).digest();
  }

  // ─── Message sanitization ─────────────────────────────────────

  /**
   * Ensure every assistant tool call has a matching tool result.
   * Bedrock rejects the request if any tool call ID is missing a result.
   */
  private sanitizeMessages(messages: Message[]): Message[] {
    // Collect all tool call IDs from assistant messages
    const toolCallIds = new Set<string>();
    for (const msg of messages) {
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          toolCallIds.add(tc.id);
        }
      }
    }

    // Collect all tool result IDs
    const toolResultIds = new Set<string>();
    for (const msg of messages) {
      if (msg.role === 'tool' && msg.toolCallId) {
        toolResultIds.add(msg.toolCallId);
      }
    }

    // Find missing results and inject placeholder tool results
    const result = [...messages];
    const missingIds = [...toolCallIds].filter((id) => !toolResultIds.has(id));

    if (missingIds.length > 0) {
      // Find the position after the last assistant message with tool calls
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i].toolCalls && result[i].toolCalls!.some((tc) => missingIds.includes(tc.id))) {
          // Insert placeholder results right after this assistant message
          const placeholders: Message[] = missingIds.map((id) => ({
            role: 'tool' as const,
            content: 'Tool execution was skipped.',
            toolCallId: id,
          }));
          result.splice(i + 1, 0, ...placeholders);
          break;
        }
      }
    }

    return result;
  }

  // ─── Message conversion ──────────────────────────────────────

  /**
   * Convert messages to Bedrock format, merging consecutive tool results
   * into a single 'user' message (Bedrock requires all toolResults for
   * one assistant turn to be in one message).
   */
  private buildBedrockMessages(messages: Message[]): any[] {
    const result: any[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (msg.role === 'tool') {
        // Collect all consecutive tool results into one user message
        const toolResults: any[] = [];
        while (i < messages.length && messages[i].role === 'tool') {
          toolResults.push({
            toolResult: {
              toolUseId: messages[i].toolCallId,
              content: [{ text: messages[i].content || 'No output.' }],
              status: 'success',
            },
          });
          i++;
        }
        i--; // back up since the for loop will increment

        result.push({ role: 'user', content: toolResults });
      } else {
        result.push(this.toBedrockMessage(msg));
      }
    }

    return result;
  }

  private toBedrockMessage(msg: Message): any {
    if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      const content: any[] = [];
      if (msg.content && msg.content.trim()) {
        content.push({ text: msg.content });
      }
      for (const tc of msg.toolCalls) {
        content.push({
          toolUse: {
            toolUseId: tc.id,
            name: tc.name,
            input: tc.arguments,
          },
        });
      }
      return { role: 'assistant', content };
    }

    return {
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: [{ text: msg.content || '...' }],
    };
  }

  private parseBedrockResponse(response: any): Message {
    const output = response.output?.message;
    if (!output) {
      throw new Error('Empty response from Bedrock');
    }

    let textContent = '';
    const toolCalls: any[] = [];

    for (const block of output.content || []) {
      if (block.text) {
        textContent += block.text;
      }
      if (block.toolUse) {
        toolCalls.push({
          id: block.toolUse.toolUseId,
          name: block.toolUse.name,
          arguments: block.toolUse.input || {},
        });
      }
    }

    const result: Message = { role: 'assistant', content: textContent };

    if (response.usage) {
      result.usage = {
        inputTokens: response.usage.inputTokens || 0,
        outputTokens: response.usage.outputTokens || 0,
      };
    }

    if (toolCalls.length > 0) {
      result.toolCalls = toolCalls;
    }
    return result;
  }

  // ─── Error formatting ────────────────────────────────────────

  private formatError(statusCode: number, body: string, region: string): string {
    if (statusCode === 403) {
      return (
        `Bedrock access denied (403). Ensure:\n` +
        `  1. Your IAM user/role has 'bedrock:InvokeModel' permission\n` +
        `  2. Model "${this.config.activeModel}" is enabled in ${region}\n` +
        `     Go to: AWS Console > Bedrock > Model access > Enable model\n` +
        `  Detail: ${body}`
      );
    }
    if (statusCode === 400) {
      return (
        `Bedrock validation error (400). Model "${this.config.activeModel}" may not be available in "${region}".\n` +
        `  Try: us-east-1 or us-west-2\n` +
        `  Detail: ${body}`
      );
    }
    if (body.includes('ECONNRESET') || body.includes('ECONNREFUSED')) {
      return (
        `Connection failed to Bedrock in ${region}.\n` +
        `  Possible causes: corporate proxy/VPN, invalid credentials, or region doesn't support Bedrock.\n` +
        `  Detail: ${body}`
      );
    }
    return `Bedrock error (${statusCode || 'network'}): ${body}`;
  }
}

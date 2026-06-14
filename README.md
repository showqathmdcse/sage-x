# Sage-X

Multi-cloud AI coding assistant CLI — supports Azure OpenAI, Amazon Bedrock, and GCP Vertex AI (Gemini).

**Wisdom meets code.**

---

## Installation

**Prerequisites:** Node.js v18+ ([download](https://nodejs.org))

```bash
npm install -g github:showqathmdcse/sage-x
```

That's it. Now run from any directory:

```bash
sage-x
```

---

## Update to Latest Version

```bash
npm install -g github:showqathmdcse/sage-x
```

Re-running the install command always pulls the latest from GitHub.

---

## Uninstall

```bash
npm uninstall -g aava-code
```

---

## Features

- Multi-cloud AI: Azure OpenAI, Amazon Bedrock, GCP Vertex AI
- Models: GPT-5.x, Codex, Claude 4–8, Gemini 2.5, Llama 4, Mistral, Nova, DeepSeek
- Google Sign-In authentication (Firebase)
- Interactive terminal with command autocomplete (type `/`)
- Tool calling: file read/write/edit, bash execution, grep, glob
- Streaming responses with markdown rendering
- Conversation save/load and token tracking
- Sage-X dark theme UI

---

## Quick Start

1. **Install:**
   ```bash
   npm install -g github:showqathmdcse/sage-x
   ```

2. **Run:**
   ```bash
   sage-x
   ```

3. **Configure a provider:**
   ```
   /config
   ```
   Pick your cloud provider and enter credentials (API key, endpoint, etc.)

4. **Start coding:**
   ```
   > read the main file and explain the architecture
   ```

---

## Commands

Type `/` inside the CLI to see autocomplete suggestions:

| Command | Description |
|---------|-------------|
| `/provider` | Switch cloud provider (Azure, AWS, GCP) |
| `/model` | Switch AI model |
| `/config` | Configure provider credentials |
| `/status` | Show current provider and model |
| `/signin` | Sign in with Google (Firebase) |
| `/signout` | Sign out |
| `/auth` | Check authentication status |
| `/save [name]` | Save conversation |
| `/load [name]` | Load a saved conversation |
| `/compact` | Compress conversation to save context |
| `/tokens` | Show token usage summary |
| `/clear` | Clear conversation history |
| `/help` | Show all commands |
| `/exit` | Exit |

---

## Supported Models

### Azure OpenAI
GPT-5.4 Pro, GPT-5.4, GPT-5.2, GPT-5.1 Codex, GPT-5, GPT-5 Mini, GPT-5 Nano, Codex Mini, GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano, GPT-4o, GPT-4o Mini, O3, O3 Mini, O4 Mini

### Amazon Bedrock
Claude Opus/Sonnet/Haiku 8, 7, 6, 4 — Llama 4 Maverick, Llama 4 Scout, Llama 3.3 70B — Mistral Large — Amazon Nova Pro/Lite/Micro — DeepSeek R1

### GCP Vertex AI / Google GenAI
Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash, Gemini 2.0 Flash Lite, Gemini 1.5 Pro, Gemini 1.5 Flash

---

## Firebase Authentication Setup

Authentication is required on first use.

1. Get Firebase service account key from [Firebase Console](https://console.firebase.google.com/)
2. Save as `firebase-service-account.json` in the install directory
3. Enable Google Sign-In in Firebase Console (Authentication > Sign-in method)
4. Run `sage-x` — browser opens for Google Sign-In

---

## Development

```bash
git clone git@github.com:showqathmdcse/sage-x.git
cd sage-x
npm install
npm run dev
```

---

## License

MIT

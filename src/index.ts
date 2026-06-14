#!/usr/bin/env node
// ============================================
// AAVA Code - Multi-Cloud AI Coding Assistant
// ============================================
// Supports: Azure OpenAI | Amazon Bedrock | GCP Vertex AI
// ============================================

import * as path from 'path';
import { TerminalUI } from './ui/terminal';
import { ConversationEngine } from './core/conversation';
import { configManager } from './config/config-manager';
import { ProviderFactory } from './providers';
import { createAuthUI, firebaseAuth } from './auth';

const chalk = require('chalk');

async function main(): Promise<void> {
  const invokedAs = path.basename(process.argv[1] || '').replace(/\.js$/, '');
  const brand = invokedAs === 'sage-x' ? 'sage' : 'aava';
  const ui = new TerminalUI(brand);
  const authUI = createAuthUI(brand);
  const engine = new ConversationEngine(ui);

  // Set brand for Firebase auth
  firebaseAuth.setBrand(brand);

  // Print welcome banner
  await ui.printBanner();

  // Check authentication - simplified flow
  const isAuthenticated = await authUI.isAuthenticated();
  
  if (!isAuthenticated) {
    // Show auth required and automatically start sign-in
    const authResult = await authUI.requireAuth();
    
    if (!authResult) {
      console.log();
      console.log(chalk.red('  ✗ Authentication is required to continue.'));
      console.log(chalk.dim('  Please complete the setup and try again.'));
      console.log();
      process.exit(1);
    }
    
    console.log();
    console.log(chalk.green('  ✓ Authentication successful!'));
    console.log();
  } else {
    const user = await firebaseAuth.getCurrentUser();
    console.log(chalk.green(`  ✓ Signed in as: ${user?.displayName || user?.email}`));
    console.log();
  }

  // Request workspace read access once
  await engine.requestWorkspaceAccess();

  // Main input loop
  while (true) {
    try {
      const input = await ui.prompt();

      if (!input) continue;

      // Handle slash commands
      if (input.startsWith('/')) {
        const handled = await handleCommand(input, ui, engine, authUI);
        if (handled === 'exit') break;
        if (handled === 'signout') {
          // Exit after signout
          break;
        }
        continue;
      }

      // Check authentication before processing chat
      const isStillAuthenticated = await authUI.isAuthenticated();
      if (!isStillAuthenticated) {
        console.log();
        console.log(chalk.yellow('  ⚠️  Your session has expired.'));
        console.log(chalk.dim('  Please run the command again to sign in.'));
        console.log();
        break;
      }

      // Send to AI
      await engine.chat(input);
    } catch (err: any) {
      if (err.message?.includes('readline was closed')) break;
      ui.printError(err.message);
    }
  }

  ui.close();
  console.log('\n  Goodbye! 👋\n');
  process.exit(0);
}

async function handleCommand(
  input: string,
  ui: TerminalUI,
  engine: ConversationEngine,
  authUI: any
): Promise<string | void> {
  const command = input.split(' ')[0].toLowerCase();

  switch (command) {
    case '/exit':
    case '/quit':
    case '/q':
      return 'exit';

    case '/provider': {
      const provider = await ui.selectProvider();
      if (provider) {
        configManager.setProvider(provider);
        ProviderFactory.clearCache();
        ui.printSuccess(
          `Switched to ${configManager.getProviderDisplay()} / ${configManager.getModelDisplay()}`
        );
      }
      break;
    }

    case '/model': {
      const model = await ui.selectModel();
      if (model) {
        configManager.setModel(model);
        ProviderFactory.clearCache();
        ui.printSuccess(`Switched to model: ${configManager.getModelDisplay()}`);
      }
      break;
    }

    case '/config':
      await ui.configureProvider();
      break;

    case '/status':
      console.log();
      ui.printCurrentConfig();
      break;

    case '/clear':
      engine.clearHistory();
      break;

    case '/save': {
      const name = input.split(' ').slice(1).join(' ').trim() || undefined;
      const filepath = engine.saveConversation(name);
      ui.printSuccess(`Conversation saved to: ${filepath}`);
      break;
    }

    case '/load': {
      const loadArg = input.split(' ').slice(1).join(' ').trim();
      if (!loadArg) {
        // List available conversations
        const conversations = engine.listConversations();
        if (conversations.length === 0) {
          ui.printInfo('No saved conversations found.');
        } else {
          console.log();
          ui.printInfo('Saved conversations:');
          conversations.forEach((c, i) => console.log(`    ${i + 1}. ${c}`));
          console.log();
          ui.printInfo('Usage: /load <filename>');
        }
      } else {
        const loaded = engine.loadConversation(loadArg);
        if (loaded) {
          ui.printSuccess(`Conversation loaded: ${loadArg}`);
        } else {
          ui.printError(`Could not load conversation: ${loadArg}`);
        }
      }
      break;
    }

    case '/compact':
      await engine.compact();
      break;

    case '/tokens': {
      const usage = engine.getTokenUsage();
      console.log();
      ui.printInfo(`Token Usage Summary:`);
      console.log(`    Input tokens:  ${usage.totalInput.toLocaleString()}`);
      console.log(`    Output tokens: ${usage.totalOutput.toLocaleString()}`);
      console.log(`    Total tokens:  ${(usage.totalInput + usage.totalOutput).toLocaleString()}`);
      console.log(`    API requests:  ${usage.requests}`);
      console.log();
      break;
    }

    case '/help':
      ui.printHelp();
      break;

    case '/signin':
      await authUI.signIn();
      break;

    case '/signout':
      authUI.signOut();
      return 'signout';

    case '/auth':
      await authUI.showStatus();
      break;

    default:
      ui.printError(`Unknown command: ${command}. Type /help for available commands.`);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n  Goodbye! 👋\n');
  process.exit(0);
});

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

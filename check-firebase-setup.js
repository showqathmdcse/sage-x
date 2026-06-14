#!/usr/bin/env node

// Quick test to verify Firebase auth setup
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.bold.cyan('\n🔍 Firebase Authentication Setup Check\n'));

const checks = [
  {
    name: 'firebase-admin package installed',
    test: () => {
      try {
        require('firebase-admin');
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Run: npm install firebase-admin'
  },
  {
    name: 'firebase-service-account.json exists',
    test: () => fs.existsSync(path.join(__dirname, 'firebase-service-account.json')),
    fix: 'Download service account key from Firebase Console (see FIREBASE_AUTH_SETUP.md)'
  },
  {
    name: 'Auth module compiled',
    test: () => fs.existsSync(path.join(__dirname, 'dist', 'auth', 'firebase-auth.js')),
    fix: 'Run: npm run build'
  },
  {
    name: 'google-services.json exists (reference)',
    test: () => fs.existsSync(path.join(__dirname, 'google-services.json')),
    fix: 'Optional: This is for Android app reference only'
  }
];

let allPassed = true;

checks.forEach((check, i) => {
  const passed = check.test();
  const icon = passed ? chalk.green('✓') : chalk.red('✗');
  console.log(`${icon} ${check.name}`);
  
  if (!passed) {
    console.log(chalk.yellow(`  → ${check.fix}`));
    allPassed = false;
  }
});

console.log();

if (allPassed) {
  console.log(chalk.green.bold('✓ All checks passed! Firebase authentication is ready to use.'));
  console.log(chalk.gray('  Try running: /signin\n'));
} else {
  console.log(chalk.yellow.bold('⚠ Some checks failed. Please fix the issues above.'));
  console.log(chalk.gray('  See FIREBASE_AUTH_SETUP.md for detailed setup instructions.\n'));
}

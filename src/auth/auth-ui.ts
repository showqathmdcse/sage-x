// ============================================
// Authentication UI
// ============================================
import chalk from 'chalk';
import { firebaseAuth, AuthToken } from './firebase-auth';

export class AuthUI {
  private brand: 'aava' | 'sage';

  constructor(brand: 'aava' | 'sage' = 'aava') {
    this.brand = brand;
  }

  private getBrandName(): string {
    return this.brand === 'sage' ? 'Sage-X' : 'AAVA Code';
  }

  /**
   * Show sign-in prompt with Google
   */
  async signIn(): Promise<AuthToken | null> {
    console.log();
    console.log(chalk.bold.cyan(`  🔐 Sign In to ${this.getBrandName()}`));
    console.log();

    // Check if Firebase is configured
    if (!firebaseAuth.isConfigured()) {
      console.log(chalk.yellow('  ⚠️  Firebase not configured.'));
      console.log(chalk.dim('  Please set up Firebase authentication first.'));
      console.log();
      console.log(chalk.cyan('  Setup Instructions:'));
      console.log(chalk.dim('  1. Go to https://console.firebase.google.com/'));
      console.log(chalk.dim('  2. Select your Firebase project'));
      console.log(chalk.dim('  3. Download service account key'));
      console.log(chalk.dim('  4. Place files in project root:'));
      console.log(chalk.dim('     - firebase-service-account.json'));
      console.log(chalk.dim('     - google-services.json'));
      console.log();
      return null;
    }

    try {
      console.log(chalk.dim('  Opening browser for Google Sign-In...'));
      console.log();

      const token = await firebaseAuth.signInWithGoogle();

      if (token) {
        console.log();
        console.log(chalk.green('  ✓ Successfully signed in!'));
        console.log(chalk.dim(`  Welcome, ${token.displayName || token.email}`));
        console.log();
        return token;
      } else {
        console.log();
        console.log(chalk.red('  ✗ Authentication failed or was cancelled.'));
        console.log();
        return null;
      }
    } catch (error: any) {
      console.log(chalk.red(`  ✗ Error: ${error.message}`));
      console.log();
      return null;
    }
  }

  /**
   * Show current authentication status
   */
  async showStatus(): Promise<void> {
    console.log();
    console.log(chalk.bold('  Authentication Status'));
    console.log();

    if (!firebaseAuth.isConfigured()) {
      console.log(chalk.yellow('  Status: Not configured'));
      console.log(chalk.dim('  Firebase service account not found.'));
      console.log();
      return;
    }

    const user = await firebaseAuth.getCurrentUser();

    if (user) {
      console.log(chalk.green('  Status: ✓ Signed in'));
      console.log(`  Name: ${user.displayName || 'N/A'}`);
      console.log(`  Email: ${user.email || 'N/A'}`);
      console.log(`  User ID: ${user.uid}`);
      console.log(chalk.dim(`  Last authenticated: ${new Date(user.timestamp).toLocaleString()}`));
    } else {
      console.log(chalk.yellow('  Status: ✗ Not signed in'));
      console.log(chalk.dim('  Use /signin to authenticate with Google'));
    }
    console.log();
  }

  /**
   * Sign out
   */
  signOut(): void {
    firebaseAuth.signOut();
    console.log();
    console.log(chalk.green('  ✓ Successfully signed out!'));
    console.log();
  }

  /**
   * Check if user is authenticated (silent)
   */
  async isAuthenticated(): Promise<boolean> {
    if (!firebaseAuth.isConfigured()) {
      return false;
    }
    const user = await firebaseAuth.getCurrentUser();
    return user !== null;
  }

  /**
   * Require authentication - show friendly message and prompt
   */
  async requireAuth(): Promise<AuthToken | null> {
    const user = await firebaseAuth.getCurrentUser();
    if (user) {
      return user;
    }

    console.log();
    console.log(chalk.yellow.bold('  🔐 Authentication Required'));
    console.log();
    console.log(chalk.dim(`  Please sign in with Google to use ${this.getBrandName()}.`));
    console.log(chalk.dim('  A browser window will open for authentication.'));
    console.log();

    // Automatically start sign-in flow
    return await this.signIn();
  }

  /**
   * Show authentication required message
   */
  showAuthRequired(): void {
    console.log();
    console.log(chalk.yellow.bold('  🔐 Authentication Required'));
    console.log();
    console.log(chalk.dim(`  Please sign in with Google to use ${this.getBrandName()}.`));
    console.log();
  }
}

export const authUI = new AuthUI();
export const createAuthUI = (brand: 'aava' | 'sage') => new AuthUI(brand);

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthUI = exports.authUI = exports.AuthUI = void 0;
// ============================================
// Authentication UI
// ============================================
const chalk_1 = __importDefault(require("chalk"));
const firebase_auth_1 = require("./firebase-auth");
class AuthUI {
    brand;
    constructor(brand = 'aava') {
        this.brand = brand;
    }
    getBrandName() {
        return this.brand === 'sage' ? 'Sage-X' : 'AAVA Code';
    }
    /**
     * Show sign-in prompt with Google
     */
    async signIn() {
        console.log();
        console.log(chalk_1.default.bold.cyan(`  🔐 Sign In to ${this.getBrandName()}`));
        console.log();
        // Check if Firebase is configured
        if (!firebase_auth_1.firebaseAuth.isConfigured()) {
            console.log(chalk_1.default.yellow('  ⚠️  Firebase not configured.'));
            console.log(chalk_1.default.dim('  Please set up Firebase authentication first.'));
            console.log();
            console.log(chalk_1.default.cyan('  Setup Instructions:'));
            console.log(chalk_1.default.dim('  1. Go to https://console.firebase.google.com/'));
            console.log(chalk_1.default.dim('  2. Select your Firebase project'));
            console.log(chalk_1.default.dim('  3. Download service account key'));
            console.log(chalk_1.default.dim('  4. Place files in project root:'));
            console.log(chalk_1.default.dim('     - firebase-service-account.json'));
            console.log(chalk_1.default.dim('     - google-services.json'));
            console.log();
            return null;
        }
        try {
            console.log(chalk_1.default.dim('  Opening browser for Google Sign-In...'));
            console.log();
            const token = await firebase_auth_1.firebaseAuth.signInWithGoogle();
            if (token) {
                console.log();
                console.log(chalk_1.default.green('  ✓ Successfully signed in!'));
                console.log(chalk_1.default.dim(`  Welcome, ${token.displayName || token.email}`));
                console.log();
                return token;
            }
            else {
                console.log();
                console.log(chalk_1.default.red('  ✗ Authentication failed or was cancelled.'));
                console.log();
                return null;
            }
        }
        catch (error) {
            console.log(chalk_1.default.red(`  ✗ Error: ${error.message}`));
            console.log();
            return null;
        }
    }
    /**
     * Show current authentication status
     */
    async showStatus() {
        console.log();
        console.log(chalk_1.default.bold('  Authentication Status'));
        console.log();
        if (!firebase_auth_1.firebaseAuth.isConfigured()) {
            console.log(chalk_1.default.yellow('  Status: Not configured'));
            console.log(chalk_1.default.dim('  Firebase service account not found.'));
            console.log();
            return;
        }
        const user = await firebase_auth_1.firebaseAuth.getCurrentUser();
        if (user) {
            console.log(chalk_1.default.green('  Status: ✓ Signed in'));
            console.log(`  Name: ${user.displayName || 'N/A'}`);
            console.log(`  Email: ${user.email || 'N/A'}`);
            console.log(`  User ID: ${user.uid}`);
            console.log(chalk_1.default.dim(`  Last authenticated: ${new Date(user.timestamp).toLocaleString()}`));
        }
        else {
            console.log(chalk_1.default.yellow('  Status: ✗ Not signed in'));
            console.log(chalk_1.default.dim('  Use /signin to authenticate with Google'));
        }
        console.log();
    }
    /**
     * Sign out
     */
    signOut() {
        firebase_auth_1.firebaseAuth.signOut();
        console.log();
        console.log(chalk_1.default.green('  ✓ Successfully signed out!'));
        console.log();
    }
    /**
     * Check if user is authenticated (silent)
     */
    async isAuthenticated() {
        if (!firebase_auth_1.firebaseAuth.isConfigured()) {
            return false;
        }
        const user = await firebase_auth_1.firebaseAuth.getCurrentUser();
        return user !== null;
    }
    /**
     * Require authentication - show friendly message and prompt
     */
    async requireAuth() {
        const user = await firebase_auth_1.firebaseAuth.getCurrentUser();
        if (user) {
            return user;
        }
        console.log();
        console.log(chalk_1.default.yellow.bold('  🔐 Authentication Required'));
        console.log();
        console.log(chalk_1.default.dim(`  Please sign in with Google to use ${this.getBrandName()}.`));
        console.log(chalk_1.default.dim('  A browser window will open for authentication.'));
        console.log();
        // Automatically start sign-in flow
        return await this.signIn();
    }
    /**
     * Show authentication required message
     */
    showAuthRequired() {
        console.log();
        console.log(chalk_1.default.yellow.bold('  🔐 Authentication Required'));
        console.log();
        console.log(chalk_1.default.dim(`  Please sign in with Google to use ${this.getBrandName()}.`));
        console.log();
    }
}
exports.AuthUI = AuthUI;
exports.authUI = new AuthUI();
const createAuthUI = (brand) => new AuthUI(brand);
exports.createAuthUI = createAuthUI;
//# sourceMappingURL=auth-ui.js.map
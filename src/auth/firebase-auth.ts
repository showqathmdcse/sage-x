// ============================================
// Firebase Authentication Module
// ============================================
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import { exec } from 'child_process';
import express, { Request, Response } from 'express';

const AUTH_DIR = path.join(os.homedir(), '.aava-code');
const AUTH_TOKEN_FILE = path.join(AUTH_DIR, 'auth-token.json');

// Get the installation directory (where the compiled code lives)
const getInstallDir = (): string => {
  // __dirname in compiled code points to dist/auth
  // We need to go up two levels to get to the project root
  return path.join(__dirname, '..', '..');
};

const SERVICE_ACCOUNT_PATH = path.join(getInstallDir(), 'firebase-service-account.json');
const GOOGLE_SERVICES_PATH = path.join(getInstallDir(), 'google-services.json');

export interface AuthToken {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  idToken?: string;
  timestamp: number;
}

interface GoogleServicesConfig {
  project_info: {
    project_id: string;
  };
  client: Array<{
    api_key: Array<{
      current_key: string;
    }>;
  }>;
}

export class FirebaseAuth {
  private static instance: FirebaseAuth;
  private initialized = false;
  private server: http.Server | null = null;
  private projectId: string = '';
  private apiKey: string = '';
  private brand: 'aava' | 'sage' = 'aava';

  private constructor() {}

  static getInstance(): FirebaseAuth {
    if (!FirebaseAuth.instance) {
      FirebaseAuth.instance = new FirebaseAuth();
    }
    return FirebaseAuth.instance;
  }

  setBrand(brand: 'aava' | 'sage'): void {
    this.brand = brand;
  }

  private getBrandName(): string {
    return this.brand === 'sage' ? 'Sage-X' : 'AAVA Code';
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Check if service account file exists
      if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        return false;
      }

      const serviceAccount = JSON.parse(
        fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8')
      );

      // Load Google Services config for API key
      if (fs.existsSync(GOOGLE_SERVICES_PATH)) {
        const googleServices: GoogleServicesConfig = JSON.parse(
          fs.readFileSync(GOOGLE_SERVICES_PATH, 'utf-8')
        );
        this.projectId = googleServices.project_info.project_id;
        this.apiKey = googleServices.client[0].api_key[0].current_key;
      }

      // Initialize Firebase Admin
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      return false;
    }
  }

  /**
   * Get Firebase project configuration
   */
  getProjectConfig(): { projectId: string; apiKey: string } {
    return {
      projectId: this.projectId,
      apiKey: this.apiKey,
    };
  }

  /**
   * Start Google Sign-In flow with browser redirect
   */
  async signInWithGoogle(): Promise<AuthToken | null> {
    try {
      if (!this.initialized) {
        const init = await this.initialize();
        if (!init) return null;
      }

      const PORT = 3456;
      const REDIRECT_URI = `http://localhost:${PORT}/callback`;

      return new Promise((resolve) => {
        const app = express();
        
        // Serve the sign-in page
        app.get('/', (req: Request, res: Response) => {
          res.send(this.getSignInHTML(REDIRECT_URI));
        });

        // Handle the callback
        app.get('/callback', async (req: Request, res: Response) => {
          const idToken = req.query.token as string;
          
          if (!idToken) {
            res.send(this.getErrorHTML('No token received'));
            this.stopServer();
            resolve(null);
            return;
          }

          try {
            // Verify the ID token
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const user = await admin.auth().getUser(decodedToken.uid);

            const authToken: AuthToken = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || undefined,
              photoURL: user.photoURL || undefined,
              idToken,
              timestamp: Date.now(),
            };

            // Save token locally
            this.saveToken(authToken);

            res.send(this.getSuccessHTML(user.displayName || user.email || 'User'));
            
            // Stop server after a short delay
            setTimeout(() => {
              this.stopServer();
              resolve(authToken);
            }, 2000);
          } catch (error: any) {
            console.error('Token verification failed:', error);
            res.send(this.getErrorHTML(error.message));
            this.stopServer();
            resolve(null);
          }
        });

        // Start server
        this.server = app.listen(PORT, () => {
          console.log(`\n  🌐 Opening browser for Google Sign-In...`);
          console.log(`  📍 If browser doesn't open, visit: http://localhost:${PORT}\n`);
          
          // Open browser using platform-specific command
          const url = `http://localhost:${PORT}`;
          const platform = process.platform;
          let command: string;

          if (platform === 'darwin') {
            command = `open "${url}"`;
          } else if (platform === 'win32') {
            command = `start "" "${url}"`;
          } else {
            // Linux
            command = `xdg-open "${url}"`;
          }

          exec(command, (error) => {
            if (error) {
              console.log(`  ⚠️  Could not open browser automatically. Please visit the URL above.\n`);
            }
          });
        });

        // Timeout after 5 minutes
        setTimeout(() => {
          if (this.server) {
            console.log('\n  ⏱️  Sign-in timeout. Please try again.\n');
            this.stopServer();
            resolve(null);
          }
        }, 5 * 60 * 1000);
      });
    } catch (error) {
      console.error('Sign-in failed:', error);
      return null;
    }
  }

  /**
   * Stop the local server
   */
  private stopServer(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  /**
   * Generate sign-in HTML page
   */
  private getSignInHTML(redirectUri: string): string {
    const brandName = this.getBrandName();
    const brandEmoji = this.brand === 'sage' ? '🧙‍♂️' : '🚀';
    const brandTagline = this.brand === 'sage' ? 'Wisdom meets code' : 'AI-Powered Coding Assistant';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In - ${brandName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg-primary: #0a0a0f;
      --bg-card: #1a1a2e;
      --text-primary: #ffffff;
      --text-secondary: #a0a0b0;
      --accent: #6c63ff;
      --accent-glow: rgba(108, 99, 255, 0.3);
      --gradient-1: linear-gradient(135deg, #6c63ff, #3b82f6);
      --border-color: rgba(255, 255, 255, 0.08);
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }

    body::before {
      content: '';
      position: absolute;
      top: -50%;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
      pointer-events: none;
    }

    .container {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 60px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      position: relative;
      z-index: 1;
      box-shadow: 0 25px 80px rgba(108, 99, 255, 0.15);
      animation: fadeInUp 0.8s ease forwards;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .brand-badge {
      display: inline-block;
      background: rgba(108, 99, 255, 0.15);
      color: var(--accent);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 6px 14px;
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .logo {
      font-size: 64px;
      margin-bottom: 16px;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }

    h1 {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 12px;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.5px;
    }

    .tagline {
      color: var(--text-secondary);
      font-size: 18px;
      margin-bottom: 40px;
      line-height: 1.5;
    }

    .google-btn {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 14px 28px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      transition: all 0.3s ease;
      color: var(--text-primary);
    }

    .google-btn:hover {
      border-color: var(--accent);
      box-shadow: 0 10px 40px var(--accent-glow);
      transform: translateY(-2px);
    }

    .google-btn:active {
      transform: translateY(0);
    }

    .google-icon {
      width: 18px;
      height: 18px;
    }

    .info {
      margin-top: 36px;
      padding: 16px;
      background: rgba(108, 99, 255, 0.08);
      border: 1px solid rgba(108, 99, 255, 0.2);
      border-radius: 10px;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .spinner {
      display: none;
      margin: 24px auto 0;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top: 3px solid var(--accent);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .signing-in {
      display: none;
      color: var(--accent);
      font-weight: 500;
      margin-top: 16px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="brand-badge">Authentication Required</span>
    <div class="logo">${brandEmoji}</div>
    <h1>${brandName}</h1>
    <p class="tagline">${brandTagline}</p>

    <button class="google-btn" onclick="signInWithGoogle()">
      <svg class="google-icon" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    </button>

    <div class="spinner" id="spinner"></div>
    <div class="signing-in" id="signingIn">Signing in...</div>

    <div class="info">
      🔒 Secure authentication via Firebase<br>
      Your credentials are never stored locally
    </div>
  </div>

  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
    import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

    const firebaseConfig = {
      apiKey: "${this.apiKey}",
      authDomain: "${this.projectId}.firebaseapp.com",
      projectId: "${this.projectId}",
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    window.signInWithGoogle = async function() {
      try {
        document.querySelector('.google-btn').style.display = 'none';
        document.getElementById('spinner').style.display = 'block';
        document.getElementById('signingIn').style.display = 'block';

        const result = await signInWithPopup(auth, provider);
        const idToken = await result.user.getIdToken();

        window.location.href = '${redirectUri}?token=' + encodeURIComponent(idToken);
      } catch (error) {
        console.error('Sign-in error:', error);
        alert('Sign-in failed: ' + error.message);
        document.querySelector('.google-btn').style.display = 'inline-flex';
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('signingIn').style.display = 'none';
      }
    };
  </script>
</body>
</html>
    `;
  }

  /**
   * Generate success HTML page
   */
  private getSuccessHTML(name: string): string {
    const brandName = this.getBrandName();
    const brandEmoji = this.brand === 'sage' ? '🧙‍♂️' : '🚀';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Success - ${brandName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: #0a0a0f;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    body::before {
      content: '';
      position: absolute;
      top: -50%;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(52, 211, 153, 0.2) 0%, transparent 70%);
      pointer-events: none;
    }
    .container {
      background: #1a1a2e;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 60px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      position: relative;
      z-index: 1;
      box-shadow: 0 25px 80px rgba(52, 211, 153, 0.15);
      animation: fadeInUp 0.8s ease forwards;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .success-icon {
      font-size: 80px;
      margin-bottom: 24px;
      animation: bounce 0.6s ease;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }
    .emoji {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #34d399, #6c63ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    p {
      color: #a0a0b0;
      font-size: 18px;
      margin-bottom: 32px;
    }
    .info {
      background: rgba(52, 211, 153, 0.1);
      border: 1px solid rgba(52, 211, 153, 0.3);
      border-radius: 10px;
      padding: 16px;
      color: #34d399;
      font-weight: 500;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✅</div>
    <div class="emoji">${brandEmoji}</div>
    <h1>Successfully Signed In!</h1>
    <p>Welcome, ${name}</p>
    <div class="info">
      You can now close this window and return to your terminal
    </div>
  </div>
  <script>
    setTimeout(() => window.close(), 3000);
  </script>
</body>
</html>
    `;
  }

  /**
   * Generate error HTML page
   */
  private getErrorHTML(message: string): string {
    const brandName = this.getBrandName();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - ${brandName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: #0a0a0f;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    body::before {
      content: '';
      position: absolute;
      top: -50%;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }
    .container {
      background: #1a1a2e;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 60px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      position: relative;
      z-index: 1;
      box-shadow: 0 25px 80px rgba(239, 68, 68, 0.1);
      animation: fadeInUp 0.8s ease forwards;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .error-icon {
      font-size: 80px;
      margin-bottom: 24px;
    }
    h1 {
      color: #ef4444;
      font-size: 32px;
      margin-bottom: 12px;
      font-weight: 700;
    }
    p {
      color: #a0a0b0;
      font-size: 16px;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    .info {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 10px;
      padding: 16px;
      color: #fca5a5;
      font-size: 14px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">❌</div>
    <h1>Sign-In Failed</h1>
    <p>${message}</p>
    <div class="info">
      Please close this window and try again from your terminal
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Verify existing token
   */
  async verifyToken(idToken?: string): Promise<boolean> {
    try {
      if (!this.initialized) {
        const init = await this.initialize();
        if (!init) return false;
      }

      const authToken = this.loadToken();
      if (!authToken || !authToken.idToken) return false;

      const tokenToVerify = idToken || authToken.idToken;

      // Check if token is expired (7 days)
      const tokenAge = Date.now() - authToken.timestamp;
      if (tokenAge > 7 * 24 * 60 * 60 * 1000) {
        return false;
      }

      // Verify the ID token
      await admin.auth().verifyIdToken(tokenToVerify);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthToken | null> {
    const token = this.loadToken();
    if (!token) return null;

    const valid = await this.verifyToken(token.idToken);
    if (!valid) {
      this.clearToken();
      return null;
    }

    return token;
  }

  /**
   * Sign out
   */
  signOut(): void {
    this.clearToken();
  }

  /**
   * Save token to local storage
   */
  private saveToken(token: AuthToken): void {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    fs.writeFileSync(AUTH_TOKEN_FILE, JSON.stringify(token, null, 2));
  }

  /**
   * Load token from local storage
   */
  private loadToken(): AuthToken | null {
    try {
      if (fs.existsSync(AUTH_TOKEN_FILE)) {
        const raw = fs.readFileSync(AUTH_TOKEN_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (error) {
      // Invalid token file
    }
    return null;
  }

  /**
   * Clear stored token
   */
  private clearToken(): void {
    if (fs.existsSync(AUTH_TOKEN_FILE)) {
      fs.unlinkSync(AUTH_TOKEN_FILE);
    }
  }

  /**
   * Check if Firebase is configured
   */
  isConfigured(): boolean {
    return fs.existsSync(SERVICE_ACCOUNT_PATH) && fs.existsSync(GOOGLE_SERVICES_PATH);
  }
}

export const firebaseAuth = FirebaseAuth.getInstance();

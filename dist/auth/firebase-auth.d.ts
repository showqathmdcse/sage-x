export interface AuthToken {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    idToken?: string;
    timestamp: number;
}
export declare class FirebaseAuth {
    private static instance;
    private initialized;
    private server;
    private projectId;
    private apiKey;
    private brand;
    private constructor();
    static getInstance(): FirebaseAuth;
    setBrand(brand: 'aava' | 'sage'): void;
    private getBrandName;
    /**
     * Initialize Firebase Admin SDK
     */
    initialize(): Promise<boolean>;
    /**
     * Get Firebase project configuration
     */
    getProjectConfig(): {
        projectId: string;
        apiKey: string;
    };
    /**
     * Start Google Sign-In flow with browser redirect
     */
    signInWithGoogle(): Promise<AuthToken | null>;
    /**
     * Stop the local server
     */
    private stopServer;
    /**
     * Generate sign-in HTML page
     */
    private getSignInHTML;
    /**
     * Generate success HTML page
     */
    private getSuccessHTML;
    /**
     * Generate error HTML page
     */
    private getErrorHTML;
    /**
     * Verify existing token
     */
    verifyToken(idToken?: string): Promise<boolean>;
    /**
     * Get current authenticated user
     */
    getCurrentUser(): Promise<AuthToken | null>;
    /**
     * Sign out
     */
    signOut(): void;
    /**
     * Save token to local storage
     */
    private saveToken;
    /**
     * Load token from local storage
     */
    private loadToken;
    /**
     * Clear stored token
     */
    private clearToken;
    /**
     * Check if Firebase is configured
     */
    isConfigured(): boolean;
}
export declare const firebaseAuth: FirebaseAuth;
//# sourceMappingURL=firebase-auth.d.ts.map
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
    private server;
    private projectId;
    private apiKey;
    private brand;
    private constructor();
    static getInstance(): FirebaseAuth;
    setBrand(brand: 'aava' | 'sage'): void;
    private getBrandName;
    initialize(): Promise<boolean>;
    getProjectConfig(): {
        projectId: string;
        apiKey: string;
    };
    /**
     * Start Google Sign-In flow with browser redirect
     */
    signInWithGoogle(): Promise<AuthToken | null>;
    private stopServer;
    /**
     * Extract UID from JWT token payload (no verification needed for CLI)
     */
    private extractUidFromToken;
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
     * Verify existing token (checks expiry only — no server-side verification needed)
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
    private saveToken;
    private loadToken;
    private clearToken;
    isConfigured(): boolean;
}
export declare const firebaseAuth: FirebaseAuth;
//# sourceMappingURL=firebase-auth.d.ts.map
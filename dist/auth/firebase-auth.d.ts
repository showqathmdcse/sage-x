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
     * Check if user is approved in Firestore
     * Checks: firestore collection "users" → document {uid} → field "approved" === true
     */
    private checkUserApproved;
    /**
     * Create user document in Firestore (pending approval)
     */
    private createUserDoc;
    /**
     * Start Google Sign-In flow with browser redirect
     */
    signInWithGoogle(): Promise<AuthToken | null>;
    private stopServer;
    private extractUidFromToken;
    /**
     * Generate sign-in HTML page
     */
    private getSignInHTML;
    private getSuccessHTML;
    private getErrorHTML;
    verifyToken(idToken?: string): Promise<boolean>;
    getCurrentUser(): Promise<AuthToken | null>;
    signOut(): void;
    private saveToken;
    private loadToken;
    private clearToken;
    isConfigured(): boolean;
}
export declare const firebaseAuth: FirebaseAuth;
//# sourceMappingURL=firebase-auth.d.ts.map
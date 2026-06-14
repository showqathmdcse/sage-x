import { AuthToken } from './firebase-auth';
export declare class AuthUI {
    private brand;
    constructor(brand?: 'aava' | 'sage');
    private getBrandName;
    /**
     * Show sign-in prompt with Google
     */
    signIn(): Promise<AuthToken | null>;
    /**
     * Show current authentication status
     */
    showStatus(): Promise<void>;
    /**
     * Sign out
     */
    signOut(): void;
    /**
     * Check if user is authenticated (silent)
     */
    isAuthenticated(): Promise<boolean>;
    /**
     * Require authentication - show friendly message and prompt
     */
    requireAuth(): Promise<AuthToken | null>;
    /**
     * Show authentication required message
     */
    showAuthRequired(): void;
}
export declare const authUI: AuthUI;
export declare const createAuthUI: (brand: "aava" | "sage") => AuthUI;
//# sourceMappingURL=auth-ui.d.ts.map
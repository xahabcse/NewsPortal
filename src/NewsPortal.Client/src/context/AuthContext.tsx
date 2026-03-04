import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthService, authStorage } from '../services/AuthService';
import type { AuthSession } from '../services/AuthService';

interface AuthContextValue {
    session: AuthSession | null;
    isAuthenticated: boolean;
    role: string;
    authProvider: string;
    canManageSources: boolean;
    canCreateSources: boolean;
    canEditSources: boolean;
    canDeleteSources: boolean;
    canFetchSources: boolean;
    sourcePermissionMessage: string;
    updateAvatarId: (avatarId: number) => void;
    login: (username: string, password: string) => Promise<void>;
    googleLogin: (credential: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const isExpired = (session: AuthSession): boolean => {
    const expiryTime = Date.parse(session.expiresAt);
    if (Number.isNaN(expiryTime)) return false;
    return expiryTime <= Date.now();
};

const hasManageRole = (session: AuthSession | null): boolean => {
    const role = session?.role;
    return role === 'Admin' || role === 'Editor' || role === 'SuperAdmin';
};

const getRole = (session: AuthSession | null): string => {
    return session?.role ?? 'Guest';
};

const getInitialSession = (): AuthSession | null => {
    const stored = authStorage.get();
    if (!stored) return null;

    if (isExpired(stored)) {
        authStorage.clear();
        return null;
    }

    return stored;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<AuthSession | null>(getInitialSession);

    const logout = useCallback(() => {
        setSession(null);
        authStorage.clear();
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        const newSession = await AuthService.login({ username, password });
        authStorage.set(newSession);
        setSession(newSession);
    }, []);

    const googleLogin = useCallback(async (credential: string) => {
        const newSession = await AuthService.googleLogin(credential);
        authStorage.set(newSession);
        setSession(newSession);
    }, []);

    const updateAvatarId = useCallback((avatarId: number) => {
        setSession(prev => {
            if (!prev) return prev;
            const updated = { ...prev, avatarId };
            authStorage.set(updated);
            return updated;
        });
    }, []);

    useEffect(() => {
        if (!session) return;

        if (isExpired(session)) {
            logout();
            return;
        }

        const expiryTime = Date.parse(session.expiresAt);
        if (Number.isNaN(expiryTime)) return;

        const timeoutMs = expiryTime - Date.now();
        const timer = window.setTimeout(logout, timeoutMs);
        return () => window.clearTimeout(timer);
    }, [session, logout]);

    useEffect(() => {
        const token = session?.token;
        if (!token) return;

        let isCancelled = false;

        const validate = async () => {
            const valid = await AuthService.validateToken(token);
            if (!valid && !isCancelled) {
                logout();
            }
        };

        void validate();

        return () => {
            isCancelled = true;
        };
    }, [session, logout]);

    const value = useMemo<AuthContextValue>(() => ({
        session,
        isAuthenticated: !!session,
        role: getRole(session),
        authProvider: session?.authProvider ?? 'Local',
        canManageSources: hasManageRole(session),
        canCreateSources: session?.role === 'Admin' || session?.role === 'SuperAdmin',
        canEditSources: session?.role === 'Admin' || session?.role === 'Editor' || session?.role === 'SuperAdmin',
        canDeleteSources: session?.role === 'Admin' || session?.role === 'SuperAdmin',
        canFetchSources: session?.role === 'Admin' || session?.role === 'Editor' || session?.role === 'SuperAdmin',
        sourcePermissionMessage: !session
            ? 'Read-only mode. Login as Admin or Editor to test, edit, or fetch channels.'
            : session.role === 'SuperAdmin'
                ? 'SuperAdmin mode. Full system access including user management.'
                : session.role === 'Admin'
                    ? 'Admin mode. Full channel management access enabled.'
                    : session.role === 'Editor'
                        ? 'Editor mode. You can test, edit, and fetch channels. Create/Delete requires Admin.'
                        : 'Read-only mode. Your role does not have channel management permissions.',
        updateAvatarId,
        login,
        googleLogin,
        logout
    }), [session, updateAvatarId, login, googleLogin, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

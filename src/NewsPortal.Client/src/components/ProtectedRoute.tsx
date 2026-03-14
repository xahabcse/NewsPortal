import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
    children: ReactNode;
    /** If provided, user must have one of these roles. Otherwise any authenticated user is allowed. */
    roles?: string[];
}

/**
 * Wraps a route element to require authentication (and optionally a specific role).
 * - Unauthenticated: redirects to /login?redirect=<current-path>
 * - Wrong role: redirects to /
 */
const ProtectedRoute = ({ children, roles }: Props) => {
    const { isAuthenticated, role } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return (
            <Navigate
                to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
                replace
            />
        );
    }

    if (roles && roles.length > 0 && !roles.includes(role)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;

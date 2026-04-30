import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { JSX } from 'react';

interface Props {
    children: JSX.Element;
    allowedRoles: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: Props) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="text-white text-lg animate-pulse">Loading...</div>
            </div>
        );
    }

    // Not logged in → go to login
    if (!user) return <Navigate to="/login" replace />;

    // Wrong role → go to their own dashboard
    if (!allowedRoles.includes(user.role)) {
        return <Navigate to={`/${user.role}`} replace />;
    }

    return children;
};

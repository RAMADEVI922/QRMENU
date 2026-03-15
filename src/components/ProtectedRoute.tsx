import { Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Suppress Clerk cookie errors in development
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('digest') || event.message?.includes('cookie')) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-foreground font-semibold mb-2">Authentication Error</p>
          <p className="text-muted-foreground mb-4">{authError}</p>
          <a href="/admin-login" className="text-primary hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
}

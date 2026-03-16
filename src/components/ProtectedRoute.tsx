import { Navigate } from 'react-router-dom';
import { getAdminSession } from '@/lib/adminAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const session = getAdminSession();
  if (!session) return <Navigate to="/admin-login" replace />;
  return <>{children}</>;
}

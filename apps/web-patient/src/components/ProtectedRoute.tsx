import { Navigate } from 'react-router-dom';
import { useSession } from '../lib/session';
import { FullPageSpinner } from './Spinner';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

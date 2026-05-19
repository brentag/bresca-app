import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { SessionProvider, useSession } from './lib/session';
import { ThemeProvider } from './lib/theme';
import { NotificationsProvider } from './lib/notifications';
import ProtectedRoute from './components/ProtectedRoute';
import { FullPageSpinner } from './components/Spinner';
import Landing from './pages/Landing';
import Welcome from './pages/auth/Welcome';
import Email from './pages/auth/Email';
import Verify from './pages/auth/Verify';
import Name from './pages/onboarding/Name';
import Year from './pages/onboarding/Year';
import Conditions from './pages/onboarding/Conditions';
import ConsentIntro from './pages/onboarding/ConsentIntro';
import Layout from './components/Layout';
import ConsentGateway from './components/ConsentGateway';
import Home from './pages/app/Home';
import Vault from './pages/app/Vault';
import Upload from './pages/app/Upload';
import StudyDetail from './pages/app/StudyDetail';
import QRGenerate from './pages/app/QRGenerate';
import QRView from './pages/app/QRView';
import Asistente from './pages/app/Copilot';
import Family from './pages/app/Family';
import Menu from './pages/app/Menu';
import ConsentCenter from './pages/app/ConsentCenter';
import Settings from './pages/app/Settings';
import Notifications from './pages/app/Notifications';
import InvitationCenter from './pages/app/InvitationCenter';
import SupportChat from './pages/app/Support';
import Privacidad from './pages/Privacidad';

// FE-B3: ErrorBoundary captura cualquier excepción no manejada en el árbol de
// componentes y muestra fallback. Sin esto, un crash en Vault/StudyDetail/etc.
// dejaba la app en pantalla blanca total sin posibilidad de recuperación.
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError(): { hasError: boolean } { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 32, textAlign: 'center', background: '#FAFAFA',
        }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
            Algo salió mal
          </p>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, maxWidth: 360 }}>
            La app encontró un error inesperado. Probá recargar la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', borderRadius: 8, background: '#00C87A',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
              minHeight: 44,
            }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RootRedirect() {
  const { session, loading } = useSession();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) localStorage.setItem('bresca_ref', ref);
  }, []);

  if (loading) return <FullPageSpinner />;
  return session ? <Navigate to="/app/home" replace /> : <Landing />;
}

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/auth/email" element={<Email />} />
          <Route path="/auth/verify" element={<Verify />} />
          <Route path="/onboarding/name"       element={<ProtectedRoute><Name /></ProtectedRoute>} />
          <Route path="/onboarding/year"       element={<ProtectedRoute><Year /></ProtectedRoute>} />
          <Route path="/onboarding/conditions" element={<ProtectedRoute><Conditions /></ProtectedRoute>} />
          <Route path="/onboarding/consent"    element={<ProtectedRoute><ConsentIntro /></ProtectedRoute>} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/qr/:token" element={<QRView />} />
          <Route path="/app" element={<ProtectedRoute><NotificationsProvider><ConsentGateway /></NotificationsProvider></ProtectedRoute>}>
            <Route index element={<Navigate to="/app/home" replace />} />
            <Route path="home"         element={<Home />} />
            <Route path="vault"        element={<Vault />} />
            <Route path="vault/upload" element={<Upload />} />
            <Route path="vault/:id"    element={<StudyDetail />} />
            <Route path="vault/qr"     element={<QRGenerate />} />
            <Route path="copilot"      element={<Asistente />} />
            <Route path="family"       element={<Family />} />
            <Route path="menu"         element={<Menu />} />
            <Route path="consent"       element={<ConsentCenter />} />
            <Route path="settings"      element={<Settings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="invitations"   element={<InvitationCenter />} />
            <Route path="support"       element={<SupportChat />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

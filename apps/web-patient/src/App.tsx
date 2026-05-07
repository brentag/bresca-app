import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './lib/session';
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

function RootRedirect() {
  const { session, loading } = useSession();
  if (loading) return <FullPageSpinner />;
  return session ? <Navigate to="/app/home" replace /> : <Landing />;
}

export default function App() {
  return (
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
          <Route path="/qr/:token" element={<QRView />} />
          <Route path="/app" element={<ProtectedRoute><ConsentGateway /></ProtectedRoute>}>
            <Route index element={<Navigate to="/app/home" replace />} />
            <Route path="home"         element={<Home />} />
            <Route path="vault"        element={<Vault />} />
            <Route path="vault/upload" element={<Upload />} />
            <Route path="vault/:id"    element={<StudyDetail />} />
            <Route path="vault/qr"     element={<QRGenerate />} />
            <Route path="copilot"      element={<Asistente />} />
            <Route path="family"       element={<Family />} />
            <Route path="menu"         element={<Menu />} />
            <Route path="consent"      element={<ConsentCenter />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}

import { lazy, Suspense, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import Layout from './components/Layout';
import Login from './pages/Login';
import LandingCRO from './pages/LandingCRO';
import { supabase } from './lib/supabase';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Patients   = lazy(() => import('./pages/Patients'));
const Studies    = lazy(() => import('./pages/Studies'));
const Matching   = lazy(() => import('./pages/Matching'));

type Tab = 'dashboard' | 'patients' | 'studies' | 'matching';

const PAGES: Record<Tab, React.ComponentType> = {
  dashboard: Dashboard,
  patients: Patients,
  studies: Studies,
  matching: Matching,
};

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #00C87A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!session) {
    if (showLanding) return <LandingCRO onRequestDemo={() => setShowLanding(false)} />;
    return <Login />;
  }

  const Page = PAGES[tab];

  return (
    <Layout tab={tab} onTab={setTab}>
      <Suspense fallback={<div style={{ padding: 40, color: '#94A3B8', fontSize: 14 }}>Cargando…</div>}>
        <Page />
      </Suspense>
    </Layout>
  );
}

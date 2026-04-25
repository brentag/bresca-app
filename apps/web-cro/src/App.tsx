import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Studies from './pages/Studies';
import Matching from './pages/Matching';
import { supabase } from './lib/supabase';

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #00C87A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!session) return <Login />;

  const Page = PAGES[tab];

  return (
    <Layout tab={tab} onTab={setTab}>
      <Page />
    </Layout>
  );
}

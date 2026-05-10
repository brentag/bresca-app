import { Navigate } from 'react-router-dom';
import { useConsentState } from '../lib/useConsentState';
import { useProfile } from '../lib/useProfile';
import { FullPageSpinner } from './Spinner';
import Layout from './Layout';
import TermsAcceptance from '../pages/app/TermsAcceptance';

export default function ConsentGateway() {
  const { loading, hasAcceptedTc, refresh } = useConsentState();
  const { profile, loading: profileLoading } = useProfile();

  if (loading || (hasAcceptedTc && profileLoading)) return <FullPageSpinner />;
  if (!hasAcceptedTc) return <TermsAcceptance onAccepted={refresh} />;
  if (!profile) return <Navigate replace to="/onboarding/name" />;
  return <Layout />;
}

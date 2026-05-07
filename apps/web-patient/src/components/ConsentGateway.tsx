import { useConsentState } from '../lib/useConsentState';
import { FullPageSpinner } from './Spinner';
import Layout from './Layout';
import TermsAcceptance from '../pages/app/TermsAcceptance';

export default function ConsentGateway() {
  const { loading, hasAcceptedTc, refresh } = useConsentState();

  if (loading) return <FullPageSpinner />;
  if (!hasAcceptedTc) return <TermsAcceptance onAccepted={refresh} />;
  return <Layout />;
}

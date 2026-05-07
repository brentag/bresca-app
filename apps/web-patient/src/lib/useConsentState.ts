import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useSession } from './session';

interface ConsentState {
  loading: boolean;
  hasAcceptedTc: boolean;
  tcDocumentId: string | null;
  refresh: () => void;
}

export function useConsentState(): ConsentState {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [hasAcceptedTc, setHasAcceptedTc] = useState(false);
  const [tcDocumentId, setTcDocumentId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('user_consent_state')
      .select('has_accepted_tc, tc_document_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasAcceptedTc(data?.has_accepted_tc ?? false);
        setTcDocumentId(data?.tc_document_id ?? null);
        setLoading(false);
      });
  }, [user?.id, tick]);

  return {
    loading,
    hasAcceptedTc,
    tcDocumentId,
    refresh: () => setTick(t => t + 1),
  };
}

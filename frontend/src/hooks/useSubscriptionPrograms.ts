import { useEffect, useState, useCallback } from 'react';
import { getSubscriptionProgramsByMerchantId } from '../services/subscriptionProgramService';
import type { SubscriptionProgram } from '../types/subscriptionProgram';

export function useSubscriptionPrograms(merchant_id?: string) {
  const [subscriptionPrograms, setSubscriptionPrograms] = useState<SubscriptionProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrograms = useCallback(() => {
    setLoading(true);
    const fetcher = merchant_id ? getSubscriptionProgramsByMerchantId(merchant_id) : [];
    Promise.resolve(fetcher)
      .then(setSubscriptionPrograms)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [merchant_id]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  return { subscriptionPrograms, loading, error, refetch: fetchPrograms };
} 
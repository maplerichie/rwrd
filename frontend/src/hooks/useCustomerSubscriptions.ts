import { useEffect, useState, useCallback } from 'react';
import { getSubscriptionsByCustomerIdWithDetails } from '../services/subscriptionService';

export function useCustomerSubscriptions(customerId?: string) {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscriptions = useCallback(() => {
    if (!customerId) {
      setSubscriptions([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getSubscriptionsByCustomerIdWithDetails(customerId)
      .then(setSubscriptions)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [customerId]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return { subscriptions, loading, error, refetch: fetchSubscriptions };
} 
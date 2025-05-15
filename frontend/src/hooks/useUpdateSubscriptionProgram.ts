import { useState } from 'react';
import { updateSubscriptionProgram as updateProgramService } from '../services/subscriptionProgramService';
import type { SubscriptionProgram } from '../types/subscriptionProgram';

export function useUpdateSubscriptionProgram() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function updateSubscriptionProgram(id: string, updates: Partial<Omit<SubscriptionProgram, 'id' | 'created_at'>>): Promise<SubscriptionProgram | null> {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateProgramService(id, updates);
      return updated;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { updateSubscriptionProgram, loading, error };
} 
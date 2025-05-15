import { useState } from 'react';
import { createSubscriptionProgram as createProgramService } from '../services/subscriptionProgramService';
import type { SubscriptionProgram } from '../types/subscriptionProgram';

export function useCreateSubscriptionProgram() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function createSubscriptionProgram(program: Omit<SubscriptionProgram, 'id' | 'created_at'>): Promise<SubscriptionProgram | null> {
    setLoading(true);
    setError(null);
    try {
      const created = await createProgramService(program);
      return created;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { createSubscriptionProgram, loading, error };
} 
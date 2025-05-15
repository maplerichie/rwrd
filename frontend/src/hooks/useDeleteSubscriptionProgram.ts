import { useState } from 'react';
import { deleteSubscriptionProgram as deleteProgramService } from '../services/subscriptionProgramService';

export function useDeleteSubscriptionProgram() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function deleteSubscriptionProgram(id: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      await deleteProgramService(id);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { deleteSubscriptionProgram, loading, error };
} 
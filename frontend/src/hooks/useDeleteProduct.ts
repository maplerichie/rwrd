import { useState } from 'react';
import { deleteProduct as deleteProductService } from '../services/productService';

export function useDeleteProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function deleteProduct(id: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      await deleteProductService(id);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { deleteProduct, loading, error };
} 
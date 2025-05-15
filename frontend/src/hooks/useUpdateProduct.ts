import { useState } from 'react';
import { updateProduct as updateProductService } from '../services/productService';
import type { Product } from '../types/product';

export function useUpdateProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<Product | null> {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateProductService(id, updates);
      return updated;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { updateProduct, loading, error };
} 
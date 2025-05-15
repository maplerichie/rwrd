import { useState } from 'react';
import { createProduct as createProductService } from '../services/productService';
import type { Product } from '../types/product';

export function useCreateProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product | null> {
    setLoading(true);
    setError(null);
    try {
      const created = await createProductService(product);
      return created;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { createProduct, loading, error };
} 
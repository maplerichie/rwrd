import { useEffect, useState, useCallback } from 'react';
import { getProducts, getProductsByMerchantId } from '../services/productService';
import type { Product } from '../types/product';

export function useProducts(merchant_id?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const fetcher = merchant_id ? getProductsByMerchantId(merchant_id) : [];
    Promise.resolve(fetcher)
      .then(setProducts)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [merchant_id]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
} 
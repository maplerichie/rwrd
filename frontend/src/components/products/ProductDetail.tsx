import type { Product } from '../../types/product';

interface ProductDetailProps {
  product: Product;
}

function ProductDetail({ product }: ProductDetailProps) {
  return (
    <div className="p-4 bg-gradient-to-br from-[#23202b] to-[#19161c] rounded-lg border border-[#2a2a3a] shadow">
      <h2 className="text-xl font-bold text-white mb-2">{product.name}</h2>
      <div className="text-white/80 mb-2">{product.description}</div>
      <div className="text-white font-semibold mb-2">Price: <span className="text-[#14f195]">${product.price}</span></div>
      <div className="text-xs text-white/40">Created: {new Date(product.created_at).toLocaleString()}</div>
    </div>
  );
}

export { ProductDetail };
export default ProductDetail; 
import type { Product } from '../../types/product';
import { Button } from '../ui/button';
import { useState } from 'react';

interface ProductTableProps {
  products: Product[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  const [search, setSearch] = useState('');
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <input
        type="text"
        placeholder="Search products..."
        className="mb-4 px-3 py-2 rounded bg-[#23202b] border border-[#2a2a3a] text-white w-full"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((product) => (
          <div
            key={product.id}
            className="backdrop-blur-md bg-gradient-to-br from-[#23202b]/80 to-[#19161c]/80 border-2 border-transparent rounded-xl shadow-lg p-4 flex flex-col h-full relative group transition-transform duration-150 hover:scale-[1.025] hover:border-gradient-to-r hover:from-[#9945ff] hover:to-[#14f195]"
            style={{ borderImage: 'linear-gradient(90deg, #9945ff 0%, #14f195 100%) 1' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-full p-1 bg-gradient-to-tr from-[#9945ff] to-[#14f195]">
                <img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded-full border-2 border-[#23202b]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white truncate text-base tracking-wide drop-shadow">{product.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${product.active ? 'from-[#14f195]/80 to-[#9945ff]/80 text-white' : 'from-red-600/60 to-red-400/60 text-white'} shadow-sm`}>{product.active ? 'Active' : 'Inactive'}</span>
                </div>
                <span className="text-xs text-white/60 truncate block font-light">{product.description}</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <span className="font-bold text-lg bg-gradient-to-r from-[#14f195] to-[#9945ff] bg-clip-text text-transparent drop-shadow">${product.price}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="px-3 py-1 text-xs bg-gradient-to-r from-[#9945ff]/20 to-[#14f195]/20 border-none text-white hover:from-[#14f195]/40 hover:to-[#9945ff]/40" onClick={() => onEdit(product.id)}>
                  Edit
                </Button>
                <Button size="sm" variant="destructive" className="px-3 py-1 text-xs bg-gradient-to-r from-red-500/20 to-red-400/20 border-none text-white hover:from-red-600/40 hover:to-red-400/40" onClick={() => onDelete(product.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-white/60 text-center py-4">No products found.</div>}
    </div>
  );
} 
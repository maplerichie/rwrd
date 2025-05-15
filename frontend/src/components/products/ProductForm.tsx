import { useState } from 'react';
import type { Product } from '../../types/product';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface ProductFormProps {
  initialValues?: Partial<Product>;
  onSubmit: (product: { name: string; description?: string; price: number; image_url: string; active: boolean }) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function ProductForm({ initialValues = {}, onSubmit, onCancel, submitLabel = 'Save' }: ProductFormProps) {
  const [name, setName] = useState(initialValues.name || '');
  const [description, setDescription] = useState(initialValues.description || '');
  const [price, setPrice] = useState(initialValues.price?.toString() || '');
  const [imageUrl, setImageUrl] = useState(initialValues.image_url || 'https://st2.depositphotos.com/1030393/8474/v/950/depositphotos_84743176-stock-illustration-hand-drawn-cup-of-coffee.jpg');
  const [active, setActive] = useState(initialValues.active ?? true);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price.trim() || !imageUrl.trim()) {
      setError('Name, price, and image are required.');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Price must be a valid non-negative number.');
      return;
    }
    setError(null);
    onSubmit({ name: name.trim(), description: description.trim(), price: priceNum, image_url: imageUrl.trim(), active });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white mb-1">Name</label>
        <Input 
          className="bg-[#23202b] border border-[#3a3a4a] text-white placeholder:text-white/60 focus:ring-2 focus:ring-[#14f195] focus:border-[#14f195]"
          value={name} onChange={e => setName(e.target.value)} required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-1">Description</label>
        <Input 
          className="bg-[#23202b] border border-[#3a3a4a] text-white placeholder:text-white/60 focus:ring-2 focus:ring-[#14f195] focus:border-[#14f195]"
          value={description} onChange={e => setDescription(e.target.value)} 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-1">Price</label>
        <Input 
          type="number" min="0" step="0.01"
          className="bg-[#23202b] border border-[#3a3a4a] text-white placeholder:text-white/60 focus:ring-2 focus:ring-[#14f195] focus:border-[#14f195]"
          value={price} onChange={e => setPrice(e.target.value)} required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-1">Image URL</label>
        <Input 
          className="bg-[#23202b] border border-[#3a3a4a] text-white placeholder:text-white/60 focus:ring-2 focus:ring-[#14f195] focus:border-[#14f195]"
          value={imageUrl} onChange={e => setImageUrl(e.target.value)} required 
        />
        {imageUrl && <img src={imageUrl} alt="Preview" className="mt-2 rounded w-24 h-24 object-cover border border-[#2a2a3a]" />}
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} className="accent-[#14f195]" />
        <label htmlFor="active" className="text-white">Active</label>
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div className="flex gap-2">
        <Button type="submit">{submitLabel}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
} 
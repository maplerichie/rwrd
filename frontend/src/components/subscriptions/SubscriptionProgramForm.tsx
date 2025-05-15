import { useState } from 'react';
import type { SubscriptionProgram } from '../../types/subscriptionProgram';
import type { Product } from '../../types/product';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface SubscriptionProgramFormProps {
    initialValues?: Partial<SubscriptionProgram>;
    products: Product[];
    onSubmit: (program: { name: string; price: number; description?: string; quota: number; product_ids: string[]; active: boolean }) => void;
    onCancel?: () => void;
    submitLabel?: string;
}

export function SubscriptionProgramForm({ initialValues = {}, products, onSubmit, onCancel, submitLabel = 'Save' }: SubscriptionProgramFormProps) {
    const [name, setName] = useState(initialValues.name || '');
    const [description, setDescription] = useState(initialValues.description || '');
    const [price, setPrice] = useState(initialValues.price?.toString() || '');
    const [quota, setQuota] = useState(initialValues.quota?.toString() || '');
    const [productIds, setProductIds] = useState<string[]>(initialValues.product_ids || []);
    const [active, setActive] = useState(initialValues.active ?? true);
    const [error, setError] = useState<string | null>(null);

    function handleProductToggle(id: string) {
        setProductIds((prev) => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !price.trim() || !quota.trim() || productIds.length === 0) {
            setError('Name, price, quota, and at least one product are required.');
            return;
        }
        const priceNum = parseFloat(price);
        const quotaNum = parseInt(quota, 10);
        if (isNaN(priceNum) || priceNum < 0 || isNaN(quotaNum) || quotaNum <= 0) {
            setError('Price and quota must be valid positive numbers.');
            return;
        }
        setError(null);
        onSubmit({ name: name.trim(), price: priceNum, description: description.trim(), quota: quotaNum, product_ids: productIds, active });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-white mb-1">Name</label>
                <Input className="bg-[#23202b] border border-[#3a3a4a] text-white placeholder:text-white/60 focus:ring-2 focus:ring-[#14f195] focus:border-[#14f195]" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
                <label className="block text-sm font-medium text-white mb-1">Description</label>
                <Input className="bg-[#23202b] border border-[#3a3a4a] text-white placeholder:text-white/60 focus:ring-2 focus:ring-[#14f195] focus:border-[#14f195]" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-white mb-1">Price</label>
                <Input type="number" min="0" step="0.01" className="bg-[#23202b] border border-[#3a3a4a] text-white placeholder:text-white/60 focus:ring-2 focus:ring-[#14f195] focus:border-[#14f195]" value={price} onChange={e => setPrice(e.target.value)} required />
            </div>
            <div>
                <label className="block text-sm font-medium text-white mb-1">Quota</label>
                <Input type="number" min="1" step="1" className="bg-[#23202b] border border-[#3a3a4a] text-white placeholder:text-white/60 focus:ring-2 focus:ring-[#14f195] focus:border-[#14f195]" value={quota} onChange={e => setQuota(e.target.value)} required />
            </div>
            <div>
                <label className="block text-sm font-medium text-white mb-1">Products Included</label>
                <div className="flex flex-wrap gap-2">
                    {products.map(product => (
                        <label key={product.id} className={`flex items-center gap-2 px-3 py-1 rounded border cursor-pointer ${productIds.includes(product.id) ? 'bg-[#14f195]/20 border-[#14f195]' : 'bg-[#23202b] border-[#3a3a4a]'}`}>
                            <input type="checkbox" checked={productIds.includes(product.id)} onChange={() => handleProductToggle(product.id)} className="accent-[#14f195]" />
                            <span className="text-white text-sm">{product.name} - {product.price}</span>
                        </label>
                    ))}
                </div>
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
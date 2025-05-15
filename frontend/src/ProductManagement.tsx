import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getMerchantByWallet } from "./services/merchantService";
import { Plus } from 'lucide-react';
import { useProducts } from './hooks/useProducts';
import { useCreateProduct } from './hooks/useCreateProduct';
import { useUpdateProduct } from './hooks/useUpdateProduct';
import { useDeleteProduct } from './hooks/useDeleteProduct';
import { ProductTable } from './components/products/ProductTable';
import { ProductForm } from './components/products/ProductForm';
import type { Product } from './types/product';
import { toast } from 'sonner';
import { useSubscriptionPrograms } from './hooks/useSubscriptionPrograms';
import { useCreateSubscriptionProgram } from './hooks/useCreateSubscriptionProgram';
import { useUpdateSubscriptionProgram } from './hooks/useUpdateSubscriptionProgram';
import { useDeleteSubscriptionProgram } from './hooks/useDeleteSubscriptionProgram';
import { SubscriptionProgramForm } from './components/subscriptions/SubscriptionProgramForm';
import { SubscriptionProgramGrid } from './components/subscriptions/SubscriptionProgramGrid';
import type { SubscriptionProgram } from './types/subscriptionProgram';
import type { Merchant } from './types/merchant';

export default function ProductManagement() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [merchantError, setMerchantError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setMerchant(null);
      return;
    }
    setMerchantLoading(true);
    setMerchantError(null);
    getMerchantByWallet(walletAddress)
      .then((m) => {
        if (m) setMerchant(m);
        else setMerchantError("Merchant not found. Please sign up first.");
      })
      .catch(() => setMerchantError("Failed to fetch merchant info"))
      .finally(() => setMerchantLoading(false));
  }, [walletAddress]);

  const merchant_id = merchant?.id;
  const { products, loading, error, refetch } = useProducts(merchant_id);
  const { createProduct, loading: creating } = useCreateProduct();
  const { updateProduct, loading: updating } = useUpdateProduct();
  const { deleteProduct } = useDeleteProduct();
  const { subscriptionPrograms, loading: loadingPrograms, error: errorPrograms, refetch: refetchPrograms } = useSubscriptionPrograms(merchant_id);
  const { createSubscriptionProgram, loading: creatingProgram } = useCreateSubscriptionProgram();
  const { updateSubscriptionProgram, loading: updatingProgram } = useUpdateSubscriptionProgram();
  const { deleteSubscriptionProgram } = useDeleteSubscriptionProgram();

  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [editProgram, setEditProgram] = useState<SubscriptionProgram | null>(null);

  // For refetching, you may want to add a state key and update it after create/update/delete, or use a query lib
  // For now, this is a simple version
  // TODO: Integrate with a query lib or force refetch after mutation

  function handleAdd() {
    setEditProduct(null);
    setShowForm(true);
  }

  async function handleCreate(values: { name: string; description?: string; price: number; image_url: string; active: boolean }) {
    try {
      if (!merchant_id) throw new Error('Merchant not loaded');
      const result = await createProduct({ ...values, merchant_id });
      if (!result) {
        toast.error('Failed to create product: No product returned.');
        return;
      }
      setShowForm(false);
      refetch();
      toast.success('Product created successfully!');
    } catch (err: any) {
      toast.error('Failed to create product: ' + (err?.message || err));
    }
  }

  function handleEdit(id: string) {
    const product = products.find((p) => p.id === id) || null;
    setEditProduct(product);
    setShowForm(true);
  }

  async function handleUpdate(values: { name: string; description?: string; price: number; image_url: string; active: boolean }) {
    if (!editProduct) return;
    try {
      if (!merchant_id) throw new Error('Merchant not loaded');
      await updateProduct(editProduct.id, { ...values, merchant_id });
      setShowForm(false);
      setEditProduct(null);
      refetch();
      toast.success('Product updated successfully!');
    } catch (err: any) {
      toast.error('Failed to update product: ' + (err?.message || err));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      refetch();
      toast.success('Product deleted successfully!');
    } catch (err: any) {
      toast.error('Failed to delete product: ' + (err?.message || err));
    }
  }

  function handleAddProgram() {
    setEditProgram(null);
    setShowProgramForm(true);
  }

  async function handleCreateProgram(values: { name: string; price: number; description?: string; quota: number; product_ids: string[]; active: boolean }) {
    try {
      if (!merchant_id) throw new Error('Merchant not loaded');
      const result = await createSubscriptionProgram({ ...values, merchant_id, max_duration: 365 });
      if (!result) {
        toast.error('Failed to create subscription program: No program returned.');
        return;
      }
      setShowProgramForm(false);
      refetchPrograms();
      toast.success('Subscription program created successfully!');
    } catch (err: any) {
      toast.error('Failed to create subscription program: ' + (err?.message || err));
    }
  }

  function handleEditProgram(id: string) {
    const program = subscriptionPrograms.find((p) => p.id === id) || null;
    setEditProgram(program);
    setShowProgramForm(true);
  }

  async function handleUpdateProgram(values: { name: string; price: number; description?: string; quota: number; product_ids: string[]; active: boolean }) {
    if (!editProgram) return;
    try {
      if (!merchant_id) throw new Error('Merchant not loaded');
      const result = await updateSubscriptionProgram(editProgram.id, { ...values, merchant_id });
      if (!result) {
        toast.error('Failed to update subscription program: No program returned.');
        return;
      }
      setShowProgramForm(false);
      setEditProgram(null);
      refetchPrograms();
      toast.success('Subscription program updated successfully!');
    } catch (err: any) {
      toast.error('Failed to update subscription program: ' + (err?.message || err));
    }
  }

  async function handleDeleteProgram(id: string) {
    if (!window.confirm('Delete this subscription program?')) return;
    try {
      await deleteSubscriptionProgram(id);
      refetchPrograms();
      toast.success('Subscription program deleted successfully!');
    } catch (err: any) {
      toast.error('Failed to delete subscription program: ' + (err?.message || err));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#19161c] via-[#23202b] to-[#19161c] flex flex-col items-center px-4 py-8 pb-16">
      <div className="w-full max-w-6xl mx-auto mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-extrabold text-white drop-shadow">Your Products</h2>
        </div>
        <div className="flex justify-end gap-3">
          <Button size="lg" className="bg-gradient-to-r from-[#14f195] to-[#9945ff] text-[#19161c] font-bold shadow hover:from-[#9945ff] hover:to-[#14f195] hover:text-white transition flex items-center gap-2" onClick={handleAdd}>
            <Plus className="w-5 h-5" />Product
          </Button>
          <Button size="lg" className="bg-gradient-to-r from-[#9945ff] to-[#14f195] text-[#19161c] font-bold shadow hover:from-[#14f195] hover:to-[#9945ff] hover:text-white transition flex items-center gap-2" onClick={handleAddProgram}>
            <Plus className="w-5 h-5" />Subscription
          </Button>
        </div>
      </div>
      <div className="w-full max-w-6xl flex flex-col gap-6 z-10">
        {merchantLoading && <div className="text-white/80">Loading merchant...</div>}
        {merchantError && <div className="text-red-500">{merchantError}</div>}
        {/* Products */}
        {loading && <div className="text-white/80">Loading products...</div>}
        {error && <div className="text-red-500">{error.message}</div>}
        {!loading && !error && (
          <ProductTable products={products} onEdit={handleEdit} onDelete={handleDelete} />
        )}
        <hr />
        {/* Subscription Programs */}
        {loadingPrograms && <div className="text-white/80">Loading subscription programs...</div>}
        {errorPrograms && <div className="text-red-500">{errorPrograms.message}</div>}
        {!loadingPrograms && !errorPrograms && (
          <SubscriptionProgramGrid subscriptionPrograms={subscriptionPrograms} products={products} onEdit={handleEditProgram} onDelete={handleDeleteProgram} />
        )}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#23202b] p-6 rounded-lg shadow-xl w-full max-w-md">
              <ProductForm
                initialValues={editProduct || undefined}
                onSubmit={editProduct ? handleUpdate : handleCreate}
                onCancel={() => { setShowForm(false); setEditProduct(null); }}
                submitLabel={editProduct ? (updating ? 'Saving...' : 'Save') : (creating ? 'Creating...' : 'Create')}
              />
            </div>
          </div>
        )}
        {showProgramForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#23202b] p-6 rounded-lg shadow-xl w-full max-w-md">
              <SubscriptionProgramForm
                initialValues={editProgram || undefined}
                products={products}
                onSubmit={editProgram ? handleUpdateProgram : handleCreateProgram}
                onCancel={() => { setShowProgramForm(false); setEditProgram(null); }}
                submitLabel={editProgram ? (updatingProgram ? 'Saving...' : 'Save') : (creatingProgram ? 'Creating...' : 'Create')}
              />
            </div>
          </div>
        )}
      </div>
    </div >
  );
} 
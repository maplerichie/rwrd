import { useProducts } from './hooks/useProducts';
import { useSubscriptionPrograms } from './hooks/useSubscriptionPrograms';
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getMerchantByWallet } from './services/merchantService';
import { BadgePercent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode.react';
import type { Product } from './types/product';
import type { SubscriptionProgram } from './types/subscriptionProgram';
import type { Merchant } from './types/merchant';

// If you get a TS error for qrcode.react, add this ambient module declaration:
// declare module 'qrcode.react';

const DEFAULT_SUB_IMAGE = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'; // or any suitable icon

type CartItem =
  | { type: 'product'; item: Product; qty: number }
  | { type: 'subscription'; item: SubscriptionProgram; qty: number };

// Types for checkout QR payload
export type CheckoutItem = { id: string; qty: number };

export default function MerchantPOS() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [merchantError, setMerchantError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showQR, setShowQR] = useState(false);

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
  const { products, loading: productsLoading, error: productsError } = useProducts(merchant_id);
  const { subscriptionPrograms, loading: subsLoading, error: subsError } = useSubscriptionPrograms(merchant_id);
  const activeProducts = products.filter(p => p.active);
  const activeSubs = subscriptionPrograms.filter(s => s.active);

  // Add/increment product in cart
  function addProductToCart(product: Product) {
    setCart(prev => {
      const idx = prev.findIndex(item => item.type === 'product' && item.item.id === product.id);
      if (idx > -1) {
        return prev.map((item, i) => i === idx ? { ...item, qty: item.qty + 1 } : item);
      } else {
        return [...prev, { type: 'product', item: product, qty: 1 }];
      }
    });
  }

  // Add/increment subscription in cart
  function addSubToCart(sub: SubscriptionProgram) {
    setCart(prev => {
      const idx = prev.findIndex(item => item.type === 'subscription' && item.item.id === sub.id);
      if (idx > -1) {
        return prev.map((item, i) => i === idx ? { ...item, qty: item.qty + 1 } : item);
      } else {
        return [...prev, { type: 'subscription', item: sub, qty: 1 }];
      }
    });
  }

  // Decrement/remove item from cart
  function removeFromCart(type: 'product' | 'subscription', id: string) {
    setCart(prev => {
      const idx = prev.findIndex(item => item.type === type && item.item.id === id);
      if (idx > -1) {
        if (prev[idx].qty > 1) {
          return prev.map((item, i) => i === idx ? { ...item, qty: item.qty - 1 } : item);
        } else {
          return prev.filter((_, i) => i !== idx);
        }
      }
      return prev;
    });
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.item.price * item.qty, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#19161c] via-[#23202b] to-[#19161c] flex flex-col items-center px-4 py-8 pb-16">
      {merchantLoading && <div className="text-white/80">Loading merchant...</div>}
      {merchantError && <div className="text-red-500">{merchantError}</div>}
      <div className="w-full max-w-2xl mx-auto mb-6 flex items-center justify-between text-left">
        <h2 className="text-2xl font-extrabold text-white mb-2 drop-shadow">Point of Sale</h2>
        {cart.length > 0 && (
          <button
            onClick={() => setCart([])}
            className="ml-auto px-2 py-1 border rounded-lg border-[#9945ff] text-[#9945ff] font-bold shadow hover:from-red-600 hover:to-red-800 transition"
          >
            Reset
          </button>
        )}
      </div>
      {/* Cart Bar */}
      {cart.length > 0 && (
        <div className="w-full max-w-2xl mx-auto mb-4">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#23202b]/80 to-[#19161c]/80 border border-[#2a2a3a] rounded-xl shadow p-3 gap-2 cursor-pointer backdrop-blur-md" onClick={() => setShowQR(true)}>
            <div className="flex flex-wrap gap-2 items-center">
              {cart.map(item => (
                <div key={item.type + '-' + item.item.id} className="flex items-center gap-1 px-2 py-1 rounded bg-[#19161c]/80 border border-[#9945ff]/40 text-white text-xs font-semibold hover:bg-[#9945ff]/20 transition" onClick={e => { e.stopPropagation(); removeFromCart(item.type, item.item.id); }}>
                  <img src={item.type === 'product' ? item.item.image_url : DEFAULT_SUB_IMAGE} alt={item.item.name} className="w-6 h-6 rounded-full object-cover border border-[#23202b]" />
                  <span>{item.item.name}</span>
                  <span className="ml-1 text-[#14f195]">x{item.qty}</span>
                  <span className="ml-2 text-white/60">${(item.item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="font-bold text-lg bg-gradient-to-r from-[#14f195] to-[#9945ff] bg-clip-text text-transparent drop-shadow">${cartTotal.toFixed(2)}</span>
              <span className="text-[#9945ff]">Checkout</span>
            </div>
          </div>
        </div>
      )}
      {/* Unified Product & Subscription Grid */}
      <div className="w-full max-w-2xl flex flex-col gap-6 z-10">
        {(productsLoading || subsLoading) && <div className="text-white/80">Loading...</div>}
        {(productsError || subsError) && <div className="text-red-500">{productsError?.message || subsError?.message}</div>}
        {!productsLoading && !subsLoading && !productsError && !subsError && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-fr">
            {/* Products */}
            {activeProducts.map(product => (
              <div
                key={'product-' + product.id}
                className="bg-gradient-to-br from-[#23202b]/90 to-[#19161c]/90 border border-[#2a2a3a] rounded-xl shadow-lg p-2 flex flex-col items-center justify-center group transition-transform duration-150 hover:scale-[1.03] hover:shadow-2xl cursor-pointer aspect-square min-h-[110px]"
                style={{ borderImage: 'linear-gradient(90deg, #9945ff 0%, #14f195 100%) 1' }}
                onClick={() => addProductToCart(product)}
              >
                <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-full mb-1" />
                <span className="font-extrabold text-white truncate text-sm tracking-wide drop-shadow mb-1 text-center w-full">{product.name}</span>
                <span className="font-bold text-base bg-gradient-to-r from-[#14f195] to-[#9945ff] bg-clip-text text-transparent drop-shadow">${product.price}</span>
              </div>
            ))}
            {/* Subscription Programs */}
            {activeSubs.map(sub => (
              <div
                key={'subscription-' + sub.id}
                className="bg-gradient-to-br from-[#23202b]/90 to-[#19161c]/90 border border-[#2a2a3a] rounded-xl shadow-lg p-2 flex flex-col items-center justify-center group transition-transform duration-150 hover:scale-[1.03] hover:shadow-2xl cursor-pointer aspect-square min-h-[110px]"
                style={{ borderImage: 'linear-gradient(90deg, #9945ff 0%, #14f195 100%) 1' }}
                onClick={() => addSubToCart(sub)}
              >
                <span className="font-extrabold text-white truncate text-sm tracking-wide drop-shadow mb-1 text-center w-full flex items-center gap-1 justify-center">{sub.name} <BadgePercent className="w-4 h-4 text-[#14f195]" aria-label="Subscription" /></span>
                <div className="flex flex-wrap gap-1 justify-center mb-1 w-full">
                  {products.filter(p => sub.product_ids.includes(p.id)).map(p => (
                    <span key={p.id} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#9945ff]/60 to-[#14f195]/60 text-white/90 shadow-sm">{p.name}</span>
                  ))}<span className="px-2 py-0.5 text-xs font-semibold text-white/90 shadow-sm">x{sub.quota}</span>
                </div>
                <span className="font-bold text-base bg-gradient-to-r from-[#14f195] to-[#9945ff] bg-clip-text text-transparent drop-shadow">${sub.price}</span>
              </div>
            ))}
            {activeProducts.length === 0 && activeSubs.length === 0 && <div className="text-white/60 text-center py-4 col-span-full">No active products or subscriptions found.</div>}
          </div>
        )}
      </div>
      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowQR(false)}>
          <div className="bg-gradient-to-br from-[#23202b] to-[#19161c] rounded-xl shadow-lg p-8 w-96 flex flex-col items-center border-2 border-gradient-to-r from-[#9945ff] to-[#14f195]" onClick={e => e.stopPropagation()}>
            <div className="text-lg font-bold text-[#9945ff] mb-2 flex items-center gap-2">Sale</div>
            <QRCode value={generateCheckoutQrPayload(cart)} size={180} includeMargin={true} />
            <span className="text-white/80 mb-2 mt-4">Total: <span className="text-[#14f195] font-bold">${cartTotal.toFixed(2)}</span></span>
            <Button variant="outline" className="w-full border-[#9945ff] text-[#9945ff] hover:bg-[#9945ff]/10" onClick={() => setShowQR(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility to generate a compact QR payload for checkout
// Usage: generateCheckoutQrPayload({subscriptions: [{id, qty}], products: [{id, qty}]})
export function generateCheckoutQrPayload(cart: CartItem[]): string {
  let payload: any = {
    v: 1,
    c: {
      s: [],
      p: []
    }
  };
  cart.forEach(item => {
    if (item.type === 'subscription') {
      payload.c.s.push([item.item.id, item.qty]);
    } else {
      payload.c.p.push([item.item.id, item.qty]);
    }
  });
  return JSON.stringify(payload);
}

// Utility to parse and validate a compact QR payload
// Usage: const parsed = parseCheckoutQrPayload(qrString)
export function parseCheckoutQrPayload(qrString: string): { version: number; subscriptions: CheckoutItem[]; products: CheckoutItem[] } | null {
  try {
    const obj = JSON.parse(qrString);
    if (!obj || typeof obj !== 'object' || obj.v !== 1 || !obj.c) return null;
    const { s = [], p = [] } = obj.c;
    return {
      version: obj.v,
      subscriptions: Array.isArray(s) ? s.map((arr: [string, number]) => ({ id: arr[0], qty: arr[1] })) : [],
      products: Array.isArray(p) ? p.map((arr: [string, number]) => ({ id: arr[0], qty: arr[1] })) : [],
    };
  } catch {
    return null;
  }
} 
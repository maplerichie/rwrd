import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton, WalletDisconnectButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { getCustomerByWallet, createCustomer } from "./services/customerService";
import type { Customer } from "./types/customer";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { toast } from "sonner";
import { useCustomerSubscriptions } from "./hooks/useCustomerSubscriptions";

const pools = [
  { name: 'SOL', apy: '7.2%', tvl: '$1.2M', id: 'sol' },
  { name: 'USDC', apy: '5.8%', tvl: '$980K', id: 'usdc' },
  { name: 'RWRD', apy: '9.1%', tvl: '$2.3M', id: 'rwrd' },
];

function truncate(str: string, n = 8) {
  if (!str) return '';
  return str.length > n + 4 ? str.slice(0, n) + '...' + str.slice(-4) : str;
}

export default function Earn() {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58() || '';
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solBalance, setSolBalance] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { subscriptions, loading: subsLoading, error: subsError } = useCustomerSubscriptions(customer?.id);

  useEffect(() => {
    if (!walletAddress) {
      setCustomer(null);
      setShowSignUp(false);
      setSolBalance(null);
      return;
    }
    setLoading(true);
    setError(null);
    getCustomerByWallet(walletAddress)
      .then((data) => {
        if (data) {
          setCustomer(data);
          setShowSignUp(false);
        } else {
          setCustomer(null);
          setShowSignUp(true);
        }
      })
      .catch(() => {
        setError("Failed to fetch user info");
        setCustomer(null);
        setShowSignUp(true);
        toast.error("Failed to fetch user info");
      })
      .finally(() => setLoading(false));
    // Fetch SOL balance
    (async () => {
      if (publicKey) {
        try {
          const connection = new Connection(clusterApiUrl("devnet"));
          const lamports = await connection.getBalance(publicKey);
          setSolBalance((lamports / 1e9).toFixed(4));
        } catch {
          setSolBalance(null);
        }
      }
    })();
  }, [walletAddress, publicKey]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress) return;
    setLoading(true);
    setError(null);
    try {
      const customerData = await createCustomer({
        name: form.name,
        email: form.email,
        wallet_address: walletAddress
      });
      setCustomer(customerData);
      setShowSignUp(false);
      toast.success("Sign up successful! Welcome, " + customerData.name + ".");
    } catch (err: any) {
      setError("Failed to sign up: " + (err?.message || err));
      toast.error("Failed to sign up: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#19161c] flex flex-col items-center px-4 py-8 pb-16">
      <main className="w-full max-w-md flex flex-col gap-6 z-10">
        {/* Disconnect button stick top right */}
        {connected && customer && (
          <div className="flex justify-end w-full mb-2">
            <WalletDisconnectButton className="!bg-[#23202b] !border !border-[#9945ff] !text-white !font-bold !rounded !px-3 !py-1 hover:!bg-[#9945ff] hover:!text-[#19161c] transition text-sm shadow" />
          </div>
        )}
        {/* Wallet connect */}
        {!connected && (
          <div className="flex flex-col items-center gap-4 mt-8">
            <p className="text-white/80 text-center">Connect your wallet to start earning yield.</p>
            <WalletMultiButton className="!bg-gradient-to-r !from-[#14f195] !to-[#9945ff] !text-[#19161c] !font-bold !shadow-lg !text-lg w-full" />
          </div>
        )}
        {/* Loading */}
        {loading && <div className="text-white/80 text-center">Loading...</div>}
        {/* Sign up form */}
        {connected && walletAddress && !customer && showSignUp && !loading && (
          <form onSubmit={handleSignUp} className="w-full flex flex-col gap-4 mt-2">
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="rounded px-3 py-2 bg-[#19161c] border border-[#2a2a3a] text-white w-full"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="rounded px-3 py-2 bg-[#19161c] border border-[#2a2a3a] text-white w-full"
              required
            />
            <button type="submit" className="w-full py-2 rounded-lg bg-gradient-to-r from-[#14f195] to-[#9945ff] text-[#19161c] font-bold shadow hover:from-[#9945ff] hover:to-[#14f195] hover:text-white transition">Sign Up</button>
          </form>
        )}
        {/* Show wallet, balance, and user info if registered */}
        {connected && walletAddress && customer && !loading && (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-row justify-between items-center text-white/90 text-sm">
              <span className="font-mono truncate max-w-[160px]">{truncate(walletAddress, 8)}</span>
              <span className="font-bold text-[#14f195]">{solBalance !== null ? solBalance + ' SOL' : '...'}</span>
            </div>
            <div className="flex flex-row justify-between items-center text-white/90 text-sm">
              <span className="truncate max-w-[120px]">{customer.name}</span>
              <span className="truncate max-w-[140px]">{truncate(customer.email, 12)}</span>
            </div>
            <hr />
            {/* Pools Accordion */}
            <div className="flex flex-col gap-2 mt-4">
              <p className="text-white/80 mb-4">Stake and Spend Pools</p>
              {pools.map((pool) => (
                <div key={pool.id} className="rounded-lg bg-[#23202b] border border-[#2a2a3a]">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-white/90 font-medium focus:outline-none"
                    onClick={() => setExpanded(expanded === pool.id ? null : pool.id)}
                    aria-expanded={expanded === pool.id}
                  >
                    <span>{pool.name}</span>
                    <span className="text-[#14f195] font-bold">{pool.apy}</span>
                    <span className="ml-4 text-xs text-white/60">TVL {pool.tvl}</span>
                    <span className="ml-2">{expanded === pool.id ? '▲' : '▼'}</span>
                  </button>
                  {expanded === pool.id && (
                    <div className="px-4 pb-4 pt-2 flex flex-col gap-2 animate-fade-in">
                      <div className="flex flex-row justify-between text-white/80 text-sm">
                        <span>Staked</span>
                        <span className="font-semibold text-[#14f195]">$1,200</span>
                      </div>
                      <div className="flex flex-row justify-between text-white/80 text-sm">
                        <span>Earned</span>
                        <span className="font-semibold text-[#9945ff]">$42.50</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button className="flex-1 bg-gradient-to-r from-[#14f195] to-[#9945ff] text-[#19161c] font-bold shadow hover:from-[#9945ff] hover:to-[#14f195] hover:text-white transition">Stake</Button>
                        <Button variant="outline" className="flex-1 border-[#9945ff] text-[#9945ff] hover:bg-[#9945ff]/10">Withdraw</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* User Subscribed Programs */}
            <div className="mt-8">
              <h3 className="text-white font-semibold mb-2">Your Subscriptions</h3>
              {subsLoading ? (
                <div className="text-white/60">Loading subscriptions...</div>
              ) : subsError ? (
                <div className="text-red-500">Failed to load subscriptions.</div>
              ) : subscriptions.length === 0 ? (
                <div className="text-white/60">No subscriptions found.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {subscriptions.map((sub: any) => {
                    const program = sub.subscription_programs;
                    const merchant = program?.merchants;
                    return (
                      <div key={sub.id} className="rounded-lg bg-[#23202b] border border-[#2a2a3a] p-4 flex flex-col gap-1 shadow">
                        <div className="flex flex-row justify-between items-center">
                          <span className="font-bold text-white truncate max-w-[120px]">{program ? program.name : '...'}</span>
                          <span className="text-xs text-white/60 truncate max-w-[100px]">{merchant ? merchant.name : '...'}</span>
                        </div>
                        <div className="flex flex-row flex-wrap gap-2 text-xs text-white/80 mt-1">
                          {program && program.product_ids && program.product_ids.length > 0 ? (
                            <span>Items: {program.product_ids.length}</span>
                          ) : <span>Items: -</span>}
                          <span>Balance: <span className="font-bold text-[#14f195]">{sub.remaining_quota}</span>/{program ? program.quota : '-'}</span>
                          <span>Last used: {sub.last_redeemed_at ? new Date(sub.last_redeemed_at).toLocaleDateString() : '-'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        {error && <div className="text-red-500 text-center mt-2">{error}</div>}
      </main>
    </div>
  );
} 
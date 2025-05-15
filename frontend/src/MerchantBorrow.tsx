import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getMerchantByWallet } from "./services/merchantService";
import {
  getBorrowHistoryByMerchantId,
  updateTrustScore,
  getAPR,
  getWarning,
  getDebt,
} from "./services/trustScoreService";
import { DollarSign, TrendingUp } from "lucide-react";
import type { Merchant } from "./types/merchant";
import type { Borrowing } from "./types/borrowing";

export default function MerchantBorrow() {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [history, setHistory] = useState<Borrowing[]>([]);
  const [amount, setAmount] = useState(0);
  const [repayAmount, setRepayAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived values
  const trustScore = merchant && history ? updateTrustScore(merchant, history) : 3;
  const apr = getAPR(trustScore);
  const debt = getDebt(history);
  const borrowLimit = merchant ? (merchant.revenue ?? 0) * (trustScore * 0.1) : 0;
  const borrowable = borrowLimit - debt;
  const warning = merchant ? getWarning({ ...merchant, trust_score: trustScore }, history) : null;

  // Fetch merchant and borrow history when wallet changes
  useEffect(() => {
    if (!walletAddress) {
      setMerchant(null);
      setHistory([]);
      return;
    }
    setLoading(true);
    setError(null);
    getMerchantByWallet(walletAddress)
      .then((m) => {
        if (m) {
          setMerchant(m);
          return getBorrowHistoryByMerchantId(m.id);
        } else {
          setMerchant(null);
          setHistory([]);
          setError("Merchant not found. Please sign up first.");
          return [];
        }
      })
      .then((h) => setHistory(h))
      .catch((err) => {
        setError("Failed to fetch merchant or borrow history");
        setMerchant(null);
        setHistory([]);
      })
      .finally(() => setLoading(false));
  }, [walletAddress]);

  // UI handlers for borrow/repay (stubbed, as real logic would require backend tx)
  function handleBorrow() {
    // Implement real borrow logic here
    setAmount(0);
  }

  function handleRepay() {
    // Implement real repay logic here
    setRepayAmount(0);
  }

  return (
    <div className="min-h-screen bg-[#19161c] flex flex-col items-center px-4 py-8 pb-16">
      <div className="w-full max-w-2xl mx-auto mb-2 text-left">
        <h2 className="text-2xl font-extrabold text-white mb-2 drop-shadow">Lending</h2>
      </div>
      {loading && <div className="text-white/80">Loading...</div>}
      {error && <div className="text-red-500 text-center mb-4">{error}</div>}
      {warning && !loading && (
        <div className="w-full max-w-md mx-auto mb-4 p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-red-500/20 border border-yellow-500 text-yellow-200 text-sm font-semibold shadow">
          {warning}
        </div>
      )}
      {merchant && !loading && (
        <div className="w-full max-w-2xl flex flex-col gap-6 z-10">
          {/* Lending Analytics Card Style */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Metric icon={<DollarSign className="text-[#14f195]" />} label="Revenue" value={merchant.revenue ? `$${merchant.revenue.toLocaleString()}` : "0"} />
            <Metric icon={<DollarSign className="text-[#9945ff]" />} label="Trust Score" value={trustScore} />
            <Metric icon={<DollarSign className="text-[#9945ff]" />} label="Borrow Limit" value={`$${borrowLimit.toLocaleString()}`} />
            <Metric icon={<TrendingUp className="text-[#14f195]" />} label="Utilization" value={`${borrowLimit ? ((debt / borrowLimit) * 100).toFixed(1) : 0}%`} />
          </div>
          {/* Borrow Section */}
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#14f195] shadow-xl p-4 flex flex-col gap-3">
            <CardContent className="p-0 flex flex-col gap-3">
              <div className="flex flex-row gap-2 justify-between items-center">
                <div className="flex flex-row gap-2">
                  <span className="text-xs text-white/40">Borrowable</span>
                  <span className="font-bold text-white">{`$${borrowable.toLocaleString()}`}</span>
                </div>
                <div className="flex flex-row gap-2">
                  <span className="text-xs text-white/40">APR</span>
                  <span className="font-bold text-white">{`${apr}%`}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 items-center mt-2">
                <input
                  type="number"
                  min={1}
                  max={borrowable}
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="rounded px-2 py-1 bg-[#23202b] border border-[#2a2a3a] text-white w-full sm:w-28"
                  placeholder="Borrow"
                  disabled={borrowable <= 0}
                />
                <button onClick={handleBorrow} className="flex-1 bg-gradient-to-r from-[#14f195] to-[#9945ff] text-[#19161c] font-bold shadow hover:from-[#9945ff] hover:to-[#14f195] hover:text-white transition w-full sm:w-auto rounded px-4 py-2" disabled={borrowable <= 0 || amount <= 0 || amount > borrowable}>Borrow</button>
              </div>
            </CardContent>
          </Card>
          {/* Repay Section */}
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#9945ff] shadow-xl p-4 flex flex-col gap-3">
            <CardContent className="p-0 flex flex-col gap-3">
              <div className="flex flex-row gap-2 justify-between items-center">
                <div className="flex flex-row gap-2">
                  <span className="text-xs text-white/40">Debt</span>
                  <span className="font-bold text-white">{`$${debt.toLocaleString()}`} </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 items-center mt-2">
                <input
                  type="number"
                  min={1}
                  max={debt}
                  value={repayAmount}
                  onChange={e => setRepayAmount(Number(e.target.value))}
                  className="rounded px-2 py-1 bg-[#23202b] border border-[#2a2a3a] text-white w-full sm:w-28"
                  placeholder="Repay"
                  disabled={debt <= 0}
                />
                <button onClick={handleRepay} className="flex-1 bg-gradient-to-r from-[#9945ff] to-[#14f195] text-[#19161c] font-bold shadow hover:from-[#14f195] hover:to-[#9945ff] hover:text-white transition w-full sm:w-auto rounded px-4 py-2" disabled={debt <= 0 || repayAmount <= 0 || repayAmount > debt}>Repay</button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex flex-row items-center gap-4 bg-[#19161c] rounded-lg p-2 shadow border border-[#2a2a3a]">
      <span>{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs text-white/40">{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
    </div>
  );
} 
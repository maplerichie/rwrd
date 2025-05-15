import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { getMerchantByWallet } from "./services/merchantService";
import { getBorrowHistoryByMerchantId } from "./services/trustScoreService";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Merchant } from "./types/merchant";
import type { Borrowing } from "./types/borrowing";

function getSalesAnalytics(history: any[]) {
  const sales = history.filter(h => h.type === "sale");
  const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);
  const salesCount = sales.length;
  const avgSale = salesCount ? (totalSales / salesCount) : 0;
  const recentSales = sales.slice(-5).reverse();
  // Simulate trend: up if last sale > avg, down otherwise
  const trend = recentSales[0] && recentSales[0].amount > avgSale ? "up" : "down";
  return { totalSales, salesCount, avgSale, recentSales, trend };
}

const TABS = ["Sales", "Subscriptions", "Lending"];

export default function MerchantPortfolio() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;
  const [_merchant, setMerchant] = useState<Merchant | null>(null);
  const [history, setHistory] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("Sales");

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
      .catch(() => {
        setError("Failed to fetch merchant or borrow history");
        setMerchant(null);
        setHistory([]);
      })
      .finally(() => setLoading(false));
  }, [walletAddress]);

  // Simulate sales and subscriptions for demo
  // In a real app, salesHistory and subsHistory would come from real sales/subscription data
  const salesHistory = [] as any[]; // No sales in trustScoreService demo
  const subsHistory = [] as any[]; // No subscriptions in trustScoreService demo
  const lendingHistory = history.filter(h => h.type === "borrow" || h.type === "repay" || h.type === "penalty");
  const salesAnalytics = getSalesAnalytics(history);

  return (
    <div className="min-h-screen bg-[#19161c] flex flex-col items-center px-4 py-8 pb-16">
      <div className="w-full max-w-2xl mx-auto mb-2 text-left">
        <h2 className="text-2xl font-extrabold text-white mb-2 drop-shadow">Portfolio</h2>
      </div>
      {loading && <div className="text-white/80">Loading...</div>}
      {error && <div className="text-red-500 text-center mb-4">{error}</div>}
      <div className="w-full max-w-2xl flex flex-col gap-6 z-10">
        {/* Sales Analytics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-2">
          <Metric icon={<DollarSign className="text-[#14f195]" />} label="Total Sales" value={`$${salesAnalytics.totalSales.toLocaleString()}`} />
          <Metric icon={<TrendingUp className="text-[#14f195]" />} label="Sales Count" value={salesAnalytics.salesCount} />
          <Metric icon={<DollarSign className="text-[#9945ff]" />} label="Avg Sale" value={`$${salesAnalytics.avgSale.toFixed(2)}`} />
          <Metric icon={salesAnalytics.trend === "up" ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )} label="Trend" value={`${salesAnalytics.recentSales.length}`} />
        </div>
        {/* <div className="mt-3">
              <div className="text-xs text-white/40 mb-1">Recent Sales</div>
              <ul className="divide-y divide-[#2a2a3a] text-xs text-white/80">
                {salesAnalytics.recentSales.length === 0 && <li className="py-2 text-white/60">No sales yet.</li>}
                {salesAnalytics.recentSales.map((s: any, i: number) => (
                  <li key={i} className="flex items-center justify-between py-1">
                    <span className="font-semibold text-[#14f195]">${s.amount}</span>
                    <span className="text-white/60">{new Date(s.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </div> */}
        {/* History Tabs */}
        <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow p-3">
          <CardHeader className="pb-2 flex flex-row items-center gap-4">
            <div className="flex gap-2 ml-auto">
              {TABS.map((t) => (
                <button
                  key={t}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${tab === t ? "bg-gradient-to-r from-[#14f195] to-[#9945ff] text-white" : "bg-[#23202b] text-white/60 hover:bg-[#19161c]"}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-[#2a2a3a] text-xs text-white/80">
              {tab === "Lending" && (
                lendingHistory.length === 0 ? <li className="py-2 text-white/60">No lending history.</li> :
                  lendingHistory.slice(-10).reverse().map((b, i) => (
                    <li key={i} className="flex items-center justify-between py-2 gap-2">
                      <span className={`font-bold ${b.type === 'borrow' ? 'text-[#14f195]' : b.type === 'repay' ? 'text-[#9945ff]' : b.type === 'penalty' ? 'text-red-400' : 'text-white'}`}>{b.type.toUpperCase()}</span>
                      <span className="font-semibold text-white">${b.amount}</span>
                      <span className="text-white/60">{new Date(b.created_at).toLocaleDateString()}</span>
                    </li>
                  ))
              )}
              {tab === "Sales" && (
                salesHistory.length === 0 ? <li className="py-2 text-white/60">No sales history.</li> :
                  salesHistory.slice(-10).reverse().map((b, i) => (
                    <li key={i} className="flex items-center justify-between py-2 gap-2">
                      <span className={`font-bold text-[#14f195]`}>{b.type.toUpperCase()}</span>
                      <span className="font-semibold text-white">${b.amount}</span>
                      <span className="text-white/60">{new Date(b.created_at).toLocaleDateString()}</span>
                    </li>
                  ))
              )}
              {tab === "Subscriptions" && (
                subsHistory.length === 0 ? <li className="py-2 text-white/60">No subscription history.</li> :
                  subsHistory.slice(-10).reverse().map((b, i) => (
                    <li key={i} className="flex items-center justify-between py-2 gap-2">
                      <span className={`font-bold text-[#9945ff]`}>{b.type.toUpperCase()}</span>
                      <span className="font-semibold text-white">${b.amount}</span>
                      <span className="text-white/60">{new Date(b.created_at).toLocaleDateString()}</span>
                    </li>
                  ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
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
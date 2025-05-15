import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-[#19161c] flex flex-col items-center px-4 py-8 pb-16">
      <div className="w-full max-w-md mx-auto mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-[#9945ff]/30 to-[#14f195]/30 border border-white/10 text-[#14f195] font-semibold text-sm mb-4">
          <BarChart3 className="w-5 h-5" /> Portfolio
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2 drop-shadow">Your Portfolio</h2>
        <p className="text-white/80 mb-4">Track your balances, yield, and payment history. All in one place, powered by Solana.</p>
      </div>
      <div className="w-full max-w-md flex flex-col gap-6 z-10">
        <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-xl">
          <CardHeader><CardTitle className="text-base text-white">Balances</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1 mb-4">
              <span className="text-white/80">Staked: <span className="font-semibold text-[#14f195]">$1,200</span></span>
              <span className="text-white/80">Yield: <span className="font-semibold text-[#9945ff]">$42.50</span></span>
              <span className="text-white/80">Available: <span className="font-semibold text-[#14f195]">$300</span></span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-xl">
          <CardHeader><CardTitle className="text-base text-white">History</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center justify-between border-b border-[#2a2a3a] pb-2 last:border-b-0 last:pb-0">
                <span className="font-semibold text-[#9945ff]">Staked</span>
                <span className="text-sm text-white/60">$500 • 2024-05-01</span>
              </li>
              <li className="flex items-center justify-between border-b border-[#2a2a3a] pb-2 last:border-b-0 last:pb-0">
                <span className="font-semibold text-[#14f195]">Yield Paid</span>
                <span className="text-sm text-white/60">$12.50 • 2024-05-10</span>
              </li>
              <li className="flex items-center justify-between border-b border-[#2a2a3a] pb-2 last:border-b-0 last:pb-0">
                <span className="font-semibold text-[#9945ff]">Payment</span>
                <span className="text-sm text-white/60">$20 • 2024-05-15</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
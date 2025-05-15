import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SolanaWalletProvider } from "./WalletProvider";
import Earn from './Earn';
import Pay from './Pay';
import Portfolio from './Portfolio';
import ProductManagement from './ProductManagement';
import MerchantPOS from './MerchantPOS';
import MerchantBorrow from './MerchantBorrow';
import MerchantPortfolio from './MerchantPortfolio';
import MerchantHome from './MerchantHome';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight, Home, Coins, Users, ShieldCheck, TrendingUp, Zap, ShoppingCart, Wallet, BarChart3, Package } from 'lucide-react';
import FloatingNav from "@/components/ui/FloatingNav";
import { Toaster } from "@/components/ui/sonner";

// --- Landing Page Component ---
function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#19161c] flex flex-col items-center px-0 overflow-x-hidden">
      {/* Animated background sparkles */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[140vw] h-[140vw] bg-gradient-radial from-[#14f19522] via-[#9945ff11] to-transparent animate-spin-slow rounded-full blur-2xl opacity-70" />
      </div>
      {/* Navbar */}
      <nav className="w-full flex justify-between items-center py-6 px-4 z-10">
        <div className="flex items-center gap-2">
          <img src="/icon.png" alt="RWRD Logo" className="h-10 shadow-lg" />
        </div>
        <ul className="hidden md:flex gap-8 text-white/90 font-semibold text-base">
          <li><a href="#features" className="hover:text-[#14f195] transition">Features</a></li>
          <li><a href="#how-it-works" className="hover:text-[#14f195] transition">How It Works</a></li>
          <li><a href="#use-cases" className="hover:text-[#14f195] transition">Use Cases</a></li>
          <li><a href="#ecosystem" className="hover:text-[#14f195] transition">Ecosystem</a></li>
          <li><a href="#comparison" className="hover:text-[#14f195] transition">Comparison</a></li>
          <li><a href="#revenue" className="hover:text-[#14f195] transition">Revenue</a></li>
          <li><a href="#security" className="hover:text-[#14f195] transition">Security</a></li>
          <li><a href="#get-involved" className="hover:text-[#14f195] transition">Get Involved</a></li>
        </ul>
      </nav>
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center text-center mt-8 mb-10 z-10 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-[#9945ff]/30 to-[#14f195]/30 border border-white/10 text-[#14f195] font-semibold text-sm mb-3 animate-fade-in shadow-lg">
          <Sparkles className="w-5 h-5 animate-pulse" /> PayFi on Solana
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg 
        mb-4 animate-fade-in leading-tight">
          <span className="bg-gradient-to-r from-[#9945ff] to-[#14f195] bg-clip-text 
          text-transparent">Payments, Loyalty & Merchant Financing</span>
        </h1>
        <p className="text-base md:text-xl text-white/80 max-w-xl mx-auto mb-6 animate-fade-in delay-100">
          RWRD lets you earn yield, pay, and access trust-based financing—securely and instantly on Solana.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in delay-200 w-full max-w-xs mx-auto">
          <Button size="lg" className="bg-gradient-to-r from-[#14f195] to-[#9945ff] text-[#19161c] font-bold shadow-lg hover:from-[#9945ff] hover:to-[#14f195] hover:text-white transition w-full" asChild>
            <a href="/app">Try as User <ArrowRight className="ml-2 w-5 h-5" /></a>
          </Button>
          <Button size="lg" className="text-[#14f195] bg-[#19161c] border border-[#14f195] font-bold shadow-lg hover:bg-[#9945ff] hover:text-white transition w-full" asChild>
            <a href="/merchant">Become a Merchant <ArrowRight className="ml-2 w-5 h-5" /></a>
          </Button>
        </div>
      </section>
      {/* Section Divider */}
      <div className="w-full h-2 bg-gradient-to-r from-[#9945ff]/40 via-transparent to-[#14f195]/40 mb-6" />
      {/* Features */}
      <section id="features" className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 z-10 px-4">
        <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] shadow-xl border border-[#2a2a3a]">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Coins className="w-6 h-6 text-[#14f195]" />
            <CardTitle className="text-base font-bold text-white">NFT Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 text-sm">Dynamic NFTs track quota & expiry; funds earn yield until used.</CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] shadow-xl border border-[#2a2a3a]">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <TrendingUp className="w-6 h-6 text-[#9945ff]" />
            <CardTitle className="text-base font-bold text-white">Stake & Spend</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 text-sm">Stake to earn, pay with yield, withdraw anytime—NFTs track your position.</CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] shadow-xl border border-[#2a2a3a]">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ShieldCheck className="w-6 h-6 text-[#14f195]" />
            <CardTitle className="text-base font-bold text-white">Trust-Based Loans</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 text-sm">Merchants borrow up to 50% of revenue, based on dynamic Trust Score.</CardContent>
        </Card>
      </section>
      {/* Section Divider */}
      <div className="w-full h-2 bg-gradient-to-r from-[#14f195]/40 via-transparent to-[#9945ff]/40 mb-6" />
      {/* How It Works */}
      <section id="how-it-works" className="w-full max-w-4xl mx-auto mb-10 z-10 px-4">
        <h2 className="text-xl font-bold text-white mb-4 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2 pb-2">
              <Users className="w-7 h-7 text-[#9945ff]" />
              <CardTitle className="text-sm font-bold text-white">Subscribe</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-xs">Mint NFT, funds enter RWRD pool.</CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2 pb-2">
              <Wallet className="w-7 h-7 text-[#14f195]" />
              <CardTitle className="text-sm font-bold text-white">Earn Yield</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-xs">Funds earn yield via DeFi.</CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2 pb-2">
              <Zap className="w-7 h-7 text-[#9945ff]" />
              <CardTitle className="text-sm font-bold text-white">Redeem</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-xs">Scan QR, update NFT, get benefits.</CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2 pb-2">
              <Home className="w-7 h-7 text-[#14f195]" />
              <CardTitle className="text-sm font-bold text-white">Merchant Loans</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-xs">Borrow based on Trust Score.</CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2 pb-2">
              <ShieldCheck className="w-7 h-7 text-[#9945ff]" />
              <CardTitle className="text-sm font-bold text-white">Protected</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-xs">Multi-sig, reserves, insurance.</CardContent>
          </Card>
        </div>
      </section>
      {/* Section Divider */}
      <div className="w-full h-2 bg-gradient-to-r from-[#9945ff]/40 via-transparent to-[#14f195]/40 mb-6" />
      {/* Use Cases */}
      <section id="use-cases" className="w-full max-w-4xl mx-auto mb-10 z-10 px-4">
        <h2 className="text-xl font-bold text-white mb-4 text-center">Use Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2 pb-2">
              <ShoppingCart className="w-7 h-7 text-[#14f195]" />
              <CardTitle className="text-sm font-bold text-white">Coffee Loyalty</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-xs">Subscribe, earn yield, redeem or resell unused.</CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2 pb-2">
              <BarChart3 className="w-7 h-7 text-[#9945ff]" />
              <CardTitle className="text-sm font-bold text-white">Everyday Spend</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-xs">Stake, earn, and pay at merchants—your money works for you.</CardContent>
          </Card>
        </div>
      </section>
      {/* Section Divider */}
      <div className="w-full h-2 bg-gradient-to-r from-[#14f195]/40 via-transparent to-[#9945ff]/40 mb-6" />
      {/* Solana Ecosystem Advantages */}
      <section id="ecosystem" className="w-full max-w-4xl mx-auto mb-10 z-10 px-4">
        <h2 className="text-xl font-bold text-white mb-4 text-center">Solana Advantages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2 pb-2">
              <Zap className="w-7 h-7 text-[#9945ff]" />
              <CardTitle className="text-sm font-bold text-white">Fast & Cheap</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-xs">400ms finality, ~$0.0005 per tx, ideal for micro-payments.</CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader className="flex flex-col items-center gap-2 pb-2">
              <TrendingUp className="w-7 h-7 text-[#14f195]" />
              <CardTitle className="text-sm font-bold text-white">DeFi Power</CardTitle>
            </CardHeader>
            <CardContent className="text-white/80 text-xs">Access Solana's $3.6B+ DeFi ecosystem for yield.</CardContent>
          </Card>
        </div>
      </section>
      {/* Section Divider */}
      <div className="w-full h-2 bg-gradient-to-r from-[#9945ff]/40 via-transparent to-[#14f195]/40 mb-6" />
      {/* Comparison Table */}
      <section id="comparison" className="w-full max-w-3xl mx-auto mb-10 z-10 px-2">
        <h2 className="text-xl font-bold text-white mb-4 text-center">Feature Comparison</h2>
        <div className="overflow-x-auto rounded-lg shadow-lg">
          <table className="min-w-full text-xs text-left bg-gradient-to-br from-[#23202b] to-[#19161c] text-white/90 border border-[#2a2a3a]">
            <thead className="bg-gradient-to-r from-[#9945ff] to-[#14f195] text-white">
              <tr>
                <th className="px-2 py-1">Feature</th>
                <th className="px-2 py-1">RWRD</th>
                <th className="px-2 py-1">Traditional</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white/5">
                <td className="px-2 py-1 font-semibold">Yield on Funds</td>
                <td className="px-2 py-1 text-[#14f195] font-bold">Yes</td>
                <td className="px-2 py-1 text-white/60">No</td>
              </tr>
              <tr className="bg-white/10">
                <td className="px-2 py-1 font-semibold">Fund Ownership</td>
                <td className="px-2 py-1 text-[#14f195] font-bold">Customer</td>
                <td className="px-2 py-1 text-white/60">Merchant</td>
              </tr>
              <tr className="bg-white/5">
                <td className="px-2 py-1 font-semibold">Merchant Loans</td>
                <td className="px-2 py-1 text-[#9945ff] font-bold">Trust Score</td>
                <td className="px-2 py-1 text-white/60">Collateral</td>
              </tr>
              <tr className="bg-white/10">
                <td className="px-2 py-1 font-semibold">Transferable</td>
                <td className="px-2 py-1 text-[#14f195] font-bold">NFTs tradable</td>
                <td className="px-2 py-1 text-white/60">Locked</td>
              </tr>
              <tr className="bg-white/5">
                <td className="px-2 py-1 font-semibold">Transparency</td>
                <td className="px-2 py-1 text-[#14f195] font-bold">On-chain</td>
                <td className="px-2 py-1 text-white/60">Opaque</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      {/* Section Divider */}
      <div className="w-full h-2 bg-gradient-to-r from-[#14f195]/40 via-transparent to-[#9945ff]/40 mb-6" />
      {/* Revenue Model */}
      <section id="revenue" className="w-full max-w-4xl mx-auto mb-10 z-10 px-4">
        <h2 className="text-xl font-bold text-white mb-4 text-center">Revenue</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader><CardTitle className="text-sm font-bold text-white">Merchant & Service Fees</CardTitle></CardHeader>
            <CardContent className="text-white/80 text-xs">Setup, redemption, analytics, and premium features.</CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader><CardTitle className="text-sm font-bold text-white">Borrowing & Yield</CardTitle></CardHeader>
            <CardContent className="text-white/80 text-xs">Origination, interest, and yield performance fees.</CardContent>
          </Card>
        </div>
      </section>
      {/* Section Divider */}
      <div className="w-full h-2 bg-gradient-to-r from-[#9945ff]/40 via-transparent to-[#14f195]/40 mb-6" />
      {/* Security & Risk Management */}
      <section id="security" className="w-full max-w-4xl mx-auto mb-10 z-10 px-4">
        <h2 className="text-xl font-bold text-white mb-4 text-center">Security</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader><CardTitle className="text-sm font-bold text-white">Reserves & Insurance</CardTitle></CardHeader>
            <CardContent className="text-white/80 text-xs">Reserve pool, insurance, and clear risk disclosure.</CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader><CardTitle className="text-sm font-bold text-white">Transparent Risk</CardTitle></CardHeader>
            <CardContent className="text-white/80 text-xs">Visible yield expectations and borrowing exposure.</CardContent>
          </Card>
        </div>
      </section>
      {/* Section Divider */}
      <div className="w-full h-2 bg-gradient-to-r from-[#14f195]/40 via-transparent to-[#9945ff]/40 mb-6" />
      {/* Get Involved */}
      <section id="get-involved" className="w-full max-w-4xl mx-auto mb-10 z-10 px-4">
        <h2 className="text-xl font-bold text-white mb-4 text-center">Get Involved</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader><CardTitle className="text-sm font-bold text-white">Developers</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-2 text-white/80 text-xs">Build, integrate, or contribute to RWRD.</p>
              <Button className="w-full bg-gradient-to-r from-[#14f195] to-[#9945ff] text-[#19161c] font-bold shadow hover:from-[#9945ff] hover:to-[#14f195] hover:text-white transition" size="lg">Join as Developer</Button>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader><CardTitle className="text-sm font-bold text-white">Merchants</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-2 text-white/80 text-xs">Offer loyalty, earn yield, and access financing.</p>
              <Button className="w-full bg-gradient-to-r from-[#9945ff] to-[#14f195] text-white font-bold shadow hover:from-[#14f195] hover:to-[#9945ff] hover:text-[#19161c] transition" size="lg" asChild><a href="/merchant">Become a Merchant</a></Button>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#23202b] to-[#19161c] border border-[#2a2a3a] shadow-lg flex flex-col items-center text-center">
            <CardHeader><CardTitle className="text-sm font-bold text-white">Customers</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-2 text-white/80 text-xs">Earn yield while you spend and subscribe.</p>
              <Button className="w-full bg-gradient-to-r from-[#14f195] to-[#9945ff] text-[#19161c] font-bold shadow hover:from-[#9945ff] hover:to-[#14f195] hover:text-white transition" size="lg" asChild><a href="/app">Try as User</a></Button>
            </CardContent>
          </Card>
        </div>
      </section>
      {/* Footer */}
      <footer className="w-full text-center py-6 text-white/60 text-xs border-t border-[#2a2a3a] mt-auto z-10 bg-[#19161c]">
        <div className="flex flex-wrap justify-center gap-4 mb-1">
          <a href="#" aria-label="Website" className="hover:text-[#14f195] transition">Website</a>
          <a href="#" aria-label="Discord" className="hover:text-[#14f195] transition">Discord</a>
          <a href="#" aria-label="Twitter" className="hover:text-[#14f195] transition">Twitter</a>
          <a href="#" aria-label="Docs" className="hover:text-[#14f195] transition">Docs</a>
        </div>
        <span className="block font-bold text-white/80 mt-1">RWRD: The future of business and customer finance on Solana.</span>
        <span>© {new Date().getFullYear()} RWRD. Built on Solana.</span>
      </footer>
    </div>
  );
}

function ConsumerRoutes() {
  const location = useLocation();
  return (
    <>
      <Routes>
        <Route path="earn" element={<Earn />} />
        <Route path="pay" element={<Pay />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="*" element={<Navigate to="earn" replace />} />
      </Routes>
      {location.pathname.startsWith("/app/") && <FloatingNav />}
    </>
  );
}

function MerchantRoutes() {
  const location = useLocation();
  const merchantNav = [
    { to: "/merchant/products", icon: <Package className="w-6 h-6" />, key: "products" },
    { to: "/merchant/pos", icon: <ShoppingCart className="w-6 h-6" />, key: "pos" },
    { to: "/merchant/home", icon: <Home className="w-6 h-6" />, key: "home" },
    { to: "/merchant/borrow", icon: <Wallet className="w-6 h-6" />, key: "borrow" },
    { to: "/merchant/portfolio", icon: <BarChart3 className="w-6 h-6" />, key: "portfolio" },
  ];
  return (
    <>
      <Routes>
        <Route path="products" element={<ProductManagement />} />
        <Route path="pos" element={<MerchantPOS />} />
        <Route path="borrow" element={<MerchantBorrow />} />
        <Route path="portfolio" element={<MerchantPortfolio />} />
        <Route path="home" element={<MerchantHome />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Routes>
      {location.pathname.startsWith("/merchant/") && <FloatingNav navItems={merchantNav} />}
    </>
  );
}

function App() {
  return (
    <SolanaWalletProvider>
      <Router>
        <Toaster />
        <div className="consumer-mobile-root">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app/*" element={<ConsumerRoutes />} />
            <Route path="/merchant/*" element={<MerchantRoutes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </SolanaWalletProvider>
  );
}

export default App

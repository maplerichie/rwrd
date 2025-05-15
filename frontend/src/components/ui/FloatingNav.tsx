import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { Wallet, QrCode, BarChart3, Package } from "lucide-react";

export type NavItem = {
  to: string;
  icon: React.ReactNode;
  key: string;
};

const defaultConsumerNav: NavItem[] = [
  { to: "/app/earn", icon: <Wallet className="w-5 h-5" />, key: "earn" },
  { to: "/app/pay", icon: <QrCode className="w-5 h-5" />, key: "pay" },
  { to: "/app/portfolio", icon: <BarChart3 className="w-5 h-5" />, key: "portfolio" },
];

export default function FloatingNav({ navItems }: { navItems?: NavItem[] }) {
  const location = useLocation();
  const items = navItems || defaultConsumerNav;
  return (
    <nav className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50">
      <div className="flex gap-2 px-3 py-2 rounded-full shadow-lg bg-black/70 backdrop-blur border border-[#23202b]/80">
        {items.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.key}
              to={item.to}
              className={clsx(
                "flex items-center justify-center w-10 h-10 rounded-full transition",
                isActive
                  ? "bg-gradient-to-br from-[#9945ff] to-[#14f195] text-white shadow"
                  : "text-[#14f195] hover:bg-[#23202b]"
              )}
            >
              {item.icon}
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 
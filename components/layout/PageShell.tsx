import Link from "next/link";
import ConnectButton from "@/components/ui/ConnectButton";
import NetworkBadge from "@/components/botchain/NetworkBadge";
import BuiltOnBotChain from "@/components/botchain/BuiltOnBotChain";
import { footerLinks } from "@/lib/botchain/chain";

interface PageShellProps {
  children: React.ReactNode;
  activeTab?: "pay" | "causes" | "me";
}

export function PageShell({ children, activeTab }: PageShellProps) {
  const { site, explorer } = footerLinks();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Coin dish rounded bar */}
      <div className="bg-[#5C162E] text-[#FFE8DF] text-xs py-1.5 px-4 text-center font-medium border-b border-[#7A1F3D]">
        Every transaction rounds up to support open causes.
      </div>

      <nav className="bg-[var(--bg-surface)] border-b-4 border-[#BC8579] sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#7A1F3D] text-white flex items-center justify-center font-heading text-xl shadow-md rotate-[-3deg] hover:rotate-0 transition-transform">
                🪙
              </div>
              <div>
                <span className="font-heading text-2xl tracking-tight text-[#2B0A15] block leading-none">
                  Spare
                </span>
                <span className="text-[10px] font-semibold text-[#704444] uppercase tracking-wider">
                  Coin Dish Payments
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/"
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "pay"
                    ? "bg-[#7A1F3D] text-white shadow-sm"
                    : "text-[#5C2434] hover:bg-[#FFEAE2]"
                }`}
              >
                Pay &amp; Round Up
              </Link>
              <Link
                href="/causes"
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "causes"
                    ? "bg-[#7A1F3D] text-white shadow-sm"
                    : "text-[#5C2434] hover:bg-[#FFEAE2]"
                }`}
              >
                Explore Causes
              </Link>
              <Link
                href="/me"
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "me"
                    ? "bg-[#7A1F3D] text-white shadow-sm"
                    : "text-[#5C2434] hover:bg-[#FFEAE2]"
                }`}
              >
                My Giving Tray
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <NetworkBadge />
            <ConnectButton />
          </div>
        </div>

        {/* Mobile quick tabs */}
        <div className="md:hidden flex border-t border-[#D99D8D] px-3 py-1.5 gap-1.5 bg-[#FFF0EA]">
          <Link
            href="/"
            className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold ${
              activeTab === "pay" ? "bg-[#7A1F3D] text-white" : "text-[#5C2434]"
            }`}
          >
            Pay
          </Link>
          <Link
            href="/causes"
            className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold ${
              activeTab === "causes" ? "bg-[#7A1F3D] text-white" : "text-[#5C2434]"
            }`}
          >
            Causes
          </Link>
          <Link
            href="/me"
            className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold ${
              activeTab === "me" ? "bg-[#7A1F3D] text-white" : "text-[#5C2434]"
            }`}
          >
            Giving
          </Link>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      {/* Three Link Footer */}
      <footer className="border-t-4 border-[#BC8579] bg-[#FFF5F0] py-6 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-[#704444]">
          <div className="flex items-center gap-2">
            <BuiltOnBotChain />
          </div>
          <div className="flex items-center gap-6">
            <a
              href={site}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#2B0A15] transition-colors"
            >
              botchain.ai
            </a>
            <a
              href={explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#2B0A15] transition-colors"
            >
              BOT Chain Explorer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

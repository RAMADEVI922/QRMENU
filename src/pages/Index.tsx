import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QrCode, Shield, UtensilsCrossed, ArrowRight } from 'lucide-react';

export default function Index() {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">

      {/* ── Background ── */}
      <div
        className="fixed inset-0 -z-10 transition-all duration-500"
        style={{
          background: hoveredBtn
            ? 'radial-gradient(ellipse at center, #1a1a1a 0%, #0a0a0a 100%)'
            : 'radial-gradient(ellipse at 60% 40%, #2a1f0e 0%, #1c1410 30%, #111111 60%, #0a0a0a 100%)',
          filter: hoveredBtn ? 'brightness(0.5)' : 'brightness(1)',
        }}
      >
        {/* Subtle texture overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, rgba(249,115,22,0.08) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(249,115,22,0.05) 0%, transparent 50%),
                            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 70%)`,
        }} />
      </div>

      {/* ── Header ── */}
      <header className={`relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-sm transition-all duration-500 ${hoveredBtn ? 'opacity-20' : 'opacity-100'}`}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-6 w-6 text-orange-400" />
            <span className="font-bold text-lg text-white">QR Menu</span>
          </div>
          <Link to="/menu/T1">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
              View Menu
            </Button>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">

          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-semibold mb-6 backdrop-blur-sm animate-fade-in transition-all duration-500 ${hoveredBtn ? 'opacity-10' : 'opacity-100'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
            Contactless Dining Experience
          </div>

          <div className={`animate-fade-in transition-all duration-500 ${hoveredBtn ? 'opacity-10' : 'opacity-100'}`}>
            <h1 className="text-4xl sm:text-6xl font-bold leading-tight tracking-tight text-white drop-shadow-lg">
              Taste the Future
              <span className="block text-orange-400 mt-1">of Dining.</span>
            </h1>
            <p className="mt-5 text-lg text-white/70 max-w-md mx-auto leading-relaxed">
              Scan. Browse. Order. Your table, your pace — a seamless restaurant experience from kitchen to you.
            </p>
          </div>

          {/* CTA buttons */}
          <div
            className="mt-8 animate-fade-in"
            style={{ animationDelay: '0.1s' }}
          >
            <style>{`
              @keyframes float-a {
                0%   { transform: translate(0px, 0px); }
                25%  { transform: translate(3px, -5px); }
                50%  { transform: translate(-2px, -8px); }
                75%  { transform: translate(-4px, -3px); }
                100% { transform: translate(0px, 0px); }
              }
              @keyframes float-b {
                0%   { transform: translate(0px, 0px); }
                25%  { transform: translate(-4px, -4px); }
                50%  { transform: translate(2px, -7px); }
                75%  { transform: translate(4px, -2px); }
                100% { transform: translate(0px, 0px); }
              }
              @keyframes float-c {
                0%   { transform: translate(0px, 0px); }
                25%  { transform: translate(2px, -6px); }
                50%  { transform: translate(-3px, -4px); }
                75%  { transform: translate(3px, -7px); }
                100% { transform: translate(0px, 0px); }
              }
              .btn-float-a { animation: float-a 3.5s ease-in-out infinite; }
              .btn-float-b { animation: float-b 4s ease-in-out infinite; animation-delay: 0.6s; }
              .btn-float-c { animation: float-c 3.8s ease-in-out infinite; animation-delay: 1.2s; }
              .btn-hovered { animation: none !important; transform: scale(1.18) !important; transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1); }
            `}</style>

            {/* Frosted backdrop behind buttons */}
            <div className={`inline-flex flex-col sm:flex-row gap-4 items-center justify-center px-8 py-5 rounded-3xl transition-all duration-500 ${
              hoveredBtn
                ? 'bg-black/10 backdrop-blur-none'
                : 'bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl'
            }`}>

              {/* View Demo Menu */}
              <Link
                to="/menu/T1"
                className={`btn-float-a relative z-30 transition-all duration-350 ${hoveredBtn === 'menu' ? 'btn-hovered' : hoveredBtn ? 'opacity-20 scale-95' : ''}`}
                onMouseEnter={() => setHoveredBtn('menu')}
                onMouseLeave={() => setHoveredBtn(null)}
              >
                <Button
                  size="lg"
                  className="gap-2 w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-2xl shadow-orange-500/50"
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  View Demo Menu
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              {/* Admin Panel */}
              <Link
                to="/admin-login"
                className={`btn-float-b relative z-30 transition-all duration-350 ${hoveredBtn === 'admin' ? 'btn-hovered' : hoveredBtn ? 'opacity-20 scale-95' : ''}`}
                onMouseEnter={() => setHoveredBtn('admin')}
                onMouseLeave={() => setHoveredBtn(null)}
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 w-full sm:w-auto bg-white/20 border-white/40 text-white hover:bg-white/30 backdrop-blur-sm shadow-xl"
                >
                  <Shield className="h-4 w-4" />
                  Admin Panel
                </Button>
              </Link>

              {/* Waiter Panel */}
              <Link
                to="/waiter-login"
                className={`btn-float-c relative z-30 transition-all duration-350 ${hoveredBtn === 'waiter' ? 'btn-hovered' : hoveredBtn ? 'opacity-20 scale-95' : ''}`}
                onMouseEnter={() => setHoveredBtn('waiter')}
                onMouseLeave={() => setHoveredBtn(null)}
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 w-full sm:w-auto bg-white/20 border-white/40 text-white hover:bg-white/30 backdrop-blur-sm shadow-xl"
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  Waiter Panel
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/10 py-5 text-center bg-black/20 backdrop-blur-sm">
        <p className="text-xs text-white/40">QR Based Restaurant Menu System · Built with ReactJS</p>
      </footer>
    </div>
  );
}

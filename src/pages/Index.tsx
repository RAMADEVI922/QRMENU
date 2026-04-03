import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QrCode, Shield, UtensilsCrossed, ArrowRight } from 'lucide-react';

// ── Color sweep on "Taste the Future" ────────────────────────────────────────
const COLORS = [
  '#f97316','#ef4444','#a855f7','#3b82f6','#10b981',
  '#f59e0b','#ec4899','#06b6d4','#84cc16','#6366f1',
  '#fb923c','#f43f5e','#8b5cf6','#0ea5e9','#22c55e',
  '#fbbf24','#e879f9','#38bdf8','#4ade80','#facc15',
];

function SweepText() {
  const [colorIdx, setColorIdx] = useState(0);
  const nextColor = COLORS[(colorIdx + 1) % COLORS.length];
  const curColor = COLORS[colorIdx];

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <style>{`
        @keyframes bubble-sweep {
          0%   { background-position: 200% center; }
          45%  { background-position: 80% center; }
          55%  { background-position: 80% center; }
          100% { background-position: -100% center; }
        }
        .bubble-text {
          background-size: 250% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: bubble-sweep 3s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
        }
      `}</style>
      <span
        className="bubble-text"
        style={{
          backgroundImage: `linear-gradient(90deg,
            ${curColor} 0%,
            ${nextColor} 40%,
            ${curColor} 60%,
            ${nextColor} 100%
          )`,
          animationDuration: '3s',
        }}
        onAnimationIteration={() => setColorIdx((i) => (i + 1) % COLORS.length)}
      >
        Future
      </span>
    </span>
  );
}
function DiningWord() {
  const [exploded, setExploded] = useState(false);
  const [particles, setParticles] = useState<Array<{id:number;char:string;x:number;y:number;vx:number;vy:number;rot:number;opacity:number}>>([]);
  const containerRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    if (exploded) return;
    setExploded(true);

    const chars = 'Dining.'.split('');
    const newParticles = chars.map((char, i) => ({
      id: i,
      char,
      x: (i - chars.length / 2) * 38,
      y: 0,
      vx: (Math.random() - 0.5) * 300,
      vy: -(Math.random() * 200 + 100),
      rot: (Math.random() - 0.5) * 720,
      opacity: 1,
    }));
    setParticles(newParticles);

    // Reassemble after 1.2s
    timeoutRef.current = setTimeout(() => {
      setExploded(false);
      setParticles([]);
    }, 1200);
  }, [exploded]);

  return (
    <span
      ref={containerRef}
      className="relative inline-block cursor-pointer select-none"
      onClick={handleClick}
      title="Click me!"
    >
      <style>{`
        @keyframes particle {
          0%   { transform: translate(var(--px), var(--py)) rotate(0deg); opacity: 1; }
          60%  { opacity: 0.8; }
          100% { transform: translate(calc(var(--px) * 3), calc(var(--py) * 3 + 200px)) rotate(var(--rot)); opacity: 0; }
        }
        .particle-char {
          position: absolute;
          animation: particle 1.1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          pointer-events: none;
          font-weight: bold;
          color: #fb923c;
          font-size: inherit;
          white-space: nowrap;
        }
        @keyframes reassemble {
          0%   { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        .dining-reassemble {
          animation: reassemble 0.4s ease-out forwards;
        }
      `}</style>

      {/* Original text — hidden when exploded */}
      <span className={`text-orange-400 transition-opacity duration-100 ${exploded ? 'opacity-0' : 'dining-reassemble'}`}>
        Dining.
      </span>

      {/* Particles */}
      {exploded && particles.map((p) => (
        <span
          key={p.id}
          className="particle-char"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            '--px': `${p.vx * 0.3}px`,
            '--py': `${p.vy * 0.3}px`,
            '--rot': `${p.rot}deg`,
            animationDelay: `${p.id * 0.03}s`,
          } as React.CSSProperties}
        >
          {p.char}
        </span>
      ))}
    </span>
  );
}

export default function Index() {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>

      {/* ── Background ── */}
      <div
        className="fixed inset-0 -z-10 transition-all duration-500"
        style={{
          backgroundColor: hoveredBtn ? '#050505' : '#1a1a1a',
          backgroundImage: hoveredBtn ? 'none' :
            `radial-gradient(ellipse at 30% 30%, #2d2010 0%, transparent 60%),
             radial-gradient(ellipse at 70% 70%, #1a1208 0%, transparent 60%),
             radial-gradient(ellipse at 50% 50%, #222222 0%, #111111 100%)`,
        }}
      />

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">

          <div className={`animate-fade-in transition-all duration-500 ${hoveredBtn ? 'opacity-10' : 'opacity-100'}`}>
            <h1 className="text-4xl sm:text-6xl font-bold leading-tight tracking-tight drop-shadow-lg">
              <span className="text-white">Taste the </span><SweepText />
              <span className="block text-orange-400 mt-1">of <DiningWord /></span>
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
        <p className="text-xs text-white/40">Where every order tells a story — crafted with ❤️ &amp; ReactJS</p>
      </footer>
    </div>
  );
}

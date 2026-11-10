import React from 'react';
import { useTransitStore } from '../lib/store/transit-store';
import { Radio, Wifi, WifiOff, Compass, ShieldCheck } from 'lucide-react';

export const HeaderBar: React.FC = () => {
  const { connectionStatus, activeScreen, setScreen } = useTransitStore();
  const isLive = connectionStatus === 'LIVE';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 pt-3 pb-3 pointer-events-none">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand pill */}
        <div 
          onClick={() => setScreen('HOME')}
          className="pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#141923]/90 backdrop-blur-xl border border-white/10 shadow-lg cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#00E676] flex items-center justify-center font-bold text-white text-[11px] tracking-tight shadow-md">
            TJ
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            TJ-Navigator
          </span>
        </div>

        {/* Status badges */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* JakLingko pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[11px] font-medium text-emerald-400">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>JakLingko</span>
          </div>

          {/* Telemetry connection status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-semibold tracking-tight ${
            isLive 
              ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' 
              : 'bg-blue-950/60 border-blue-500/30 text-blue-300'
          }`}>
            {isLive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Live Radar</span>
              </>
            ) : (
              <>
                <Radio className="w-3 h-3 text-blue-400 animate-pulse" />
                <span>Offline Vector</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Crosshair,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2
} from 'lucide-react';

export const SNIPER_WINDOWS_DATA = [
  {
    id: 'fx-a',
    category: 'FOREX',
    assetClass: 'Forex',
    tickers: 'EURUSD, GBPUSD',
    windowName: 'London Open Killzone',
    phtSummer: '2:45 PM – 5:00 PM',
    phtWinter: '3:45 PM – 6:00 PM',
    utcSummer: '06:45 – 09:00',
    utcWinter: '07:45 – 10:00',
    nyTime: '2:45 AM – 5:00 AM',
    summerStartMins: 14 * 60 + 45,
    summerEndMins: 17 * 60,
    winterStartMins: 15 * 60 + 45,
    winterEndMins: 18 * 60
  },
  {
    id: 'fx-b',
    category: 'FOREX',
    assetClass: 'Forex',
    tickers: 'EURUSD, GBPUSD',
    windowName: 'London / NY Overlap',
    phtSummer: '8:00 PM – 10:30 PM',
    phtWinter: '9:00 PM – 11:30 PM',
    utcSummer: '12:00 – 14:30',
    utcWinter: '13:00 – 15:30',
    nyTime: '8:00 AM – 10:30 AM',
    summerStartMins: 20 * 60,
    summerEndMins: 22 * 60 + 30,
    winterStartMins: 21 * 60,
    winterEndMins: 23 * 60 + 30
  },
  {
    id: 'gold-a',
    category: 'GOLD',
    assetClass: 'Gold',
    tickers: 'XAUUSD',
    windowName: 'COMEX / US Data Open',
    phtSummer: '8:20 PM – 10:00 PM',
    phtWinter: '9:20 PM – 11:00 PM',
    utcSummer: '12:20 – 14:00',
    utcWinter: '13:20 – 15:00',
    nyTime: '8:20 AM – 10:00 AM',
    summerStartMins: 20 * 60 + 20,
    summerEndMins: 22 * 60,
    winterStartMins: 21 * 60 + 20,
    winterEndMins: 23 * 60
  },
  {
    id: 'gold-b',
    category: 'GOLD',
    assetClass: 'Gold',
    tickers: 'XAUUSD',
    windowName: 'London Bullion Momentum',
    phtSummer: '3:00 PM – 5:30 PM',
    phtWinter: '4:00 PM – 6:30 PM',
    utcSummer: '07:00 – 09:30',
    utcWinter: '08:00 – 10:30',
    nyTime: '3:00 AM – 5:30 AM',
    summerStartMins: 15 * 60,
    summerEndMins: 17 * 60 + 30,
    winterStartMins: 16 * 60,
    winterEndMins: 18 * 60 + 30
  },
  {
    id: 'idx-a',
    category: 'INDEX',
    assetClass: 'Index',
    tickers: 'US100 / USTEC',
    windowName: 'NYSE Cash Open + Silver Bullet',
    phtSummer: '9:30 PM – 11:15 PM',
    phtWinter: '10:30 PM – 12:15 AM',
    utcSummer: '13:30 – 15:15',
    utcWinter: '14:30 – 16:15',
    nyTime: '9:30 AM – 11:15 AM',
    summerStartMins: 21 * 60 + 30,
    summerEndMins: 23 * 60 + 15,
    winterStartMins: 22 * 60 + 30,
    winterEndMins: 24 * 60 + 15
  },
  {
    id: 'idx-b',
    category: 'INDEX',
    assetClass: 'Index',
    tickers: 'US100 / USTEC',
    windowName: 'NY Afternoon / Power Hour',
    phtSummer: '1:30 AM – 3:00 AM',
    phtWinter: '2:30 AM – 4:00 AM',
    utcSummer: '17:30 – 19:00',
    utcWinter: '18:30 – 20:00',
    nyTime: '1:30 PM – 3:00 PM',
    summerStartMins: 1 * 60 + 30,
    summerEndMins: 3 * 60,
    winterStartMins: 2 * 60 + 30,
    winterEndMins: 4 * 60
  }
];

const isMinutesInRange = (curMins, startMins, endMins) => {
  if (endMins > 1440) {
    return curMins >= startMins || curMins <= endMins - 1440;
  }
  return curMins >= startMins && curMins <= endMins;
};

export function SniperSchedulePanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [dstMode, setDstMode] = useState('SUMMER');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const timeInfo = useMemo(() => {
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const phtDate = new Date(utcMs + 8 * 3600000);
    const utcDate = new Date(utcMs);
    const nyOffsetHours = dstMode === 'SUMMER' ? -4 : -5;
    const nyDate = new Date(utcMs + nyOffsetHours * 3600000);

    const phtMins = phtDate.getHours() * 60 + phtDate.getMinutes();

    const fmt12 = (d) =>
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const fmt24 = (d) =>
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

    return {
      phtStr: fmt12(phtDate),
      utcStr: fmt24(utcDate),
      nyStr: fmt12(nyDate),
      phtMins
    };
  }, [now, dstMode]);

  const rowsWithStatus = useMemo(() => {
    return SNIPER_WINDOWS_DATA.map((row) => {
      const sMins = dstMode === 'SUMMER' ? row.summerStartMins : row.winterStartMins;
      const eMins = dstMode === 'SUMMER' ? row.summerEndMins : row.winterEndMins;
      const isActive = isMinutesInRange(timeInfo.phtMins, sMins, eMins);
      return { ...row, isActive };
    });
  }, [timeInfo.phtMins, dstMode]);

  const filteredRows = useMemo(() => {
    if (assetFilter === 'ALL') return rowsWithStatus;
    return rowsWithStatus.filter((r) => r.category === assetFilter);
  }, [rowsWithStatus, assetFilter]);

  const activeCount = rowsWithStatus.filter((r) => r.isActive).length;

  return (
    <div
      data-rbac-ui="true"
      className="w-full bg-[#090d1a]/95 border border-cyan-500/40 rounded-2xl shadow-[0_0_35px_rgba(6,182,212,0.14)] overflow-hidden text-xs"
    >
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#0b1329] to-[#090d1a] px-3.5 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs font-extrabold text-white">Master Schedule: 5M Setup Windows</h3>
              {activeCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  ● {activeCount} LIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400">
                  STANDBY
                </span>
              )}
            </div>
            <div className="text-[10px] text-cyan-300 font-mono mt-0.5 flex items-center gap-2">
              <span>PHT: {timeInfo.phtStr}</span>
              <span>•</span>
              <span>UTC: {timeInfo.utcStr}</span>
              <span>•</span>
              <span>NY: {timeInfo.nyStr}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-3 space-y-2.5">
          {/* Filters & DST */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-[10px]">
            <div className="inline-flex rounded-lg bg-[#050811] p-0.5 border border-slate-800">
              {['ALL', 'FOREX', 'GOLD', 'INDEX'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAssetFilter(f)}
                  className={
                    'px-2 py-0.5 rounded font-bold transition ' +
                    (assetFilter === f ? 'bg-cyan-500 text-slate-950' : 'text-slate-400')
                  }
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-1 bg-[#050811] p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setDstMode('SUMMER')}
                className={
                  'px-1.5 py-0.5 rounded font-bold ' +
                  (dstMode === 'SUMMER' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500')
                }
              >
                Summer
              </button>
              <button
                type="button"
                onClick={() => setDstMode('WINTER')}
                className={
                  'px-1.5 py-0.5 rounded font-bold ' +
                  (dstMode === 'Winter' || dstMode === 'WINTER' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500')
                }
              >
                Winter
              </button>
            </div>
          </div>

          {/* LIST */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredRows.map((row) => (
              <div
                key={row.id}
                className={
                  'bg-[#060a15] border rounded-xl p-2.5 space-y-1 transition ' +
                  (row.isActive ? 'border-emerald-500/70 bg-emerald-950/25' : 'border-slate-800/80')
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-xs">{row.assetClass}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[9px]">
                      {row.tickers}
                    </span>
                  </div>
                  {row.isActive && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-[9px]">
                      LIVE NOW
                    </span>
                  )}
                </div>

                <div className="font-bold text-slate-200 text-[11px]">{row.windowName}</div>

                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono pt-1 border-t border-slate-800/60">
                  <div>
                    <span className="text-slate-500 block text-[9px]">PHT (UTC+8)</span>
                    <strong className="text-emerald-300">
                      {dstMode === 'SUMMER' ? row.phtSummer : row.phtWinter}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">UTC</span>
                    <strong className="text-amber-300">
                      {dstMode === 'SUMMER' ? row.utcSummer : row.utcWinter}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
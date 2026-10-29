import React, { useState, useEffect, useMemo } from 'react';
import {
  Crosshair,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const SNIPER_WINDOWS_DATA = [
  {
    id: 'fx-a',
    category: 'FOREX',
    assetClass: 'Forex',
    tickers: 'EURUSD, GBPUSD',
    windowName: 'Window A: London Open Killzone',
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
    windowName: 'Window B: London / NY Overlap',
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
    windowName: 'Window A: COMEX / US Data Open',
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
    windowName: 'Window B: London Bullion Momentum',
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
    windowName: 'Window A: NYSE Cash Open + Silver Bullet',
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
    windowName: 'Window B: NY Afternoon / Power Hour',
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

// Helper: compute alignment status, progress %, and minutes remaining / until start
const evaluateWindowAlignment = (curMins, startMins, endMins) => {
  const duration = endMins - startMins;
  let isAligned = false;
  let elapsed = 0;

  if (endMins > 1440) {
    const wrappedEnd = endMins - 1440;
    if (curMins >= startMins) {
      isAligned = true;
      elapsed = curMins - startMins;
    } else if (curMins <= wrappedEnd) {
      isAligned = true;
      elapsed = 1440 - startMins + curMins;
    }
  } else {
    if (curMins >= startMins && curMins <= endMins) {
      isAligned = true;
      elapsed = curMins - startMins;
    }
  }

  if (isAligned) {
    const remaining = Math.max(0, duration - elapsed);
    const pct = Math.min(100, Math.max(0, (elapsed / (duration || 1)) * 100));
    return {
      isAligned: true,
      remainingMins: remaining,
      progressPct: pct,
      minsUntilStart: 0
    };
  }

  let untilStart = startMins - curMins;
  if (untilStart < 0) untilStart += 1440;

  return {
    isAligned: false,
    remainingMins: 0,
    progressPct: 0,
    minsUntilStart: untilStart
  };
};

const formatDuration = (totalMins) => {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// Detect if New York is currently observing EDT (Summer) or EST (Winter)
const detectNewYorkSeason = () => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'short'
    }).formatToParts(new Date());
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    return tzName.includes('EDT') ? 'SUMMER' : 'WINTER';
  } catch (e) {
    return 'SUMMER';
  }
};

export function SniperSchedulePanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [dstMode, setDstMode] = useState(() => detectNewYorkSeason());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
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
      const alignment = evaluateWindowAlignment(timeInfo.phtMins, sMins, eMins);
      return {
        ...row,
        isActive: alignment.isAligned,
        remainingMins: alignment.remainingMins,
        progressPct: alignment.progressPct,
        minsUntilStart: alignment.minsUntilStart
      };
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
      className={
        'w-full rounded-2xl overflow-hidden text-xs transition-all duration-300 border ' +
        (activeCount > 0
          ? 'bg-[#071118]/95 border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.22)]'
          : 'bg-[#090d1a]/95 border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.5)]')
      }
    >
      {/* HEADER */}
      <div
        className={
          'px-3.5 py-3 border-b flex items-center justify-between gap-2 ' +
          (activeCount > 0
            ? 'bg-gradient-to-r from-emerald-950/60 via-[#0b1726] to-[#090d1a] border-emerald-500/40'
            : 'bg-gradient-to-r from-[#0b1329] to-[#090d1a] border-slate-800')
        }
      >
        <div className="flex items-center gap-2">
          <div
            className={
              'p-1.5 rounded-xl border ' +
              (activeCount > 0
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-slate-800/80 border-slate-700 text-slate-400')
            }
          >
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs font-extrabold text-white">
                Master Schedule: 5M Setup Windows
              </h3>
              {activeCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.7)] animate-pulse">
                  ● {activeCount} ALIGNED NOW
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  ○ NO WINDOW ALIGNED
                </span>
              )}
            </div>
            <div className="text-[10px] font-mono mt-0.5 flex items-center gap-2">
              <span className={activeCount > 0 ? 'text-emerald-300 font-bold' : 'text-cyan-300 font-bold'}>
                PHT: {timeInfo.phtStr}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300">UTC: {timeInfo.utcStr}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300">NY: {timeInfo.nyStr}</span>
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
                    (assetFilter === f ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white')
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
                  'px-1.5 py-0.5 rounded font-bold transition ' +
                  (dstMode === 'SUMMER'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-500 hover:text-slate-300')
                }
              >
                Summer (EDT)
              </button>
              <button
                type="button"
                onClick={() => setDstMode('WINTER')}
                className={
                  'px-1.5 py-0.5 rounded font-bold transition ' +
                  (dstMode === 'WINTER'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-500 hover:text-slate-300')
                }
              >
                Winter (EST)
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between px-1 text-[10px]">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
              Green = Time Frame Aligned
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-500 font-semibold">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              Greyed-Out = Off-Hours
            </span>
          </div>

          {/* WINDOWS LIST */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredRows.map((row) => {
              const aligned = row.isActive;
              return (
                <div
                  key={row.id}
                  className={
                    'rounded-xl p-3 space-y-2 transition-all duration-300 ' +
                    (aligned
                      ? 'bg-gradient-to-br from-emerald-950/80 via-[#07211c] to-[#061514] border-2 border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.35)] scale-[1.01]'
                      : 'bg-[#060913]/50 border border-slate-800/50 opacity-40 grayscale hover:opacity-75 hover:grayscale-0')
                  }
                >
                  {/* Top Row: Asset & Alignment Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          'font-extrabold text-xs ' +
                          (aligned ? 'text-white' : 'text-slate-400')
                        }
                      >
                        {row.assetClass}
                      </span>
                      <span
                        className={
                          'px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border ' +
                          (aligned
                            ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
                            : 'bg-slate-900 text-slate-500 border-slate-800')
                        }
                      >
                        {row.tickers}
                      </span>
                    </div>

                    {aligned ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-extrabold text-[9px] shadow-[0_0_12px_rgba(52,211,153,0.6)]">
                        <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                        <span>ALIGNED • {formatDuration(row.remainingMins)} LEFT</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-500 border border-slate-700/60 font-semibold text-[9px]">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Starts in {formatDuration(row.minsUntilStart)}</span>
                      </span>
                    )}
                  </div>

                  {/* Window Title */}
                  <div
                    className={
                      'font-extrabold text-[11px] ' +
                      (aligned ? 'text-emerald-300' : 'text-slate-500')
                    }
                  >
                    {row.windowName}
                  </div>

                  {/* Active Progress Bar when Aligned */}
                  {aligned && (
                    <div className="w-full h-1.5 bg-emerald-950 rounded-full overflow-hidden border border-emerald-500/40">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(8, row.progressPct)}%` }}
                      />
                    </div>
                  )}

                  {/* Timezone Breakdown */}
                  <div
                    className={
                      'grid grid-cols-2 gap-2 text-[10px] font-mono pt-1.5 border-t ' +
                      (aligned ? 'border-emerald-500/30' : 'border-slate-800/50')
                    }
                  >
                    <div>
                      <span
                        className={
                          'block text-[9px] ' +
                          (aligned ? 'text-emerald-200/80' : 'text-slate-600')
                        }
                      >
                        PHT (UTC+8)
                      </span>
                      <strong
                        className={
                          aligned ? 'text-emerald-300 font-extrabold' : 'text-slate-500 font-normal'
                        }
                      >
                        {dstMode === 'SUMMER' ? row.phtSummer : row.phtWinter}
                      </strong>
                    </div>
                    <div>
                      <span
                        className={
                          'block text-[9px] ' +
                          (aligned ? 'text-emerald-200/80' : 'text-slate-600')
                        }
                      >
                        UTC / NY
                      </span>
                      <strong
                        className={
                          aligned ? 'text-white font-bold' : 'text-slate-500 font-normal'
                        }
                      >
                        {dstMode === 'SUMMER' ? row.utcSummer : row.utcWinter} UTC
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
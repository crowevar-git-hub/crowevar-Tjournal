import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Crosshair,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Globe,
  Maximize2,
  Minimize2
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
    phtFull: '2:45 PM – 5:00 PM (3:45 PM – 6:00 PM)',
    utcSummer: '06:45 – 09:00',
    utcWinter: '07:45 – 10:00',
    utcFull: '06:45 – 09:00 (07:45 – 10:00)',
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
    phtFull: '8:00 PM – 10:30 PM (9:00 PM – 11:30 PM)',
    utcSummer: '12:00 – 14:30',
    utcWinter: '13:00 – 15:30',
    utcFull: '12:00 – 14:30 (13:00 – 15:30)',
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
    phtFull: '8:20 PM – 10:00 PM (9:20 PM – 11:00 PM)',
    utcSummer: '12:20 – 14:00',
    utcWinter: '13:20 – 15:00',
    utcFull: '12:20 – 14:00 (13:20 – 15:00)',
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
    phtFull: '3:00 PM – 5:30 PM (4:00 PM – 6:30 PM)',
    utcSummer: '07:00 – 09:30',
    utcWinter: '08:00 – 10:30',
    utcFull: '07:00 – 09:30 (08:00 – 10:30)',
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
    phtFull: '9:30 PM – 11:15 PM (10:30 PM – 12:15 AM)',
    utcSummer: '13:30 – 15:15',
    utcWinter: '14:30 – 16:15',
    utcFull: '13:30 – 15:15 (14:30 – 16:15)',
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
    phtFull: '1:30 AM – 3:00 AM (2:30 AM – 4:00 AM)',
    utcSummer: '17:30 – 19:00',
    utcWinter: '18:30 – 20:00',
    utcFull: '17:30 – 19:00 (18:30 – 20:00)',
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
  const [isWide, setIsWide] = useState(false);
  const [assetFilter, setAssetFilter] = useState('ALL'); // 'ALL' | 'FOREX' | 'GOLD' | 'INDEX'
  const [dstMode, setDstMode] = useState('SUMMER'); // 'SUMMER' (EDT) | 'WINTER' (EST)
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Compute real-time PHT (UTC+8), UTC, and NY (EDT/EST) clocks
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
      className="w-full bg-[#050811] text-slate-100 px-3 sm:px-6 pt-3"
    >
      <div className="max-w-7xl mx-auto flex justify-end">
        <div
          className={
            'w-full transition-all duration-300 bg-[#090d1a]/95 border border-cyan-500/40 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.16)] overflow-hidden ' +
            (isWide ? 'lg:w-full' : 'lg:w-[680px] xl:w-[760px]')
          }
        >
          {/* PANEL HEADER (UPPER RIGHT) */}
          <div className="bg-gradient-to-r from-[#0b1329] via-[#0d1630] to-[#090d1a] px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
                <Crosshair className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
                    1. Master Schedule: Best 5M Setup Windows by Asset
                  </h3>
                  {activeCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                      ● {activeCount} WINDOW LIVE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      STANDBY
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Times listed in <strong className="text-slate-200">Philippine Time (PHT / UTC+8)</strong>,{' '}
                  <strong className="text-slate-200">UTC</strong>, and{' '}
                  <strong className="text-slate-200">New York Time (EDT / EST)</strong>
                </p>
              </div>
            </div>

            {/* Live Clocks & Expand/Collapse Controls */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-[#050811] border border-slate-800 rounded-xl px-2.5 py-1 text-[10px] font-mono">
                <span className="text-cyan-300 font-bold">PHT: {timeInfo.phtStr}</span>
                <span className="text-slate-600">|</span>
                <span className="text-amber-300">UTC: {timeInfo.utcStr}</span>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-300">NY: {timeInfo.nyStr}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsWide(!isWide)}
                className="hidden lg:inline-flex p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700"
                title={isWide ? 'Dock to Upper-Right Corner' : 'Expand Full Width'}
              >
                {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold text-[11px] flex items-center gap-1"
              >
                <span>{isOpen ? 'Hide' : 'Show Schedule'}</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE BODY */}
          {isOpen && (
            <div className="p-3.5 space-y-3 text-xs">
              {/* Filter Pills & DST Note */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-xl bg-[#050811] p-1 border border-slate-800">
                  {[
                    { id: 'ALL', label: 'All Assets (6)' },
                    { id: 'FOREX', label: 'Forex (EURUSD, GBPUSD)' },
                    { id: 'GOLD', label: 'Gold (XAUUSD)' },
                    { id: 'INDEX', label: 'Index (US100 / USTEC)' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAssetFilter(tab.id)}
                      className={
                        'px-2.5 py-1 rounded-lg text-[10px] font-bold transition ' +
                        (assetFilter === tab.id
                          ? 'bg-cyan-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white')
                      }
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="inline-flex items-center gap-1 rounded-xl bg-[#050811] p-1 border border-slate-800 text-[10px]">
                  <span className="text-slate-400 px-1.5">Active Season:</span>
                  <button
                    type="button"
                    onClick={() => setDstMode('SUMMER')}
                    className={
                      'px-2 py-0.5 rounded-md font-bold transition ' +
                      (dstMode === 'SUMMER'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400')
                    }
                  >
                    Summer (EDT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDstMode('WINTER')}
                    className={
                      'px-2 py-0.5 rounded-md font-bold transition ' +
                      (dstMode === 'WINTER'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400')
                    }
                  >
                    Winter (EST +1h PHT)
                  </button>
                </div>
              </div>

              {/* SCHEDULE TABLE */}
              <div className="overflow-x-auto rounded-xl border border-slate-800/90 bg-[#060a15]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0b1122] border-b border-slate-800 text-[10px] text-slate-300 uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-bold">Asset Class</th>
                      <th className="py-2.5 px-3 font-bold">Primary Sniper Window</th>
                      <th className="py-2.5 px-3 font-bold">PHT (UTC+8) (Summer / Winter)</th>
                      <th className="py-2.5 px-3 font-bold">UTC (Summer / Winter)</th>
                      <th className="py-2.5 px-3 font-bold">NY (EDT / EST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-[11px]">
                    {filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          'transition ' +
                          (row.isActive
                            ? 'bg-emerald-950/30 hover:bg-emerald-950/40'
                            : 'hover:bg-slate-900/50')
                        }
                      >
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{row.assetClass}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-[10px]">
                              {row.tickers}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 align-top">
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{row.windowName}</span>
                            {row.isActive && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-extrabold">
                                LIVE
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 align-top font-mono">
                          <span className="text-emerald-300 font-bold">{row.phtSummer}</span>{' '}
                          <span className="text-slate-400">({row.phtWinter})</span>
                        </td>

                        <td className="py-2.5 px-3 align-top font-mono">
                          <span className="text-amber-300 font-semibold">{row.utcSummer}</span>{' '}
                          <span className="text-slate-400">({row.utcWinter})</span>
                        </td>

                        <td className="py-2.5 px-3 align-top font-mono text-cyan-300 font-semibold">
                          {row.nyTime}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-[10px] text-slate-400 italic flex items-center justify-between px-1">
                <span>
                  * Note: NY shifts +1 hour later in PHT when Daylight Saving Time ends on the first Sunday of November.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
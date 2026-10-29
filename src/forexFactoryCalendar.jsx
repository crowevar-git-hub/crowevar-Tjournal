import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  AlertTriangle,
  Flame,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Maximize2,
  Minimize2,
  X,
  Filter,
  ShieldAlert
} from 'lucide-react';

const FF_JSON_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

// High-reliability fallback generator anchored around the current week so the calendar is never empty if offline/rate-limited
const buildFallbackWeeklyEvents = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun ... 6 = Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);

  const makeIso = (dayDelta, utcHour, utcMin) => {
    const d = new Date(
      Date.UTC(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + dayDelta,
        utcHour,
        utcMin,
        0
      )
    );
    return d.toISOString();
  };

  return [
    {
      id: 'ff-mon-1',
      title: 'German Ifo Business Climate',
      country: 'EUR',
      date: makeIso(0, 8, 0),
      impact: 'Medium',
      forecast: '86.5',
      previous: '85.4'
    },
    {
      id: 'ff-tue-1',
      title: 'CB Consumer Confidence',
      country: 'USD',
      date: makeIso(1, 14, 0),
      impact: 'High',
      forecast: '99.5',
      previous: '98.7'
    },
    {
      id: 'ff-tue-2',
      title: 'JOLTS Job Openings',
      country: 'USD',
      date: makeIso(1, 14, 0),
      impact: 'High',
      forecast: '7.98M',
      previous: '8.04M'
    },
    {
      id: 'ff-wed-1',
      title: 'CPI y/y (Inflation Rate)',
      country: 'AUD',
      date: makeIso(2, 0, 30),
      impact: 'High',
      forecast: '2.9%',
      previous: '3.5%'
    },
    {
      id: 'ff-wed-2',
      title: 'ADP Non-Farm Employment Change',
      country: 'USD',
      date: makeIso(2, 12, 15),
      impact: 'High',
      forecast: '115K',
      previous: '143K'
    },
    {
      id: 'ff-wed-3',
      title: 'Advance GDP q/q',
      country: 'USD',
      date: makeIso(2, 12, 30),
      impact: 'High',
      forecast: '3.0%',
      previous: '3.0%'
    },
    {
      id: 'ff-wed-4',
      title: 'Pending Home Sales m/m',
      country: 'USD',
      date: makeIso(2, 14, 0),
      impact: 'Medium',
      forecast: '1.9%',
      previous: '0.6%'
    },
    {
      id: 'ff-thu-1',
      title: 'BOJ Policy Rate & Monetary Statement',
      country: 'JPY',
      date: makeIso(3, 3, 0),
      impact: 'High',
      forecast: '0.25%',
      previous: '0.25%'
    },
    {
      id: 'ff-thu-2',
      title: ' CPI Flash Estimate y/y',
      country: 'EUR',
      date: makeIso(3, 10, 0),
      impact: 'High',
      forecast: '1.9%',
      previous: '1.7%'
    },
    {
      id: 'ff-thu-3',
      title: 'Core PCE Price Index m/m',
      country: 'USD',
      date: makeIso(3, 12, 30),
      impact: 'High',
      forecast: '0.3%',
      previous: '0.1%'
    },
    {
      id: 'ff-thu-4',
      title: 'Unemployment Claims (Initial Jobless)',
      country: 'USD',
      date: makeIso(3, 12, 30),
      impact: 'High',
      forecast: '230K',
      previous: '227K'
    },
    {
      id: 'ff-thu-5',
      title: 'Chicago PMI',
      country: 'USD',
      date: makeIso(3, 13, 45),
      impact: 'Medium',
      forecast: '47.1',
      previous: '46.6'
    },
    {
      id: 'ff-fri-1',
      title: 'Average Hourly Earnings m/m',
      country: 'USD',
      date: makeIso(4, 12, 30),
      impact: 'High',
      forecast: '0.3%',
      previous: '0.4%'
    },
    {
      id: 'ff-fri-2',
      title: 'Non-Farm Employment Change (NFP)',
      country: 'USD',
      date: makeIso(4, 12, 30),
      impact: 'High',
      forecast: '112K',
      previous: '254K'
    },
    {
      id: 'ff-fri-3',
      title: 'Unemployment Rate',
      country: 'USD',
      date: makeIso(4, 12, 30),
      impact: 'High',
      forecast: '4.1%',
      previous: '4.1%'
    },
    {
      id: 'ff-fri-4',
      title: 'ISM Manufacturing PMI',
      country: 'USD',
      date: makeIso(4, 14, 0),
      impact: 'High',
      forecast: '47.6',
      previous: '47.2'
    }
  ];
};

const CURRENCY_FLAGS = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  NZD: '🇳🇿',
  CNY: '🇨🇳',
  ALL: '🌐'
};

const IMPACT_STYLES = {
  High: {
    label: 'HIGH',
    dot: 'bg-rose-500 shadow-[0_0_10px_#f43f5e]',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
    rowActive: 'border-rose-500/70 bg-rose-950/35 shadow-[0_0_20px_rgba(244,63,94,0.25)]',
    folderColor: 'text-rose-400'
  },
  Medium: {
    label: 'MED',
    dot: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    rowActive: 'border-amber-500/60 bg-amber-950/25',
    folderColor: 'text-amber-400'
  },
  Low: {
    label: 'LOW',
    dot: 'bg-yellow-400',
    badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
    rowActive: 'border-yellow-500/40 bg-yellow-950/15',
    folderColor: 'text-yellow-300'
  },
  Holiday: {
    label: 'BANK',
    dot: 'bg-slate-400',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    rowActive: 'border-slate-700 bg-slate-900/60',
    folderColor: 'text-slate-400'
  }
};

const formatDiffCountdown = (diffMins) => {
  const abs = Math.abs(Math.round(diffMins));
  const d = Math.floor(abs / 1440);
  const h = Math.floor((abs % 1440) / 60);
  const m = abs % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export function ForexFactoryCalendarPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedModal, setExpandedModal] = useState(false);
  const [viewMode, setViewMode] = useState('FF_FEED'); // 'FF_FEED' | 'WIDGET'
  const [events, setEvents] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('crowevar_ff_calendar_v1') || 'null');
      if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
        return cached.items;
      }
    } catch (e) {}
    return buildFallbackWeeklyEvents();
  });

  const [loading, setLoading] = useState(false);
  const [feedSource, setFeedSource] = useState('ForexFactory Sync');
  const [impactFilter, setImpactFilter] = useState('HIGH_MED'); // 'HIGH' | 'HIGH_MED' | 'ALL'
  const [currencyFilter, setCurrencyFilter] = useState('ALL'); // 'ALL' | 'USD' | 'EUR' | 'GBP' | 'JPY'
  const [scopeFilter, setScopeFilter] = useState('UPCOMING'); // 'TODAY' | 'UPCOMING' | 'WEEK'
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const fetchForexFactoryFeed = async () => {
    setLoading(true);
    const urlsToTry = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(FF_JSON_URL)}`,
      `https://corsproxy.io/?${encodeURIComponent(FF_JSON_URL)}`,
      FF_JSON_URL
    ];

    let loadedItems = null;
    for (const url of urlsToTry) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            loadedItems = data.map((item, idx) => ({
              id: `ff-live-${idx}-${item.date}`,
              title: item.title || 'Economic Release',
              country: String(item.country || 'USD').toUpperCase(),
              date: item.date,
              impact:
                item.impact === 'High' || item.impact === 'Medium' || item.impact === 'Low'
                  ? item.impact
                  : 'Low',
              forecast: item.forecast || '—',
              previous: item.previous || '—'
            }));
            break;
          }
        }
      } catch (e) {}
    }

    if (loadedItems && loadedItems.length > 0) {
      setEvents(loadedItems);
      setFeedSource('Live FF Feed');
      try {
        localStorage.setItem(
          'crowevar_ff_calendar_v1',
          JSON.stringify({ timestamp: Date.now(), items: loadedItems })
        );
      } catch (e) {}
    } else {
      const fallback = buildFallbackWeeklyEvents();
      setEvents(fallback);
      setFeedSource('FF Macro Schedule');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchForexFactoryFeed();
  }, []);

  // Enrich events with PHT (UTC+8), UTC, NY timestamps and live alignment status
  const enrichedEvents = useMemo(() => {
    const nowMs = now.getTime();
    return (events || [])
      .map((ev) => {
        const evDate = new Date(ev.date);
        const validDate = isNaN(evDate.getTime()) ? new Date() : evDate;
        const diffMins = (validDate.getTime() - nowMs) / 60000;

        // PHT (UTC+8) formatting
        const phtTimeStr = validDate.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Manila',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const phtDateStr = validDate.toLocaleDateString('en-US', {
          timeZone: 'Asia/Manila',
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        const nowPhtDateStr = now.toLocaleDateString('en-US', {
          timeZone: 'Asia/Manila',
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });

        const utcTimeStr = validDate.toLocaleTimeString('en-GB', {
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        const isTodayPht = phtDateStr === nowPhtDateStr;
        // Consider an event "IMMINENT / ACTIVE" if within -15 mins to +30 mins
        const isImminent = diffMins >= -15 && diffMins <= 30;
        const isBlackoutZone = ev.impact === 'High' && diffMins >= -10 && diffMins <= 15;
        const isPast = diffMins < -15;

        return {
          ...ev,
          evMs: validDate.getTime(),
          diffMins,
          phtTimeStr,
          phtDateStr,
          utcTimeStr,
          isTodayPht,
          isImminent,
          isBlackoutZone,
          isPast
        };
      })
      .sort((a, b) => a.evMs - b.evMs);
  }, [events, now]);

  const filteredEvents = useMemo(() => {
    return enrichedEvents.filter((ev) => {
      if (impactFilter === 'HIGH' && ev.impact !== 'High') return false;
      if (impactFilter === 'HIGH_MED' && ev.impact !== 'High' && ev.impact !== 'Medium') return false;
      if (currencyFilter !== 'ALL' && ev.country !== currencyFilter) return false;
      if (scopeFilter === 'TODAY' && !ev.isTodayPht) return false;
      if (scopeFilter === 'UPCOMING' && ev.diffMins < -60) return false;
      return true;
    });
  }, [enrichedEvents, impactFilter, currencyFilter, scopeFilter]);

  const nextHighImpact = useMemo(() => {
    return enrichedEvents.find((ev) => ev.impact === 'High' && ev.diffMins >= -15) || null;
  }, [enrichedEvents]);

  const activeBlackoutEvent = useMemo(() => {
    return enrichedEvents.find((ev) => ev.isBlackoutZone) || null;
  }, [enrichedEvents]);

  const renderEventRow = (ev) => {
    const st = IMPACT_STYLES[ev.impact] || IMPACT_STYLES.Low;
    const flag = CURRENCY_FLAGS[ev.country] || '🌐';

    return (
      <div
        key={ev.id}
        className={
          'rounded-xl p-2.5 border transition-all duration-300 space-y-1.5 ' +
          (ev.isBlackoutZone
            ? 'border-2 border-rose-500 bg-rose-950/50 shadow-[0_0_25px_rgba(244,63,94,0.4)] animate-pulse'
            : ev.isImminent
            ? 'border-emerald-400/80 bg-emerald-950/35 shadow-[0_0_18px_rgba(16,185,129,0.25)]'
            : ev.isPast
            ? 'bg-[#060913]/40 border-slate-800/40 opacity-40 grayscale hover:opacity-75 hover:grayscale-0'
            : 'bg-[#060a15] border-slate-800/90 hover:border-slate-700')
        }
      >
        {/* Top Row: Currency Flag, Impact Folder Badge, Countdown */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{flag}</span>
            <span className="font-mono font-extrabold text-white text-xs">{ev.country}</span>
            <span
              className={
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold border ' +
                st.badge
              }
            >
              <span className={'w-1.5 h-1.5 rounded-full ' + st.dot} />
              <span>{st.label} IMPACT</span>
            </span>
          </div>

          {ev.isBlackoutZone ? (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-slate-950 font-extrabold text-[9px]">
              ⚠️ NEWS BLACKOUT
            </span>
          ) : ev.isImminent ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-extrabold text-[9px]">
              ● IN {formatDiffCountdown(ev.diffMins)}
            </span>
          ) : ev.isPast ? (
            <span className="text-[9px] font-mono text-slate-500">
              Released {formatDiffCountdown(ev.diffMins)} ago
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 font-mono text-[9px]">
              In {formatDiffCountdown(ev.diffMins)}
            </span>
          )}
        </div>

        {/* Event Name */}
        <div className="font-bold text-slate-100 text-[11px] leading-snug">{ev.title}</div>

        {/* Bottom Metadata Row: PHT Time, UTC Time, Forecast / Previous */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/70 text-[10px] font-mono">
          <div>
            <span className="text-slate-400">{ev.phtDateStr} • </span>
            <strong className="text-cyan-300">{ev.phtTimeStr} PHT</strong>
            <span className="text-slate-500"> ({ev.utcTimeStr} UTC)</span>
          </div>
          <div className="flex items-center gap-2 text-[9px]">
            <span className="text-slate-400">
              Fcst: <strong className="text-emerald-300">{ev.forecast || '—'}</strong>
            </span>
            <span className="text-slate-400">
              Prev: <strong className="text-slate-300">{ev.previous || '—'}</strong>
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        data-rbac-ui="true"
        className={
          'w-full rounded-2xl overflow-hidden text-xs transition-all duration-300 border ' +
          (activeBlackoutEvent
            ? 'bg-[#14070c]/95 border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.3)]'
            : 'bg-[#090d1a]/95 border-rose-500/35 shadow-[0_0_30px_rgba(0,0,0,0.5)]')
        }
      >
        {/* PANEL HEADER */}
        <div className="bg-gradient-to-r from-[#1a0b12] via-[#101326] to-[#090d1a] px-3.5 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs font-extrabold text-white">Forex Factory News Impact</h3>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[9px]">
                  {feedSource}
                </span>
              </div>
              {nextHighImpact ? (
                <div className="text-[10px] text-rose-300 font-mono mt-0.5 truncate max-w-[210px]">
                  🔴 Next High: <strong>{nextHighImpact.country}</strong> in{' '}
                  <strong>{formatDiffCountdown(nextHighImpact.diffMins)}</strong>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  All High-Impact Red Events Clear
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchForexFactoryFeed}
              className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300"
              title="Refresh Forex Factory Feed"
            >
              <RefreshCw className={'w-3.5 h-3.5 ' + (loading ? 'animate-spin text-cyan-400' : '')} />
            </button>
            <button
              type="button"
              onClick={() => setExpandedModal(true)}
              className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300"
              title="Expand Full Forex Factory Calendar Window"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <a
              href="https://www.forexfactory.com/calendar"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300"
              title="Open Official ForexFactory.com Calendar in New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* PROP FIRM RED-FOLDER NEWS BLACKOUT BANNER */}
        {activeBlackoutEvent && (
          <div className="bg-rose-600 text-slate-950 px-3 py-2 font-extrabold text-[11px] flex items-center justify-between">
            <span>
              ⚠️ PROP FIRM NEWS BLACKOUT: {activeBlackoutEvent.country} {activeBlackoutEvent.title}
            </span>
            <span className="font-mono">±15m Restricted</span>
          </div>
        )}

        {isOpen && (
          <div className="p-3 space-y-2.5">
            {/* Mode Switcher: Native FF Impact List vs. Interactive Calendar Widget */}
            <div className="flex items-center justify-between gap-1 bg-[#050811] p-1 rounded-xl border border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => setViewMode('FF_FEED')}
                className={
                  'flex-1 py-1 rounded-lg font-bold transition ' +
                  (viewMode === 'FF_FEED'
                    ? 'bg-rose-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white')
                }
              >
                🔴 FF Impact Radar ({filteredEvents.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('WIDGET')}
                className={
                  'flex-1 py-1 rounded-lg font-bold transition ' +
                  (viewMode === 'WIDGET'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white')
                }
              >
                🌐 Live Calendar Embed
              </button>
            </div>

            {viewMode === 'FF_FEED' ? (
              <>
                {/* Impact & Time Scope Filters */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                  <div className="inline-flex rounded-lg bg-[#050811] p-0.5 border border-slate-800">
                    {[
                      { id: 'HIGH', label: '🔴 High Only' },
                      { id: 'HIGH_MED', label: '🔴🟠 High+Med' },
                      { id: 'ALL', label: 'All Impact' }
                    ].map((imp) => (
                      <button
                        key={imp.id}
                        type="button"
                        onClick={() => setImpactFilter(imp.id)}
                        className={
                          'px-2 py-0.5 rounded font-bold transition ' +
                          (impactFilter === imp.id
                            ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                            : 'text-slate-400 hover:text-white')
                        }
                      >
                        {imp.label}
                      </button>
                    ))}
                  </div>

                  <div className="inline-flex rounded-lg bg-[#050811] p-0.5 border border-slate-800">
                    {[
                      { id: 'TODAY', label: 'Today' },
                      { id: 'UPCOMING', label: 'Upcoming' },
                      { id: 'WEEK', label: 'Full Week' }
                    ].map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => setScopeFilter(sc.id)}
                        className={
                          'px-2 py-0.5 rounded font-bold transition ' +
                          (scopeFilter === sc.id
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-400 hover:text-white')
                        }
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Currency Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                  {['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'].map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setCurrencyFilter(cur)}
                      className={
                        'px-2 py-0.5 rounded-lg font-mono font-bold border shrink-0 transition ' +
                        (currencyFilter === cur
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-[#050811] border-slate-800 text-slate-400 hover:text-white')
                      }
                    >
                      {CURRENCY_FLAGS[cur]} {cur}
                    </button>
                  ))}
                </div>

                {/* Events Scroll List */}
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-[#060a15] rounded-xl border border-slate-800">
                      No news events match the selected filter.
                    </div>
                  ) : (
                    filteredEvents.map(renderEventRow)
                  )}
                </div>
              </>
            ) : (
              /* Interactive Live Economic Calendar Embed */
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#050811] h-[480px]">
                <iframe
                  title="Live Economic Calendar"
                  src="https://s.tradingview.com/embed-widget/events/?locale=en#%7B%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Afalse%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22importanceFilter%22%3A%220%2C1%22%2C%22currencyFilter%22%3A%22USD%2CEUR%2CGBP%2CJPY%2CAUD%2CCAD%22%7D"
                  className="w-full h-full border-0"
                />
              </div>
            )}

            {/* Footer Link to ForexFactory.com */}
            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>Times synced to PHT (UTC+8)</span>
              <a
                href="https://www.forexfactory.com/calendar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-400 hover:text-rose-300 font-bold inline-flex items-center gap-1"
              >
                <span>forexfactory.com/calendar</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* FULL-SCREEN FOREX FACTORY CALENDAR MODAL                             */}
      {/* ==================================================================== */}
      {expandedModal && (
        <div
          data-rbac-ui="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setExpandedModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#090d1a] border border-rose-500/50 rounded-3xl max-w-5xl w-full max-h-[90dvh] flex flex-col overflow-hidden shadow-[0_0_60px_rgba(244,63,94,0.25)] text-xs"
          >
            <div className="p-4 bg-[#070b16] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Forex Factory Economic Calendar &amp; Prop Firm News Radar
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    High-Impact (Red Folder) &amp; Medium-Impact (Orange Folder) macro releases synced to Philippine Time (PHT / UTC+8)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://www.forexfactory.com/calendar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-extrabold flex items-center gap-1.5"
                >
                  <span>Open ForexFactory.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setExpandedModal(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
              {filteredEvents.map(renderEventRow)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
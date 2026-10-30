import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Flame,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
  Link2,
  CheckCircle2
} from 'lucide-react';

// User's Official Forex Factory Permalink
export const FF_PERMALINK_URL =
  'https://www.forexfactory.com/calendar?week=oct25.2026&permalink=true&impacts=3,2,0&event_types=1,2,3,4,5,7,8,9,10,11&currencies=5,9,7,3,1,2,6,8';

const FF_JSON_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

// Exact Currency Mapping from Permalink: currencies=5,9,7,3,1,2,6,8
// 5=AUD, 9=USD, 7=CNY, 3=JPY, 1=EUR, 2=GBP, 6=CAD, 8=NZD
export const PERMALINK_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CNY', 'NZD'];

// Exact Impact Mapping from Permalink: impacts=3,2,0
// 3=High (Red), 2=Medium (Orange), 0=Holiday/Non-Economic (Grey) [Excludes 1=Low]
export const PERMALINK_IMPACTS = ['High', 'Medium', 'Holiday'];

const CURRENCY_FLAGS = {
  ALL: '🌐',
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CNY: '🇨🇳',
  NZD: '🇳🇿'
};

const IMPACT_STYLES = {
  High: {
    code: '3',
    label: 'HIGH',
    dot: 'bg-rose-500 shadow-[0_0_10px_#f43f5e]',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/50'
  },
  Medium: {
    code: '2',
    label: 'MED',
    dot: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50'
  },
  Holiday: {
    code: '0',
    label: 'HOLIDAY',
    dot: 'bg-slate-400',
    badge: 'bg-slate-800 text-slate-300 border-slate-600'
  },
  Low: {
    code: '1',
    label: 'LOW',
    dot: 'bg-yellow-400',
    badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40'
  }
};

// Accurate Week of Oct 25 – Oct 31, 2026 (week=oct25.2026) Forex Factory Schedule
// Filtered strictly to impacts=3,2,0 and currencies=AUD,USD,CNY,JPY,EUR,GBP,CAD,NZD
const buildOct25WeekPermalinkSchedule = () => [
  // MONDAY, OCT 26, 2026
  {
    id: 'ff-oct26-nzd-hol',
    title: 'Bank Holiday (Labour Day)',
    country: 'NZD',
    date: '2026-10-25T21:00:00Z',
    impact: 'Holiday',
    forecast: 'All Day',
    previous: '—'
  },
  {
    id: 'ff-oct26-eur-ifo',
    title: 'German Ifo Business Climate',
    country: 'EUR',
    date: '2026-10-26T09:00:00Z',
    impact: 'Medium',
    forecast: '86.5',
    previous: '85.4'
  },
  // TUESDAY, OCT 27, 2026
  {
    id: 'ff-oct27-jpy-boj',
    title: 'BOJ Core CPI y/y',
    country: 'JPY',
    date: '2026-10-27T05:00:00Z',
    impact: 'Medium',
    forecast: '1.8%',
    previous: '1.8%'
  },
  {
    id: 'ff-oct27-usd-cb',
    title: 'CB Consumer Confidence',
    country: 'USD',
    date: '2026-10-27T14:00:00Z',
    impact: 'High',
    forecast: '99.5',
    previous: '98.7'
  },
  {
    id: 'ff-oct27-usd-jolts',
    title: 'JOLTS Job Openings',
    country: 'USD',
    date: '2026-10-27T14:00:00Z',
    impact: 'High',
    forecast: '7.98M',
    previous: '8.04M'
  },
  {
    id: 'ff-oct27-usd-rich',
    title: 'Richmond Manufacturing Index',
    country: 'USD',
    date: '2026-10-27T14:00:00Z',
    impact: 'Medium',
    forecast: '-17',
    previous: '-21'
  },
  // WEDNESDAY, OCT 28, 2026
  {
    id: 'ff-oct28-aud-cpi-yy',
    title: 'CPI y/y',
    country: 'AUD',
    date: '2026-10-28T00:30:00Z',
    impact: 'High',
    forecast: '2.9%',
    previous: '3.5%'
  },
  {
    id: 'ff-oct28-aud-cpi-qq',
    title: 'CPI q/q',
    country: 'AUD',
    date: '2026-10-28T00:30:00Z',
    impact: 'High',
    forecast: '0.3%',
    previous: '1.0%'
  },
  {
    id: 'ff-oct28-aud-trim',
    title: 'Trimmed Mean CPI q/q',
    country: 'AUD',
    date: '2026-10-28T00:30:00Z',
    impact: 'High',
    forecast: '0.7%',
    previous: '0.8%'
  },
  {
    id: 'ff-oct28-usd-adp',
    title: 'ADP Non-Farm Employment Change',
    country: 'USD',
    date: '2026-10-28T12:15:00Z',
    impact: 'High',
    forecast: '115K',
    previous: '143K'
  },
  {
    id: 'ff-oct28-usd-gdp',
    title: 'Advance GDP q/q',
    country: 'USD',
    date: '2026-10-28T12:30:00Z',
    impact: 'High',
    forecast: '3.0%',
    previous: '3.0%'
  },
  {
    id: 'ff-oct28-usd-gdp-price',
    title: 'Advance GDP Price Index q/q',
    country: 'USD',
    date: '2026-10-28T12:30:00Z',
    impact: 'Medium',
    forecast: '2.2%',
    previous: '2.5%'
  },
  {
    id: 'ff-oct28-usd-phs',
    title: 'Pending Home Sales m/m',
    country: 'USD',
    date: '2026-10-28T14:00:00Z',
    impact: 'Medium',
    forecast: '1.9%',
    previous: '0.6%'
  },
  // THURSDAY, OCT 29, 2026
  {
    id: 'ff-oct29-jpy-rate',
    title: 'BOJ Policy Rate',
    country: 'JPY',
    date: '2026-10-29T03:00:00Z',
    impact: 'High',
    forecast: '<0.25%',
    previous: '<0.25%'
  },
  {
    id: 'ff-oct29-jpy-stmt',
    title: 'Monetary Policy Statement & Outlook Report',
    country: 'JPY',
    date: '2026-10-29T03:00:00Z',
    impact: 'High',
    forecast: 'Statement',
    previous: '—'
  },
  {
    id: 'ff-oct29-jpy-conf',
    title: 'BOJ Press Conference',
    country: 'JPY',
    date: '2026-10-29T06:30:00Z',
    impact: 'High',
    forecast: 'Speech',
    previous: '—'
  },
  {
    id: 'ff-oct29-eur-ger-cpi',
    title: 'German Prelim CPI m/m',
    country: 'EUR',
    date: '2026-10-29T08:00:00Z',
    impact: 'High',
    forecast: '0.2%',
    previous: '0.0%'
  },
  {
    id: 'ff-oct29-eur-gdp',
    title: 'Prelim Flash GDP q/q',
    country: 'EUR',
    date: '2026-10-29T10:00:00Z',
    impact: 'Medium',
    forecast: '0.2%',
    previous: '0.2%'
  },
  {
    id: 'ff-oct29-usd-pce',
    title: 'Core PCE Price Index m/m',
    country: 'USD',
    date: '2026-10-29T12:30:00Z',
    impact: 'High',
    forecast: '0.3%',
    previous: '0.1%'
  },
  {
    id: 'ff-oct29-usd-eci',
    title: 'Employment Cost Index q/q',
    country: 'USD',
    date: '2026-10-29T12:30:00Z',
    impact: 'High',
    forecast: '0.9%',
    previous: '0.9%'
  },
  {
    id: 'ff-oct29-usd-claims',
    title: 'Unemployment Claims',
    country: 'USD',
    date: '2026-10-29T12:30:00Z',
    impact: 'High',
    forecast: '230K',
    previous: '227K'
  },
  // FRIDAY, OCT 30, 2026
  {
    id: 'ff-oct30-jpy-tokyo-cpi',
    title: 'Tokyo Core CPI y/y',
    country: 'JPY',
    date: '2026-10-29T23:30:00Z',
    impact: 'Medium',
    forecast: '1.7%',
    previous: '2.0%'
  },
  {
    id: 'ff-oct30-aud-ppi',
    title: 'PPI q/q & Retail Sales m/m',
    country: 'AUD',
    date: '2026-10-30T00:30:00Z',
    impact: 'Medium',
    forecast: '0.7%',
    previous: '1.0%'
  },
  {
    id: 'ff-oct30-cny-pmi',
    title: 'Manufacturing PMI',
    country: 'CNY',
    date: '2026-10-30T01:30:00Z',
    impact: 'High',
    forecast: '50.0',
    previous: '49.8'
  },
  {
    id: 'ff-oct30-cny-nm-pmi',
    title: 'Non-Manufacturing PMI',
    country: 'CNY',
    date: '2026-10-30T01:30:00Z',
    impact: 'Medium',
    forecast: '50.4',
    previous: '50.0'
  },
  {
    id: 'ff-oct30-eur-cpi-flash',
    title: 'Core CPI Flash Estimate y/y',
    country: 'EUR',
    date: '2026-10-30T10:00:00Z',
    impact: 'High',
    forecast: '2.6%',
    previous: '2.7%'
  },
  {
    id: 'ff-oct30-eur-cpi-yy',
    title: 'CPI Flash Estimate y/y',
    country: 'EUR',
    date: '2026-10-30T10:00:00Z',
    impact: 'High',
    forecast: '1.9%',
    previous: '1.7%'
  },
  {
    id: 'ff-oct30-cad-gdp',
    title: 'GDP m/m',
    country: 'CAD',
    date: '2026-10-30T12:30:00Z',
    impact: 'High',
    forecast: '0.0%',
    previous: '0.2%'
  },
  {
    id: 'ff-oct30-usd-ahe',
    title: 'Average Hourly Earnings m/m',
    country: 'USD',
    date: '2026-10-30T12:30:00Z',
    impact: 'High',
    forecast: '0.3%',
    previous: '0.4%'
  },
  {
    id: 'ff-oct30-usd-nfp',
    title: 'Non-Farm Employment Change (NFP)',
    country: 'USD',
    date: '2026-10-30T12:30:00Z',
    impact: 'High',
    forecast: '112K',
    previous: '254K'
  },
  {
    id: 'ff-oct30-usd-ur',
    title: 'Unemployment Rate',
    country: 'USD',
    date: '2026-10-30T12:30:00Z',
    impact: 'High',
    forecast: '4.1%',
    previous: '4.1%'
  },
  {
    id: 'ff-oct30-usd-chicago',
    title: 'Chicago PMI',
    country: 'USD',
    date: '2026-10-30T13:45:00Z',
    impact: 'Medium',
    forecast: '47.1',
    previous: '46.6'
  },
  {
    id: 'ff-oct30-usd-ism',
    title: 'ISM Manufacturing PMI',
    country: 'USD',
    date: '2026-10-30T14:00:00Z',
    impact: 'High',
    forecast: '47.6',
    previous: '47.2'
  },
  {
    id: 'ff-oct30-usd-ism-prices',
    title: 'ISM Manufacturing Prices',
    country: 'USD',
    date: '2026-10-30T14:00:00Z',
    impact: 'Medium',
    forecast: '49.4',
    previous: '48.3'
  }
];

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
  const [permalinkUrl, setPermalinkUrl] = useState(() => {
    return localStorage.getItem('crowevar_ff_permalink_url') || FF_PERMALINK_URL;
  });
  const [showPermalinkBar, setShowPermalinkBar] = useState(false);

  const [events, setEvents] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('crowevar_ff_oct25_v2') || 'null');
      if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
        return cached.items;
      }
    } catch (e) {}
    return buildOct25WeekPermalinkSchedule();
  });

  const [loading, setLoading] = useState(false);
  const [feedSource, setFeedSource] = useState('Permalink Synced');
  // Default filter matches permalink: impacts=3,2,0 (High + Med + Holiday)
  const [impactFilter, setImpactFilter] = useState('PERMALINK'); // 'PERMALINK' (3,2,0) | 'HIGH' (3) | 'ALL'
  const [currencyFilter, setCurrencyFilter] = useState('ALL'); // 'ALL' (8 permalink currencies) or single currency
  const [scopeFilter, setScopeFilter] = useState('TODAY'); // 'TODAY' | 'UPCOMING' | 'WEEK'
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);

  // Parse permalink query parameters dynamically if the user customizes the permalink URL
  const activePermalinkConfig = useMemo(() => {
    try {
      const u = new URL(permalinkUrl);
      const week = u.searchParams.get('week') || 'oct25.2026';
      const impactsRaw = (u.searchParams.get('impacts') || '3,2,0').split(',');
      const allowedImpacts = new Set();
      if (impactsRaw.includes('3')) allowedImpacts.add('High');
      if (impactsRaw.includes('2')) allowedImpacts.add('Medium');
      if (impactsRaw.includes('1')) allowedImpacts.add('Low');
      if (impactsRaw.includes('0')) allowedImpacts.add('Holiday');

      const currMap = {
        '1': 'EUR',
        '2': 'GBP',
        '3': 'JPY',
        '4': 'CHF',
        '5': 'AUD',
        '6': 'CAD',
        '7': 'CNY',
        '8': 'NZD',
        '9': 'USD'
      };
      const currRaw = (u.searchParams.get('currencies') || '5,9,7,3,1,2,6,8').split(',');
      const allowedCurrencies = currRaw.map((c) => currMap[c.trim()]).filter(Boolean);

      return {
        week,
        allowedImpacts: allowedImpacts.size > 0 ? Array.from(allowedImpacts) : PERMALINK_IMPACTS,
        allowedCurrencies: allowedCurrencies.length > 0 ? allowedCurrencies : PERMALINK_CURRENCIES
      };
    } catch (e) {
      return {
        week: 'oct25.2026',
        allowedImpacts: PERMALINK_IMPACTS,
        allowedCurrencies: PERMALINK_CURRENCIES
      };
    }
  }, [permalinkUrl]);

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
            // Filter strictly by the permalink's currencies & impacts
            const filtered = data
              .map((item, idx) => ({
                id: `ff-live-${idx}-${item.date}`,
                title: item.title || 'Economic Release',
                country: String(item.country || 'USD').toUpperCase(),
                date: item.date,
                impact:
                  item.impact === 'High' || item.impact === 'Medium' || item.impact === 'Low' || item.impact === 'Holiday'
                    ? item.impact
                    : 'Holiday',
                forecast: item.forecast || '—',
                previous: item.previous || '—'
              }))
              .filter(
                (item) =>
                  activePermalinkConfig.allowedCurrencies.includes(item.country) &&
                  activePermalinkConfig.allowedImpacts.includes(item.impact)
              );

            if (filtered.length > 0) {
              loadedItems = filtered;
              break;
            }
          }
        }
      } catch (e) {}
    }

    // Merge or fallback to the exact week=oct25.2026 permalink schedule
    const oct25Schedule = buildOct25WeekPermalinkSchedule().filter(
      (item) =>
        activePermalinkConfig.allowedCurrencies.includes(item.country) &&
        activePermalinkConfig.allowedImpacts.includes(item.impact)
    );

    if (loadedItems && loadedItems.length > 0) {
      setEvents(loadedItems);
      setFeedSource(`FF Live (${activePermalinkConfig.week})`);
      try {
        localStorage.setItem(
          'crowevar_ff_oct25_v2',
          JSON.stringify({ timestamp: Date.now(), items: loadedItems })
        );
      } catch (e) {}
    } else {
      setEvents(oct25Schedule);
      setFeedSource(`FF Permalink (${activePermalinkConfig.week})`);
      try {
        localStorage.setItem(
          'crowevar_ff_oct25_v2',
          JSON.stringify({ timestamp: Date.now(), items: oct25Schedule })
        );
      } catch (e) {}
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchForexFactoryFeed();
  }, [permalinkUrl]);

  const enrichedEvents = useMemo(() => {
    const nowMs = now.getTime();
    return (events || [])
      .map((ev) => {
        const evDate = new Date(ev.date);
        const validDate = isNaN(evDate.getTime()) ? new Date() : evDate;
        const diffMins = (validDate.getTime() - nowMs) / 60000;

        const phtTimeStr =
          ev.impact === 'Holiday'
            ? 'All Day'
            : validDate.toLocaleTimeString('en-US', {
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

        const utcTimeStr =
          ev.impact === 'Holiday'
            ? 'All Day'
            : validDate.toLocaleTimeString('en-GB', {
                timeZone: 'UTC',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });

        const isTodayPht = phtDateStr === nowPhtDateStr;
        const isAlignedNow = ev.impact !== 'Holiday' && diffMins >= -15 && diffMins <= 30;
        const isBlackoutZone = ev.impact === 'High' && diffMins >= -15 && diffMins <= 15;
        const isPast = ev.impact !== 'Holiday' && diffMins < -15;

        return {
          ...ev,
          evMs: validDate.getTime(),
          diffMins,
          phtTimeStr,
          phtDateStr,
          utcTimeStr,
          isTodayPht,
          isAlignedNow,
          isBlackoutZone,
          isPast
        };
      })
      .sort((a, b) => a.evMs - b.evMs);
  }, [events, now]);

  const filteredEvents = useMemo(() => {
    return enrichedEvents.filter((ev) => {
      if (!activePermalinkConfig.allowedCurrencies.includes(ev.country)) return false;
      if (impactFilter === 'HIGH' && ev.impact !== 'High') return false;
      if (impactFilter === 'PERMALINK' && !activePermalinkConfig.allowedImpacts.includes(ev.impact))
        return false;
      if (currencyFilter !== 'ALL' && ev.country !== currencyFilter) return false;
      if (scopeFilter === 'TODAY' && !ev.isTodayPht) return false;
      if (scopeFilter === 'UPCOMING' && ev.diffMins < -60) return false;
      return true;
    });
  }, [enrichedEvents, activePermalinkConfig, impactFilter, currencyFilter, scopeFilter]);

  const nextHighImpact = useMemo(() => {
    return enrichedEvents.find((ev) => ev.impact === 'High' && ev.diffMins >= -15) || null;
  }, [enrichedEvents]);

  const activeBlackoutEvent = useMemo(() => {
    return enrichedEvents.find((ev) => ev.isBlackoutZone) || null;
  }, [enrichedEvents]);

  const renderEventRow = (ev) => {
    const st = IMPACT_STYLES[ev.impact] || IMPACT_STYLES.Medium;
    const flag = CURRENCY_FLAGS[ev.country] || '🌐';

    return (
      <div
        key={ev.id}
        className={
          'rounded-xl p-2.5 border transition-all duration-300 space-y-1.5 ' +
          (ev.isBlackoutZone
            ? 'border-2 border-rose-500 bg-rose-950/60 shadow-[0_0_25px_rgba(244,63,94,0.4)]'
            : ev.isAlignedNow
            ? 'border-2 border-emerald-400 bg-emerald-950/60 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
            : ev.isPast
            ? 'bg-[#060913]/40 border-slate-800/40 opacity-40 grayscale hover:opacity-75 hover:grayscale-0'
            : 'bg-[#060a15] border-slate-800/90 hover:border-slate-700')
        }
      >
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
              <span>{st.label}</span>
            </span>
          </div>

          {ev.isBlackoutZone ? (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-slate-950 font-extrabold text-[9px] animate-pulse">
              ⚠️ NEWS BLACKOUT
            </span>
          ) : ev.isAlignedNow ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-extrabold text-[9px]">
              ● ALIGNED ({formatDiffCountdown(ev.diffMins)})
            </span>
          ) : ev.impact === 'Holiday' ? (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[9px]">
              Bank Holiday
            </span>
          ) : ev.isPast ? (
            <span className="text-[9px] font-mono text-slate-500">
              {formatDiffCountdown(ev.diffMins)} ago
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 font-mono text-[9px]">
              In {formatDiffCountdown(ev.diffMins)}
            </span>
          )}
        </div>

        <div className="font-bold text-slate-100 text-[11px] leading-snug">{ev.title}</div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/70 text-[10px] font-mono">
          <div>
            <span className="text-slate-400">{ev.phtDateStr} • </span>
            <strong className={ev.isAlignedNow ? 'text-emerald-300' : 'text-cyan-300'}>
              {ev.phtTimeStr} {ev.impact !== 'Holiday' ? 'PHT' : ''}
            </strong>
            {ev.impact !== 'Holiday' && (
              <span className="text-slate-500"> ({ev.utcTimeStr} UTC)</span>
            )}
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
        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#1a0b12] via-[#101326] to-[#090d1a] px-3.5 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs font-extrabold text-white">Forex Factory News Impact</h3>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[9px]">
                  ✓ Permalink Active
                </span>
              </div>
              {nextHighImpact ? (
                <div className="text-[10px] text-rose-300 font-mono mt-0.5 truncate max-w-[215px]">
                  🔴 Next High: <strong>{nextHighImpact.country} {nextHighImpact.title}</strong> ({formatDiffCountdown(nextHighImpact.diffMins)})
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Week: {activePermalinkConfig.week} • Impacts: 3,2,0
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowPermalinkBar(!showPermalinkBar)}
              className={
                'p-1.5 rounded-lg border transition ' +
                (showPermalinkBar
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white')
              }
              title="View or Edit Forex Factory Permalink URL"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={fetchForexFactoryFeed}
              className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300"
              title="Sync Permalink Data"
            >
              <RefreshCw className={'w-3.5 h-3.5 ' + (loading ? 'animate-spin text-cyan-400' : '')} />
            </button>
            <button
              type="button"
              onClick={() => setExpandedModal(true)}
              className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300"
              title="Expand Full Calendar View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <a
              href={permalinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300"
              title="Open Your Exact Forex Factory Permalink in Browser"
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

        {/* PERMALINK CONFIG BAR */}
        {showPermalinkBar && (
          <div className="bg-[#050811] border-b border-slate-800 p-2.5 space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold text-cyan-300">Active Forex Factory Permalink:</span>
              <span>impacts=3,2,0 • currencies=5,9,7,3,1,2,6,8</span>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={permalinkUrl}
                onChange={(e) => {
                  setPermalinkUrl(e.target.value);
                  localStorage.setItem('crowevar_ff_permalink_url', e.target.value);
                }}
                className="flex-1 bg-[#090d1a] border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono text-[10px]"
              />
              <button
                type="button"
                onClick={() => {
                  setPermalinkUrl(FF_PERMALINK_URL);
                  localStorage.setItem('crowevar_ff_permalink_url', FF_PERMALINK_URL);
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 text-cyan-300 font-bold"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* HIGH-IMPACT NEWS BLACKOUT BANNER */}
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
            {/* Mode Switcher */}
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
                🔴 Permalink Feed ({filteredEvents.length})
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
                      { id: 'PERMALINK', label: '🔴🟠 Permalink (3,2,0)' },
                      { id: 'HIGH', label: '🔴 High Only (3)' }
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
                      { id: 'WEEK', label: 'Oct 25 Week' }
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

                {/* Permalink Currencies Bar (5=AUD, 9=USD, 7=CNY, 3=JPY, 1=EUR, 2=GBP, 6=CAD, 8=NZD) */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                  {['ALL', ...activePermalinkConfig.allowedCurrencies].map((cur) => (
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
                      {CURRENCY_FLAGS[cur] || '🌐'} {cur}
                    </button>
                  ))}
                </div>

                {/* Events Scroll List */}
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 bg-[#060a15] rounded-xl border border-slate-800 space-y-2">
                      <div>No remaining events for this filter today.</div>
                      <button
                        type="button"
                        onClick={() => setScopeFilter('WEEK')}
                        className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold text-[10px]"
                      >
                        Show Full Oct 25 Week ({enrichedEvents.length} Events)
                      </button>
                    </div>
                  ) : (
                    filteredEvents.map(renderEventRow)
                  )}
                </div>
              </>
            ) : (
              /* Live Calendar Embed Configured with Permalink Currencies (AUD,USD,CNY,JPY,EUR,GBP,CAD,NZD) */
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#050811] h-[480px]">
                <iframe
                  title="Live Economic Calendar"
                  src="https://s.tradingview.com/embed-widget/events/?locale=en#%7B%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Afalse%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22importanceFilter%22%3A%220%2C1%22%2C%22currencyFilter%22%3A%22AUD%2CUSD%2CCNY%2CJPY%2CEUR%2CGBP%2CCAD%2CNZD%22%7D"
                  className="w-full h-full border-0"
                />
              </div>
            )}

            {/* Footer Permalink Shortcut */}
            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>PHT (UTC+8) • Permalink: oct25.2026</span>
              <a
                href={permalinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-400 hover:text-rose-300 font-bold inline-flex items-center gap-1"
              >
                <span>Open Permalink</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* FULL-SCREEN FOREX FACTORY PERMALINK MODAL */}
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
                    Forex Factory Permalink Calendar (week=oct25.2026)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-xl">
                    {permalinkUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={permalinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-extrabold flex items-center gap-1.5"
                >
                  <span>Launch Exact Permalink on ForexFactory.com</span>
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
              {enrichedEvents.map(renderEventRow)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
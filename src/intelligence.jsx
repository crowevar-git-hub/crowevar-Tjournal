import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Brain,
  Target,
  Clock,
  Calendar,
  BarChart3,
  ShieldCheck,
  Sparkles,
  Flame,
  Trophy,
  Sliders,
  CheckCircle2,
  XCircle,
  Edit3,
  FileText,
  Printer,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Tag,
  PenTool,
  Type,
  Square,
  ArrowUpRight,
  Minus,
  RotateCcw,
  Save,
  Eye,
  Filter,
  Zap,
  Activity,
  Layers
} from 'lucide-react';

const MISTAKE_CATALOG = [
  'FOMO Entry',
  'Early Entry',
  'Late Entry',
  'Overtrading',
  'Revenge Trade',
  'Missed Stop Loss',
  'Position Oversizing'
];

const STRENGTH_CATALOG = [
  'Followed Risk Rules',
  'Waited For Confirmation',
  'A+ Setup Confluence',
  'Proper Position Sizing',
  'Respected Session Rules',
  'Held To Target'
];

const DEFAULT_TAGS = [
  '#London',
  '#NewYork',
  '#Overlap',
  '#Asian',
  '#SMC',
  '#LiquidityGrab',
  '#Ichimoku',
  '#Breakout',
  '#TrendContinuation'
];

const EMOTION_CATALOG = ['Calm', 'Patience', 'Focused', 'Fear', 'Greed', 'FOMO', 'Revenge'];

// Helper: Parse YYYY-MM-DD and timestamps safely
const parseTradeDate = (t) => {
  const raw = String(t?.closeDate && t.closeDate !== 'Pending' ? t.closeDate : t?.execDate || '').trim();
  if (!raw) return new Date(2026, 9, 26);
  const iso = raw.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (iso) {
    return new Date(
      parseInt(iso[1], 10),
      parseInt(iso[2], 10) - 1,
      parseInt(iso[3], 10),
      iso[4] ? parseInt(iso[4], 10) : 12,
      iso[5] ? parseInt(iso[5], 10) : 0
    );
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date(2026, 9, 26) : d;
};

// Helper: Calculate hold duration in minutes
const calcHoldMinutes = (t) => {
  if (!t?.execDate || !t?.closeDate || t.status === 'O' || t.closeDate === 'Pending') return 45;
  const start = parseTradeDate({ execDate: t.execDate });
  const end = parseTradeDate({ execDate: t.closeDate });
  const diff = Math.round((end.getTime() - start.getTime()) / 60000);
  return diff > 0 && diff < 10080 ? diff : 45;
};

// Helper: Normalize Session Name
const normalizeSession = (raw) => {
  const s = String(raw || 'NY').toUpperCase();
  if (s.includes('OVER')) return 'London/NY Overlap';
  if (s.includes('LDN') || s.includes('LON')) return 'London Session';
  if (s.includes('ASI') || s.includes('TOK')) return 'Asian Session';
  return 'New York Session';
};

// Helper: Infer mistakes from notes/outcomes when not explicitly tagged yet
const resolveTradeMistakes = (t) => {
  if (Array.isArray(t?.mistakes) && t.mistakes.length > 0) return t.mistakes;
  const notes = (
    String(t?.postAnalysis || '') +
    ' ' +
    String(t?.postTradeReview?.outcomeAnalysis || '') +
    ' ' +
    String(t?.preAnalysis || '')
  ).toLowerCase();
  const inferred = [];
  if (notes.includes('fomo') || (t?.psychology || []).includes('FOMO')) inferred.push('FOMO Entry');
  if (notes.includes('early') || notes.includes('premature')) inferred.push('Early Entry');
  if (notes.includes('late') || notes.includes('chased')) inferred.push('Late Entry');
  if (notes.includes('overtrad')) inferred.push('Overtrading');
  if (notes.includes('revenge') || (t?.psychology || []).includes('Revenge Trading')) inferred.push('Revenge Trade');
  if (notes.includes('stop') && t?.status === 'L') inferred.push('Missed Stop Loss');
  if (Number(t?.lots) >= 2.5 && t?.status === 'L') inferred.push('Position Oversizing');
  return inferred;
};

// Helper: AI Trade Coach Grading & Evaluation Engine
const evaluateTradeWithAICoach = (t) => {
  const prof = Number(t?.profit) || 0;
  const loss = Number(t?.loss) || 0;
  const net = prof - loss;
  const mistakes = resolveTradeMistakes(t);
  const preText = String(t?.preTradeAnalysis?.tradePlan || t?.preAnalysis || '').trim();
  const postText = String(t?.postTradeReview?.outcomeAnalysis || t?.postAnalysis || '').trim();
  const hasScreenshots = Array.isArray(t?.screenshots) && t.screenshots.length > 0;
  const confidence = Number(t?.confidenceLevel ?? 8);
  const stress = Number(t?.stressLevel ?? 3);
  const followedPlan = t?.followedPlan !== undefined ? Boolean(t.followedPlan) : mistakes.length === 0;

  let score = 78;
  if (net > 0) score += 10;
  if (preText.length > 15) score += 5;
  if (postText.length > 15) score += 4;
  if (hasScreenshots) score += 4;
  if (followedPlan) score += 6;
  if (stress >= 7) score -= 8;
  score -= mistakes.length * 9;
  score = Math.max(40, Math.min(99, score));

  const grade =
    score >= 93 ? 'A+' : score >= 86 ? 'A' : score >= 80 ? 'B+' : score >= 72 ? 'B' : 'C';

  const strengths = [];
  if (followedPlan) strengths.push('Followed Risk & Trade Plan');
  if (preText.length > 15) strengths.push('Documented Pre-Trade Confluence');
  if (net > 0) strengths.push(`Positive Execution (+$${net.toFixed(2)})`);
  if (confidence >= 7 && stress <= 5) strengths.push('Composed Psychological State');
  if (strengths.length === 0) strengths.push('Position Risk Logged in Ledger');

  const weaknesses = [...mistakes];
  if (!preText) weaknesses.push('Missing Detailed Pre-Trade Plan');
  if (!hasScreenshots) weaknesses.push('No Chart Evidence Screenshot Attached');
  if (stress >= 7) weaknesses.push(`Elevated Pre-Trade Stress (${stress}/10)`);

  const recommendation =
    mistakes.includes('Early Entry')
      ? 'Wait for candle closure and liquidity sweep confirmation before executing.'
      : mistakes.includes('FOMO Entry')
      ? 'Avoid chasing impulsive candles; set limit alerts at HTF key levels.'
      : net < 0
      ? 'Review stop-loss placement relative to session liquidity highs/lows.'
      : 'Maintain current position sizing and continue scaling at 2R+ targets.';

  return {
    score,
    grade,
    entryQuality: mistakes.includes('Early Entry') || mistakes.includes('Late Entry') ? 'Needs Tuning' : 'Strong',
    exitQuality: net > 0 ? 'Optimal' : 'Stopped / Defensive',
    riskManagement: mistakes.includes('Position Oversizing') ? 'Aggressive' : 'Controlled (<= 1% Risk)',
    discipline: followedPlan ? '95% Compliant' : 'Deviated',
    strengths,
    weaknesses,
    recommendation,
    checklist: [
      'Confirm HTF Market Structure & Session Bias',
      'Wait for Liquidity Sweep + Displacement Candle',
      'Verify Risk <= 1.0% Before Clicking Buy/Sell',
      'Attach Entry & Result Chart Screenshots'
    ]
  };
};

class IntelligenceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn('Intelligence suite silent catch:', error);
  }
  render() {
    if (this.state.hasError) {
      return null; // Gracefully fail without crashing the main journal app
    }
    return this.props.children;
  }
}

export function TradeAtlasIntelligenceSuite() {
  return (
    <IntelligenceErrorBoundary>
      <TradeAtlasIntelligenceInner />
    </IntelligenceErrorBoundary>
  );
}

function TradeAtlasIntelligenceInner() {
  const [bridge, setBridge] = useState(() => window.__TRADEATLAS_STATE__ || null);
  const [activeTab, setActiveTab] = useState('EDGE_FINDER'); // 'EDGE_FINDER' | 'SESSIONS' | 'PSYCH_MISTAKES' | 'INSTITUTIONAL' | 'PROP_TRACKER' | 'AI_COACH'
  const [datePreset, setDatePreset] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'LAST_30' | 'YTD'
  const [suiteCollapsed, setSuiteCollapsed] = useState(false);

  // Slide-out Trade Review Drawer State
  const [drawerTradeId, setDrawerTradeId] = useState(null);
  const [drawerTab, setDrawerTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'BEHAVIOR' | 'COACH'
  const [customTagInput, setCustomTagInput] = useState('');

  // Screenshot Annotation Studio State
  const [annotatingShot, setAnnotatingShot] = useState(null); // { tradeId, shot }
  const [annoTool, setAnnoTool] = useState('LINE'); // 'LINE' | 'RECT' | 'ARROW' | 'TEXT'
  const [annoColor, setAnnoColor] = useState('#06b6d4');
  const [annoShapes, setAnnoShapes] = useState([]);
  const [dragStart, setDragStart] = useState(null);
  const canvasRef = useRef(null);
  const baseImgRef = useRef(null);

  // Portal Mount Target inside App.jsx Dashboard
  const [portalContainer, setPortalContainer] = useState(null);

  // Listen to live state updates from App.jsx
  useEffect(() => {
    const syncHandler = (e) => {
      setBridge({ ...(e.detail || window.__TRADEATLAS_STATE__ || {}) });
    };
    window.addEventListener('tradeatlas-state-sync', syncHandler);
    const interval = setInterval(() => {
      if (window.__TRADEATLAS_STATE__) {
        setBridge((prev) => {
          const next = window.__TRADEATLAS_STATE__;
          if (
            !prev ||
            prev.trades !== next.trades ||
            prev.activeContext !== next.activeContext ||
            prev.selectedAccount !== next.selectedAccount
          ) {
            return { ...next };
          }
          return prev;
        });
      }
    }, 500);
    return () => {
      window.removeEventListener('tradeatlas-state-sync', syncHandler);
      clearInterval(interval);
    };
  }, []);

  // Create or locate portal mount point safely
  useEffect(() => {
    const ensureMount = () => {
      try {
        let existing = document.getElementById('tradeatlas-intelligence-mount');
        if (!existing) {
          const mainContainer = document.querySelector('main') || document.querySelector('.max-w-7xl');
          if (mainContainer) {
            existing = document.createElement('div');
            existing.id = 'tradeatlas-intelligence-mount';
            existing.className = 'my-6';
            mainContainer.insertBefore(existing, mainContainer.firstChild);
          }
        }
        if (existing && existing !== portalContainer) {
          setPortalContainer(existing);
        }
      } catch (e) {}
    };
    ensureMount();
    const timer = setInterval(ensureMount, 800);
    return () => clearInterval(timer);
    const timer = setInterval(ensureMount, 600);
    return () => clearInterval(timer);
  }, [portalContainer]);

  // Keyboard Shortcuts (Shift+E = Edge Finder, Shift+R = Review Drawer, Esc = Close Drawer)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'Escape') {
        setDrawerTradeId(null);
        setAnnotatingShot(null);
      } else if (e.shiftKey && e.key.toUpperCase() === 'E') {
        e.preventDefault();
        setSuiteCollapsed((c) => !c);
      } else if (e.shiftKey && e.key.toUpperCase() === 'R') {
        e.preventDefault();
        const list = bridge?.trades || [];
        if (list.length > 0) setDrawerTradeId(list[0].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bridge]);

  // GitHub-Style Weighted Calendar Heatmap Enhancer
  useEffect(() => {
    const applyCalendarHeatmap = () => {
      const cells = document.querySelectorAll('.grid-cols-7 > div');
      cells.forEach((cell) => {
        const txt = (cell.textContent || '').trim();
        const pnlMatch = txt.match(/([+-]\$\d+(?:\.\d+)?)/);
        const tradeMatch = txt.match(/(\d+)t\b/);
        if (!pnlMatch) return;
        const val = parseFloat(pnlMatch[1].replace(/[+$]/g, ''));
        const tCount = tradeMatch ? parseInt(tradeMatch[1], 10) : 1;

        if (val > 0) {
          // 3-Tier GitHub-style Profit Intensity
          if (val >= 150) {
            cell.style.backgroundColor = 'rgba(16, 185, 129, 0.34)';
            cell.style.borderColor = 'rgba(52, 211, 153, 0.85)';
            cell.style.boxShadow = '0 0 18px rgba(16, 185, 129, 0.25)';
          } else if (val >= 50) {
            cell.style.backgroundColor = 'rgba(16, 185, 129, 0.20)';
            cell.style.borderColor = 'rgba(16, 185, 129, 0.55)';
          } else {
            cell.style.backgroundColor = 'rgba(16, 185, 129, 0.10)';
            cell.style.borderColor = 'rgba(16, 185, 129, 0.35)';
          }
          cell.title = `Day P&L: +$${val.toFixed(2)} | Trades: ${tCount} | Intensity: ${
            val >= 150 ? 'Large Win' : val >= 50 ? 'Moderate Win' : 'Small Win'
          }`;
        } else if (val < 0) {
          const abs = Math.abs(val);
          // 3-Tier Loss Intensity
          if (abs >= 150) {
            cell.style.backgroundColor = 'rgba(244, 63, 94, 0.36)';
            cell.style.borderColor = 'rgba(251, 113, 133, 0.85)';
            cell.style.boxShadow = '0 0 18px rgba(244, 63, 94, 0.25)';
          } else if (abs >= 50) {
            cell.style.backgroundColor = 'rgba(244, 63, 94, 0.22)';
            cell.style.borderColor = 'rgba(244, 63, 94, 0.55)';
          } else {
            cell.style.backgroundColor = 'rgba(244, 63, 94, 0.11)';
            cell.style.borderColor = 'rgba(244, 63, 94, 0.35)';
          }
          cell.title = `Day P&L: -$${abs.toFixed(2)} | Trades: ${tCount} | Intensity: ${
            abs >= 150 ? 'Large Loss' : abs >= 50 ? 'Moderate Loss' : 'Small Loss'
          }`;
        }
      });
    };
    applyCalendarHeatmap();
    const timer = setInterval(applyCalendarHeatmap, 1200);
    return () => clearInterval(timer);
  }, [bridge]);

  const rawTrades = bridge?.trades || [];
  const activeContext = bridge?.activeContext || 'Unified View';
  const activeProfile = Array.isArray(bridge?.profiles) && bridge.profiles.length > 0 ? bridge.profiles[0] : null;
  const stageKeyMap = {
    'Stage 1': 'stage1',
    'Stage 2': 'stage2',
    'Funded Account': 'funded',
    'Live Personal': 'live'
  };
  const currentStageKey = stageKeyMap[activeContext] || null;
  const selectedAccount = useMemo(() => {
    if (!currentStageKey || !activeProfile?.accounts?.[currentStageKey]) return 'ALL';
    return activeProfile.accounts[currentStageKey].activeAccount || 'ALL';
  }, [activeProfile, currentStageKey]);

  const accountSize = useMemo(() => {
    if (!activeProfile) return 10000;
    if (currentStageKey && selectedAccount && selectedAccount !== 'ALL') {
      const meta = activeProfile.accountMeta?.[selectedAccount];
      if (meta?.startingBalance) return Number(meta.startingBalance) || 10000;
      if (meta?.size) {
        const num = parseFloat(String(meta.size).replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) return String(meta.size).toUpperCase().includes('K') ? num * 1000 : num;
      }
    }
    return 10000;
  }, [activeProfile, currentStageKey, selectedAccount]);
  const canEdit = Boolean(!window.__CROWEVAR_RBAC__ || window.__CROWEVAR_RBAC__.can('editTrades'));

  // Filter trades by Context, Account, and Quick Date Preset
  const scopedTrades = useMemo(() => {
    const rbac = window.__CROWEVAR_RBAC__;
    let list = (rawTrades || []).filter((t) => !t.deleted);
    if (rbac && !rbac.can('viewLiveAccounts')) {
      list = list.filter((t) => t.stage !== 'Live Personal');
    }
    if (activeContext && activeContext !== 'Unified View') {
      list = list.filter((t) => t.stage === activeContext);
    }
    if (selectedAccount && selectedAccount !== 'ALL') {
      list = list.filter((t) => String(t.accountNumber) === String(selectedAccount));
    }

    if (datePreset !== 'ALL') {
      // Anchor relative presets to the most recent trade date or current date
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      list = list.filter((t) => {
        const d = parseTradeDate(t);
        if (datePreset === 'TODAY') {
          return d >= startOfToday;
        }
        if (datePreset === 'WEEK') {
          const weekAgo = new Date(now.getTime() - 7 * 86400000);
          return d >= weekAgo;
        }
        if (datePreset === 'MONTH') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (datePreset === 'LAST_30') {
          const thirtyAgo = new Date(now.getTime() - 30 * 86400000);
          return d >= thirtyAgo;
        }
        if (datePreset === 'YTD') {
          return d.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }
    return list;
  }, [rawTrades, activeContext, selectedAccount, datePreset]);

  // ============================================================================
  // MASTER ANALYTICS ENGINE (COMPUTES ALL 15 MODULES IN REAL TIME)
  // ============================================================================
  const intelligence = useMemo(() => {
    const closed = scopedTrades.filter((t) => t.status === 'W' || t.status === 'L');
    const wins = closed.filter((t) => t.status === 'W');
    const losses = closed.filter((t) => t.status === 'L');

    const grossProfit = closed.reduce((s, t) => s + (Number(t.profit) || 0), 0);
    const grossLoss = closed.reduce((s, t) => s + (Number(t.loss) || 0), 0);
    const netPnl = grossProfit - grossLoss;
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
    const lossRate = closed.length > 0 ? (losses.length / closed.length) * 100 : 0;
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 9.99 : 0;

    // 1. Institutional Metrics (Expectancy, Avg R, Max Drawdown, Recovery Factor, Hold Time, Sharpe)
    const expectancy =
      closed.length > 0 ? (winRate / 100) * avgWin - (lossRate / 100) * avgLoss : 0;
    const avgR =
      closed.length > 0
        ? closed.reduce((s, t) => {
            const r =
              t.rMultiple !== undefined && t.rMultiple !== null && t.rMultiple !== ''
                ? Number(t.rMultiple)
                : ((Number(t.profit) || 0) - (Number(t.loss) || 0)) / (accountSize * 0.01);
            return s + (isNaN(r) ? 0 : r);
          }, 0) / closed.length
        : 0;

    // Chronological Equity Curve & Max Drawdown
    const sortedChrono = [...closed].sort((a, b) => parseTradeDate(a) - parseTradeDate(b));
    let peakEquity = accountSize;
    let runningEquity = accountSize;
    let maxDrawdownDollar = 0;
    const returnsList = [];

    sortedChrono.forEach((t) => {
      const net = (Number(t.profit) || 0) - (Number(t.loss) || 0);
      returnsList.push(net);
      runningEquity += net;
      if (runningEquity > peakEquity) peakEquity = runningEquity;
      const dd = peakEquity - runningEquity;
      if (dd > maxDrawdownDollar) maxDrawdownDollar = dd;
    });

    const maxDrawdownPct = (maxDrawdownDollar / (accountSize || 1)) * 100;
    const recoveryFactor =
      maxDrawdownDollar > 0 ? netPnl / maxDrawdownDollar : netPnl > 0 ? 5.0 : 0;

    const avgHoldMins =
      closed.length > 0
        ? Math.round(closed.reduce((s, t) => s + calcHoldMinutes(t), 0) / closed.length)
        : 0;

    // Sharpe-Style Efficiency Score
    const meanReturn = returnsList.length > 0 ? netPnl / returnsList.length : 0;
    const variance =
      returnsList.length > 1
        ? returnsList.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / (returnsList.length - 1)
        : 1;
    const stdDev = Math.sqrt(variance) || 1;
    const sharpeScore = returnsList.length > 1 ? (meanReturn / stdDev) * Math.sqrt(returnsList.length) : 0;

    // 2. By Symbol (Asset Edge)
    const symbolMap = new Map();
    closed.forEach((t) => {
      const sym = t.symbol || 'UNKNOWN';
      const cur = symbolMap.get(sym) || { symbol: sym, trades: 0, wins: 0, gp: 0, gl: 0, net: 0 };
      const p = Number(t.profit) || 0;
      const l = Number(t.loss) || 0;
      cur.trades += 1;
      if (t.status === 'W') cur.wins += 1;
      cur.gp += p;
      cur.gl += l;
      cur.net += p - l;
      symbolMap.set(sym, cur);
    });
    const symbolsRanked = Array.from(symbolMap.values())
      .map((s) => ({
        ...s,
        wr: s.trades > 0 ? (s.wins / s.trades) * 100 : 0,
        pf: s.gl > 0 ? s.gp / s.gl : s.gp > 0 ? 9.99 : 0
      }))
      .sort((a, b) => b.net - a.net);

    const bestAsset = symbolsRanked[0] || { symbol: 'XAUUSD', net: 0, pf: 0, wr: 0, trades: 0 };
    const worstAsset =
      symbolsRanked.length > 1 && symbolsRanked[symbolsRanked.length - 1].net < 0
        ? symbolsRanked[symbolsRanked.length - 1]
        : symbolsRanked[symbolsRanked.length - 1] || { symbol: 'N/A', net: 0, pf: 0, wr: 0 };

    // 3. By Session (Session Performance Analytics)
    const sessionNames = ['Asian Session', 'London Session', 'New York Session', 'London/NY Overlap'];
    const sessionMap = new Map();
    sessionNames.forEach((name) =>
      sessionMap.set(name, { name, trades: 0, wins: 0, gp: 0, gl: 0, net: 0, symbols: {} })
    );
    closed.forEach((t) => {
      const sName = normalizeSession(t.session);
      const cur = sessionMap.get(sName) || { name: sName, trades: 0, wins: 0, gp: 0, gl: 0, net: 0, symbols: {} };
      const p = Number(t.profit) || 0;
      const l = Number(t.loss) || 0;
      const net = p - l;
      cur.trades += 1;
      if (t.status === 'W') cur.wins += 1;
      cur.gp += p;
      cur.gl += l;
      cur.net += net;
      cur.symbols[t.symbol] = (cur.symbols[t.symbol] || 0) + net;
      sessionMap.set(sName, cur);
    });
    const sessionList = Array.from(sessionMap.values()).map((s) => {
      const topSym =
        Object.entries(s.symbols).sort((a, b) => b[1] - a[1])[0]?.[0] || 'XAUUSD';
      return {
        ...s,
        wr: s.trades > 0 ? (s.wins / s.trades) * 100 : 0,
        pf: s.gl > 0 ? s.gp / s.gl : s.gp > 0 ? 9.99 : 0,
        avgTrade: s.trades > 0 ? s.net / s.trades : 0,
        bestInstrument: s.trades > 0 ? topSym : '—'
      };
    });
    const sessionsSorted = [...sessionList].filter((s) => s.trades > 0).sort((a, b) => b.net - a.net);
    const bestSession = sessionsSorted[0] || { name: 'London Session', wr: 0, net: 0, pf: 0 };
    const worstSession =
      sessionsSorted.length > 1 ? sessionsSorted[sessionsSorted.length - 1] : { name: 'Late New York', wr: 0, net: 0 };

    // 4. By Day of Week
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekMap = new Map();
    closed.forEach((t) => {
      const dName = weekdays[parseTradeDate(t).getDay()];
      const cur = dayOfWeekMap.get(dName) || { day: dName, trades: 0, wins: 0, net: 0 };
      cur.trades += 1;
      if (t.status === 'W') cur.wins += 1;
      cur.net += (Number(t.profit) || 0) - (Number(t.loss) || 0);
      dayOfWeekMap.set(dName, cur);
    });
    const daysRanked = Array.from(dayOfWeekMap.values()).sort((a, b) => b.net - a.net);
    const bestDay = daysRanked[0] || { day: 'Tuesday', net: 0, trades: 0 };

    // 5. Mistake Analysis Engine
    const mistakeMap = new Map();
    MISTAKE_CATALOG.forEach((m) => mistakeMap.set(m, { name: m, count: 0, totalLost: 0 }));
    closed.forEach((t) => {
      const mList = resolveTradeMistakes(t);
      const net = (Number(t.profit) || 0) - (Number(t.loss) || 0);
      mList.forEach((m) => {
        const cur = mistakeMap.get(m) || { name: m, count: 0, totalLost: 0 };
        cur.count += 1;
        if (net < 0) cur.totalLost += Math.abs(net);
        mistakeMap.set(m, cur);
      });
    });
    const mistakesRanked = Array.from(mistakeMap.values())
      .map((m) => ({
        ...m,
        avgLoss: m.count > 0 ? m.totalLost / m.count : 0
      }))
      .sort((a, b) => b.totalLost - a.totalLost || b.count - a.count);

    const topMistake = mistakesRanked[0] || { name: 'Early Entry', totalLost: 0, count: 0, avgLoss: 0 };

    // 6. Psychology Correlation Analytics
    const highConfTrades = closed.filter((t) => Number(t.confidenceLevel ?? (t.status === 'W' ? 8 : 6)) >= 8);
    const highConfWins = highConfTrades.filter((t) => t.status === 'W').length;
    const highConfWinRate = highConfTrades.length > 0 ? (highConfWins / highConfTrades.length) * 100 : 75;

    const highStressTrades = closed.filter(
      (t) => Number(t.stressLevel ?? (resolveTradeMistakes(t).length > 0 ? 8 : 3)) >= 7
    );
    const highStressWins = highStressTrades.filter((t) => t.status === 'W').length;
    const highStressWinRate =
      highStressTrades.length > 0 ? (highStressWins / highStressTrades.length) * 100 : 22;

    const planCompliantTrades = closed.filter((t) =>
      t.followedPlan !== undefined ? Boolean(t.followedPlan) : resolveTradeMistakes(t).length === 0
    );
    const planComplianceRate =
      closed.length > 0 ? (planCompliantTrades.length / closed.length) * 100 : 100;

    // 7. Gamification & Consistency Streaks
    const dailyNetMap = new Map();
    sortedChrono.forEach((t) => {
      const d = parseTradeDate(t);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const net = (Number(t.profit) || 0) - (Number(t.loss) || 0);
      dailyNetMap.set(key, (dailyNetMap.get(key) || 0) + net);
    });
    const dailyEntries = Array.from(dailyNetMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    let curGreenStreak = 0;
    let bestGreenStreak = 0;
    let largestDayProfit = 0;
    let worstDailyLoss = 0;

    dailyEntries.forEach(([, dayNet]) => {
      if (dayNet > largestDayProfit) largestDayProfit = dayNet;
      if (dayNet < worstDailyLoss) worstDailyLoss = dayNet;
      if (dayNet > 0) {
        curGreenStreak += 1;
        if (curGreenStreak > bestGreenStreak) bestGreenStreak = curGreenStreak;
      } else if (dayNet < 0) {
        curGreenStreak = 0;
      }
    });

    // Consecutive Rule-Compliant Trades Streak
    let consecutiveCompliant = 0;
    for (let i = sortedChrono.length - 1; i >= 0; i--) {
      if (resolveTradeMistakes(sortedChrono[i]).length === 0) {
        consecutiveCompliant += 1;
      } else {
        break;
      }
    }

    // Consistency Score (100% - Largest Day % of Total Profit)
    const bestDayWeightPct =
      netPnl > 0 && largestDayProfit > 0 ? Math.min(100, (largestDayProfit / netPnl) * 100) : 25;
    const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, bestDayWeightPct - 25))));

    return {
      totalTrades: scopedTrades.length,
      closedCount: closed.length,
      winsCount: wins.length,
      lossesCount: losses.length,
      grossProfit,
      grossLoss,
      netPnl,
      winRate,
      profitFactor,
      expectancy,
      avgR,
      maxDrawdownDollar,
      maxDrawdownPct,
      recoveryFactor,
      avgHoldMins,
      sharpeScore,
      bestAsset,
      worstAsset,
      symbolsRanked,
      sessionList,
      bestSession,
      worstSession,
      bestDay,
      mistakesRanked,
      topMistake,
      highConfWinRate,
      highStressWinRate,
      planComplianceRate,
      curGreenStreak,
      bestGreenStreak,
      consecutiveCompliant,
      consistencyScore,
      tradingDaysCount: dailyEntries.length,
      worstDailyLoss: Math.abs(worstDailyLoss)
    };
  }, [scopedTrades, accountSize]);

  // Resolve Drawer Active Trade
  const activeDrawerTrade = useMemo(() => {
    if (!drawerTradeId) return null;
    return (rawTrades || []).find((t) => t.id === drawerTradeId) || null;
  }, [rawTrades, drawerTradeId]);

  // Update a specific trade's behavioral/mistake/tag/annotation properties in App.jsx state
  const updateTradeRecord = (tradeId,patchObj) => {
    if (!canEdit || !bridge?.setTrades) return;
    bridge.setTrades((prev) =>
      prev.map((t) => (t.id === tradeId ? { ...t, ...patchObj } : t))
    );
  };

  // ============================================================================
  // SCREENSHOT ANNOTATION STUDIO HANDLERS
  // ============================================================================
  useEffect(() => {
    if (!annotatingShot || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width || 1200;
      canvas.height = img.height || 675;
      baseImgRef.current = img;
      redrawCanvas(img, annoShapes);
    };
    img.src = annotatingShot.shot.url;
  }, [annotatingShot]);

  const redrawCanvas = (img, shapes) => {
    if (!canvasRef.current || !img) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    shapes.forEach((s) => {
      ctx.strokeStyle = s.color || '#06b6d4';
      ctx.fillStyle = s.color || '#06b6d4';
      ctx.lineWidth = Math.max(3, Math.round(canvas.width / 320));

      if (s.type === 'LINE') {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
      } else if (s.type === 'RECT') {
        ctx.save();
        ctx.fillStyle = s.color + '26';
        ctx.fillRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
        ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
        ctx.restore();
      } else if (s.type === 'ARROW') {
        const headlen = Math.max(14, Math.round(canvas.width / 80));
        const dx = s.x2 - s.x1;
        const dy = s.y2 - s.y1;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.lineTo(
          s.x2 - headlen * Math.cos(angle - Math.PI / 6),
          s.y2 - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(s.x2, s.y2);
        ctx.lineTo(
          s.x2 - headlen * Math.cos(angle + Math.PI / 6),
          s.y2 - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      } else if (s.type === 'TEXT' && s.text) {
        const fontSize = Math.max(18, Math.round(canvas.width / 55));
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = '#050811';
        const metrics = ctx.measureText(s.text);
        ctx.fillRect(s.x1 - 6, s.y1 - fontSize - 4, metrics.width + 12, fontSize + 12);
        ctx.strokeStyle = s.color;
        ctx.strokeRect(s.x1 - 6, s.y1 - fontSize - 4, metrics.width + 12, fontSize + 12);
        ctx.fillStyle = s.color;
        ctx.fillText(s.text, s.x1, s.y1);
      }
    });
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasMouseDown = (e) => {
    if (!canvasRef.current) return;
    const pt = getCanvasCoords(e);
    if (annoTool === 'TEXT') {
      const txt = window.prompt('Enter chart annotation note (e.g., Liquidity Sweep / Entry):', '');
      if (txt && txt.trim()) {
        const next = [...annoShapes, { type: 'TEXT', x1: pt.x, y1: pt.y, text: txt.trim(), color: annoColor }];
        setAnnoShapes(next);
        redrawCanvas(baseImgRef.current, next);
      }
      return;
    }
    setDragStart(pt);
  };

  const handleCanvasMouseUp = (e) => {
    if (!dragStart || !canvasRef.current) return;
    const pt = getCanvasCoords(e);
    const next = [
      ...annoShapes,
      { type: annoTool, x1: dragStart.x, y1: dragStart.y, x2: pt.x, y2: pt.y, color: annoColor }
    ];
    setAnnoShapes(next);
    setDragStart(null);
    redrawCanvas(baseImgRef.current, next);
  };

  const handleSaveAnnotatedScreenshot = () => {
    if (!annotatingShot || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
    const targetTrade = (rawTrades || []).find((t) => t.id === annotatingShot.tradeId);
    if (targetTrade) {
      const updatedShots = (targetTrade.screenshots || []).map((s) =>
        s.id === annotatingShot.shot.id
          ? { ...s, url: dataUrl, annotations: annoShapes, annotatedAt: new Date().toISOString() }
          : s
      );
      updateTradeRecord(targetTrade.id, { screenshots: updatedShots });
    }
    setAnnotatingShot(null);
    setAnnoShapes([]);
  };

  // ============================================================================
  // INSTITUTIONAL MONTHLY PDF / PRINT REPORT GENERATOR
  // ============================================================================
  const handleGenerateInstitutionalPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const sortedByNet = [...scopedTrades]
      .filter((t) => t.status === 'W' || t.status === 'L')
      .sort((a, b) => (Number(b.profit) - Number(b.loss)) - (Number(a.profit) - Number(a.loss)));
    const bestTrades = sortedByNet.slice(0, 3);
    const worstTrades = sortedByNet.slice(-3).reverse();

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>TradeAtlas Institutional Performance Tear Sheet — ${activeContext}</title>
  <style>
    body { background: #050811; color: #f8fafc; font-family: 'Inter', -apple-system, sans-serif; padding: 36px; margin: 0; }
    .sheet { max-width: 1100px; margin: 0 auto; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #06b6d4; padding-bottom: 16px; margin-bottom: 24px; }
    .hdr h1 { margin: 0; font-size: 24px; letter-spacing: 0.5px; }
    .hdr h1 span { color: #06b6d4; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
    .card { background: #090d1a; border: 1px solid #1e293b; border-radius: 12px; padding: 14px; }
    .card label { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700; display: block; }
    .card strong { font-size: 20px; margin-top: 4px; display: block; }
    .pos { color: #34d399; }
    .neg { color: #fb7185; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 6px; margin-top: 26px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th, td { border-bottom: 1px solid #1e293b; padding: 8px 10px; text-align: left; }
    th { color: #94a3b8; font-size: 10px; text-transform: uppercase; background: #090d1a; }
    @media print { body { background: #050811 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="hdr">
      <div>
        <h1>TRADE<span>ATLAS</span> — INSTITUTIONAL PERFORMANCE TEAR SHEET</h1>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Context: ${activeContext} (Account: ${selectedAccount}) • Period: ${datePreset}</p>
      </div>
      <div style="text-align:right;font-size:11px;color:#94a3b8;">
        Generated: ${new Date().toLocaleString()}<br/>
        Discipline Score: <strong>${intelligence.planComplianceRate.toFixed(1)}%</strong>
      </div>
    </div>

    <div class="grid-4">
      <div class="card"><label>Account Equity</label><strong>$${(accountSize + intelligence.netPnl).toFixed(2)}</strong></div>
      <div class="card"><label>Net Realized P&amp;L</label><strong class="${intelligence.netPnl >= 0 ? 'pos' : 'neg'}">${intelligence.netPnl >= 0 ? '+$' : '-$'}${Math.abs(intelligence.netPnl).toFixed(2)}</strong></div>
      <div class="card"><label>Win Rate &amp; Profit Factor</label><strong>${intelligence.winRate.toFixed(1)}% • PF ${intelligence.profitFactor.toFixed(2)}</strong></div>
      <div class="card"><label>Expectancy &amp; Avg R</label><strong class="${intelligence.expectancy >= 0 ? 'pos' : 'neg'}">$${intelligence.expectancy.toFixed(2)} • ${intelligence.avgR.toFixed(2)}R</strong></div>
      <div class="card"><label>Maximum Drawdown</label><strong class="neg">$${intelligence.maxDrawdownDollar.toFixed(2)} (${intelligence.maxDrawdownPct.toFixed(2)}%)</strong></div>
      <div class="card"><label>Recovery Factor</label><strong>${intelligence.recoveryFactor.toFixed(2)}</strong></div>
      <div class="card"><label>Sharpe Efficiency</label><strong>${intelligence.sharpeScore.toFixed(2)}</strong></div>
      <div class="card"><label>Best Green Streak</label><strong>🔥 ${intelligence.curGreenStreak}d (Best: 🏆 ${intelligence.bestGreenStreak}d)</strong></div>
    </div>

    <h2>1. Edge Discovery Summary (Repeat vs. Eliminate)</h2>
    <div class="grid-4">
      <div class="card"><label>Best Performing Asset</label><strong class="pos">${intelligence.bestAsset.symbol} (+$${intelligence.bestAsset.net.toFixed(2)})</strong></div>
      <div class="card"><label>Best Session</label><strong class="pos">${intelligence.bestSession.name} (${intelligence.bestSession.wr.toFixed(1)}% WR)</strong></div>
      <div class="card"><label>Best Trading Day</label><strong class="pos">${intelligence.bestDay.day} (+$${intelligence.bestDay.net.toFixed(2)})</strong></div>
      <div class="card"><label>Most Expensive Mistake</label><strong class="neg">${intelligence.topMistake.name} (-$${intelligence.topMistake.totalLost.toFixed(2)})</strong></div>
    </div>

    <h2>2. Session Performance Breakdown</h2>
    <table>
      <thead><tr><th>Session</th><th>Trades</th><th>Win Rate</th><th>Profit Factor</th><th>Avg Trade</th><th>Best Instrument</th><th>Net P&amp;L</th></tr></thead>
      <tbody>
        ${intelligence.sessionList
          .map(
            (s) =>
              `<tr><td><strong>${s.name}</strong></td><td>${s.trades}</td><td>${s.wr.toFixed(1)}%</td><td>${s.pf.toFixed(
                2
              )}</td><td>$${s.avgTrade.toFixed(2)}</td><td>${s.bestInstrument}</td><td class="${
                s.net >= 0 ? 'pos' : 'neg'
              }"><strong>${s.net >= 0 ? '+$' : '-$'}${Math.abs(s.net).toFixed(2)}</strong></td></tr>`
          )
          .join('')}
      </tbody>
    </table>

    <h2>3. Top Performing Executions vs. Largest Drawdown Trades</h2>
    <table>
      <thead><tr><th>Category</th><th>Ticket</th><th>Symbol</th><th>Side</th><th>Session</th><th>AI Grade</th><th>Net Result</th></tr></thead>
      <tbody>
        ${bestTrades
          .map((t) => {
            const net = (Number(t.profit) || 0) - (Number(t.loss) || 0);
            const ai = evaluateTradeWithAICoach(t);
            return `<tr><td class="pos">★ Top Win</td><td>#${t.ticketId}</td><td><strong>${t.symbol}</strong></td><td>${t.side}</td><td>${t.session}</td><td><strong>${ai.grade}</strong></td><td class="pos">+$${net.toFixed(2)}</td></tr>`;
          })
          .join('')}
        ${worstTrades
          .map((t) => {
            const net = (Number(t.profit) || 0) - (Number(t.loss) || 0);
            const ai = evaluateTradeWithAICoach(t);
            return `<tr><td class="neg">▼ Drawdown</td><td>#${t.ticketId}</td><td><strong>${t.symbol}</strong></td><td>${t.side}</td><td>${t.session}</td><td><strong>${ai.grade}</strong></td><td class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '+$' : '-$'}${Math.abs(net).toFixed(2)}</td></tr>`;
          })
          .join('')}
      </tbody>
    </table>
  </div>
  <script>setTimeout(() => window.print(), 400);</script>
</body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  if (!portalContainer) return null;

  const dashboardUI = (
    <section className="space-y-4 text-xs" data-rbac-ui="true">
      {/* ==================================================================== */}
      {/* TOP BAR: GAMIFICATION STREAKS, QUICK DATE PRESETS & PDF REPORT       */}
      {/* ==================================================================== */}
      <div className="bg-gradient-to-r from-[#090e1f] via-[#0b1329] to-[#090e1f] border border-cyan-500/35 rounded-2xl p-4 shadow-[0_0_35px_rgba(6,182,212,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Gamification Consistency Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
              <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
                  <span>PERFORMANCE INTELLIGENCE &amp; EDGE SUITE</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    v2.0 Institutional
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Behavioral analytics, Edge Finder, Session telemetry, AI Trade Coach &amp; Chart Markup
                </p>
              </div>
            </div>

            {/* Gamification Streaks */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5"
                title="Current consecutive profitable trading days"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Green Streak: 🔥 {intelligence.curGreenStreak}d</span>
              </div>
              <div
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5"
                title="Best historical green day streak"
              >
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Best: 🏆 {intelligence.bestGreenStreak}d</span>
              </div>
              <div
                className="px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 font-bold hidden sm:flex items-center gap-1.5"
                title="Consecutive rule-compliant trades & overall discipline score"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Discipline: {intelligence.planComplianceRate.toFixed(0)}% ({intelligence.consecutiveCompliant}t Streak)
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Quick Date Presets, Drawer Opener, Institutional PDF */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-[#050811] p-1 border border-slate-800">
              {[
                { id: 'ALL', label: 'All Time' },
                { id: 'TODAY', label: 'Today' },
                { id: 'WEEK', label: 'This Week' },
                { id: 'MONTH', label: 'This Month' },
                { id: 'LAST_30', label: '30D' },
                { id: 'YTD', label: 'YTD' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDatePreset(p.id)}
                  className={
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition ' +
                    (datePreset === p.id
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white')
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (scopedTrades.length > 0) {
                  setDrawerTradeId(scopedTrades[0].id);
                  setDrawerTab('OVERVIEW');
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-1.5 transition"
              title="Open Slide-Out Trade Review Side Panel (Shortcut: Shift + R)"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Review Drawer</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateInstitutionalPDF}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5 transition"
              title="Generate Institutional Monthly PDF Tear Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF Tear Sheet</span>
            </button>

            <button
              type="button"
              onClick={() => setSuiteCollapsed(!suiteCollapsed)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Collapse / Expand Intelligence Suite (Shift + E)"
            >
              {suiteCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* 12. DASHBOARD HIERARCHY: PRIMARY / SECONDARY / TERTIARY CARDS      */}
        {/* ================================================================== */}
        {!suiteCollapsed && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Primary Card 1: Account Equity & Trajectory */}
              <div className="bg-[#070b16] border border-cyan-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider">
                    PRIMARY • ACCOUNT EQUITY
                  </span>
                  <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                    ${(accountSize + intelligence.netPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Starting Capital: ${accountSize.toLocaleString()} • {activeContext}
                  </span>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 font-mono font-bold text-xs">
                    {((intelligence.netPnl / (accountSize || 1)) * 100 >= 0 ? '+' : '') +
                      ((intelligence.netPnl / (accountSize || 1)) * 100).toFixed(2)}
                    %
                  </span>
                </div>
              </div>

              {/* Primary Card 2: Current Realized P&L & Expectancy */}
              <div className="bg-[#070b16] border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                    PRIMARY • NET REALIZED P&amp;L
                  </span>
                  <div
                    className={
                      'text-2xl font-extrabold mt-1 font-mono ' +
                      (intelligence.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400')
                    }
                  >
                    {intelligence.netPnl >= 0
                      ? `+$${intelligence.netPnl.toFixed(2)}`
                      : `-$${Math.abs(intelligence.netPnl).toFixed(2)}`}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Expectancy:{' '}
                    <strong className={intelligence.expectancy >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {intelligence.expectancy >= 0 ? `+$${intelligence.expectancy.toFixed(2)}` : `-$${Math.abs(intelligence.expectancy).toFixed(2)}`}/trade
                    </strong>
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-[11px] text-emerald-400 font-mono">GP: +${intelligence.grossProfit.toFixed(2)}</div>
                  <div className="text-[11px] text-rose-400 font-mono">GL: -${intelligence.grossLoss.toFixed(2)}</div>
                </div>
              </div>

              {/* Primary Card 3: Drawdown & Recovery Status */}
              <div className="bg-[#070b16] border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">
                    PRIMARY • DRAWDOWN &amp; RECOVERY
                  </span>
                  <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                    ${intelligence.maxDrawdownDollar.toFixed(2)}{' '}
                    <span className="text-sm text-rose-400">({intelligence.maxDrawdownPct.toFixed(2)}%)</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Recovery Factor: <strong className="text-cyan-300">{intelligence.recoveryFactor.toFixed(2)}x</strong> • Sharpe:{' '}
                    <strong className="text-emerald-300">{intelligence.sharpeScore.toFixed(2)}</strong>
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                  ✓ Protected
                </span>
              </div>
            </div>

            {/* MODULE NAVIGATION TABS */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#070b16] p-1.5 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: 'EDGE_FINDER', label: '🎯 1. Edge Finder', badge: 'ROI #1' },
                  { id: 'SESSIONS', label: '🌍 2. Session Analytics' },
                  { id: 'PSYCH_MISTAKES', label: '🧠 3. Psychology & Mistake Engine' },
                  { id: 'INSTITUTIONAL', label: '📊 4. Institutional Metrics' },
                  { id: 'PROP_TRACKER', label: '🏆 5. Prop Firm Challenge Tracker' },
                  { id: 'AI_COACH', label: '🤖 6. AI Trade Coach & Drawer' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      'px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ' +
                      (activeTab === tab.id
                        ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60')
                    }
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ============================================================== */}
            {/* TAB 1: EDGE FINDER (REPEAT VS. ELIMINATE BEHAVIORS)            */}
            {/* ============================================================== */}
            {activeTab === 'EDGE_FINDER' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Profitable Behaviors to Repeat */}
                <div className="bg-[#070b16] border border-emerald-500/35 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-extrabold text-emerald-300 uppercase tracking-wider">
                        Edge Discovery — Profitable Behaviors to Repeat
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                      A+ Edge Zone
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Best Performing Asset</span>
                      <div className="text-base font-extrabold text-white mt-1">{intelligence.bestAsset.symbol}</div>
                      <div className="text-emerald-400 font-mono font-bold text-sm">
                        +${intelligence.bestAsset.net.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        PF: {intelligence.bestAsset.pf.toFixed(2)} • WR: {intelligence.bestAsset.wr.toFixed(0)}%
                      </span>
                    </div>

                    <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Best Session</span>
                      <div className="text-base font-extrabold text-white mt-1">
                        {intelligence.bestSession.name.replace(' Session', '')}
                      </div>
                      <div className="text-emerald-400 font-mono font-bold text-sm">
                        {intelligence.bestSession.wr.toFixed(1)}% WR
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Net: +${intelligence.bestSession.net.toFixed(2)} • PF: {intelligence.bestSession.pf.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Best Day of Week</span>
                      <div className="text-base font-extrabold text-white mt-1">{intelligence.bestDay.day}</div>
                      <div className="text-emerald-400 font-mono font-bold text-sm">
                        +${intelligence.bestDay.net.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {intelligence.bestDay.trades} Executions Logged
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-3 text-emerald-200 text-[11px]">
                    <strong>✓ Actionable Directive (Repeat):</strong> Focus primary risk allocation on{' '}
                    <strong>{intelligence.bestAsset.symbol}</strong> during the{' '}
                    <strong>{intelligence.bestSession.name}</strong> when pre-trade confidence is &ge; 8/10 (Win Rate:{' '}
                    <strong>{intelligence.highConfWinRate.toFixed(0)}%</strong>).
                  </div>
                </div>

                {/* Right: Weakness Detection & Leak Elimination */}
                <div className="bg-[#070b16] border border-rose-500/35 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <h3 className="text-sm font-extrabold text-rose-300 uppercase tracking-wider">
                        Weakness Detection — Leaks to Eliminate
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 text-[10px] font-bold">
                      Capital Leak Alert
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Lowest Performing Symbol</span>
                      <div className="text-base font-extrabold text-white mt-1">{intelligence.worstAsset.symbol}</div>
                      <div
                        className={
                          'font-mono font-bold text-sm ' +
                          (intelligence.worstAsset.net < 0 ? 'text-rose-400' : 'text-amber-300')
                        }
                      >
                        {intelligence.worstAsset.net < 0
                          ? `-$${Math.abs(intelligence.worstAsset.net).toFixed(2)}`
                          : `+$${intelligence.worstAsset.net.toFixed(2)}`}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        WR: {intelligence.worstAsset.wr?.toFixed(0) || 0}%
                      </span>
                    </div>

                    <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Weakest Session</span>
                      <div className="text-base font-extrabold text-white mt-1">
                        {intelligence.worstSession.name.replace(' Session', '')}
                      </div>
                      <div
                        className={
                          'font-mono font-bold text-sm ' +
                          (intelligence.worstSession.net < 0 ? 'text-rose-400' : 'text-amber-300')
                        }
                      >
                        {intelligence.worstSession.net < 0
                          ? `-$${Math.abs(intelligence.worstSession.net).toFixed(2)}`
                          : `+$${intelligence.worstSession.net.toFixed(2)}`}
                      </div>
                      <span className="text-[10px] text-slate-400">Reduce Lot Size by 50%</span>
                    </div>

                    <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Most Expensive Mistake</span>
                      <div className="text-base font-extrabold text-white mt-1 truncate">
                        {intelligence.topMistake.name}
                      </div>
                      <div className="text-rose-400 font-mono font-bold text-sm">
                        -${intelligence.topMistake.totalLost.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {intelligence.topMistake.count} Occurrences
                      </span>
                    </div>
                  </div>

                  <div className="bg-rose-950/25 border border-rose-500/30 rounded-xl p-3 text-rose-200 text-[11px]">
                    <strong>✗ Actionable Directive (Eliminate):</strong> Eliminating{' '}
                    <strong>{intelligence.topMistake.name}</strong> and halting trading when pre-trade stress &ge; 7/10
                    immediately recovers <strong>+${intelligence.topMistake.totalLost.toFixed(2)}</strong> in net equity.
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: SESSION PERFORMANCE ANALYTICS                           */}
            {/* ============================================================== */}
            {activeTab === 'SESSIONS' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {intelligence.sessionList.map((s) => (
                  <div
                    key={s.name}
                    className="bg-[#070b16] border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-4 space-y-3 transition"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-extrabold text-white text-sm">{s.name}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px] font-bold">
                        {s.trades} Trades
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Session Net P&amp;L</span>
                        <strong
                          className={
                            'text-xl font-extrabold font-mono ' +
                            (s.net >= 0 ? 'text-emerald-400' : 'text-rose-400')
                          }
                        >
                          {s.net >= 0 ? `+$${s.net.toFixed(2)}` : `-$${Math.abs(s.net).toFixed(2)}`}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase block">Win Rate</span>
                        <strong className="text-sm font-bold text-white">{s.wr.toFixed(1)}%</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Profit Factor</span>
                        <strong className="text-cyan-300 font-mono">{s.pf.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Avg Trade</span>
                        <strong className={s.avgTrade >= 0 ? 'text-emerald-300 font-mono' : 'text-rose-300 font-mono'}>
                          {s.avgTrade >= 0 ? `+$${s.avgTrade.toFixed(1)}` : `-$${Math.abs(s.avgTrade).toFixed(1)}`}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Top Pair</span>
                        <strong className="text-amber-300 font-mono">{s.bestInstrument}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: PSYCHOLOGY & MISTAKE ANALYSIS ENGINE                    */}
            {/* ============================================================== */}
            {activeTab === 'PSYCH_MISTAKES' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Psychology Correlation Panel */}
                <div className="bg-[#070b16] border border-indigo-500/35 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-extrabold text-indigo-300 uppercase">
                      Trading Psychology &amp; Biometric Correlation
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                      Confidence vs. Stress
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-[#0b1122] border border-emerald-500/30 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        Trades With Confidence &ge; 8
                      </span>
                      <div className="text-xl font-extrabold text-emerald-400 mt-1">
                        {intelligence.highConfWinRate.toFixed(1)}% WR
                      </div>
                      <span className="text-[10px] text-slate-400">Optimal Flow State</span>
                    </div>

                    <div className="bg-[#0b1122] border border-rose-500/30 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        Trades With Stress &ge; 7
                      </span>
                      <div className="text-xl font-extrabold text-rose-400 mt-1">
                        {intelligence.highStressWinRate.toFixed(1)}% WR
                      </div>
                      <span className="text-[10px] text-slate-400">High Tilt Risk</span>
                    </div>

                    <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        Plan Compliance Rate
                      </span>
                      <div className="text-xl font-extrabold text-cyan-300 mt-1">
                        {intelligence.planComplianceRate.toFixed(1)}%
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {intelligence.consecutiveCompliant} Compliant in a row
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Click any trade in the ledger or click <strong>Review Drawer</strong> to log Pre-Trade Confidence
                    (1–10), Stress (1–10), Focus (1–10), and Post-Trade Emotions.
                  </p>
                </div>

                {/* Mistake Cost Ranking Engine */}
                <div className="bg-[#070b16] border border-rose-500/35 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-extrabold text-rose-300 uppercase">
                      Mistake Analysis Engine (Ranked by Capital Lost)
                    </h3>
                    <span className="text-[10px] text-slate-400">P&amp;L Leak Audit</span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {intelligence.mistakesRanked.map((m, idx) => (
                      <div
                        key={m.name}
                        className="flex items-center justify-between bg-[#0b1122] border border-slate-800 rounded-xl px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-white">{m.name}</span>
                            <span className="text-[10px] text-slate-400 block">
                              Frequency: {m.count} trade{m.count === 1 ? '' : 's'} • Avg Loss: $
                              {m.avgLoss.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={
                            'font-mono font-extrabold text-xs ' +
                            (m.totalLost > 0 ? 'text-rose-400' : 'text-slate-500')
                          }
                        >
                          -${m.totalLost.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: ADVANCED INSTITUTIONAL METRICS                          */}
            {/* ============================================================== */}
            {activeTab === 'INSTITUTIONAL' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-[#070b16] border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Expectancy / Trade</span>
                  <div
                    className={
                      'text-lg font-extrabold font-mono mt-1 ' +
                      (intelligence.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400')
                    }
                  >
                    {intelligence.expectancy >= 0
                      ? `+$${intelligence.expectancy.toFixed(2)}`
                      : `-$${Math.abs(intelligence.expectancy).toFixed(2)}`}
                  </div>
                  <span className="text-[10px] text-slate-500">Expected Dollar Value</span>
                </div>

                <div className="bg-[#070b16] border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Average R-Multiple</span>
                  <div className="text-lg font-extrabold font-mono text-cyan-300 mt-1">
                    {intelligence.avgR >= 0 ? `+${intelligence.avgR.toFixed(2)}R` : `${intelligence.avgR.toFixed(2)}R`}
                  </div>
                  <span className="text-[10px] text-slate-500">Risk-Reward Efficiency</span>
                </div>

                <div className="bg-[#070b16] border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Largest Drawdown</span>
                  <div className="text-lg font-extrabold font-mono text-rose-400 mt-1">
                    -${intelligence.maxDrawdownDollar.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {intelligence.maxDrawdownPct.toFixed(2)}% Peak-to-Valley
                  </span>
                </div>

                <div className="bg-[#070b16] border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Recovery Factor</span>
                  <div className="text-lg font-extrabold font-mono text-emerald-300 mt-1">
                    {intelligence.recoveryFactor.toFixed(2)}x
                  </div>
                  <span className="text-[10px] text-slate-500">Net Profit ÷ Max DD</span>
                </div>

                <div className="bg-[#070b16] border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Average Hold Time</span>
                  <div className="text-lg font-extrabold font-mono text-amber-300 mt-1">
                    {intelligence.avgHoldMins >= 60
                      ? `${Math.floor(intelligence.avgHoldMins / 60)}h ${intelligence.avgHoldMins % 60}m`
                      : `${intelligence.avgHoldMins}m`}
                  </div>
                  <span className="text-[10px] text-slate-500">Mean Trade Duration</span>
                </div>

                <div className="bg-[#070b16] border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Sharpe Efficiency</span>
                  <div className="text-lg font-extrabold font-mono text-indigo-300 mt-1">
                    {intelligence.sharpeScore.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500">Return Consistency</span>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 5: PROP FIRM CHALLENGE TRACKER                             */}
            {/* ============================================================== */}
            {activeTab === 'PROP_TRACKER' && (
              <div className="bg-[#070b16] border border-cyan-500/35 rounded-2xl p-4 space-y-4">
                {(() => {
                  const targetPct = activeContext === 'Stage 2' ? 0.05 : 0.1;
                  const targetDollar = accountSize * targetPct;
                  const targetProgress = Math.max(0, (intelligence.netPnl / (targetDollar || 1)) * 100);
                  const dailyLimit = accountSize * 0.05;
                  const maxLimit = accountSize * 0.1;
                  const minDaysGoal = 4;

                  const makeAsciiBar = (pct) => {
                    const filled = Math.max(0, Math.min(12, Math.round((Math.min(100, pct) / 100) * 12)));
                    return '█'.repeat(filled) + '░'.repeat(12 - filled);
                  };

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Profit Target</span>
                          <span className="text-[10px] font-bold text-emerald-400">
                            {targetProgress >= 100 ? '✓ PASSED' : 'IN PROGRESS'}
                          </span>
                        </div>
                        <div className="font-mono text-sm text-cyan-300 tracking-widest">
                          {makeAsciiBar(targetProgress)}
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <strong className="text-white">{targetProgress.toFixed(0)}% Complete</strong>
                          <span className="text-slate-400">
                            ${intelligence.netPnl.toFixed(0)} / ${targetDollar.toFixed(0)}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Daily Drawdown (5%)</span>
                          <span className="text-[10px] font-bold text-emerald-400">✓ PASSING</span>
                        </div>
                        <div className="font-mono text-sm text-emerald-400 tracking-widest">
                          {makeAsciiBar((intelligence.worstDailyLoss / (dailyLimit || 1)) * 100)}
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <strong className="text-white">
                            ${intelligence.worstDailyLoss.toFixed(0)} Max Used
                          </strong>
                          <span className="text-slate-400">Cap: ${dailyLimit.toFixed(0)}</span>
                        </div>
                      </div>

                      <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Max Drawdown (10%)</span>
                          <span className="text-[10px] font-bold text-emerald-400">✓ SAFE</span>
                        </div>
                        <div className="font-mono text-sm text-emerald-400 tracking-widest">
                          {makeAsciiBar((intelligence.maxDrawdownDollar / (maxLimit || 1)) * 100)}
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <strong className="text-white">
                            ${intelligence.maxDrawdownDollar.toFixed(0)} Peak DD
                          </strong>
                          <span className="text-slate-400">Cap: ${maxLimit.toFixed(0)}</span>
                        </div>
                      </div>

                      <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Min Trading Days</span>
                          <span className="text-[10px] font-bold text-emerald-400">
                            {intelligence.tradingDaysCount >= minDaysGoal ? '✓ MET' : 'ACTIVE'}
                          </span>
                        </div>
                        <div className="font-mono text-sm text-cyan-300 tracking-widest">
                          {makeAsciiBar((intelligence.tradingDaysCount / minDaysGoal) * 100)}
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <strong className="text-white">
                            {intelligence.tradingDaysCount} / {minDaysGoal} Days
                          </strong>
                          <span className="text-slate-400">Active Sessions</span>
                        </div>
                      </div>

                      <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Consistency Score</span>
                          <span className="text-[10px] font-bold text-emerald-400">
                            {intelligence.consistencyScore >= 70 ? '✓ OPTIMAL' : 'MODERATE'}
                          </span>
                        </div>
                        <div className="font-mono text-sm text-indigo-400 tracking-widest">
                          {makeAsciiBar(intelligence.consistencyScore)}
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <strong className="text-white">{intelligence.consistencyScore}% Score</strong>
                          <span className="text-slate-400">Profit Distribution</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 6: AI TRADE COACH & QUICK TRADE REVIEW LAUNCHER            */}
            {/* ============================================================== */}
            {activeTab === 'AI_COACH' && (
              <div className="bg-[#070b16] border border-cyan-500/35 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      🤖 AI Trade Coach — Automated Execution Grading &amp; Slide-Out Drawer Launcher
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Click any trade below to open the slide-out Trade Review Side Panel, log mistakes/psychology, or annotate screenshots.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                  {scopedTrades.slice(0, 12).map((t) => {
                    const ai = evaluateTradeWithAICoach(t);
                    const net = (Number(t.profit) || 0) - (Number(t.loss) || 0);
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setDrawerTradeId(t.id);
                          setDrawerTab('COACH');
                        }}
                        className="bg-[#0b1122] border border-slate-800 hover:border-cyan-400 rounded-xl p-3 cursor-pointer transition space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-extrabold text-xs">
                              Grade: {ai.grade}
                            </span>
                            <span className="font-bold text-white">{t.symbol}</span>
                            <span className="font-mono text-amber-300 text-[11px]">#{t.ticketId}</span>
                          </div>
                          <strong className={net >= 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                            {net >= 0 ? `+$${net.toFixed(2)}` : `-$${Math.abs(net).toFixed(2)}`}
                          </strong>
                        </div>
                        <div className="text-[11px] text-emerald-300 truncate">
                          ✓ {ai.strengths[0]}
                        </div>
                        {ai.weaknesses.length > 0 && (
                          <div className="text-[11px] text-rose-300 truncate">
                            ✗ {ai.weaknesses[0]}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 truncate">
                          💡 {ai.recommendation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 2. SLIDE-OUT TRADE REVIEW SIDE PANEL (DRAWER)                        */}
      {/* ==================================================================== */}
      {activeDrawerTrade && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end"
          data-rbac-ui="true"
          onClick={() => setDrawerTradeId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#070b16] border-l border-cyan-500/40 w-full max-w-xl h-full flex flex-col justify-between overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.85)]"
          >
            {/* Drawer Header */}
            {(() => {
              const t = activeDrawerTrade;
              const ai = evaluateTradeWithAICoach(t);
              const net = (Number(t.profit) || 0) - (Number(t.loss) || 0);
              const idx = scopedTrades.findIndex((x) => x.id === t.id);

              return (
                <>
                  <div className="p-4 border-b border-slate-800 bg-[#090e1f] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-extrabold text-sm">
                          AI Grade: {ai.grade}
                        </span>
                        <div>
                          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                            <span>{t.symbol}</span>
                            <span className="font-mono text-amber-300 text-xs">#{t.ticketId}</span>
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {t.stage} • Account #{t.accountNumber} • {t.execDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={idx <= 0}
                          onClick={() => idx > 0 && setDrawerTradeId(scopedTrades[idx - 1].id)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"
                          title="Previous Trade"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx < 0 || idx >= scopedTrades.length - 1}
                          onClick={() =>
                            idx >= 0 &&
                            idx < scopedTrades.length - 1 &&
                            setDrawerTradeId(scopedTrades[idx + 1].id)
                          }
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"
                          title="Next Trade"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDrawerTradeId(null)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white ml-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Drawer Sub-Navigation */}
                    <div className="flex rounded-xl bg-[#050811] p-1 border border-slate-800">
                      {[
                        { id: 'OVERVIEW', label: '📋 Details, Notes & Charts' },
                        { id: 'BEHAVIOR', label: '🧠 Mistakes, Psych & Tags' },
                        { id: 'COACH', label: '🤖 AI Trade Coach' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDrawerTab(tab.id)}
                          className={
                            'flex-1 py-1.5 rounded-lg font-bold text-[11px] transition ' +
                            (drawerTab === tab.id ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white')
                          }
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Drawer Body */}
                  <div className="p-5 overflow-y-auto space-y-4 flex-1">
                    {/* Quick Summary Strip */}
                    <div className="grid grid-cols-4 gap-2 bg-[#0b1122] border border-slate-800 rounded-xl p-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Direction / Size</span>
                        <strong className="text-white">
                          {t.side} • {t.lots ?? 1}L
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Session</span>
                        <strong className="text-cyan-300">{t.session || 'NY'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Hold Time</span>
                        <strong className="text-amber-300">{calcHoldMinutes(t)} mins</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Net P&amp;L</span>
                        <strong className={net >= 0 ? 'text-emerald-400 font-mono text-sm' : 'text-rose-400 font-mono text-sm'}>
                          {net >= 0 ? `+$${net.toFixed(2)}` : `-$${Math.abs(net).toFixed(2)}`}
                        </strong>
                      </div>
                    </div>

                    {drawerTab === 'OVERVIEW' && (
                      <>
                        {/* Screenshots & Markup Launcher */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider block">
                            Trade Evidence &amp; Interactive Chart Annotation
                          </span>
                          {(t.screenshots || []).length === 0 ? (
                            <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-4 text-center text-slate-500">
                              No screenshots attached to this trade yet.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              {(t.screenshots || []).map((shot) => (
                                <div
                                  key={shot.id}
                                  className="bg-[#0b1122] border border-slate-800 rounded-xl p-3 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-amber-300 text-[11px] truncate">
                                      {shot.type}: {shot.filename}
                                    </span>
                                    {shot.url && canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAnnoShapes(shot.annotations || []);
                                          setAnnotatingShot({ tradeId: t.id, shot });
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-1"
                                      >
                                        <PenTool className="w-3 h-3" />
                                        <span>✏️ Annotate Chart</span>
                                      </button>
                                    )}
                                  </div>
                                  {shot.url && (
                                    <img
                                      src={shot.url}
                                      alt={shot.filename}
                                      className="w-full rounded-lg border border-slate-800 max-h-60 object-contain bg-black"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pre-Trade Analysis */}
                        <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-3.5 space-y-1.5">
                          <label className="text-[11px] font-bold text-cyan-300 uppercase block">
                            1. Pre-Trade Analysis (Planning &amp; Confluence)
                          </label>
                          <textarea
                            rows={3}
                            disabled={!canEdit}
                            value={
                              typeof t.preTradeAnalysis === 'string'
                                ? t.preTradeAnalysis
                                : t.preTradeAnalysis?.tradePlan ?? t.preAnalysis ?? ''
                            }
                            onChange={(e) =>
                              updateTradeRecord(t.id, {
                                preAnalysis: e.target.value,
                                preTradeAnalysis: {
                                  ...(typeof t.preTradeAnalysis === 'object' ? t.preTradeAnalysis : {}),
                                  tradePlan: e.target.value
                                }
                              })
                            }
                            placeholder="Document setup confluence, HTF bias, liquidity target..."
                            className="w-full bg-[#050811] border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none"
                          />
                        </div>

                        {/* Post-Trade Review */}
                        <div className="bg-[#0b1122] border border-indigo-500/30 rounded-xl p-3.5 space-y-1.5">
                          <label className="text-[11px] font-bold text-indigo-300 uppercase block">
                            2. Post-Trade Review (Execution Feedback)
                          </label>
                          <textarea
                            rows={3}
                            disabled={!canEdit}
                            value={
                              typeof t.postTradeReview === 'string'
                                ? t.postTradeReview
                                : t.postTradeReview?.outcomeAnalysis ?? t.postAnalysis ?? ''
                            }
                            onChange={(e) =>
                              updateTradeRecord(t.id, {
                                postAnalysis: e.target.value,
                                postTradeReview: {
                                  ...(typeof t.postTradeReview === 'object' ? t.postTradeReview : {}),
                                  outcomeAnalysis: e.target.value
                                }
                              })
                            }
                            placeholder="Document what worked, exit timing, lessons learned..."
                            className="w-full bg-[#050811] border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none"
                          />
                        </div>
                      </>
                    )}

                    {drawerTab === 'BEHAVIOR' && (
                      <>
                        {/* Pre-Entry Psychology Sliders (1-10) */}
                        <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3.5 space-y-3">
                          <h4 className="font-bold text-indigo-300 uppercase text-[11px]">
                            Pre-Entry Biometric &amp; Mindset Levels (1–10)
                          </h4>
                          {[
                            { key: 'confidenceLevel', label: 'Confidence Level', def: 8 },
                            { key: 'stressLevel', label: 'Stress Level', def: 3 },
                            { key: 'focusLevel', label: 'Focus Level', def: 8 }
                          ].map((sl) => {
                            const val = Number(t[sl.key] ?? sl.def);
                            return (
                              <div key={sl.key} className="space-y-1">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-300 font-semibold">{sl.label}</span>
                                  <strong className="text-cyan-300 font-mono">{val} / 10</strong>
                                </div>
                                <input
                                  type="range"
                                  min={1}
                                  max={10}
                                  disabled={!canEdit}
                                  value={val}
                                  onChange={(e) =>
                                    updateTradeRecord(t.id, { [sl.key]: parseInt(e.target.value, 10) })
                                  }
                                  className="w-full accent-cyan-400 cursor-pointer"
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Mistakes Checklist */}
                        <div className="bg-[#0b1122] border border-rose-500/30 rounded-xl p-3.5 space-y-2">
                          <h4 className="font-bold text-rose-300 uppercase text-[11px]">
                            Mistakes Tracking (☑ Check Any That Occurred)
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {MISTAKE_CATALOG.map((m) => {
                              const currentMistakes = resolveTradeMistakes(t);
                              const checked = currentMistakes.includes(m);
                              return (
                                <label
                                  key={m}
                                  className={
                                    'flex items-center gap-2 p-2 rounded-lg border cursor-pointer ' +
                                    (checked
                                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-200 font-bold'
                                      : 'bg-[#050811] border-slate-800 text-slate-400')
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    disabled={!canEdit}
                                    checked={checked}
                                    onChange={() => {
                                      const next = checked
                                        ? currentMistakes.filter((x) => x !== m)
                                        : [...currentMistakes, m];
                                      updateTradeRecord(t.id, { mistakes: next });
                                    }}
                                    className="accent-rose-500"
                                  />
                                  <span>{m}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Strengths Checklist */}
                        <div className="bg-[#0b1122] border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
                          <h4 className="font-bold text-emerald-300 uppercase text-[11px]">
                            Execution Strengths (☑ Repeat Behaviors)
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {STRENGTH_CATALOG.map((st) => {
                              const currentStrengths = Array.isArray(t.strengths)
                                ? t.strengths
                                : ['Followed Risk Rules'];
                              const checked = currentStrengths.includes(st);
                              return (
                                <label
                                  key={st}
                                  className={
                                    'flex items-center gap-2 p-2 rounded-lg border cursor-pointer ' +
                                    (checked
                                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-bold'
                                      : 'bg-[#050811] border-slate-800 text-slate-400')
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    disabled={!canEdit}
                                    checked={checked}
                                    onChange={() => {
                                      const next = checked
                                        ? currentStrengths.filter((x) => x !== st)
                                        : [...currentStrengths, st];
                                      updateTradeRecord(t.id, { strengths: next });
                                    }}
                                    className="accent-emerald-500"
                                  />
                                  <span>{st}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Setup & Strategy Tags */}
                        <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                          <h4 className="font-bold text-cyan-300 uppercase text-[11px]">
                            Trade Setup &amp; Session Tags
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {DEFAULT_TAGS.map((tag) => {
                              const activeTags = Array.isArray(t.setupTags)
                                ? t.setupTags
                                : [`#${(t.session || 'NY').replace(/\s+/g, '')}`, '#SMC'];
                              const selected = activeTags.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  disabled={!canEdit}
                                  onClick={() => {
                                    const next = selected
                                      ? activeTags.filter((x) => x !== tag)
                                      : [...activeTags, tag];
                                    updateTradeRecord(t.id, { setupTags: next });
                                  }}
                                  className={
                                    'px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition ' +
                                    (selected
                                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                                      : 'bg-[#050811] border-slate-800 text-slate-400')
                                  }
                                >
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {drawerTab === 'COACH' && (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-cyan-950/40 to-emerald-950/30 border border-cyan-500/40 rounded-2xl p-4 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-cyan-300">
                              OVERALL EXECUTION GRADE
                            </span>
                            <div className="text-3xl font-extrabold text-white mt-0.5">
                              {ai.grade}{' '}
                              <span className="text-sm font-normal text-slate-300">({ai.score}/100)</span>
                            </div>
                          </div>
                          <div className="text-right space-y-1 text-[11px]">
                            <div>
                              <span className="text-slate-400">Entry: </span>
                              <strong className="text-white">{ai.entryQuality}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Risk: </span>
                              <strong className="text-emerald-300">{ai.riskManagement}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Discipline: </span>
                              <strong className="text-cyan-300">{ai.discipline}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#0b1122] border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5">
                          <h4 className="font-bold text-emerald-300 uppercase text-[11px]">Strengths Identified</h4>
                          {ai.strengths.map((s, i) => (
                            <div key={i} className="text-emerald-200">
                              ✓ {s}
                            </div>
                          ))}
                        </div>

                        <div className="bg-[#0b1122] border border-rose-500/30 rounded-xl p-3.5 space-y-1.5">
                          <h4 className="font-bold text-rose-300 uppercase text-[11px]">Weaknesses / Leaks</h4>
                          {ai.weaknesses.length === 0 ? (
                            <div className="text-slate-400">No execution weaknesses detected on this trade.</div>
                          ) : (
                            ai.weaknesses.map((w, i) => (
                              <div key={i} className="text-rose-200">
                                ✗ {w}
                              </div>
                            ))
                          )}
                        </div>

                        <div className="bg-[#0b1122] border border-amber-500/30 rounded-xl p-3.5 space-y-2">
                          <h4 className="font-bold text-amber-300 uppercase text-[11px]">
                            AI Coach Recommendation &amp; Next Trade Checklist
                          </h4>
                          <p className="text-slate-200">{ai.recommendation}</p>
                          <div className="pt-2 border-t border-slate-800 space-y-1">
                            {ai.checklist.map((item, i) => (
                              <div key={i} className="text-slate-300 text-[11px]">
                                ☐ {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Drawer Footer */}
                  <div className="p-4 border-t border-slate-800 bg-[#090e1f] flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Auto-synced with Supabase Cloud
                    </span>
                    <button
                      type="button"
                      onClick={() => setDrawerTradeId(null)}
                      className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-extrabold"
                    >
                      Done
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. SCREENSHOT ANNOTATION STUDIO MODAL (LINES, BOXES, ARROWS, TEXT)   */}
      {/* ==================================================================== */}
      {annotatingShot && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          data-rbac-ui="true"
        >
          <div className="bg-[#090d1a] border border-cyan-500/50 rounded-3xl max-w-5xl w-full p-5 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  ✏️ TradingView-Style Chart Screenshot Markup Studio
                </h3>
                <p className="text-[11px] text-slate-400">
                  Click and drag on the chart to draw trendlines, supply/demand zones, execution arrows, or click to add text notes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'LINE', label: '╱ Trendline' },
                  { id: 'RECT', label: '▭ Zone Box' },
                  { id: 'ARROW', label: '↗ Arrow' },
                  { id: 'TEXT', label: 'T Text Callout' }
                ].map((tl) => (
                  <button
                    key={tl.id}
                    type="button"
                    onClick={() => setAnnoTool(tl.id)}
                    className={
                      'px-3 py-1.5 rounded-xl font-bold border transition ' +
                      (annoTool === tl.id
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-[#070b16] text-slate-300 border-slate-700')
                    }
                  >
                    {tl.label}
                  </button>
                ))}

                {/* Color Palette */}
                <div className="flex items-center gap-1 px-2 border-l border-slate-800">
                  {['#06b6d4', '#10b981', '#f43f5e', '#f59e0b', '#ffffff'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAnnoColor(c)}
                      style={{ backgroundColor: c }}
                      className={
                        'w-5 h-5 rounded-full border-2 ' +
                        (annoColor === c ? 'border-white scale-110' : 'border-transparent opacity-70')
                      }
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = annoShapes.slice(0, -1);
                    setAnnoShapes(next);
                    redrawCanvas(baseImgRef.current, next);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnnoShapes([]);
                    redrawCanvas(baseImgRef.current, []);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 font-bold"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="bg-black rounded-2xl overflow-hidden border border-slate-800 max-h-[65dvh] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseUp={handleCanvasMouseUp}
                className="max-w-full max-h-[62dvh] object-contain cursor-crosshair"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAnnotatingShot(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAnnotatedScreenshot}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-extrabold"
              >
                💾 Save Annotated Screenshot to Cloud
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  return createPortal(dashboardUI, portalContainer);
}
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FlaskConical,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Layers,
  Settings,
  Trash2,
  X,
  Sparkles,
  Play
} from 'lucide-react';

const DEMO_STORAGE_KEY = 'crowevar_demo_accounts_v1';

const DEFAULT_DEMO_STATE = {
  activeAccount: '9001001',
  includeInUnified: false,
  accounts: [
    {
      accountNumber: '9001001',
      firm: 'DemoLab',
      size: '$10K',
      startingBalance: 10000,
      platform: 'MT5',
      label: 'Primary Strategy Sandbox',
      createdAt: '2026-10-30'
    }
  ]
};

export function DemoAccountSuite() {
  const [bridge, setBridge] = useState(() => window.__TRADEATLAS_STATE__ || null);
  const [demoStore, setDemoStore] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || 'null');
      if (saved && Array.isArray(saved.accounts) && saved.accounts.length > 0) {
        return saved;
      }
    } catch (e) {}
    return DEFAULT_DEMO_STATE;
  });

  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [quickLogModalOpen, setQuickLogModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // New Demo Account Form
  const [newAcctForm, setNewAcctForm] = useState({
    accountNumber: '',
    firm: 'FTMO Trial',
    size: '$10K',
    startingBalance: 10000,
    platform: 'MT5',
    label: 'Forward Test'
  });

  // Quick Demo Trade Form
  const [quickTrade, setQuickTrade] = useState({
    symbol: 'XAUUSD',
    side: 'Buy',
    lots: '1.00',
    session: 'London/NY Overlap',
    status: 'W',
    profit: '',
    loss: '',
    preAnalysis: '',
    postAnalysis: ''
  });

  // DOM Portal Mounts
  const [matrixGridEl, setMatrixGridEl] = useState(null);
  const [sandboxSlotEl, setSandboxSlotEl] = useState(null);

  // Persist Demo Store & Expose Globally
  useEffect(() => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoStore));
    } catch (e) {}
    window.__CROWEVAR_DEMO_STORE__ = demoStore;
    window.dispatchEvent(new CustomEvent('crowevar-demo-change', { detail: demoStore }));
  }, [demoStore]);

  // Listen to App.jsx state bridge & locate Challenge Lifecycle Matrix grid
  useEffect(() => {
    const syncHandler = (e) => {
      setBridge({ ...(e.detail || window.__TRADEATLAS_STATE__ || {}) });
    };
    window.addEventListener('tradeatlas-state-sync', syncHandler);

    const poll = setInterval(() => {
      if (window.__TRADEATLAS_STATE__) {
        setBridge((prev) => {
          const next = window.__TRADEATLAS_STATE__;
          if (
            !prev ||
            prev.trades !== next.trades ||
            prev.activeContext !== next.activeContext ||
            prev.profiles !== next.profiles
          ) {
            return { ...next };
          }
          return prev;
        });
      }

      // 1. Find the Challenge Lifecycle Matrix grid (contains Unified View, Stage 1, Stage 2, Funded Account)
      let foundMatrixCardSlot = document.getElementById('tradeatlas-demo-card-slot');
      if (!foundMatrixCardSlot) {
        const allTextNodes = Array.from(document.querySelectorAll('h3, h4, span, div'));
        const fundedEl = allTextNodes.find(
          (el) =>
            el.childNodes.length === 1 &&
            (el.textContent || '').trim() === 'Funded Account' &&
            !el.closest('.fixed') &&
            !el.closest('[data-rbac-ui="true"]')
        );
        if (fundedEl) {
          let card = fundedEl;
          while (card && card.parentElement) {
            const pCls = String(card.parentElement.className || '');
            if (pCls.includes('grid')) {
              const gridContainer = card.parentElement;
              foundMatrixCardSlot = document.createElement('div');
              foundMatrixCardSlot.id = 'tradeatlas-demo-card-slot';
              foundMatrixCardSlot.className = 'contents';
              gridContainer.appendChild(foundMatrixCardSlot);
              break;
            }
            card = card.parentElement;
          }
        }
      }
      if (foundMatrixCardSlot !== matrixGridEl) {
        setMatrixGridEl(foundMatrixCardSlot || null);
      }

      // 2. Find or create the Demo Sandbox Banner slot right below the Challenge Lifecycle Matrix section
      let foundSandboxSlot = document.getElementById('tradeatlas-demo-sandbox-slot');
      if (!foundSandboxSlot && foundMatrixCardSlot && foundMatrixCardSlot.parentElement) {
        const matrixSection =
          foundMatrixCardSlot.closest('section') || foundMatrixCardSlot.parentElement.parentElement;
        if (matrixSection && matrixSection.parentNode) {
          foundSandboxSlot = document.createElement('div');
          foundSandboxSlot.id = 'tradeatlas-demo-sandbox-slot';
          matrixSection.parentNode.insertBefore(foundSandboxSlot, matrixSection.nextSibling);
        }
      }
      if (foundSandboxSlot !== sandboxSlotEl) {
        setSandboxSlotEl(foundSandboxSlot || null);
      }
    }, 450);

    return () => {
      window.removeEventListener('tradeatlas-state-sync', syncHandler);
      clearInterval(poll);
    };
  }, [matrixGridEl, sandboxSlotEl]);

  const rawTrades = bridge?.trades || [];
  const activeContext = bridge?.activeContext || 'Unified View';
  const isDemoActive = activeContext === 'Demo Account';
  const canWrite = Boolean(!window.__CROWEVAR_RBAC__ || window.__CROWEVAR_RBAC__.canWriteData);

  const activeDemoAcctObj = useMemo(() => {
    if (demoStore.activeAccount === 'ALL') {
      const totalBal = demoStore.accounts.reduce(
        (s, a) => s + (Number(a.startingBalance) || 10000),
        0
      );
      return {
        accountNumber: 'ALL',
        firm: 'All Demo',
        size: `$${Math.round(totalBal / 1000)}K`,
        startingBalance: totalBal,
        platform: 'Multi'
      };
    }
    return (
      demoStore.accounts.find((a) => String(a.accountNumber) === String(demoStore.activeAccount)) ||
      demoStore.accounts[0] ||
      DEFAULT_DEMO_STATE.accounts[0]
    );
  }, [demoStore]);

  // Filter Demo Trades
  const demoTrades = useMemo(() => {
    const allDemo = (rawTrades || []).filter((t) => !t.deleted && t.stage === 'Demo Account');
    if (demoStore.activeAccount === 'ALL') return allDemo;
    return allDemo.filter((t) => String(t.accountNumber) === String(activeDemoAcctObj.accountNumber));
  }, [rawTrades, demoStore.activeAccount, activeDemoAcctObj]);

  const demoStats = useMemo(() => {
    const closed = demoTrades.filter((t) => t.status === 'W' || t.status === 'L');
    const wins = closed.filter((t) => t.status === 'W');
    const gp = closed.reduce((s, t) => s + (Number(t.profit) || 0), 0);
    const gl = closed.reduce((s, t) => s + (Number(t.loss) || 0), 0);
    const net = gp - gl;
    const wr = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
    const pf = gl > 0 ? gp / gl : gp > 0 ? 9.99 : 0;
    const startBal = Number(activeDemoAcctObj.startingBalance) || 10000;
    const equity = startBal + net;
    const returnPct = (net / startBal) * 100;

    // Readiness checks for graduating strategy to Stage 1 / Live
    const minTradesMet = closed.length >= 5;
    const wrMet = wr >= 50;
    const pfMet = pf >= 1.4;
    const profitableMet = net > 0;
    const readinessChecks = [minTradesMet, wrMet, pfMet, profitableMet].filter(Boolean).length;
    const readinessPct = Math.round((readinessChecks / 4) * 100);

    return {
      totalCount: demoTrades.length,
      closedCount: closed.length,
      winsCount: wins.length,
      lossesCount: closed.length - wins.length,
      gp,
      gl,
      net,
      wr,
      pf,
      startBal,
      equity,
      returnPct,
      readinessPct,
      minTradesMet,
      wrMet,
      pfMet,
      profitableMet
    };
  }, [demoTrades, activeDemoAcctObj]);

  // Switch active context to Demo Account & sync profile metadata so App.jsx KPIs reflect the Demo Account's Starting Balance & Firm
  const handleSelectDemoStage = (acctOverride = null) => {
    const targetAcct = acctOverride || demoStore.activeAccount || activeDemoAcctObj.accountNumber;
    if (acctOverride && acctOverride !== demoStore.activeAccount) {
      setDemoStore((prev) => ({ ...prev, activeAccount: acctOverride }));
    }

    const chosenObj =
      targetAcct === 'ALL'
        ? activeDemoAcctObj
        : demoStore.accounts.find((a) => String(a.accountNumber) === String(targetAcct)) ||
          activeDemoAcctObj;

    if (bridge?.setProfiles) {
      bridge.setProfiles((prev) =>
        (prev || []).map((p, idx) => {
          if (idx !== 0) return p;
          return {
            ...p,
            accounts: {
              ...(p.accounts || {}),
              demo: {
                accountNumbers: demoStore.accounts.map((a) => String(a.accountNumber)),
                activeAccount: String(targetAcct)
              }
            },
            accountMeta: {
              ...(p.accountMeta || {}),
              [String(chosenObj.accountNumber)]: {
                firm: chosenObj.firm || 'DemoLab',
                size: chosenObj.size || '$10K',
                startingBalance: Number(chosenObj.startingBalance) || 10000,
                platform: chosenObj.platform || 'MT5',
                status: 'Demo'
              }
            }
          };
        })
      );
    }

    if (bridge?.setActiveContext) {
      bridge.setActiveContext('Demo Account');
    }
  };

  // Add New Demo Account
  const handleAddDemoAccount = (e) => {
    e.preventDefault();
    if (!canWrite) return;
    const cleanNum = String(newAcctForm.accountNumber || '').trim();
    if (!cleanNum) return;
    if (demoStore.accounts.some((a) => String(a.accountNumber) === cleanNum)) {
      window.alert(`Demo Account #${cleanNum} already exists.`);
      return;
    }

    const startBal = Number(newAcctForm.startingBalance) || 10000;
    const sizeLabel =
      startBal >= 1000 ? `$${Math.round(startBal / 1000)}K` : `$${startBal}`;

    const created = {
      accountNumber: cleanNum,
      firm: newAcctForm.firm || 'DemoLab',
      size: sizeLabel,
      startingBalance: startBal,
      platform: newAcctForm.platform || 'MT5',
      label: newAcctForm.label || 'Practice Account',
      createdAt: new Date().toISOString().slice(0, 10)
    };

    const nextStore = {
      ...demoStore,
      activeAccount: cleanNum,
      accounts: [...demoStore.accounts, created]
    };
    setDemoStore(nextStore);
    setNewAcctForm({
      accountNumber: '',
      firm: 'FTMO Trial',
      size: '$10K',
      startingBalance: 10000,
      platform: 'MT5',
      label: 'Forward Test'
    });
    setTimeout(() => handleSelectDemoStage(cleanNum), 50);
  };

  // Remove a Secondary Demo Account
  const handleRemoveDemoAccount = (acctNum) => {
    if (!canWrite || demoStore.accounts.length <= 1) return;
    const remaining = demoStore.accounts.filter(
      (a) => String(a.accountNumber) !== String(acctNum)
    );
    const nextActive =
      String(demoStore.activeAccount) === String(acctNum)
        ? remaining[0].accountNumber
        : demoStore.activeAccount;
    setDemoStore({
      ...demoStore,
      activeAccount: nextActive,
      accounts: remaining
    });
  };

  // Quick Log a Demo Trade directly into App.jsx trades state
  const handleQuickLogDemoTrade = (e) => {
    e.preventDefault();
    if (!canWrite || !bridge?.setTrades) return;

    const todayIso = new Date().toISOString().slice(0, 10);
    const targetAcctNum =
      demoStore.activeAccount === 'ALL'
        ? demoStore.accounts[0]?.accountNumber || '9001001'
        : demoStore.activeAccount;

    const profVal = quickTrade.status === 'W' ? Math.abs(Number(quickTrade.profit) || 0) : 0;
    const lossVal = quickTrade.status === 'L' ? Math.abs(Number(quickTrade.loss) || 0) : 0;

    const newRecord = {
      id: `trd-demo-${Date.now()}`,
      ticketId: `DMO-${Math.floor(100000 + Math.random() * 900000)}`,
      stage: 'Demo Account',
      accountNumber: String(targetAcctNum),
      symbol: String(quickTrade.symbol || 'XAUUSD').toUpperCase().trim(),
      category: 'Metals',
      session: quickTrade.session || 'London/NY Overlap',
      side: quickTrade.side || 'Buy',
      lots: Number(quickTrade.lots) || 1,
      execDate: todayIso,
      closeDate: quickTrade.status === 'O' ? 'Pending' : todayIso,
      status: quickTrade.status || 'W',
      profit: profVal,
      loss: lossVal,
      riskPct: 1.0,
      rMultiple:
        profVal > 0
          ? Number((profVal / (demoStats.startBal * 0.01)).toFixed(2))
          : lossVal > 0
          ? Number((-lossVal / (demoStats.startBal * 0.01)).toFixed(2))
          : 0,
      preAnalysis: quickTrade.preAnalysis || 'Demo forward-test execution.',
      postAnalysis: quickTrade.postAnalysis || 'Logged in Demo Strategy Sandbox.',
      preTradeAnalysis: { tradePlan: quickTrade.preAnalysis || 'Demo forward-test execution.' },
      postTradeReview: { outcomeAnalysis: quickTrade.postAnalysis || 'Logged in Demo Strategy Sandbox.' },
      screenshots: [],
      source: 'Demo Sandbox'
    };

    bridge.setTrades((prev) => [newRecord, ...(prev || [])]);
    setQuickTrade({
      symbol: 'XAUUSD',
      side: 'Buy',
      lots: '1.00',
      session: 'London/NY Overlap',
      status: 'W',
      profit: '',
      loss: '',
      preAnalysis: '',
      postAnalysis: ''
    });
    setQuickLogModalOpen(false);
    handleSelectDemoStage(targetAcctNum);
  };

  // Reset Demo Account Trades (Moves current Demo account trades to Trash or clears them)
  const handleConfirmResetDemo = () => {
    if (!canWrite || !bridge?.setTrades) return;
    if (resetConfirmText.trim().toUpperCase() !== 'RESET') return;

    const targetAcct = demoStore.activeAccount;
    bridge.setTrades((prev) =>
      (prev || []).filter((t) => {
        if (t.stage !== 'Demo Account') return true;
        if (targetAcct === 'ALL') return false;
        return String(t.accountNumber) !== String(targetAcct);
      })
    );
    setResetConfirmText('');
    setResetConfirmOpen(false);
  };

  // 1. THE STAGE CARD (Injected into the Challenge Lifecycle Matrix Grid)
  const demoStageCardJSX = (
    <div
      onClick={() => handleSelectDemoStage()}
      className={
        'rounded-2xl p-4 border transition cursor-pointer flex flex-col justify-between ' +
        (isDemoActive
          ? 'bg-gradient-to-br from-[#13112c] via-[#0d152c] to-[#080d1a] border-violet-400 shadow-[0_0_28px_rgba(167,139,250,0.3)]'
          : 'bg-[#090d1a] border-slate-800/90 hover:border-violet-500/50')
      }
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <FlaskConical
              className={'w-3.5 h-3.5 ' + (isDemoActive ? 'text-violet-300' : 'text-violet-400/80')}
            />
            <h3 className="font-extrabold text-white text-xs sm:text-sm">Demo Account</h3>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
            {demoStore.accounts.length} {demoStore.accounts.length === 1 ? 'Acct' : 'Accts'}
          </span>
        </div>

        {/* Account Selector Dropdown inside Card */}
        <div onClick={(e) => e.stopPropagation()} className="space-y-1.5">
          <select
            value={demoStore.activeAccount}
            onChange={(e) => handleSelectDemoStage(e.target.value)}
            className="w-full bg-[#050811] border border-slate-800 hover:border-violet-500/40 rounded-xl px-2.5 py-1.5 text-[11px] font-mono font-bold text-amber-300 focus:outline-none cursor-pointer"
          >
            {demoStore.accounts.map((a) => (
              <option key={a.accountNumber} value={a.accountNumber}>
                Acct: #{a.accountNumber} ({a.platform})
              </option>
            ))}
            {demoStore.accounts.length > 1 && (
              <option value="ALL">All ({demoStore.accounts.length}) Demo Accts</option>
            )}
          </select>

          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            <span className="px-1.5 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-500/30 font-semibold">
              {activeDemoAcctObj.firm}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 font-mono">
              ${Number(activeDemoAcctObj.startingBalance || 10000).toLocaleString()}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 font-mono">
              {activeDemoAcctObj.platform}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 mt-2 border-t border-slate-800/80">
        <div
          className={
            'text-sm sm:text-base font-extrabold font-mono ' +
            (demoStats.net >= 0 ? 'text-emerald-400' : 'text-rose-400')
          }
        >
          {demoStats.net >= 0
            ? `+$${demoStats.net.toFixed(2)}`
            : `-$${Math.abs(demoStats.net).toFixed(2)}`}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
          <span className="font-mono truncate">
            {demoStore.activeAccount === 'ALL'
              ? 'All Demo'
              : `Acct #${activeDemoAcctObj.accountNumber}`}
          </span>
          <strong className="text-slate-200">{demoStats.totalCount} trades</strong>
        </div>
      </div>
    </div>
  );

  // 2. THE DEMO ACCOUNT COMMAND & STRATEGY SANDBOX PANEL
  const demoCommandPanelJSX = (
    <div
      data-rbac-ui="true"
      className={
        'my-4 rounded-2xl border transition-all duration-300 p-4 text-xs ' +
        (isDemoActive
          ? 'bg-gradient-to-r from-[#100d24] via-[#0b1329] to-[#090d1a] border-violet-500/50 shadow-[0_0_35px_rgba(139,92,246,0.18)]'
          : 'bg-[#090d1a]/90 border-slate-800/90')
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Title & Active Demo Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-violet-500/15 border border-violet-500/40 text-violet-300">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-white tracking-wide">
                DEMO ACCOUNT &amp; FORWARD-TESTING SANDBOX
              </h3>
              <span
                className={
                  'px-2 py-0.5 rounded-full text-[10px] font-extrabold border ' +
                  (isDemoActive
                    ? 'bg-violet-500 text-slate-950 border-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.6)]'
                    : 'bg-slate-800 text-slate-400 border-slate-700')
                }
              >
                {isDemoActive ? '● ACTIVE VIEW' : 'STANDBY'}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                🛡️ Isolated from Real Prop/Live Capital
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Test new setups, forward-test 5M Killzone entries, and validate strategy expectancy with zero capital risk.
            </p>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isDemoActive ? (
            <button
              type="button"
              onClick={() => handleSelectDemoStage()}
              className="px-3.5 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/50 text-violet-200 font-extrabold transition flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Switch to Demo Account (#{activeDemoAcctObj.accountNumber})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => bridge?.setActiveContext && bridge.setActiveContext('Unified View')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition"
            >
              ← Exit Demo View
            </button>
          )}

          {canWrite && (
            <>
              <button
                type="button"
                onClick={() => setQuickLogModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-slate-950 font-extrabold transition flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Log Demo Trade</span>
              </button>

              <button
                type="button"
                onClick={() => setManageModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#070b16] hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold transition flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5 text-violet-400" />
                <span>Manage Demo Accts ({demoStore.accounts.length})</span>
              </button>

              {demoStats.totalCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setResetConfirmText('');
                    setResetConfirmOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold transition flex items-center gap-1"
                  title="Reset Demo Account Balance & Clear Practice Trades"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Expanded Telemetry Strip when Demo Account is Selected */}
      {isDemoActive && (
        <div className="mt-4 pt-3.5 border-t border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-[#070b16] border border-violet-500/30 rounded-xl p-3">
            <span className="text-[10px] text-violet-300 font-bold uppercase block">
              Demo Simulated Equity
            </span>
            <strong className="text-lg font-extrabold text-white font-mono">
              ${demoStats.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
            <span className="text-[10px] text-slate-400 block">
              Start: ${demoStats.startBal.toLocaleString()} ({demoStats.returnPct >= 0 ? '+' : ''}
              {demoStats.returnPct.toFixed(2)}%)
            </span>
          </div>

          <div className="bg-[#070b16] border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Demo Net P&amp;L
            </span>
            <strong
              className={
                'text-lg font-extrabold font-mono ' +
                (demoStats.net >= 0 ? 'text-emerald-400' : 'text-rose-400')
              }
            >
              {demoStats.net >= 0
                ? `+$${demoStats.net.toFixed(2)}`
                : `-$${Math.abs(demoStats.net).toFixed(2)}`}
            </strong>
            <span className="text-[10px] text-slate-400 block">
              GP: +${demoStats.gp.toFixed(2)} • GL: -${demoStats.gl.toFixed(2)}
            </span>
          </div>

          <div className="bg-[#070b16] border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              Demo Win Rate &amp; PF
            </span>
            <strong className="text-lg font-extrabold text-white font-mono">
              {demoStats.wr.toFixed(1)}% <span className="text-xs text-cyan-300">• PF {demoStats.pf.toFixed(2)}</span>
            </strong>
            <span className="text-[10px] text-slate-400 block">
              {demoStats.winsCount}W / {demoStats.lossesCount}L ({demoStats.closedCount} Closed)
            </span>
          </div>

          <div className="bg-[#070b16] border border-slate-800 rounded-xl p-3 sm:col-span-2 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-300 font-bold uppercase">
                  Prop Challenge Readiness Score
                </span>
                <span
                  className={
                    'px-2 py-0.5 rounded text-[10px] font-extrabold ' +
                    (demoStats.readinessPct >= 75
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40')
                  }
                >
                  {demoStats.readinessPct}% Ready
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className={demoStats.minTradesMet ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {demoStats.minTradesMet ? '✓' : '○'} 5+ Trades
                </span>
                <span className={demoStats.wrMet ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {demoStats.wrMet ? '✓' : '○'} WR &ge; 50%
                </span>
                <span className={demoStats.pfMet ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {demoStats.pfMet ? '✓' : '○'} PF &ge; 1.40
                </span>
                <span className={demoStats.profitableMet ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {demoStats.profitableMet ? '✓' : '○'} Net Positive
                </span>
              </div>
            </div>

            <label className="flex items-center gap-1.5 bg-[#0b1122] border border-slate-800 rounded-xl px-2.5 py-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={Boolean(demoStore.includeInUnified)}
                onChange={(e) =>
                  setDemoStore((prev) => ({ ...prev, includeInUnified: e.target.checked }))
                }
                className="accent-violet-500"
              />
              <span className="text-[10px] text-slate-300 font-semibold">
                Include in Unified View
              </span>
            </label>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 1: MANAGE DEMO ACCOUNTS                                      */}
      {/* ================================================================== */}
      {manageModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setManageModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#090d1a] border border-violet-500/50 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-[0_0_50px_rgba(139,92,246,0.25)]"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/40 text-violet-300">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Demo Account Manager (Practice &amp; Free Trial Accounts)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Add MT5, MT4, cTrader, or TradingView Paper accounts with custom starting balances.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManageModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Demo Account Form */}
            <form
              onSubmit={handleAddDemoAccount}
              className="bg-[#070b16] border border-slate-800 rounded-2xl p-4 space-y-3"
            >
              <div className="text-xs font-bold text-violet-300">
                + Add New Demo / Trial Account
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Account # (e.g. 9002045)"
                  value={newAcctForm.accountNumber}
                  onChange={(e) =>
                    setNewAcctForm({ ...newAcctForm, accountNumber: e.target.value })
                  }
                  className="bg-[#0b1122] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
                <select
                  value={newAcctForm.firm}
                  onChange={(e) => setNewAcctForm({ ...newAcctForm, firm: e.target.value })}
                  className="bg-[#0b1122] border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="DemoLab">DemoLab Sandbox</option>
                  <option value="FTMO Trial">FTMO Free Trial</option>
                  <option value="EquityEdge Demo">EquityEdge Demo</option>
                  <option value="Topstep Practice">Topstep Practice</option>
                  <option value="Paper Trading">TradingView Paper</option>
                </select>
                <select
                  value={newAcctForm.startingBalance}
                  onChange={(e) =>
                    setNewAcctForm({
                      ...newAcctForm,
                      startingBalance: Number(e.target.value)
                    })
                  }
                  className="bg-[#0b1122] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                >
                  <option value={5000}>$5,000 ($5K)</option>
                  <option value={10000}>$10,000 ($10K)</option>
                  <option value={25000}>$25,000 ($25K)</option>
                  <option value={50000}>$50,000 ($50K)</option>
                  <option value={100000}>$100,000 ($100K)</option>
                  <option value={200000}>$200,000 ($200K)</option>
                </select>
                <div className="flex gap-2">
                  <select
                    value={newAcctForm.platform}
                    onChange={(e) =>
                      setNewAcctForm({ ...newAcctForm, platform: e.target.value })
                    }
                    className="bg-[#0b1122] border border-slate-700 rounded-xl px-2.5 py-2 text-white flex-1"
                  >
                    <option value="MT5">MT5</option>
                    <option value="cTrader">cTrader</option>
                    <option value="MT4">MT4</option>
                    <option value="TV Paper">TV Paper</option>
                    <option value="DXTrade">DXTrade</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-slate-950 font-extrabold shrink-0"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </form>

            {/* Existing Demo Accounts List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {demoStore.accounts.map((a) => {
                const isSelected = String(demoStore.activeAccount) === String(a.accountNumber);
                const acctTrades = (rawTrades || []).filter(
                  (t) =>
                    !t.deleted &&
                    t.stage === 'Demo Account' &&
                    String(t.accountNumber) === String(a.accountNumber)
                );
                return (
                  <div
                    key={a.accountNumber}
                    className={
                      'flex flex-wrap items-center justify-between gap-2 bg-[#070b16] border rounded-2xl p-3.5 ' +
                      (isSelected ? 'border-violet-400 bg-violet-950/20' : 'border-slate-800')
                    }
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-amber-300 text-sm">
                          #{a.accountNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold text-[10px]">
                          {a.firm}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          ${Number(a.startingBalance || 10000).toLocaleString()}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono text-[10px]">
                          {a.platform}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Logged Demo Trades: <strong>{acctTrades.length}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectDemoStage(a.accountNumber);
                          setManageModalOpen(false);
                        }}
                        className={
                          'px-3 py-1.5 rounded-xl font-bold transition ' +
                          (isSelected
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-white')
                        }
                      >
                        {isSelected ? '✓ Active' : 'Select'}
                      </button>
                      {demoStore.accounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDemoAccount(a.accountNumber)}
                          className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-400"
                          title="Remove Demo Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setManageModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-violet-500 text-slate-950 font-extrabold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 2: QUICK LOG DEMO TRADE                                      */}
      {/* ================================================================== */}
      {quickLogModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setQuickLogModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#090d1a] border border-violet-500/50 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-[0_0_50px_rgba(139,92,246,0.25)]"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  🧪 Log Demo Account Execution (#{activeDemoAcctObj.accountNumber})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Logs directly under Demo Account ({activeDemoAcctObj.firm} • {activeDemoAcctObj.platform})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickLogModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickLogDemoTrade} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'W', label: '✓ Won (Profit)', cls: 'border-emerald-500 bg-emerald-500/20 text-emerald-300' },
                  { id: 'L', label: '✕ Lost (Stop)', cls: 'border-rose-500 bg-rose-500/20 text-rose-300' },
                  { id: 'O', label: '◉ Open Trade', cls: 'border-cyan-500 bg-cyan-500/20 text-cyan-300' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setQuickTrade({ ...quickTrade, status: st.id })}
                    className={
                      'py-2 rounded-xl font-bold border transition ' +
                      (quickTrade.status === st.id
                        ? st.cls
                        : 'border-slate-800 bg-[#070b16] text-slate-400')
                    }
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Symbol
                  </label>
                  <input
                    type="text"
                    required
                    value={quickTrade.symbol}
                    onChange={(e) => setQuickTrade({ ...quickTrade, symbol: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-3 py-2 text-white font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Direction
                  </label>
                  <select
                    value={quickTrade.side}
                    onChange={(e) => setQuickTrade({ ...quickTrade, side: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="Buy">Buy (Long)</option>
                    <option value="Sell">Sell (Short)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Lot Size
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickTrade.lots}
                    onChange={(e) => setQuickTrade({ ...quickTrade, lots: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    {quickTrade.status === 'L' ? 'Loss ($)' : 'Profit ($)'}
                  </label>
                  {quickTrade.status === 'L' ? (
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 50.00"
                      value={quickTrade.loss}
                      onChange={(e) => setQuickTrade({ ...quickTrade, loss: e.target.value })}
                      className="w-full bg-[#070b16] border border-rose-500/50 rounded-xl px-3 py-2 text-rose-300 font-mono"
                    />
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      required={quickTrade.status === 'W'}
                      placeholder="e.g. 150.00"
                      value={quickTrade.profit}
                      onChange={(e) => setQuickTrade({ ...quickTrade, profit: e.target.value })}
                      className="w-full bg-[#070b16] border border-emerald-500/50 rounded-xl px-3 py-2 text-emerald-300 font-mono"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Pre-Trade Setup &amp; Hypothesis
                </label>
                <textarea
                  rows={2}
                  value={quickTrade.preAnalysis}
                  onChange={(e) => setQuickTrade({ ...quickTrade, preAnalysis: e.target.value })}
                  placeholder="5M Killzone setup, liquidity sweep, confluence..."
                  className="w-full bg-[#070b16] border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Post-Trade Review Notes
                </label>
                <textarea
                  rows={2}
                  value={quickTrade.postAnalysis}
                  onChange={(e) => setQuickTrade({ ...quickTrade, postAnalysis: e.target.value })}
                  placeholder="Execution feedback & lessons learned..."
                  className="w-full bg-[#070b16] border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-slate-950 font-extrabold"
                >
                  Save Demo Trade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 3: TWO-STEP DEMO RESET CONFIRMATION                          */}
      {/* ================================================================== */}
      {resetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setResetConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#090d1a] border-2 border-rose-500/70 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-[0_0_40px_rgba(244,63,94,0.3)]"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Reset Demo Account #{activeDemoAcctObj.accountNumber}?
                </h3>
                <p className="text-[11px] text-slate-300 mt-1">
                  This will clear the <strong>{demoStats.totalCount} practice trades</strong> under Demo Account #{activeDemoAcctObj.accountNumber} and reset its simulated equity back to{' '}
                  <strong>${demoStats.startBal.toLocaleString()}</strong>. Your Stage 1, Stage 2, Funded, and Live accounts are never touched.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                Type <strong className="text-rose-400 font-mono">RESET</strong> to confirm:
              </label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Type RESET..."
                className="w-full bg-[#070b16] border border-rose-500/40 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetConfirmText.trim().toUpperCase() !== 'RESET'}
                onClick={handleConfirmResetDemo}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-extrabold"
              >
                Confirm Reset Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {matrixGridEl ? createPortal(demoStageCardJSX, matrixGridEl) : null}
      {sandboxSlotEl ? createPortal(demoCommandPanelJSX, sandboxSlotEl) : null}
    </>
  );
}
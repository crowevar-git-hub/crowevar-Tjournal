import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers, Wallet, TrendingUp, Award, Calculator, Briefcase,
  Target, Trash2, Calendar as CalendarIcon, BarChart3, LineChart as LineChartIcon,
  ChevronLeft, ChevronRight, Plus, Download, Eye, X, Lock, Sparkles, Edit3,
  RotateCcw, Image as ImageIcon, Hash, AlertTriangle, UploadCloud, FileText,
  CheckCircle, Folder, RotateCcw as UndoIcon, ShieldAlert, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

const FIRM_OPTIONS = ['EquityEdge', 'FTMO', 'Topstep', 'FundedNext', 'The5ers', 'Apex', 'Personal'];
const SIZE_OPTIONS = ['$5K', '$10K', '$25K', '$50K', '$100K', '$200K', 'Live'];
const PLATFORM_OPTIONS = ['MT5', 'MT4', 'cTrader', 'DXTrade', 'Match-Trader', 'TradeLocker'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SIZE_TO_NUM = { '$5K': 5000, '$10K': 10000, '$25K': 25000, '$50K': 50000, '$100K': 100000, '$200K': 200000 };
const NUM_TO_SIZE = (n) => ({ 5000: '$5K', 10000: '$10K', 25000: '$25K', 50000: '$50K', 100000: '$100K', 200000: '$200K' }[Number(n)] || 'Live');

const STAGE_KEY_MAP = {
  'Stage 1': 'stage1',
  'Stage 2': 'stage2',
  'Funded Account': 'funded',
  'Live Personal': 'live'
};

const DEFAULT_ACCOUNT_META = {
  '670281': { firm: 'EquityEdge', size: '$10K', startingBalance: 10000, platform: 'MT5', transactions: [] },
  '12345678': { firm: 'EquityEdge', size: '$10K', startingBalance: 10000, platform: 'MT5', transactions: [] },
  '688964': { firm: 'EquityEdge', size: '$10K', startingBalance: 10000, platform: 'MT5', transactions: [] },
  '67029500': { firm: 'EquityEdge', size: '$10K', startingBalance: 10000, platform: 'MT5', transactions: [] },
  '34567890': { firm: 'EquityEdge', size: '$10K', startingBalance: 10000, platform: 'MT5', transactions: [] },
  '6004822': { firm: 'Personal', size: 'Live', startingBalance: 1000, platform: 'cTrader', transactions: [] },
  '45678901': { firm: 'Personal', size: '$10K', startingBalance: 10000, platform: 'MT4', transactions: [] }
};

const DEFAULT_PROFILES = [
  {
    id: 'profile-1',
    label: 'EquityEdge $10K + cTrader Live',
    firm: 'EquityEdge',
    size: 10000,
    accountMeta: DEFAULT_ACCOUNT_META,
    accounts: {
      stage1: { accountNumbers: ['670281', '12345678'], activeAccount: '670281' },
      stage2: { accountNumbers: ['688964', '67029500'], activeAccount: '688964' },
      funded: { accountNumbers: ['34567890'], activeAccount: '34567890' },
      live: { accountNumbers: ['6004822', '45678901'], activeAccount: '6004822' }
    }
  }
];

const extractDateParts = (dateStr = '') => {
  if (!dateStr) return { year: 2026, month: 10, day: 22, ym: '2026-10' };
  const s = String(dateStr).trim();
  const iso = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (iso) {
    const y = parseInt(iso[1], 10) || 2026;
    const m = Math.min(12, Math.max(1, parseInt(iso[2], 10) || 10));
    const d = Math.min(31, Math.max(1, parseInt(iso[3], 10) || 1));
    return { year: y, month: m, day: d, ym: `${y}-${String(m).padStart(2, '0')}` };
  }
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const d = Math.min(31, Math.max(1, parseInt(dmy[1], 10) || 1));
    const m = Math.min(12, Math.max(1, parseInt(dmy[2], 10) || 10));
    const y = parseInt(dmy[3], 10) || 2026;
    return { year: y, month: m, day: d, ym: `${y}-${String(m).padStart(2, '0')}` };
  }
  const named = s.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (named) {
    const idx = SHORT_MONTHS.findIndex((m) => m.toLowerCase() === named[1].slice(0, 3).toLowerCase());
    const m = idx !== -1 ? idx + 1 : 10;
    const d = Math.min(31, Math.max(1, parseInt(named[2], 10) || 1));
    const y = parseInt(named[3], 10) || 2026;
    return { year: y, month: m, day: d, ym: `${y}-${String(m).padStart(2, '0')}` };
  }
  return { year: 2026, month: 10, day: 22, ym: '2026-10' };
};

const getTradeYearMonth = (t) => extractDateParts(t?.closeDate || t?.execDate).ym;
const getTradeCloseDay = (t) => extractDateParts(t?.closeDate || t?.execDate).day;
const formatYmLong = (ym) => {
  if (!ym || ym === 'ALL') return 'All Months (Cumulative)';
  const [y, m] = String(ym).split('-').map(Number);
  return `${MONTH_NAMES[(m || 10) - 1] || 'October'} ${y || 2026}`;
};
const formatYmShort = (ym) => {
  if (!ym || ym === 'ALL') return 'All';
  const [y, m] = String(ym).split('-').map(Number);
  return `${SHORT_MONTHS[(m || 10) - 1] || 'Oct'} ${y || 2026}`;
};

const getPreTradeText = (t) => {
  if (!t) return '';
  if (typeof t.preTradeAnalysis === 'string' && t.preTradeAnalysis.trim()) return t.preTradeAnalysis;
  return String(t.preTradeAnalysis?.tradePlan || t.preAnalysis || '');
};

const getPostTradeText = (t) => {
  if (!t) return '';
  if (typeof t.postTradeReview === 'string' && t.postTradeReview.trim()) return t.postTradeReview;
  return String(t.postTradeReview?.outcomeAnalysis || t.postAnalysis || '');
};

const categorizeSymbol = (sym = '') => {
  const s = String(sym).toUpperCase();
  if (s.includes('XAU') || s.includes('XAG') || s.includes('GOLD')) return 'Metals';
  if (s.includes('US100') || s.includes('US500') || s.includes('NAS') || s.includes('USTEC') || s.includes('US30')) return 'Indices';
  if (s.includes('BTC') || s.includes('ETH')) return 'Crypto';
  return 'Forex';
};

const inferSession = (timeStr = '') => {
  const m = String(timeStr).match(/(\d{2}):(\d{2})/);
  if (!m) return 'New York';
  const hr = parseInt(m[1], 10);
  if (hr >= 0 && hr < 8) return 'Asia';
  if (hr >= 8 && hr < 13) return 'London';
  if (hr >= 13 && hr < 17) return 'Overlap';
  return 'New York';
};

const normalizeIso = (raw = '') => {
  const s = String(raw).trim();
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}T${dmy[4]}`;
  return s.replace(/\./g, '-').replace(' ', 'T').slice(0, 16);
};

const buildSeedTrade = (id, ticketId, acct, stage, execT, closeT, sym, side, lots, entryP, exitP, sl, tp, comm, swap, gross, comment, preCustom, postCustom, src, startBal) => {
  const c = Number(comm) || 0;
  const sw = Number(swap) || 0;
  const gr = Number(gross) || 0;
  const net = Number((gr + c + sw).toFixed(2));
  const isW = net >= 0;
  const eIso = normalizeIso(execT);
  const cIso = normalizeIso(closeT || execT);
  const cParts = extractDateParts(cIso);
  const eParts = extractDateParts(eIso);
  const risk1Pct = Math.max(10, (Number(startBal) || 10000) * 0.01);
  const rMult = `${net >= 0 ? '+' : ''}${(net / risk1Pct).toFixed(2)}R`;
  const preTxt = preCustom || `[${src} #${ticketId}] ${sym} ${side} ${lots} lots @ ${entryP}${sl ? ` | SL: ${sl}` : ''}${tp ? ` | TP: ${tp}` : ''}`;
  const postTxt = postCustom || `Closed @ ${exitP} (${cIso.replace('T', ' ')}) | Gross: ${gr >= 0 ? '+' : ''}$${gr.toFixed(2)} | Comm: $${c.toFixed(2)} | Swap: $${sw.toFixed(2)} | Net: ${net >= 0 ? '+' : ''}$${net.toFixed(2)}${comment ? ` | ${comment}` : ''}`;

  return {
    id, profileId: 'profile-1', accountNumber: String(acct), ticketId: String(ticketId), stage,
    execDate: eIso, closeDate: cIso, execDay: eParts.day, closeDay: cParts.day, yearMonth: cParts.ym,
    status: isW ? 'W' : 'L', side: /buy/i.test(side) ? 'Buy' : 'Sell',
    profit: isW ? net : 0, loss: !isW ? Math.abs(net) : 0, grossPnl: gr, commission: c, swap: sw,
    riskPercentage: 1.0, calculatedRiskAmount: risk1Pct, rMultiple: rMult,
    session: inferSession(execT), symbol: sym.toUpperCase(), category: categorizeSymbol(sym),
    entryPrice: String(entryP), exitPrice: String(exitP), stopLoss: String(sl || ''), takeProfit: String(tp || ''), lots: String(lots),
    preAnalysis: preTxt, postAnalysis: postTxt,
    preTradeAnalysis: { tradePlan: preTxt, setup: `${src} (${sym})` },
    postTradeReview: { outcomeAnalysis: postTxt },
    source: src, imported: true, screenshots: []
  };
};

const STAGE2_ROWS = [
  ['44622244','2026.10.22 17:43:33','2026.10.22 20:27:43','XAUUSD','Sell','0.05','4041.95','4028.72','4031.19','4019.77',-0.16,0,66.15,'','[Entry: Ichimoku alligator bearish cross after NY session high sweep at 4041.95. Confirmed with M15 displacement.]','I closed the trade before weekend liquidity thin-out. Captured +$65.99 cleanly with zero drawdown heat.'],
  ['44631347','2026.10.22 18:30:37','2026.10.22 20:27:43','EURUSD','Sell','1.00','1.12215','1.12191','1.12206','1.12053',-3.00,0,24.00,'','[Entry: .71/.78 fibo zone retracement inside London/NY overlap bearish order block.]','I closed the trade beside the London low support pool to lock in daily green goal (+$21.00).'],
  ['44759256','2026.10.23 12:12:55','2026.10.23 13:07:10','GBPCAD','Sell','1.00','1.87263','1.87105','1.87414','1.87105',-3.00,0,112.87,'[tp 1.87105]','',''],
  ['44816013','2026.10.23 15:23:30','2026.10.23 15:50:13','US100','Buy','1.00','29000.95','29132.13','29009.39','29132.13',0,0,131.18,'[tp 29132.13]','',''],
  ['44851959','2026.10.23 19:00:56','2026.10.23 20:33:05','EURAUD','Sell','1.00','1.59102','1.59062','1.59258','1.58897',-3.00,0,28.15,'','','']
];

const STAGE1_ROWS = [
  ['43213139','2026.10.14 18:41:38','2026.10.14 19:11:14','EURCAD','Sell','2.00','1.58764','1.58825','1.58823','1.58572',-6.00,0,-85.60,'[sl 1.58823]'],
  ['43220037','2026.10.14 19:40:03','2026.10.14 20:19:33','US100','Sell','2.00','29944.85','29979.70','29976.26','',0,0,-69.70,'[sl 29976.26]'],
  ['43221024','2026.10.14 19:54:26','2026.10.14 22:06:07','EURCAD','Sell','2.00','1.58881','1.58884','1.58871','1.58539',-6.00,-13.49,-4.21,'[sl 1.58871]'],
  ['43225123','2026.10.14 20:31:06','2026.10.14 20:46:00','US100','Buy','2.00','30026.90','29968.75','29969.36','30332.59',0,0,-116.30,'[sl 29969.36]'],
  ['43297038','2026.10.15 07:47:14','2026.10.15 21:49:03','EURGBP','Sell','0.50','0.84654','0.84511','0.84511','0.84258',-1.50,0,94.93,''],
  ['43383875','2026.10.15 13:57:15','2026.10.15 15:51:58','AUDCAD','Sell','0.50','0.98079','0.98184','0.98182','',-1.50,0,-37.01,'[sl 0.98182]'],
  ['43494743','2026.10.16 04:31:10','2026.10.16 18:41:55','EURGBP','Sell','1.00','0.84452','0.84320','0.84320','0.84185',-3.00,0,175.83,''],
  ['43664348','2026.10.16 18:05:33','2026.10.16 19:55:34','US100','Sell','1.00','29339.55','29148.63','29255.01','29148.63',0,0,190.92,'[tp 29148.63]'],
  ['43753441','2026.10.19 08:36:33','2026.10.19 10:18:02','CADJPY','Buy','2.00','112.191','112.202','112.202','112.451',-6.00,0,13.91,''],
  ['43773966','2026.10.19 10:10:12','2026.10.19 13:09:48','US100','Sell','1.00','29525.65','29608.65','29606.88','29267.03',0,0,-83.00,'[sl 29606.88]'],
  ['43795301','2026.10.19 12:00:09','2026.10.19 13:30:00','CADJPY','Buy','2.00','112.339','112.204','112.362','',-6.00,0,-170.60,'[sl 112.362]'],
  ['43981950','2026.10.20 08:30:05','2026.10.20 13:50:52','USDCAD','Sell','2.00','1.40668','1.40593','1.40583','1.40002',-6.00,0,106.69,''],
  ['43986436','2026.10.20 08:47:52','2026.10.20 09:34:32','NZDUSD','Buy','2.00','0.56878','0.56849','0.56838','0.56940',-6.00,0,-58.00,''],
  ['44018262','2026.10.20 11:18:50','2026.10.20 15:19:20','EURCAD','Sell','1.00','1.57562','1.57946','1.57941','1.57210',-3.00,0,-273.19,'[sl 1.57941]'],
  ['44046123','2026.10.20 13:29:06','2026.10.22 12:55:08','EURGBP','Sell','0.50','0.83940','0.83744','0.84152','0.83707',-1.50,3.59,131.01,''],
  ['44105217','2026.10.20 15:41:06','2026.10.22 12:55:08','EURCAD','Sell','2.00','1.58026','1.57123','1.58201','1.57047',-6.00,-18.22,1286.61,'Stage 1 Pass'],
  ['44140022','2026.10.20 19:45:03','2026.10.20 21:34:12','US100','Sell','1.00','29515.35','29614.25','29613.72','29325.52',0,0,-98.90,'[sl 29613.72]'],
  ['44187642','2026.10.21 06:09:11','2026.10.21 06:26:03','XAUUSD','Buy','0.02','4120.00','4126.48','4113.77','4126.48',-0.06,0,12.96,'[tp 4126.48]'],
  ['44226839','2026.10.21 09:29:55','2026.10.21 09:53:01','US100','Sell','1.00','29726.45','29616.69','29689.87','29616.69',0,0,109.76,'[tp 29616.69]'],
  ['44234877','2026.10.21 10:13:46','2026.10.21 11:16:20','XAUUSD','Buy','0.02','4123.55','4112.78','4112.80','4149.73',-0.06,0,-21.54,'[sl 4112.80]'],
  ['44298208','2026.10.21 14:27:46','2026.10.21 14:32:47','US100','Buy','1.00','29715.65','29685.85','29686.82','29787.18',0,0,-29.80,'[sl 29686.82]'],
  ['44305323','2026.10.21 14:43:39','2026.10.21 14:45:48','US100','Sell','1.00','29627.55','29707.35','29704.87','29473.37',0,0,-79.80,'[sl 29704.87]'],
  ['44308287','2026.10.21 14:50:24','2026.10.21 18:20:57','US100','Buy','1.00','29730.75','29950.37','29909.68','29950.37',0,0,219.62,'[tp 29950.37]'],
  ['44462326','2026.10.22 07:28:59','2026.10.22 12:15:35','XAUUSD','Sell','0.02','4092.31','4071.20','4101.08','4071.20',-0.06,0,42.22,'[tp 4071.20]'],
  ['44462328','2026.10.22 07:28:59','2026.10.22 12:55:08','XAUUSD','Sell','0.02','4092.31','4059.91','4101.36','',-0.06,0,64.80,'']
];

const CTRADER_ROWS = [
  ['OID43553377','2025.10.24 14:09:28','2025.10.24 14:09:28','XAUUSD','Buy','0.05','4111.47','4116.31','','',-1.06,0,20.82,'cTrader Live (+484 pips)'],
  ['OID43555536','2025.10.24 14:23:14','2025.10.24 14:23:14','XAUUSD','Buy','0.01','4126.75','4123.45','','',-0.22,0,-2.84,'cTrader Live'],
  ['OID15571265','2025.01.29 10:21:17','2025.01.29 10:21:17','XAUUSD','Sell','0.05','2763.35','2760.87','','',-0.80,0,11.92,'cTrader Live (+248 pips)'],
  ['OID15448299','2025.01.27 15:05:38','2025.01.27 15:05:38','XAUUSD','Sell','0.02','2751.14','2741.45','','',-0.32,0,18.45,'cTrader Live (+969 pips)'],
  ['OID15226604','2025.01.23 17:44:49','2025.01.23 17:44:49','XAUUSD','Buy','0.04','2755.68','2758.41','','',-0.64,0,10.47,'cTrader Live (+273 pips)'],
  ['OID10662884','2024.11.20 14:24:15','2024.11.20 14:24:15','NZDCAD','Sell','0.10','0.82606','0.82137','','',-0.34,-0.24,31.82,'cTrader Live (+46.9 pips)'],
  ['OID8756940','2024.10.17 13:34:27','2024.10.17 13:34:27','US500','Sell','1.00','5878.30','5866.20','','',0,0,11.19,'cTrader US500 short'],
  ['OID8734956','2024.10.17 09:41:36','2024.10.17 09:41:36','XAUUSD','Buy','0.05','2677.85','2681.05','','',-0.74,0,14.73,'cTrader Gold long'],
  ['OID6644035','2024.09.10 21:01:00','2024.09.10 21:01:00','EURGBP','Sell','0.43','0.84382','0.84302','','',-2.57,0.54,40.81,'cTrader EURGBP short'],
  ['OID6318377','2024.09.03 14:19:41','2024.09.03 14:19:41','EURUSD','Sell','0.50','1.10498','1.10418','','',-3.00,0,36.23,'cTrader EURUSD short']
];

const INITIAL_TRADES = [
  ...STAGE2_ROWS.map((r, i) => buildSeedTrade(`st2-${i+1}`, r[0], '688964', 'Stage 2', r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12], r[13], r[14], r[15], 'ReportHistory-688964.html', 10000)),
  ...STAGE1_ROWS.map((r, i) => buildSeedTrade(`st1-${i+1}`, r[0], '670281', 'Stage 1', r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12], r[13], '', '', 'ReportHistory-670281.html', 10000)),
  ...CTRADER_ROWS.map((r, i) => buildSeedTrade(`ct-${i+1}`, r[0], '6004822', 'Live Personal', r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12], r[13], '', '', 'cT_6004822.htm', 1000))
];

const TRADES_KEY = 'crowevar_trades_master';
const PROFILES_KEY = 'crowevar_profiles_master';
const TRASH_KEY = 'crowevar_trash_master';

const sanitizeTrade = (t, idx = 0) => {
  if (!t || typeof t !== 'object') return INITIAL_TRADES[0];
  const stage = ['Stage 1', 'Stage 2', 'Funded Account', 'Live Personal'].includes(t.stage) ? t.stage : 'Stage 2';
  const acct = String(t.accountNumber || (stage === 'Stage 1' ? '670281' : stage === 'Stage 2' ? '688964' : '6004822'));
  const ticket = String(t.ticketId || t.id || `TRD-${idx + 1}`);
  const sym = String(t.symbol || 'XAUUSD').toUpperCase();
  const side = /buy/i.test(String(t.side)) ? 'Buy' : 'Sell';
  const status = ['W', 'L', 'O'].includes(t.status) ? t.status : Number(t.profit || 0) >= Number(t.loss || 0) ? 'W' : 'L';
  const profit = status === 'O' ? 0 : Math.max(0, Number(t.profit) || 0);
  const loss = status === 'O' ? 0 : Math.max(0, Number(t.loss) || 0);
  const preTxt = getPreTradeText(t);
  const postTxt = getPostTradeText(t);
  const cParts = extractDateParts(t.closeDate || t.execDate);
  const eParts = extractDateParts(t.execDate || t.closeDate);
  const rawShots = Array.isArray(t.screenshots) ? t.screenshots.filter(Boolean) : [];
  if (t.screenshotUrl && rawShots.length === 0) {
    rawShots.push({
      id: `legacy-${ticket}`, type: 'ENTRY',
      filename: `${ticket}_${acct}_${sym}_ENTRY.png`,
      folderPath: `/Firms/EquityEdge/${stage.replace(/\s+/g, '')}/Account_${acct}/Entry`,
      url: String(t.screenshotUrl), uploadDate: (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })(), version: 1
    });
  }
  return {
    ...t,
    id: String(t.id || `tr-${ticket}-${idx}`),
    ticketId: ticket,
    stage,
    accountNumber: acct,
    symbol: sym,
    side,
    status,
    profit,
    loss,
    lots: String(t.lots || '1.00'),
    entryPrice: String(t.entryPrice || ''),
    exitPrice: String(t.exitPrice || ''),
    execDate: String(t.execDate || '2026-10-22T17:43'),
    closeDate: status === 'O' ? null : String(t.closeDate || t.execDate || '2026-10-22T20:27'),
    execDay: eParts.day,
    closeDay: cParts.day,
    yearMonth: cParts.ym,
    riskPercentage: Number(t.riskPercentage) || 1.0,
    rMultiple: String(t.rMultiple || '+1.00R'),
    category: t.category || categorizeSymbol(sym),
    session: t.session || 'New York',
    preAnalysis: preTxt,
    postAnalysis: postTxt,
    preTradeAnalysis: { tradePlan: preTxt, setup: t.preTradeAnalysis?.setup || '' },
    postTradeReview: { outcomeAnalysis: postTxt },
    screenshots: rawShots.map((s, sIdx) => ({
      id: String(s.id || `s-${idx}-${sIdx}`),
      type: s.type === 'RESULT' ? 'RESULT' : 'ENTRY',
      filename: String(s.filename || `${ticket}_${sym}_${s.type || 'ENTRY'}.png`),
      folderPath: String(s.folderPath || `/Firms/EquityEdge/Account_${acct}`),
      url: String(s.url || ''),
      uploadDate: String(s.uploadDate || (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()),
      version: Number(s.version) || 1
    }))
  };
};

const isPhantomMockTrade = (t) => {
  if (!t) return true;
  const tid = String(t.ticketId || '');
  const idStr = String(t.id || '');
  const pre = String(t.preAnalysis || t.preTradeAnalysis?.tradePlan || '').trim();
  const prof = Number(t.profit) || 0;
  const loss = Number(t.loss) || 0;
  if (idStr.startsWith('imp-')) return true;
  if (
    tid.startsWith('TRD-') &&
    ((t.symbol === 'US100' && prof === 240) || (t.symbol === 'XAUUSD' && loss === 85)) &&
    (pre === 'Imported' || pre.includes('Broker HTML Statement Import') || pre.includes('Ticket #TRD-'))
  ) {
    return true;
  }
  return false;
};

// Unlimited-capacity IndexedDB helpers so Screenshots & Notes never hit the 5MB localStorage limit
const IDB_NAME = 'CrowevarJournalDB';
const IDB_STORE = 'journal_state';

const idbSaveTrades = (tradesList) => {
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(tradesList, TRADES_KEY);
    };
  } catch (e) {}
};

const idbLoadTrades = (callback) => {
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(IDB_STORE, 'readonly');
      const getReq = tx.objectStore(IDB_STORE).get(TRADES_KEY);
      getReq.onsuccess = () => {
        if (Array.isArray(getReq.result) && getReq.result.length > 0) {
          callback(getReq.result);
        }
      };
    };
  } catch (e) {}
};

const recoverAllSavedTradesSafely = () => {
  try {
    // 1. If master key already exists, load it directly and ONLY merge any missing custom notes/screenshots from older keys
    const masterRaw = localStorage.getItem(TRADES_KEY);
    const map = new Map();

    INITIAL_TRADES.forEach((t, i) => {
      const clean = sanitizeTrade(t, i);
      map.set(`${clean.stage}::${clean.ticketId}`, clean);
    });

    // Collect legacy keys in numeric order FIRST, and put TRADES_KEY ('crowevar_trades_master') LAST so Master ALWAYS wins!
    const legacyKeys = [];
    const obsoleteKeysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('crowevar_backups')) {
        obsoleteKeysToDelete.push(k);
      } else if (k.startsWith('crowevar_trades') && k !== TRADES_KEY) {
        legacyKeys.push(k);
        obsoleteKeysToDelete.push(k);
      }
    }

    legacyKeys.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    const orderedKeysToScan = masterRaw ? [...legacyKeys, TRADES_KEY] : legacyKeys;

    orderedKeysToScan.forEach((k) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || '[]');
        if (!Array.isArray(parsed)) return;
        parsed.forEach((rawT, idx) => {
          if (isPhantomMockTrade(rawT)) return; // Strip out the 2 fake mock trades (#TRD-130394 & #TRD-149204)
          const clean = sanitizeTrade(rawT, idx);
          if (isPhantomMockTrade(clean)) return;

          let key = `${clean.stage}::${clean.ticketId}`;
          if (!map.has(key) && (rawT?.id === 'st2-1' || rawT?.ticketId === '98451201' || rawT?.ticketId === 'TRD-000145')) {
            key = 'Stage 2::44622244';
            clean.ticketId = '44622244';
            clean.accountNumber = '688964';
          } else if (!map.has(key) && (rawT?.id === 'st2-2' || rawT?.ticketId === '98451202')) {
            key = 'Stage 2::44631347';
            clean.ticketId = '44631347';
            clean.accountNumber = '688964';
          }

          const existing = map.get(key);
          if (existing) {
            const merged = { ...existing };
            if (clean.preAnalysis && !clean.preAnalysis.startsWith('[ReportHistory-') && !clean.preAnalysis.startsWith('[cT_')) {
              merged.preAnalysis = clean.preAnalysis;
              merged.preTradeAnalysis = { ...merged.preTradeAnalysis, tradePlan: clean.preAnalysis };
            }
            if (clean.postAnalysis && !clean.postAnalysis.startsWith('Closed @ ')) {
              merged.postAnalysis = clean.postAnalysis;
              merged.postTradeReview = { ...merged.postTradeReview, outcomeAnalysis: clean.postAnalysis };
            }
            if (Array.isArray(clean.screenshots) && clean.screenshots.length > 0) {
              const prevWithUrl = (merged.screenshots || []).filter((s) => s.url);
              const newWithUrl = clean.screenshots.filter((s) => s.url);
              if (newWithUrl.length > 0 || prevWithUrl.length === 0) {
                merged.screenshots = clean.screenshots;
              }
            }
            map.set(key, merged);
          } else {
            map.set(key, clean);
          }
        });
      } catch (e) {}
    });

    const finalTrades = Array.from(map.values()).filter((t) => !isPhantomMockTrade(t));

    // Free up localStorage quota by removing old v1..v22 keys and save clean master state
    obsoleteKeysToDelete.forEach((oldKey) => {
      try { localStorage.removeItem(oldKey); } catch {}
    });
    try {
      localStorage.setItem(TRADES_KEY, JSON.stringify(finalTrades));
    } catch {}
    idbSaveTrades(finalTrades);

    return finalTrades;
  } catch (e) {
    return INITIAL_TRADES;
  }
};

const normalizeProfile = (p) => {
  if (!p || typeof p !== 'object') return DEFAULT_PROFILES[0];
  const meta = { ...DEFAULT_ACCOUNT_META, ...(p.accountMeta || {}) };
  Object.keys(meta).forEach((acc) => {
    const m = meta[acc] || {};
    meta[acc] = {
      firm: String(m.firm || 'EquityEdge'),
      size: String(m.size || '$10K'),
      startingBalance: Number(m.startingBalance) >= 0 ? Number(m.startingBalance) : (SIZE_TO_NUM[m.size] || 10000),
      platform: String(m.platform || 'MT5'),
      transactions: Array.isArray(m.transactions) ? m.transactions : []
    };
  });
  const accts = { ...DEFAULT_PROFILES[0].accounts };
  ['stage1', 'stage2', 'funded', 'live'].forEach((k) => {
    const raw = p.accounts?.[k];
    if (raw && Array.isArray(raw.accountNumbers) && raw.accountNumbers.length > 0) {
      const list = raw.accountNumbers.filter(Boolean).map(String);
      accts[k] = { accountNumbers: list, activeAccount: String(raw.activeAccount || list[0]) };
    }
  });
  return { ...DEFAULT_PROFILES[0], ...p, accountMeta: meta, accounts: accts };
};

class SafeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: String(error?.message || error) };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050811] text-white flex items-center justify-center p-6">
          <div className="bg-[#090d1a] border border-cyan-500/50 rounded-3xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-extrabold text-cyan-400">Self-Healing State Recovery</h2>
            <p className="text-xs text-slate-300">A cached storage record was out of sync ({this.state.errorMsg}). Click below to repair and reload your journal.</p>
            <button
              onClick={() => {
                localStorage.removeItem(PROFILES_KEY);
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-extrabold text-xs"
            >
              Repair &amp; Open Journal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function JournalDashboard() {
  const [profiles, setProfiles] = useState(() => {
    try {
      const raw = localStorage.getItem(PROFILES_KEY) || localStorage.getItem('crowevar_profiles_v22') || localStorage.getItem('crowevar_profiles_v21');
      const parsed = raw ? JSON.parse(raw) : DEFAULT_PROFILES;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(normalizeProfile) : DEFAULT_PROFILES;
    } catch {
      return DEFAULT_PROFILES;
    }
  });

  const activeProfile = useMemo(() => normalizeProfile(profiles[0]), [profiles]);

  useEffect(() => {
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch {}
  }, [profiles]);

  const [trades, setTrades] = useState(() => recoverAllSavedTradesSafely());

  // Load from unlimited IndexedDB on mount if IndexedDB has richer screenshot/note data
  useEffect(() => {
    idbLoadTrades((idbTrades) => {
      if (!Array.isArray(idbTrades)) return;
      const cleanedIdb = idbTrades
        .filter((t) => !isPhantomMockTrade(t))
        .map((t, i) => sanitizeTrade(t, i));
      if (cleanedIdb.length > 0) {
        setTrades(cleanedIdb);
      }
    });
  }, []);

  // Persist every note & screenshot edit to both IndexedDB (unlimited size) and localStorage
  useEffect(() => {
    if (window.__CROWEVAR_RBAC__ && !window.__CROWEVAR_RBAC__.canWriteData) return;
    const cleanList = trades.filter((t) => !isPhantomMockTrade(t));
    idbSaveTrades(cleanList);
    try {
      localStorage.setItem(TRADES_KEY, JSON.stringify(cleanList));
    } catch (err) {
      // If localStorage hits 5MB due to large base64 images, save lightweight copy in localStorage while IndexedDB holds full images
      try {
        const lightCopy = cleanList.map((t) => ({
          ...t,
          screenshots: (t.screenshots || []).map((s) => ({ ...s, url: '' }))
        }));
        localStorage.setItem(TRADES_KEY, JSON.stringify(lightCopy));
      } catch {}
    }
  }, [trades]);

  const [recycleBin, setRecycleBin] = useState(() => {
    try {
      const raw = localStorage.getItem(TRASH_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try { localStorage.setItem(TRASH_KEY, JSON.stringify(recycleBin)); } catch {}
  }, [recycleBin]);

  const [activeContext, setActiveContext] = useState('Stage 2');
  const [analyticsTab, setAnalyticsTab] = useState('calendar');
  const [selectedYearMonth, setSelectedYearMonth] = useState('2026-10');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [newAcctInput, setNewAcctInput] = useState({ stage1: '', stage2: '', funded: '', live: '' });
  const [newAcctMeta, setNewAcctMeta] = useState({
    stage1: { firm: 'EquityEdge', size: '$10K', startingBalance: 10000, platform: 'MT5' },
    stage2: { firm: 'EquityEdge', size: '$10K', startingBalance: 10000, platform: 'MT5' },
    funded: { firm: 'EquityEdge', size: '$10K', startingBalance: 10000, platform: 'MT5' },
    live: { firm: 'Personal', size: 'Live', startingBalance: 1000, platform: 'cTrader' }
  });
  const [accountError, setAccountError] = useState('');
  const [accountPendingDelete, setAccountPendingDelete] = useState(null);
  const [accountDeleteConfirmText, setAccountDeleteConfirmText] = useState('');

  const [cashflowModalOpen, setCashflowModalOpen] = useState(false);
  const [cashflowForm, setCashflowForm] = useState({ accountNumber: '6004822', type: 'DEPOSIT', amount: '', date: (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })(), note: '' });

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTargetStage, setImportTargetStage] = useState('AUTO');
  const [importSummaryModal, setImportSummaryModal] = useState(null);
  const [importError, setImportError] = useState('');

  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [isNewTrade, setIsNewTrade] = useState(true);
  const [editingTrade, setEditingTrade] = useState(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTradeId, setReviewTradeId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [secureDeleteModalOpen, setSecureDeleteModalOpen] = useState(false);
  const [tradePendingDelete, setTradePendingDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [trashPendingPermanentDelete, setTrashPendingPermanentDelete] = useState(null);
  const [trashConfirmInput, setTrashConfirmInput] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const fullTradesVaultRef = React.useRef(null);
  const [rbacTick, setRbacTick] = useState(0);

  // Listen to RBAC role/login changes and enforce stage permissions
  useEffect(() => {
    const handleRbacChange = () => setRbacTick((n) => n + 1);
    window.addEventListener('crowevar-rbac-change', handleRbacChange);
    return () => window.removeEventListener('crowevar-rbac-change', handleRbacChange);
  }, []);

  useEffect(() => {
    const rbac = window.__CROWEVAR_RBAC__;
    if (!rbac) return;

    if (Array.isArray(trades) && trades.some((t) => t.stage === 'Live Personal')) {
      fullTradesVaultRef.current = trades;
    }

    if (!rbac.can('viewLiveAccounts')) {
      if (activeContext === 'Live Personal') {
        setActiveContext('Stage 1');
      }
      if (Array.isArray(trades) && trades.some((t) => t.stage === 'Live Personal')) {
        setTrades((prev) => prev.filter((t) => t.stage !== 'Live Personal'));
      }
    } else if (
      fullTradesVaultRef.current &&
      Array.isArray(trades) &&
      !trades.some((t) => t.stage === 'Live Personal')
    ) {
      setTrades(fullTradesVaultRef.current);
    }
  }, [rbacTick, activeContext, trades]);

  // Auto-fix trades logged with the old hardcoded 2026-10-24 date -> 2026-10-26
  useEffect(() => {
    const hasOct24 = trades.some(
      (t) =>
        String(t.execDate || '').includes('2026-10-24') ||
        String(t.closeDate || '').includes('2026-10-24') ||
        String(t.execDate || '').includes('2026.10.24') ||
        String(t.closeDate || '').includes('2026.10.24')
    );
    if (hasOct24) {
      setTrades((prev) =>
        prev.map((t) => {
          const nextExec = String(t.execDate || '')
            .replace('2026-10-24', '2026-10-26')
            .replace('2026.10.24', '2026-10-26');
          const nextClose = String(t.closeDate || '')
            .replace('2026-10-24', '2026-10-26')
            .replace('2026.10.24', '2026-10-26');
          if (nextExec !== t.execDate || nextClose !== t.closeDate) {
            return { ...t, execDate: nextExec, closeDate: nextClose };
          }
          return t;
        })
      );
    }
  }, [trades]);
  const [mobileLedgerMode, setMobileLedgerMode] = useState('CARDS'); // 'CARDS' | 'TABLE'
  const [ledgerExportScope, setLedgerExportScope] = useState('CURRENT'); // 'CURRENT' | 'ALL'

  // ============================================================================
  // EXECUTION JOURNAL & TRADE LEDGER EXPORTERS (CSV & STANDALONE HTML WITH SCREENSHOTS)
  // ============================================================================
  const getExportTargetTrades = () => {
    const sourceList = ledgerExportScope === 'ALL' ? trades : filteredTrades;
    return (sourceList || []).filter((t) => !t.deleted);
  };

  const handleExportLedgerCSV = () => {
    const list = getExportTargetTrades();
    if (list.length === 0) {
      showToast('⚠️ No trades in the current view to export.');
      return;
    }

    const csvEscape = (val) => {
      const str = String(val ?? '').replace(/\r?\n/g, ' | ');
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Ticket ID',
      'Trade ID',
      'Stage',
      'Account Number',
      'Firm',
      'Execution Date',
      'Close Date',
      'Symbol',
      'Category',
      'Session',
      'Direction',
      'Lots / Size',
      'Risk %',
      'Status',
      'Gross Profit ($)',
      'Gross Loss ($)',
      'Net P&L ($)',
      'R-Multiple',
      'Pre-Trade Analysis (Notes)',
      'Post-Trade Review (Notes)',
      'Psychology Tags',
      'Rules Followed',
      'Entry Screenshot Filename',
      'Entry Screenshot Path',
      'Result Screenshot Filename',
      'Result Screenshot Path',
      'Entry Screenshot Data/URL',
      'Result Screenshot Data/URL'
    ];

    const rows = list.map((t) => {
      const prof = Number(t.profit) || 0;
      const loss = Number(t.loss) || 0;
      const net = prof - loss;
      const preNotes =
        typeof t.preTradeAnalysis === 'string'
          ? t.preTradeAnalysis
          : t.preTradeAnalysis?.tradePlan || t.preAnalysis || '';
      const postNotes =
        typeof t.postTradeReview === 'string'
          ? t.postTradeReview
          : t.postTradeReview?.outcomeAnalysis || t.postAnalysis || '';
      const psych = Array.isArray(t.psychology) ? t.psychology.join('; ') : '';
      const rules =
        t.rulesFollowed && typeof t.rulesFollowed === 'object'
          ? Object.entries(t.rulesFollowed)
              .filter(([, v]) => Boolean(v))
              .map(([k]) => k)
              .join('; ')
          : '';
      const shots = Array.isArray(t.screenshots) ? t.screenshots : [];
      const entryShot = shots.find((s) => s.type === 'ENTRY') || shots[0] || null;
      const resultShot = shots.find((s) => s.type === 'RESULT') || shots[1] || null;
      const stageKey = STAGE_KEY_MAP[t.stage] || 'stage1';
      const meta = getAccountMeta(t.accountNumber, stageKey);
      const statusLabel = t.status === 'W' ? 'Won' : t.status === 'L' ? 'Lost' : 'Open';

      return [
        t.ticketId || '',
        t.id || '',
        t.stage || '',
        t.accountNumber || '',
        t.firm || meta?.firm || '',
        t.execDate || '',
        t.status === 'O' ? 'Pending' : t.closeDate || '',
        t.symbol || '',
        t.category || '',
        t.session || '',
        t.side || '',
        t.lots ?? 1,
        t.riskPct ?? '',
        statusLabel,
        prof.toFixed(2),
        loss.toFixed(2),
        net.toFixed(2),
        t.status === 'O' ? 'Pending' : t.rMultiple ?? '',
        preNotes,
        postNotes,
        psych,
        rules,
        entryShot?.filename || '',
        entryShot?.folderPath || '',
        resultShot?.filename || '',
        resultShot?.folderPath || '',
        entryShot?.url || '',
        resultShot?.url || ''
      ]
        .map(csvEscape)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(csvEscape).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const scopeTag = ledgerExportScope === 'ALL' ? 'All_Accounts' : activeContext.replace(/\s+/g, '_');
    const link = document.createElement('a');
    link.href = url;
    link.download = `TradeAtlas_Crowevar_${scopeTag}_${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`📄 Exported ${list.length} trades (with notes & screenshot data) to CSV!`);
  };

  const handleExportLedgerHTML = () => {
    const list = getExportTargetTrades();
    if (list.length === 0) {
      showToast('⚠️ No trades in the current view to export.');
      return;
    }

    const escHtml = (str) =>
      String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const closed = list.filter((t) => t.status === 'W' || t.status === 'L');
    const wins = closed.filter((t) => t.status === 'W').length;
    const winRate = closed.length > 0 ? ((wins / closed.length) * 100).toFixed(1) : '0.0';
    const grossProf = closed.reduce((s, t) => s + (Number(t.profit) || 0), 0);
    const grossLoss = closed.reduce((s, t) => s + (Number(t.loss) || 0), 0);
    const netPnl = grossProf - grossLoss;
    const pf = grossLoss > 0 ? (grossProf / grossLoss).toFixed(2) : grossProf > 0 ? '∞' : '0.00';
    const totalPhotos = list.reduce((s, t) => s + ((t.screenshots || []).length || 0), 0);

    const rowsHtml = list
      .map((t) => {
        const prof = Number(t.profit) || 0;
        const loss = Number(t.loss) || 0;
        const net = prof - loss;
        const preNotes =
          typeof t.preTradeAnalysis === 'string'
            ? t.preTradeAnalysis
            : t.preTradeAnalysis?.tradePlan || t.preAnalysis || '';
        const postNotes =
          typeof t.postTradeReview === 'string'
            ? t.postTradeReview
            : t.postTradeReview?.outcomeAnalysis || t.postAnalysis || '';
        const shots = Array.isArray(t.screenshots) ? t.screenshots : [];
        const statusBadge =
          t.status === 'W'
            ? '<span class="badge won">✓ Won</span>'
            : t.status === 'L'
            ? '<span class="badge lost">✕ Lost</span>'
            : '<span class="badge open">◉ Open</span>';

        const shotsHtml =
          shots.length > 0
            ? `<div class="shots-grid">${shots
                .map(
                  (s) => `
                <div class="shot-card">
                  <div class="shot-meta">
                    <strong>${escHtml(s.type || 'SCREENSHOT')}:</strong> ${escHtml(s.filename || 'Attached Image')}
                    <span class="shot-path">${escHtml(s.folderPath || '')}</span>
                  </div>
                  ${
                    s.url
                      ? `<a href="${s.url}" target="_blank" rel="noopener noreferrer"><img src="${s.url}" alt="${escHtml(
                          s.filename || 'Trade Screenshot'
                        )}" /></a>`
                      : `<div class="no-img">Metadata saved (${escHtml(s.filename || 'No preview')})</div>`
                  }
                </div>`
                )
                .join('')}</div>`
            : '';

        return `
        <div class="trade-card">
          <div class="trade-header">
            <div>
              <span class="ticket">#${escHtml(t.ticketId)}</span>
              <strong class="symbol">${escHtml(t.symbol)}</strong>
              <span class="side ${t.side === 'Buy' ? 'buy' : 'sell'}">${escHtml(t.side)} (${escHtml(
          t.lots ?? 1
        )} Lot)</span>
              <span class="stage-pill">${escHtml(t.stage)} • Acct #${escHtml(t.accountNumber)}</span>
            </div>
            <div class="trade-pnl">
              ${statusBadge}
              <strong class="${net >= 0 ? 'pos' : 'neg'}">${
          t.status === 'O' ? 'OPEN' : net >= 0 ? `+$${net.toFixed(2)}` : `-$${Math.abs(net).toFixed(2)}`
        }</strong>
            </div>
          </div>
          <div class="trade-meta">
            <span><strong>Exec Date:</strong> ${escHtml(t.execDate)}</span>
            <span><strong>Close Date:</strong> ${escHtml(t.status === 'O' ? 'Pending' : t.closeDate || '-')}</span>
            <span><strong>Session:</strong> ${escHtml(t.session || 'NY')}</span>
            <span><strong>Category:</strong> ${escHtml(t.category || '-')}</span>
            <span><strong>Risk %:</strong> ${escHtml(t.riskPct ?? '-')}%</span>
            <span><strong>R-Multiple:</strong> ${escHtml(t.status === 'O' ? 'Pending' : t.rMultiple ?? '-')}R</span>
          </div>
          <div class="notes-grid">
            <div class="note-box pre">
              <h4>1. Pre-Trade Analysis (Before Trade)</h4>
              <p>${escHtml(preNotes || 'No pre-trade notes recorded.')}</p>
            </div>
            <div class="note-box post">
              <h4>2. Post-Trade Review (After Trade)</h4>
              <p>${escHtml(postNotes || 'No post-trade review recorded.')}</p>
            </div>
          </div>
          ${shotsHtml}
        </div>`;
      })
      .join('\n');

    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>TradeAtlas - Crowevar | Execution Journal & Trade Ledger Export</title>
  <style>
    body { background: #050811; color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 32px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .top-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 24px; }
    .brand h1 { margin: 0; font-size: 24px; letter-spacing: 0.5px; }
    .brand h1 span { color: #06b6d4; }
    .brand p { margin: 4px 0 0; color: #94a3b8; font-size: 13px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; margin-bottom: 28px; }
    .kpi-card { background: #090d1a; border: 1px solid #1e293b; border-radius: 14px; padding: 16px; }
    .kpi-card span { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700; display: block; }
    .kpi-card strong { font-size: 22px; margin-top: 6px; display: block; }
    .pos { color: #34d399; }
    .neg { color: #fb7185; }
    .trade-card { background: #090d1a; border: 1px solid #1e293b; border-radius: 16px; padding: 20px; margin-bottom: 18px; page-break-inside: avoid; }
    .trade-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 12px; }
    .ticket { font-family: monospace; color: #fcd34d; font-weight: 700; margin-right: 10px; font-size: 14px; }
    .symbol { font-size: 16px; color: #fff; margin-right: 10px; }
    .side { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; margin-right: 10px; }
    .side.buy { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; }
    .side.sell { background: rgba(244, 63, 94, 0.15); color: #fda4af; }
    .stage-pill { background: #0d162c; border: 1px solid rgba(6, 182, 212, 0.35); color: #67e8f9; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .trade-pnl { display: flex; align-items: center; gap: 10px; font-size: 18px; }
    .badge { font-size: 11px; padding: 3px 9px; border-radius: 6px; font-weight: 700; }
    .badge.won { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .badge.lost { background: rgba(244, 63, 94, 0.2); color: #fb7185; }
    .badge.open { background: rgba(6, 182, 212, 0.2); color: #22d3ee; }
    .trade-meta { display: flex; flex-wrap: wrap; gap: 18px; font-size: 12px; color: #94a3b8; margin-bottom: 14px; }
    .notes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; margin-bottom: 14px; }
    .note-box { background: #0b1122; border-radius: 12px; padding: 14px; border: 1px solid #1e293b; }
    .note-box.pre { border-color: rgba(6, 182, 212, 0.35); }
    .note-box.post { border-color: rgba(99, 102, 241, 0.35); }
    .note-box h4 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #38bdf8; }
    .note-box.post h4 { color: #818cf8; }
    .note-box p { margin: 0; font-size: 13px; color: #e2e8f0; white-space: pre-wrap; line-height: 1.5; }
    .shots-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; margin-top: 12px; }
    .shot-card { background: #070b16; border: 1px solid #1e293b; border-radius: 12px; padding: 10px; }
    .shot-meta { font-size: 11px; color: #cbd5e1; margin-bottom: 8px; display: flex; justify-content: space-between; gap: 8px; }
    .shot-path { color: #64748b; font-family: monospace; font-size: 10px; }
    .shot-card img { width: 100%; max-height: 360px; object-fit: contain; border-radius: 8px; border: 1px solid #1e293b; background: #000; }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-header">
      <div class="brand">
        <h1>TRADE<span>ATLAS</span> — CROWEVAR</h1>
        <p>Execution Journal &amp; Trade Ledger Complete Export (${escHtml(
          ledgerExportScope === 'ALL' ? 'All Stages & Accounts' : activeContext
        )}) • Generated ${new Date().toLocaleString()}</p>
      </div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card"><span>Total Trades Exported</span><strong>${list.length}</strong></div>
      <div class="kpi-card"><span>Closed Win Rate</span><strong>${winRate}% (${wins}/${closed.length})</strong></div>
      <div class="kpi-card"><span>Net Realized P&amp;L</span><strong class="${netPnl >= 0 ? 'pos' : 'neg'}">${
      netPnl >= 0 ? `+$${netPnl.toFixed(2)}` : `-$${Math.abs(netPnl).toFixed(2)}`
    }</strong></div>
      <div class="kpi-card"><span>Gross Profit / Loss</span><strong><span class="pos">+$${grossProf.toFixed(
        2
      )}</span> / <span class="neg">-$${grossLoss.toFixed(2)}</span></strong></div>
      <div class="kpi-card"><span>Profit Factor</span><strong>${pf}</strong></div>
      <div class="kpi-card"><span>Embedded Screenshots</span><strong>${totalPhotos} Photos</strong></div>
    </div>
    ${rowsHtml}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const scopeTag = ledgerExportScope === 'ALL' ? 'All_Accounts' : activeContext.replace(/\s+/g, '_');
    const link = document.createElement('a');
    link.href = url;
    link.download = `TradeAtlas_Crowevar_${scopeTag}_Report_${dateStamp}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`🌐 Exported ${list.length} trades with embedded screenshots & notes to HTML!`);
  };

  // ============================================================================
  // SUPABASE CLOUD DATABASE SYNC (CROSS-DEVICE SCREENSHOTS, NOTES & TRADES)
  // ============================================================================
  const [cloudModalOpen, setCloudModalOpen] = useState(false);

  const normalizeSupabaseUrl = (raw) => {
    const s = String(raw || '').trim();
    const match = s.match(/https?:\/\/[a-z0-9-]+\.supabase\.co/i);
    if (match) return match[0].toLowerCase();
    return s.replace(/\/+$/, '').replace(/\/rest\/v1.*$/i, '');
  };

  const normalizeSupabaseKey = (raw) => {
    return String(raw || '').trim().replace(/^Bearer\s+/i, '');
  };

  const [cloudUrl, setCloudUrl] = useState(() => {
    const envUrl = normalizeSupabaseUrl(import.meta.env?.VITE_SUPABASE_URL || '');
    const locUrl = normalizeSupabaseUrl(localStorage.getItem('crowevar_supabase_url') || '');
    return envUrl || locUrl || '';
  });

  const [cloudKey, setCloudKey] = useState(() => {
    const envKey = normalizeSupabaseKey(import.meta.env?.VITE_SUPABASE_ANON_KEY || '');
    const locKey = normalizeSupabaseKey(localStorage.getItem('crowevar_supabase_key') || '');
    return envKey || locKey || '';
  });

  const [cloudStatus, setCloudStatus] = useState('Idle');
  const [lastSyncedAt, setLastSyncedAt] = useState('');
  const [cloudInitialLoaded, setCloudInitialLoaded] = useState(false);
  const isPullingFromCloudRef = React.useRef(false);

  // Compress large Base64 screenshots so POST payloads to Supabase stay fast & under size limits
  const compressDataUrl = (dataUrl, maxWidth = 1280, quality = 0.76) =>
    new Promise((resolve) => {
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/') || dataUrl.length < 90000) {
        resolve(dataUrl || '');
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.width || 1280;
          let h = img.height || 720;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  const prepareTradesForCloud = async (tradesList) => {
    const clean = (tradesList || []).filter((t) => !isPhantomMockTrade(t));
    return Promise.all(
      clean.map(async (t) => {
        if (!Array.isArray(t.screenshots) || t.screenshots.length === 0) return t;
        const compressedShots = await Promise.all(
          t.screenshots.map(async (s) => {
            if (!s || !s.url) return s;
            const newUrl = await compressDataUrl(s.url, 1280, 0.76);
            return { ...s, url: newUrl };
          })
        );
        return { ...t, screenshots: compressedShots };
      })
    );
  };

  // Merge local and cloud trades so local notes/screenshots are never lost on startup pull
  const mergeLocalAndRemoteTrades = (localList, remoteList) => {
    const map = new Map();
    (remoteList || []).forEach((raw, idx) => {
      if (isPhantomMockTrade(raw)) return;
      const t = sanitizeTrade(raw, idx);
      map.set(`${t.stage}::${t.ticketId}`, t);
    });
    (localList || []).forEach((raw, idx) => {
      if (isPhantomMockTrade(raw)) return;
      const loc = sanitizeTrade(raw, idx);
      const key = `${loc.stage}::${loc.ticketId}`;
      const rem = map.get(key);
      if (!rem) {
        map.set(key, loc);
      } else {
        const merged = { ...rem, ...loc };
        const locPre = String(loc.preAnalysis || loc.preTradeAnalysis?.tradePlan || '').trim();
        const remPre = String(rem.preAnalysis || rem.preTradeAnalysis?.tradePlan || '').trim();
        if (remPre.length > locPre.length) {
          merged.preAnalysis = rem.preAnalysis;
          merged.preTradeAnalysis = rem.preTradeAnalysis;
        }
        const locPost = String(loc.postAnalysis || loc.postTradeReview?.outcomeAnalysis || '').trim();
        const remPost = String(rem.postAnalysis || rem.postTradeReview?.outcomeAnalysis || '').trim();
        if (remPost.length > locPost.length) {
          merged.postAnalysis = rem.postAnalysis;
          merged.postTradeReview = rem.postTradeReview;
        }
        const locShots = (loc.screenshots || []).filter((s) => s && s.url);
        const remShots = (rem.screenshots || []).filter((s) => s && s.url);
        if (remShots.length > locShots.length) {
          merged.screenshots = rem.screenshots;
        } else if (locShots.length > 0) {
          merged.screenshots = loc.screenshots;
        }
        map.set(key, merged);
      }
    });
    return Array.from(map.values());
  };

  const buildSupabaseHeaders = (cleanKey, includePrefer = false) => {
    const hdrs = {
      apikey: cleanKey,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    if (!cleanKey.startsWith('sb_')) {
      hdrs.Authorization = `Bearer ${cleanKey}`;
    } else {
      hdrs.Authorization = `Bearer ${cleanKey}`;
    }
    if (includePrefer) {
      hdrs.Prefer = 'resolution=merge-duplicates,return=minimal';
    }
    return hdrs;
  };

  const pullFromCloud = async (urlOverride = cloudUrl, keyOverride = cloudKey, silent = false) => {
    const cleanUrl = normalizeSupabaseUrl(urlOverride);
    const cleanKey = normalizeSupabaseKey(keyOverride);
    if (!cleanUrl || !cleanKey) {
      setCloudStatus('Not Configured');
      setCloudInitialLoaded(true);
      return;
    }
    try {
      setCloudStatus('Syncing...');
      let res = await fetch(`${cleanUrl}/rest/v1/journal_store?id=eq.master&select=*`, {
        method: 'GET',
        headers: buildSupabaseHeaders(cleanKey, false)
      });
      if ((res.status === 401 || res.status === 403) && cleanKey.startsWith('sb_')) {
        res = await fetch(`${cleanUrl}/rest/v1/journal_store?id=eq.master&select=*`, {
          method: 'GET',
          headers: { apikey: cleanKey, Accept: 'application/json' }
        });
      }
      if (!res.ok) {
        const errTxt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${errTxt}`);
      }
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const remote = rows[0];
        isPullingFromCloudRef.current = true;
        const currentFullLocal =
          typeof fullTradesVaultRef !== 'undefined' && Array.isArray(fullTradesVaultRef.current)
            ? fullTradesVaultRef.current
            : trades;
        const remoteTrades = Array.isArray(remote.trades) ? remote.trades : [];
        const mergedAll = mergeLocalAndRemoteTrades(currentFullLocal, remoteTrades);

        if (typeof fullTradesVaultRef !== 'undefined') {
          fullTradesVaultRef.current = mergedAll;
        }
        const rbac = window.__CROWEVAR_RBAC__;
        const visibleTrades =
          rbac && !rbac.can('viewLiveAccounts')
            ? mergedAll.filter((t) => t.stage !== 'Live Personal')
            : mergedAll;

        setTrades(visibleTrades);
        idbSaveTrades(mergedAll);

        if (Array.isArray(remote.profiles) && remote.profiles.length > 0) {
          setProfiles(remote.profiles.map(normalizeProfile));
        }
        if (Array.isArray(remote.trash)) {
          setRecycleBin(remote.trash);
        }
        setTimeout(() => {
          isPullingFromCloudRef.current = false;
        }, 1500);

        setCloudStatus('Synced');
        setLastSyncedAt(new Date().toLocaleTimeString());
        if (!silent) showToast('☁️ Synced latest trades, notes & screenshots from Cloud!');

        // If local had newer trades/screenshots not yet in remote, push the merged state up
        if (mergedAll.length > remoteTrades.length && (!rbac || rbac.canWriteData)) {
          setTimeout(() => {
            pushToCloud(cleanUrl, cleanKey, mergedAll, profiles, recycleBin, true);
          }, 600);
        }
      } else {
        await pushToCloud(cleanUrl, cleanKey, trades, profiles, recycleBin, true);
      }
      setCloudInitialLoaded(true);
    } catch (err) {
      console.error('Cloud pull error:', err);
      setCloudStatus('Error');
      setCloudInitialLoaded(true);
      if (!silent) showToast(`⚠️ Cloud Pull Error: ${err.message}`);
    }
  };

  const pushToCloud = async (
    urlOverride = cloudUrl,
    keyOverride = cloudKey,
    tradesPayload = trades,
    profilesPayload = profiles,
    trashPayload = recycleBin,
    silent = true
  ) => {
    const cleanUrl = normalizeSupabaseUrl(urlOverride);
    const cleanKey = normalizeSupabaseKey(keyOverride);
    if (!cleanUrl || !cleanKey) return;

    const rbac = window.__CROWEVAR_RBAC__;
    if (silent && rbac && !rbac.canWriteData) {
      setCloudStatus('Synced');
      return;
    }

    try {
      setCloudStatus('Syncing...');
      let masterTrades = tradesPayload;
      if (
        typeof fullTradesVaultRef !== 'undefined' &&
        Array.isArray(fullTradesVaultRef.current) &&
        fullTradesVaultRef.current.length >= tradesPayload.length
      ) {
        masterTrades = mergeLocalAndRemoteTrades(tradesPayload, fullTradesVaultRef.current);
        fullTradesVaultRef.current = masterTrades;
      }

      // Compress Base64 screenshots so the POST body stays small and fast
      const optimizedTrades = await prepareTradesForCloud(masterTrades);

      const sendUpsert = async (bodyObj, omitBearer = false) => {
        const headers = omitBearer
          ? {
              apikey: cleanKey,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates,return=minimal'
            }
          : buildSupabaseHeaders(cleanKey, true);

        return fetch(`${cleanUrl}/rest/v1/journal_store?on_conflict=id`, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyObj)
        });
      };

      const fullPayload = {
        id: 'master',
        trades: optimizedTrades,
        profiles: profilesPayload,
        trash: trashPayload,
        updated_at: new Date().toISOString()
      };

      let res = await sendUpsert(fullPayload, false);

      // Fallback 1: If sb_publishable_ key rejected Bearer header, retry with apikey only
      if ((res.status === 401 || res.status === 403) && cleanKey.startsWith('sb_')) {
        res = await sendUpsert(fullPayload, true);
      }

      // Fallback 2: If payload still too large (413) or schema column mismatch (400), retry with stronger image compression
      if (!res.ok) {
        const superCompressedTrades = await Promise.all(
          optimizedTrades.map(async (t) => ({
            ...t,
            screenshots: await Promise.all(
              (t.screenshots || []).map(async (s) => ({
                ...s,
                url: s?.url ? await compressDataUrl(s.url, 800, 0.6) : ''
              }))
            )
          }))
        );
        res = await sendUpsert(
          {
            id: 'master',
            trades: superCompressedTrades,
            profiles: profilesPayload,
            trash: trashPayload
          },
          false
        );
      }

      if (!res.ok) {
        const errTxt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errTxt}`);
      }

      setCloudStatus('Synced');
      setLastSyncedAt(new Date().toLocaleTimeString());
      if (!silent) showToast('☁️ All trades, notes & screenshots synced to Cloud!');
    } catch (err) {
      console.error('Cloud push error:', err);
      setCloudStatus('Error');
      if (!silent) showToast(`⚠️ Cloud Push Error: ${err.message}`);
    }
  };

  // Auto-pull from Cloud on startup
  useEffect(() => {
    if (cloudUrl && cloudKey) {
      pullFromCloud(cloudUrl, cloudKey, true);
    } else {
      setCloudStatus('Not Configured');
      setCloudInitialLoaded(true);
    }
  }, []);

  // Auto-push to Cloud whenever trades, notes, screenshots, accounts, or trash change
  useEffect(() => {
    if (!cloudInitialLoaded || !cloudUrl || !cloudKey) return;
    if (isPullingFromCloudRef.current) return;
    const rbac = window.__CROWEVAR_RBAC__;
    if (rbac && !rbac.canWriteData) return;
    const timer = setTimeout(() => {
      pushToCloud(cloudUrl, cloudKey, trades, profiles, recycleBin, true);
    }, 900);
    return () => clearTimeout(timer);
  }, [trades, profiles, recycleBin, cloudInitialLoaded]);

  const showToast = (msg, undoAction = null) => {
    setToast({ msg, undoAction });
    setTimeout(() => setToast(null), 5000);
  };

  const getAccountMeta = (acctNum, stageKey = '') => {
    const m = activeProfile.accountMeta?.[String(acctNum)];
    const txList = Array.isArray(m?.transactions) ? m.transactions : [];
    const totalDeposits = txList.filter((x) => x.type === 'DEPOSIT').reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const totalWithdrawals = txList.filter((x) => x.type === 'WITHDRAWAL').reduce((s, x) => s + (Number(x.amount) || 0), 0);
    return {
      firm: m?.firm || (stageKey === 'live' ? 'Personal' : 'EquityEdge'),
      size: m?.size || (stageKey === 'live' ? 'Live' : '$10K'),
      startingBalance: Number(m?.startingBalance) >= 0 ? Number(m.startingBalance) : (stageKey === 'live' ? 1000 : 10000),
      platform: m?.platform || (stageKey === 'live' ? 'cTrader' : 'MT5'),
      transactions: txList,
      totalDeposits,
      totalWithdrawals
    };
  };

  const handleUpdateAccountMeta = (acctNum, field, value) => {
    setProfiles((prev) =>
      prev.map((p) => {
        const norm = normalizeProfile(p);
        const cur = norm.accountMeta[String(acctNum)] || getAccountMeta(acctNum);
        const next = { ...cur, [field]: value };
        if (field === 'size' && SIZE_TO_NUM[value]) next.startingBalance = SIZE_TO_NUM[value];
        if (field === 'startingBalance') {
          next.startingBalance = Math.max(0, Number(value) || 0);
          next.size = NUM_TO_SIZE(next.startingBalance);
        }
        return { ...norm, accountMeta: { ...norm.accountMeta, [String(acctNum)]: next } };
      })
    );
  };

  const getStageAccountsList = (stageName) => {
    const key = STAGE_KEY_MAP[stageName];
    return key ? activeProfile.accounts[key]?.accountNumbers || [] : [];
  };

  const getStageActiveAccount = (stageName) => {
    const key = STAGE_KEY_MAP[stageName];
    if (!key) return 'ALL';
    return activeProfile.accounts[key]?.activeAccount || activeProfile.accounts[key]?.accountNumbers?.[0] || 'ALL';
  };

  const activeAccountNumber = useMemo(() => getStageActiveAccount(activeContext), [activeContext, activeProfile]);

  const setStageActiveAccount = (stageName, acctNum) => {
    const key = STAGE_KEY_MAP[stageName];
    if (!key) return;
    setSelectedCalendarDay(null);
    setProfiles((prev) =>
      prev.map((p) => {
        const norm = normalizeProfile(p);
        const list = norm.accounts[key].accountNumbers;
        const nextList = acctNum !== 'ALL' && !list.includes(String(acctNum)) ? [...list, String(acctNum)] : list;
        return { ...norm, accounts: { ...norm.accounts, [key]: { accountNumbers: nextList, activeAccount: String(acctNum) } } };
      })
    );
  };

  const handleSelectContextAndAccount = (stageName, acctNum = null) => {
    setSelectedCalendarDay(null);
    setActiveContext(stageName);
    if (acctNum !== null && stageName !== 'Unified View') {
      setStageActiveAccount(stageName, acctNum);
    }
  };

  const activeAccountDetails = useMemo(() => {
    if (activeContext === 'Unified View') {
      return { startingBalance: 21000, totalDeposits: 0, totalWithdrawals: 0, firm: 'EquityEdge', platform: 'Multi-Platform' };
    }
    const stKey = STAGE_KEY_MAP[activeContext];
    if (activeAccountNumber === 'ALL') {
      const list = getStageAccountsList(activeContext);
      const sumBal = list.reduce((s, a) => s + getAccountMeta(a, stKey).startingBalance, 0);
      const sumDep = list.reduce((s, a) => s + getAccountMeta(a, stKey).totalDeposits, 0);
      const sumWdr = list.reduce((s, a) => s + getAccountMeta(a, stKey).totalWithdrawals, 0);
      const m0 = getAccountMeta(list[0], stKey);
      return { startingBalance: sumBal || 10000, totalDeposits: sumDep, totalWithdrawals: sumWdr, firm: m0.firm, platform: m0.platform };
    }
    return getAccountMeta(activeAccountNumber, stKey);
  }, [activeContext, activeAccountNumber, activeProfile]);

  const accountSize = activeAccountDetails.startingBalance;
  const firm = activeAccountDetails.firm;
  const activePlatform = activeAccountDetails.platform;

  const contextTrades = useMemo(() => {
    if (activeContext === 'Unified View') return trades;
    return trades.filter(
      (t) => t.stage === activeContext && (activeAccountNumber === 'ALL' || String(t.accountNumber) === String(activeAccountNumber))
    );
  }, [trades, activeContext, activeAccountNumber]);

  const availableMonthsInfo = useMemo(() => {
    const map = new Map();
    contextTrades.forEach((t) => {
      const ym = getTradeYearMonth(t);
      const net = (Number(t.profit) || 0) - (Number(t.loss) || 0);
      const cur = map.get(ym) || { ym, count: 0, net: 0 };
      cur.count += 1;
      cur.net += net;
      map.set(ym, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.ym.localeCompare(b.ym));
  }, [contextTrades]);

  useEffect(() => {
    if (selectedYearMonth === 'ALL') return;
    if (!availableMonthsInfo.some((m) => m.ym === selectedYearMonth) && availableMonthsInfo.length > 0) {
      setSelectedYearMonth(availableMonthsInfo[availableMonthsInfo.length - 1].ym);
    }
  }, [activeContext, activeAccountNumber, availableMonthsInfo]);

  const periodTrades = useMemo(() => {
    if (!selectedYearMonth || selectedYearMonth === 'ALL') return contextTrades;
    return contextTrades.filter((t) => getTradeYearMonth(t) === selectedYearMonth);
  }, [contextTrades, selectedYearMonth]);

  const periodMetrics = useMemo(() => {
    const closed = periodTrades.filter((t) => t.status === 'W' || t.status === 'L');
    const wins = closed.filter((t) => t.status === 'W');
    const losses = closed.filter((t) => t.status === 'L');
    const gp = closed.reduce((s, t) => s + (Number(t.profit) || 0), 0);
    const gl = closed.reduce((s, t) => s + (Number(t.loss) || 0), 0);
    const dayMap = new Map();
    closed.forEach((t) => {
      const p = extractDateParts(t.closeDate || t.execDate);
      const k = `${p.ym}-${p.day}`;
      dayMap.set(k, (dayMap.get(k) || 0) + (Number(t.profit) || 0) - (Number(t.loss) || 0));
    });
    let greenDays = 0, redDays = 0;
    dayMap.forEach((v) => { if (v >= 0) greenDays++; else redDays++; });
    return {
      netPnl: gp - gl,
      totalClosed: closed.length,
      winsCount: wins.length,
      lossesCount: losses.length,
      winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
      greenDays,
      redDays
    };
  }, [periodTrades]);

  const metrics = useMemo(() => {
    const closed = contextTrades.filter((t) => t.status === 'W' || t.status === 'L');
    const wins = closed.filter((t) => t.status === 'W');
    const losses = closed.filter((t) => t.status === 'L');
    const gp = closed.reduce((s, t) => s + Number(t.profit || 0), 0);
    const gl = closed.reduce((s, t) => s + Number(t.loss || 0), 0);
    const netPnl = gp - gl;
    const totalClosed = closed.length;
    const winRate = totalClosed > 0 ? (wins.length / totalClosed) * 100 : 0;
    const avgWin = wins.length > 0 ? gp / wins.length : 0;
    const avgLoss = losses.length > 0 ? gl / losses.length : 0;
    const profitFactor = gl > 0 ? gp / gl : gp > 0 ? gp : 0;
    const targetPct = activeContext === 'Stage 1' ? 0.1 : 0.05;
    const profitTarget = accountSize * targetPct;
    const maxLossCap = accountSize * 0.1;
    const dailyLossCap = accountSize * 0.05;
    const uniqueDays = new Set(closed.map((t) => {
      const p = extractDateParts(t.closeDate || t.execDate);
      return `${p.ym}-${p.day}`;
    })).size;
    const totalDeposits = Number(activeAccountDetails.totalDeposits) || 0;
    const totalWithdrawals = Number(activeAccountDetails.totalWithdrawals) || 0;
    return {
      startingBalance: accountSize,
      equity: accountSize + netPnl,
      currentBalance: accountSize + netPnl + totalDeposits - totalWithdrawals,
      totalDeposits,
      totalWithdrawals,
      netPnl,
      grossProfit: gp,
      grossLoss: gl,
      winRate,
      winsCount: wins.length,
      lossesCount: losses.length,
      totalClosed,
      profitFactor,
      avgWin,
      avgLoss,
      profitTarget,
      targetPct: targetPct * 100,
      maxLossCap,
      dailyLossCap,
      uniqueDays
    };
  }, [contextTrades, accountSize, activeContext, activeAccountDetails]);

  const calendarData = useMemo(() => {
    const activeYm = selectedYearMonth === 'ALL' ? (availableMonthsInfo[availableMonthsInfo.length - 1]?.ym || '2026-10') : selectedYearMonth;
    const [y, m] = String(activeYm).split('-').map(Number);
    const year = y || 2026;
    const month = m || 10;
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPrev = new Date(year, month - 1, 0).getDate();
    const prevCells = Array.from({ length: firstWeekday }, (_, i) => ({ day: daysInPrev - firstWeekday + i + 1, currentMonth: false }));
    const mTrades = contextTrades.filter((t) => getTradeYearMonth(t) === activeYm);
    const curCells = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const closedOnDay = mTrades.filter((t) => getTradeCloseDay(t) === d && t.status !== 'O');
      const dayNet = closedOnDay.reduce((s, t) => s + Number(t.profit || 0) - Number(t.loss || 0), 0);
      const wins = closedOnDay.filter((t) => t.status === 'W').length;
      const losses = closedOnDay.filter((t) => t.status === 'L').length;
      return { day: d, currentMonth: true, ym: activeYm, closedCount: closedOnDay.length, dayNet, wins, losses };
    });
    return { activeYm, year, month, cells: [...prevCells, ...curCells] };
  }, [contextTrades, selectedYearMonth, availableMonthsInfo]);

  const equityChartData = useMemo(() => {
    let running = activeContext === 'Live Personal' ? accountSize + metrics.totalDeposits - metrics.totalWithdrawals : accountSize;
    const sorted = [...contextTrades].filter((t) => t.status !== 'O').sort((a, b) => String(a.closeDate || '').localeCompare(String(b.closeDate || '')));
    if (selectedYearMonth !== 'ALL') {
      sorted.forEach((t) => {
        if (getTradeYearMonth(t) < selectedYearMonth) running += (Number(t.profit) || 0) - (Number(t.loss) || 0);
      });
    }
    const list = selectedYearMonth === 'ALL' ? sorted : sorted.filter((t) => getTradeYearMonth(t) === selectedYearMonth);
    const pts = [{ name: 'Start', equity: Number(running.toFixed(2)), pnl: 0 }];
    list.forEach((t, idx) => {
      const net = (Number(t.profit) || 0) - (Number(t.loss) || 0);
      running += net;
      pts.push({ name: `#${idx + 1} ${t.symbol}`, equity: Number(running.toFixed(2)), pnl: Number(net.toFixed(2)) });
    });
    return pts;
  }, [contextTrades, accountSize, activeContext, metrics.totalDeposits, metrics.totalWithdrawals, selectedYearMonth]);

  const filteredTrades = useMemo(() => {
    return contextTrades.filter((t) => {
      if (selectedCalendarDay && (getTradeYearMonth(t) !== calendarData.activeYm || getTradeCloseDay(t) !== selectedCalendarDay)) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.symbol.toLowerCase().includes(q) ||
          String(t.accountNumber).toLowerCase().includes(q) ||
          String(t.ticketId).toLowerCase().includes(q) ||
          getPreTradeText(t).toLowerCase().includes(q) ||
          getPostTradeText(t).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [contextTrades, selectedCalendarDay, calendarData.activeYm, searchQuery]);

  const allAccountScreenshots = useMemo(() => {
    const list = [];
    contextTrades.forEach((t) => {
      if (Array.isArray(t.screenshots)) list.push(...t.screenshots);
    });
    return list;
  }, [contextTrades]);

  const getStageSummary = (stageName) => {
    if (stageName === 'Unified View') {
      const closed = trades.filter((t) => t.status === 'W' || t.status === 'L');
      const gp = closed.reduce((s, t) => s + Number(t.profit || 0), 0);
      const gl = closed.reduce((s, t) => s + Number(t.loss || 0), 0);
      return { count: trades.length, net: gp - gl };
    }
    const acct = getStageActiveAccount(stageName);
    const list = trades.filter((t) => t.stage === stageName && (acct === 'ALL' || String(t.accountNumber) === String(acct)));
    const closed = list.filter((t) => t.status === 'W' || t.status === 'L');
    const gp = closed.reduce((s, t) => s + Number(t.profit || 0), 0);
    const gl = closed.reduce((s, t) => s + Number(t.loss || 0), 0);
    return { count: list.length, net: gp - gl };
  };

  const handleStepMonth = (dir) => {
    setSelectedCalendarDay(null);
    const [y, m] = String(calendarData.activeYm).split('-').map(Number);
    const d = new Date(y || 2026, (m || 10) - 1 + dir, 1);
    setSelectedYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleOpenNewTradeModal = () => {
    const stg = activeContext === 'Unified View' ? 'Stage 2' : activeContext;
    const accts = getStageAccountsList(stg);
    const curA = getStageActiveAccount(stg);
    const acct = curA === 'ALL' ? accts[0] || '688964' : curA;
    setIsNewTrade(true);
    setEditingTrade({
      id: `tr-${Date.now()}`, profileId: 'profile-1', accountNumber: acct,
      ticketId: `TRD-${Math.floor(100000 + Math.random() * 900000)}`, stage: stg,
      status: 'W', side: 'Buy', execDate: '2026-10-24T09:30', closeDate: '2026-10-24T16:00',
      profit: 250, loss: 0, riskPercentage: 1.0, rMultiple: '+2.50R',
      session: 'New York', symbol: 'XAUUSD', category: 'Metals', lots: '1.00',
      entryPrice: '2738.50', exitPrice: '2760.00',
      preAnalysis: '', postAnalysis: '',
      preTradeAnalysis: { tradePlan: '' }, postTradeReview: { outcomeAnalysis: '' },
      screenshots: []
    });
    setTradeModalOpen(true);
  };

  const handleOpenEditTradeModal = (trade) => {
    setIsNewTrade(false);
    setEditingTrade(sanitizeTrade(trade));
    setTradeModalOpen(true);
  };

  const handleSaveAndAnalyzeTrade = (e) => {
    e.preventDefault();
    if (!editingTrade) return;
    const clean = sanitizeTrade(editingTrade);
    setStageActiveAccount(clean.stage, clean.accountNumber);
    if (isNewTrade) {
      setTrades((prev) => [clean, ...prev]);
      showToast(`Saved ${clean.symbol} execution (#${clean.ticketId})!`);
    } else {
      setTrades((prev) => prev.map((t) => (t.id === clean.id ? clean : t)));
      showToast(`Updated execution #${clean.ticketId} with Pre/Post notes & screenshots!`);
    }
    setTradeModalOpen(false);
    setEditingTrade(null);
  };

  const handleScreenshotUpload = (e, screenshotType) => {
    const file = e.target.files?.[0];
    if (!file || !editingTrade) return;
    if (screenshotType === 'RESULT' && editingTrade.status === 'O') {
      showToast('Result screenshot can be uploaded after the trade is closed.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      const existing = Array.isArray(editingTrade.screenshots) ? editingTrade.screenshots : [];
      const ver = existing.filter((s) => s.type === screenshotType).length + 1;
      const stageClean = editingTrade.stage.replace(/\s+/g, '').toUpperCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      const ext = file.name.split('.').pop() || 'png';
      const filename = `${editingTrade.ticketId}_${editingTrade.accountNumber}_${editingTrade.symbol}_${stageClean}_${dateStr}_${screenshotType}${ver > 1 ? `_v${ver}` : ''}.${ext}`;
      const folderPath = `/Firms/${firm}/${stageClean}/Account_${editingTrade.accountNumber}/${screenshotType === 'ENTRY' ? 'Entry' : 'Result'}`;
      const newShot = { id: `shot-${Date.now()}`, type: screenshotType, filename, folderPath, url, uploadDate: dateStr, version: ver };
      setEditingTrade({ ...editingTrade, screenshots: [...existing, newShot] });
      showToast(`Attached ${filename}`);
    };
    reader.readAsDataURL(file);
  };

  const handleBrokerHtmlUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImportError('');
    try {
      let totalFound = 0, totalImported = 0, totalDup = 0, gp = 0, gl = 0;
      let lastAcct = '', lastStage = '';
      const nextAccts = JSON.parse(JSON.stringify(activeProfile.accounts));
      const nextMeta = JSON.parse(JSON.stringify(activeProfile.accountMeta || {}));
      let nextTrades = [...trades];

      for (const file of files) {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const isUtf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || bytes[1] === 0;
        const html = isUtf16 ? new TextDecoder('utf-16le').decode(buf) : new TextDecoder('utf-8').decode(buf);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const title = doc.querySelector('title')?.textContent || '';
        const body = (doc.body?.textContent || '').replace(/\s+/g, ' ');
        const isCT = /cTrader/i.test(body) || doc.querySelector('table.dataTable') !== null;
        const acctMatch = body.match(/(?:Account|Login)\s*:\s*(\d{5,12})/i) || title.match(/(\d{5,12})/);
        const acct = acctMatch ? acctMatch[1] : activeAccountNumber;
        const stage = importTargetStage !== 'AUTO' ? importTargetStage : /Stage\s*1/i.test(title + body) ? 'Stage 1' : /Stage\s*2/i.test(title + body) ? 'Stage 2' : isCT ? 'Live Personal' : activeContext === 'Unified View' ? 'Stage 2' : activeContext;
        const stKey = STAGE_KEY_MAP[stage];
        if (stKey && acct) {
          if (!nextAccts[stKey].accountNumbers.includes(acct)) nextAccts[stKey].accountNumbers.push(acct);
          nextAccts[stKey].activeAccount = acct;
          nextMeta[acct] = {
            firm: isCT ? 'Personal' : 'EquityEdge',
            size: isCT ? 'Live' : '$10K',
            startingBalance: isCT ? 1000 : 10000,
            platform: isCT ? 'cTrader' : 'MT5',
            transactions: nextMeta[acct]?.transactions || []
          };
        }
        lastAcct = acct;
        lastStage = stage;
        const existingSet = new Set(nextTrades.filter((t) => t.stage === stage && String(t.accountNumber) === String(acct)).map((t) => String(t.ticketId)));
        const rows = Array.from(doc.querySelectorAll('tr'));
        rows.forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll('td')).filter((td) => !td.classList.contains('hidden')).map((td) => td.textContent.replace(/\s+/g, ' ').trim());
          if (isCT) {
            const oidIdx = cells.findIndex((c) => /^OID\d+/i.test(c));
            if (oidIdx !== -1 && cells.length >= oidIdx + 10) {
              totalFound++;
              const tid = cells[oidIdx];
              if (existingSet.has(tid)) { totalDup++; return; }
              existingSet.add(tid);
              const tRec = buildSeedTrade(`ct-${tid}-${Date.now()}`, tid, acct, stage, cells[oidIdx+3], cells[oidIdx+3], cells[oidIdx+1], cells[oidIdx+2], cells[oidIdx+6].replace(/Lots/i, '').trim(), cells[oidIdx+4], cells[oidIdx+5], '', '', parseFloat(cells[oidIdx+8])||0, parseFloat(cells[oidIdx+7])||0, parseFloat(cells[oidIdx+9])||0, '', '', '', file.name, 1000);
              totalImported++; gp += tRec.profit; gl += tRec.loss; nextTrades.push(tRec);
            }
          } else if (cells.length >= 13 && /^\d{4}[./-]\d{2}[./-]\d{2}/.test(cells[0]) && /^\d+$/.test(cells[1]) && /^(buy|sell)$/i.test(cells[3])) {
            totalFound++;
            const tid = cells[1];
            if (existingSet.has(tid)) { totalDup++; return; }
            existingSet.add(tid);
            const cleanNum = (v) => parseFloat(String(v).replace(/\s+/g, '')) || 0;
            const tRec = buildSeedTrade(`mt5-${tid}-${Date.now()}`, tid, acct, stage, cells[0], cells[8]||cells[0], cells[2], cells[3], cells[4], cells[5], cells[9], cells[6], cells[7], cleanNum(cells[10]), cleanNum(cells[11]), cleanNum(cells[12]), '', '', '', file.name, 10000);
            totalImported++; gp += tRec.profit; gl += tRec.loss; nextTrades.push(tRec);
          }
        });
      }

      setProfiles((prev) => prev.map((p) => ({ ...p, accounts: nextAccts, accountMeta: nextMeta })));
      setTrades(nextTrades);
      if (lastStage) setActiveContext(lastStage);
      setImportModalOpen(false);
      setImportSummaryModal({ accountNumber: lastAcct, stage: lastStage, found: totalFound, imported: totalImported, duplicates: totalDup, netResult: gp - gl });
      showToast(`Imported ${totalImported} trades into ${lastStage} (#${lastAcct})!`);
    } catch (err) {
      setImportError('Could not parse HTML file.');
    }
  };

  const currentReviewTrade = useMemo(() => {
    return trades.find((t) => t.id === reviewTradeId) || filteredTrades[0] || trades[0];
  }, [trades, reviewTradeId, filteredTrades]);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 p-4 md:p-6 font-sans">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-[#0c1428] border border-cyan-500/50 text-cyan-300 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toast.msg}</span>
          {toast.undoAction && (
            <button onClick={() => { toast.undoAction(); setToast(null); }} className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 font-bold">
              Undo
            </button>
          )}
        </div>
      )}

      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-4 cursor-zoom-out">
          <div className="max-w-5xl w-full flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-amber-300">{lightboxImage.filename}</span>
            <button onClick={() => setLightboxImage(null)} className="p-2 rounded-lg bg-slate-800 text-white"><X className="w-4 h-4" /></button>
          </div>
          <img src={lightboxImage.url} alt={lightboxImage.filename} className="max-h-[85vh] max-w-[95vw] object-contain rounded-xl border border-cyan-500/40" />
        </div>
      )}

      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* 1. CHALLENGE LIFECYCLE MATRIX */}
        <section className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5 shadow-2xl">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-6 pb-4 border-b border-slate-800/80">
            {/* Left: Crowevar Eagle-O Logo + Divider + TRADEATLAS Header */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              <div className="flex items-center select-none shrink-0" title="Crowevar">
                <svg
                  viewBox="0 0 355 72"
                  className="h-7 sm:h-11 w-auto overflow-visible"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* 'c' */}
                  <path
                    d="M42 22.5C38.5 19.5 33.5 18 28 18C15.8 18 7 26.8 7 39C7 51.2 15.8 60 28 60C33.5 60 38.5 58.5 42 55.5"
                    stroke="#F8FAFC"
                    strokeWidth="6.5"
                    strokeLinecap="round"
                  />
                  {/* 'r' */}
                  <path
                    d="M55 60V31C55 23.5 60.5 18 68 18H75"
                    stroke="#F8FAFC"
                    strokeWidth="6.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Eagle 'o' Circle + Negative-Space Falcon/Eagle Silhouette */}
                  <g transform="translate(82, 13)">
                    <circle cx="26" cy="26" r="24" fill="#F8FAFC" />
                    {/* Dark Inner Cutout forming the Eagle Crown & Hooked Beak */}
                    <path
                      d="M14 14.5C21.5 9.5 32.5 11 38.5 17.5C43 22.5 45.5 29.5 44.5 35.5C40 31.8 34 30.2 28.5 31.2C23.5 32 20.2 35.5 19.8 40.5C19.5 44 21.2 47.2 23.5 49.2C34.5 49.5 44.5 42.5 47.5 32C50.5 21 44 9 32.5 5.2C22.5 2 11.5 6.5 6.5 15.5C5 18.2 4.2 21.5 4.2 24.8C6.8 19.8 10 16.8 14 14.5Z"
                      fill="#090D1A"
                    />
                    {/* Cyan Predator Eye */}
                    <polygon points="18,18.5 28.5,20.5 24,24.2" fill="#06B6D4" />
                  </g>
                  {/* 'w' */}
                  <path
                    d="M142 19L153.5 58L166.5 22L179.5 58L191 19"
                    stroke="#F8FAFC"
                    strokeWidth="6.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* 'e' */}
                  <path
                    d="M202 38.5H239C239 26.5 230.8 18 220.5 18C209.8 18 201.5 26.8 201.5 39C201.5 51.2 210.2 60 221.5 60C228.5 60 234.2 57.5 238 53"
                    stroke="#F8FAFC"
                    strokeWidth="6.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* 'v' (Cyan) */}
                  <path
                    d="M249 19L266 58L283 19"
                    stroke="#06B6D4"
                    strokeWidth="6.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* 'a' (Cyan) */}
                  <circle
                    cx="308"
                    cy="39"
                    r="19.5"
                    stroke="#06B6D4"
                    strokeWidth="6.2"
                  />
                  <path
                    d="M327.5 19V59"
                    stroke="#06B6D4"
                    strokeWidth="6.2"
                    strokeLinecap="round"
                  />
                  {/* 'r' (Cyan) */}
                  <path
                    d="M341 59V31C341 23.5 346.5 18 354 18H359"
                    stroke="#06B6D4"
                    strokeWidth="6.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Vertical Divider */}
              <div className="hidden sm:block h-10 w-[1.5px] bg-gradient-to-b from-slate-800 via-slate-600 to-slate-800 rounded-full" />

              {/* TRADEATLAS Title & Subtitle */}
              <div className="flex flex-col justify-center">
                <h1 className="text-lg sm:text-2xl font-black tracking-wider uppercase leading-none">
                  <span className="text-white">TRADE</span>
                  <span className="text-cyan-400">ATLAS</span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium tracking-wide">
                  Navigate your complete trading journey
                </p>
              </div>
            </div>

            {/* Right: Sleek 2-Tier Account Selector & Action Toolbar */}
            <div className="flex flex-col xl:items-end gap-2.5">
              {/* Top Tier: Wide Account Selector Pill */}
              <div className="flex items-center bg-[#0d1326] border border-slate-700/80 hover:border-cyan-500/50 rounded-xl px-3.5 py-2 text-xs shadow-inner transition w-full xl:w-auto justify-between">
                <div className="flex items-center">
                  <span className="text-slate-400 font-semibold tracking-wider uppercase mr-2">
                    ACCOUNT #:
                  </span>
                  <select
                    value={
                      activeContext === 'Unified View'
                        ? 'UNIFIED::ALL'
                        : `${activeContext}::${activeAccountNumber}`
                    }
                    onChange={(e) => {
                      if (e.target.value === 'UNIFIED::ALL')
                        handleSelectContextAndAccount('Unified View');
                      else {
                        const [s, a] = e.target.value.split('::');
                        handleSelectContextAndAccount(s, a);
                      }
                    }}
                    className="bg-transparent text-slate-100 font-mono font-bold focus:outline-none cursor-pointer pr-2 w-full max-w-[230px] sm:max-w-none truncate"
                  >
                    <option value="UNIFIED::ALL" className="bg-[#0d1326]">
                      Unified View — All Accounts Combined
                    </option>
                    {['Stage 1', 'Stage 2', 'Funded Account', 'Live Personal'].map((stg) => (
                      <optgroup
                        key={stg}
                        label={stg}
                        className="bg-[#0d1326] text-cyan-300"
                      >
                        {getStageAccountsList(stg).map((a) => {
                          const m = getAccountMeta(a, STAGE_KEY_MAP[stg]);
                          return (
                            <option
                              key={`${stg}::${a}`}
                              value={`${stg}::${a}`}
                              className="bg-[#0d1326] text-slate-100"
                            >
                              {a} — {stg} ({m.firm} • {m.size} • {m.platform})
                            </option>
                          );
                        })}
                        {getStageAccountsList(stg).length > 1 && (
                          <option
                            value={`${stg}::ALL`}
                            className="bg-[#0d1326] text-emerald-300"
                          >
                            All {stg} Accounts
                          </option>
                        )}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bottom Tier: Sleek Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setAccountError('');
                    setAccountPendingDelete(null);
                    setAccountModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-[#0d162c] hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  title="Open Multi-Account Stage Manager"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add /</span>
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => setCloudModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    cloudStatus === 'Synced'
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                      : cloudStatus === 'Syncing...'
                      ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300'
                      : 'bg-[#0d1326] border-slate-700/80 text-slate-300 hover:border-cyan-500/40'
                  }`}
                  title="Configure Free Cloud Database Sync"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cloudStatus === 'Syncing...' ? 'animate-spin text-cyan-400' : cloudStatus === 'Synced' ? 'text-emerald-400' : 'text-cyan-400'}`} />
                  <span>{cloudStatus === 'Synced' ? 'Cloud Synced' : cloudStatus === 'Syncing...' ? 'Syncing...' : 'Cloud Sync'}</span>
                </button>

                <button
                  onClick={() => setMediaLibraryOpen(true)}
                  className="flex items-center gap-1.5 bg-[#0d1326] hover:bg-indigo-500/20 border border-slate-700/80 hover:border-indigo-500/40 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Vault ({allAccountScreenshots.length})</span>
                </button>

                <button
                  onClick={() => setSettingsModalOpen(true)}
                  className="flex items-center gap-1.5 bg-[#1f1610] hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Trash ({recycleBin.length})</span>
                </button>

                <button
                  onClick={() => {
                    setImportError('');
                    setImportModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-[#0c1f2c] hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Import HTML</span>
                </button>

                <button
                  onClick={handleOpenNewTradeModal}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-extrabold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Log Trade</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {['Unified View', 'Stage 1', 'Stage 2', 'Funded Account', 'Live Personal'].map((stg) => {
              const summary = getStageSummary(stg);
              const isSelected = activeContext === stg;
              const stageAccounts = getStageAccountsList(stg);
              const stageActiveAcct = getStageActiveAccount(stg);
              const activeMeta = stg !== 'Unified View' && stageActiveAcct !== 'ALL' ? getAccountMeta(stageActiveAcct, STAGE_KEY_MAP[stg]) : null;

              return (
                <div
                  key={stg}
                  onClick={() => handleSelectContextAndAccount(stg)}
                  className={`cursor-pointer rounded-xl p-4 transition-all border ${isSelected ? 'bg-[#0e192d] border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'bg-[#0b1020]/90 border-slate-800/80 hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white">{stg}</span>
                    {stg !== 'Unified View' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {stageAccounts.length} {stageAccounts.length === 1 ? 'Acct' : 'Accts'}
                      </span>
                    )}
                  </div>

                  {stg === 'Unified View' ? (
                    <div className="text-[11px] font-mono text-cyan-300 mb-2">Consolidated All Accounts</div>
                  ) : (
                    <div className="space-y-1 mb-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between bg-[#070b16] border border-slate-800 rounded-lg px-2 py-1">
                        <span className="text-[10px] text-slate-400 mr-1">Acct:</span>
                        <select value={stageActiveAcct} onChange={(e) => handleSelectContextAndAccount(stg, e.target.value)} className="bg-transparent text-[11px] font-mono font-bold text-amber-300 focus:outline-none cursor-pointer w-full">
                          {stageAccounts.map((accNum) => {
                            const m = getAccountMeta(accNum, STAGE_KEY_MAP[stg]);
                            return <option key={accNum} value={accNum} className="bg-[#0d1326]">#{accNum} ({m.platform})</option>;
                          })}
                          {stageAccounts.length > 1 && <option value="ALL" className="bg-[#0d1326]">All ({stageAccounts.length}) Accts</option>}
                        </select>
                      </div>
                      {activeMeta && (
                        <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300">{activeMeta.firm}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-emerald-300">${activeMeta.startingBalance.toLocaleString()}</span>
                          <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300">{activeMeta.platform}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`text-sm font-extrabold mb-2 ${summary.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.net >= 0 ? `+$${summary.net.toFixed(2)}` : `-$${Math.abs(summary.net).toFixed(2)}`}
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400">{stg === 'Unified View' ? 'Total' : `Acct #${stageActiveAcct}`}</span>
                    <span className="text-white font-semibold">{summary.count} trades</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. FIVE PRIMARY KPI CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {activeContext === 'Live Personal' ? (
            <div className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">CURRENT BALANCE</span>
                <button
                  type="button"
                  onClick={() => {
                    const liveAccts = getStageAccountsList('Live Personal');
                    setCashflowForm({ accountNumber: activeAccountNumber !== 'ALL' ? activeAccountNumber : liveAccts[0] || '6004822', type: 'DEPOSIT', amount: '', date: (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })(), note: '' });
                    setCashflowModalOpen(true);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold"
                >
                  + Dep / Wdr
                </button>
              </div>
              <div className="text-2xl font-extrabold text-white mt-2 mb-1">
                ${metrics.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="space-y-0.5 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                <div className="flex justify-between"><span className="text-slate-400">Deposits:</span><span className="text-emerald-400 font-bold">${metrics.totalDeposits.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Withdrawals:</span><span className="text-rose-400 font-bold">${metrics.totalWithdrawals.toFixed(2)}</span></div>
              </div>
            </div>
          ) : (
            <div className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">ACCOUNT EQUITY</span>
              <div className="text-2xl font-extrabold text-white mt-2 mb-1">
                ${metrics.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-amber-300 font-mono">
                Acct #{activeAccountNumber} Start: ${metrics.startingBalance.toLocaleString()}
              </div>
            </div>
          )}

          <div className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">NET REALIZED P&amp;L</span>
            <div className={`text-2xl font-extrabold mt-2 mb-1 ${metrics.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.netPnl >= 0 ? `+$${metrics.netPnl.toFixed(2)}` : `-$${Math.abs(metrics.netPnl).toFixed(2)}`}
            </div>
            <div className="text-xs text-slate-400">Gross W: +${metrics.grossProfit.toFixed(2)} • L: -${metrics.grossLoss.toFixed(2)}</div>
          </div>

          <div className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">WIN RATE ({metrics.winsCount}W / {metrics.lossesCount}L)</span>
            <div className="text-2xl font-extrabold text-white mt-2 mb-2">{metrics.winRate.toFixed(1)}%</div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(100, metrics.winRate)}%` }} />
            </div>
          </div>

          <div className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">PROFIT FACTOR</span>
            <div className="text-2xl font-extrabold text-amber-400 mt-2 mb-1">{metrics.profitFactor.toFixed(2)}</div>
            <div className="text-xs text-slate-400">Avg W: +${metrics.avgWin.toFixed(2)} • Avg L: -${metrics.avgLoss.toFixed(2)}</div>
          </div>

          <div className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">EXECUTIONS &amp; PLATFORM</span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2 mb-1">{metrics.totalClosed} Closed</div>
            <div className="text-xs text-cyan-300 font-mono">{firm} • {activePlatform}</div>
          </div>
        </section>

        {/* 3. PROP FIRM RULES RADAR */}
        {activeContext !== 'Live Personal' && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const maxCap = Number(metrics.maxLossCap) || accountSize * 0.1;
              const maxUsed = Math.max(0, accountSize - metrics.equity);
              const maxRem = Math.max(0, maxCap - maxUsed);
              const maxPct = Math.min(100, Math.max(0, (maxUsed / (maxCap || 1)) * 100));
              const maxSafePct = Math.max(0, 100 - maxPct);
              const barColor =
                maxPct >= 80
                  ? 'from-rose-500 to-amber-500 shadow-[0_0_10px_rgba(244,63,94,0.45)]'
                  : maxPct >= 50
                  ? 'from-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.45)]'
                  : 'from-emerald-500 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.45)]';
              return (
                <div className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">MAX LOSS (10%)</span>
                    <span className={`text-[10px] font-bold ${maxPct >= 80 ? 'text-rose-400' : maxPct >= 50 ? 'text-amber-300' : 'text-emerald-400'}`}>
                      Buffer: ${maxRem.toFixed(2)}
                    </span>
                  </div>
                  <div className={`text-xl font-extrabold mt-2 mb-1 ${maxUsed > 0 ? 'text-rose-400' : 'text-white'}`}>
                    ${maxUsed.toFixed(2)} Used
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
                    <span>Cap: ${maxCap.toFixed(2)} • Breach: ${(accountSize - maxCap).toLocaleString()}</span>
                    <span className="text-emerald-400 font-semibold">
                      ${maxRem.toFixed(2)} Remaining
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/60">
                      <div
                        className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${maxPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Drawdown Buffer</span>
                      <span className="font-mono font-semibold text-emerald-400">
                        {maxPct.toFixed(1)}% Used • {maxSafePct.toFixed(1)}% Safe
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
            {(() => {
              const dailyCap = Number(metrics.dailyLossCap) || accountSize * 0.05;
              const dayMap = new Map();
              contextTrades
                .filter((t) => t.status === 'W' || t.status === 'L')
                .forEach((t) => {
                  const p = extractDateParts(t.closeDate || t.execDate);
                  const dKey = selectedCalendarDay
                    ? p.ym === calendarData.activeYm && p.day === selectedCalendarDay
                      ? 'ACTIVE_DAY'
                      : null
                    : `${p.ym}-${String(p.day).padStart(2, '0')}`;
                  if (dKey) {
                    const net = (Number(t.profit) || 0) - (Number(t.loss) || 0);
                    dayMap.set(dKey, (dayMap.get(dKey) || 0) + net);
                  }
                });
              let activeDayNet = 0;
              if (selectedCalendarDay) {
                activeDayNet = dayMap.get('ACTIVE_DAY') || 0;
              } else if (dayMap.size > 0) {
                const sortedDays = Array.from(dayMap.keys()).sort();
                activeDayNet = dayMap.get(sortedDays[sortedDays.length - 1]) || 0;
              }
              const dailyUsed = activeDayNet < 0 ? Math.abs(activeDayNet) : 0;
              const dailyRem = Math.max(0, dailyCap - dailyUsed);
              const dailyPct = Math.min(100, Math.max(0, (dailyUsed / (dailyCap || 1)) * 100));
              const dailySafePct = Math.max(0, 100 - dailyPct);
              const barColor =
                dailyPct >= 80
                  ? 'from-rose-500 to-amber-500 shadow-[0_0_10px_rgba(244,63,94,0.45)]'
                  : dailyPct >= 50
                  ? 'from-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.45)]'
                  : 'from-emerald-500 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.45)]';
              return (
                <div className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">DAILY LOSS (5%)</span>
                    <span className={`text-[10px] font-bold ${dailyUsed >= dailyCap ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {dailyUsed >= dailyCap ? '✕ Breached' : '✓ Passing'}
                    </span>
                  </div>
                  <div className={`text-xl font-extrabold mt-2 mb-1 ${dailyUsed > 0 ? 'text-rose-400' : 'text-white'}`}>
                    ${dailyUsed.toFixed(2)} Used
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
                    <span>Daily Limit: ${dailyCap.toFixed(2)}</span>
                    <span className="text-emerald-400 font-semibold">
                      ${dailyRem.toFixed(2)} Remaining
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/60">
                      <div
                        className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${dailyPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Daily Risk Buffer</span>
                      <span className="font-mono font-semibold text-emerald-400">
                        {dailyPct.toFixed(1)}% Used • {dailySafePct.toFixed(1)}% Safe
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white">PROFIT TARGET ({metrics.targetPct}%)</span>
                <span className="text-[10px] text-indigo-300 font-bold">
                  {((Math.max(0, metrics.netPnl) / (metrics.profitTarget || 1)) * 100).toFixed(1)}% Done
                </span>
              </div>
              <div className="text-xl font-extrabold text-indigo-400 mt-2 mb-1">
                ${metrics.netPnl.toFixed(2)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
                <span>Target: ${metrics.profitTarget.toFixed(2)}</span>
                <span className="text-indigo-300 font-semibold">
                  ${Math.max(0, metrics.profitTarget - metrics.netPnl).toFixed(2)} Remaining
                </span>
              </div>
              <div className="space-y-1">
                <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/60">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.45)]"
                    style={{
                      width: `${Math.min(100, Math.max(0, (metrics.netPnl / (metrics.profitTarget || 1)) * 100))}%`
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Goal Progress</span>
                  <span className="font-mono font-semibold text-indigo-300">
                    {((Math.max(0, metrics.netPnl) / (metrics.profitTarget || 1)) * 100).toFixed(1)}% Complete
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5">
              <div className="flex justify-between"><span className="text-xs font-bold text-white">TRADING DAYS</span><span className="text-[10px] text-emerald-400 font-bold">{metrics.uniqueDays >= 2 ? '✓ Passed' : 'In Progress'}</span></div>
              <div className="text-xl font-extrabold text-emerald-400 mt-2 mb-1">{metrics.uniqueDays} Days</div>
              <div className="text-xs text-slate-400">Min 2 Days Required</div>
            </div>
          </section>
        )}

        {/* 4. PERFORMANCE & EXECUTION ANALYTICS (WITH MONTH / YEAR NAVIGATION) */}
        <section className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"><CalendarIcon className="w-5 h-5" /></div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Performance &amp; Execution Analytics — Account #{activeAccountNumber}
                </h2>
                <p className="text-xs text-slate-400">Use Month/Year controls or click any Available Data Month pill below.</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#0d1326] p-1 rounded-xl border border-slate-800">
              <button onClick={() => setAnalyticsTab('calendar')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${analyticsTab === 'calendar' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}>Trading Calendar</button>
              <button onClick={() => setAnalyticsTab('results')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${analyticsTab === 'results' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}>Results Plotting</button>
              <button onClick={() => setAnalyticsTab('equity')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${analyticsTab === 'equity' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}>Equity Trajectory</button>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#0b1020] border border-slate-800 rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => handleStepMonth(-1)} className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"><ChevronLeft className="w-4 h-4" /></button>
              <select
                value={calendarData.month}
                onChange={(e) => { setSelectedCalendarDay(null); setSelectedYearMonth(`${calendarData.year}-${String(e.target.value).padStart(2, '0')}`); }}
                className="bg-[#0d1326] border border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
              >
                {MONTH_NAMES.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
              </select>
              <select
                value={calendarData.year}
                onChange={(e) => { setSelectedCalendarDay(null); setSelectedYearMonth(`${e.target.value}-${String(calendarData.month).padStart(2, '0')}`); }}
                className="bg-[#0d1326] border border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-amber-300"
              >
                {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button type="button" onClick={() => handleStepMonth(1)} className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"><ChevronRight className="w-4 h-4" /></button>
              <button
                type="button"
                onClick={() => { setSelectedCalendarDay(null); setSelectedYearMonth((prev) => (prev === 'ALL' ? (availableMonthsInfo[availableMonthsInfo.length - 1]?.ym || '2026-10') : 'ALL')); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${selectedYearMonth === 'ALL' ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-[#0d1326] text-slate-300 border-slate-700'}`}
              >
                {selectedYearMonth === 'ALL' ? '✓ All Months Active' : 'View All Months'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="bg-[#090d1a] border border-slate-800 px-3 py-1.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">PERIOD P&amp;L</span>
                <strong className={periodMetrics.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {periodMetrics.netPnl >= 0 ? `+$${periodMetrics.netPnl.toFixed(2)}` : `-$${Math.abs(periodMetrics.netPnl).toFixed(2)}`}
                </strong>
              </div>
              <div className="bg-[#090d1a] border border-slate-800 px-3 py-1.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">GREEN / RED DAYS</span>
                <strong className="text-emerald-400">{periodMetrics.greenDays}W</strong> / <strong className="text-rose-400">{periodMetrics.redDays}L</strong>
              </div>
              <div className="bg-[#090d1a] border border-slate-800 px-3 py-1.5 rounded-xl">
                <span className="text-slate-400 block text-[10px]">PERIOD WIN RATE</span>
                <strong className="text-cyan-400">{periodMetrics.winRate.toFixed(1)}% ({periodMetrics.totalClosed}t)</strong>
              </div>
            </div>
          </div>

          {availableMonthsInfo.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1">Available Data Months:</span>
              {availableMonthsInfo.map((m) => (
                <button
                  key={m.ym}
                  type="button"
                  onClick={() => { setSelectedCalendarDay(null); setSelectedYearMonth(m.ym); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border flex items-center gap-1.5 ${selectedYearMonth === m.ym ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' : 'bg-[#0b1020] border-slate-800 text-slate-400'}`}
                >
                  <span>{formatYmShort(m.ym)} ({m.count}t)</span>
                  <span className={m.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{m.net >= 0 ? `+$${m.net.toFixed(0)}` : `-$${Math.abs(m.net).toFixed(0)}`}</span>
                </button>
              ))}
            </div>
          )}

          {analyticsTab === 'calendar' && (
            <div className="grid grid-cols-7 gap-2">
              {['SUN','MON','TUE','WED','THU','FRI','SAT'].map((d) => <div key={d} className="text-center text-[11px] font-bold text-slate-500">{d}</div>)}
              {calendarData.cells.map((cell, idx) => (
                <div
                  key={idx}
                  onClick={() => cell.currentMonth && setSelectedCalendarDay((prev) => (prev === cell.day ? null : cell.day))}
                  className={`min-h-[75px] rounded-xl p-2.5 border transition cursor-pointer ${!cell.currentMonth ? 'bg-[#070b14]/40 border-slate-900 text-slate-600' : selectedCalendarDay === cell.day ? 'border-cyan-400 bg-cyan-950/40' : cell.closedCount > 0 ? (cell.dayNet >= 0 ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-rose-500/40 bg-rose-950/20') : 'border-slate-800 bg-[#0b1020]'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold">{cell.day}</span>
                    {cell.closedCount > 0 && <span className="text-[10px] text-slate-400">{cell.closedCount}t</span>}
                  </div>
                  {cell.closedCount > 0 && (
                    <div className={`text-xs font-extrabold mt-1 ${cell.dayNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {cell.dayNet >= 0 ? `+$${cell.dayNet.toFixed(2)}` : `-$${Math.abs(cell.dayNet).toFixed(2)}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {analyticsTab === 'results' && (
            <div className="h-64 bg-[#0b1020] border border-slate-800 rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={equityChartData.slice(1)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d1a', borderColor: '#334155' }} />
                  <ReferenceLine y={0} stroke="#475569" />
                  <Bar dataKey="pnl">
                    {equityChartData.slice(1).map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#f43f5e'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {analyticsTab === 'equity' && (
            <div className="h-64 bg-[#0b1020] border border-slate-800 rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d1a', borderColor: '#334155' }} />
                  <Area type="monotone" dataKey="equity" stroke="#22d3ee" fill="#06b6d4" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* 6. EXECUTION JOURNAL & TRADE LEDGER */}
        <section className="bg-[#090d1a]/90 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Execution Journal &amp; Trade Ledger ({filteredTrades.length} Trades)</h2>
              <p className="text-xs text-slate-400">Click any row to review Pre/Post-Trade notes &amp; side-by-side screenshots, or click the Pencil icon (✏) to edit.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="text" placeholder="Search symbol, ticket, notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-[#0d1326] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white" />
              <button onClick={handleOpenNewTradeModal} className="flex items-center gap-1.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-semibold">
                <Plus className="w-3.5 h-3.5" /><span>+ Log Trade</span>
              </button>
            </div>
          </div>

          {/* EXECUTION JOURNAL & TRADE LEDGER EXPORT BAR (CSV & HTML WITH SCREENSHOTS/NOTES) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b1122] border border-slate-800/90 rounded-xl px-4 py-2.5 mb-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Download className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-bold text-white">Export Trade Ledger, Notes &amp; Screenshots:</span>
              <div className="inline-flex rounded-lg bg-[#070b16] p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLedgerExportScope('CURRENT')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    ledgerExportScope === 'CURRENT'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Current View ({filteredTrades.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerExportScope('ALL')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    ledgerExportScope === 'ALL'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Accounts ({trades.length})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportLedgerCSV}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold transition shadow-sm"
                title="Export trades, Pre/Post-Trade notes, and screenshot data to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV (with Notes &amp; Screenshots)</span>
              </button>

              <button
                type="button"
                onClick={handleExportLedgerHTML}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold transition shadow-sm"
                title="Export standalone HTML report with embedded screenshots and full Pre/Post-Trade notes"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export HTML Report (with Photos &amp; Notes)</span>
              </button>
            </div>
          </div>

          {/* MOBILE VIEW SWITCHER & TOUCH-FRIENDLY TRADE CARDS (VISIBLE ON MOBILE DEVICES) */}
          <div className="flex md:hidden items-center justify-between bg-[#090e1f] border border-slate-800 rounded-xl px-3 py-2 mb-3 text-xs">
            <span className="text-slate-400 font-semibold">Mobile Display Mode:</span>
            <div className="inline-flex rounded-lg bg-[#050811] p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => setMobileLedgerMode('CARDS')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                  mobileLedgerMode === 'CARDS'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400'
                }`}
              >
                📱 Cards ({filteredTrades.length})
              </button>
              <button
                type="button"
                onClick={() => setMobileLedgerMode('TABLE')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                  mobileLedgerMode === 'TABLE'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400'
                }`}
              >
                📋 Full Table
              </button>
            </div>
          </div>

          {mobileLedgerMode === 'CARDS' && (
            <div className="md:hidden space-y-3 mb-4">
              {filteredTrades.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-[#0b1020] rounded-2xl border border-slate-800 text-xs">
                  No trades match the current filter.
                </div>
              ) : (
                filteredTrades.map((t) => {
                  const prof = Number(t.profit) || 0;
                  const loss = Number(t.loss) || 0;
                  const net = prof - loss;
                  const shots = Array.isArray(t.screenshots) ? t.screenshots : [];
                  const preText =
                    typeof t.preTradeAnalysis === 'string'
                      ? t.preTradeAnalysis
                      : t.preTradeAnalysis?.tradePlan || t.preAnalysis || '';
                  const postText =
                    typeof t.postTradeReview === 'string'
                      ? t.postTradeReview
                      : t.postTradeReview?.outcomeAnalysis || t.postAnalysis || '';

                  return (
                    <div
                      key={`mob-${t.id}`}
                      onClick={() => {
                        setReviewTrade(t);
                        setIsReviewEditMode(false);
                      }}
                      className="bg-[#0b1122] border border-slate-800/90 active:border-cyan-500/60 rounded-2xl p-3.5 space-y-2.5 text-xs shadow-md transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                        <div>
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="font-mono font-bold text-amber-300">#{t.ticketId}</span>
                            <span className="font-extrabold text-white text-sm">{t.symbol}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.side === 'Buy'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {t.side} • {t.lots ?? 1}L
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {t.stage} • Acct #{t.accountNumber} • {t.execDate}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`text-sm font-extrabold font-mono ${
                              t.status === 'O'
                                ? 'text-cyan-300'
                                : net >= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {t.status === 'O'
                              ? 'OPEN'
                              : net >= 0
                              ? `+$${net.toFixed(2)}`
                              : `-$${Math.abs(net).toFixed(2)}`}
                          </div>
                          <span
                            className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'W'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : t.status === 'L'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                          >
                            {t.status === 'W' ? '✓ Won' : t.status === 'L' ? '✕ Lost' : '◉ Open'}
                          </span>
                        </div>
                      </div>

                      {(preText || postText) && (
                        <div className="grid grid-cols-1 gap-1.5 text-[11px] bg-[#070b16] rounded-xl p-2.5 border border-slate-800/80">
                          {preText && (
                            <div className="truncate text-slate-300">
                              <strong className="text-cyan-400">1. PRE: </strong>
                              {preText}
                            </div>
                          )}
                          {postText && (
                            <div className="truncate text-slate-300">
                              <strong className="text-indigo-400">2. POST: </strong>
                              {postText}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 text-[10px]">
                            {t.session || 'NY'}
                          </span>
                          {shots.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                              📸 {shots.length} Photo{shots.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setReviewTrade(t);
                              setIsReviewEditMode(false);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-[11px]"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(t)}
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-semibold text-[11px]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRequest(t)}
                            className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className={(mobileLedgerMode === "CARDS" ? "hidden md:block " : "block ") + "overflow-x-auto"}>
            <table className="w-full text-left border-collapse min-w-[1150px]">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0b1020] text-[11px] font-bold uppercase text-slate-400">
                  <th className="py-3.5 px-3">STAGE &amp; ACCOUNT #</th>
                  <th className="py-3.5 px-3">DATE</th>
                  <th className="py-3.5 px-3">SYMBOL &amp; SIDE</th>
                  <th className="py-3.5 px-3">STATUS</th>
                  <th className="py-3.5 px-3">NET P&amp;L ($)</th>
                  <th className="py-3.5 px-3">SCREENSHOTS</th>
                  <th className="py-3.5 px-3">JOURNALING (PRE &amp; POST)</th>
                  <th className="py-3.5 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {filteredTrades.map((t) => {
                  const entryShots = (t.screenshots || []).filter((s) => s.type === 'ENTRY');
                  const resultShots = (t.screenshots || []).filter((s) => s.type === 'RESULT');
                  return (
                    <tr key={t.id} onClick={() => { setReviewTradeId(t.id); setReviewModalOpen(true); }} className="hover:bg-[#0e192d] transition cursor-pointer">
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-indigo-300">{t.stage}</span>
                        <div className="font-mono text-[10px] text-amber-300">Acct #{t.accountNumber} • #{t.ticketId}</div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-300">{t.execDate?.replace('T', ' ')}</td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-white underline">{t.symbol}</span>
                            <span className={"ml-2 px-1.5 py-0.5 rounded text-[10px] " + (t.side === "Buy" ? "bg-emerald-950 text-emerald-300" : "bg-rose-950 text-rose-300")}>{t.side}</span>
                      </td>
                      <td className="py-3.5 px-3">
                            <span className={"px-2.5 py-1 rounded-full text-[11px] font-bold " + (t.status === "W" ? "bg-emerald-500/15 text-emerald-400" : t.status === "L" ? "bg-rose-500/15 text-rose-400" : "bg-cyan-500/15 text-cyan-400")}>
                          {t.status === 'W' ? '✓ Won' : t.status === 'L' ? '✕ Lost' : '◉ Open'}
                        </span>
                      </td>
                      <td className={`py-3.5 px-3 font-bold ${t.status === 'O' ? 'text-cyan-400' : t.profit >= t.loss ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.status === 'O' ? 'Pending' : t.profit >= t.loss ? `+$${(t.profit - t.loss).toFixed(2)}` : `-$${Math.abs(t.profit - t.loss).toFixed(2)}`}
                      </td>
                      <td className="py-3.5 px-3 space-x-1">
                        {entryShots.length > 0 && <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] border border-cyan-500/30">📷 Entry ({entryShots.length})</span>}
                        {resultShots.length > 0 && <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] border border-emerald-500/30">📊 Result ({resultShots.length})</span>}
                        {entryShots.length === 0 && resultShots.length === 0 && <span className="text-slate-600 italic">None</span>}
                      </td>
                      <td className="py-3.5 px-3 max-w-xs space-y-1">
                        <div className="flex items-center gap-1.5 bg-[#0b1629] border border-cyan-500/30 rounded-lg px-2 py-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[9px] shrink-0">1. PRE</span>
                          <span className="truncate text-slate-200 text-[11px]">{getPreTradeText(t)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#10142d] border border-indigo-500/30 rounded-lg px-2 py-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[9px] shrink-0">2. POST</span>
                          <span className="truncate text-slate-300 text-[11px]">{getPostTradeText(t)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          <button type="button" onClick={() => { setReviewTradeId(t.id); setReviewModalOpen(true); }} className="p-1.5 rounded bg-indigo-500/20 text-indigo-300"><Eye className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleOpenEditTradeModal(t)} className="p-1.5 rounded bg-cyan-500/20 text-cyan-300"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => { setTradePendingDelete(t); setDeleteConfirmText(''); setSecureDeleteModalOpen(true); }} className="p-1.5 rounded bg-rose-500/20 text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* TRADE REVIEW MODAL (WITH SIDE-BY-SIDE SCREENSHOTS & PRE/POST NOTES) */}
      {reviewModalOpen && currentReviewTrade && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#090d1a] border border-cyan-500/60 rounded-3xl max-w-5xl w-full p-6 space-y-5 my-6 max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-white">Trade Review — #{currentReviewTrade.ticketId} ({currentReviewTrade.symbol})</h3>
                <p className="text-slate-400">Account #{currentReviewTrade.accountNumber} • {currentReviewTrade.stage}</p>
              </div>
              <button onClick={() => setReviewModalOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-300"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['ENTRY', 'RESULT'].map((typeKey) => {
                const shots = (currentReviewTrade.screenshots || []).filter((s) => s.type === typeKey);
                const latest = shots[shots.length - 1];
                return (
                  <div key={typeKey} className="bg-[#0b1020] border border-slate-800 rounded-2xl p-4 space-y-2">
                    <span className={`font-bold ${typeKey === 'ENTRY' ? 'text-cyan-300' : 'text-emerald-300'}`}>
                      {typeKey === 'ENTRY' ? '📈 Entry Screenshot (Setup)' : '📊 Result Screenshot (Outcome)'}
                    </span>
                    <div className="aspect-video bg-black/60 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center p-2">
                      {!latest ? (
                        <span className="text-slate-500 italic">No {typeKey} screenshot attached — click Edit Trade below to upload</span>
                      ) : latest.url ? (
                        <img src={latest.url} alt={latest.filename} className="w-full h-full object-cover rounded-lg cursor-zoom-in" onClick={() => setLightboxImage(latest)} />
                      ) : (
                        <div className="font-mono text-amber-300">{latest.filename}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-[#0b1020] border border-cyan-500/30 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-cyan-300 uppercase">1. Pre-Trade Analysis (Before Trade)</h4>
              <div className="bg-[#070b16] p-3 rounded-xl border border-slate-800 text-slate-200 whitespace-pre-wrap">{getPreTradeText(currentReviewTrade)}</div>
            </div>

            <div className="bg-[#0b1020] border border-indigo-500/30 rounded-2xl p-4 space-y-2">
              <h4 className="font-bold text-indigo-300 uppercase">2. Post-Trade Review (After Trade)</h4>
              <div className="bg-[#070b16] p-3 rounded-xl border border-slate-800 text-slate-200 whitespace-pre-wrap">{getPostTradeText(currentReviewTrade)}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button onClick={() => setReviewModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Close</button>
              <button onClick={() => { setReviewModalOpen(false); handleOpenEditTradeModal(currentReviewTrade); }} className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-extrabold">
                Edit Trade &amp; Screenshots
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG TRADE / EDIT TRADE MODAL */}
      {tradeModalOpen && editingTrade && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#090d1a] border border-cyan-500/50 rounded-3xl max-w-4xl w-full p-6 space-y-5 my-6 max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">{isNewTrade ? 'Log Professional Trade Execution' : `Edit Execution #${editingTrade.ticketId}`}</h3>
              <button onClick={() => setTradeModalOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveAndAnalyzeTrade} className="space-y-5">
              {/* 1. Stage & Account */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {['Stage 1', 'Stage 2', 'Funded Account', 'Live Personal'].map((stg) => (
                  <div
                    key={stg}
                    onClick={() => setEditingTrade({ ...editingTrade, stage: stg, accountNumber: getStageAccountsList(stg)[0] || editingTrade.accountNumber })}
                    className={`cursor-pointer rounded-xl p-3 border text-center ${editingTrade.stage === stg ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 font-bold' : 'bg-[#0d1326] border-slate-800 text-slate-300'}`}
                  >
                    <div>{stg}</div>
                    <div className="text-[10px] font-mono text-amber-300 mt-0.5">Acct #{getStageActiveAccount(stg)}</div>
                  </div>
                ))}
              </div>

              {/* 2. Status */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { k: 'W', l: '✓ Won (W)', c: 'border-emerald-500 bg-emerald-950/40 text-emerald-300' },
                  { k: 'L', l: '✕ Lost (L)', c: 'border-rose-500 bg-rose-950/40 text-rose-300' },
                  { k: 'O', l: '◉ Open / Active (O)', c: 'border-cyan-500 bg-cyan-950/40 text-cyan-300' }
                ].map((st) => (
                  <button
                    key={st.k}
                    type="button"
                    onClick={() => setEditingTrade({ ...editingTrade, status: st.k, profit: st.k === 'L' || st.k === 'O' ? 0 : editingTrade.profit, loss: st.k === 'W' || st.k === 'O' ? 0 : editingTrade.loss })}
                    className={`py-2.5 rounded-xl font-bold border ${editingTrade.status === st.k ? st.c : 'bg-[#0d1326] border-slate-800 text-slate-400'}`}
                  >
                    {st.l}
                  </button>
                ))}
              </div>

              {/* 3. Financials */}
              <div className="bg-[#0b1020] border border-slate-800 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Symbol *</label>
                  <input type="text" value={editingTrade.symbol} onChange={(e) => setEditingTrade({ ...editingTrade, symbol: e.target.value.toUpperCase() })} className="w-full bg-[#0d1326] border border-slate-700 rounded-lg px-3 py-2 text-white font-bold" required />
                </div>
                <div>
                  <label className="block text-emerald-400 mb-1">Profit ($)</label>
                  <input type="number" step="0.01" disabled={editingTrade.status === 'L' || editingTrade.status === 'O'} value={editingTrade.status === 'L' || editingTrade.status === 'O' ? 0 : editingTrade.profit} onChange={(e) => setEditingTrade({ ...editingTrade, profit: e.target.value })} className={`w-full rounded-lg px-3 py-2 font-bold ${editingTrade.status === 'O' ? 'bg-[#2a2a2a] opacity-50 cursor-not-allowed' : 'bg-[#0d1326] border border-emerald-500/40 text-emerald-400'}`} />
                </div>
                <div>
                  <label className="block text-rose-400 mb-1">Loss ($)</label>
                  <input type="number" step="0.01" disabled={editingTrade.status === 'W' || editingTrade.status === 'O'} value={editingTrade.status === 'W' || editingTrade.status === 'O' ? 0 : editingTrade.loss} onChange={(e) => setEditingTrade({ ...editingTrade, loss: e.target.value })} className={`w-full rounded-lg px-3 py-2 font-bold ${editingTrade.status === 'O' ? 'bg-[#2a2a2a] opacity-50 cursor-not-allowed' : 'bg-[#0d1326] border border-rose-500/40 text-rose-400'}`} />
                </div>
                <div>
                  <label className="block text-amber-400 mb-1">Risk (%)</label>
                  <input type="number" step="0.01" value={editingTrade.riskPercentage ?? 1.0} onChange={(e) => setEditingTrade({ ...editingTrade, riskPercentage: e.target.value })} className="w-full bg-[#0d1326] border border-amber-500/40 rounded-lg px-3 py-2 text-amber-300 font-bold" />
                </div>
              </div>

              {/* 4. Pre-Trade Analysis */}
              <div className="bg-[#0b1326] border border-cyan-500/35 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-cyan-300 uppercase">1. PRE-TRADE ANALYSIS (BEFORE TRADE)</h4>
                <textarea
                  rows={3}
                  value={getPreTradeText(editingTrade)}
                  onChange={(e) => setEditingTrade({ ...editingTrade, preAnalysis: e.target.value, preTradeAnalysis: { ...(editingTrade.preTradeAnalysis || {}), tradePlan: e.target.value } })}
                  placeholder="Trade setup & reasoning, confluence factors, entry criteria, market structure & bias, risk assessment & trade plan..."
                  className="w-full bg-[#070b16] border border-cyan-500/40 rounded-xl p-3 text-white"
                />
              </div>

              {/* 5. Post-Trade Review */}
              <div className="bg-[#0f1329] border border-indigo-500/35 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-indigo-300 uppercase">2. POST-TRADE REVIEW (AFTER TRADE)</h4>
                <textarea
                  rows={3}
                  value={getPostTradeText(editingTrade)}
                  onChange={(e) => setEditingTrade({ ...editingTrade, postAnalysis: e.target.value, postTradeReview: { ...(editingTrade.postTradeReview || {}), outcomeAnalysis: e.target.value } })}
                  placeholder="Trade outcome & execution analysis, what worked well, mistakes or deviations from the plan, lessons learned, improvement actions..."
                  className="w-full bg-[#070b16] border border-indigo-500/40 rounded-xl p-3 text-white"
                />
              </div>

              {/* 6. Screenshot Attachments */}
              <div className="bg-[#0b1020] border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-cyan-400 uppercase">Screenshot Attachments</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['ENTRY', 'RESULT'].map((typeKey) => (
                    <div key={typeKey} className="border border-slate-700 rounded-xl p-3 bg-[#0d1326]/60 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-cyan-300">{typeKey} Screenshot</span>
                        {!(typeKey === 'RESULT' && editingTrade.status === 'O') && (
                          <label className="cursor-pointer px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-semibold">
                            Upload {typeKey}
                            <input type="file" accept="image/*" onChange={(e) => handleScreenshotUpload(e, typeKey)} className="hidden" />
                          </label>
                        )}
                      </div>
                      {(editingTrade.screenshots || []).filter((s) => s.type === typeKey).map((shot) => (
                        <div key={shot.id} className="bg-[#070b16] border border-slate-800 rounded-lg p-2 space-y-1.5">
                          {shot.url && <img src={shot.url} alt={shot.filename} className="w-full h-28 object-cover rounded cursor-zoom-in" onClick={() => setLightboxImage(shot)} />}
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-amber-300 truncate">{shot.filename}</span>
                            <button type="button" onClick={() => setEditingTrade({ ...editingTrade, screenshots: editingTrade.screenshots.filter((x) => x.id !== shot.id) })} className="text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setTradeModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-extrabold">Save &amp; Analyze Execution</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MULTI-ACCOUNT STAGE MANAGER MODAL */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#090d1a] border border-cyan-500/50 rounded-3xl max-w-2xl w-full p-5 space-y-4 my-6 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Multi-Account Stage Manager</h3>
              <button onClick={() => { setAccountPendingDelete(null); setAccountModalOpen(false); }} className="p-1.5 rounded-lg bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            {accountError && <div className="bg-rose-950/60 border border-rose-500 text-rose-200 p-2.5 rounded-xl">{accountError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { label: 'Stage 1', key: 'stage1' },
                { label: 'Stage 2', key: 'stage2' },
                { label: 'Funded Account', key: 'funded' },
                { label: 'Live Personal', key: 'live' }
              ].map((st) => {
                const stObj = activeProfile.accounts[st.key] || { accountNumbers: [], activeAccount: '' };
                const draft = newAcctMeta[st.key];
                return (
                  <div key={st.key} className="bg-[#0b1020] border border-slate-800 rounded-2xl p-3.5 space-y-2">
                    <div className="flex justify-between font-bold text-white"><span>{st.label}</span><span className="text-cyan-400">{stObj.accountNumbers.length} Accts</span></div>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {stObj.accountNumbers.map((accNum) => {
                        const meta = getAccountMeta(accNum, st.key);
                        return (
                          <div key={accNum} className="p-2 rounded-xl bg-[#070b16] border border-slate-800 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span onClick={() => handleSelectContextAndAccount(st.label, accNum)} className="font-mono font-bold text-amber-300 cursor-pointer">#{accNum}</span>
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => handleSelectContextAndAccount(st.label, accNum)} className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">Select</button>
                                {stObj.accountNumbers.length > 1 ? (
                                  <button type="button" onClick={() => { setAccountPendingDelete({ stageKey: st.key, stageLabel: st.label, acctNum: accNum }); setAccountDeleteConfirmText(''); }} className="p-1 text-rose-400"><Trash2 className="w-3 h-3" /></button>
                                ) : <Lock className="w-3 h-3 text-slate-600" />}
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              <select value={meta.firm} onChange={(e) => handleUpdateAccountMeta(accNum, 'firm', e.target.value)} className="bg-[#0d1326] border border-slate-700 rounded px-1 py-0.5 text-[10px] text-cyan-300">{FIRM_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}</select>
                              <select value={meta.size} onChange={(e) => handleUpdateAccountMeta(accNum, 'size', e.target.value)} className="bg-[#0d1326] border border-slate-700 rounded px-1 py-0.5 text-[10px] text-emerald-300">{SIZE_OPTIONS.map((sz) => <option key={sz} value={sz}>{sz}</option>)}</select>
                              <input type="number" value={meta.startingBalance} onChange={(e) => handleUpdateAccountMeta(accNum, 'startingBalance', e.target.value)} className="bg-[#0d1326] border border-slate-700 rounded px-1 py-0.5 text-[10px] text-amber-300 font-mono" />
                              <select value={meta.platform} onChange={(e) => handleUpdateAccountMeta(accNum, 'platform', e.target.value)} className="bg-[#0d1326] border border-slate-700 rounded px-1 py-0.5 text-[10px] text-indigo-300">{PLATFORM_OPTIONS.map((pl) => <option key={pl} value={pl}>{pl}</option>)}</select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <input type="text" placeholder={`New ${st.label} Acct #...`} value={newAcctInput[st.key] || ''} onChange={(e) => setNewAcctInput({ ...newAcctInput, [st.key]: e.target.value })} className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-2 py-1 text-white font-mono" />
                      <button
                        type="button"
                        onClick={() => {
                          const clean = String(newAcctInput[st.key] || '').trim();
                          if (!clean) return;
                          setProfiles((prev) => prev.map((p) => {
                            const norm = normalizeProfile(p);
                            const list = norm.accounts[st.key].accountNumbers;
                            return {
                              ...norm,
                              accountMeta: { ...norm.accountMeta, [clean]: { ...draft, transactions: [] } },
                              accounts: { ...norm.accounts, [st.key]: { accountNumbers: [...list, clean], activeAccount: clean } }
                            };
                          }));
                          setNewAcctInput({ ...newAcctInput, [st.key]: '' });
                          showToast(`Added Account #${clean}!`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {accountPendingDelete && (
              <div className="bg-rose-950/30 border border-rose-500 rounded-2xl p-4 space-y-2">
                <p className="text-white font-bold">Type DELETE or {accountPendingDelete.acctNum} to confirm removing #{accountPendingDelete.acctNum}:</p>
                <input type="text" value={accountDeleteConfirmText} onChange={(e) => setAccountDeleteConfirmText(e.target.value)} className="w-full bg-[#070b16] border border-rose-500/40 rounded-lg px-3 py-1.5 text-white font-mono" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setAccountPendingDelete(null)} className="px-3 py-1.5 rounded bg-slate-800 text-white">Cancel</button>
                  <button
                    type="button"
                    disabled={accountDeleteConfirmText.trim() !== 'DELETE' && accountDeleteConfirmText.trim() !== accountPendingDelete.acctNum}
                    onClick={() => {
                      const { stageKey, acctNum } = accountPendingDelete;
                      setProfiles((prev) => prev.map((p) => {
                        const norm = normalizeProfile(p);
                        const nextList = norm.accounts[stageKey].accountNumbers.filter((a) => a !== acctNum);
                        return { ...norm, accounts: { ...norm.accounts, [stageKey]: { accountNumbers: nextList, activeAccount: nextList[0] } } };
                      }));
                      setAccountPendingDelete(null);
                      showToast(`Removed Account #${acctNum}`);
                    }}
                    className="px-3 py-1.5 rounded bg-rose-600 text-white font-bold disabled:opacity-40"
                  >
                    Confirm Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIVE DEPOSITS / WITHDRAWALS MODAL */}
      {cashflowModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090d1a] border border-cyan-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Live Deposits &amp; Withdrawals (#{cashflowForm.accountNumber})</h3>
              <button onClick={() => setCashflowModalOpen(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = Math.abs(parseFloat(cashflowForm.amount) || 0);
                if (amt <= 0) return;
                const m = getAccountMeta(cashflowForm.accountNumber, 'live');
                const newTx = { id: `tx-${Date.now()}`, type: cashflowForm.type, amount: amt, date: cashflowForm.date, note: cashflowForm.note || cashflowForm.type };
                handleUpdateAccountMeta(cashflowForm.accountNumber, 'transactions', [newTx, ...m.transactions]);
                setCashflowForm({ ...cashflowForm, amount: '', note: '' });
                showToast(`Recorded $${amt.toFixed(2)} ${cashflowForm.type.toLowerCase()}!`);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-2">
                <select value={cashflowForm.type} onChange={(e) => setCashflowForm({ ...cashflowForm, type: e.target.value })} className="bg-[#0d1326] border border-slate-700 rounded-xl px-3 py-2 text-white font-bold">
                  <option value="DEPOSIT">Deposit (+)</option>
                  <option value="WITHDRAWAL">Withdrawal (-)</option>
                </select>
                <input type="number" step="0.01" placeholder="Amount ($)" value={cashflowForm.amount} onChange={(e) => setCashflowForm({ ...cashflowForm, amount: e.target.value })} className="bg-[#0d1326] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono" required />
              </div>
              <button type="submit" className="w-full py-2 rounded-xl bg-cyan-500 text-slate-950 font-extrabold">+ Record Transaction</button>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT HTML MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090d1a] border border-cyan-500/50 rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Import Broker HTML Statement</h3>
              <button onClick={() => setImportModalOpen(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            {importError && <div className="text-rose-400">{importError}</div>}
            <div className="border-2 border-dashed border-cyan-500/40 rounded-2xl p-8 text-center bg-[#0d1326]/60 relative cursor-pointer">
              <input type="file" accept=".html,.htm" multiple onChange={handleBrokerHtmlUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <UploadCloud className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <p className="font-bold text-white">Click or Drag &amp; Drop .HTML / .HTM Statement Files</p>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT SUMMARY MODAL */}
      {importSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#090d1a] border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 space-y-3 text-xs">
            <h3 className="text-base font-bold text-white">Import Completed (#{importSummaryModal.accountNumber})</h3>
            <p className="text-slate-300">Imported <strong>{importSummaryModal.imported}</strong> trades into <strong>{importSummaryModal.stage}</strong>.</p>
            <button onClick={() => setImportSummaryModal(null)} className="w-full py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold">Done</button>
          </div>
        </div>
      )}

      {/* SECURE TRADE DELETE MODAL */}
      {secureDeleteModalOpen && tradePendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#090d1a] border border-rose-500/60 rounded-3xl max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="text-base font-extrabold text-white">Delete Trade #{tradePendingDelete.ticketId}?</h3>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSecureDeleteModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white rounded-xl">Cancel</button>
              <button
                onClick={() => {
                  const del = { ...tradePendingDelete, deletedDate: new Date().toISOString().slice(0, 19) };
                  setTrades((prev) => prev.filter((t) => t.id !== del.id));
                  setRecycleBin((prev) => [del, ...prev]);
                  setSecureDeleteModalOpen(false);
                  showToast(`Moved #${del.ticketId} to Trash.`, () => {
                    setRecycleBin((prev) => prev.filter((t) => t.id !== del.id));
                    setTrades((prev) => [del, ...prev]);
                  });
                }}
                className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl"
              >
                Delete Trade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECYCLE BIN MODAL (WITH PERMANENT DELETE & CONFIRMATION GUARD) */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090d1a] border border-amber-500/50 rounded-3xl max-w-2xl w-full p-6 space-y-4 text-xs shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Recycle Bin / Trash ({recycleBin.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Restore deleted trades back to your ledger or permanently delete them.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {recycleBin.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTrashPendingPermanentDelete({ mode: 'ALL', count: recycleBin.length });
                      setTrashConfirmInput('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Empty Trash</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setTrashPendingPermanentDelete(null);
                    setSettingsModalOpen(false);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TWO-STEP PERMANENT DELETION CONFIRMATION BOX */}
            {trashPendingPermanentDelete && (
              <div className="bg-rose-950/35 border-2 border-rose-500/70 rounded-2xl p-4 space-y-3 shadow-[0_0_25px_rgba(244,63,94,0.25)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white">
                        {trashPendingPermanentDelete.mode === 'ALL'
                          ? `Permanently Empty All ${trashPendingPermanentDelete.count} Trades from Recycle Bin?`
                          : `Permanently Delete Trade #${trashPendingPermanentDelete.trade.ticketId} (${trashPendingPermanentDelete.trade.symbol})?`}
                      </h4>
                      <p className="text-slate-300 text-[11px] mt-0.5">
                        This action will permanently erase{' '}
                        {trashPendingPermanentDelete.mode === 'ALL'
                          ? 'all items in the Recycle Bin'
                          : `Trade #${trashPendingPermanentDelete.trade.ticketId} (Account #${trashPendingPermanentDelete.trade.accountNumber})`}{' '}
                        and cannot be undone.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTrashPendingPermanentDelete(null);
                      setTrashConfirmInput('');
                    }}
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Type <strong className="text-rose-400 font-mono">DELETE</strong> to unlock permanent deletion:
                  </label>
                  <input
                    type="text"
                    value={trashConfirmInput}
                    onChange={(e) => setTrashConfirmInput(e.target.value)}
                    placeholder="Type DELETE to confirm..."
                    className="w-full bg-[#070b16] border border-rose-500/40 focus:border-rose-400 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => {
                      setTrashPendingPermanentDelete(null);
                      setTrashConfirmInput('');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
                  >
                    Cancel (Keep in Trash)
                  </button>
                  <button
                    type="button"
                    disabled={trashConfirmInput.trim() !== 'DELETE'}
                    onClick={() => {
                      if (trashConfirmInput.trim() !== 'DELETE') return;
                      if (trashPendingPermanentDelete.mode === 'ALL') {
                        setRecycleBin([]);
                        showToast('Recycle Bin permanently emptied.');
                      } else {
                        const target = trashPendingPermanentDelete.trade;
                        setRecycleBin((prev) => prev.filter((x) => x.id !== target.id));
                        showToast(`Trade #${target.ticketId} permanently deleted.`);
                      }
                      setTrashPendingPermanentDelete(null);
                      setTrashConfirmInput('');
                    }}
                    className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                      trashConfirmInput.trim() === 'DELETE'
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                        : 'bg-rose-950/40 text-slate-500 border border-rose-900/40 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Permanent Delete</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {recycleBin.length === 0 ? (
                <div className="text-center py-10 text-slate-500 bg-[#0b1020] rounded-2xl border border-slate-800/80">
                  Recycle Bin is empty.
                </div>
              ) : (
                recycleBin.map((t) => {
                  const isSelectedForDelete =
                    trashPendingPermanentDelete?.mode === 'SINGLE' &&
                    trashPendingPermanentDelete?.trade?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b1020] border rounded-2xl p-3.5 transition ${
                        isSelectedForDelete
                          ? 'border-rose-500/70 bg-rose-950/20'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-300">#{t.ticketId}</span>
                          <span className="font-bold text-white">{t.symbol}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              t.side === 'Buy'
                                ? 'bg-emerald-950 text-emerald-300'
                                : 'bg-rose-950 text-rose-300'
                            }`}
                          >
                            {t.side}
                          </span>
                          <span className="text-indigo-300 font-semibold">
                            {t.stage} (Acct #{t.accountNumber})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Net P&amp;L:{' '}
                          <strong
                            className={
                              Number(t.profit) >= Number(t.loss)
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }
                          >
                            {Number(t.profit) >= Number(t.loss)
                              ? `+$${(Number(t.profit) - Number(t.loss)).toFixed(2)}`
                              : `-$${Math.abs(Number(t.profit) - Number(t.loss)).toFixed(2)}`}
                          </strong>{' '}
                          • Deleted: {t.deletedDate || 'Recently'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setRecycleBin((prev) => prev.filter((x) => x.id !== t.id));
                            setTrades((prev) => [t, ...prev]);
                            if (isSelectedForDelete) setTrashPendingPermanentDelete(null);
                            showToast(`Restored Trade #${t.ticketId} to ${t.stage}!`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold transition flex items-center gap-1"
                        >
                          <UndoIcon className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTrashPendingPermanentDelete({ mode: 'SINGLE', trade: t });
                            setTrashConfirmInput('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTrashPendingPermanentDelete(null);
                  setSettingsModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOUD DATABASE SYNC MODAL */}
      {cloudModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090d1a] border border-cyan-500/50 rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs shadow-[0_0_50px_rgba(6,182,212,0.25)]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">☁️ Cloud Database Sync (Supabase)</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sync all trades, Pre/Post-Trade notes, and screenshots across all your devices.
                </p>
              </div>
              <button onClick={() => setCloudModalOpen(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#0b1020] border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">SYNC STATUS</span>
                <strong className={cloudStatus === 'Synced' ? 'text-emerald-400 text-sm' : cloudStatus === 'Error' ? 'text-rose-400 text-sm' : 'text-amber-300 text-sm'}>
                  {cloudStatus} {lastSyncedAt ? `• Last synced at ${lastSyncedAt}` : ''}
                </strong>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => pullFromCloud(cloudUrl, cloudKey, false)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold"
                >
                  ⬇ Pull from Cloud
                </button>
                <button
                  type="button"
                  onClick={() => pushToCloud(cloudUrl, cloudKey, trades, profiles, recycleBin, false)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold"
                >
                  ⬆ Push to Cloud
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Supabase Project URL</label>
                <input
                  type="text"
                  placeholder="https://your-project-id.supabase.co"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  className="w-full bg-[#0d1326] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Supabase Anon Public Key</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={cloudKey}
                  onChange={(e) => setCloudKey(e.target.value)}
                  className="w-full bg-[#0d1326] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCloudModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('crowevar_supabase_url', cloudUrl.trim());
                  localStorage.setItem('crowevar_supabase_key', cloudKey.trim());
                  pullFromCloud(cloudUrl.trim(), cloudKey.trim(), false);
                  setCloudModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-extrabold"
              >
                Save &amp; Connect Cloud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREENSHOT VAULT MODAL */}
      {mediaLibraryOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#090d1a] border border-cyan-500/50 rounded-3xl max-w-4xl w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Screenshot Vault ({allAccountScreenshots.length})</h3>
              <button onClick={() => setMediaLibraryOpen(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {allAccountScreenshots.length === 0 ? <div className="col-span-full text-center py-8 text-slate-500">No screenshots attached yet.</div> : allAccountScreenshots.map((s) => (
                <div key={s.id} className="bg-[#0b1020] border border-slate-800 rounded-xl p-3 space-y-2">
                  {s.url && <img src={s.url} alt={s.filename} className="w-full h-32 object-cover rounded-lg cursor-zoom-in" onClick={() => setLightboxImage(s)} />}
                  <div className="font-mono text-amber-300 truncate">{s.filename}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <SafeErrorBoundary>
      <JournalDashboard />
    </SafeErrorBoundary>
  );
}

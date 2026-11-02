import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  History,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  X,
  CloudDownload,
  GitCommit,
  Sliders,
  RefreshCw,
  Trash2
} from 'lucide-react';

const SNAPSHOT_STORAGE_KEY = 'crowevar_admin_snapshots_v1';
const SAFE_MODE_STORAGE_KEY = 'crowevar_safe_mode_flags_v1';
const GITHUB_REVERT_CFG_KEY = 'crowevar_github_revert_cfg_v1';
const IDB_NAME = 'CrowevarJournalDB';
const IDB_STORE = 'journal_state';

const saveSnapshotsToIdb = (snapshots) => {
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
      tx.objectStore(IDB_STORE).put(snapshots, SNAPSHOT_STORAGE_KEY);
    };
  } catch (e) {}
};

const loadSnapshotsFromIdb = (callback) => {
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
      const getReq = tx.objectStore(IDB_STORE).get(SNAPSHOT_STORAGE_KEY);
      getReq.onsuccess = () => {
        if (Array.isArray(getReq.result)) {
          callback(getReq.result);
        }
      };
    };
  } catch (e) {}
};

const getSupabaseCredentials = () => {
  const rawUrl =
    import.meta.env?.VITE_SUPABASE_URL ||
    localStorage.getItem('crowevar_supabase_url') ||
    '';
  const rawKey =
    import.meta.env?.VITE_SUPABASE_ANON_KEY ||
    localStorage.getItem('crowevar_supabase_key') ||
    '';
  const match = String(rawUrl).trim().match(/https?:\/\/[a-z0-9-]+\.supabase\.co/i);
  const cleanUrl = match
    ? match[0].toLowerCase()
    : String(rawUrl).trim().replace(/\/+$/, '').replace(/\/rest\/v1.*$/i, '');
  const cleanKey = String(rawKey).trim().replace(/^Bearer\s+/i, '');
  return { cleanUrl, cleanKey };
};

// Error Boundary that catches any crash in child components while keeping the Admin Revert Console 100% functional
class ZeroDowntimeBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || String(error)
    };
  }

  componentDidCatch(error, info) {
    console.error('[SystemGuardian] Caught runtime error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.renderRescueConsole(this.state.errorMessage, () => {
        this.setState({ hasError: false, errorMessage: '' });
      });
    }
    return this.props.children;
  }
}

export default function SystemGuardian({ children, renderLeftShowcase }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('snapshots'); // 'snapshots' | 'safemode' | 'clouddeploy'
  const [snapshots, setSnapshots] = useState([]);
  const [statusBanner, setStatusBanner] = useState('');
  const [emergencyPassword, setEmergencyPassword] = useState('');
  const [emergencyUnlocked, setEmergencyUnlocked] = useState(false);

  // Safe Mode flags allow disabling newly added sidebars/widgets if an update causes layout/runtime issues
  const [safeModeFlags, setSafeModeFlags] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAFE_MODE_STORAGE_KEY) || '{}');
      return {
        enableLeftCertificates: saved.enableLeftCertificates !== false,
        enableIntelligenceSuite: saved.enableIntelligenceSuite !== false
      };
    } catch {
      return { enableLeftCertificates: true, enableIntelligenceSuite: true };
    }
  });

  // Optional GitHub API / Vercel Deploy Hook configuration for 1-click remote code rollback from browser
  const [deployConfig, setDeployConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(GITHUB_REVERT_CFG_KEY) || '{}');
    } catch {
      return { vercelRollbackHook: '', githubOwner: '', githubRepo: 'crowevar-Tjournal', githubToken: '' };
    }
  });
  const [isTriggeringRemote, setIsTriggeringRemote] = useState(false);

  // Sync Admin status with RBAC
  useEffect(() => {
    const checkAdmin = () => {
      const rbac = window.__CROWEVAR_RBAC__;
      const adminActive = Boolean(rbac && (rbac.isAdmin || rbac.role === 'admin' || rbac.can?.('manageUsers')));
      setIsAdmin(adminActive);
    };
    checkAdmin();
    window.addEventListener('crowevar-rbac-change', checkAdmin);
    const interval = setInterval(checkAdmin, 1200);
    return () => {
      window.removeEventListener('crowevar-rbac-change', checkAdmin);
      clearInterval(interval);
    };
  }, []);

  // Apply Safe Mode CSS visibility for Intelligence Suite slot if toggled off
  useEffect(() => {
    try {
      localStorage.setItem(SAFE_MODE_STORAGE_KEY, JSON.stringify(safeModeFlags));
      const slot = document.getElementById('tradeatlas-intelligence-slot');
      if (slot) {
        slot.style.display = safeModeFlags.enableIntelligenceSuite ? '' : 'none';
      }
    } catch {}
  }, [safeModeFlags]);

  // Load saved snapshots from IndexedDB & Supabase on startup, and auto-capture clean state checkpoints
  useEffect(() => {
    loadSnapshotsFromIdb((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setSnapshots(list);
      }
    });

    const { cleanUrl, cleanKey } = getSupabaseCredentials();
    if (cleanUrl && cleanKey) {
      fetch(`${cleanUrl}/rest/v1/journal_store?id=eq.admin_rollback_vault&select=*`, {
        headers: {
          apikey: cleanKey,
          Authorization: `Bearer ${cleanKey}`,
          Accept: 'application/json'
        }
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => {
          if (Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0].trades)) {
            setSnapshots((prev) => {
              const map = new Map();
              rows[0].trades.forEach((s) => map.set(s.id, s));
              prev.forEach((s) => {
                if (!map.has(s.id)) map.set(s.id, s);
              });
              const merged = Array.from(map.values())
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10);
              saveSnapshotsToIdb(merged);
              return merged;
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  // Capture a complete system checkpoint (Trades, Profiles, Trash, Certificates)
  const createSystemSnapshot = (label = 'Auto Checkpoint') => {
    try {
      const tradesRaw = localStorage.getItem('crowevar_trades_master') || '[]';
      const profilesRaw = localStorage.getItem('crowevar_profiles_master') || '[]';
      const trashRaw = localStorage.getItem('crowevar_recycle_master') || '[]';
      const certsRaw = localStorage.getItem('crowevar_certificates_v1') || '[]';

      const parsedTrades = JSON.parse(tradesRaw);
      if (!Array.isArray(parsedTrades) || parsedTrades.length === 0) return;

      const newSnap = {
        id: `snap-${Date.now()}`,
        label,
        createdAt: new Date().toISOString(),
        tradeCount: parsedTrades.length,
        data: {
          trades: parsedTrades,
          profiles: JSON.parse(profilesRaw || '[]'),
          trash: JSON.parse(trashRaw || '[]'),
          certs: JSON.parse(certsRaw || '[]')
        }
      };

      setSnapshots((prev) => {
        // Avoid duplicate snapshot if tradeCount & latest timestamp are identical within 5 seconds
        if (
          prev.length > 0 &&
          prev[0].tradeCount === newSnap.tradeCount &&
          label === 'Auto Checkpoint' &&
          Date.now() - new Date(prev[0].createdAt).getTime() < 60000
        ) {
          return prev;
        }
        const next = [newSnap, ...prev].slice(0, 10);
        saveSnapshotsToIdb(next);

        const { cleanUrl, cleanKey } = getSupabaseCredentials();
        if (cleanUrl && cleanKey) {
          fetch(`${cleanUrl}/rest/v1/journal_store?on_conflict=id`, {
            method: 'POST',
            headers: {
              apikey: cleanKey,
              Authorization: `Bearer ${cleanKey}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates,return=minimal'
            },
            body: JSON.stringify({
              id: 'admin_rollback_vault',
              trades: next,
              updated_at: new Date().toISOString()
            })
          }).catch(() => {});
        }
        return next;
      });
      setStatusBanner(`Created snapshot: "${label}"`);
      setTimeout(() => setStatusBanner(''), 4000);
    } catch (e) {}
  };

  // Automatically create an initial verified snapshot 4 seconds after clean boot
  useEffect(() => {
    const timer = setTimeout(() => {
      createSystemSnapshot('Verified Boot Checkpoint');
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Restore any snapshot immediately and sync to Supabase Cloud
  const handleRestoreSnapshot = async (snap) => {
    if (!snap || !snap.data) return;
    try {
      const { trades, profiles, trash, certs } = snap.data;
      if (Array.isArray(trades)) {
        localStorage.setItem('crowevar_trades_master', JSON.stringify(trades));
      }
      if (Array.isArray(profiles) && profiles.length > 0) {
        localStorage.setItem('crowevar_profiles_master', JSON.stringify(profiles));
      }
      if (Array.isArray(trash)) {
        localStorage.setItem('crowevar_recycle_master', JSON.stringify(trash));
      }
      if (Array.isArray(certs)) {
        localStorage.setItem('crowevar_certificates_v1', JSON.stringify(certs));
      }

      // Also write to IndexedDB
      const req = indexedDB.open(IDB_NAME, 1);
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(IDB_STORE, 'readwrite');
        if (Array.isArray(trades)) tx.objectStore(IDB_STORE).put(trades, 'crowevar_trades_master');
        if (Array.isArray(certs)) tx.objectStore(IDB_STORE).put(certs, 'crowevar_certificates_v1');
      };

      // Push restored state to Supabase master so all devices revert immediately
      const { cleanUrl, cleanKey } = getSupabaseCredentials();
      if (cleanUrl && cleanKey && Array.isArray(trades)) {
        await fetch(`${cleanUrl}/rest/v1/journal_store?on_conflict=id`, {
          method: 'POST',
          headers: {
            apikey: cleanKey,
            Authorization: `Bearer ${cleanKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify({
            id: 'master',
            trades,
            profiles: Array.isArray(profiles) ? profiles : [],
            trash: Array.isArray(trash) ? trash : [],
            updated_at: new Date().toISOString()
          })
        }).catch(() => {});
      }

      setStatusBanner(`Reverted to "${snap.label}" (${new Date(snap.createdAt).toLocaleTimeString()}). Reloading...`);
      setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (err) {
      setStatusBanner(`Revert error: ${err.message}`);
    }
  };

  // Trigger Remote GitHub / Vercel Rollback from Browser
  const handleRemoteDeploymentRollback = async () => {
    setIsTriggeringRemote(true);
    setStatusBanner('');
    try {
      // Option A: Vercel Deploy Hook URL
      if (deployConfig.vercelRollbackHook && deployConfig.vercelRollbackHook.startsWith('https://')) {
        const res = await fetch(deployConfig.vercelRollbackHook.trim(), { method: 'POST' });
        if (!res.ok) throw new Error(`Deploy hook returned HTTP ${res.status}`);
        setStatusBanner('Triggered Vercel Deployment Hook! Live website will refresh in ~20s.');
        setIsTriggeringRemote(false);
        return;
      }

      // Option B: GitHub REST API - Revert latest commit on main branch
      const { githubOwner, githubRepo, githubToken } = deployConfig;
      if (!githubOwner || !githubRepo || !githubToken) {
        setStatusBanner('Configure your Vercel Hook or GitHub Token below, or run .\\Revert-LastUpdate.ps1 in PowerShell.');
        setIsTriggeringRemote(false);
        return;
      }

      const headers = {
        Authorization: `Bearer ${githubToken.trim()}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      };

      // Fetch last 2 commits on main
      const commitsRes = await fetch(
        `https://api.github.com/repos/${githubOwner.trim()}/${githubRepo.trim()}/commits?sha=main&per_page=2`,
        { headers }
      );
      if (!commitsRes.ok) throw new Error(`GitHub API HTTP ${commitsRes.status}`);
      const commits = await commitsRes.json();
      if (!Array.isArray(commits) || commits.length < 2) {
        throw new Error('Need at least 2 commits on main to revert to previous commit.');
      }

      const previousCleanCommit = commits[1];
      const parentTreeSha = previousCleanCommit.commit.tree.sha;
      const currentHeadSha = commits[0].sha;

      // Create a new commit pointing to the previous clean commit's exact file tree (Zero-conflict instant revert!)
      const createCommitRes = await fetch(
        `https://api.github.com/repos/${githubOwner.trim()}/${githubRepo.trim()}/git/commits`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: `Admin Instant Revert to clean commit ${previousCleanCommit.sha.slice(0, 7)}`,
            tree: parentTreeSha,
            parents: [currentHeadSha]
          })
        }
      );
      if (!createCommitRes.ok) throw new Error('Failed to create revert commit on GitHub.');
      const newCommit = await createCommitRes.json();

      // Advance main branch reference to the new revert commit
      const updateRefRes = await fetch(
        `https://api.github.com/repos/${githubOwner.trim()}/${githubRepo.trim()}/git/refs/heads/main`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ sha: newCommit.sha, force: false })
        }
      );
      if (!updateRefRes.ok) throw new Error('Failed to update main branch ref.');

      setStatusBanner(
        `Reverted GitHub main branch to commit ${previousCleanCommit.sha.slice(0, 7)}! Vercel is deploying now (~20s).`
      );
    } catch (e) {
      setStatusBanner(`Remote rollback failed: ${e.message}`);
    } finally {
      setIsTriggeringRemote(false);
    }
  };

  // Emergency Rescue UI if a bad code update ever throws an unhandled runtime error
  const renderRescueConsole = (errorMessage, retryRender) => {
    const canUseRescue = isAdmin || emergencyUnlocked;
    return (
      <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-[#090d1a] border-2 border-amber-500/60 rounded-3xl p-6 space-y-5 shadow-[0_0_60px_rgba(245,158,11,0.2)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-300">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  ZERO-DOWNTIME SYSTEM GUARDIAN
                </span>
                <h1 className="text-lg font-black text-white mt-1">
                  Update Error Intercepted — Website Kept Online
                </h1>
              </div>
            </div>
          </div>

          <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-3.5 text-xs font-mono text-rose-200">
            <strong>Diagnostic:</strong> {errorMessage || 'Component runtime error after recent change.'}
          </div>

          {!canUseRescue ? (
            <div className="bg-[#0d1326] border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Lock className="w-4 h-4" />
                <span>Admin Authentication Required to Revert Website</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={emergencyPassword}
                  onChange={(e) => setEmergencyPassword(e.target.value)}
                  placeholder="Enter Admin Password..."
                  className="flex-1 bg-[#070b16] border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (emergencyPassword === 'Crowevar@2026' || emergencyPassword === 'admin') {
                      setEmergencyUnlocked(true);
                    } else {
                      alert('Invalid Admin Password');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold"
                >
                  Unlock Admin Revert
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const nextFlags = {
                      enableLeftCertificates: false,
                      enableIntelligenceSuite: false
                    };
                    setSafeModeFlags(nextFlags);
                    localStorage.setItem(SAFE_MODE_STORAGE_KEY, JSON.stringify(nextFlags));
                    retryRender();
                  }}
                  className="p-4 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-left transition"
                >
                  <div className="font-black text-emerald-300 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>1. Boot in Core Safe Mode</span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-1">
                    Disables add-on modules (Certificates / Intelligence Suite) and opens your core Journal immediately.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (snapshots.length > 0) {
                      handleRestoreSnapshot(snapshots[0]);
                    } else {
                      retryRender();
                    }
                  }}
                  className="p-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-left transition"
                >
                  <div className="font-black text-amber-300 text-sm flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    <span>2. Revert to Last Clean Snapshot</span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-1">
                    Restores the last verified working state ({snapshots.length} snapshots available) and reloads.
                  </p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ZeroDowntimeBoundary renderRescueConsole={renderRescueConsole}>
      {/* FLOATING ADMIN-ONLY REVERT & SAFE-MODE TRIGGER PILL */}
      {isAdmin && (
        <div
          data-rbac-ui="true"
          className="fixed bottom-5 left-5 z-40 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="group flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#090d1a]/95 hover:bg-[#0f172a] border border-amber-500/50 hover:border-amber-400 text-amber-300 font-extrabold text-xs shadow-[0_0_25px_rgba(245,158,11,0.25)] backdrop-blur-xl transition-all"
            title="Admin Only: Revert Last Update, Restore Snapshot, or Toggle Safe Mode"
          >
            <RotateCcw className="w-4 h-4 text-amber-400 group-hover:-rotate-45 transition-transform" />
            <span>Admin Revert &amp; Safe Mode</span>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-[10px] font-mono">
              {snapshots.length}
            </span>
          </button>
        </div>
      )}

      {/* MAIN APPLICATION WITH SAFE-MODE MODULE ISOLATION */}
      <div className="min-h-screen bg-[#060913] text-slate-100">
        <div className="max-w-[1960px] mx-auto px-3 sm:px-5 pt-4 flex flex-col xl:flex-row items-start gap-5">
          {safeModeFlags.enableLeftCertificates && renderLeftShowcase ? renderLeftShowcase() : null}
          <div className="flex-1 min-w-0 w-full">{children}</div>
        </div>
      </div>

      {/* ADMIN-ONLY REVERT & ZERO-DOWNTIME CONTROL CENTER MODAL */}
      {isAdmin && modalOpen && (
        <div
          data-rbac-ui="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-[#090d1a] border border-amber-500/50 rounded-3xl max-w-2xl w-full p-6 space-y-4 text-xs shadow-[0_0_60px_rgba(245,158,11,0.25)] max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Admin Zero-Downtime Revert Console
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ADMIN ONLY
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Revert recent state/data changes, toggle Safe Mode modules, or roll back your live GitHub/Vercel deployment.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {statusBanner && (
              <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-emerald-200 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{statusBanner}</span>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="grid grid-cols-3 gap-2 bg-[#060913] p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('snapshots')}
                className={`py-2 px-3 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'snapshots'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>1. Revert Data / State ({snapshots.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('safemode')}
                className={`py-2 px-3 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'safemode'
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>2. Safe Mode Switches</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('clouddeploy')}
                className={`py-2 px-3 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'clouddeploy'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>3. Revert Code Update</span>
              </button>
            </div>

            {/* TAB 1: TIME-MACHINE SNAPSHOT REVERT */}
            {activeTab === 'snapshots' && (
              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                <div className="flex items-center justify-between bg-[#0d1326] border border-slate-800 rounded-2xl p-3">
                  <div>
                    <h4 className="font-bold text-white">Create Manual Restore Point Before Editing</h4>
                    <p className="text-[11px] text-slate-400">
                      Saves your current Trades, Accounts, Notes, Screenshots &amp; Certificates to Local + Cloud Vault.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      createSystemSnapshot(
                        `Admin Manual Checkpoint (${new Date().toLocaleTimeString()})`
                      )
                    }
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shrink-0"
                  >
                    + Save Restore Point
                  </button>
                </div>

                {snapshots.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-300">
                        QUICK 1-CLICK ROLLBACK
                      </span>
                      <h4 className="text-xs font-extrabold text-white mt-0.5">
                        Revert Immediately to Latest Checkpoint: "{snapshots[0].label}"
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Captured {new Date(snapshots[0].createdAt).toLocaleString()} • {snapshots[0].tradeCount} Trades
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreSnapshot(snapshots[0])}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black shrink-0 shadow-lg"
                    >
                      ⏪ Revert Now
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {snapshots.map((snap, idx) => (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between gap-3 bg-[#0b1020] border border-slate-800 hover:border-slate-700 rounded-2xl p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white">{snap.label}</span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                              LATEST
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(snap.createdAt).toLocaleString()} •{' '}
                          <strong className="text-cyan-300">{snap.tradeCount} trades</strong> •{' '}
                          {(snap.data?.certs || []).length} certificates
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-extrabold transition"
                      >
                        Restore This Version
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: SAFE MODE FEATURE SWITCHES (ZERO REDEPLOY REQUIRED) */}
            {activeTab === 'safemode' && (
              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                <p className="text-slate-300 text-[11px] leading-relaxed bg-[#0d1326] border border-slate-800 rounded-2xl p-3">
                  If a new UI panel or update causes visual clutter or lag, you can toggle it off right here with <strong>zero downtime</strong> while keeping your core Journal running smoothly.
                </p>

                <label className="flex items-center justify-between bg-[#0b1020] border border-slate-800 rounded-2xl p-4 cursor-pointer">
                  <div>
                    <h4 className="font-extrabold text-white text-xs">
                      Left Sidebar: Prop Firm Certificate &amp; Photo Showcase
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Displays your funded account certificates and personal photos on the left side of the screen.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={safeModeFlags.enableLeftCertificates}
                    onChange={(e) =>
                      setSafeModeFlags((f) => ({
                        ...f,
                        enableLeftCertificates: e.target.checked
                      }))
                    }
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between bg-[#0b1020] border border-slate-800 rounded-2xl p-4 cursor-pointer">
                  <div>
                    <h4 className="font-extrabold text-white text-xs">
                      Performance Intelligence &amp; Edge Suite
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Displays the institutional analytics cards above the Execution Journal &amp; Trade Ledger.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={safeModeFlags.enableIntelligenceSuite}
                    onChange={(e) =>
                      setSafeModeFlags((f) => ({
                        ...f,
                        enableIntelligenceSuite: e.target.checked
                      }))
                    }
                    className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* TAB 3: LIVE CODE & VERCEL DEPLOYMENT ROLLBACK */}
            {activeTab === 'clouddeploy' && (
              <div className="space-y-3.5 overflow-y-auto pr-1 flex-1">
                <div className="bg-[#0d1326] border border-cyan-500/30 rounded-2xl p-3.5 space-y-2">
                  <h4 className="font-extrabold text-cyan-300 text-xs">
                    Method A: 1-Click Local &amp; Online Code Revert (PowerShell)
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    If a code update ever breaks the build, run this single command in PowerShell to revert the last Git commit, verify the build, and redeploy the previous working version to Vercel:
                  </p>
                  <pre className="bg-[#050811] border border-slate-800 rounded-xl p-2.5 text-amber-300 font-mono text-[11px] select-all">
                    .\Revert-LastUpdate.ps1
                  </pre>
                </div>

                <div className="bg-[#0b1020] border border-slate-800 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-white text-xs">
                        Method B: One-Click Cloud Git Revert (From Any Device / Phone)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Reverts the latest commit on your GitHub <code className="text-amber-300">main</code> branch so Vercel automatically redeploys the previous commit.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isTriggeringRemote}
                      onClick={handleRemoteDeploymentRollback}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold shrink-0 shadow-lg"
                    >
                      {isTriggeringRemote ? 'Reverting...' : '⏪ Revert Last GitHub Push'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                        GitHub Username
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. crowevar"
                        value={deployConfig.githubOwner || ''}
                        onChange={(e) => {
                          const next = { ...deployConfig, githubOwner: e.target.value };
                          setDeployConfig(next);
                          localStorage.setItem(GITHUB_REVERT_CFG_KEY, JSON.stringify(next));
                        }}
                        className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                        Repository Name
                      </label>
                      <input
                        type="text"
                        placeholder="crowevar-Tjournal"
                        value={deployConfig.githubRepo || 'crowevar-Tjournal'}
                        onChange={(e) => {
                          const next = { ...deployConfig, githubRepo: e.target.value };
                          setDeployConfig(next);
                          localStorage.setItem(GITHUB_REVERT_CFG_KEY, JSON.stringify(next));
                        }}
                        className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                      GitHub Personal Access Token (repo scope)
                    </label>
                    <input
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      value={deployConfig.githubToken || ''}
                      onChange={(e) => {
                        const next = { ...deployConfig, githubToken: e.target.value };
                        setDeployConfig(next);
                        localStorage.setItem(GITHUB_REVERT_CFG_KEY, JSON.stringify(next));
                      }}
                      className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ZeroDowntimeBoundary>
  );
}
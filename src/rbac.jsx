import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  KeyRound,
  Users,
  UserPlus,
  UserCheck,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  FileText,
  Trash2,
  RefreshCw,
  Settings,
  Activity,
  Download
} from 'lucide-react';

const RBAC_STORAGE_KEY = 'crowevar_rbac_store_v1';
const RBAC_SESSION_KEY = 'crowevar_rbac_session_v1';
const RBAC_AUDIT_KEY = 'crowevar_rbac_audit_v1';

// Default Role Permission Templates
export const DEFAULT_ROLE_PERMISSIONS = {
  VISITOR: {
    label: 'Visitor (Read-Only)',
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    viewDashboard: true,
    viewStage1: true,
    viewStage2: true,
    viewFunded: true,
    viewLiveAccounts: false,
    readJournal: true,
    createTrades: false,
    editTrades: false,
    deleteTrades: false,
    editAccountInfo: false,
    accessReports: false,
    manageUsers: false
  },
  ANALYST: {
    label: 'Prop & Live Analyst (Read-Only)',
    badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
    viewDashboard: true,
    viewStage1: true,
    viewStage2: true,
    viewFunded: true,
    viewLiveAccounts: true,
    readJournal: true,
    createTrades: false,
    editTrades: false,
    deleteTrades: false,
    editAccountInfo: false,
    accessReports: true,
    manageUsers: false
  },
  JUNIOR_TRADER: {
    label: 'Junior Trader (Create & Edit Prop)',
    badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
    viewDashboard: true,
    viewStage1: true,
    viewStage2: true,
    viewFunded: true,
    viewLiveAccounts: false,
    readJournal: true,
    createTrades: true,
    editTrades: true,
    deleteTrades: false,
    editAccountInfo: false,
    accessReports: true,
    manageUsers: false
  },
  TRADER: {
    label: 'Authorized Trader (Full Trading)',
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    viewDashboard: true,
    viewStage1: true,
    viewStage2: true,
    viewFunded: true,
    viewLiveAccounts: true,
    readJournal: true,
    createTrades: true,
    editTrades: true,
    deleteTrades: true,
    editAccountInfo: true,
    accessReports: true,
    manageUsers: false
  },
  ADMIN: {
    label: 'Administrator (Full Control)',
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
    viewDashboard: true,
    viewStage1: true,
    viewStage2: true,
    viewFunded: true,
    viewLiveAccounts: true,
    readJournal: true,
    createTrades: true,
    editTrades: true,
    deleteTrades: true,
    editAccountInfo: true,
    accessReports: true,
    manageUsers: true
  }
};

export const PERMISSION_DEFINITIONS = [
  { key: 'viewStage1', category: 'Section Visibility', label: 'View Stage 1 (Prop Firm)', level: 'View' },
  { key: 'viewStage2', category: 'Section Visibility', label: 'View Stage 2 (Prop Firm)', level: 'View' },
  { key: 'viewFunded', category: 'Section Visibility', label: 'View Funded Account (Prop Firm)', level: 'View' },
  { key: 'viewLiveAccounts', category: 'Section Visibility', label: 'View Live Personal Accounts', level: 'View' },
  { key: 'readJournal', category: 'Data & Analytics', label: 'Read Trade Details, Notes & Screenshots', level: 'Read' },
  { key: 'accessReports', category: 'Data & Analytics', label: 'Access Reports & Export CSV/HTML', level: 'Read' },
  { key: 'createTrades', category: 'Trade Operations', label: 'Log New Trades & Import HTML Statements', level: 'Create' },
  { key: 'editTrades', category: 'Trade Operations', label: 'Edit Trades, Notes & Screenshots', level: 'Edit' },
  { key: 'editAccountInfo', category: 'Trade Operations', label: 'Edit Account Info & Stage Manager', level: 'Edit' },
  { key: 'deleteTrades', category: 'Trade Operations', label: 'Delete Trades & Manage Recycle Bin', level: 'Delete' },
  { key: 'manageUsers', category: 'Administration', label: 'Manage Users, Roles, Permissions & Cloud Sync', level: 'Manage' }
];

// Deterministic Salted Hash Helper (Web Crypto SHA-256 with synchronous fallback)
const simpleHashFallback = (str) => {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'sh_' + (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
};

export const hashPasswordSync = (password, username = '') => {
  const cleanUser = String(username || '').trim().toLowerCase();
  const salted = `CROWEVAR_SALT_2026::${cleanUser}::${String(password || '')}`;
  return simpleHashFallback(salted);
};

const INITIAL_USERS = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    email: 'crowevar@tradeatlas.io',
    displayName: 'Crowevar Admin',
    role: 'ADMIN',
    status: 'ACTIVE',
    passwordHash: hashPasswordSync('Crowevar@2026', 'admin'),
    customPermissions: null,
    createdAt: '2026-10-26 08:00:00',
    lastLogin: null
  },
  {
    id: 'usr-trader-1',
    username: 'trader',
    email: 'trader@tradeatlas.io',
    displayName: 'Authorized Lead Trader',
    role: 'TRADER',
    status: 'ACTIVE',
    passwordHash: hashPasswordSync('Trader@2026', 'trader'),
    customPermissions: null,
    createdAt: '2026-10-26 08:00:00',
    lastLogin: null
  },
  {
    id: 'usr-analyst-1',
    username: 'analyst',
    email: 'analyst@tradeatlas.io',
    displayName: 'Prop Firm Analyst',
    role: 'ANALYST',
    status: 'ACTIVE',
    passwordHash: hashPasswordSync('Analyst@2026', 'analyst'),
    customPermissions: null,
    createdAt: '2026-10-26 08:00:00',
    lastLogin: null
  }
];

const RBACContext = createContext(null);
export const useRBAC = () => useContext(RBACContext);

export function RBACSecurityProvider({ children }) {
  // 1. Load Role Matrix & Users from Storage
  const [rbacStore, setRbacStore] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RBAC_STORAGE_KEY) || 'null');
      if (saved && Array.isArray(saved.users) && saved.users.length > 0) {
        return {
          rolePermissions: { ...DEFAULT_ROLE_PERMISSIONS, ...(saved.rolePermissions || {}) },
          users: saved.users
        };
      }
    } catch (e) {}
    return {
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
      users: INITIAL_USERS
    };
  });

  // 2. Load Current Session (Default = null -> Visitor Mode)
  const [session, setSession] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RBAC_SESSION_KEY) || 'null');
      if (saved && saved.userId && saved.expiresAt > Date.now()) {
        return saved;
      }
    } catch (e) {}
    return null;
  });

  // 3. Load Security Audit Logs
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RBAC_AUDIT_KEY) || '[]');
      if (Array.isArray(saved)) return saved;
    } catch (e) {}
    return [
      {
        id: 'aud-init',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actor: 'SYSTEM',
        role: 'SYSTEM',
        event: 'RBAC_INITIALIZED',
        details: 'Role-Based Access Control & Visitor Read-Only Guard active.',
        status: 'SUCCESS'
      }
    ];
  });

  // 4. UI Modal States
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState('USERS'); // 'USERS' | 'ROLES' | 'AUDIT' | 'PASSWORD'
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [securityBannerNotice, setSecurityBannerNotice] = useState('');

  // New User Form State (Admin Console)
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
    role: 'TRADER'
  });
  const [editingUserCustomPerms, setEditingUserCustomPerms] = useState(null);
  const [passwordChangeForm, setPasswordChangeForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [adminFeedback, setAdminFeedback] = useState('');

  // Audit Logger Helper
  const logAuditEvent = (event, details, status = 'SUCCESS', actorOverride = null, roleOverride = null) => {
    const entry = {
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actor: actorOverride || (currentUser ? currentUser.username : 'Visitor (Unauthorized)'),
      role: roleOverride || (currentUser ? currentUser.role : 'VISITOR'),
      event,
      details,
      status
    };
    setAuditLogs((prev) => {
      const next = [entry, ...prev].slice(0, 250);
      try {
        localStorage.setItem(RBAC_AUDIT_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Resolve Active User & Effective Permissions
  const currentUser = React.useMemo(() => {
    if (!session || !session.userId) return null;
    const found = rbacStore.users.find((u) => u.id === session.userId && u.status === 'ACTIVE');
    return found || null;
  }, [session, rbacStore.users]);

  const effectivePermissions = React.useMemo(() => {
    if (!currentUser) {
      return {
        ...DEFAULT_ROLE_PERMISSIONS.VISITOR,
        ...(rbacStore.rolePermissions?.VISITOR || {}),
        // Enforce strict non-negotiable visitor security guarantees:
        viewLiveAccounts: false,
        createTrades: false,
        editTrades: false,
        deleteTrades: false,
        editAccountInfo: false,
        manageUsers: false
      };
    }
    const roleBase =
      rbacStore.rolePermissions?.[currentUser.role] ||
      DEFAULT_ROLE_PERMISSIONS[currentUser.role] ||
      DEFAULT_ROLE_PERMISSIONS.VISITOR;
    const merged = {
      ...roleBase,
      ...(currentUser.customPermissions || {})
    };
    if (currentUser.role === 'ADMIN') {
      merged.manageUsers = true;
    }
    return merged;
  }, [currentUser, rbacStore.rolePermissions]);

  const can = (permKey) => Boolean(effectivePermissions?.[permKey]);
  const isAuthenticated = Boolean(currentUser);
  const isAdmin = Boolean(currentUser && (currentUser.role === 'ADMIN' || effectivePermissions.manageUsers));
  const canWriteData = Boolean(
    isAuthenticated &&
      (effectivePermissions.createTrades ||
        effectivePermissions.editTrades ||
        effectivePermissions.deleteTrades ||
        effectivePermissions.editAccountInfo ||
        effectivePermissions.manageUsers)
  );

  // Sync RBAC Store to localStorage & Supabase Cloud
  useEffect(() => {
    try {
      localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(rbacStore));
    } catch (e) {}
  }, [rbacStore]);

  // Pull RBAC Config from Supabase on startup if configured
  useEffect(() => {
    const sbUrl = (import.meta.env?.VITE_SUPABASE_URL || localStorage.getItem('crowevar_supabase_url') || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1.*$/i, '').replace(/\/rest\/v1$/i, '').replace(/\/rest\/v1$/i, '');
    const sbKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || localStorage.getItem('crowevar_supabase_key') || '').trim();
    if (!sbUrl || !sbKey) return;
    fetch(`${sbUrl}/rest/v1/journal_store?id=eq.rbac_config&select=*`, {
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        'Content-Type': 'application/json'
      }
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.profiles) {
          const remoteRbac = rows[0].profiles;
          if (remoteRbac && Array.isArray(remoteRbac.users) && remoteRbac.users.length > 0) {
            setRbacStore({
              rolePermissions: { ...DEFAULT_ROLE_PERMISSIONS, ...(remoteRbac.rolePermissions || {}) },
              users: remoteRbac.users
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  const pushRbacToCloud = (nextStore) => {
    const sbUrl = (import.meta.env?.VITE_SUPABASE_URL || localStorage.getItem('crowevar_supabase_url') || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1.*$/i, '').replace(/\/rest\/v1$/i, '').replace(/\/rest\/v1$/i, '');
    const sbKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || localStorage.getItem('crowevar_supabase_key') || '').trim();
    if (!sbUrl || !sbKey) return;
    fetch(`${sbUrl}/rest/v1/journal_store`, {
      method: 'POST',
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 'rbac_config',
        trades: [],
        profiles: nextStore,
        trash: auditLogs.slice(0, 100),
        updated_at: new Date().toISOString()
      })
    }).catch(() => {});
  };

  // Expose Global RBAC Bridge for App.jsx & Network Interceptor
  useEffect(() => {
    const allowedStages = [];
    if (effectivePermissions.viewStage1) allowedStages.push('Stage 1');
    if (effectivePermissions.viewStage2) allowedStages.push('Stage 2');
    if (effectivePermissions.viewFunded) allowedStages.push('Funded Account');
    if (effectivePermissions.viewLiveAccounts) allowedStages.push('Live Personal');

    window.__CROWEVAR_RBAC__ = {
      isAuthenticated,
      isAdmin,
      role: currentUser ? currentUser.role : 'VISITOR',
      user: currentUser,
      permissions: effectivePermissions,
      allowedStages,
      canWriteData,
      can: (k) => Boolean(effectivePermissions?.[k]),
      openLogin: () => setLoginModalOpen(true),
      logAuditEvent
    };

    window.dispatchEvent(new CustomEvent('crowevar-rbac-change', { detail: window.__CROWEVAR_RBAC__ }));
  }, [isAuthenticated, isAdmin, currentUser, effectivePermissions, canWriteData]);

  // Direct URL & Route Access Guard
  useEffect(() => {
    const checkUrlSecurity = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = String(window.location.hash || '').toLowerCase();
      const stageParam = (params.get('stage') || params.get('context') || '').toLowerCase();
      const adminParam = params.get('admin') || params.get('manage');

      if ((stageParam.includes('live') || hash.includes('live')) && !effectivePermissions.viewLiveAccounts) {
        params.delete('stage');
        params.delete('context');
        const cleanSearch = params.toString() ? `?${params.toString()}` : '';
        window.history.replaceState({}, '', `${window.location.pathname}${cleanSearch}`);
        setSecurityBannerNotice('🔒 Access Restricted: Live Accounts are hidden for unauthorized visitors.');
        logAuditEvent('UNAUTHORIZED_URL_BLOCKED', 'Blocked direct URL access attempt to Live Account section.', 'BLOCKED');
        setTimeout(() => setSecurityBannerNotice(''), 6000);
      }

      if ((adminParam || hash.includes('admin')) && !isAdmin) {
        params.delete('admin');
        params.delete('manage');
        const cleanSearch = params.toString() ? `?${params.toString()}` : '';
        window.history.replaceState({}, '', `${window.location.pathname}${cleanSearch}`);
        setSecurityBannerNotice('🔒 Administrator privileges required to access User & Role Management.');
        logAuditEvent('UNAUTHORIZED_URL_BLOCKED', 'Blocked direct URL access attempt to Admin Console.', 'BLOCKED');
        setTimeout(() => setSecurityBannerNotice(''), 6000);
      }
    };

    checkUrlSecurity();
    window.addEventListener('popstate', checkUrlSecurity);
    window.addEventListener('hashchange', checkUrlSecurity);
    return () => {
      window.removeEventListener('popstate', checkUrlSecurity);
      window.removeEventListener('hashchange', checkUrlSecurity);
    };
  }, [effectivePermissions.viewLiveAccounts, isAdmin]);

  // DOM-Level Security Enforcer: Hides Live Personal Card, Account Dropdown Options & + Add / Edit Button in Visitor Mode
  useEffect(() => {
    const enforceDomPolicies = () => {
      // 1. Hide or restore "Live Personal" card in the Challenge Lifecycle Matrix & auto-fit grid columns
      const allElements = document.querySelectorAll('h3, h4, span, div, p');
      let liveCardFound = null;

      allElements.forEach((el) => {
        const rawTxt = (el.textContent || '').trim();
        if (rawTxt === 'Live Personal' || rawTxt === 'LIVE PERSONAL') {
          let curr = el;
          while (curr && curr.parentElement) {
            const parentCls = String(curr.parentElement.className || '');
            if (
              parentCls.includes('grid') &&
              (parentCls.includes('lg:grid-cols-5') ||
                parentCls.includes('lg:grid-cols-4') ||
                parentCls.includes('sm:grid-cols-2'))
            ) {
              liveCardFound = curr;
              break;
            }
            curr = curr.parentElement;
          }
        }
      });

      if (liveCardFound && liveCardFound.parentElement) {
        const matrixGrid = liveCardFound.parentElement;
        if (!effectivePermissions.viewLiveAccounts) {
          liveCardFound.style.setProperty('display', 'none', 'important');
          matrixGrid.classList.remove('lg:grid-cols-5');
          matrixGrid.classList.add('lg:grid-cols-4');
        } else {
          liveCardFound.style.removeProperty('display');
          matrixGrid.classList.remove('lg:grid-cols-4');
          matrixGrid.classList.add('lg:grid-cols-5');
        }
      }

      // 2. Hide/disable "Live Personal" options & optgroups inside all <select> dropdowns for Visitors
      const selects = document.querySelectorAll('select');
      selects.forEach((sel) => {
        if (sel.closest('[data-rbac-ui="true"]')) return;
        const children = sel.querySelectorAll('optgroup, option');
        children.forEach((node) => {
          const labelTxt = (
            node.getAttribute('label') ||
            node.textContent ||
            node.value ||
            ''
          ).toLowerCase();
          if (labelTxt.includes('live personal') || labelTxt.includes('6004822')) {
            if (!effectivePermissions.viewLiveAccounts) {
              node.style.setProperty('display', 'none', 'important');
              node.disabled = true;
              node.hidden = true;
            } else {
              node.style.removeProperty('display');
              node.disabled = false;
              node.hidden = false;
            }
          }
        });
      });

      // 3. Hide "+ Add / Edit" button and all write/admin action buttons in Visitor Mode
      const buttons = document.querySelectorAll('button, label.cursor-pointer');
      buttons.forEach((btn) => {
        if (btn.closest('[data-rbac-ui="true"]')) return;
        const text = (btn.textContent || '').replace(/\s+/g, ' ').trim();
        const lowerText = text.toLowerCase();
        const title = (btn.getAttribute('title') || '').toLowerCase();

        // "+ Add / Edit" Multi-Account Stage Manager button
        const isAccountManageBtn =
          lowerText.includes('add / edit') ||
          lowerText.includes('add/edit') ||
          lowerText.includes('+ add') ||
          text === '+ ✎' ||
          lowerText.includes('add account') ||
          title.includes('manage stage accounts') ||
          title.includes('add or edit account');

        // Create / Import buttons
        const isCreateBtn =
          lowerText.includes('log trade') ||
          lowerText.includes('import html') ||
          lowerText.includes('upload entry screenshot') ||
          lowerText.includes('upload result screenshot') ||
          lowerText.includes('save & analyze');

        // Edit buttons
        const isEditBtn =
          lowerText === 'edit' ||
          lowerText.includes('edit trade') ||
          title.includes('edit trade') ||
          title.includes('edit execution');

        // Delete / Recycle Bin buttons
        const isDeleteBtn =
          lowerText.includes('trash') ||
          lowerText.includes('recycle bin') ||
          lowerText === 'delete' ||
          lowerText.includes('delete trade') ||
          title.includes('delete') ||
          title.includes('recycle bin');

        // Cloud Sync button
        const isCloudConfigBtn =
          title.includes('configure free cloud database sync') ||
          lowerText.includes('cloud sync');

        // Export CSV / HTML buttons
        const isExportBtn =
          lowerText.includes('export csv') ||
          lowerText.includes('export html');

        if (isAccountManageBtn) {
          if (!effectivePermissions.editAccountInfo) {
            btn.style.setProperty('display', 'none', 'important');
            btn.disabled = true;
          } else {
            btn.style.removeProperty('display');
            btn.disabled = false;
          }
        } else if (isCreateBtn) {
          if (!effectivePermissions.createTrades) {
            btn.style.setProperty('display', 'none', 'important');
            btn.disabled = true;
          } else {
            btn.style.removeProperty('display');
            btn.disabled = false;
          }
        } else if (isEditBtn) {
          if (!effectivePermissions.editTrades) {
            btn.style.setProperty('display', 'none', 'important');
            btn.disabled = true;
          } else {
            btn.style.removeProperty('display');
            btn.disabled = false;
          }
        } else if (isDeleteBtn) {
          if (!effectivePermissions.deleteTrades) {
            btn.style.setProperty('display', 'none', 'important');
            btn.disabled = true;
          } else {
            btn.style.removeProperty('display');
            btn.disabled = false;
          }
        } else if (isCloudConfigBtn) {
          if (!effectivePermissions.manageUsers) {
            btn.style.setProperty('display', 'none', 'important');
            btn.disabled = true;
          } else {
            btn.style.removeProperty('display');
            btn.disabled = false;
          }
        } else if (isExportBtn) {
          if (!effectivePermissions.accessReports) {
            btn.style.setProperty('display', 'none', 'important');
            btn.disabled = true;
          } else {
            btn.style.removeProperty('display');
            btn.disabled = false;
          }
        }
      });
    };

    enforceDomPolicies();
    const observer = new MutationObserver(() => enforceDomPolicies());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [effectivePermissions]);

  // Authentication Handlers
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');

    if (Date.now() < lockoutUntil) {
      const waitSec = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setLoginError(`Too many failed attempts. Try again in ${waitSec}s.`);
      return;
    }

    const identifier = loginUsername.trim().toLowerCase();
    const user = rbacStore.users.find(
      (u) => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier
    );

    if (!user) {
      const nextFails = failedAttempts + 1;
      setFailedAttempts(nextFails);
      if (nextFails >= 5) {
        setLockoutUntil(Date.now() + 60000);
        logAuditEvent('AUTH_LOCKOUT', `Account lockout triggered after 5 failed attempts for "${identifier}".`, 'BLOCKED', identifier, 'UNAUTHORIZED');
      } else {
        logAuditEvent('AUTH_LOGIN_FAILED', `Failed login attempt for unknown user "${identifier}".`, 'FAILED', identifier, 'UNAUTHORIZED');
      }
      setLoginError('Invalid username/email or password.');
      return;
    }

    if (user.status !== 'ACTIVE') {
      logAuditEvent('AUTH_LOGIN_SUSPENDED', `Suspended user "${user.username}" attempted to sign in.`, 'BLOCKED', user.username, user.role);
      setLoginError('This account has been suspended by an Administrator.');
      return;
    }

    const inputHash = hashPasswordSync(loginPassword, user.username);
    if (inputHash !== user.passwordHash) {
      const nextFails = failedAttempts + 1;
      setFailedAttempts(nextFails);
      if (nextFails >= 5) {
        setLockoutUntil(Date.now() + 60000);
      }
      logAuditEvent('AUTH_LOGIN_FAILED', `Invalid password entered for user "${user.username}".`, 'FAILED', user.username, user.role);
      setLoginError('Invalid username/email or password.');
      return;
    }

    // Success! Create session
    const newSession = {
      token: 'tok_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      userId: user.id,
      username: user.username,
      role: user.role,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
    };

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const updatedUsers = rbacStore.users.map((u) =>
      u.id === user.id ? { ...u, lastLogin: nowStr } : u
    );
    const nextStore = { ...rbacStore, users: updatedUsers };
    setRbacStore(nextStore);
    pushRbacToCloud(nextStore);

    localStorage.setItem(RBAC_SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
    setFailedAttempts(0);
    setLoginUsername('');
    setLoginPassword('');
    setLoginModalOpen(false);
    logAuditEvent('AUTH_LOGIN_SUCCESS', `User "${user.username}" (${user.role}) signed in successfully.`, 'SUCCESS', user.username, user.role);
  };

  const handleLogout = () => {
    const prevUser = currentUser?.username || 'User';
    const prevRole = currentUser?.role || 'USER';
    localStorage.removeItem(RBAC_SESSION_KEY);
    setSession(null);
    setAdminModalOpen(false);
    logAuditEvent('AUTH_LOGOUT', `User "${prevUser}" signed out. Reverted to Visitor Read-Only Mode.`, 'SUCCESS', prevUser, prevRole);
  };

  // Admin Console Handlers
  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const cleanUsername = newUserForm.username.trim().toLowerCase();
    const cleanEmail = newUserForm.email.trim().toLowerCase();
    const cleanName = newUserForm.displayName.trim() || cleanUsername;
    if (!cleanUsername || !newUserForm.password) {
      setAdminFeedback('⚠️ Username and password are required.');
      return;
    }
    if (rbacStore.users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      setAdminFeedback('⚠️ That username already exists.');
      return;
    }

    const createdUser = {
      id: 'usr-' + Date.now(),
      username: cleanUsername,
      email: cleanEmail || `${cleanUsername}@tradeatlas.io`,
      displayName: cleanName,
      role: newUserForm.role || 'TRADER',
      status: 'ACTIVE',
      passwordHash: hashPasswordSync(newUserForm.password, cleanUsername),
      customPermissions: null,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      lastLogin: null
    };

    const nextStore = {
      ...rbacStore,
      users: [...rbacStore.users, createdUser]
    };
    setRbacStore(nextStore);
    pushRbacToCloud(nextStore);
    setNewUserForm({ username: '', email: '', displayName: '', password: '', role: 'TRADER' });
    setAdminFeedback(`✅ Created user "${cleanUsername}" with role ${createdUser.role}.`);
    logAuditEvent('USER_CREATED', `Admin created user "${cleanUsername}" with role ${createdUser.role}.`, 'SUCCESS');
  };

  const handleUpdateUserRole = (userId, nextRole) => {
    if (!isAdmin) return;
    const target = rbacStore.users.find((u) => u.id === userId);
    if (!target) return;
    const nextStore = {
      ...rbacStore,
      users: rbacStore.users.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
    };
    setRbacStore(nextStore);
    pushRbacToCloud(nextStore);
    setAdminFeedback(`✅ Updated "${target.username}" role to ${nextRole}.`);
    logAuditEvent('ROLE_CHANGED', `Changed role for "${target.username}" from ${target.role} to ${nextRole}.`, 'SUCCESS');
  };

  const handleToggleUserStatus = (userId) => {
    if (!isAdmin) return;
    const target = rbacStore.users.find((u) => u.id === userId);
    if (!target || target.username === 'admin') {
      setAdminFeedback('⚠️ Primary Admin account cannot be suspended.');
      return;
    }
    const nextStatus = target.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const nextStore = {
      ...rbacStore,
      users: rbacStore.users.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
    };
    setRbacStore(nextStore);
    pushRbacToCloud(nextStore);
    logAuditEvent('USER_STATUS_CHANGED', `Set account status for "${target.username}" to ${nextStatus}.`, 'SUCCESS');
  };

  const handleDeleteUser = (userId) => {
    if (!isAdmin) return;
    const target = rbacStore.users.find((u) => u.id === userId);
    if (!target || target.username === 'admin') {
      setAdminFeedback('⚠️ Primary Admin account cannot be deleted.');
      return;
    }
    const nextStore = {
      ...rbacStore,
      users: rbacStore.users.filter((u) => u.id !== userId)
    };
    setRbacStore(nextStore);
    pushRbacToCloud(nextStore);
    logAuditEvent('USER_DELETED', `Deleted user account "${target.username}".`, 'SUCCESS');
  };

  const handleToggleRolePermission = (roleKey, permKey) => {
    if (!isAdmin) return;
    if (roleKey === 'ADMIN' && permKey === 'manageUsers') return; // Lock Admin manageUsers
    if (roleKey === 'VISITOR' && (permKey === 'viewLiveAccounts' || permKey === 'createTrades' || permKey === 'editTrades' || permKey === 'deleteTrades' || permKey === 'manageUsers')) {
      setAdminFeedback('⚠️ Security Policy: Visitors cannot be granted Live Account or Write permissions.');
      return;
    }

    const currentRoleObj = rbacStore.rolePermissions[roleKey] || DEFAULT_ROLE_PERMISSIONS[roleKey];
    const nextVal = !currentRoleObj[permKey];
    const nextStore = {
      ...rbacStore,
      rolePermissions: {
        ...rbacStore.rolePermissions,
        [roleKey]: {
          ...currentRoleObj,
          [permKey]: nextVal
        }
      }
    };
    setRbacStore(nextStore);
    pushRbacToCloud(nextStore);
    logAuditEvent('ROLE_PERMISSION_UPDATED', `Set ${roleKey}.${permKey} = ${nextVal}.`, 'SUCCESS');
  };

  const handleToggleUserCustomPerm = (userId, permKey) => {
    if (!isAdmin) return;
    const target = rbacStore.users.find((u) => u.id === userId);
    if (!target) return;
    const roleDefaults = rbacStore.rolePermissions[target.role] || DEFAULT_ROLE_PERMISSIONS[target.role];
    const currentCustom = target.customPermissions || {};
    const currentEffective = currentCustom[permKey] !== undefined ? currentCustom[permKey] : roleDefaults[permKey];
    const nextCustom = {
      ...currentCustom,
      [permKey]: !currentEffective
    };
    const nextStore = {
      ...rbacStore,
      users: rbacStore.users.map((u) => (u.id === userId ? { ...u, customPermissions: nextCustom } : u))
    };
    setRbacStore(nextStore);
    pushRbacToCloud(nextStore);
    logAuditEvent('USER_PERMISSION_OVERRIDE', `Updated custom permission ${permKey}=${!currentEffective} for "${target.username}".`, 'SUCCESS');
  };

  const handleChangeOwnPassword = (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const curHash = hashPasswordSync(passwordChangeForm.currentPassword, currentUser.username);
    if (curHash !== currentUser.passwordHash) {
      setAdminFeedback('⚠️ Current password is incorrect.');
      return;
    }
    if (!passwordChangeForm.newPassword || passwordChangeForm.newPassword.length < 6) {
      setAdminFeedback('⚠️ New password must be at least 6 characters.');
      return;
    }
    if (passwordChangeForm.newPassword !== passwordChangeForm.confirmPassword) {
      setAdminFeedback('⚠️ New passwords do not match.');
      return;
    }
    const newHash = hashPasswordSync(passwordChangeForm.newPassword, currentUser.username);
    const nextStore = {
      ...rbacStore,
      users: rbacStore.users.map((u) => (u.id === currentUser.id ? { ...u, passwordHash: newHash } : u))
    };
    setRbacStore(nextStore);
    pushRbacToCloud(nextStore);
    setPasswordChangeForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setAdminFeedback('✅ Password updated and synced to cloud!');
    logAuditEvent('PASSWORD_CHANGED', `User "${currentUser.username}" updated their password.`, 'SUCCESS');
  };

  return (
    <RBACContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        currentUser,
        effectivePermissions,
        can,
        canWriteData,
        openLogin: () => setLoginModalOpen(true),
        logout: handleLogout,
        logAuditEvent
      }}
    >
      {/* TOP RBAC SECURITY & ACCESS CONTROL BAR */}
      <div
        data-rbac-ui="true"
        className="sticky top-0 z-40 bg-[#040711]/95 backdrop-blur-md border-b border-cyan-500/25 px-3 sm:px-6 py-2 text-xs"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Current Role & Access Status */}
          <div className="flex flex-wrap items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span
                  className={
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border text-[11px] ' +
                    (DEFAULT_ROLE_PERMISSIONS[currentUser.role]?.badgeColor ||
                      'bg-emerald-950 text-emerald-300 border-emerald-500/40')
                  }
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{currentUser.role}</span>
                </span>
                <span className="text-slate-300 font-semibold">
                  {currentUser.displayName}{' '}
                  <span className="text-slate-500 font-mono text-[11px]">(@{currentUser.username})</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold text-[11px]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>VISITOR MODE (READ-ONLY)</span>
                </span>
                <span className="hidden md:inline text-slate-400 text-[11px]">
                  Viewing Prop Firm Stages Only (Stage 1, Stage 2, Funded) • Live Accounts &amp; Editing Locked
                </span>
              </div>
            )}

            {/* Active Access Level Pills */}
            <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-slate-800 text-[10px]">
              <span className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 font-semibold">
                Prop Stages: View
              </span>
              {effectivePermissions.viewLiveAccounts ? (
                <span className="px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 font-semibold">
                  Live Account: Visible
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800 font-semibold">
                  Live Account: Hidden
                </span>
              )}
              {canWriteData ? (
                <span className="px-2 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Write Access: Enabled
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800 font-semibold">
                  Write Access: Read-Only
                </span>
              )}
            </div>
          </div>

          {/* Right: Login / Admin Console / Logout Controls */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdminFeedback('');
                      setAdminModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold transition shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Admin RBAC ({rbacStore.users.length} Users)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAdminFeedback('');
                    setAdminTab('PASSWORD');
                    setAdminModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  title="Security & Password Settings"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLoginError('');
                  setLoginModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold transition shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Authorized Login</span>
              </button>
            )}
          </div>
        </div>

        {securityBannerNotice && (
          <div className="max-w-7xl mx-auto mt-2 bg-rose-950/80 border border-rose-500/50 rounded-xl px-3 py-1.5 text-rose-200 flex items-center justify-between">
            <span>{securityBannerNotice}</span>
            <button onClick={() => setSecurityBannerNotice('')} className="text-rose-300 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* MAIN APPLICATION */}
      {children}

      {/* ==================================================================== */}
      {/* AUTHORIZED USER LOGIN MODAL                                          */}
      {/* ==================================================================== */}
      {loginModalOpen && (
        <div
          data-rbac-ui="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-[#090d1a] border border-cyan-500/50 rounded-3xl max-w-md w-full p-6 space-y-5 text-xs shadow-[0_0_60px_rgba(6,182,212,0.25)]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Authorized Portal Sign In</h3>
                  <p className="text-[11px] text-slate-400">
                    Sign in to unlock Live Accounts, trade logging, and role permissions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loginError && (
              <div className="bg-rose-950/50 border border-rose-500/50 rounded-xl p-3 text-rose-300 flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Username or Email</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="admin or crowevar@tradeatlas.io"
                  className="w-full bg-[#0d1326] border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password..."
                    className="w-full bg-[#0d1326] border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 pr-10 text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Continue as Visitor
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-extrabold shadow-lg"
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ADMIN RBAC & USER MANAGEMENT CONSOLE MODAL                           */}
      {/* ==================================================================== */}
      {adminModalOpen && isAuthenticated && (
        <div
          data-rbac-ui="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
        >
          <div className="bg-[#090d1a] border border-amber-500/50 rounded-3xl max-w-5xl w-full max-h-[90dvh] flex flex-col text-xs shadow-[0_0_60px_rgba(245,158,11,0.2)] overflow-hidden">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-slate-800 bg-[#070b16]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {isAdmin ? 'Administrator Role-Based Access Control (RBAC) Console' : 'My Security Profile'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Manage user accounts, role assignments, section visibility, and security audit logs.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <div className="flex rounded-xl bg-[#0b1122] p-1 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAdminTab('USERS')}
                      className={
                        'px-3 py-1.5 rounded-lg font-bold transition ' +
                        (adminTab === 'USERS' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white')
                      }
                    >
                      👥 Users ({rbacStore.users.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab('ROLES')}
                      className={
                        'px-3 py-1.5 rounded-lg font-bold transition ' +
                        (adminTab === 'ROLES' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white')
                      }
                    >
                      🛡️ Role Permissions
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab('AUDIT')}
                      className={
                        'px-3 py-1.5 rounded-lg font-bold transition ' +
                        (adminTab === 'AUDIT' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white')
                      }
                    >
                      📋 Audit Log ({auditLogs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab('PASSWORD')}
                      className={
                        'px-3 py-1.5 rounded-lg font-bold transition ' +
                        (adminTab === 'PASSWORD' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white')
                      }
                    >
                      🔐 Password
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {adminFeedback && (
              <div className="mx-5 mt-4 bg-cyan-950/60 border border-cyan-500/40 rounded-xl px-4 py-2.5 text-cyan-200 font-semibold flex items-center justify-between">
                <span>{adminFeedback}</span>
                <button onClick={() => setAdminFeedback('')} className="text-cyan-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* TAB 1: USER ACCOUNTS MANAGEMENT */}
              {isAdmin && adminTab === 'USERS' && (
                <div className="space-y-6">
                  {/* Create New User Card */}
                  <form
                    onSubmit={handleCreateUser}
                    className="bg-[#0b1122] border border-slate-800 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                      <UserPlus className="w-4 h-4" />
                      <span>Create New Authorized User Account</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Username (e.g. john_trader)"
                        value={newUserForm.username}
                        onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                        className="bg-[#070b16] border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                      <input
                        type="text"
                        placeholder="Display Name"
                        value={newUserForm.displayName}
                        onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                        className="bg-[#070b16] border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={newUserForm.email}
                        onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                        className="bg-[#070b16] border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                      <input
                        type="password"
                        required
                        placeholder="Initial Password"
                        value={newUserForm.password}
                        onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                        className="bg-[#070b16] border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                      <div className="flex gap-2">
                        <select
                          value={newUserForm.role}
                          onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                          className="bg-[#070b16] border border-slate-700 rounded-xl px-2.5 py-2 text-white flex-1"
                        >
                          <option value="TRADER">TRADER (Full Trading)</option>
                          <option value="JUNIOR_TRADER">JUNIOR_TRADER (Prop Only)</option>
                          <option value="ANALYST">ANALYST (Read-Only All)</option>
                          <option value="VISITOR">VISITOR (Prop Read-Only)</option>
                          <option value="ADMIN">ADMIN (Full Admin)</option>
                        </select>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shrink-0"
                        >
                          + Create
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Existing Users List */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                      Registered User Directory &amp; Per-User Access Overrides
                    </h4>
                    {rbacStore.users.map((u) => {
                      const roleDef = rbacStore.rolePermissions[u.role] || DEFAULT_ROLE_PERMISSIONS[u.role] || {};
                      const userPerms = { ...roleDef, ...(u.customPermissions || {}) };
                      const isExpanded = editingUserCustomPerms === u.id;

                      return (
                        <div
                          key={u.id}
                          className="bg-[#0b1020] border border-slate-800 rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-white text-sm">{u.displayName}</span>
                                <span className="font-mono text-amber-300">@{u.username}</span>
                                <span className="text-slate-500">{u.email}</span>
                                <span
                                  className={
                                    'px-2 py-0.5 rounded text-[10px] font-bold ' +
                                    (u.status === 'ACTIVE'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-rose-500/20 text-rose-300')
                                  }
                                >
                                  {u.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                Created: {u.createdAt} • Last Login: {u.lastLogin || 'Never'}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={u.role}
                                disabled={u.username === 'admin'}
                                onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                className="bg-[#070b16] border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold"
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="TRADER">TRADER</option>
                                <option value="JUNIOR_TRADER">JUNIOR_TRADER</option>
                                <option value="ANALYST">ANALYST</option>
                                <option value="VISITOR">VISITOR</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => setEditingUserCustomPerms(isExpanded ? null : u.id)}
                                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold"
                              >
                                {isExpanded ? 'Hide Permissions' : '⚙️ Per-User Permissions'}
                              </button>

                              {u.username !== 'admin' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserStatus(u.id)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold"
                                  >
                                    {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Per-User Granular Permission Overrides */}
                          {isExpanded && (
                            <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {PERMISSION_DEFINITIONS.map((perm) => {
                                const enabled = Boolean(userPerms[perm.key]);
                                return (
                                  <label
                                    key={perm.key}
                                    className={
                                      'flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ' +
                                      (enabled
                                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                                        : 'bg-[#070b16] border-slate-800 text-slate-400')
                                    }
                                  >
                                    <div>
                                      <div className="font-bold text-[11px]">{perm.label}</div>
                                      <div className="text-[10px] opacity-75">
                                        {perm.category} • Access Level: {perm.level}
                                      </div>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={enabled}
                                      disabled={u.username === 'admin' && perm.key === 'manageUsers'}
                                      onChange={() => handleToggleUserCustomPerm(u.id, perm.key)}
                                      className="w-4 h-4 accent-emerald-500"
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: ROLE PERMISSIONS MATRIX */}
              {isAdmin && adminTab === 'ROLES' && (
                <div className="space-y-4">
                  <div className="bg-[#0b1122] border border-slate-800 rounded-2xl p-4">
                    <h4 className="font-bold text-white text-sm mb-1">
                      Role-Based Permission Matrix (Frontend &amp; Cloud Enforced)
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      Toggle permissions for any role below. Visitor Live Account &amp; Write permissions are permanently locked off for security.
                    </p>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#070b16] border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                          <th className="py-3 px-4">Permission / Section</th>
                          <th className="py-3 px-3">Level</th>
                          {Object.keys(DEFAULT_ROLE_PERMISSIONS).map((rKey) => (
                            <th key={rKey} className="py-3 px-3 text-center">
                              {rKey}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {PERMISSION_DEFINITIONS.map((perm) => (
                          <tr key={perm.key} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-4 font-semibold text-white">
                              {perm.label}
                              <span className="block text-[10px] text-slate-500 font-normal">
                                {perm.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] font-bold">
                                {perm.level}
                              </span>
                            </td>
                            {Object.keys(DEFAULT_ROLE_PERMISSIONS).map((rKey) => {
                              const roleObj =
                                rbacStore.rolePermissions[rKey] || DEFAULT_ROLE_PERMISSIONS[rKey];
                              const checked = Boolean(roleObj?.[perm.key]);
                              const locked =
                                (rKey === 'ADMIN' && perm.key === 'manageUsers') ||
                                (rKey === 'VISITOR' &&
                                  (perm.key === 'viewLiveAccounts' ||
                                    perm.key === 'createTrades' ||
                                    perm.key === 'editTrades' ||
                                    perm.key === 'deleteTrades' ||
                                    perm.key === 'editAccountInfo' ||
                                    perm.key === 'manageUsers'));

                              return (
                                <td key={rKey} className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={locked}
                                    onChange={() => handleToggleRolePermission(rKey, perm.key)}
                                    className={
                                      'w-4 h-4 ' +
                                      (locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer accent-cyan-400')
                                    }
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: SECURITY AUDIT LOG */}
              {isAdmin && adminTab === 'AUDIT' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">
                      Authentication &amp; Permission Audit Trail ({auditLogs.length} Events)
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const csv =
                          'Timestamp,Actor,Role,Event,Status,Details\n' +
                          auditLogs
                            .map(
                              (l) =>
                                `"${l.timestamp}","${l.actor}","${l.role}","${l.event}","${l.status}","${String(
                                  l.details || ''
                                ).replace(/"/g, '""')}"`
                            )
                            .join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `TradeAtlas_Security_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Audit CSV</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-[#0b1020] border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 text-[11px]">{log.timestamp}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold text-[10px]">
                              {log.event}
                            </span>
                            <span className="font-bold text-white">{log.actor}</span>
                            <span className="text-slate-500 text-[10px]">({log.role})</span>
                          </div>
                          <p className="text-slate-300 text-xs">{log.details}</p>
                        </div>
                        <span
                          className={
                            'px-2.5 py-0.5 rounded-full text-[10px] font-bold ' +
                            (log.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300')
                          }
                        >
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: CHANGE PASSWORD */}
              {adminTab === 'PASSWORD' && (
                <form
                  onSubmit={handleChangeOwnPassword}
                  className="max-w-md mx-auto bg-[#0b1122] border border-slate-800 rounded-2xl p-5 space-y-4"
                >
                  <h4 className="font-bold text-white text-sm">
                    Change Password for @{currentUser.username}
                  </h4>
                  <div>
                    <label className="block text-slate-400 mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={passwordChangeForm.currentPassword}
                      onChange={(e) =>
                        setPasswordChangeForm({ ...passwordChangeForm, currentPassword: e.target.value })
                      }
                      className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordChangeForm.newPassword}
                      onChange={(e) =>
                        setPasswordChangeForm({ ...passwordChangeForm, newPassword: e.target.value })
                      }
                      className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordChangeForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordChangeForm({ ...passwordChangeForm, confirmPassword: e.target.value })
                      }
                      className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-extrabold"
                  >
                    Update Password
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </RBACContext.Provider>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Edit3,
  Check,
  X,
  Download,
  Sparkles,
  Image as ImageIcon,
  Layers,
  Layout,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';

const CERT_STORAGE_KEY = 'crowevar_certificates_v1';
const IDB_NAME = 'CrowevarJournalDB';
const IDB_STORE = 'journal_state';

const THEME_PRESETS = {
  gold: {
    label: 'Gold Funded',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
    frameBorder: 'border-amber-500/40 hover:border-amber-400/80',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.18)]',
    accentBar: 'from-amber-500 via-yellow-300 to-amber-600',
    cornerColor: 'border-amber-400'
  },
  cyan: {
    label: 'Cyan Apex',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
    frameBorder: 'border-cyan-500/40 hover:border-cyan-400/80',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.18)]',
    accentBar: 'from-cyan-500 via-teal-300 to-blue-500',
    cornerColor: 'border-cyan-400'
  },
  emerald: {
    label: 'Emerald Payout',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
    frameBorder: 'border-emerald-500/40 hover:border-emerald-400/80',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.18)]',
    accentBar: 'from-emerald-500 via-teal-300 to-green-500',
    cornerColor: 'border-emerald-400'
  },
  violet: {
    label: 'Personal / Milestone',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50',
    frameBorder: 'border-indigo-500/40 hover:border-indigo-400/80',
    glow: 'shadow-[0_0_30px_rgba(99,102,241,0.18)]',
    accentBar: 'from-indigo-500 via-purple-400 to-pink-500',
    cornerColor: 'border-indigo-400'
  }
};

const idbSaveCertificates = (list) => {
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
      tx.objectStore(IDB_STORE).put(list, CERT_STORAGE_KEY);
    };
  } catch (e) {}
};

const idbLoadCertificates = (callback) => {
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
      const getReq = tx.objectStore(IDB_STORE).get(CERT_STORAGE_KEY);
      getReq.onsuccess = () => {
        if (Array.isArray(getReq.result)) {
          callback(getReq.result);
        }
      };
    };
  } catch (e) {}
};

const compressImageFile = (file, maxWidth = 1600, quality = 0.84) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (!dataUrl || typeof dataUrl !== 'string') {
        reject(new Error('Failed to read image'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.width || 1200;
          let h = img.height || 800;
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
        } catch (err) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function CertificateShowcase() {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(CERT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('spotlight'); // 'spotlight' | 'stack'
  const [fitMode, setFitMode] = useState('contain'); // 'contain' | 'cover'
  const [isDragging, setIsDragging] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState('');
  const [pendingTitle, setPendingTitle] = useState('Funded Trader Certificate');
  const [pendingSubtitle, setPendingSubtitle] = useState('Verified Prop Firm Achievement');
  const [pendingBadge, setPendingBadge] = useState('FUNDED CERT');
  const [pendingTheme, setPendingTheme] = useState('gold');

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editBadge, setEditBadge] = useState('');
  const [editTheme, setEditTheme] = useState('gold');

  const [lightboxItem, setLightboxItem] = useState(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [deletedUndoItem, setDeletedUndoItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fileInputRef = useRef(null);
  const initialCloudPulled = useRef(false);

  // Check RBAC so visitors can view & zoom certificates, while Admin can upload/edit/remove
  const canEdit = (() => {
    const rbac = typeof window !== 'undefined' ? window.__CROWEVAR_RBAC__ : null;
    if (!rbac) return true;
    return Boolean(rbac.canWriteData);
  })();

  const getSupabaseCreds = () => {
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

  // Load from IndexedDB and Supabase Cloud on mount
  useEffect(() => {
    idbLoadCertificates((idbList) => {
      if (Array.isArray(idbList) && idbList.length > 0) {
        setItems(idbList);
      }
    });

    const { cleanUrl, cleanKey } = getSupabaseCreds();
    if (cleanUrl && cleanKey) {
      fetch(`${cleanUrl}/rest/v1/journal_store?id=eq.certificates_master&select=*`, {
        headers: {
          apikey: cleanKey,
          Authorization: `Bearer ${cleanKey}`,
          Accept: 'application/json'
        }
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => {
          if (Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0].trades)) {
            const remoteCerts = rows[0].trades;
            if (remoteCerts.length > 0) {
              setItems((prev) => {
                const map = new Map();
                remoteCerts.forEach((c) => map.set(c.id, c));
                prev.forEach((c) => {
                  if (!map.has(c.id)) map.set(c.id, c);
                });
                const merged = Array.from(map.values());
                idbSaveCertificates(merged);
                return merged;
              });
            }
          }
          initialCloudPulled.current = true;
        })
        .catch(() => {
          initialCloudPulled.current = true;
        });
    } else {
      initialCloudPulled.current = true;
    }
  }, []);

  // Persist to LocalStorage, IndexedDB, and Supabase Cloud
  const persistItems = (nextList) => {
    setItems(nextList);
    idbSaveCertificates(nextList);
    try {
      localStorage.setItem(CERT_STORAGE_KEY, JSON.stringify(nextList));
    } catch {}

    const { cleanUrl, cleanKey } = getSupabaseCreds();
    if (cleanUrl && cleanKey && canEdit) {
      fetch(`${cleanUrl}/rest/v1/journal_store?on_conflict=id`, {
        method: 'POST',
        headers: {
          apikey: cleanKey,
          Authorization: `Bearer ${cleanKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          id: 'certificates_master',
          trades: nextList,
          updated_at: new Date().toISOString()
        })
      }).catch(() => {});
    }
  };

  const handleFilesSelected = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (!file.type.startsWith('image/')) return;
    try {
      const compressedDataUrl = await compressImageFile(file, 1600, 0.85);
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setPendingImage(compressedDataUrl);
      setPendingTitle(
        baseName.length > 2 && baseName.length < 42
          ? baseName
          : 'Funded Trader Certificate'
      );
      setPendingSubtitle(
        new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      );
      setPendingBadge('FUNDED CERT');
      setPendingTheme('gold');
      setUploadModalOpen(true);
    } catch (e) {}
  };

  const handleConfirmAddPhoto = () => {
    if (!pendingImage) return;
    const newItem = {
      id: `cert-${Date.now()}`,
      url: pendingImage,
      title: pendingTitle.trim() || 'Funded Certificate',
      subtitle: pendingSubtitle.trim() || 'Verified Achievement',
      badge: pendingBadge.trim() || 'VERIFIED',
      theme: pendingTheme || 'gold',
      createdAt: new Date().toISOString()
    };
    const next = [newItem, ...items];
    persistItems(next);
    setActiveIndex(0);
    setPendingImage('');
    setUploadModalOpen(false);
  };

  const handleRemoveItem = (idToRemove) => {
    const target = items.find((i) => i.id === idToRemove);
    if (!target) return;
    const next = items.filter((i) => i.id !== idToRemove);
    persistItems(next);
    setConfirmDeleteId(null);
    if (lightboxItem?.id === idToRemove) {
      setLightboxItem(null);
    }
    if (activeIndex >= next.length) {
      setActiveIndex(Math.max(0, next.length - 1));
    }
    setDeletedUndoItem(target);
    setTimeout(() => {
      setDeletedUndoItem((curr) => (curr?.id === target.id ? null : curr));
    }, 10000);
  };

  const handleUndoDelete = () => {
    if (!deletedUndoItem) return;
    const next = [deletedUndoItem, ...items];
    persistItems(next);
    setDeletedUndoItem(null);
    setActiveIndex(0);
  };

  const startEditingItem = (item) => {
    setEditingId(item.id);
    setEditTitle(item.title || '');
    setEditSubtitle(item.subtitle || '');
    setEditBadge(item.badge || 'FUNDED CERT');
    setEditTheme(item.theme || 'gold');
  };

  const saveEditItem = (id) => {
    const next = items.map((it) =>
      it.id === id
        ? {
            ...it,
            title: editTitle.trim() || 'Funded Certificate',
            subtitle: editSubtitle.trim() || '',
            badge: editBadge.trim() || 'VERIFIED',
            theme: editTheme || 'gold'
          }
        : it
    );
    persistItems(next);
    setEditingId(null);
  };

  const safeActiveIndex = Math.min(activeIndex, Math.max(0, items.length - 1));
  const currentItem = items[safeActiveIndex] || null;

  // Collapsed Sleek Dock Tab on the Left Side
  if (collapsed) {
    return (
      <div className="xl:sticky xl:top-5 z-30 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="group flex xl:flex-col items-center justify-between gap-3 bg-[#090d1a]/95 hover:bg-[#0d1529] border border-amber-500/40 hover:border-cyan-400/70 rounded-2xl p-3 text-slate-200 shadow-[0_0_25px_rgba(245,158,11,0.15)] transition-all"
          title="Expand Prop Firm Certificate & Photo Showcase"
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-400/40 text-amber-300">
            <Award className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-extrabold tracking-widest uppercase xl:[writing-mode:vertical-rl] xl:rotate-180 text-amber-200 group-hover:text-cyan-300 transition">
            Certificates ({items.length})
          </span>
          <ChevronRight className="w-4 h-4 text-cyan-400" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-full xl:w-[315px] 2xl:w-[345px] shrink-0 xl:sticky xl:top-5 z-30 select-none">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          handleFilesSelected(e.target.files);
          e.target.value = '';
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (canEdit) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (canEdit && e.dataTransfer?.files?.length) {
            handleFilesSelected(e.dataTransfer.files);
          }
        }}
        className={`relative rounded-3xl bg-[#090d1a]/95 backdrop-blur-xl border transition-all duration-300 overflow-hidden ${
          isDragging
            ? 'border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.35)]'
            : 'border-slate-800/90 hover:border-amber-500/40 shadow-[0_10px_40px_rgba(0,0,0,0.65)]'
        }`}
      >
        {/* Top Iridescent Gold-Cyan Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400" />

        {/* Ambient Corner Glow */}
        <div className="pointer-events-none absolute -top-16 -left-16 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="p-4 space-y-3.5 relative z-10">
          {/* Header Bar */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-cyan-500/20 border border-amber-400/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-black tracking-wider uppercase text-white">
                    PROP FIRM <span className="text-amber-400">CERTS</span>
                  </h2>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {items.length}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Funded Certificates &amp; Showcase
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setViewMode((m) => (m === 'spotlight' ? 'stack' : 'spotlight'))
                  }
                  className="p-1.5 rounded-lg bg-[#0d1326] hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-cyan-300 transition"
                  title={
                    viewMode === 'spotlight'
                      ? 'Switch to Vertical Stack View'
                      : 'Switch to Spotlight Carousel View'
                  }
                >
                  {viewMode === 'spotlight' ? (
                    <Layers className="w-3.5 h-3.5" />
                  ) : (
                    <Layout className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setFitMode((f) => (f === 'contain' ? 'cover' : 'contain'))
                  }
                  className="px-2 py-1 rounded-lg bg-[#0d1326] hover:bg-slate-800 border border-slate-700/80 text-[10px] font-bold text-slate-300 hover:text-amber-300 transition"
                  title="Toggle Image Fit vs Fill Frame"
                >
                  {fitMode === 'contain' ? 'FIT' : 'FILL'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg bg-[#0d1326] hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white transition"
                title="Collapse Left Showcase Panel"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Undo Toast Banner when a photo is removed */}
          {deletedUndoItem && (
            <div className="flex items-center justify-between gap-2 bg-amber-950/40 border border-amber-500/40 rounded-xl px-3 py-2 text-[11px] text-amber-200">
              <span className="truncate">Removed "{deletedUndoItem.title}"</span>
              <button
                type="button"
                onClick={handleUndoDelete}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-extrabold shrink-0 hover:bg-amber-400 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            </div>
          )}

          {/* EMPTY STATE */}
          {items.length === 0 ? (
            <div
              onClick={() => canEdit && fileInputRef.current?.click()}
              className={`group relative rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-amber-400/70 bg-gradient-to-b from-[#0d1326]/90 to-[#070a14]/90 p-6 text-center transition-all ${
                canEdit ? 'cursor-pointer' : ''
              }`}
            >
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 via-cyan-500/15 to-transparent border border-amber-400/40 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-[0_0_25px_rgba(245,158,11,0.15)]">
                <Award className="w-7 h-7 text-amber-300" />
              </div>
              <h3 className="text-xs font-extrabold text-white tracking-wide">
                Display Your Funded Certificate
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Upload your Prop Firm Funded Account Certificate, Payout Proof, or personal milestone photo.
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-400 hover:from-amber-400 hover:to-cyan-300 text-slate-950 font-extrabold text-xs shadow-[0_0_20px_rgba(245,158,11,0.3)] transition"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Photo / Cert</span>
                </button>
              )}
            </div>
          ) : (
            /* CERTIFICATES DISPLAY (SPOTLIGHT OR STACK VIEW) */
            <div className="space-y-3.5">
              {(viewMode === 'stack' ? items : [currentItem].filter(Boolean)).map(
                (item, idx) => {
                  const themeObj =
                    THEME_PRESETS[item.theme] || THEME_PRESETS.gold;
                  const isEditingThis = editingId === item.id;
                  const isConfirmingDelete = confirmDeleteId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`group relative rounded-2xl bg-[#070b16] border ${themeObj.frameBorder} ${themeObj.glow} overflow-hidden transition-all duration-300`}
                    >
                      {/* Top Metallic Frame Strip */}
                      <div
                        className={`h-1 w-full bg-gradient-to-r ${themeObj.accentBar}`}
                      />

                      {/* Image Showcase Container */}
                      <div
                        onClick={() => {
                          setLightboxItem(item);
                          setLightboxZoom(1);
                        }}
                        className="relative w-full aspect-[4/3] bg-gradient-to-b from-[#0b1122] to-[#050811] flex items-center justify-center overflow-hidden cursor-zoom-in p-2"
                      >
                        {/* Corner Luxury Reticle Accents */}
                        <div
                          className={`pointer-events-none absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 ${themeObj.cornerColor} opacity-70`}
                        />
                        <div
                          className={`pointer-events-none absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 ${themeObj.cornerColor} opacity-70`}
                        />
                        <div
                          className={`pointer-events-none absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 ${themeObj.cornerColor} opacity-70`}
                        />
                        <div
                          className={`pointer-events-none absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 ${themeObj.cornerColor} opacity-70`}
                        />

                        <img
                          src={item.url}
                          alt={item.title}
                          className={`w-full h-full rounded-lg transition-transform duration-500 group-hover:scale-[1.03] ${
                            fitMode === 'cover'
                              ? 'object-cover'
                              : 'object-contain'
                          }`}
                        />

                        {/* Floating Top-Left Verified Badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase backdrop-blur-md border shadow-sm bg-black/70 text-amber-300 border-amber-400/40">
                          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                          <span>{item.badge || 'FUNDED CERT'}</span>
                        </div>

                        {/* Hover Action Pill Overlay */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-lg"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxItem(item);
                              setLightboxZoom(1);
                            }}
                            className="p-1.5 rounded-lg hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300 transition"
                            title="View Full Size"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditingItem(item)}
                                className="p-1.5 rounded-lg hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 transition"
                                title="Edit Title & Style"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(item.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 transition"
                                title="Remove Photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Delete Confirmation Overlay Bar */}
                      {isConfirmingDelete && (
                        <div className="bg-rose-950/90 border-t border-rose-500/50 px-3 py-2.5 flex items-center justify-between gap-2 text-xs">
                          <span className="text-rose-200 font-bold text-[11px]">
                            Remove this photo?
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-semibold hover:bg-slate-700"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline Edit Drawer OR Caption Plaque */}
                      {isEditingThis ? (
                        <div className="p-3 bg-[#0b1122] border-t border-slate-800 space-y-2 text-xs">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Certificate / Photo Title"
                            className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:border-cyan-400 focus:outline-none"
                          />
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              value={editBadge}
                              onChange={(e) => setEditBadge(e.target.value)}
                              placeholder="Badge (e.g. FUNDED)"
                              className="bg-[#070b16] border border-slate-700 rounded-lg px-2 py-1 text-amber-300 font-mono text-[11px] focus:outline-none"
                            />
                            <input
                              type="text"
                              value={editSubtitle}
                              onChange={(e) => setEditSubtitle(e.target.value)}
                              placeholder="Date / Subtitle"
                              className="bg-[#070b16] border border-slate-700 rounded-lg px-2 py-1 text-slate-300 text-[11px] focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-1 pt-1">
                            <div className="flex items-center gap-1">
                              {Object.keys(THEME_PRESETS).map((tk) => (
                                <button
                                  key={tk}
                                  type="button"
                                  onClick={() => setEditTheme(tk)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    editTheme === tk
                                      ? THEME_PRESETS[tk].badgeBg
                                      : 'bg-slate-900 border-slate-800 text-slate-400'
                                  }`}
                                >
                                  {tk.toUpperCase()}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEditItem(item.id)}
                                className="p-1 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="px-3.5 py-2.5 bg-[#080d1a] border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-white truncate">
                              {item.title}
                            </h4>
                            {item.subtitle && (
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                              title="Remove Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}

              {/* Thumbnail Carousel Strip when in Spotlight Mode and > 1 photo */}
              {viewMode === 'spotlight' && items.length > 1 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-1">
                    <span>
                      Showing {safeActiveIndex + 1} of {items.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveIndex(
                            (i) => (i - 1 + items.length) % items.length
                          )
                        }
                        className="p-1 rounded-md bg-[#0d1326] hover:bg-slate-800 border border-slate-700 text-slate-200"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveIndex((i) => (i + 1) % items.length)
                        }
                        className="p-1 rounded-md bg-[#0d1326] hover:bg-slate-800 border border-slate-700 text-slate-200"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {items.map((thumb, idx) => (
                      <div
                        key={thumb.id}
                        onClick={() => setActiveIndex(idx)}
                        className={`relative group/thumb aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all ${
                          idx === safeActiveIndex
                            ? 'border-amber-400 ring-2 ring-amber-400/30 scale-[1.02]'
                            : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={thumb.url}
                          alt={thumb.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Add / Upload Button */}
          {canEdit && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#0d162c] hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-extrabold text-xs transition shadow-inner"
              >
                <Plus className="w-4 h-4" />
                <span>Add Certificate / Personal Photo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ADD / CUSTOMIZE CERTIFICATE MODAL                                     */}
      {/* ===================================================================== */}
      {uploadModalOpen && pendingImage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090d1a] border border-amber-500/50 rounded-3xl max-w-md w-full p-5 space-y-4 text-xs shadow-[0_0_50px_rgba(245,158,11,0.25)]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Frame Your Certificate / Photo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingImage('');
                  setUploadModalOpen(false);
                }}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-[#060913] border border-slate-800 p-2 flex items-center justify-center max-h-56 overflow-hidden">
              <img
                src={pendingImage}
                alt="Preview"
                className="max-h-52 w-auto object-contain rounded-lg"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Title / Achievement Name
                </label>
                <input
                  type="text"
                  value={pendingTitle}
                  onChange={(e) => setPendingTitle(e.target.value)}
                  placeholder="e.g. EquityEdge Funded Trader Certificate"
                  className="w-full bg-[#0d1326] border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    value={pendingBadge}
                    onChange={(e) => setPendingBadge(e.target.value)}
                    placeholder="FUNDED CERT"
                    className="w-full bg-[#0d1326] border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Date / Account Note
                  </label>
                  <input
                    type="text"
                    value={pendingSubtitle}
                    onChange={(e) => setPendingSubtitle(e.target.value)}
                    placeholder="Oct 2026 • $100K Funded"
                    className="w-full bg-[#0d1326] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Frame Glow Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(THEME_PRESETS).map(([key, t]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPendingTheme(key)}
                      className={`px-3 py-2 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                        pendingTheme === key
                          ? t.badgeBg
                          : 'bg-[#0d1326] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{t.label}</span>
                      {pendingTheme === key && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setPendingImage('');
                  setUploadModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddPhoto}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-400 text-slate-950 font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                Save to Left Showcase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULL-SCREEN LIGHTBOX ZOOM MODAL                                       */}
      {/* ===================================================================== */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl bg-[#090d1a] border border-amber-500/40 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col max-h-[90vh]"
          >
            {/* Top Bar */}
            <div className="px-5 py-3.5 bg-[#0d1326] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-white">
                    {lightboxItem.title}
                  </h3>
                  {lightboxItem.subtitle && (
                    <p className="text-[11px] text-slate-400">
                      {lightboxItem.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setLightboxZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))
                  }
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-cyan-300 px-2">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))
                  }
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <a
                  href={lightboxItem.url}
                  download={`${(lightboxItem.title || 'certificate').replace(/\s+/g, '_')}.jpg`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(lightboxItem.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setLightboxItem(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image Canvas */}
            <div className="flex-1 overflow-auto p-6 bg-[#050811] flex items-center justify-center">
              <img
                src={lightboxItem.url}
                alt={lightboxItem.title}
                style={{ transform: `scale(${lightboxZoom})`, transformOrigin: 'center center' }}
                className="max-h-[72vh] w-auto object-contain rounded-xl shadow-2xl transition-transform duration-200"
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
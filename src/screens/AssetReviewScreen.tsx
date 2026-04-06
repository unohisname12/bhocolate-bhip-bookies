import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GENERATED_ASSETS,
  ASSET_CATEGORIES,
  CATEGORY_LABELS,
} from '../config/generatedAssetManifest';
import type { AssetCategory, ReviewStatus } from '../config/generatedAssetManifest';
import {
  loadReviews,
  setReviewStatus,
  setReviewNote,
  getReviewStats,
  exportReport,
  exportFixList,
  resetAllReviews,
} from '../services/assetReview';
import type { AssetReviewMap } from '../services/assetReview';

type StatusFilter = ReviewStatus | 'all';

interface AssetReviewScreenProps {
  onExit: () => void;
}

export const AssetReviewScreen: React.FC<AssetReviewScreenProps> = ({ onExit }) => {
  const [reviews, setReviews] = useState<AssetReviewMap>(() => loadReviews());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [showContextPreview, setShowContextPreview] = useState(false);

  // Filtered asset list
  const filteredAssets = useMemo(() => {
    return GENERATED_ASSETS.filter((a) => {
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && (reviews[a.id]?.status ?? 'unreviewed') !== statusFilter) return false;
      return true;
    });
  }, [categoryFilter, statusFilter, reviews]);

  const currentAsset = filteredAssets[currentIndex] ?? null;
  const currentReview = currentAsset ? reviews[currentAsset.id] : null;
  const stats = useMemo(() => getReviewStats(reviews), [reviews]);

  // Keep index in bounds when filters change
  useEffect(() => {
    if (currentIndex >= filteredAssets.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- bounds correction when filter shrinks the list
      setCurrentIndex(Math.max(0, filteredAssets.length - 1));
    }
  }, [filteredAssets.length, currentIndex]);

  // Sync note input when asset changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync derived state when selected asset changes
    setNoteInput(currentReview?.note ?? '');
  }, [currentAsset?.id, currentReview?.note]);

  const navigate = useCallback((delta: number) => {
    setCurrentIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return filteredAssets.length - 1;
      if (next >= filteredAssets.length) return 0;
      return next;
    });
  }, [filteredAssets.length]);

  const handleSetStatus = useCallback((status: ReviewStatus) => {
    if (!currentAsset) return;
    const updated = setReviewStatus(reviews, currentAsset.id, status);
    setReviews(updated);
    // Auto-advance on status set
    if (currentIndex < filteredAssets.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentAsset, reviews, currentIndex, filteredAssets.length]);

  const handleSaveNote = useCallback(() => {
    if (!currentAsset) return;
    const updated = setReviewNote(reviews, currentAsset.id, noteInput);
    setReviews(updated);
  }, [currentAsset, reviews, noteInput]);

  const handleExport = useCallback((type: 'full' | 'fix') => {
    const json = type === 'full' ? exportReport(reviews) : exportFixList(reviews);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'full' ? 'asset_review_report.json' : 'asset_fix_list.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [reviews]);

  const handleReset = useCallback(() => {
    if (window.confirm('Reset ALL review statuses to unreviewed? This cannot be undone.')) {
      setReviews(resetAllReviews());
      setCurrentIndex(0);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigate(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigate(1);
          break;
        case 'k':
        case 'K':
          handleSetStatus('keep');
          break;
        case 'r':
        case 'R':
          handleSetStatus('reject');
          break;
        case 'f':
        case 'F':
          handleSetStatus('fix');
          break;
        case 'u':
        case 'U':
          handleSetStatus('unreviewed');
          break;
        case 'c':
        case 'C':
          setShowContextPreview((v) => !v);
          break;
        case '1':
          setCategoryFilter('all');
          setCurrentIndex(0);
          break;
        case '2':
          setCategoryFilter('icon');
          setCurrentIndex(0);
          break;
        case '3':
          setCategoryFilter('item');
          setCurrentIndex(0);
          break;
        case '4':
          setCategoryFilter('reward');
          setCurrentIndex(0);
          break;
        case '5':
          setCategoryFilter('room');
          setCurrentIndex(0);
          break;
        case '6':
          setCategoryFilter('effect');
          setCurrentIndex(0);
          break;
        case '7':
          setCategoryFilter('math');
          setCurrentIndex(0);
          break;
        case '8':
          setCategoryFilter('pet');
          setCurrentIndex(0);
          break;
        case '9':
          setCategoryFilter('scene');
          setCurrentIndex(0);
          break;
        case '0':
          setCategoryFilter('egg');
          setCurrentIndex(0);
          break;
        case 'Escape':
          if (showExportPanel) setShowExportPanel(false);
          else onExit();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, handleSetStatus, onExit, showExportPanel]);

  const statusColors: Record<ReviewStatus, string> = {
    unreviewed: 'bg-slate-600 text-slate-300',
    keep: 'bg-green-600 text-green-100',
    reject: 'bg-red-600 text-red-100',
    fix: 'bg-amber-600 text-amber-100',
  };

  const statusBorderColors: Record<ReviewStatus, string> = {
    unreviewed: 'border-slate-500',
    keep: 'border-green-500',
    reject: 'border-red-500',
    fix: 'border-amber-500',
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold"
          >
            ← Back
          </button>
          <h1 className="text-xl font-black tracking-wider uppercase text-cyan-400">
            Asset Review
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className="text-green-400">{stats.keep} Keep</span>
          <span className="text-red-400">{stats.reject} Reject</span>
          <span className="text-amber-400">{stats.fix} Fix</span>
          <span className="text-slate-400">{stats.unreviewed} Left</span>
          <button
            onClick={() => setShowExportPanel(true)}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm"
          >
            Export
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all duration-300"
          style={{ width: `${((stats.total - stats.unreviewed) / stats.total) * 100}%` }}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-2 bg-slate-800/50 border-b border-slate-700 overflow-x-auto">
        <div className="flex gap-1 items-center mr-2">
          <span className="text-xs text-slate-500 uppercase font-bold">Cat:</span>
          <FilterButton active={categoryFilter === 'all'} onClick={() => { setCategoryFilter('all'); setCurrentIndex(0); }}>All</FilterButton>
          {ASSET_CATEGORIES.map((cat, i) => (
            <FilterButton key={cat} active={categoryFilter === cat} onClick={() => { setCategoryFilter(cat); setCurrentIndex(0); }}>
              <span className="text-xs text-slate-500 mr-1">{i + 2}</span>{CATEGORY_LABELS[cat]}
            </FilterButton>
          ))}
        </div>
        <div className="w-px bg-slate-600 mx-1" />
        <div className="flex gap-1 items-center">
          <span className="text-xs text-slate-500 uppercase font-bold">Status:</span>
          <FilterButton active={statusFilter === 'all'} onClick={() => { setStatusFilter('all'); setCurrentIndex(0); }}>All</FilterButton>
          <FilterButton active={statusFilter === 'unreviewed'} onClick={() => { setStatusFilter('unreviewed'); setCurrentIndex(0); }}>Unreviewed</FilterButton>
          <FilterButton active={statusFilter === 'keep'} onClick={() => { setStatusFilter('keep'); setCurrentIndex(0); }}>Keep</FilterButton>
          <FilterButton active={statusFilter === 'reject'} onClick={() => { setStatusFilter('reject'); setCurrentIndex(0); }}>Reject</FilterButton>
          <FilterButton active={statusFilter === 'fix'} onClick={() => { setStatusFilter('fix'); setCurrentIndex(0); }}>Fix</FilterButton>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {filteredAssets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-lg">
            No assets match current filters.
          </div>
        ) : currentAsset ? (
          <div className="flex-1 flex flex-col lg:flex-row">
            {/* Asset preview panel */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
              {/* Navigation counter */}
              <div className="text-sm text-slate-400 font-mono">
                {currentIndex + 1} / {filteredAssets.length}
                <span className="text-slate-600 ml-2">({stats.total - stats.unreviewed}/{stats.total} reviewed)</span>
              </div>

              {/* Large preview */}
              <div className={`relative border-4 rounded-2xl p-4 transition-colors ${statusBorderColors[currentReview?.status ?? 'unreviewed']}`}>
                {/* Checkerboard background for transparency */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    backgroundImage: 'repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  <img
                    src={currentAsset.path}
                    alt={currentAsset.filename}
                    className="block"
                    style={{
                      width: Math.max(currentAsset.width * 2, 192),
                      height: Math.max(currentAsset.height * 2, 192),
                      imageRendering: 'pixelated',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="%23333"/><text x="64" y="64" text-anchor="middle" dy=".3em" fill="%23999" font-size="12">Missing</text></svg>';
                    }}
                  />
                </div>

                {/* Status badge */}
                <div className={`absolute -top-3 -right-3 px-3 py-1 rounded-full text-xs font-black uppercase ${statusColors[currentReview?.status ?? 'unreviewed']}`}>
                  {currentReview?.status ?? 'unreviewed'}
                </div>
              </div>

              {/* Asset info */}
              <div className="text-center space-y-1">
                <h2 className="text-lg font-black text-slate-100">{currentAsset.id}</h2>
                <p className="text-xs text-slate-500 font-mono">{currentAsset.path}</p>
                <p className="text-xs text-slate-400">{currentAsset.width}x{currentAsset.height} — {CATEGORY_LABELS[currentAsset.category]}</p>
                <p className="text-xs text-slate-500 italic max-w-md">"{currentAsset.prompt}"</p>
              </div>

              {/* Review buttons */}
              <div className="flex gap-3">
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm">
                  ← Prev
                </button>
                <button
                  onClick={() => handleSetStatus('keep')}
                  className={`px-5 py-2 rounded-lg font-black text-sm transition-all ${
                    currentReview?.status === 'keep'
                      ? 'bg-green-500 text-white ring-2 ring-green-300 scale-105'
                      : 'bg-green-700 hover:bg-green-600 text-green-100'
                  }`}
                >
                  ✓ Keep (K)
                </button>
                <button
                  onClick={() => handleSetStatus('reject')}
                  className={`px-5 py-2 rounded-lg font-black text-sm transition-all ${
                    currentReview?.status === 'reject'
                      ? 'bg-red-500 text-white ring-2 ring-red-300 scale-105'
                      : 'bg-red-700 hover:bg-red-600 text-red-100'
                  }`}
                >
                  ✕ Reject (R)
                </button>
                <button
                  onClick={() => handleSetStatus('fix')}
                  className={`px-5 py-2 rounded-lg font-black text-sm transition-all ${
                    currentReview?.status === 'fix'
                      ? 'bg-amber-500 text-white ring-2 ring-amber-300 scale-105'
                      : 'bg-amber-700 hover:bg-amber-600 text-amber-100'
                  }`}
                >
                  ⚙ Fix (F)
                </button>
                <button onClick={() => navigate(1)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm">
                  Next →
                </button>
              </div>

              {/* Note input */}
              <div className="flex gap-2 w-full max-w-md">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNote(); }}
                  placeholder="Note (e.g. 'too dark', 'wrong colors')..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button onClick={handleSaveNote} className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded-lg text-sm font-bold">
                  Save
                </button>
              </div>

              {/* Context preview toggle */}
              <button
                onClick={() => setShowContextPreview((v) => !v)}
                className="text-xs text-slate-500 hover:text-slate-300 underline"
              >
                {showContextPreview ? 'Hide' : 'Show'} Context Preview (C)
              </button>

              {/* Context preview: show asset in simulated game contexts */}
              {showContextPreview && currentAsset && (
                <div className="w-full max-w-lg bg-slate-800 rounded-xl p-4 space-y-3 border border-slate-700">
                  <h3 className="text-sm font-bold text-slate-300">Context Preview</h3>
                  <div className="flex gap-4 flex-wrap justify-center">
                    {/* Dark background */}
                    <ContextBox label="Dark BG" bg="bg-slate-900">
                      <img src={currentAsset.path} alt="" className="w-12 h-12 object-contain" style={{ imageRendering: 'pixelated' }} />
                    </ContextBox>
                    {/* Light background */}
                    <ContextBox label="Light BG" bg="bg-slate-200">
                      <img src={currentAsset.path} alt="" className="w-12 h-12 object-contain" style={{ imageRendering: 'pixelated' }} />
                    </ContextBox>
                    {/* Game HUD mockup */}
                    <ContextBox label="HUD Bar" bg="bg-slate-800">
                      <div className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded">
                        <img src={currentAsset.path} alt="" className="w-6 h-6 object-contain" style={{ imageRendering: 'pixelated' }} />
                        <span className="text-xs font-bold text-amber-400">42</span>
                      </div>
                    </ContextBox>
                    {/* Shop card mockup */}
                    <ContextBox label="Shop Card" bg="bg-slate-700">
                      <div className="flex flex-col items-center p-2 rounded-lg border border-slate-600 w-20">
                        <img src={currentAsset.path} alt="" className="w-10 h-10 object-contain mb-1" style={{ imageRendering: 'pixelated' }} />
                        <span className="text-[10px] font-bold text-slate-300">Item</span>
                        <span className="text-[10px] text-amber-400">10 ⚡</span>
                      </div>
                    </ContextBox>
                    {/* 2x scaled */}
                    <ContextBox label="2x Scale" bg="bg-slate-900">
                      <img src={currentAsset.path} alt="" className="w-24 h-24 object-contain" style={{ imageRendering: 'pixelated' }} />
                    </ContextBox>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail strip (right side on large screens, bottom on small) */}
            <div className="lg:w-48 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 overflow-y-auto max-h-48 lg:max-h-[calc(100vh-10rem)]">
              <div className="grid grid-cols-6 lg:grid-cols-3 gap-1 p-2">
                {filteredAssets.map((asset, i) => {
                  const r = reviews[asset.id];
                  const isCurrent = i === currentIndex;
                  return (
                    <button
                      key={asset.id}
                      onClick={() => setCurrentIndex(i)}
                      className={`relative rounded overflow-hidden border-2 transition-all ${
                        isCurrent
                          ? 'border-cyan-400 scale-110 z-10'
                          : `${statusBorderColors[r?.status ?? 'unreviewed']} opacity-70 hover:opacity-100`
                      }`}
                      title={`${asset.id} (${r?.status ?? 'unreviewed'})`}
                    >
                      <img
                        src={asset.path}
                        alt={asset.filename}
                        className="w-full aspect-square object-contain bg-slate-900"
                        style={{ imageRendering: 'pixelated' }}
                        loading="lazy"
                      />
                      {r?.status && r.status !== 'unreviewed' && (
                        <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                          r.status === 'keep' ? 'bg-green-500' : r.status === 'reject' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Keyboard help */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
        <div className="flex gap-4">
          <span>←/→ Navigate</span>
          <span><kbd className="px-1 bg-slate-700 rounded">K</kbd> Keep</span>
          <span><kbd className="px-1 bg-slate-700 rounded">R</kbd> Reject</span>
          <span><kbd className="px-1 bg-slate-700 rounded">F</kbd> Fix</span>
          <span><kbd className="px-1 bg-slate-700 rounded">U</kbd> Unmark</span>
          <span><kbd className="px-1 bg-slate-700 rounded">C</kbd> Context</span>
          <span><kbd className="px-1 bg-slate-700 rounded">1-0</kbd> Category</span>
          <span><kbd className="px-1 bg-slate-700 rounded">Esc</kbd> Exit</span>
        </div>
        <button onClick={handleReset} className="text-red-400 hover:text-red-300 text-xs">
          Reset All
        </button>
      </div>

      {/* Export modal */}
      {showExportPanel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowExportPanel(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-600" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black text-cyan-400 mb-4">Export Review Data</h2>

            <div className="space-y-3 mb-4">
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-400">Total:</span> <span className="font-bold">{stats.total}</span></div>
                  <div><span className="text-green-400">Keep:</span> <span className="font-bold">{stats.keep}</span></div>
                  <div><span className="text-red-400">Reject:</span> <span className="font-bold">{stats.reject}</span></div>
                  <div><span className="text-amber-400">Fix:</span> <span className="font-bold">{stats.fix}</span></div>
                  <div className="col-span-2"><span className="text-slate-400">Unreviewed:</span> <span className="font-bold">{stats.unreviewed}</span></div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleExport('full')}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-sm"
              >
                Full Report (JSON)
              </button>
              <button
                onClick={() => handleExport('fix')}
                className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold text-sm"
                disabled={stats.fix === 0}
              >
                Fix List ({stats.fix} items)
              </button>
            </div>

            <button
              onClick={() => setShowExportPanel(false)}
              className="w-full mt-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* Helper components */

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap transition-colors ${
        active ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
      }`}
    >
      {children}
    </button>
  );
}

function ContextBox({ label, bg, children }: { label: string; bg: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${bg} rounded-lg p-3 flex items-center justify-center min-w-[60px] min-h-[60px]`}>
        {children}
      </div>
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}

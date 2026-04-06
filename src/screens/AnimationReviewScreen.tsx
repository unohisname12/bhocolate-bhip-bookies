import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ANIMATION_DEFINITIONS } from '../config/animationManifest';
import {
  loadAnimationReviews,
  setAnimationReviewStatus,
  setAnimationReviewNote,
  getAnimationReviewStats,
  exportAnimationReport,
  exportAnimationFixList,
  resetAllAnimationReviews,
} from '../services/animationReview';
import type { AnimationReviewMap, ReviewStatus } from '../services/animationReview';

type StatusFilter = ReviewStatus | 'all';

interface AnimationReviewScreenProps {
  onExit: () => void;
}

export const AnimationReviewScreen: React.FC<AnimationReviewScreenProps> = ({ onExit }) => {
  const [reviews, setReviews] = useState<AnimationReviewMap>(() => loadAnimationReviews());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [showGrid, setShowGrid] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [frameCount, setFrameCount] = useState(20); // default, updated when sprite loads
  const [previewScale, setPreviewScale] = useState(2);
  const [previewBg, setPreviewBg] = useState<'dark' | 'light' | 'checker'>('checker');
  const animFrameRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  // Filtered animation list
  const filteredAnims = useMemo(() => {
    return ANIMATION_DEFINITIONS.filter((a) => {
      if (statusFilter !== 'all' && (reviews[a.id]?.status ?? 'unreviewed') !== statusFilter) return false;
      return true;
    });
  }, [statusFilter, reviews]);

  const currentAnim = filteredAnims[currentIndex] ?? null;
  const currentReview = currentAnim ? reviews[currentAnim.id] : null;
  const stats = useMemo(() => getAnimationReviewStats(reviews), [reviews]);

  // Keep index in bounds
  useEffect(() => {
    if (currentIndex >= filteredAnims.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- bounds correction when filter shrinks the list
      setCurrentIndex(Math.max(0, filteredAnims.length - 1));
    }
  }, [filteredAnims.length, currentIndex]);

  // Reset frame when animation changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync derived state when selected animation changes
    setCurrentFrame(0);
    setNoteInput(currentReview?.note ?? '');
  }, [currentAnim?.id, currentReview?.note]);

  // Detect frame count from sprite sheet image
  useEffect(() => {
    if (!currentAnim) return;
    const img = new Image();
    img.onload = () => {
      const cols = Math.round(img.naturalWidth / 128);
      setFrameCount(Math.max(1, cols));
    };
    img.src = currentAnim.spriteSheetPath;
  }, [currentAnim?.spriteSheetPath, currentAnim]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;
    const frameDuration = 180 / speed;

    const tick = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= frameDuration) {
        lastFrameTimeRef.current = timestamp;
        setCurrentFrame((prev) => (prev + 1) % frameCount);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, speed, frameCount]);

  const navigate = useCallback((delta: number) => {
    setCurrentIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return filteredAnims.length - 1;
      if (next >= filteredAnims.length) return 0;
      return next;
    });
  }, [filteredAnims.length]);

  const handleSetStatus = useCallback((status: ReviewStatus) => {
    if (!currentAnim) return;
    const updated = setAnimationReviewStatus(reviews, currentAnim.id, status);
    setReviews(updated);
    if (currentIndex < filteredAnims.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentAnim, reviews, currentIndex, filteredAnims.length]);

  const handleSaveNote = useCallback(() => {
    if (!currentAnim) return;
    const updated = setAnimationReviewNote(reviews, currentAnim.id, noteInput);
    setReviews(updated);
  }, [currentAnim, reviews, noteInput]);

  const handleExport = useCallback((type: 'full' | 'fix') => {
    const json = type === 'full' ? exportAnimationReport(reviews) : exportAnimationFixList(reviews);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'full' ? 'animation_review_report.json' : 'animation_fix_list.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [reviews]);

  const handleReset = useCallback(() => {
    if (window.confirm('Reset ALL animation review statuses? This cannot be undone.')) {
      setReviews(resetAllAnimationReviews());
      setCurrentIndex(0);
    }
  }, []);

  const stepFrame = useCallback((delta: number) => {
    setIsPlaying(false);
    setCurrentFrame((prev) => {
      const next = prev + delta;
      if (next < 0) return frameCount - 1;
      if (next >= frameCount) return 0;
      return next;
    });
  }, [frameCount]);

  const cycleSpeed = useCallback((direction: number) => {
    const speeds = [0.25, 0.5, 1, 1.5, 2, 3];
    const idx = speeds.indexOf(speed);
    const next = idx + direction;
    if (next >= 0 && next < speeds.length) setSpeed(speeds[next]);
  }, [speed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); navigate(-1); break;
        case 'ArrowRight': e.preventDefault(); navigate(1); break;
        case 'k': case 'K': handleSetStatus('keep'); break;
        case 'r': case 'R': handleSetStatus('reject'); break;
        case 'f': case 'F': handleSetStatus('fix'); break;
        case 'u': case 'U': handleSetStatus('unreviewed'); break;
        case ' ': e.preventDefault(); setIsPlaying((v) => !v); break;
        case ',': stepFrame(-1); break;
        case '.': stepFrame(1); break;
        case '[': cycleSpeed(-1); break;
        case ']': cycleSpeed(1); break;
        case 'g': case 'G': setShowGrid((v) => !v); break;
        case 'Escape':
          if (showExportPanel) setShowExportPanel(false);
          else onExit();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, handleSetStatus, onExit, showExportPanel, stepFrame, cycleSpeed]);

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

  const bgStyles: Record<string, React.CSSProperties> = {
    dark: { backgroundColor: '#0f172a' },
    light: { backgroundColor: '#e2e8f0' },
    checker: {
      backgroundImage: 'repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%)',
      backgroundSize: '20px 20px',
    },
  };

  // Compute sprite style for playback
  const spriteStyle = useMemo((): React.CSSProperties => {
    if (!currentAnim) return {};
    const scale = previewScale;
    const w = 128 * scale;
    const h = 128 * scale;
    const bgW = frameCount * 128 * scale;
    return {
      width: `${w}px`,
      height: `${h}px`,
      overflow: 'hidden',
      backgroundImage: `url(${currentAnim.spriteSheetPath})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: `${-currentFrame * 128 * scale}px 0px`,
      backgroundSize: `${bgW}px ${h}px`,
      imageRendering: 'pixelated' as const,
    };
  }, [currentAnim, currentFrame, frameCount, previewScale]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm font-bold"
          >
            &larr; Back
          </button>
          <h1 className="text-xl font-black tracking-wider uppercase text-cyan-400">
            Animation Review
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

      {/* Status filters */}
      <div className="flex gap-2 px-4 py-2 bg-slate-800/50 border-b border-slate-700 overflow-x-auto">
        <div className="flex gap-1 items-center">
          <span className="text-xs text-slate-500 uppercase font-bold">Status:</span>
          {(['all', 'unreviewed', 'keep', 'reject', 'fix'] as StatusFilter[]).map((s) => (
            <FilterButton key={s} active={statusFilter === s} onClick={() => { setStatusFilter(s); setCurrentIndex(0); }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </FilterButton>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {filteredAnims.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-lg">
            No animations match current filters.
          </div>
        ) : currentAnim ? (
          <div className="flex-1 flex flex-col lg:flex-row">
            {/* Animation preview panel */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
              {/* Navigation counter */}
              <div className="text-sm text-slate-400 font-mono">
                {currentIndex + 1} / {filteredAnims.length}
                <span className="text-slate-600 ml-2">({stats.total - stats.unreviewed}/{stats.total} reviewed)</span>
              </div>

              {/* Preview area */}
              <div className="flex gap-4 items-start">
                {/* Animated playback */}
                <div className={`relative border-4 rounded-2xl p-4 transition-colors ${statusBorderColors[currentReview?.status ?? 'unreviewed']}`}>
                  <div className="rounded-xl overflow-hidden" style={bgStyles[previewBg]}>
                    <div style={spriteStyle} />
                  </div>
                  <div className={`absolute -top-3 -right-3 px-3 py-1 rounded-full text-xs font-black uppercase ${statusColors[currentReview?.status ?? 'unreviewed']}`}>
                    {currentReview?.status ?? 'unreviewed'}
                  </div>
                </div>

                {/* Grid view */}
                {showGrid && (
                  <div className="border-2 border-slate-600 rounded-xl p-2">
                    <p className="text-xs text-slate-500 mb-1 text-center">Raw Grid</p>
                    <img
                      src={currentAnim.gridImagePath}
                      alt={`${currentAnim.label} grid`}
                      className="block"
                      style={{ width: 320, height: 256, imageRendering: 'pixelated' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="256"><rect width="320" height="256" fill="%23333"/><text x="160" y="128" text-anchor="middle" dy=".3em" fill="%23999" font-size="14">No grid.png</text></svg>';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Playback controls */}
              <div className="flex items-center gap-3 text-sm">
                <button onClick={() => stepFrame(-1)} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded font-mono">&lt;</button>
                <button
                  onClick={() => setIsPlaying((v) => !v)}
                  className={`px-4 py-1 rounded font-bold ${isPlaying ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button onClick={() => stepFrame(1)} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded font-mono">&gt;</button>
                <span className="text-slate-400 font-mono text-xs">
                  Frame {currentFrame + 1}/{frameCount}
                </span>
                <span className="text-slate-600">|</span>
                <button onClick={() => cycleSpeed(-1)} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">-</button>
                <span className="text-slate-300 font-mono text-xs">{speed}x</span>
                <button onClick={() => cycleSpeed(1)} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">+</button>
                <span className="text-slate-600">|</span>
                {([1, 1.5, 2, 3] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setPreviewScale(s)}
                    className={`px-2 py-1 rounded text-xs font-bold ${previewScale === s ? 'bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                  >
                    {s}x
                  </button>
                ))}
                <span className="text-slate-600">|</span>
                {(['dark', 'light', 'checker'] as const).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setPreviewBg(bg)}
                    className={`px-2 py-1 rounded text-xs ${previewBg === bg ? 'bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                  >
                    {bg}
                  </button>
                ))}
              </div>

              {/* Frame strip */}
              <div className="flex gap-1 overflow-x-auto max-w-full py-1 px-2">
                {Array.from({ length: frameCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => { setIsPlaying(false); setCurrentFrame(i); }}
                    className={`flex-shrink-0 border-2 rounded overflow-hidden transition-all ${
                      i === currentFrame ? 'border-cyan-400 scale-110' : 'border-slate-600 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        backgroundImage: `url(${currentAnim.spriteSheetPath})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: `${-i * 40}px 0px`,
                        backgroundSize: `${frameCount * 40}px 40px`,
                        imageRendering: 'pixelated' as const,
                      }}
                    />
                  </button>
                ))}
              </div>

              {/* Animation info */}
              <div className="text-center space-y-1">
                <h2 className="text-lg font-black text-slate-100">{currentAnim.label}</h2>
                <p className="text-xs text-slate-500 font-mono">{currentAnim.id}</p>
                <p className="text-xs text-slate-500 italic max-w-md">"{currentAnim.prompt.slice(0, 120)}..."</p>
              </div>

              {/* Review buttons */}
              <div className="flex gap-3">
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm">
                  &larr; Prev
                </button>
                {([
                  { status: 'keep' as const, label: 'Keep', key: 'K', color: 'green' },
                  { status: 'reject' as const, label: 'Reject', key: 'R', color: 'red' },
                  { status: 'fix' as const, label: 'Fix', key: 'F', color: 'amber' },
                ]).map(({ status, label, key, color }) => (
                  <button
                    key={status}
                    onClick={() => handleSetStatus(status)}
                    className={`px-5 py-2 rounded-lg font-black text-sm transition-all ${
                      currentReview?.status === status
                        ? `bg-${color}-500 text-white ring-2 ring-${color}-300 scale-105`
                        : `bg-${color}-700 hover:bg-${color}-600 text-${color}-100`
                    }`}
                  >
                    {status === 'keep' ? '\u2713' : status === 'reject' ? '\u2715' : '\u2699'} {label} ({key})
                  </button>
                ))}
                <button onClick={() => navigate(1)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm">
                  Next &rarr;
                </button>
              </div>

              {/* Note input */}
              <div className="flex gap-2 w-full max-w-md">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNote(); }}
                  placeholder="Note (e.g. 'inconsistent frames', 'wrong pose')..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button onClick={handleSaveNote} className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded-lg text-sm font-bold">
                  Save
                </button>
              </div>
            </div>

            {/* Thumbnail strip (right side on large screens) */}
            <div className="lg:w-48 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 overflow-y-auto max-h-48 lg:max-h-[calc(100vh-10rem)]">
              <div className="grid grid-cols-4 lg:grid-cols-2 gap-1 p-2">
                {filteredAnims.map((anim, i) => {
                  const r = reviews[anim.id];
                  const isCurrent = i === currentIndex;
                  return (
                    <button
                      key={anim.id}
                      onClick={() => setCurrentIndex(i)}
                      className={`relative rounded overflow-hidden border-2 transition-all ${
                        isCurrent
                          ? 'border-cyan-400 scale-110 z-10'
                          : `${statusBorderColors[r?.status ?? 'unreviewed']} opacity-70 hover:opacity-100`
                      }`}
                      title={`${anim.label} (${r?.status ?? 'unreviewed'})`}
                    >
                      <div className="w-full aspect-square bg-slate-900 flex items-center justify-center">
                        <img
                          src={anim.gridImagePath}
                          alt={anim.label}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                          loading="lazy"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = 'none';
                            el.parentElement!.innerHTML = `<span class="text-[9px] text-slate-500 text-center leading-tight">${anim.label}</span>`;
                          }}
                        />
                      </div>
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
        <div className="flex gap-3 flex-wrap">
          <span>&larr;/&rarr; Navigate</span>
          <span><kbd className="px-1 bg-slate-700 rounded">K</kbd> Keep</span>
          <span><kbd className="px-1 bg-slate-700 rounded">R</kbd> Reject</span>
          <span><kbd className="px-1 bg-slate-700 rounded">F</kbd> Fix</span>
          <span><kbd className="px-1 bg-slate-700 rounded">U</kbd> Unmark</span>
          <span><kbd className="px-1 bg-slate-700 rounded">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1 bg-slate-700 rounded">,</kbd>/<kbd className="px-1 bg-slate-700 rounded">.</kbd> Step</span>
          <span><kbd className="px-1 bg-slate-700 rounded">[</kbd>/<kbd className="px-1 bg-slate-700 rounded">]</kbd> Speed</span>
          <span><kbd className="px-1 bg-slate-700 rounded">G</kbd> Grid</span>
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
            <h2 className="text-lg font-black text-cyan-400 mb-4">Export Animation Reviews</h2>
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

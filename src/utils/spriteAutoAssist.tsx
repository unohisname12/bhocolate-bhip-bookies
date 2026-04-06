import React, { useState, useEffect, useRef, useCallback } from 'react';
import { analyzeSpriteSheet, groupSimilarFrames } from './spriteAnalysis';
import type { FrameGroup, SpriteAnalysis } from './spriteAnalysis';
import type { SpriteSheetConfig } from '../engine/animation/types';

interface SpriteAutoAssistProps extends Pick<SpriteSheetConfig, 'cols' | 'rows' | 'frameWidth' | 'frameHeight'> {
  spriteUrl: string;
  onGroupsChange?: (groups: FrameGroup[]) => void;
}

export const SpriteAutoAssist: React.FC<SpriteAutoAssistProps> = ({
  spriteUrl,
  cols,
  rows,
  frameWidth,
  frameHeight,
  onGroupsChange,
}) => {
  const [analysis, setAnalysis] = useState<SpriteAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.1);
  const [groups, setGroups] = useState<FrameGroup[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const analyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await analyzeSpriteSheet(
        spriteUrl,
        cols,
        rows,
        frameWidth,
        frameHeight,
        similarityThreshold
      );
      setAnalysis(result);
      setGroups(result.groups);
      onGroupsChange?.(result.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const updateGroupName = (index: number, name: string) => {
    const newGroups = [...groups];
    newGroups[index] = { ...newGroups[index], name };
    setGroups(newGroups);
    onGroupsChange?.(newGroups);
  };

  const reanalyze = useCallback(() => {
    if (analysis) {
      const newGroups = groupSimilarFrames(analysis.frames, similarityThreshold);
      setGroups(newGroups);
      onGroupsChange?.(newGroups);
    }
  }, [analysis, similarityThreshold, onGroupsChange]);

  useEffect(() => {
    if (analysis) {
      reanalyze();
    }
  }, [analysis, reanalyze]);

  // Draw debug visualization
  useEffect(() => {
    if (!analysis || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const scale = 2;

    canvas.width = cols * frameWidth * scale;
    canvas.height = rows * frameHeight * scale;

    // Draw sprite sheet
    for (let i = 0; i < analysis.frames.length; i++) {
      const fCol = i % cols;
      const fRow = Math.floor(i / cols);
      const x = fCol * frameWidth * scale;
      const y = fRow * frameHeight * scale;

      // Create image data from frame
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = frameWidth;
      tempCanvas.height = frameHeight;
      tempCtx.putImageData(analysis.frames[i], 0, 0);

      // Draw scaled frame
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, x, y, frameWidth * scale, frameHeight * scale);
    }

    // Draw group overlays
    groups.forEach((group, groupIndex) => {
      const colors = ['rgba(255,0,0,0.3)', 'rgba(0,255,0,0.3)', 'rgba(0,0,255,0.3)', 'rgba(255,255,0,0.3)', 'rgba(255,0,255,0.3)'];
      const color = colors[groupIndex % colors.length];

      for (let frameIndex = group.start; frameIndex <= group.end; frameIndex++) {
        const fCol = frameIndex % cols;
        const fRow = Math.floor(frameIndex / cols);
        const x = fCol * frameWidth * scale;
        const y = fRow * frameHeight * scale;

        ctx.fillStyle = color;
        ctx.fillRect(x, y, frameWidth * scale, frameHeight * scale);

        // Draw frame number
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.fillText(frameIndex.toString(), x + 2, y + 12);
      }
    });
  }, [analysis, groups, cols, rows, frameWidth, frameHeight]);

  return (
    <div className="p-4 bg-slate-800 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-4">Sprite Animation Auto-Assist</h3>

      <div className="mb-4">
        <button
          onClick={analyze}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze Sprite Sheet'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-600 text-white rounded">
          Error: {error}
        </div>
      )}

      {analysis && (
        <>
          <div className="mb-4">
            <label className="block text-white mb-2">
              Similarity Threshold: {similarityThreshold.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="mb-4">
            <h4 className="text-white font-bold mb-2">Suggested Animation Groups:</h4>
            <div className="space-y-2">
              {groups.map((group, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-white">
                    Group {index}: frames {group.start} - {group.end}
                  </span>
                  <input
                    type="text"
                    placeholder="Name this animation"
                    value={group.name || ''}
                    onChange={(e) => updateGroupName(index, e.target.value)}
                    className="px-2 py-1 bg-slate-700 text-white rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-white font-bold mb-2">Debug Visualization:</h4>
            <canvas
              ref={canvasRef}
              className="border border-slate-600 bg-slate-900"
              style={{ imageRendering: 'pixelated' }}
            />
            <p className="text-sm text-slate-400 mt-2">
              Colored overlays show grouped frames. White numbers indicate frame indices.
            </p>
          </div>

          <div className="mb-4">
            <h4 className="text-white font-bold mb-2">Generated Animation Config:</h4>
            <pre className="bg-slate-900 p-2 rounded text-green-400 text-sm overflow-x-auto">
              {`animations: {\n${groups.map((group, index) => {
                const name = group.name || 'animation_' + index;
                return `  ${name}: { startFrame: ${group.start}, endFrame: ${group.end}, frameDuration: 180 }`;
              }).join(',\n')}\n}`}
            </pre>
          </div>
        </>
      )}
    </div>
  );
};

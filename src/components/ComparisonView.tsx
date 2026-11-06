'use client';

import React from 'react';
import { SimulationSummary } from '@/lib/types';
import { ArrowDownRight, TrendingDown, CheckCircle, ArrowRight, Zap } from 'lucide-react';

interface ComparisonViewProps {
  baselineSummary: SimulationSummary;
  optimizedSummary: SimulationSummary;
  improvements: {
    timeReductionSec: number;
    timeReductionPercent: number;
    queueReductionCount: number;
    queueReductionPercent: number;
    waitReductionSec: number;
  };
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  baselineSummary,
  optimizedSummary,
  improvements,
}) => {
  const maxSimTime = Math.max(
    baselineSummary.completionTime,
    optimizedSummary.completionTime,
    50
  );
  const totalOccupants = baselineSummary.totalOccupants;

  // Generate SVG path for Baseline evacuation curve
  const basePoints = baselineSummary.timeSeries.map((pt) => {
    const x = (pt.time / maxSimTime) * 440;
    const y = 160 - (pt.evacuated / totalOccupants) * 140;
    return `${x},${y}`;
  });
  const basePathD = `M 0,160 L ${basePoints.join(' L ')}`;

  // Generate SVG path for Optimized evacuation curve
  const optPoints = optimizedSummary.timeSeries.map((pt) => {
    const x = (pt.time / maxSimTime) * 440;
    const y = 160 - (pt.evacuated / totalOccupants) * 140;
    return `${x},${y}`;
  });
  const optPathD = `M 0,160 L ${optPoints.join(' L ')}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Zap className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white">
              Comparative Analysis: Baseline (Shortest-Path) vs Congestion-Aware
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical validation of research hypothesis: accounting for shared corridor throughput reduces total evacuation duration.
          </p>
        </div>

        {/* Improvement Summary Badge */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5">
            <ArrowDownRight className="w-4 h-4" />
            <span>Time Saved: {improvements.timeReductionSec}s ({improvements.timeReductionPercent}%)</span>
          </div>
        </div>
      </div>

      {/* Side-by-side Metrics Comparison Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Baseline Card */}
        <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Strategy A: Baseline (Distance Only)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Dijkstra Shortest Path</span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] font-sans text-slate-400">Evacuation Time (T_end)</div>
              <div className="text-xl font-bold text-slate-100">{baselineSummary.completionTime}s</div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] font-sans text-slate-400">Peak Queue Length</div>
              <div className="text-xl font-bold text-rose-400">{baselineSummary.peakQueueLength} people</div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] font-sans text-slate-400">Primary Bottleneck</div>
              <div className="text-xs font-bold text-amber-300 truncate" title={baselineSummary.primaryBottleneckCorridor}>
                {baselineSummary.primaryBottleneckCorridor}
              </div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] font-sans text-slate-400">Exit Balancing</div>
              <div className="text-xs text-slate-300 font-sans">
                {Object.entries(baselineSummary.exitDistribution)
                  .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                  .join(' | ')}
              </div>
            </div>
          </div>
        </div>

        {/* Optimized Card */}
        <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 space-y-3 glow-emerald">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Strategy B: Congestion-Aware (Optimized)
            </span>
            <span className="text-[11px] text-emerald-400/90 font-mono font-semibold">Iterative Reassignment</span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-emerald-500/30">
              <div className="text-[11px] font-sans text-slate-400">Evacuation Time (T_end)</div>
              <div className="text-xl font-bold text-emerald-400">{optimizedSummary.completionTime}s</div>
              <div className="text-[10px] text-emerald-400/80 font-sans mt-0.5">
                ↓ {improvements.timeReductionSec}s faster ({improvements.timeReductionPercent}% cut)
              </div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-emerald-500/30">
              <div className="text-[11px] font-sans text-slate-400">Peak Queue Length</div>
              <div className="text-xl font-bold text-emerald-300">{optimizedSummary.peakQueueLength} people</div>
              <div className="text-[10px] text-emerald-400/80 font-sans mt-0.5">
                ↓ {improvements.queueReductionCount} people ({improvements.queueReductionPercent}% cut)
              </div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] font-sans text-slate-400">Primary Bottleneck</div>
              <div className="text-xs font-bold text-emerald-300 truncate" title={optimizedSummary.primaryBottleneckCorridor}>
                {optimizedSummary.primaryBottleneckCorridor}
              </div>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] font-sans text-slate-400">Exit Balancing</div>
              <div className="text-xs text-slate-300 font-sans">
                {Object.entries(optimizedSummary.exitDistribution)
                  .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                  .join(' | ')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Cumulative Evacuation Progress Curve Chart */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Evacuation Progression Curves (Occupants Cleared vs Elapsed Time)
          </h4>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-1 rounded bg-amber-400 inline-block" /> Baseline
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-1 rounded bg-emerald-400 inline-block" /> Congestion-Aware
            </span>
          </div>
        </div>

        <div className="w-full flex justify-center">
          <svg viewBox="0 0 480 180" className="w-full max-w-[560px] h-auto font-mono text-[9px] select-none">
            {/* Horizontal Grid lines */}
            <line x1="40" y1="20" x2="480" y2="20" stroke="#1e293b" strokeDasharray="3, 3" />
            <text x="35" y="23" textAnchor="end" fill="#64748b">{totalOccupants}</text>

            <line x1="40" y1="90" x2="480" y2="90" stroke="#1e293b" strokeDasharray="3, 3" />
            <text x="35" y="93" textAnchor="end" fill="#64748b">{Math.round(totalOccupants / 2)}</text>

            <line x1="40" y1="160" x2="480" y2="160" stroke="#334155" strokeWidth="1" />
            <text x="35" y="163" textAnchor="end" fill="#64748b">0</text>

            {/* Time labels on X Axis */}
            <text x="40" y="175" textAnchor="start" fill="#64748b">0s</text>
            <text x="260" y="175" textAnchor="middle" fill="#64748b">{Math.round(maxSimTime / 2)}s</text>
            <text x="480" y="175" textAnchor="end" fill="#64748b">{maxSimTime}s</text>

            {/* Curves */}
            <g transform="translate(40, 0)">
              {/* Baseline Path */}
              <path
                d={basePathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Optimized Path */}
              <path
                d={optPathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};

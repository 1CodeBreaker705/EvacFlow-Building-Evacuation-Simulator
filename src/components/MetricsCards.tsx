'use client';

import React from 'react';
import { Clock, Users, AlertOctagon, TrendingDown, ArrowDownRight, ShieldCheck } from 'lucide-react';
import { SimulationSummary, EvacuationStrategy } from '@/lib/types';

interface MetricsCardsProps {
  currentSummary: SimulationSummary;
  baselineSummary?: SimulationSummary;
  strategy: EvacuationStrategy;
  currentEvacuated: number;
  totalOccupants: number;
  currentTime: number;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  currentSummary,
  baselineSummary,
  strategy,
  currentEvacuated,
  totalOccupants,
  currentTime,
}) => {
  const isOptimized = strategy === 'optimized';
  const evacuatedPercent =
    totalOccupants > 0 ? Math.round((currentEvacuated / totalOccupants) * 100) : 0;

  // Comparison deltas against baseline
  const timeDelta = baselineSummary
    ? baselineSummary.completionTime - currentSummary.completionTime
    : 0;
  const timeDeltaPct =
    baselineSummary && baselineSummary.completionTime > 0
      ? Math.round((timeDelta / baselineSummary.completionTime) * 100)
      : 0;

  const queueDelta = baselineSummary
    ? baselineSummary.peakQueueLength - currentSummary.peakQueueLength
    : 0;
  const queueDeltaPct =
    baselineSummary && baselineSummary.peakQueueLength > 0
      ? Math.round((queueDelta / baselineSummary.peakQueueLength) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Evacuation Completion Time */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Evacuation Time (T_end)
          </span>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {currentSummary.completionTime}s
            </span>
            <span className="text-xs text-slate-400">total duration</span>
          </div>

          {isOptimized && timeDelta > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400 font-semibold">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>
                {timeDelta}s faster ({timeDeltaPct}% improvement)
              </span>
            </div>
          )}
          {!isOptimized && (
            <div className="mt-2 text-xs text-amber-400/90 font-medium">
              Baseline Shortest-Path
            </div>
          )}
        </div>
      </div>

      {/* 2. Real-time Evacuation Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Occupants Evacuated
          </span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {currentEvacuated}
            </span>
            <span className="text-xs text-slate-400">/ {totalOccupants} people</span>
          </div>

          {/* Progress bar */}
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-1.5 transition-all duration-300"
              style={{ width: `${evacuatedPercent}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-400">
            <span>Progress</span>
            <span className="font-mono font-medium text-emerald-400">{evacuatedPercent}%</span>
          </div>
        </div>
      </div>

      {/* 3. Peak Bottleneck Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Peak Corridor Queue
          </span>
          <div
            className={`p-2 rounded-lg ${
              currentSummary.peakQueueLength > 0
                ? 'bg-rose-500/10 text-rose-400'
                : 'bg-emerald-500/10 text-emerald-400'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                currentSummary.peakQueueLength > 20
                  ? 'text-rose-400'
                  : currentSummary.peakQueueLength > 0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {currentSummary.peakQueueLength}
            </span>
            <span className="text-xs text-slate-400">queued occupants</span>
          </div>

          {isOptimized && queueDelta > 0 ? (
            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400 font-semibold">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Reduced by {queueDelta} people ({queueDeltaPct}%)</span>
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-400">
              Avg delay: <strong className="text-slate-300">{currentSummary.averageWaitTime}s</strong>
            </div>
          )}
        </div>
      </div>

      {/* 4. Primary Bottleneck Chokepoint */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Critical Bottleneck
          </span>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-base sm:text-lg font-bold text-slate-100 truncate" title={currentSummary.primaryBottleneckCorridor}>
            {currentSummary.primaryBottleneckCorridor}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                currentSummary.primaryBottleneckCorridor.includes('C2')
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {currentSummary.primaryBottleneckCorridor.includes('C2')
                ? 'High Demand Choke'
                : 'Balanced Flow'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

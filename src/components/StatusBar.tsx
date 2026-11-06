'use client';

import React from 'react';
import { Users, Clock, AlertTriangle, ShieldCheck, Camera } from 'lucide-react';
import { DotSimulationEngine } from '@/lib/dotEngine';

interface StatusBarProps {
  engine: DotSimulationEngine;
  elapsedSeconds: number;
  isScreenshotMode: boolean;
  onToggleScreenshotMode: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  engine,
  elapsedSeconds,
  isScreenshotMode,
  onToggleScreenshotMode,
}) => {
  const total = engine.agents.length;
  const evacuated = engine.totalEvacuated;
  const progressPercent = total > 0 ? Math.min(100, Math.round((evacuated / total) * 100)) : 0;
  const isSafe = engine.config.strategy === 'smart_safe';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* 1. Evacuated Counter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
          <span>Evacuated</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {evacuated}
            </span>
            <span className="text-xs text-slate-400">/ {total} dots</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Evacuation Timer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
          <span>Elapsed Time</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {elapsedSeconds.toFixed(1)}s
            </span>
            <span className="text-xs text-slate-400">{engine.isFinished ? '✓ Completed' : 'active'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Speed: <strong className="text-slate-300 font-mono">{engine.config.globalSpeed}x</strong>
          </div>
        </div>
      </div>

      {/* 3. Peak Corridor Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
          <span>Door Bottleneck</span>
          <div
            className={`p-1.5 rounded-lg ${
              engine.peakQueue > 15 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono ${
                engine.peakQueue > 15 ? 'text-rose-400' : 'text-amber-400'
              }`}
            >
              {engine.peakQueue}
            </span>
            <span className="text-xs text-slate-400">waiting at door</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 truncate" title={engine.primaryBottleneck}>
            Choke: <strong className="text-slate-300">{engine.primaryBottleneck}</strong>
          </div>
        </div>
      </div>

      {/* 4. Strategy & Safety Rating */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
          <span>Safety &amp; Route Mode</span>
          <div
            className={`p-1.5 rounded-lg ${
              isSafe ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-base font-bold text-white flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSafe ? 'bg-emerald-400 glow-emerald' : 'bg-amber-400'
              }`}
            />
            <span>{isSafe ? 'Smart EvacFlow' : 'Naive Shortest'}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isSafe
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {isSafe ? 'Balanced & Hazard Safe' : 'Distance Only (Congested)'}
            </span>
            <button
              onClick={onToggleScreenshotMode}
              className="text-slate-400 hover:text-slate-200 p-1"
              title="Screenshot Clean Mode"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

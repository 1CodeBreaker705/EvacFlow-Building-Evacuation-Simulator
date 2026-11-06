'use client';

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FastForward,
  GitFork,
  ArrowRightLeft,
  Flame,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { EvacuationStrategy, BuildingScenario } from '@/lib/types';
import { SCENARIOS } from '@/lib/scenarios';

interface ControlBarProps {
  currentScenario: BuildingScenario;
  onSelectScenario: (scenario: BuildingScenario) => void;
  strategy: EvacuationStrategy;
  onSelectStrategy: (strategy: EvacuationStrategy) => void;
  currentTime: number;
  maxTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSeek: (time: number) => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  isCompareMode: boolean;
  onToggleCompareMode: () => void;
  isHazardActive: boolean;
  onToggleHazardDemo: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  currentScenario,
  onSelectScenario,
  strategy,
  onSelectStrategy,
  currentTime,
  maxTime,
  isPlaying,
  onTogglePlay,
  onReset,
  onStepForward,
  onStepBackward,
  onSeek,
  playbackSpeed,
  onChangeSpeed,
  isCompareMode,
  onToggleCompareMode,
  isHazardActive,
  onToggleHazardDemo,
}) => {
  const speeds = [0.5, 1, 2, 5, 10];
  const progressPercent = maxTime > 0 ? Math.min(100, Math.round((currentTime / maxTime) * 100)) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Top Row: Scenario Selector & Strategy Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Scenario Selection */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            Scenario:
          </label>
          <select
            value={currentScenario.id}
            onChange={(e) => {
              const sc = SCENARIOS.find((s) => s.id === e.target.value);
              if (sc) onSelectScenario(sc);
            }}
            className="bg-slate-800 border border-slate-700 text-slate-100 text-xs sm:text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            {SCENARIOS.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.title}
              </option>
            ))}
          </select>

          {/* Interactive Hazard Toggle shortcut */}
          <button
            onClick={onToggleHazardDemo}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              isHazardActive
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Toggle Corridor Obstacle / Fire Blockage on active floor plan"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>{isHazardActive ? '🔥 Hazard Active' : 'Simulate Fire Blockage'}</span>
          </button>
        </div>

        {/* Strategy Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start lg:self-auto">
          <button
            onClick={() => {
              if (isCompareMode) onToggleCompareMode();
              onSelectStrategy('baseline');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              !isCompareMode && strategy === 'baseline'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Baseline (Shortest-Path)
          </button>

          <button
            onClick={() => {
              if (isCompareMode) onToggleCompareMode();
              onSelectStrategy('optimized');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              !isCompareMode && strategy === 'optimized'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Congestion-Aware (Optimized)
          </button>

          <button
            onClick={onToggleCompareMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              isCompareMode
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Side-by-side Strategy Comparison"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-300" />
            Compare Both
          </button>
        </div>
      </div>

      {/* Bottom Row: Playback Controls & Timeline Scrubber */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Buttons: Reset, Step Back, Play/Pause, Step Forward, Speed */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Reset to 0s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onStepBackward}
            disabled={currentTime <= 0}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition"
            title="Step Back 1s"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`px-4 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 glow-emerald'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Simulate
              </>
            )}
          </button>

          <button
            onClick={onStepForward}
            disabled={currentTime >= maxTime}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition"
            title="Step Forward 1s"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg ml-1">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold transition ${
                  playbackSpeed === s
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Slider and Status */}
        <div className="flex-1 w-full flex items-center gap-3">
          <span className="font-mono text-xs font-semibold text-slate-300 w-16 text-right">
            {currentTime}s / {maxTime}s
          </span>

          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min={0}
              max={maxTime || 100}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
            />
          </div>

          <span className="font-mono text-xs text-slate-400 w-12 text-right">
            {progressPercent}%
          </span>
        </div>
      </div>
    </div>
  );
};

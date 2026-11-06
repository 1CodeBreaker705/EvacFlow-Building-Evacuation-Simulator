'use client';

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Flame,
  Lock,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  Users,
  MousePointer,
  UserPlus,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface FloatingDockProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  strategy: 'shortest' | 'smart';
  onChangeStrategy: (s: 'shortest' | 'smart') => void;
  activeTool: 'inspect' | 'spawn' | 'block' | 'fire';
  onChangeTool: (tool: 'inspect' | 'spawn' | 'block' | 'fire') => void;
  crowdCount: number;
  onChangeCrowdCount: (count: number) => void;
  onLoadSynopsisPreset: () => void;
  onClearAll: () => void;
  showGraph: boolean;
  onToggleShowGraph: () => void;
  globalSpeed: number;
  onChangeSpeed: (speed: number) => void;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  isPlaying,
  onTogglePlay,
  onReset,
  strategy,
  onChangeStrategy,
  activeTool,
  onChangeTool,
  crowdCount,
  onChangeCrowdCount,
  onLoadSynopsisPreset,
  onClearAll,
  showGraph,
  onToggleShowGraph,
  globalSpeed,
  onChangeSpeed,
}) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-3 px-5 backdrop-blur-md z-30 flex flex-col md:flex-row items-center gap-4 max-w-5xl w-[95%]">
      {/* 1. Playback Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black glow-emerald'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" /> Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> Start Evacuation
            </>
          )}
        </button>

        <button
          onClick={onReset}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          title="Reset simulation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Speed Toggle */}
        <button
          onClick={() => onChangeSpeed(globalSpeed === 1 ? 2 : globalSpeed === 2 ? 4 : 1)}
          className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold border border-slate-700 transition"
        >
          {globalSpeed}x
        </button>
      </div>

      <div className="h-6 w-px bg-slate-800 hidden md:block" />

      {/* 2. Interactive Tool Selector (Inspect, Spawn, Block, Fire) */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => onChangeTool('inspect')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
            activeTool === 'inspect'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Click corridor to inspect parameters"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Inspect</span>
        </button>

        <button
          onClick={() => onChangeTool('spawn')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
            activeTool === 'spawn'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Click in room to spawn people"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Spawn</span>
        </button>

        <button
          onClick={() => onChangeTool('block')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
            activeTool === 'block'
              ? 'bg-rose-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Click corridor to lock or block it"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Block</span>
        </button>

        <button
          onClick={() => onChangeTool('fire')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
            activeTool === 'fire'
              ? 'bg-orange-600 text-white shadow animate-pulse'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Click hallway to place Fire"
        >
          <Flame className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Fire</span>
        </button>
      </div>

      <div className="h-6 w-px bg-slate-800 hidden md:block" />

      {/* 3. Crowd Spawner Slider (Starts from 0!) */}
      <div className="flex items-center gap-2 flex-1 min-w-[170px]">
        <span className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span>Crowd:</span>
          <strong className="text-emerald-400 font-mono">{crowdCount}</strong>
        </span>
        <input
          type="range"
          min={0}
          max={400}
          step={10}
          value={crowdCount}
          onChange={(e) => onChangeCrowdCount(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        <button
          onClick={onLoadSynopsisPreset}
          className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-bold border border-indigo-500/40 whitespace-nowrap transition"
          title="Load 150 Occupants from Synopsis Benchmark"
        >
          150 Preset
        </button>
      </div>

      <div className="h-6 w-px bg-slate-800 hidden md:block" />

      {/* 4. Strategy Mode & Graph Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChangeStrategy(strategy === 'shortest' ? 'smart' : 'shortest')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
            strategy === 'smart'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow glow-emerald'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}
          title="Toggle between Shortest Path (jamming) and Congestion-Aware (balanced)"
        >
          {strategy === 'smart' ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Smart Safe</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Shortest Path</span>
            </>
          )}
        </button>

        <button
          onClick={onToggleShowGraph}
          className={`p-2 rounded-xl text-xs font-bold border transition ${
            showGraph
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="Toggle Building Graph Overlay"
        >
          <GitBranch className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

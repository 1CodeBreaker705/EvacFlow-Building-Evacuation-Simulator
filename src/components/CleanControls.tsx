'use client';

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Flame,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  Users,
  Gauge,
  Maximize2,
} from 'lucide-react';

interface CleanControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  strategy: 'shortest' | 'smart';
  onChangeStrategy: (strat: 'shortest' | 'smart') => void;
  corridorCapacity: 'narrow' | 'wide';
  onChangeCorridorCapacity: (cap: 'narrow' | 'wide') => void;
  showGraph: boolean;
  onToggleShowGraph: () => void;
  peopleCount: number;
  onChangePeopleCount: (count: number) => void;
  walkingSpeed: number;
  onChangeWalkingSpeed: (speed: number) => void;
  onTriggerFire: () => void;
}

export const CleanControls: React.FC<CleanControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onReset,
  strategy,
  onChangeStrategy,
  corridorCapacity,
  onChangeCorridorCapacity,
  showGraph,
  onToggleShowGraph,
  peopleCount,
  onChangePeopleCount,
  walkingSpeed,
  onChangeWalkingSpeed,
  onTriggerFire,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Row 1: Primary Simulation Buttons & Routing Strategy */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Play / Pause / Reset */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={onTogglePlay}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition ${
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
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Reset simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Strategy Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full md:w-auto justify-center">
          <button
            onClick={() => onChangeStrategy('shortest')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              strategy === 'shortest'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Dots blindly rush to nearest exit, jamming Corridor C2"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Shortest Path (Naive)</span>
          </button>

          <button
            onClick={() => onChangeStrategy('smart')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              strategy === 'smart'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow glow-emerald'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Dots distribute evenly across Stair A and Stair B"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Smart Balanced (EvacFlow)</span>
          </button>
        </div>

        {/* Quick Hazard & Graph Toggles */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={onTriggerFire}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition"
            title="Ignite fire in hallway"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Simulate Fire</span>
          </button>

          <button
            onClick={onToggleShowGraph}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition ${
              showGraph
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Weighted Building Graph overlay"
          >
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showGraph ? 'Hide Graph' : 'Show Graph Overlay'}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Live Constraints (Corridor Width, Crowd Size, Walking Speed) */}
      <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        {/* Corridor Capacity Constraint */}
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-200">Corridor C2 Width:</div>
            <div className="text-[11px] text-slate-400">
              {corridorCapacity === 'narrow' ? 'Narrow Chokepoint (Cap: 12)' : 'Wide Hallway (Cap: 35)'}
            </div>
          </div>
          <button
            onClick={() =>
              onChangeCorridorCapacity(corridorCapacity === 'narrow' ? 'wide' : 'narrow')
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
              corridorCapacity === 'narrow'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {corridorCapacity === 'narrow' ? 'Narrow' : 'Wide'}
          </button>
        </div>

        {/* Crowd Size Slider */}
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex justify-between font-bold">
            <span className="text-slate-300 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-400" /> People Count:
            </span>
            <span className="text-emerald-400 font-mono">{peopleCount}</span>
          </div>
          <input
            type="range"
            min={40}
            max={200}
            step={10}
            value={peopleCount}
            onChange={(e) => onChangePeopleCount(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Speed Slider */}
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
          <div className="flex justify-between font-bold">
            <span className="text-slate-300 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-amber-400" /> Walking Speed:
            </span>
            <span className="text-amber-400 font-mono">{walkingSpeed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.6}
            max={2.0}
            step={0.2}
            value={walkingSpeed}
            onChange={(e) => onChangeWalkingSpeed(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>
    </div>
  );
};

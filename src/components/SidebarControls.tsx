'use client';

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Flame,
  Trash2,
  Users,
  Gauge,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Compass,
  Layers,
} from 'lucide-react';
import { MAPS } from '@/lib/maps';
import { MapDefinition, RoutingStrategy } from '@/lib/types';
import { EngineConfig } from '@/lib/dotEngine';

interface SidebarControlsProps {
  currentMap: MapDefinition;
  onSelectMap: (map: MapDefinition) => void;
  config: EngineConfig;
  onChangeConfig: (newConfig: Partial<EngineConfig>) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onAddFirePreset: () => void;
  onClearFires: () => void;
  hasFires: boolean;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  currentMap,
  onSelectMap,
  config,
  onChangeConfig,
  isPlaying,
  onTogglePlay,
  onReset,
  onAddFirePreset,
  onClearFires,
  hasFires,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
      {/* 1. Simulation Master Play Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black glow-emerald'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5 fill-current" /> Pause Simulation
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" /> Start Simulation
            </>
          )}
        </button>

        <button
          onClick={onReset}
          className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
          title="Reset Simulation"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Map Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          Select Building Map
        </label>
        <div className="space-y-1.5">
          {MAPS.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMap(m)}
              className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition border flex items-center justify-between ${
                currentMap.id === m.id
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 shadow-md'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div>
                <div className="font-bold text-slate-200">{m.title}</div>
                <div className="text-[11px] text-slate-400">{m.subtitle}</div>
              </div>
              {currentMap.id === m.id && (
                <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Routing Strategy Toggle (Shortest Path vs Smart Safe Evacuation) */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          Evacuation Strategy
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChangeConfig({ strategy: 'shortest' })}
            className={`p-2.5 rounded-xl text-xs font-bold transition border flex flex-col items-center text-center gap-1 ${
              config.strategy === 'shortest'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Shortest Distance (Naive)</span>
          </button>

          <button
            onClick={() => onChangeConfig({ strategy: 'smart_safe' })}
            className={`p-2.5 rounded-xl text-xs font-bold transition border flex flex-col items-center text-center gap-1 ${
              config.strategy === 'smart_safe'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md glow-emerald'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Smart Safe (EvacFlow)</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          {config.strategy === 'shortest'
            ? '⚠️ Dots blindly follow shortest distance, choking narrow doors or walking into fire.'
            : '✓ Dots balance across exits and steer safely around queues and fire hazards.'}
        </p>
      </div>

      {/* 4. Live Sliders (Change Constraints Live) */}
      <div className="space-y-4 pt-2 border-t border-slate-800">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          Live Constraints
        </div>

        {/* Crowd Size Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-400" /> Crowd Size:
            </span>
            <span className="font-mono text-emerald-400">{config.crowdSize} People</span>
          </div>
          <input
            type="range"
            min={40}
            max={300}
            step={10}
            value={config.crowdSize}
            onChange={(e) => onChangeConfig({ crowdSize: Number(e.target.value) })}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>40 (Low)</span>
            <span>150 (Benchmark)</span>
            <span>300 (High)</span>
          </div>
        </div>

        {/* Walking Speed Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-amber-400" /> Walking Speed:
            </span>
            <span className="font-mono text-amber-400">{config.globalSpeed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.1}
            value={config.globalSpeed}
            onChange={(e) => onChangeConfig({ globalSpeed: Number(e.target.value) })}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0.5x (Slow/Cautious)</span>
            <span>1.0x (Normal)</span>
            <span>2.5x (Panic Run)</span>
          </div>
        </div>

        {/* Door / Corridor Capacity Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-purple-400" /> Doorway Width / Capacity:
            </span>
            <span className="font-mono text-purple-400">
              {config.doorCapacityMultiplier === 1
                ? 'Narrow (Bottleneck)'
                : config.doorCapacityMultiplier === 2
                ? 'Standard'
                : 'Wide Door'}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={1}
            value={config.doorCapacityMultiplier}
            onChange={(e) => onChangeConfig({ doorCapacityMultiplier: Number(e.target.value) })}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Narrow (Creates Queue)</span>
            <span>Standard</span>
            <span>Wide</span>
          </div>
        </div>
      </div>

      {/* 5. Fire / Hazard Situations */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          Hazard Situations
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddFirePreset}
            className="flex-1 py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Simulate Fire Hazard</span>
          </button>

          {hasFires && (
            <button
              onClick={onClearFires}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Clear All Fire Hazards"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400">
          💡 You can also <strong>click anywhere directly on the map</strong> to ignite a fire!
        </p>
      </div>
    </div>
  );
};

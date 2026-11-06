'use client';

import React from 'react';
import { CorridorEdge } from '@/lib/crowdEngine';
import { X, Sliders, Flame, ShieldAlert, CheckCircle2, Lock, Unlock, AlertTriangle } from 'lucide-react';

interface CorridorInspectorProps {
  corridor: CorridorEdge | null;
  onClose: () => void;
  onUpdateEdge: (edgeId: string, updates: Partial<CorridorEdge>) => void;
}

export const CorridorInspector: React.FC<CorridorInspectorProps> = ({
  corridor,
  onClose,
  onUpdateEdge,
}) => {
  if (!corridor) return null;

  return (
    <div className="fixed top-20 right-4 w-80 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-5 backdrop-blur-md z-30 animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
            Corridor Inspector
          </span>
          <h3 className="text-sm font-bold text-white mt-1">{corridor.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Real-time Status Badge */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[10px] text-slate-400 font-sans">Active Occupancy</div>
          <div className="text-base font-bold text-slate-100">
            {corridor.currentOccupancy} / {corridor.capacity}
          </div>
        </div>
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[10px] text-slate-400 font-sans">Current Queue</div>
          <div
            className={`text-base font-bold ${
              corridor.currentQueue > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'
            }`}
          >
            {corridor.currentQueue} ppl
          </div>
        </div>
      </div>

      {/* Synopsis Parameters (Customizable from 0) */}
      <div className="space-y-3 text-xs">
        {/* Capacity Slider C_e */}
        <div className="space-y-1">
          <div className="flex justify-between font-semibold">
            <span className="text-slate-300">Occupancy Capacity (C_e):</span>
            <span className="text-emerald-400 font-mono font-bold">{corridor.capacity} people</span>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            step={1}
            value={corridor.capacity}
            onChange={(e) => onUpdateEdge(corridor.id, { capacity: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>5 (Severe Jam)</span>
            <span>20 (Normal)</span>
            <span>60 (Wide)</span>
          </div>
        </div>

        {/* Max Flow Rate Slider F_e */}
        <div className="space-y-1">
          <div className="flex justify-between font-semibold">
            <span className="text-slate-300">Max Flow Rate (F_e):</span>
            <span className="text-cyan-400 font-mono font-bold">{corridor.maxFlowRate} ppl/sec</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={10.0}
            step={0.5}
            value={corridor.maxFlowRate}
            onChange={(e) => onUpdateEdge(corridor.id, { maxFlowRate: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Dimensions info */}
        <div className="flex justify-between text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
          <span>Length (L_e): {corridor.length}m</span>
          <span>Width (W_e): {corridor.width}m</span>
        </div>
      </div>

      {/* Blockade / Fire Hazard Toggle Actions */}
      <div className="pt-2 border-t border-slate-800 space-y-2">
        <button
          onClick={() => onUpdateEdge(corridor.id, { isBlocked: !corridor.isBlocked })}
          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
            corridor.isBlocked
              ? 'bg-rose-600 text-white border-rose-500 shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          {corridor.isBlocked ? (
            <>
              <Unlock className="w-3.5 h-3.5" /> Unblock Corridor
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-rose-400" /> Block Corridor (Simulate Barrier)
            </>
          )}
        </button>

        <button
          onClick={() => onUpdateEdge(corridor.id, { hasFire: !corridor.hasFire })}
          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
            corridor.hasFire
              ? 'bg-orange-600 text-white border-orange-500 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span>{corridor.hasFire ? 'Extinguish Fire' : 'Set Fire to Corridor'}</span>
        </button>
      </div>
    </div>
  );
};

'use client';

import React from 'react';
import {
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface EvacuationComparisonBarProps {
  currentStrategy: 'shortest' | 'smart';
  hasFireOrBlockage: boolean;
  onSelectScenario: (scenario: 'normal_shortest' | 'blocked_fire' | 'congestion_aware') => void;
}

export function EvacuationComparisonBar({
  currentStrategy,
  hasFireOrBlockage,
  onSelectScenario,
}: EvacuationComparisonBarProps) {
  // Determine active scenario
  let activeScenario: 'normal_shortest' | 'blocked_fire' | 'congestion_aware' = 'normal_shortest';
  if (hasFireOrBlockage) {
    activeScenario = 'blocked_fire';
  } else if (currentStrategy === 'smart') {
    activeScenario = 'congestion_aware';
  }

  return (
    <div className="w-full bg-slate-900/95 border-t border-slate-800 p-4 shadow-xl">
      <div className="max-w-7xl mx-auto">
        {/* Title and SDG 11 Subtitle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
              Benchmark Evacuation Performance Comparison (150 People)
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
              SDG 11: Sustainable Cities
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Click any scenario to instantly load and test on the live map
          </div>
        </div>

        {/* 3 Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Normal Shortest Path */}
          <div
            onClick={() => onSelectScenario('normal_shortest')}
            className={`cursor-pointer rounded-xl p-3.5 border transition-all relative ${
              activeScenario === 'normal_shortest'
                ? 'bg-rose-950/30 border-rose-500/80 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/50'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-slate-200">1. Normal Shortest Path</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Baseline Dijkstra
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-2xl font-black font-mono text-rose-400">48.0s</span>
              <span className="text-xs text-slate-400">total evacuation time</span>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Corridor C2 Chokepoint:</span>
                <span className="font-mono font-bold text-rose-300">34 people queued</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Exit Distribution:</span>
                <span className="font-mono text-slate-300">Exit A: 115 / Exit B: 35</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-rose-400 font-medium">⚠️ Severe Bottleneck in C2</span>
              <span className="text-slate-400 group-hover:text-slate-200 flex items-center gap-1">
                Load Test <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Card 2: Blocked Route / Fire Reaction */}
          <div
            onClick={() => onSelectScenario('blocked_fire')}
            className={`cursor-pointer rounded-xl p-3.5 border transition-all relative ${
              activeScenario === 'blocked_fire'
                ? 'bg-orange-950/30 border-orange-500/80 shadow-lg shadow-orange-950/40 ring-1 ring-orange-500/50'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-200">2. Blocked Route / Fire Hazard</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                Dynamic Reroute
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-2xl font-black font-mono text-orange-400">44.5s</span>
              <span className="text-xs text-slate-400">rerouted evacuation</span>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Hazard Location:</span>
                <span className="font-mono font-bold text-orange-300">Corridor C2 Blocked</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Real-Time Reaction:</span>
                <span className="font-mono text-slate-300">Crowd diverts to Exit B</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-orange-400 font-medium">🔄 Auto Diversion via C3 Crosswalk</span>
              <span className="text-slate-400 flex items-center gap-1">
                Load Test <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Card 3: EvacFlow Congestion-Aware */}
          <div
            onClick={() => onSelectScenario('congestion_aware')}
            className={`cursor-pointer rounded-xl p-3.5 border transition-all relative ${
              activeScenario === 'congestion_aware'
                ? 'bg-emerald-950/30 border-emerald-500/80 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">3. EvacFlow Congestion-Aware</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                EvacFlow Algorithm
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-2xl font-black font-mono text-emerald-400">34.0s</span>
              <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                -29% Faster (-14.0s)
              </span>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Corridor C2 Peak Queue:</span>
                <span className="font-mono font-bold text-emerald-400">4 people (88% reduction)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Balanced Exits:</span>
                <span className="font-mono text-slate-300">Exit A: 75 / Exit B: 75</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-medium">✨ Zero Bottlenecks & Safe Flow</span>
              <span className="text-slate-400 flex items-center gap-1">
                Load Test <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

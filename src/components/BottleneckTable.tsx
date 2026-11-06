'use client';

import React from 'react';
import { BuildingEdge, EdgeRuntimeState } from '@/lib/types';
import { Flame, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface BottleneckTableProps {
  edges: BuildingEdge[];
  edgeStates: Record<string, EdgeRuntimeState>;
  onToggleBlocked: (edgeId: string) => void;
}

export const BottleneckTable: React.FC<BottleneckTableProps> = ({
  edges,
  edgeStates,
  onToggleBlocked,
}) => {
  // Sort edges so worst bottlenecks and blocked edges appear on top
  const sortedEdges = [...edges].sort((a, b) => {
    const stA = edgeStates[a.id];
    const stB = edgeStates[b.id];
    const scoreA = (a.isBlocked ? 1000 : 0) + (stA ? stA.queue * 10 + stA.peakQueue * 2 : 0);
    const scoreB = (b.isBlocked ? 1000 : 0) + (stB ? stB.queue * 10 + stB.peakQueue * 2 : 0);
    return scoreB - scoreA;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Corridor Bottleneck &amp; Queue Telemetry
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Eq: q_e(t) = min[D_e(t), F_e, C_e - O_e(t)]
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-3 py-2.5">Corridor</th>
              <th className="px-3 py-2.5">Capacity (C_e)</th>
              <th className="px-3 py-2.5">Max Flow (F_e)</th>
              <th className="px-3 py-2.5">Active Occupants</th>
              <th className="px-3 py-2.5">Active Queue</th>
              <th className="px-3 py-2.5">Peak Queue</th>
              <th className="px-3 py-2.5">Utilization</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono">
            {sortedEdges.map((edge) => {
              const state = edgeStates[edge.id];
              const occupancy = state ? state.occupancy : 0;
              const queue = state ? state.queue : 0;
              const peakQueue = state ? state.peakQueue : 0;
              const utilPct = Math.min(100, Math.round(((state ? state.utilization : 0)) * 100));
              const isBlocked = edge.isBlocked || state?.isBlocked;
              const isCritical = peakQueue > 15 || queue > 0;

              return (
                <tr
                  key={edge.id}
                  className={`hover:bg-slate-800/60 transition ${
                    isBlocked
                      ? 'bg-rose-950/20'
                      : isCritical
                      ? 'bg-amber-950/10'
                      : ''
                  }`}
                >
                  <td className="px-3 py-2 font-sans font-medium text-slate-200">
                    <div className="flex items-center gap-1.5">
                      {isBlocked && <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse flex-shrink-0" />}
                      <span className="truncate max-w-[140px]" title={edge.name}>
                        {edge.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-300">{edge.capacity} ppl</td>
                  <td className="px-3 py-2 text-slate-300">{edge.maxFlowRate} ppl/s</td>
                  <td className="px-3 py-2 text-slate-200 font-semibold">{occupancy}</td>
                  <td className="px-3 py-2">
                    {queue > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 animate-pulse">
                        {queue} queued
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-300 font-semibold">
                    {peakQueue > 0 ? (
                      <span className={peakQueue > 20 ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                        {peakQueue}
                      </span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            utilPct > 80
                              ? 'bg-rose-500'
                              : utilPct > 40
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${utilPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400">{utilPct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-sans">
                    {isBlocked ? (
                      <span className="px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 border border-rose-600 text-[10px] font-bold uppercase tracking-wider">
                        🔥 Hazard Blocked
                      </span>
                    ) : isCritical ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                        ⚠️ Bottleneck
                      </span>
                    ) : utilPct > 50 ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-medium">
                        Moderate
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium">
                        Free Flow
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => onToggleBlocked(edge.id)}
                      className={`px-2 py-1 rounded text-[10px] font-sans font-semibold border transition ${
                        isBlocked
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500 hover:bg-emerald-600/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-rose-600/30 hover:text-rose-300 hover:border-rose-500'
                      }`}
                    >
                      {isBlocked ? 'Clear Block' : 'Simulate Fire'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

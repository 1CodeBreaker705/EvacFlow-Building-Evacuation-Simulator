'use client';

import React, { useState } from 'react';
import {
  BuildingNode,
  BuildingEdge,
  SimulationFrame,
  EvacuationStrategy,
} from '@/lib/types';
import { LogOut, Flame, AlertTriangle, Users, Info } from 'lucide-react';

interface FloorPlanCanvasProps {
  nodes: BuildingNode[];
  edges: BuildingEdge[];
  currentFrame: SimulationFrame | null;
  strategy: EvacuationStrategy;
  onToggleEdgeBlocked: (edgeId: string) => void;
  title?: string;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  nodes,
  edges,
  currentFrame,
  strategy,
  onToggleEdgeBlocked,
  title,
}) => {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Calculate occupants remaining in each room from active groups
  const roomOccupantCounts: Record<string, number> = {};
  if (currentFrame) {
    for (const g of currentFrame.activeGroups) {
      if (!g.isEvacuated && g.currentEdgeId === null) {
        roomOccupantCounts[g.currentNodeId] =
          (roomOccupantCounts[g.currentNodeId] || 0) + g.population;
      }
    }
  }

  // Count evacuated per exit
  const exitCounts: Record<string, number> = {};
  if (currentFrame) {
    for (const g of currentFrame.activeGroups) {
      if (g.isEvacuated) {
        exitCounts[g.currentNodeId] = (exitCounts[g.currentNodeId] || 0) + g.population;
      }
    }
  }

  return (
    <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header Bar within Canvas */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              strategy === 'optimized' ? 'bg-emerald-400 glow-emerald' : 'bg-amber-400 glow-amber'
            }`}
          />
          <h3 className="text-xs sm:text-sm font-bold text-slate-200 tracking-wide">
            {title || (strategy === 'optimized' ? 'Congestion-Aware Floor Plan' : 'Baseline Floor Plan')}
          </h3>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {strategy === 'optimized' ? 'Optimized Flow' : 'Shortest Path'}
          </span>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Free Flow
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Bottleneck / Queue
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Info className="w-3 h-3 text-slate-400" /> Click corridor to block/unblock
          </span>
        </div>
      </div>

      {/* Primary SVG Floor Plan */}
      <div className="relative w-full overflow-x-auto p-2 flex justify-center items-center min-h-[460px]">
        <svg
          viewBox="0 0 740 500"
          className="w-full max-w-[740px] h-auto select-none"
          style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4))' }}
        >
          {/* Subtle Grid Background */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
            <linearGradient id="edgeGlowEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="edgeGlowRose" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="edgeGlowAmber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          <rect width="740" height="500" fill="#090d16" />
          <rect width="740" height="500" fill="url(#grid)" />

          {/* 1. CORRIDOR EDGES (Background under rooms) */}
          {edges.map((edge) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;

            const fromX = fromNode.type === 'room' ? fromNode.x + (fromNode.width || 100) / 2 : fromNode.x;
            const fromY = fromNode.type === 'room' ? fromNode.y + (fromNode.height || 70) / 2 : fromNode.y;
            const toX = toNode.type === 'room' ? toNode.x + (toNode.width || 100) / 2 : toNode.x;
            const toY = toNode.type === 'room' ? toNode.y + (toNode.height || 70) / 2 : toNode.y;

            const state = currentFrame?.edgeStates[edge.id];
            const isBottleneck = state?.isBottleneck || (state && state.queue > 0);
            const utilization = state?.utilization || 0;
            const isBlocked = edge.isBlocked || state?.isBlocked;

            // Color coding
            let strokeColor = '#334155'; // default slate
            let strokeWidth = Math.max(6, Math.min(14, (edge.width || 2) * 4));
            let strokeDasharray = 'none';

            if (isBlocked) {
              strokeColor = '#e11d48'; // red
              strokeDasharray = '8, 6';
            } else if (isBottleneck) {
              strokeColor = '#f43f5e'; // pulsing rose
              strokeWidth += 2;
            } else if (utilization > 0.4) {
              strokeColor = '#f59e0b'; // amber
            } else if (utilization > 0.05) {
              strokeColor = '#10b981'; // emerald
            }

            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2;

            return (
              <g
                key={edge.id}
                className="cursor-pointer group"
                onClick={() => onToggleEdgeBlocked(edge.id)}
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId(null)}
              >
                {/* Edge Corridor Line */}
                <line
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  className="transition-colors duration-200"
                />

                {/* Corridor Label pill at midpoint */}
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-38"
                    y="-12"
                    width="76"
                    height="24"
                    rx="5"
                    fill={isBlocked ? '#4c0519' : isBottleneck ? '#881337' : '#0f172a'}
                    stroke={isBlocked ? '#f43f5e' : isBottleneck ? '#f43f5e' : '#334155'}
                    strokeWidth="1.2"
                    className="shadow-md"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill={isBlocked ? '#fecdd3' : isBottleneck ? '#ffe4e6' : '#94a3b8'}
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {isBlocked ? '🔥 BLOCKED' : edge.id.toUpperCase()}
                  </text>
                </g>

                {/* Prominent Bottleneck Queue Callout if active queue exists */}
                {state && state.queue > 0 && !isBlocked && (
                  <g transform={`translate(${fromX + (toX - fromX) * 0.25}, ${fromY + (toY - fromY) * 0.25 - 18})`}>
                    <rect
                      x="-42"
                      y="-10"
                      width="84"
                      height="20"
                      rx="6"
                      fill="#881337"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      className="animate-pulse"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      ⚠️ Queue: {state.queue}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 2. ROOM NODES */}
          {nodes
            .filter((n) => n.type === 'room')
            .map((room) => {
              const occupantsLeft = roomOccupantCounts[room.id] ?? 0;
              const totalInit = room.initialOccupants || 40;

              return (
                <g key={room.id} transform={`translate(${room.x}, ${room.y})`}>
                  {/* Room Box */}
                  <rect
                    width={room.width || 110}
                    height={room.height || 75}
                    rx="8"
                    fill="#0f172a"
                    stroke="#1e293b"
                    strokeWidth="2"
                    className="transition hover:stroke-cyan-500/50"
                  />

                  {/* Room Top Header bar */}
                  <rect
                    width={room.width || 110}
                    height="22"
                    rx="7"
                    fill="#1e293b"
                  />

                  {/* Room Title */}
                  <text
                    x={(room.width || 110) / 2}
                    y="15"
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {room.name}
                  </text>

                  {/* Occupancy Indicator in room */}
                  <g transform={`translate(${(room.width || 110) / 2}, 48)`}>
                    <rect
                      x="-36"
                      y="-12"
                      width="72"
                      height="24"
                      rx="6"
                      fill={occupantsLeft > 0 ? '#1e1b4b' : '#14532d'}
                      stroke={occupantsLeft > 0 ? '#6366f1' : '#22c55e'}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={occupantsLeft > 0 ? '#c7d2fe' : '#86efac'}
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {occupantsLeft > 0 ? `👥 ${occupantsLeft}` : '✓ Cleared'}
                    </text>
                  </g>
                </g>
              );
            })}

          {/* 3. JUNCTION NODES */}
          {nodes
            .filter((n) => n.type === 'junction')
            .map((junction) => (
              <g key={junction.id} transform={`translate(${junction.x}, ${junction.y})`}>
                <circle r="7" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                <circle r="3" fill="#94a3b8" />
                <text
                  x="0"
                  y="-12"
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {junction.id.toUpperCase()}
                </text>
              </g>
            ))}

          {/* 4. EXIT NODES */}
          {nodes
            .filter((n) => n.type === 'exit')
            .map((exit) => {
              const totalEvacuated = exitCounts[exit.id] || 0;

              return (
                <g key={exit.id} transform={`translate(${exit.x}, ${exit.y})`}>
                  {/* Exit Box */}
                  <rect
                    x="-38"
                    y="-25"
                    width={exit.width || 75}
                    height={exit.height || 50}
                    rx="8"
                    fill="#064e3b"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    className="glow-emerald"
                  />

                  {/* Exit Icon & Title */}
                  <text
                    x="0"
                    y="-4"
                    textAnchor="middle"
                    fill="#a7f3d0"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    🚪 {exit.name.split(' ')[0]} {exit.name.split(' ')[1] || ''}
                  </text>

                  {/* Exit Count Counter */}
                  <rect
                    x="-30"
                    y="6"
                    width="60"
                    height="16"
                    rx="4"
                    fill="#022c22"
                  />
                  <text
                    x="0"
                    y="18"
                    textAnchor="middle"
                    fill="#34d399"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {totalEvacuated} evac
                  </text>
                </g>
              );
            })}

          {/* 5. OCCUPANT GROUP PARTICLES */}
          {currentFrame?.activeGroups.map((group) => {
            if (group.isEvacuated) return null;

            // Calculate SVG coordinates
            let cx = 0;
            let cy = 0;

            if (group.currentEdgeId) {
              const edge = edges.find((e) => e.id === group.currentEdgeId);
              if (edge) {
                const fn = nodeMap.get(edge.from);
                const tn = nodeMap.get(edge.to);
                if (fn && tn) {
                  const fx = fn.type === 'room' ? fn.x + (fn.width || 100) / 2 : fn.x;
                  const fy = fn.type === 'room' ? fn.y + (fn.height || 70) / 2 : fn.y;
                  const tx = tn.type === 'room' ? tn.x + (tn.width || 100) / 2 : tn.x;
                  const ty = tn.type === 'room' ? tn.y + (tn.height || 70) / 2 : tn.y;

                  const p = Math.max(0, Math.min(1.0, group.positionOnEdge));
                  cx = fx + (tx - fx) * p;
                  cy = fy + (ty - fy) * p;
                }
              }
            } else {
              const node = nodeMap.get(group.currentNodeId);
              if (node) {
                cx = node.type === 'room' ? node.x + (node.width || 100) / 2 : node.x;
                cy = node.type === 'room' ? node.y + (node.height || 70) / 2 : node.y;
              }
            }

            if (cx === 0 && cy === 0) return null;

            const isWaiting = group.isWaiting;

            return (
              <g
                key={group.id}
                transform={`translate(${cx}, ${cy})`}
                className="transition-all duration-300"
              >
                {/* Outer pulse if waiting in queue */}
                {isWaiting && (
                  <circle
                    r="15"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="3, 3"
                    className="animate-spin"
                  />
                )}

                {/* Particle Circle */}
                <circle
                  r="11"
                  fill={isWaiting ? '#d97706' : strategy === 'optimized' ? '#0284c7' : '#4f46e5'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="shadow-lg"
                />

                {/* Population Number inside circle */}
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {group.population}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Status Badge on Bottom Right */}
      {currentFrame?.primaryBottleneck && (
        <div className="absolute bottom-3 right-3 bg-rose-950/90 border border-rose-500/50 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
          <span className="text-xs text-rose-200">
            Active Chokepoint: <strong>{currentFrame.primaryBottleneck.name}</strong> (Queue: {currentFrame.primaryBottleneck.queue})
          </span>
        </div>
      )}
    </div>
  );
};

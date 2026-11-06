'use client';

import React, { useRef, useEffect, useState } from 'react';
import { CrowdSimulationEngine, CorridorEdge } from '@/lib/crowdEngine';
import { ZoomIn, ZoomOut, Maximize, Info } from 'lucide-react';

interface FullScreenSimulatorProps {
  engine: CrowdSimulationEngine;
  showGraph: boolean;
  activeTool: 'inspect' | 'spawn' | 'block' | 'fire';
  onSelectCorridor: (edge: CorridorEdge) => void;
  onSpawnAt: (x: number, y: number) => void;
}

export const FullScreenSimulator: React.FC<FullScreenSimulatorProps> = ({
  engine,
  showGraph,
  activeTool,
  onSelectCorridor,
  onSpawnAt,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Reset view to center
  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Canvas interaction
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.shiftKey || (e.button === 0 && e.altKey)) {
      // Pan mode
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(2.5, Math.max(0.6, prev * zoomFactor)));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Convert client coords to world coords taking pan & zoom into account
    const clickCanvasX = e.clientX - rect.left;
    const clickCanvasY = e.clientY - rect.top;

    const worldX = (clickCanvasX - pan.x) / zoom;
    const worldY = (clickCanvasY - pan.y) / zoom;

    if (activeTool === 'fire') {
      engine.toggleFireAt(worldX, worldY);
    } else if (activeTool === 'spawn') {
      onSpawnAt(worldX, worldY);
    } else {
      // Find nearest corridor edge clicked
      let clickedEdge: CorridorEdge | null = null;
      let minDist = 30;

      for (const edge of Array.from(engine.edges.values())) {
        const fromN = engine.nodes.get(edge.fromNodeId);
        const toN = engine.nodes.get(edge.toNodeId);
        if (fromN && toN) {
          const midX = (fromN.x + toN.x) / 2;
          const midY = (fromN.y + toN.y) / 2;
          const d = Math.hypot(midX - worldX, midY - worldY);
          if (d < minDist) {
            minDist = d;
            clickedEdge = edge;
          }
        }
      }

      if (clickedEdge) {
        if (activeTool === 'block') {
          engine.toggleCorridorBlock(clickedEdge.id);
        } else {
          onSelectCorridor(clickedEdge);
        }
      } else if (activeTool === 'inspect') {
        // Check if room clicked
        onSpawnAt(worldX, worldY);
      }
    }
  };

  // 60fps Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      ctx.save();
      // Handle high resolution clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep dark modern blueprint background
      ctx.fillStyle = '#060a13';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply Pan and Zoom transformations
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Subtle architectural grid
      ctx.strokeStyle = '#101a2f';
      ctx.lineWidth = 0.5;
      for (let x = -500; x <= 1700; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, -500);
        ctx.lineTo(x, 1200);
        ctx.stroke();
      }
      for (let y = -500; y <= 1200; y += 30) {
        ctx.beginPath();
        ctx.moveTo(-500, y);
        ctx.lineTo(1700, y);
        ctx.stroke();
      }

      // 1. HALLWAYS & CORRIDORS BACKGROUND
      ctx.fillStyle = '#0a101f';
      // North Hallway
      ctx.fillRect(80, 210, 970, 70);
      // South Hallway
      ctx.fillRect(80, 400, 970, 70);
      // West Corridor (to Stair A)
      ctx.fillRect(80, 210, 160, 260);
      // East Corridor (to Stair B)
      ctx.fillRect(890, 210, 160, 260);

      // Outer Perimeter Concrete Walls
      ctx.strokeStyle = '#293548';
      ctx.lineWidth = 6;
      ctx.strokeRect(30, 30, 1080, 620);

      // 2. RENDER ROOMS
      for (const room of engine.rooms) {
        ctx.fillStyle = '#0d1527';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.roundRect(room.x, room.y, room.w, room.h, 10);
        ctx.fill();
        ctx.stroke();

        // Room Header Bar
        ctx.fillStyle = '#162035';
        ctx.beginPath();
        ctx.roundRect(room.x, room.y, room.w, 26, [10, 10, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(room.name, room.x + room.w / 2, room.y + 18);

        // Door Cutout in room wall
        ctx.fillStyle = '#0a101f';
        ctx.fillRect(room.doorPos.x - 16, room.doorPos.y - 4, 32, 8);

        // Door swing architectural arc
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(room.doorPos.x - 16, room.doorPos.y, 26, 0, Math.PI / 2);
        ctx.stroke();

        // Live occupant counter badge inside room
        const insideCount = engine.agents.filter(
          (a) => !a.isEvacuated && a.x >= room.x && a.x <= room.x + room.w && a.y >= room.y && a.y <= room.y + room.h
        ).length;

        ctx.fillStyle = insideCount > 0 ? '#38bdf8' : '#22c55e';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(
          insideCount > 0 ? `👥 ${insideCount} inside` : '✓ Cleared',
          room.x + room.w / 2,
          room.y + room.h - 14
        );
      }

      // Central Elevator Bank (Out of order during fire)
      ctx.fillStyle = '#171311';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(470, 290, 180, 100, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🛗 ELEVATOR / LIFT BANK', 560, 335);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('⛔ EMERGENCY LOCK (NO USE)', 560, 355);

      // 3. RENDER ESCAPE STAIRWELLS & EMERGENCY EXITS
      const stairs = [
        { id: 'stair_west', name: 'STAIRCASE A (WEST)', x: 15, y: 270, w: 90, h: 140, exitNode: 'stair_west' },
        { id: 'stair_east', name: 'STAIRCASE B (EAST)', x: 1045, y: 270, w: 90, h: 140, exitNode: 'stair_east' },
      ];

      for (const st of stairs) {
        ctx.fillStyle = '#064e3b';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(st.x, st.y, st.w, st.h, 8);
        ctx.fill();
        ctx.stroke();

        // Realistic Stair Steps lines
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
        ctx.lineWidth = 2.5;
        for (let sy = st.y + 18; sy < st.y + st.h - 18; sy += 14) {
          ctx.beginPath();
          ctx.moveTo(st.x + 10, sy);
          ctx.lineTo(st.x + st.w - 10, sy);
          ctx.stroke();
        }

        // Stair Label
        ctx.fillStyle = '#a7f3d0';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🪜 ' + st.name, st.x + st.w / 2, st.y + 22);

        // Live Evacuation Counter at this Exit
        const exitEvacuated = engine.agents.filter(
          (a) => a.isEvacuated && a.targetExitId === st.exitNode
        ).length;

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`🏃 ${exitEvacuated} OUT`, st.x + st.w / 2, st.y + st.h - 14);
      }

      // 4. GRAPH OVERLAY (WEIGHTED BUILDING GRAPH)
      if (showGraph) {
        // Draw Edges (Corridors)
        for (const edge of Array.from(engine.edges.values())) {
          const fromNode = engine.nodes.get(edge.fromNodeId);
          const toNode = engine.nodes.get(edge.toNodeId);
          if (fromNode && toNode) {
            const isBlocked = edge.isBlocked || edge.hasFire;
            const isJam = edge.currentQueue > 5;

            ctx.strokeStyle = isBlocked
              ? '#e11d48'
              : isJam
              ? '#f43f5e'
              : '#06b6d4';
            ctx.lineWidth = edge.capacity > 25 ? 6 : 4;
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.stroke();

            // Edge Label Pill (Capacity & Flow Rate from synopsis)
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;

            ctx.fillStyle = isBlocked ? '#4c0519' : isJam ? '#881337' : '#0f172a';
            ctx.beginPath();
            ctx.roundRect(midX - 42, midY - 11, 84, 22, 6);
            ctx.fill();
            ctx.strokeStyle = isBlocked ? '#f43f5e' : '#38bdf8';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = isBlocked ? '#fecdd3' : '#38bdf8';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
              isBlocked ? '⛔ BLOCKED' : `${edge.id.toUpperCase()} (Cap:${edge.capacity})`,
              midX,
              midY + 4
            );
          }
        }

        // Draw Nodes
        for (const node of Array.from(engine.nodes.values())) {
          ctx.fillStyle = node.type === 'stair' ? '#10b981' : node.type === 'room' ? '#6366f1' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(node.x, node.y, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.x, node.y - 14);
        }
      }

      // 5. FIRE HAZARDS 🔥
      const timeSec = Date.now() * 0.005;
      for (const fire of engine.fires) {
        // Outer pulsing danger field
        const pulse = Math.sin(timeSec * 4) * 8;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.beginPath();
        ctx.arc(fire.x, fire.y, fire.radius + 18 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Inner flame core
        ctx.fillStyle = 'rgba(249, 115, 22, 0.7)';
        ctx.beginPath();
        ctx.arc(fire.x, fire.y, fire.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '30px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('🔥', fire.x, fire.y + 10);

        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('ACTIVE HAZARD', fire.x, fire.y + fire.radius + 18);
      }

      // 6. RENDER PEOPLE (ANIMATED DOTS WITH QUEUING)
      for (const agent of engine.agents) {
        if (agent.isEvacuated) continue;

        // Dot body
        ctx.fillStyle = agent.isQueued ? '#f59e0b' : agent.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(agent.x, agent.y, agent.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Small movement trail
        if (!agent.isQueued && Math.hypot(agent.vx, agent.vy) > 8) {
          ctx.strokeStyle = agent.color;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(agent.x, agent.y);
          ctx.lineTo(agent.x - agent.vx * 0.04, agent.y - agent.vy * 0.04);
          ctx.stroke();
        }
      }

      // Corridor C2 Bottleneck Queue Callout
      const c2Edge = engine.edges.get('c2');
      if (c2Edge && c2Edge.currentQueue > 4) {
        ctx.fillStyle = '#881337';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(100, 310, 130, 28, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`⚠️ C2 Queue: ${c2Edge.currentQueue} ppl`, 165, 328);
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [engine, showGraph, zoom, pan]);

  return (
    <div className="relative w-full h-full flex-1 bg-slate-950 overflow-hidden flex items-center justify-center">
      {/* Edge-to-Edge Canvas */}
      <canvas
        ref={canvasRef}
        width={1180}
        height={680}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        className="w-full h-full object-contain cursor-crosshair select-none"
      />

      {/* Floating Zoom & Pan Controls (Top-Right) */}
      <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 shadow-xl flex items-center gap-1 backdrop-blur z-20">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z * 1.15))}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.6, z * 0.85))}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          title="Reset View"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Hint Badge (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400 flex items-center gap-2 shadow-lg backdrop-blur z-20">
        <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
        <span>
          {activeTool === 'fire'
            ? '🔥 Click anywhere on a corridor to toggle fire hazard'
            : activeTool === 'block'
            ? '⛔ Click any corridor to lock or unblock it'
            : activeTool === 'spawn'
            ? '👥 Click inside any room to spawn +10 people'
            : '👆 Click any corridor to inspect and change its capacity & parameters'}
        </span>
      </div>
    </div>
  );
};

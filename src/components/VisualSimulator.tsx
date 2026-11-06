'use client';

import React, { useRef, useEffect } from 'react';
import { DotSimulationEngine } from '@/lib/dotEngine';
import { Flame, ShieldAlert, Users, Info } from 'lucide-react';

interface VisualSimulatorProps {
  engine: DotSimulationEngine;
  isPlaying: boolean;
  onCanvasClick: (x: number, y: number) => void;
}

export const VisualSimulator: React.FC<VisualSimulatorProps> = ({
  engine,
  isPlaying,
  onCanvasClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // 1. Clear background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle architectural grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const map = engine.map;

      // 2. Render Rooms
      for (const room of map.rooms) {
        // Room background
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(room.x, room.y, room.w, room.h, 10);
        ctx.fill();
        ctx.stroke();

        // Room Header Tab
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(room.x, room.y, room.w, 24, [10, 10, 0, 0]);
        ctx.fill();

        // Room Name
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(room.name, room.x + room.w / 2, room.y + 16);

        // Room remaining count
        const inRoomCount = engine.agents.filter(
          (a) =>
            !a.isEvacuated &&
            a.x >= room.x &&
            a.x <= room.x + room.w &&
            a.y >= room.y &&
            a.y <= room.y + room.h
        ).length;

        ctx.fillStyle = inRoomCount > 0 ? '#38bdf8' : '#22c55e';
        ctx.font = '10px monospace';
        ctx.fillText(
          inRoomCount > 0 ? `👥 ${inRoomCount} inside` : '✓ Cleared',
          room.x + room.w / 2,
          room.y + room.h - 12
        );
      }

      // 3. Render Doors / Chokepoints
      for (const door of map.doors) {
        ctx.fillStyle = door.isBlocked ? '#e11d48' : '#475569';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(door.x, door.y, door.w, door.h, 4);
        ctx.fill();
        ctx.stroke();

        // Door Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(door.name.split(' ')[0], door.x + door.w / 2, door.y - 4);
      }

      // 4. Render Exits (Glowing green)
      for (const exit of map.exits) {
        const exitEvacuated = engine.agents.filter(
          (a) => a.isEvacuated && a.targetExitId === exit.id
        ).length;

        // Outer glow
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#064e3b';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.roundRect(exit.x, exit.y, exit.w, exit.h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0; // reset shadow

        // Exit Label
        ctx.fillStyle = '#a7f3d0';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚪 EXIT', exit.x + exit.w / 2, exit.y + 20);

        // Exit counter
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${exitEvacuated} out`, exit.x + exit.w / 2, exit.y + 38);
      }

      // 5. Render Fire Hazards 🔥
      const time = Date.now() * 0.005;
      for (const fire of engine.fires) {
        // Outer pulsing hazard circle
        const pulse = Math.sin(time * 3) * 5;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.beginPath();
        ctx.arc(fire.x, fire.y, fire.radius + 15 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Inner fire core
        ctx.fillStyle = 'rgba(249, 115, 22, 0.6)';
        ctx.beginPath();
        ctx.arc(fire.x, fire.y, fire.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('🔥', fire.x, fire.y + 7);

        // Danger zone label
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('HAZARD ZONE', fire.x, fire.y + fire.radius + 14);
      }

      // 6. Render Animated Dots (The People!)
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

        // Small directional motion indicator if moving
        if (!agent.isQueued && Math.hypot(agent.vx, agent.vy) > 5) {
          ctx.strokeStyle = agent.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(agent.x, agent.y);
          ctx.lineTo(agent.x - agent.vx * 0.04, agent.y - agent.vy * 0.04);
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [engine, isPlaying]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    onCanvasClick(x, y);
  };

  return (
    <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Notification / Hint Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-200">
            {engine.map.title}
          </span>
          <span className="text-slate-400 hidden sm:inline">&mdash; {engine.map.subtitle}</span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click anywhere to toggle <strong>🔥 Fire Hazard</strong></span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full flex justify-center items-center p-2 bg-slate-950 overflow-x-auto">
        <canvas
          ref={canvasRef}
          width={engine.map.width}
          height={engine.map.height}
          onClick={handleCanvasClick}
          className="max-w-full h-auto cursor-crosshair rounded-xl border border-slate-800/80"
          style={{ imageRendering: 'auto' }}
        />
      </div>

      {/* Floating Active Bottleneck Badge */}
      {engine.primaryBottleneck !== 'None' && (
        <div className="absolute bottom-4 right-4 bg-rose-950/90 border border-rose-500/50 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xl backdrop-blur">
          <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
          <div className="text-xs">
            <span className="text-slate-300">Chokepoint: </span>
            <strong className="text-rose-300">{engine.primaryBottleneck}</strong>
            <span className="text-slate-400 ml-1 font-mono font-bold">({engine.peakQueue} queued)</span>
          </div>
        </div>
      )}
    </div>
  );
};

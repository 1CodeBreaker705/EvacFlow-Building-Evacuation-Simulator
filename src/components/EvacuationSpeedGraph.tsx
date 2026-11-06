'use client';

import React, { useRef, useEffect } from 'react';
import { Activity, Zap } from 'lucide-react';

interface EvacuationSpeedGraphProps {
  elapsedTime: number;
  evacuatedCount: number;
  totalPeople: number;
  strategy: 'shortest' | 'smart' | 'astar';
  isPlaying: boolean;
}

export function EvacuationSpeedGraph({
  elapsedTime,
  evacuatedCount,
  totalPeople,
  strategy,
  isPlaying,
}: EvacuationSpeedGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataPointsRef = useRef<Array<{ time: number; evacuated: number }>>([]);
  const lastRecordedSecond = useRef<number>(-1);

  // Reset data points when simulation resets
  useEffect(() => {
    if (elapsedTime === 0) {
      dataPointsRef.current = [{ time: 0, evacuated: 0 }];
      lastRecordedSecond.current = -1;
    }
  }, [elapsedTime]);

  // Record data points every 0.5s of simulation time
  useEffect(() => {
    const currentHalfSec = Math.floor(elapsedTime * 2);
    if (currentHalfSec !== lastRecordedSecond.current && totalPeople > 0) {
      lastRecordedSecond.current = currentHalfSec;
      dataPointsRef.current.push({
        time: Math.round(elapsedTime * 10) / 10,
        evacuated: evacuatedCount,
      });
      // Cap at 300 data points
      if (dataPointsRef.current.length > 300) {
        dataPointsRef.current.shift();
      }
    }
  }, [elapsedTime, evacuatedCount, totalPeople]);

  // Compute live egress rate (people per second) over the last 3 seconds
  const pts = dataPointsRef.current;
  let liveRate = 0;
  if (pts.length >= 4) {
    const recent = pts[pts.length - 1];
    const older = pts[Math.max(0, pts.length - 6)];
    const dt = recent.time - older.time;
    if (dt > 0.4) {
      liveRate = Math.max(0, Math.round(((recent.evacuated - older.evacuated) / dt) * 10) / 10);
    }
  }

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Padding
    const padL = 36;
    const padR = 12;
    const padT = 16;
    const padB = 22;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let r = 0; r <= 4; r++) {
      const y = padT + (chartH / 4) * r;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();

      // Y-axis labels
      const val = Math.round(totalPeople * (1 - r / 4));
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${val}`, padL - 5, y);
    }

    // X-axis time max (scale dynamically or up to 60s/120s)
    const maxTime = Math.max(30, Math.ceil(elapsedTime / 15) * 15);
    for (let t = 0; t <= maxTime; t += 15) {
      const x = padL + (t / maxTime) * chartW;
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, h - padB);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${t}s`, x, h - padB + 4);
    }

    // Line color based on strategy
    const lineColor =
      strategy === 'shortest' ? '#f43f5e' : strategy === 'astar' ? '#f59e0b' : '#10b981';

    // Draw curve
    if (pts.length > 1 && totalPeople > 0) {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const x = padL + (Math.min(p.time, maxTime) / maxTime) * chartW;
        const y = padT + chartH * (1 - Math.min(1, p.evacuated / Math.max(1, totalPeople)));
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Area fill below curve
      const lastPt = pts[pts.length - 1];
      const lastX = padL + (Math.min(lastPt.time, maxTime) / maxTime) * chartW;
      const lastY = padT + chartH * (1 - Math.min(1, lastPt.evacuated / Math.max(1, totalPeople)));
      ctx.lineTo(lastX, h - padB);
      ctx.lineTo(padL, h - padB);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
      grad.addColorStop(0, strategy === 'shortest' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(16, 185, 129, 0.25)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Pulse dot on current value
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [pts, elapsedTime, totalPeople, strategy]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-md flex flex-col gap-1.5 min-w-[280px]">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span>Live Evacuation Curve</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-sky-300">
          <Zap className="w-2.5 h-2.5 text-amber-400" />
          <span>{liveRate} people/sec</span>
        </div>
      </div>

      <div className="relative w-full aspect-[280/100]">
        <canvas
          ref={canvasRef}
          width={320}
          height={110}
          className="w-full h-full rounded-lg block border border-slate-800/80"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
        <span className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{
              backgroundColor:
                strategy === 'shortest' ? '#f43f5e' : strategy === 'astar' ? '#f59e0b' : '#10b981',
            }}
          />
          {strategy === 'shortest' ? 'Dijkstra' : strategy === 'astar' ? 'A* Search' : 'EvacFlow Smart'}
        </span>
        <span className="font-mono text-slate-300 font-bold">
          {evacuatedCount} / {totalPeople} safe
        </span>
      </div>
    </div>
  );
}

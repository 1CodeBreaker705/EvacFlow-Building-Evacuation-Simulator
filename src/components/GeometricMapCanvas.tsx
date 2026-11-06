'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  GeometricBuildingSimulator,
  MovingPerson,
  GeometricExit,
  GeometricVoid,
  GeometricStair,
  GeometricLift,
  GRID_CELL_SIZE,
} from '@/lib/geometricModel';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hand,
  Flame,
  Wind,
  Ban,
  ShieldAlert,
  Sparkles,
  Expand,
} from 'lucide-react';

export type BrushSize = 'small' | 'medium' | 'large';

interface SmokeParticle {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
}

interface GeometricMapCanvasProps {
  simulator: GeometricBuildingSimulator;
  selectedItemId: string | null;
  selectedItemType: 'room' | 'corridor' | 'exit' | 'stairs' | 'lift' | null;
  onSelectItem: (id: string, type: 'room' | 'corridor' | 'exit' | 'stairs' | 'lift') => void;
  onToggleHazard?: (corridorId: string, type: 'fire' | 'block') => void;
  tickCounter: number;
  showDimensions?: boolean;
  showFlowArrows?: boolean;
  showHeatmap?: boolean;
  onToggleHeatmap?: () => void;
  brushTool?: 'select' | 'fire' | 'smoke' | 'block' | 'pedestrian' | 'eraser';
  brushSize?: BrushSize;
  onSpawnPedestrianFeedback?: (success: boolean) => void;
}

// Pre-rendered offscreen sprite caches for ultra-fast GPU blitting
let fireSpriteCanvas: HTMLCanvasElement | null = null;
let smokeSpriteCanvas: HTMLCanvasElement | null = null;
let debrisPatternCanvas: HTMLCanvasElement | null = null;
let debrisPattern: CanvasPattern | null = null;

function getFireSprite(): HTMLCanvasElement | null {
  if (fireSpriteCanvas) return fireSpriteCanvas;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(20, 20, 2, 20, 20, 18);
    grad.addColorStop(0, '#ffffff'); // Pure white-hot core
    grad.addColorStop(0.2, '#fef08a'); // Luminous lemon yellow
    grad.addColorStop(0.5, '#f97316'); // Radiant fire orange
    grad.addColorStop(0.8, '#dc2626'); // Rich vermilion border
    grad.addColorStop(1, 'rgba(185, 28, 28, 0)'); // Soft falloff
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(20, 20, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  fireSpriteCanvas = canvas;
  return canvas;
}

function getSmokeSprite(): HTMLCanvasElement | null {
  if (smokeSpriteCanvas) return smokeSpriteCanvas;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(20, 20, 2, 20, 20, 19);
    grad.addColorStop(0, 'rgba(203, 213, 225, 0.85)'); // Soft center cloud
    grad.addColorStop(0.5, 'rgba(148, 163, 184, 0.6)'); // Volumetric slate
    grad.addColorStop(0.82, 'rgba(100, 116, 139, 0.25)'); // Dissipating edge
    grad.addColorStop(1, 'rgba(71, 85, 105, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(20, 20, 19, 0, Math.PI * 2);
    ctx.fill();
  }
  smokeSpriteCanvas = canvas;
  return canvas;
}

function getDebrisPattern(ctxTarget: CanvasRenderingContext2D): CanvasPattern | null {
  if (debrisPattern) return debrisPattern;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 20;
  canvas.height = 20;
  const pctx = canvas.getContext('2d');
  if (pctx) {
    pctx.fillStyle = '#1e293b'; // Foundation dark slate
    pctx.fillRect(0, 0, 20, 20);

    pctx.strokeStyle = '#eab308'; // Warning amber/yellow
    pctx.lineWidth = 3.2;
    pctx.beginPath();
    pctx.moveTo(-5, 15);
    pctx.lineTo(15, -5);
    pctx.moveTo(5, 25);
    pctx.lineTo(25, 5);
    pctx.stroke();
  }
  debrisPatternCanvas = canvas;
  debrisPattern = ctxTarget.createPattern(canvas, 'repeat');
  return debrisPattern;
}

export function GeometricMapCanvas({
  simulator,
  selectedItemId,
  selectedItemType,
  onSelectItem,
  tickCounter,
  showDimensions = true,
  showFlowArrows = true,
  showHeatmap = false,
  onToggleHeatmap,
  brushTool = 'select',
  brushSize = 'medium',
  onSpawnPedestrianFeedback,
}: GeometricMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Spacious 1150 x 640 logical workspace
  const LOGICAL_WIDTH = 1150;
  const LOGICAL_HEIGHT = 640;

  // Zoom & Pan State
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activePanTool, setActivePanTool] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<{
    id: string;
    name: string;
    type: 'room' | 'corridor' | 'exit' | 'stairs' | 'lift';
  } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const smokeRef = useRef<SmokeParticle[]>([]);

  // Brush radius in pixels based on size selector
  const brushRadiusPx = brushSize === 'small' ? 16 : brushSize === 'large' ? 44 : 28;

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Auto-fit View to utilize 100% of container space
  const handleAutoFit = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Listen to Spacebar for quick panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Native wheel event listener on canvas for smooth zooming centered on cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const bufferX = (clientX / rect.width) * LOGICAL_WIDTH;
      const bufferY = (clientY / rect.height) * LOGICAL_HEIGHT;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;

      setZoom((curZoom) => {
        const nextZoom = Math.min(3.5, Math.max(0.4, curZoom * zoomFactor));
        setPan((curPan) => ({
          x: bufferX - (bufferX - curPan.x) * (nextZoom / curZoom),
          y: bufferY - (bufferY - curPan.y) * (nextZoom / curZoom),
        }));
        return nextZoom;
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Logical coordinates taking zoom & pan into account
  const getLogicalCoordinates = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const bufferX = ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
      const bufferY = ((e.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
      return {
        x: (bufferX - pan.x) / zoom,
        y: (bufferY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Apply brush with selected size (Fire, Smoke, Block Debris, Eraser)
  const applyBrushAt = useCallback(
    (x: number, y: number) => {
      if (brushTool === 'fire') {
        simulator.addHazardBrush(x, y, brushRadiusPx, 'fire');
      } else if (brushTool === 'smoke') {
        simulator.addHazardBrush(x, y, brushRadiusPx + 4, 'smoke');
      } else if (brushTool === 'block') {
        simulator.addHazardBrush(x, y, brushRadiusPx, 'block');
      } else if (brushTool === 'eraser') {
        simulator.eraseHazardBrush(x, y, brushRadiusPx + 6);
      }
    },
    [brushTool, brushRadiusPx, simulator]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 1 || isSpacePressed || activePanTool) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }

      setIsMouseDown(true);
      const { x, y } = getLogicalCoordinates(e);

      if (brushTool === 'pedestrian') {
        const success = simulator.spawnPersonAt(x, y);
        if (onSpawnPedestrianFeedback) onSpawnPedestrianFeedback(success);
        return;
      }

      if (brushTool !== 'select') {
        applyBrushAt(x, y);
      }
    },
    [
      isSpacePressed,
      activePanTool,
      pan,
      brushTool,
      getLogicalCoordinates,
      applyBrushAt,
      simulator,
      onSpawnPedestrianFeedback,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
        return;
      }

      const { x, y } = getLogicalCoordinates(e);
      setMousePos({ x, y });

      if (isMouseDown && (brushTool === 'fire' || brushTool === 'smoke' || brushTool === 'block' || brushTool === 'eraser')) {
        applyBrushAt(x, y);
        return;
      }

      if (brushTool === 'select') {
        for (const ex of simulator.exits) {
          if (x >= ex.x && x <= ex.x + ex.w && y >= ex.y && y <= ex.y + ex.h) {
            setHoveredItem({ id: ex.id, name: ex.name, type: 'exit' });
            return;
          }
        }
        for (const st of simulator.stairs) {
          if (x >= st.x && x <= st.x + st.w && y >= st.y && y <= st.y + st.h) {
            setHoveredItem({ id: st.id, name: st.name, type: 'stairs' });
            return;
          }
        }
        for (const lt of simulator.lifts) {
          if (x >= lt.x && x <= lt.x + lt.w && y >= lt.y && y <= lt.y + lt.h) {
            setHoveredItem({ id: lt.id, name: lt.name, type: 'lift' });
            return;
          }
        }
        for (const c of simulator.corridors) {
          if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
            setHoveredItem({ id: c.id, name: c.name, type: 'corridor' });
            return;
          }
        }
        for (const r of simulator.rooms) {
          if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
            setHoveredItem({ id: r.id, name: r.name, type: 'room' });
            return;
          }
        }

        setHoveredItem(null);
      }
    },
    [isPanning, panStart, isMouseDown, brushTool, applyBrushAt, simulator, getLogicalCoordinates]
  );

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false);
    setIsPanning(false);
    if (brushTool !== 'select') {
      simulator.finishHazardBrush();
    }
  }, [brushTool, simulator]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (brushTool !== 'select' || isPanning || activePanTool || isSpacePressed) return;
      const { x, y } = getLogicalCoordinates(e);

      // Collect all candidates under cursor with area calculation
      const hits: Array<{ id: string; type: 'room' | 'corridor' | 'exit' | 'stairs' | 'lift'; area: number }> = [];

      for (const ex of simulator.exits) {
        if (x >= ex.x && x <= ex.x + ex.w && y >= ex.y && y <= ex.y + ex.h) {
          hits.push({ id: ex.id, type: 'exit', area: ex.w * ex.h });
        }
      }
      for (const st of simulator.stairs) {
        if (x >= st.x && x <= st.x + st.w && y >= st.y && y <= st.y + st.h) {
          hits.push({ id: st.id, type: 'stairs', area: st.w * st.h });
        }
      }
      for (const lt of simulator.lifts) {
        if (x >= lt.x && x <= lt.x + lt.w && y >= lt.y && y <= lt.y + lt.h) {
          hits.push({ id: lt.id, type: 'lift', area: lt.w * lt.h });
        }
      }
      for (const r of simulator.rooms) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          hits.push({ id: r.id, type: 'room', area: r.w * r.h });
        }
      }
      for (const c of simulator.corridors) {
        if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
          hits.push({ id: c.id, type: 'corridor', area: c.w * c.h });
        }
      }

      if (hits.length === 0) return;

      // Small elements have priority; cycle through overlapping elements on repeated click
      hits.sort((a, b) => a.area - b.area);
      const currentIdx = hits.findIndex((h) => h.id === selectedItemId);
      const nextHit = currentIdx >= 0 ? hits[(currentIdx + 1) % hits.length] : hits[0];
      onSelectItem(nextHit.id, nextHit.type);
    },
    [brushTool, isPanning, activePanTool, isSpacePressed, simulator, getLogicalCoordinates, onSelectItem, selectedItemId]
  );

  // Zoom Helpers
  const handleZoomIn = () => setZoom((z) => Math.min(3.5, z * 1.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z * 0.8));
  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Sleek Top-Down Architectural Pedestrian Avatar with Status Halo (Zero Text Clutter)
  const drawPersonFigure = (ctx: CanvasRenderingContext2D, p: MovingPerson) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Status Determination:
    // Green -> Safe Flow | Red -> Congestion / Slowed | Purple -> Trapped / Refugee | Orange -> Hazard Zone
    let statusColor = '#22c55e'; // Green: Safe default
    let statusGlow = 'rgba(34, 197, 94, 0.45)';
    let bodyColor = '#0f172a';

    if (p.isTrapped || p.isRefugee) {
      statusColor = '#a855f7'; // Purple: Trapped / Refugee
      statusGlow = 'rgba(168, 85, 247, 0.65)';
      bodyColor = '#3b0764';
    } else if (p.isQueued) {
      statusColor = '#ef4444'; // Red: Congestion / Queued
      statusGlow = 'rgba(239, 68, 68, 0.65)';
      bodyColor = '#450a0a';
    } else if (p.inFireSprint || p.inSmoke) {
      statusColor = '#f97316'; // Orange: Hazard Zone
      statusGlow = 'rgba(249, 115, 22, 0.6)';
      bodyColor = '#431407';
    }

    // 1. Subtle Outer Glow Halo Ring
    ctx.save();
    ctx.shadowColor = statusGlow;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Walking Stride Feet (animated while moving)
    if (!p.isTrapped && !p.isRefugee && p.speed > 0.05) {
      const stride = Math.sin(p.walkCycle) * 3;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(-1.5 + stride, -4, 2.2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-1.5 - stride, 4, 2.2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Realistic Architectural Torso / Shoulders
    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-4.5, -5.5, 8.5, 11, 4);
    ctx.fill();
    ctx.stroke();

    // 4. Directional Forward Heading / Visor Nose
    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.moveTo(3.5, -2);
    ctx.lineTo(6.5, 0);
    ctx.lineTo(3.5, 2);
    ctx.closePath();
    ctx.fill();

    // 5. Head Circle in Center
    ctx.fillStyle = p.isTrapped || p.isRefugee ? '#d8b4fe' : p.isQueued ? '#fca5a5' : '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  };

  // Render ISO 7010 Exit Portal
  const drawIsoExitSign = (ctx: CanvasRenderingContext2D, ex: GeometricExit) => {
    ctx.save();
    const isFull = ex.maxCapacityLimit ? ex.evacuatedCount >= ex.maxCapacityLimit : false;
    const isLit = !ex.isBlocked && !isFull;
    const isSel = selectedItemId === ex.id && selectedItemType === 'exit';

    ctx.fillStyle = isLit ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.25)';
    ctx.beginPath();
    ctx.arc(ex.exitPoint.x, ex.exitPoint.y, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isLit ? '#166534' : '#7f1d1d';
    ctx.strokeStyle = isSel ? '#38bdf8' : isLit ? '#22c55e' : '#ef4444';
    ctx.lineWidth = isSel ? 3 : 2;
    ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
    ctx.strokeRect(ex.x, ex.y, ex.w, ex.h);

    ctx.fillStyle = isLit ? '#bbf7d0' : '#fca5a5';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ex.label || 'EXIT', ex.x + ex.w / 2, ex.y + ex.h / 2 + 3);

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isFull ? '#ef4444' : '#22c55e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(ex.x + ex.w / 2 - 38, ex.y + ex.h + 2, 76, 16, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFull ? '#f87171' : '#4ade80';
    ctx.font = 'bold 8px monospace';
    const capText = ex.maxCapacityLimit ? `${ex.evacuatedCount}/${ex.maxCapacityLimit}` : `${ex.evacuatedCount}/∞`;
    ctx.fillText(isFull ? `⛔ FULL (${capText})` : `✓ SAFE: ${capText}`, ex.x + ex.w / 2, ex.y + ex.h + 13);

    ctx.restore();
  };

  // Render Emergency Fire Stairs
  const drawStaircase = (ctx: CanvasRenderingContext2D, st: GeometricStair) => {
    ctx.save();
    const isFull = st.maxCapacityLimit ? st.evacuatedCount >= st.maxCapacityLimit : false;
    const isSel = selectedItemId === st.id && selectedItemType === 'stairs';

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isSel ? '#38bdf8' : isFull ? '#ef4444' : '#0284c7';
    ctx.lineWidth = isSel ? 2.5 : 1.5;
    ctx.fillRect(st.x, st.y, st.w, st.h);
    ctx.strokeRect(st.x, st.y, st.w, st.h);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    const stepCount = 5;
    for (let i = 1; i < stepCount; i++) {
      const stepY = st.y + (st.h / stepCount) * i;
      ctx.beginPath();
      ctx.moveTo(st.x + 4, stepY);
      ctx.lineTo(st.x + st.w - 4, stepY);
      ctx.stroke();
    }

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 8px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(st.label || 'STAIRS', st.x + st.w / 2, st.y + st.h / 2 + 3);

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isFull ? '#ef4444' : '#0284c7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(st.x + st.w / 2 - 36, st.y + st.h + 2, 72, 14, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFull ? '#f87171' : '#38bdf8';
    ctx.font = 'bold 8px monospace';
    const capText = st.maxCapacityLimit ? `${st.evacuatedCount}/${st.maxCapacityLimit}` : `${st.evacuatedCount}/∞`;
    ctx.fillText(isFull ? `⛔ FULL (${capText})` : `🚶 ${capText} SAFE`, st.x + st.w / 2, st.y + st.h + 12);

    ctx.restore();
  };

  // Render Elevator Shaft
  const drawElevator = (ctx: CanvasRenderingContext2D, lift: GeometricLift) => {
    ctx.save();
    const isFull = lift.maxCapacityLimit ? lift.evacuatedCount >= lift.maxCapacityLimit : false;
    const isOOS = lift.isOutOfService || isFull;
    const isSel = selectedItemId === lift.id && selectedItemType === 'lift';

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isSel ? '#38bdf8' : isOOS ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = isSel ? 2.5 : 1.5;
    ctx.fillRect(lift.x, lift.y, lift.w, lift.h);
    ctx.strokeRect(lift.x, lift.y, lift.w, lift.h);

    ctx.strokeStyle = isOOS ? 'rgba(239, 68, 68, 0.7)' : 'rgba(245, 158, 11, 0.5)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(lift.x + 4, lift.y + 4);
    ctx.lineTo(lift.x + lift.w - 4, lift.y + lift.h - 4);
    ctx.moveTo(lift.x + lift.w - 4, lift.y + 4);
    ctx.lineTo(lift.x + 4, lift.y + lift.h - 4);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = isOOS ? '#ef4444' : '#fbbf24';
    ctx.font = 'bold 7px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isOOS ? 'LIFT (CLOSED)' : 'LIFT (EVAC)', lift.x + lift.w / 2, lift.y + lift.h / 2 + 3);

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isOOS ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(lift.x + lift.w / 2 - 34, lift.y + lift.h + 2, 68, 14, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isOOS ? '#f87171' : '#fbbf24';
    ctx.font = 'bold 8px monospace';
    const capText = lift.maxCapacityLimit ? `${lift.evacuatedCount}/${lift.maxCapacityLimit}` : `${lift.evacuatedCount}/∞`;
    ctx.fillText(isOOS ? `⛔ OOS (${capText})` : `🛗 ${capText} SAFE`, lift.x + lift.w / 2, lift.y + lift.h + 12);

    ctx.restore();
  };

  // Render Central Empty Space Void / Atrium
  const drawEmptySpaceVoid = (ctx: CanvasRenderingContext2D, v: GeometricVoid) => {
    ctx.save();
    ctx.fillStyle = '#060a12';
    ctx.fillRect(v.x, v.y, v.w, v.h);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 8;
    ctx.strokeRect(v.x, v.y, v.w, v.h);

    ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(v.x, v.y);
    ctx.lineTo(v.x + v.w, v.y + v.h);
    ctx.moveTo(v.x + v.w, v.y);
    ctx.lineTo(v.x, v.y + v.h);
    ctx.stroke();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(v.x + v.w / 2 - 140, v.y + v.h / 2 - 18, 280, 36, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(v.label || 'EMPTY VOID', v.x + v.w / 2, v.y + v.h / 2 + 4);

    ctx.restore();
  };

  // 60 FPS Native Canvas Render Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // High-DPI Display Canvas Scaling for Crystal-Clear Vector Text & Rendering
      const dpr = Math.min(2.5, typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1);
      const targetWidth = Math.round(LOGICAL_WIDTH * dpr);
      const targetHeight = Math.round(LOGICAL_HEIGHT * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Clear Canvas Background
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Apply Zoom & Pan Transformation Matrix
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Blueprint Grid Lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < LOGICAL_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, LOGICAL_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < LOGICAL_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(LOGICAL_WIDTH, y);
        ctx.stroke();
      }

      // 1. Walkable Corridors / Hallways
      for (const c of simulator.corridors) {
        const isSelected = selectedItemType === 'corridor' && selectedItemId === c.id;
        const isHovered = hoveredItem?.type === 'corridor' && hoveredItem.id === c.id;

        ctx.fillStyle = isSelected
          ? 'rgba(30, 58, 138, 0.5)'
          : isHovered
          ? 'rgba(30, 41, 59, 0.8)'
          : 'rgba(15, 23, 42, 0.65)';
        ctx.fillRect(c.x, c.y, c.w, c.h);

        ctx.strokeStyle = isSelected ? '#38bdf8' : isHovered ? '#60a5fa' : '#334155';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(c.x, c.y, c.w, c.h);

        const cleanCorridorLabel = c.label.replace(/\s*\([^)]*m[^)]*\)/gi, '').trim();
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(cleanCorridorLabel, c.x + c.w / 2, c.y + 16);

        if (c.isBlocked) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
          ctx.fillRect(c.x, c.y, c.w, c.h);
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillText('🚧 CORRIDOR BLOCKED (DEBRIS)', c.x + c.w / 2, c.y + c.h / 2);
        }
        if (c.hasFire) {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.28)';
          ctx.fillRect(c.x, c.y, c.w, c.h);
          ctx.fillStyle = '#f97316';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillText('🔥 ACTIVE FIRE HAZARD', c.x + c.w / 2, c.y + c.h / 2);
        } else if (c.hasSmoke) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.fillRect(c.x, c.y, c.w, c.h);
          ctx.fillStyle = '#cbd5e1';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillText('💨 SMOKE / TOXIC GAS HAZARD', c.x + c.w / 2, c.y + c.h / 2);
        }
      }

      // 2. Real Corridor Density Heatmap Overlay
      if (showHeatmap) {
        ctx.save();
        for (const c of simulator.corridors) {
          const isInfinite = c.capacity === null || c.capacity === undefined || !isFinite(c.capacity);
          const isZeroCap = c.capacity === 0;

          const densityRatio = isInfinite
            ? 0
            : isZeroCap
            ? (c.currentOccupants > 0 ? 2.0 : 0)
            : c.currentOccupants / Math.max(1, c.capacity as number);
          const densityPct = isInfinite
            ? 0
            : isZeroCap
            ? (c.currentOccupants > 0 ? 100 : 0)
            : Math.round(densityRatio * 100);

          let heatColor = 'rgba(56, 189, 248, 0.16)';
          if (isInfinite) {
            heatColor = 'rgba(34, 197, 94, 0.15)';
          } else if (densityRatio > 0 && densityRatio <= 0.4) {
            heatColor = 'rgba(34, 197, 94, 0.38)';
          } else if (densityRatio > 0.4 && densityRatio <= 0.75) {
            heatColor = 'rgba(245, 158, 11, 0.48)';
          } else if (densityRatio > 0.75 && densityRatio <= 1.0) {
            heatColor = 'rgba(249, 115, 22, 0.62)';
          } else if (densityRatio > 1.0) {
            const jamPulse = 0.65 + Math.sin(Date.now() * 0.008) * 0.15;
            heatColor = `rgba(239, 68, 68, ${jamPulse})`;
          }

          ctx.fillStyle = heatColor;
          ctx.fillRect(c.x, c.y, c.w, c.h);

          ctx.strokeStyle = densityRatio > 1.0 ? '#ef4444' : densityRatio > 0.75 ? '#f97316' : densityRatio > 0.4 ? '#f59e0b' : '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(c.x, c.y, c.w, c.h);

          // If congested jam, draw caution hash lines across corridor
          if (densityRatio > 1.0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1.5;
            for (let hx = c.x - c.h; hx < c.x + c.w; hx += 20) {
              ctx.beginPath();
              ctx.moveTo(Math.max(c.x, hx), c.y);
              ctx.lineTo(Math.min(c.x + c.w, hx + c.h), c.y + c.h);
              ctx.stroke();
            }
            ctx.restore();
          }

          // Density Percentage Badge on Corridor Floor
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = densityRatio > 1.0 ? '#ef4444' : '#64748b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(c.x + c.w / 2 - 62, c.y + c.h / 2 - 11, 124, 22, 5);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = densityRatio > 1.0 ? '#f87171' : densityRatio > 0.75 ? '#fb923c' : '#38bdf8';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          const capDisplay = isInfinite ? '∞' : isZeroCap ? '0' : `${c.capacity}`;
          ctx.fillText(`DENSITY: ${densityPct}% (${c.currentOccupants}/${capDisplay})`, c.x + c.w / 2, c.y + c.h / 2 + 4);
        }

        // Occupant cluster thermal glow
        for (const p of simulator.people) {
          if (p.isEvacuated) continue;
          const gradient = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 28);
          gradient.addColorStop(0, p.isQueued ? 'rgba(239, 68, 68, 0.45)' : 'rgba(245, 158, 11, 0.35)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 3. Rooms with Perimeter Walls and Door Openings
      for (const r of simulator.rooms) {
        const isSelected = selectedItemType === 'room' && selectedItemId === r.id;
        const isHovered = hoveredItem?.type === 'room' && hoveredItem.id === r.id;

        ctx.fillStyle = isSelected
          ? 'rgba(30, 58, 138, 0.35)'
          : isHovered
          ? 'rgba(30, 41, 59, 0.85)'
          : 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(r.x, r.y, r.w, r.h);

        ctx.strokeStyle = isSelected ? '#38bdf8' : '#475569';
        ctx.lineWidth = 6;
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        // Clear, high-visibility Room Label (Occupants info removed to eliminate clutter per specification)
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.label, r.x + r.w / 2, r.y + r.h / 2 - 2);

        ctx.save();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;

        // Detect which wall the door is placed on
        const isNorth = Math.abs(r.doorPoint.y - r.y) < 15;
        const isSouth = Math.abs(r.doorPoint.y - (r.y + r.h)) < 15;
        const isWest = Math.abs(r.doorPoint.x - r.x) < 15;
        const isEast = Math.abs(r.doorPoint.x - (r.x + r.w)) < 15;

        ctx.beginPath();
        if (isNorth) {
          ctx.arc(r.doorPoint.x, r.doorPoint.y, 14, Math.PI, Math.PI * 1.5);
        } else if (isWest) {
          ctx.arc(r.doorPoint.x, r.doorPoint.y, 14, Math.PI * 0.5, Math.PI);
        } else if (isEast) {
          ctx.arc(r.doorPoint.x, r.doorPoint.y, 14, 0, -Math.PI * 0.5, true);
        } else {
          // South default
          ctx.arc(r.doorPoint.x, r.doorPoint.y, 14, 0, Math.PI * 0.5);
        }
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 8px Inter, sans-serif';
        const labelY = isNorth ? r.doorPoint.y + 12 : r.doorPoint.y - 4;
        ctx.fillText(r.doorLabel, r.doorPoint.x, labelY);
        ctx.restore();
      }

      // 4. Empty Space Voids (Courtyards / Lightwells)
      for (const v of simulator.voids) {
        drawEmptySpaceVoid(ctx, v);
      }

      // 5. Solid Barrier Walls
      for (const w of simulator.walls) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      }

      // 6. Stairs & Lifts
      for (const st of simulator.stairs) {
        drawStaircase(ctx, st);
      }
      for (const lift of simulator.lifts) {
        drawElevator(ctx, lift);
      }

      // 7. Exit Portals
      for (const ex of simulator.exits) {
        drawIsoExitSign(ctx, ex);
      }

      // 8. Architectural Collapsed Debris & Hazard Barricades (Batched Pattern Fill)
      if (simulator.brushObstacles.size > 0) {
        const debrisCols = Math.floor(LOGICAL_WIDTH / GRID_CELL_SIZE);
        const pattern = getDebrisPattern(ctx);

        ctx.beginPath();
        for (const idx of simulator.brushObstacles) {
          const gx = idx % debrisCols;
          const gy = Math.floor(idx / debrisCols);
          ctx.rect(gx * GRID_CELL_SIZE, gy * GRID_CELL_SIZE, GRID_CELL_SIZE, GRID_CELL_SIZE);
        }
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fill();
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fill();
        }

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 9. Dynamic Smoke Hazard Brushes (Hardware-Accelerated Sprite Blitting)
      if (simulator.brushSmoke.size > 0) {
        const smokeSprite = getSmokeSprite();
        const smokeCols = Math.floor(LOGICAL_WIDTH / GRID_CELL_SIZE);
        const smokeAnimTime = Date.now() * 0.003;

        for (const idx of simulator.brushSmoke) {
          const gx = idx % smokeCols;
          const gy = Math.floor(idx / smokeCols);
          const cx = gx * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
          const cy = gy * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;

          const pulse = Math.sin(smokeAnimTime + (gx * 3 + gy * 7)) * 2;
          const rad = Math.max(5, GRID_CELL_SIZE * 0.95 + pulse);
          if (smokeSprite) {
            ctx.drawImage(smokeSprite, cx - rad, cy - rad, rad * 2, rad * 2);
          }
        }
      }

      // 10. Enhanced Animated Fire Hazards (Hardware-Accelerated Sprite Blitting)
      if (simulator.brushFires.size > 0) {
        const fireSprite = getFireSprite();
        const fireCols = Math.floor(LOGICAL_WIDTH / GRID_CELL_SIZE);
        const fireTime = Date.now() * 0.006;

        for (const idx of simulator.brushFires) {
          const gx = idx % fireCols;
          const gy = Math.floor(idx / fireCols);
          const cx = gx * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;
          const cy = gy * GRID_CELL_SIZE + GRID_CELL_SIZE / 2;

          const pulse = Math.sin(fireTime + (gx + gy) * 0.8) * 2;
          const rad = Math.max(5, GRID_CELL_SIZE * 0.8 + pulse);
          if (fireSprite) {
            ctx.drawImage(fireSprite, cx - rad, cy - rad, rad * 2, rad * 2);
          }
        }
      }

      // 11. Animated Rising Smoke Particles (Bounded Zero-GC Allocation Pool)
      if (smokeRef.current.length < 35 && (simulator.brushFires.size > 0 || simulator.brushSmoke.size > 0 || simulator.corridors.some((c) => c.hasFire || c.hasSmoke))) {
        if (Math.random() < 0.4) {
          const fireSize = simulator.brushFires.size;
          const smokeSize = simulator.brushSmoke.size;
          const totalHaz = fireSize + smokeSize;
          if (totalHaz > 0) {
            let targetIdx = -1;
            let pick = Math.floor(Math.random() * totalHaz);
            if (pick < fireSize) {
              let count = 0;
              for (const id of simulator.brushFires) {
                if (count++ === pick) { targetIdx = id; break; }
              }
            } else {
              pick -= fireSize;
              let count = 0;
              for (const id of simulator.brushSmoke) {
                if (count++ === pick) { targetIdx = id; break; }
              }
            }
            if (targetIdx >= 0) {
              const gx = targetIdx % Math.floor(LOGICAL_WIDTH / GRID_CELL_SIZE);
              const gy = Math.floor(targetIdx / Math.floor(LOGICAL_WIDTH / GRID_CELL_SIZE));
              smokeRef.current.push({
                x: gx * GRID_CELL_SIZE + Math.random() * 10,
                y: gy * GRID_CELL_SIZE + Math.random() * 10,
                radius: 4 + Math.random() * 6,
                opacity: 0.65,
                vx: (Math.random() - 0.5) * 10,
                vy: -18 - Math.random() * 15,
                age: 0,
                maxAge: 30 + Math.random() * 20,
              });
            }
          }
        }
      }

      for (let i = smokeRef.current.length - 1; i >= 0; i--) {
        const sp = smokeRef.current[i];
        sp.x += sp.vx * 0.016;
        sp.y += sp.vy * 0.016;
        sp.radius += 0.16;
        sp.age += 1;
        sp.opacity = Math.max(0, 0.65 * (1 - sp.age / sp.maxAge));

        ctx.fillStyle = `rgba(148, 163, 184, ${sp.opacity})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fill();

        if (sp.age >= sp.maxAge) {
          smokeRef.current.splice(i, 1);
        }
      }

      // 12. Moving Pedestrians
      for (const p of simulator.people) {
        if (!p.isEvacuated) {
          drawPersonFigure(ctx, p);
        }
      }

      // 13. Interactive Brush Cursor Preview
      if (mousePos && brushTool !== 'select' && !activePanTool && !isSpacePressed) {
        ctx.save();
        ctx.strokeStyle =
          brushTool === 'fire'
            ? '#f97316'
            : brushTool === 'smoke'
            ? '#94a3b8'
            : brushTool === 'block'
            ? '#ef4444'
            : brushTool === 'pedestrian'
            ? '#38bdf8'
            : '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, brushTool === 'pedestrian' ? 8 : brushRadiusPx, 0, Math.PI * 2);
        ctx.stroke();

        if (brushTool === 'fire') {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
          ctx.fill();
        } else if (brushTool === 'smoke') {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    simulator,
    selectedItemId,
    selectedItemType,
    hoveredItem,
    mousePos,
    showDimensions,
    showHeatmap,
    brushTool,
    brushRadiusPx,
    zoom,
    pan,
    activePanTool,
    isSpacePressed,
  ]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={LOGICAL_WIDTH}
          height={LOGICAL_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          className={`w-full h-full object-contain max-w-full max-h-full rounded-xl border border-slate-800 shadow-2xl transition-all ${
            isPanning || activePanTool || isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
          }`}
          style={{ width: '100%', height: '100%', objectFit: 'contain', aspectRatio: `${LOGICAL_WIDTH} / ${LOGICAL_HEIGHT}` }}
        />

        {/* Pedestrian Status Indicator Legend */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl backdrop-blur-md shadow-2xl text-[11px] font-medium text-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status:</span>
          <span className="flex items-center gap-1.5" title="Fluid unobstructed movement">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]"></span>
            <span className="text-emerald-400">Safe Flow</span>
          </span>
          <span className="flex items-center gap-1.5" title="Slowed down by crowd congestion or hallway queue">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"></span>
            <span className="text-rose-400">Congested (Slowed)</span>
          </span>
          <span className="flex items-center gap-1.5" title="Trapped / Cut off by fire, debris, or locked exits">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.7)]"></span>
            <span className="text-purple-400">Trapped / Refugee</span>
          </span>
          <span className="flex items-center gap-1.5" title="Moving through smoke or sprint near fire">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]"></span>
            <span className="text-amber-400">Hazard</span>
          </span>
        </div>

        {/* Floating Zoom & Pan Controls HUD (Bottom Left) */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 p-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl backdrop-blur-md shadow-2xl text-xs">
          <button
            onClick={handleZoomIn}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            title="Zoom In (Scroll Up)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            title="Zoom Out (Scroll Down)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] font-bold rounded-lg transition-colors"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleAutoFit}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors"
            title="Auto-Fit / Fill Window (Zero Letterbox)"
          >
            <Expand className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActivePanTool((p) => !p)}
            className={`p-1.5 rounded-lg transition-colors ${
              activePanTool
                ? 'bg-sky-600 text-white font-bold shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Pan Hand Tool (or hold Space while dragging)"
          >
            <Hand className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-slate-400 pl-1 hidden sm:inline">
            Scroll to zoom • Space+drag to pan
          </span>
        </div>

        {/* Fullscreen Button (Top Right) */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 backdrop-blur-sm transition-colors shadow-lg z-10"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
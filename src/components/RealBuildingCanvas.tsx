'use client';

import React, { useRef, useEffect } from 'react';
import { Flame, ShieldAlert, Users, Layers, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export interface RoomLayout {
  id: string;
  name: string;
  type: 'room' | 'lift' | 'stair' | 'exit';
  x: number;
  y: number;
  w: number;
  h: number;
  door: { x: number; y: number; orientation: 'top' | 'bottom' | 'left' | 'right' };
}

export interface PersonDot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  color: string;
  radius: number;
  targetStairId: 'stair_a' | 'stair_b';
  waypoints: { x: number; y: number }[];
  waypointIndex: number;
  isEvacuated: boolean;
  isQueued: boolean;
  roomId: string;
}

interface RealBuildingCanvasProps {
  peopleCount: number;
  walkingSpeed: number;
  corridorCapacity: 'narrow' | 'wide';
  strategy: 'shortest' | 'smart';
  showGraph: boolean;
  isPlaying: boolean;
  onUpdateStats: (evacuated: number, total: number, queue: number, status: string) => void;
}

export const RealBuildingCanvas: React.FC<RealBuildingCanvasProps> = ({
  peopleCount,
  walkingSpeed,
  corridorCapacity,
  strategy,
  showGraph,
  isPlaying,
  onUpdateStats,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation state held in refs for 60fps smooth loop
  const peopleRef = useRef<PersonDot[]>([]);
  const firesRef = useRef<{ x: number; y: number; r: number }[]>([]);
  const blockedDoorsRef = useRef<Set<string>>(new Set());
  const statsRef = useRef({ evacuated: 0, total: peopleCount, queue: 0, status: 'Normal Flow' });

  // Architectural Layout of the Building (MAIT Department Floor)
  const rooms: RoomLayout[] = [
    // Top Row Rooms
    { id: 'lab_ds', name: 'Computer Lab 1', type: 'room', x: 60, y: 50, w: 220, h: 140, door: { x: 170, y: 190, orientation: 'bottom' } },
    { id: 'lab_ai', name: 'AI & Robotics Lab', type: 'room', x: 370, y: 50, w: 220, h: 140, door: { x: 480, y: 190, orientation: 'bottom' } },
    { id: 'fac_room', name: 'Faculty Cabin', type: 'room', x: 680, y: 50, w: 210, h: 140, door: { x: 785, y: 190, orientation: 'bottom' } },

    // Central Core
    { id: 'lift_bank', name: 'ELEVATOR / LIFT', type: 'lift', x: 410, y: 250, w: 140, h: 80, door: { x: 480, y: 330, orientation: 'bottom' } },

    // Bottom Row Rooms
    { id: 'cr_101', name: 'Lecture Hall 101', type: 'room', x: 60, y: 390, w: 220, h: 140, door: { x: 170, y: 390, orientation: 'top' } },
    { id: 'cr_102', name: 'Lecture Hall 102', type: 'room', x: 370, y: 390, w: 220, h: 140, door: { x: 480, y: 390, orientation: 'top' } },
    { id: 'seminar', name: 'Seminar Hall', type: 'room', x: 680, y: 390, w: 210, h: 140, door: { x: 785, y: 390, orientation: 'top' } },
  ];

  // Stairs & Emergency Exits
  const stairs = [
    { id: 'stair_a', name: 'STAIRCASE A (WEST)', x: 15, y: 230, w: 75, h: 120, exitX: 10, exitY: 290 },
    { id: 'stair_b', name: 'STAIRCASE B (EAST)', x: 865, y: 230, w: 75, h: 120, exitX: 940, exitY: 290 },
  ];

  // Graph Nodes for overlay
  const graphNodes = [
    { id: 'N_DS', name: 'Lab 1', x: 170, y: 120, type: 'room' },
    { id: 'N_AI', name: 'AI Lab', x: 480, y: 120, type: 'room' },
    { id: 'N_FAC', name: 'Faculty', x: 785, y: 120, type: 'room' },
    { id: 'N_CR1', name: 'Hall 101', x: 170, y: 460, type: 'room' },
    { id: 'N_CR2', name: 'Hall 102', x: 480, y: 460, type: 'room' },
    { id: 'N_SEM', name: 'Seminar', x: 785, y: 460, type: 'room' },

    // Hallway Junctions
    { id: 'J_WEST', name: 'Junc West', x: 170, y: 290, type: 'junction' },
    { id: 'J_MID_N', name: 'Hall North', x: 480, y: 215, type: 'junction' },
    { id: 'J_MID_S', name: 'Hall South', x: 480, y: 365, type: 'junction' },
    { id: 'J_EAST', name: 'Junc East', x: 785, y: 290, type: 'junction' },

    // Exits / Stairs
    { id: 'N_STAIR_A', name: 'Stair A', x: 50, y: 290, type: 'stair' },
    { id: 'N_STAIR_B', name: 'Stair B', x: 900, y: 290, type: 'stair' },
  ];

  // Graph Edges
  const graphEdges = [
    { from: 'N_DS', to: 'J_WEST', cap: 25, label: 'Door 1' },
    { from: 'N_CR1', to: 'J_WEST', cap: 25, label: 'Door 4' },
    { from: 'J_WEST', to: 'N_STAIR_A', cap: corridorCapacity === 'narrow' ? 12 : 35, label: corridorCapacity === 'narrow' ? 'Narrow C2 (Cap:12)' : 'C2 (Cap:35)' },

    { from: 'N_AI', to: 'J_MID_N', cap: 25, label: 'Door 2' },
    { from: 'N_CR2', to: 'J_MID_S', cap: 25, label: 'Door 5' },
    { from: 'J_MID_N', to: 'J_WEST', cap: 25, label: 'North Hall' },
    { from: 'J_MID_N', to: 'J_EAST', cap: 25, label: 'North Hall' },
    { from: 'J_MID_S', to: 'J_WEST', cap: 25, label: 'South Hall' },
    { from: 'J_MID_S', to: 'J_EAST', cap: 25, label: 'South Hall' },

    { from: 'N_FAC', to: 'J_EAST', cap: 25, label: 'Door 3' },
    { from: 'N_SEM', to: 'J_EAST', cap: 25, label: 'Door 6' },
    { from: 'J_EAST', to: 'N_STAIR_B', cap: 35, label: 'East Hall (Cap:35)' },
  ];

  // Spawn / Respawn People Dots
  const initPeople = () => {
    const newPeople: PersonDot[] = [];
    const roomDefs = rooms.filter((r) => r.type === 'room');
    const perRoom = Math.floor(peopleCount / roomDefs.length);
    const colors = ['#38bdf8', '#818cf8', '#a78bfa', '#34d399', '#f59e0b', '#fb7185'];

    let idCount = 1;
    for (let r = 0; r < roomDefs.length; r++) {
      const rm = roomDefs[r];
      const count = r === roomDefs.length - 1 ? peopleCount - (roomDefs.length - 1) * perRoom : perRoom;

      for (let i = 0; i < count; i++) {
        // Spawn inside room
        const x = rm.x + 25 + Math.random() * (rm.w - 50);
        const y = rm.y + 25 + Math.random() * (rm.h - 50);

        // Determine destination stair based on strategy:
        // Shortest Path (Naive): Lab 1, Lab AI, Hall 101, Hall 102 all rush to Stair A (closer to left/center)!
        // Smart (EvacFlow): Evenly balances people between Stair A (West) and Stair B (East)!
        let targetStair: 'stair_a' | 'stair_b' = 'stair_a';
        if (strategy === 'shortest') {
          targetStair = x < 650 ? 'stair_a' : 'stair_b';
        } else {
          // Smart Evacuation balances flow
          targetStair = r % 2 === 0 ? 'stair_a' : 'stair_b';
        }

        // Generate waypoints from room door -> hallway -> staircase
        const wps: { x: number; y: number }[] = [];
        wps.push({ x: rm.door.x, y: rm.door.y }); // Step out of room door

        // Hallway navigation
        if (rm.door.y < 250) {
          // Came from top row
          wps.push({ x: rm.door.x, y: 220 });
          if (targetStair === 'stair_a') {
            wps.push({ x: 170, y: 220 });
            wps.push({ x: 170, y: 290 });
            wps.push({ x: 50, y: 290 });
          } else {
            wps.push({ x: 785, y: 220 });
            wps.push({ x: 785, y: 290 });
            wps.push({ x: 900, y: 290 });
          }
        } else {
          // Came from bottom row
          wps.push({ x: rm.door.x, y: 360 });
          if (targetStair === 'stair_a') {
            wps.push({ x: 170, y: 360 });
            wps.push({ x: 170, y: 290 });
            wps.push({ x: 50, y: 290 });
          } else {
            wps.push({ x: 785, y: 360 });
            wps.push({ x: 785, y: 290 });
            wps.push({ x: 900, y: 290 });
          }
        }

        newPeople.push({
          id: idCount++,
          x,
          y,
          vx: 0,
          vy: 0,
          speed: 1.0 + Math.random() * 0.4,
          color: colors[r % colors.length],
          radius: 4.5,
          targetStairId: targetStair,
          waypoints: wps,
          waypointIndex: 0,
          isEvacuated: false,
          isQueued: false,
          roomId: rm.id,
        });
      }
    }

    peopleRef.current = newPeople;
    statsRef.current = { evacuated: 0, total: peopleCount, queue: 0, status: 'Evacuation Started' };
  };

  // Re-initialize when peopleCount or strategy changes
  useEffect(() => {
    initPeople();
  }, [peopleCount, strategy, corridorCapacity]);

  // Handle canvas click to add / remove fire or block door
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if clicked near an existing fire -> remove it
    const existingFireIdx = firesRef.current.findIndex(
      (f) => Math.hypot(f.x - x, f.y - y) < f.r + 15
    );

    if (existingFireIdx >= 0) {
      firesRef.current.splice(existingFireIdx, 1);
    } else {
      // Add Fire Hazard
      firesRef.current.push({ x, y, r: 42 });

      // Reroute people near fire in Smart Mode
      if (strategy === 'smart') {
        for (const p of peopleRef.current) {
          if (!p.isEvacuated) {
            // Switch target staircase away from fire side
            if (x < 480 && p.targetStairId === 'stair_a') {
              p.targetStairId = 'stair_b';
              // Reroute waypoints to Stair B
              p.waypoints = [
                { x: p.x, y: p.y < 290 ? 220 : 360 },
                { x: 785, y: p.y < 290 ? 220 : 360 },
                { x: 785, y: 290 },
                { x: 900, y: 290 },
              ];
              p.waypointIndex = 0;
            } else if (x >= 480 && p.targetStairId === 'stair_b') {
              p.targetStairId = 'stair_a';
              p.waypoints = [
                { x: p.x, y: p.y < 290 ? 220 : 360 },
                { x: 170, y: p.y < 290 ? 220 : 360 },
                { x: 170, y: 290 },
                { x: 50, y: 290 },
              ];
              p.waypointIndex = 0;
            }
          }
        }
      }
    }
  };

  // 60fps Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // 1. CLEAR & BLUEPRINT BACKGROUND
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Blueprint architectural subtle grid
      ctx.strokeStyle = '#131e36';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Outer concrete boundary wall
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

      // 2. HALLWAYS / CORRIDORS
      // Draw smooth hallway floor surfaces
      ctx.fillStyle = '#0e172a';
      // North Hallway
      ctx.fillRect(60, 190, 830, 60);
      // South Hallway
      ctx.fillRect(60, 330, 830, 60);
      // West Corridor to Stair A
      ctx.fillRect(60, 190, 140, 200);
      // East Corridor to Stair B
      ctx.fillRect(750, 190, 140, 200);

      // 3. RENDER ROOMS
      for (const rm of rooms) {
        if (rm.type === 'room') {
          // Room floor
          ctx.fillStyle = '#10192e';
          ctx.strokeStyle = '#22324f';
          ctx.lineWidth = 2.5;
          ctx.fillRect(rm.x, rm.y, rm.w, rm.h);
          ctx.strokeRect(rm.x, rm.y, rm.w, rm.h);

          // Room Header Label Box
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(rm.x, rm.y, rm.w, 24);
          ctx.fillStyle = '#cbd5e1';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(rm.name, rm.x + rm.w / 2, rm.y + 16);

          // Door Cutout in Wall
          ctx.fillStyle = '#0e172a';
          if (rm.door.orientation === 'bottom') {
            ctx.fillRect(rm.door.x - 14, rm.y + rm.h - 3, 28, 6);
          } else {
            ctx.fillRect(rm.door.x - 14, rm.y - 3, 28, 6);
          }

          // Door Swing Arc (Architectural Detail)
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(rm.door.x - 14, rm.door.y, 22, 0, Math.PI / 2);
          ctx.stroke();

          // Room live count badge
          const remainingInRoom = peopleRef.current.filter(
            (p) => !p.isEvacuated && p.x >= rm.x && p.x <= rm.x + rm.w && p.y >= rm.y && p.y <= rm.y + rm.h
          ).length;

          ctx.fillStyle = remainingInRoom > 0 ? '#38bdf8' : '#22c55e';
          ctx.font = '10px monospace';
          ctx.fillText(
            remainingInRoom > 0 ? `👥 ${remainingInRoom} people` : '✓ Cleared',
            rm.x + rm.w / 2,
            rm.y + rm.h - 10
          );
        } else if (rm.type === 'lift') {
          // LIFT / ELEVATOR SHAFT
          ctx.fillStyle = '#1c1917';
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2;
          ctx.fillRect(rm.x, rm.y, rm.w, rm.h);
          ctx.strokeRect(rm.x, rm.y, rm.w, rm.h);

          ctx.fillStyle = '#f87171';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🛗 ELEVATOR / LIFT', rm.x + rm.w / 2, rm.y + 35);
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('⛔ EMERGENCY SHUTDOWN', rm.x + rm.w / 2, rm.y + 52);
        }
      }

      // 4. RENDER STAIRWAYS & EXITS
      for (const st of stairs) {
        // Staircase enclosure
        ctx.fillStyle = '#064e3b';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.fillRect(st.x, st.y, st.w, st.h);
        ctx.strokeRect(st.x, st.y, st.w, st.h);

        // Striped Stair Steps
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
        ctx.lineWidth = 2;
        for (let sy = st.y + 15; sy < st.y + st.h - 15; sy += 12) {
          ctx.beginPath();
          ctx.moveTo(st.x + 8, sy);
          ctx.lineTo(st.x + st.w - 8, sy);
          ctx.stroke();
        }

        // Stair Label
        ctx.fillStyle = '#a7f3d0';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🪜 ' + st.name, st.x + st.w / 2, st.y + 20);

        // Emergency Exit Marker
        const evacuatedCountAtStair = peopleRef.current.filter(
          (p) => p.isEvacuated && p.targetStairId === st.id
        ).length;

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`🏃 ${evacuatedCountAtStair} OUT`, st.x + st.w / 2, st.y + st.h - 15);
      }

      // 5. OPTIONAL GRAPH OVERLAY (Show Building as Weighted Graph)
      if (showGraph) {
        // Edges
        for (const edge of graphEdges) {
          const fromNode = graphNodes.find((n) => n.id === edge.from);
          const toNode = graphNodes.find((n) => n.id === edge.to);
          if (fromNode && toNode) {
            ctx.strokeStyle = edge.label.includes('Narrow') ? '#ef4444' : '#06b6d4';
            ctx.lineWidth = edge.cap < 20 ? 3 : 5;
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.stroke();

            // Edge Capacity Tag
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(midX - 35, midY - 9, 70, 18);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1;
            ctx.strokeRect(midX - 35, midY - 9, 70, 18);
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(edge.label, midX, midY + 3);
          }
        }

        // Nodes
        for (const node of graphNodes) {
          ctx.fillStyle = node.type === 'stair' ? '#10b981' : node.type === 'room' ? '#6366f1' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(node.name, node.x, node.y - 12);
        }
      }

      // 6. FIRE HAZARDS
      const fireTime = Date.now() * 0.005;
      for (const fire of firesRef.current) {
        // Outer warning pulse
        const pulse = Math.sin(fireTime * 4) * 6;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.beginPath();
        ctx.arc(fire.x, fire.y, fire.r + 15 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Inner fire
        ctx.fillStyle = 'rgba(249, 115, 22, 0.65)';
        ctx.beginPath();
        ctx.arc(fire.x, fire.y, fire.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '26px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('🔥', fire.x, fire.y + 8);

        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('HAZARD ZONE', fire.x, fire.y + fire.r + 15);
      }

      // 7. ADVANCE & RENDER PEOPLE DOTS
      let currentQueue = 0;
      let evacuatedThisSecond = 0;

      // Chokepoint zone near Corridor C2 leading to Stair A (around x: 120-190, y: 260-320)
      const chokeCap = corridorCapacity === 'narrow' ? 6 : 25;
      let peopleInChoke = 0;

      for (let i = 0; i < peopleRef.current.length; i++) {
        const p = peopleRef.current[i];
        if (p.isEvacuated) {
          evacuatedThisSecond++;
          continue;
        }

        // Physics update if playing
        if (isPlaying) {
          // Check if person is approaching narrow Corridor C2
          const inWestCorridor = p.x >= 70 && p.x <= 180 && p.y >= 250 && p.y <= 330;
          if (inWestCorridor && p.targetStairId === 'stair_a') {
            peopleInChoke++;
            if (peopleInChoke > chokeCap) {
              p.isQueued = true;
              currentQueue++;
            } else {
              p.isQueued = false;
            }
          } else {
            p.isQueued = false;
          }

          // Move toward current waypoint
          if (p.waypointIndex < p.waypoints.length) {
            const target = p.waypoints[p.waypointIndex];
            const dx = target.x - p.x;
            const dy = target.y - p.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 12) {
              p.waypointIndex++;
            } else {
              // Normalized velocity
              const nx = dx / dist;
              const ny = dy / dist;
              const speedLimit = p.isQueued ? 0.3 : 1.0;
              const effectiveSpeed = p.speed * 60 * walkingSpeed * speedLimit * 0.016;

              p.x += nx * effectiveSpeed;
              p.y += ny * effectiveSpeed;
            }
          } else {
            // Reached target staircase: evacuate!
            const st = stairs.find((s) => s.id === p.targetStairId);
            if (st) {
              const dx = st.exitX - p.x;
              const dy = st.exitY - p.y;
              if (Math.hypot(dx, dy) < 20) {
                p.isEvacuated = true;
                evacuatedThisSecond++;
              } else {
                p.x += (dx / Math.hypot(dx, dy)) * p.speed * 50 * 0.016;
                p.y += (dy / Math.hypot(dx, dy)) * p.speed * 50 * 0.016;
              }
            }
          }
        }

        // Draw Person Dot
        ctx.fillStyle = p.isQueued ? '#f59e0b' : p.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Update parent status
      let statusText = 'Normal Flow';
      if (currentQueue > 15) {
        statusText = '⚠️ Corridor C2 Jammed (High Queue)';
      } else if (firesRef.current.length > 0) {
        statusText = '🔥 Fire Hazard Rerouting Active';
      } else if (evacuatedThisSecond === peopleRef.current.length) {
        statusText = '✓ Evacuation Completed';
      }

      statsRef.current = {
        evacuated: evacuatedThisSecond,
        total: peopleRef.current.length,
        queue: currentQueue,
        status: statusText,
      };

      onUpdateStats(
        statsRef.current.evacuated,
        statsRef.current.total,
        statsRef.current.queue,
        statsRef.current.status
      );

      // Bottleneck warning floating over Corridor C2 if queued
      if (currentQueue > 5) {
        ctx.fillStyle = '#881337';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(100, 260, 115, 26, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`⚠️ C2 Queue: ${currentQueue} ppl`, 157, 277);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, walkingSpeed, corridorCapacity, strategy, showGraph]);

  return (
    <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center">
      {/* Top Floor Plan Subheader */}
      <div className="w-full bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="font-bold text-slate-100">
            MAIT CSE Department Building Plan (Floor 2)
          </span>
          <span className="text-slate-400 hidden sm:inline">&mdash; Classrooms, Labs, Stairs &amp; Lift</span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Free Flow
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Queued Door
          </span>
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" /> Click hallway to place <strong>🔥 Fire</strong>
          </span>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="w-full p-2 flex justify-center items-center overflow-x-auto">
        <canvas
          ref={canvasRef}
          width={960}
          height={560}
          onClick={handleCanvasClick}
          className="w-full max-w-[960px] h-auto cursor-crosshair rounded-xl border border-slate-800"
          style={{ imageRendering: 'auto' }}
        />
      </div>
    </div>
  );
};

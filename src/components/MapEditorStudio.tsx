'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  GeometricBuildingSimulator,
  GeometricRoom,
  GeometricCorridor,
  GeometricExit,
  GeometricWall,
  GeometricVoid,
  GeometricStair,
  GeometricLift,
  BuildingMapConfig,
  SavedBlueprint,
  getSavedBlueprints,
  saveBlueprintToStorage,
  deleteBlueprintFromStorage,
} from '@/lib/geometricModel';
import {
  Play,
  RotateCcw,
  Plus,
  Trash2,
  Move,
  Square,
  DoorOpen,
  Sliders,
  Check,
  Grid,
  Building,
  Layers,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Shield,
  HelpCircle,
  X,
  ZoomIn,
  ZoomOut,
  Hand,
  Copy,
  Maximize2,
  Minimize2,
  Expand,
  RefreshCw,
  Users,
  Save,
  FolderOpen,
  Download,
  Upload,
  List,
  Compass,
} from 'lucide-react';

// Real Metric Architectural Scale: 1m = 20px (Canvas: 57.5m x 32.0m)
const PIXELS_PER_METER = 20;
export const pxToM = (px: number) => Math.round((px / PIXELS_PER_METER) * 10) / 10;
export const mToPx = (m: number) => Math.round(m * PIXELS_PER_METER);

interface MapEditorStudioProps {
  simulator: GeometricBuildingSimulator;
  onSimulateCustomMap: (config: BuildingMapConfig) => void;
  onClose: () => void;
}

type EditorTool =
  | 'select'
  | 'pan'
  | 'room'
  | 'corridor'
  | 'wall'
  | 'wall_h'
  | 'wall_v'
  | 'wall_draw'
  | 'void'
  | 'exit'
  | 'stairs'
  | 'lift'
  | 'delete';

export function MapEditorStudio({
  simulator,
  onSimulateCustomMap,
  onClose,
}: MapEditorStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [rooms, setRooms] = useState<GeometricRoom[]>(() => JSON.parse(JSON.stringify(simulator.rooms || [])));
  const [corridors, setCorridors] = useState<GeometricCorridor[]>(() => JSON.parse(JSON.stringify(simulator.corridors || [])));
  const [exits, setExits] = useState<GeometricExit[]>(() => JSON.parse(JSON.stringify(simulator.exits || [])));
  const [walls, setWalls] = useState<GeometricWall[]>(() => JSON.parse(JSON.stringify(simulator.walls || [])));
  const [voids, setVoids] = useState<GeometricVoid[]>(() => JSON.parse(JSON.stringify(simulator.voids || [])));
  const [stairs, setStairs] = useState<GeometricStair[]>(() => JSON.parse(JSON.stringify(simulator.stairs || [])));
  const [lifts, setLifts] = useState<GeometricLift[]>(() => JSON.parse(JSON.stringify(simulator.lifts || [])));

  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'room' | 'corridor' | 'exit' | 'wall' | 'void' | 'stairs' | 'lift' | null>(null);
  const [snapMode, setSnapMode] = useState<'0.5m' | '1.0m' | 'off'>('0.5m');

  // Fullscreen & Wall Drawing State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wallDrawStart, setWallDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [wallDrawCurrent, setWallDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [defaultWallThickness, setDefaultWallThickness] = useState<number>(3); // 3px = 0.15m standard interior wall
  const [leftNavTab, setLeftNavTab] = useState<'tools' | 'hierarchy'>('tools');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Permanent Blueprint Save & Library Modals
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [saveTitleInput, setSaveTitleInput] = useState<string>(() => simulator.activeMapTitle || 'Custom Architectural Blueprint');
  const [savedBlueprintsList, setSavedBlueprintsList] = useState<SavedBlueprint[]>([]);

  useEffect(() => {
    setSavedBlueprintsList(getSavedBlueprints());
  }, [isLibraryModalOpen, isSaveModalOpen]);

  // Zoom & Pan State
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Element Drag & Resize State
  const [dragState, setDragState] = useState<{
    id: string;
    type: 'room' | 'corridor' | 'exit' | 'wall' | 'void' | 'stairs' | 'lift';
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const [hoverResizeMode, setHoverResizeMode] = useState(false);
  const [hoverMoveMode, setHoverMoveMode] = useState(false);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const snap = useCallback(
    (val: number) => {
      if (snapMode === 'off') return Math.round(val);
      const step = snapMode === '0.5m' ? 10 : 20; // 10px = 0.5m, 20px = 1.0m
      return Math.round(val / step) * step;
    },
    [snapMode]
  );

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
          (navigator as any).keyboard.lock(['Escape']).catch(() => {});
        }
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        if ('keyboard' in navigator && (navigator as any).keyboard?.unlock) {
          (navigator as any).keyboard.unlock();
        }
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFs = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (isFs && 'keyboard' in navigator && (navigator as any).keyboard?.lock) {
        (navigator as any).keyboard.lock(['Escape']).catch(() => {});
      }
    };
    document.addEventListener('fullscreenchange', handleFs);
    return () => {
      document.removeEventListener('fullscreenchange', handleFs);
      if ('keyboard' in navigator && (navigator as any).keyboard?.unlock) {
        (navigator as any).keyboard.unlock();
      }
    };
  }, []);

  // Listen for Spacebar (pan mode) and Escape key (unselect element without exiting fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        setIsSpacePressed(true);
      }
      if (e.code === 'Escape' || e.key === 'Escape') {
        if (selectedId) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedId(null);
          setSelectedType(null);
          setDragState(null);
          setHoverResizeMode(false);
          setHoverMoveMode(false);
          notify('Item unselected');
        } else if (wallDrawStart) {
          e.preventDefault();
          e.stopPropagation();
          setWallDrawStart(null);
          setWallDrawCurrent(null);
        }
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
  }, [selectedId, wallDrawStart]);

  // Native wheel event listener for CAD Zoom centered on mouse
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.15 : 0.87;

      setZoom((curZoom) => {
        const nextZoom = Math.min(3.5, Math.max(0.25, curZoom * factor));
        setPan((curPan) => ({
          x: screenX - (screenX - curPan.x) * (nextZoom / curZoom),
          y: screenY - (screenY - curPan.y) * (nextZoom / curZoom),
        }));
        return nextZoom;
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Coordinate Conversion taking Zoom & Pan into account across infinite space
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      return {
        x: (screenX - pan.x) / zoom,
        y: (screenY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Check for Pan mode
    if (e.button === 1 || isSpacePressed || activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const { x, y } = getCanvasCoords(e);
    const snX = snap(x);
    const snY = snap(y);

    if (activeTool === 'room') {
      const newRoomId = `room_custom_${Date.now()}`;
      const newRoom: GeometricRoom = {
        id: newRoomId,
        name: `Custom Room ${rooms.length + 1}`,
        label: `ROOM ${rooms.length + 1}`,
        x: snX,
        y: snY,
        w: 200,
        h: 140,
        doorPoint: { x: snX + 100, y: snY + 140 },
        doorLabel: `DOOR ${rooms.length + 1}`,
        peopleCount: 0, // Requirement 3: Configured exclusively in simulation mode
        floor: 1,
      };
      setRooms((prev) => [...prev, newRoom]);
      setSelectedId(newRoomId);
      setSelectedType('room');
      setActiveTool('select');
      notify(`Added ${newRoom.label} (${pxToM(newRoom.w)}m × ${pxToM(newRoom.h)}m)`);
      return;
    }

    if (activeTool === 'corridor') {
      const newCorrId = `corr_custom_${Date.now()}`;
      const newCorr: GeometricCorridor = {
        id: newCorrId,
        name: `Hallway ${corridors.length + 1}`,
        label: `HALLWAY ${corridors.length + 1}`,
        x: snX,
        y: snY,
        w: 240,
        h: 70,
        widthMeters: 3.5,
        lengthMeters: 12,
        capacity: 50,
        maxFlowRate: 4.5,
        isBlocked: false,
        hasFire: false,
        currentOccupants: 0,
        currentQueue: 0,
        peakQueue: 0,
        floor: 1,
      };
      setCorridors((prev) => [...prev, newCorr]);
      setSelectedId(newCorrId);
      setSelectedType('corridor');
      setActiveTool('select');
      notify(`Added ${newCorr.label} (${pxToM(newCorr.w)}m × ${pxToM(newCorr.h)}m)`);
      return;
    }

    if (activeTool === 'void') {
      const newVoidId = `void_custom_${Date.now()}`;
      const newVoid: GeometricVoid = {
        id: newVoidId,
        name: `Void Area ${voids.length + 1}`,
        label: 'EMPTY VOID',
        x: snX,
        y: snY,
        w: 300,
        h: 180,
      };
      setVoids((prev) => [...prev, newVoid]);
      setSelectedId(newVoidId);
      setSelectedType('void');
      setActiveTool('select');
      notify(`Added Empty Space Void (${pxToM(newVoid.w)}m × ${pxToM(newVoid.h)}m)`);
      return;
    }

    if (activeTool === 'wall_h') {
      const newWallId = `wall_custom_${Date.now()}`;
      const newWall: GeometricWall = {
        id: newWallId,
        x: snX,
        y: snY,
        w: 160,
        h: defaultWallThickness,
        label: 'WALL',
      };
      setWalls((prev) => [...prev, newWall]);
      setSelectedId(newWallId);
      setSelectedType('wall');
      setActiveTool('select');
      notify(`Added Horizontal Wall (${pxToM(newWall.w)}m × ${pxToM(newWall.h)}m)`);
      return;
    }

    if (activeTool === 'wall_v') {
      const newWallId = `wall_custom_${Date.now()}`;
      const newWall: GeometricWall = {
        id: newWallId,
        x: snX,
        y: snY,
        w: defaultWallThickness,
        h: 160,
        label: 'WALL',
      };
      setWalls((prev) => [...prev, newWall]);
      setSelectedId(newWallId);
      setSelectedType('wall');
      setActiveTool('select');
      notify(`Added Vertical Wall (${pxToM(newWall.w)}m × ${pxToM(newWall.h)}m)`);
      return;
    }

    if (activeTool === 'wall' || activeTool === 'wall_draw') {
      setWallDrawStart({ x: snX, y: snY });
      setWallDrawCurrent({ x: snX, y: snY });
      return;
    }

    if (activeTool === 'stairs') {
      const newStairId = `stair_custom_${Date.now()}`;
      const newStair: GeometricStair = {
        id: newStairId,
        name: `Emergency Stairs ${stairs.length + 1}`,
        label: `STAIRS ${stairs.length + 1}`,
        x: snX,
        y: snY,
        w: 70,
        h: 50,
        stairPoint: { x: snX + 35, y: snY + 25 },
        isBlocked: false,
        evacuatedCount: 0,
        stairSpeedFactor: 0.65,
        maxCapacityLimit: 40,
      };
      setStairs((prev) => [...prev, newStair]);
      setSelectedId(newStairId);
      setSelectedType('stairs');
      setActiveTool('select');
      notify(`Added Emergency Fire Stairs`);
      return;
    }

    if (activeTool === 'lift') {
      const newLiftId = `lift_custom_${Date.now()}`;
      const newLift: GeometricLift = {
        id: newLiftId,
        name: `Elevator Shaft ${lifts.length + 1}`,
        label: 'EVAC LIFT',
        x: snX,
        y: snY,
        w: 70,
        h: 50,
        liftPoint: { x: snX + 35, y: snY + 25 },
        isOutOfService: false,
        evacuatedCount: 0,
        maxCapacityLimit: 25,
      };
      setLifts((prev) => [...prev, newLift]);
      setSelectedId(newLiftId);
      setSelectedType('lift');
      setActiveTool('select');
      notify(`Added Evacuation Elevator`);
      return;
    }

    if (activeTool === 'exit') {
      const newExitId = `exit_custom_${Date.now()}`;
      const newExit: GeometricExit = {
        id: newExitId,
        name: `Exit Portal ${exits.length + 1}`,
        label: `EXIT ${exits.length + 1}`,
        x: snX,
        y: snY,
        w: 75,
        h: 40,
        exitPoint: { x: snX + 37, y: snY + 20 },
        isBlocked: false,
        evacuatedCount: 0,
        floor: 1,
        doorWidthMeters: 2.2,
        maxDischargeRate: 2.8,
        maxCapacityLimit: 50,
      };
      setExits((prev) => [...prev, newExit]);
      setSelectedId(newExitId);
      setSelectedType('exit');
      setActiveTool('select');
      notify(`Added ${newExit.label}`);
      return;
    }

    if (activeTool === 'delete') {
      const rIdx = rooms.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
      if (rIdx >= 0) {
        setRooms((prev) => prev.filter((_, idx) => idx !== rIdx));
        notify('Deleted Room');
        return;
      }
      const cIdx = corridors.findIndex((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
      if (cIdx >= 0) {
        setCorridors((prev) => prev.filter((_, idx) => idx !== cIdx));
        notify('Deleted Corridor');
        return;
      }
      const vIdx = voids.findIndex((v) => x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h);
      if (vIdx >= 0) {
        setVoids((prev) => prev.filter((_, idx) => idx !== vIdx));
        notify('Deleted Void');
        return;
      }
      const eIdx = exits.findIndex((ex) => x >= ex.x && x <= ex.x + ex.w && y >= ex.y && y <= ex.y + ex.h);
      if (eIdx >= 0) {
        setExits((prev) => prev.filter((_, idx) => idx !== eIdx));
        notify('Deleted Exit');
        return;
      }
      const sIdx = stairs.findIndex((st) => x >= st.x && x <= st.x + st.w && y >= st.y && y <= st.y + st.h);
      if (sIdx >= 0) {
        setStairs((prev) => prev.filter((_, idx) => idx !== sIdx));
        notify('Deleted Stairs');
        return;
      }
      const lIdx = lifts.findIndex((lt) => x >= lt.x && x <= lt.x + lt.w && y >= lt.y && y <= lt.y + lt.h);
      if (lIdx >= 0) {
        setLifts((prev) => prev.filter((_, idx) => idx !== lIdx));
        notify('Deleted Lift');
        return;
      }
      const wIdx = walls.findIndex((wl) => x >= wl.x && x <= wl.x + wl.w && y >= wl.y && y <= wl.y + wl.h);
      if (wIdx >= 0) {
        setWalls((prev) => prev.filter((_, idx) => idx !== wIdx));
        notify('Deleted Wall');
        return;
      }
      return;
    }

    if (activeTool === 'select') {
      // Check if clicking resize grip on currently selected element
      if (selectedId && selectedType) {
        let selElem: { x: number; y: number; w: number; h: number } | undefined;
        if (selectedType === 'room') selElem = rooms.find((r) => r.id === selectedId);
        else if (selectedType === 'corridor') selElem = corridors.find((c) => c.id === selectedId);
        else if (selectedType === 'void') selElem = voids.find((v) => v.id === selectedId);
        else if (selectedType === 'wall') selElem = walls.find((w) => w.id === selectedId);
        else if (selectedType === 'exit') selElem = exits.find((ex) => ex.id === selectedId);
        else if (selectedType === 'stairs') selElem = stairs.find((st) => st.id === selectedId);
        else if (selectedType === 'lift') selElem = lifts.find((lt) => lt.id === selectedId);

        if (selElem) {
          const handleX = selElem.x + selElem.w;
          const handleY = selElem.y + selElem.h;
          const handleRadius = Math.max(16, 22 / zoom);
          if (Math.hypot(x - handleX, y - handleY) <= handleRadius) {
            setDragState({
              id: selectedId,
              type: selectedType,
              mode: 'resize',
              startX: x,
              startY: y,
              origX: selElem.x,
              origY: selElem.y,
              origW: selElem.w,
              origH: selElem.h,
            });
            return;
          }

          // If clicking anywhere directly on the currently selected element, start moving it immediately
          const pad = selectedType === 'wall' ? Math.max(0, 8 - Math.min(selElem.w, selElem.h)) : 0;
          if (
            x >= selElem.x - pad &&
            x <= selElem.x + selElem.w + pad &&
            y >= selElem.y - pad &&
            y <= selElem.y + selElem.h + pad
          ) {
            setDragState({
              id: selectedId,
              type: selectedType,
              mode: 'move',
              startX: x,
              startY: y,
              origX: selElem.x,
              origY: selElem.y,
              origW: selElem.w,
              origH: selElem.h,
            });
            return;
          }
        }
      }

      // Multi-element overlap hit collection with area priority (small items like walls/exits have priority)
      interface HitCandidate {
        id: string;
        type: 'room' | 'corridor' | 'exit' | 'wall' | 'void' | 'stairs' | 'lift';
        area: number;
        orig: { x: number; y: number; w: number; h: number };
      }
      const candidates: HitCandidate[] = [];

      for (const ex of exits) {
        if (x >= ex.x && x <= ex.x + ex.w && y >= ex.y && y <= ex.y + ex.h) {
          candidates.push({ id: ex.id, type: 'exit', area: ex.w * ex.h, orig: { x: ex.x, y: ex.y, w: ex.w, h: ex.h } });
        }
      }
      for (const st of stairs) {
        if (x >= st.x && x <= st.x + st.w && y >= st.y && y <= st.y + st.h) {
          candidates.push({ id: st.id, type: 'stairs', area: st.w * st.h, orig: { x: st.x, y: st.y, w: st.w, h: st.h } });
        }
      }
      for (const lt of lifts) {
        if (x >= lt.x && x <= lt.x + lt.w && y >= lt.y && y <= lt.y + lt.h) {
          candidates.push({ id: lt.id, type: 'lift', area: lt.w * lt.h, orig: { x: lt.x, y: lt.y, w: lt.w, h: lt.h } });
        }
      }
      for (const wl of walls) {
        // Generous 6px click padding for thin architectural walls so 2px/3px walls can be selected effortlessly
        const pad = Math.max(0, 7 - Math.min(wl.w, wl.h));
        if (x >= wl.x - pad && x <= wl.x + wl.w + pad && y >= wl.y - pad && y <= wl.y + wl.h + pad) {
          candidates.push({ id: wl.id, type: 'wall', area: wl.w * wl.h, orig: { x: wl.x, y: wl.y, w: wl.w, h: wl.h } });
        }
      }
      for (const r of rooms) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          candidates.push({ id: r.id, type: 'room', area: r.w * r.h, orig: { x: r.x, y: r.y, w: r.w, h: r.h } });
        }
      }
      for (const v of voids) {
        if (x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h) {
          candidates.push({ id: v.id, type: 'void', area: v.w * v.h, orig: { x: v.x, y: v.y, w: v.w, h: v.h } });
        }
      }
      for (const c of corridors) {
        if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
          candidates.push({ id: c.id, type: 'corridor', area: c.w * c.h, orig: { x: c.x, y: c.y, w: c.w, h: c.h } });
        }
      }

      if (candidates.length > 0) {
        // Sort ascending so thin walls, exits, and stairs take precedence over large background corridors
        candidates.sort((a, b) => a.area - b.area);

        // If an element is already selected, cycle to the next overlapping element!
        const curIdx = candidates.findIndex((c) => c.id === selectedId);
        const target = curIdx >= 0 ? candidates[(curIdx + 1) % candidates.length] : candidates[0];

        setSelectedId(target.id);
        setSelectedType(target.type);
        setDragState({
          id: target.id,
          type: target.type,
          mode: 'move',
          startX: x,
          startY: y,
          origX: target.orig.x,
          origY: target.orig.y,
          origW: target.orig.w,
          origH: target.orig.h,
        });
        return;
      }

      // Keep selected item selected for dragging and resizing until Escape is pressed
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (wallDrawStart) {
      const { x, y } = getCanvasCoords(e);
      setWallDrawCurrent({ x: snap(x), y: snap(y) });
      return;
    }

    // Dynamic hover cursor detection for element move and corner resize
    if (!dragState && activeTool === 'select' && selectedId && selectedType) {
      let selElem: { x: number; y: number; w: number; h: number } | undefined;
      if (selectedType === 'room') selElem = rooms.find((r) => r.id === selectedId);
      else if (selectedType === 'corridor') selElem = corridors.find((c) => c.id === selectedId);
      else if (selectedType === 'void') selElem = voids.find((v) => v.id === selectedId);
      else if (selectedType === 'wall') selElem = walls.find((w) => w.id === selectedId);
      else if (selectedType === 'exit') selElem = exits.find((ex) => ex.id === selectedId);
      else if (selectedType === 'stairs') selElem = stairs.find((st) => st.id === selectedId);
      else if (selectedType === 'lift') selElem = lifts.find((lt) => lt.id === selectedId);

      if (selElem) {
        const { x, y } = getCanvasCoords(e);
        const handleX = selElem.x + selElem.w;
        const handleY = selElem.y + selElem.h;
        const handleRadius = Math.max(16, 22 / zoom);
        if (Math.hypot(x - handleX, y - handleY) <= handleRadius) {
          if (!hoverResizeMode) setHoverResizeMode(true);
          if (hoverMoveMode) setHoverMoveMode(false);
        } else if (
          x >= selElem.x &&
          x <= selElem.x + selElem.w &&
          y >= selElem.y &&
          y <= selElem.y + selElem.h
        ) {
          if (hoverResizeMode) setHoverResizeMode(false);
          if (!hoverMoveMode) setHoverMoveMode(true);
        } else {
          if (hoverResizeMode) setHoverResizeMode(false);
          if (hoverMoveMode) setHoverMoveMode(false);
        }
      }
    } else if (!dragState && (hoverResizeMode || hoverMoveMode)) {
      setHoverResizeMode(false);
      setHoverMoveMode(false);
    }

    if (!dragState) return;
    const { x, y } = getCanvasCoords(e);
    const dx = x - dragState.startX;
    const dy = y - dragState.startY;

    if (dragState.mode === 'move') {
      const newX = snap(dragState.origX + dx);
      const newY = snap(dragState.origY + dy);

      if (dragState.type === 'room') {
        setRooms((prev) =>
          prev.map((r) => {
            if (r.id === dragState.id) {
              const shiftX = newX - r.x;
              const shiftY = newY - r.y;
              return {
                ...r,
                x: newX,
                y: newY,
                doorPoint: { x: r.doorPoint.x + shiftX, y: r.doorPoint.y + shiftY },
              };
            }
            return r;
          })
        );
      } else if (dragState.type === 'corridor') {
        setCorridors((prev) => prev.map((c) => (c.id === dragState.id ? { ...c, x: newX, y: newY } : c)));
      } else if (dragState.type === 'void') {
        setVoids((prev) => prev.map((v) => (v.id === dragState.id ? { ...v, x: newX, y: newY } : v)));
      } else if (dragState.type === 'wall') {
        setWalls((prev) => prev.map((w) => (w.id === dragState.id ? { ...w, x: newX, y: newY } : w)));
      } else if (dragState.type === 'stairs') {
        setStairs((prev) =>
          prev.map((s) => (s.id === dragState.id ? { ...s, x: newX, y: newY, stairPoint: { x: newX + s.w / 2, y: newY + s.h / 2 } } : s))
        );
      } else if (dragState.type === 'lift') {
        setLifts((prev) =>
          prev.map((l) => (l.id === dragState.id ? { ...l, x: newX, y: newY, liftPoint: { x: newX + l.w / 2, y: newY + l.h / 2 } } : l))
        );
      } else if (dragState.type === 'exit') {
        setExits((prev) =>
          prev.map((ex) => (ex.id === dragState.id ? { ...ex, x: newX, y: newY, exitPoint: { x: newX + ex.w / 2, y: newY + ex.h / 2 } } : ex))
        );
      }
    } else if (dragState.mode === 'resize') {
      if (dragState.type === 'wall') {
        const isHorizontal = dragState.origW >= dragState.origH;
        if (isHorizontal) {
          const newW = Math.max(10, snap(dragState.origW + dx));
          setWalls((prev) => prev.map((w) => (w.id === dragState.id ? { ...w, w: newW } : w)));
        } else {
          const newH = Math.max(10, snap(dragState.origH + dy));
          setWalls((prev) => prev.map((w) => (w.id === dragState.id ? { ...w, h: newH } : w)));
        }
      } else {
        const newW = Math.max(20, snap(dragState.origW + dx));
        const newH = Math.max(20, snap(dragState.origH + dy));

        if (dragState.type === 'room') {
          setRooms((prev) =>
            prev.map((r) => {
              if (r.id !== dragState.id) return r;
              const side = r.doorSide || 'south';
              let dp = { x: r.x + newW / 2, y: r.y + newH };
              if (side === 'north') dp = { x: r.x + newW / 2, y: r.y };
              else if (side === 'west') dp = { x: r.x, y: r.y + newH / 2 };
              else if (side === 'east') dp = { x: r.x + newW, y: r.y + newH / 2 };
              return { ...r, w: newW, h: newH, doorPoint: dp };
            })
          );
        } else if (dragState.type === 'corridor') {
          setCorridors((prev) =>
            prev.map((c) =>
              c.id === dragState.id
                ? {
                    ...c,
                    w: newW,
                    h: newH,
                    capacity: Math.max(5, Math.round((newW * newH) / 450)),
                  }
                : c
            )
          );
        } else if (dragState.type === 'void') {
          setVoids((prev) => prev.map((v) => (v.id === dragState.id ? { ...v, w: newW, h: newH } : v)));
        } else if (dragState.type === 'stairs') {
          setStairs((prev) =>
            prev.map((s) => (s.id === dragState.id ? { ...s, w: newW, h: newH, stairPoint: { x: s.x + newW / 2, y: s.y + newH / 2 } } : s))
          );
        } else if (dragState.type === 'lift') {
          setLifts((prev) =>
            prev.map((l) => (l.id === dragState.id ? { ...l, w: newW, h: newH, liftPoint: { x: l.x + newW / 2, y: l.y + newH / 2 } } : l))
          );
        } else if (dragState.type === 'exit') {
          setExits((prev) =>
            prev.map((ex) => (ex.id === dragState.id ? { ...ex, w: newW, h: newH, exitPoint: { x: ex.x + newW / 2, y: ex.y + newH / 2 } } : ex))
          );
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (wallDrawStart && wallDrawCurrent) {
      const startX = wallDrawStart.x;
      const startY = wallDrawStart.y;
      const endX = wallDrawCurrent.x;
      const endY = wallDrawCurrent.y;
      const dist = Math.hypot(endX - startX, endY - startY);

      const newWallId = `wall_custom_${Date.now()}`;
      let newWall: GeometricWall;

      if (dist >= 20) {
        const dx = endX - startX;
        const dy = endY - startY;
        const isHorizontal = Math.abs(dx) >= Math.abs(dy);

        if (isHorizontal) {
          const minX = Math.min(startX, endX);
          const width = Math.max(30, Math.abs(dx));
          newWall = {
            id: newWallId,
            x: minX,
            y: startY - Math.floor(defaultWallThickness / 2),
            w: width,
            h: defaultWallThickness,
            label: 'WALL',
          };
        } else {
          const minY = Math.min(startY, endY);
          const height = Math.max(30, Math.abs(dy));
          newWall = {
            id: newWallId,
            x: startX - Math.floor(defaultWallThickness / 2),
            y: minY,
            w: defaultWallThickness,
            h: height,
            label: 'WALL',
          };
        }
      } else {
        newWall = {
          id: newWallId,
          x: startX,
          y: startY,
          w: 160,
          h: defaultWallThickness,
          label: 'WALL',
        };
      }

      setWalls((prev) => [...prev, newWall]);
      setSelectedId(newWallId);
      setSelectedType('wall');
      setWallDrawStart(null);
      setWallDrawCurrent(null);
      setActiveTool('select');
      notify(`Constructed Wall (${pxToM(newWall.w)}m × ${pxToM(newWall.h)}m)`);
      return;
    }

    setDragState(null);
    setIsPanning(false);
  };

  // Requirement 5: Permanent Blueprint Persistence (Save, Load, Delete)
  const handleSaveBlueprint = () => {
    const title = saveTitleInput.trim() || `Floorplan ${savedBlueprintsList.length + 1}`;
    const newConfig: BuildingMapConfig = {
      id: `custom_${Date.now()}`,
      title,
      subtitle: `Engineered Floorplan • ${rooms.length} Rooms, ${corridors.length} Corridors, ${exits.length} Exits`,
      rooms,
      corridors,
      exits,
      walls,
      voids,
      stairs,
      lifts,
    };
    saveBlueprintToStorage(title, newConfig);
    setSavedBlueprintsList(getSavedBlueprints());
    setIsSaveModalOpen(false);
    notify(`Saved "${title}" permanently!`);
  };

  const handleLoadSavedBlueprint = (bp: SavedBlueprint) => {
    setRooms(JSON.parse(JSON.stringify(bp.config.rooms || [])));
    setCorridors(JSON.parse(JSON.stringify(bp.config.corridors || [])));
    setExits(JSON.parse(JSON.stringify(bp.config.exits || [])));
    setWalls(JSON.parse(JSON.stringify(bp.config.walls || [])));
    setVoids(JSON.parse(JSON.stringify(bp.config.voids || [])));
    setStairs(JSON.parse(JSON.stringify(bp.config.stairs || [])));
    setLifts(JSON.parse(JSON.stringify(bp.config.lifts || [])));
    setSelectedId(null);
    setSelectedType(null);
    setSaveTitleInput(bp.title);
    setIsLibraryModalOpen(false);
    notify(`Loaded "${bp.title}" into studio`);
  };

  const handleDeleteBlueprint = (id: string) => {
    const updated = deleteBlueprintFromStorage(id);
    setSavedBlueprintsList(updated);
    notify('Blueprint permanently deleted');
  };

  // Export & Download Floorplan as .evacplan.json
  const handleExportFile = () => {
    const title = saveTitleInput.trim() || `Floorplan_${Date.now()}`;
    const config: BuildingMapConfig = {
      id: `custom_${Date.now()}`,
      title,
      subtitle: `${rooms.length} Rooms, ${corridors.length} Corridors, ${exits.length} Exits`,
      rooms,
      corridors,
      exits,
      walls,
      voids,
      stairs,
      lifts,
    };
    const jsonStr = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.evacplan.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`Exported "${title}.evacplan.json"`);
  };

  // Import Floorplan from JSON File
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data || !Array.isArray(data.rooms) || !Array.isArray(data.corridors) || !Array.isArray(data.exits)) {
          alert('Invalid floorplan file format. Missing rooms, corridors, or exits array.');
          return;
        }
        setRooms(data.rooms || []);
        setCorridors(data.corridors || []);
        setExits(data.exits || []);
        setWalls(data.walls || []);
        setVoids(data.voids || []);
        setStairs(data.stairs || []);
        setLifts(data.lifts || []);
        setSelectedId(null);
        setSelectedType(null);
        const bpTitle = data.title || file.name.replace(/\.[^/.]+$/, '');
        setSaveTitleInput(bpTitle);
        saveBlueprintToStorage(bpTitle, data);
        setSavedBlueprintsList(getSavedBlueprints());
        notify(`Loaded "${bpTitle}" from file!`);
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 4-Direction Room Door Placement
  const handleSetRoomDoorSide = (roomId: string, side: 'north' | 'south' | 'east' | 'west') => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        let dp = { ...r.doorPoint };
        if (side === 'north') dp = { x: r.x + r.w / 2, y: r.y };
        else if (side === 'south') dp = { x: r.x + r.w / 2, y: r.y + r.h };
        else if (side === 'west') dp = { x: r.x, y: r.y + r.h / 2 };
        else if (side === 'east') dp = { x: r.x + r.w, y: r.y + r.h / 2 };
        return { ...r, doorSide: side, doorPoint: dp };
      })
    );
    notify(`Set door on ${side.toUpperCase()} wall`);
  };

  // Load Preset
  const handleLoadPreset = (presetKey: string) => {
    const presets = simulator.getMapPresets();
    const target = presets[presetKey] || presets['atrium_complex'];
    setRooms(JSON.parse(JSON.stringify(target.rooms || [])));
    setCorridors(JSON.parse(JSON.stringify(target.corridors || [])));
    setExits(JSON.parse(JSON.stringify(target.exits || [])));
    setWalls(JSON.parse(JSON.stringify(target.walls || [])));
    setVoids(JSON.parse(JSON.stringify(target.voids || [])));
    setStairs(JSON.parse(JSON.stringify(target.stairs || [])));
    setLifts(JSON.parse(JSON.stringify(target.lifts || [])));
    setSelectedId(null);
    setSelectedType(null);
    setSaveTitleInput(target.title || 'Architectural Floorplan');
    notify(`Loaded ${target.title}`);
  };

  const handleClearAll = () => {
    setRooms([]);
    setCorridors([]);
    setExits([]);
    setWalls([]);
    setVoids([]);
    setStairs([]);
    setLifts([]);
    setSelectedId(null);
    setSelectedType(null);
    notify('Cleared floor plan');
  };

  // Duplicate Selected Element
  const handleDuplicateSelected = () => {
    if (!selectedId || !selectedType) return;
    const offset = 30;

    if (selectedType === 'room') {
      const item = rooms.find((r) => r.id === selectedId);
      if (!item) return;
      const copy: GeometricRoom = {
        ...item,
        id: `room_${Date.now()}`,
        label: `${item.label} (COPY)`,
        x: item.x + offset,
        y: item.y + offset,
        doorPoint: { x: item.doorPoint.x + offset, y: item.doorPoint.y + offset },
      };
      setRooms((prev) => [...prev, copy]);
      setSelectedId(copy.id);
      notify('Duplicated Room');
    } else if (selectedType === 'corridor') {
      const item = corridors.find((c) => c.id === selectedId);
      if (!item) return;
      const copy: GeometricCorridor = {
        ...item,
        id: `corr_${Date.now()}`,
        label: `${item.label} (COPY)`,
        x: item.x + offset,
        y: item.y + offset,
      };
      setCorridors((prev) => [...prev, copy]);
      setSelectedId(copy.id);
      notify('Duplicated Corridor');
    } else if (selectedType === 'void') {
      const item = voids.find((v) => v.id === selectedId);
      if (!item) return;
      const copy: GeometricVoid = { ...item, id: `void_${Date.now()}`, x: item.x + offset, y: item.y + offset };
      setVoids((prev) => [...prev, copy]);
      setSelectedId(copy.id);
      notify('Duplicated Void');
    } else if (selectedType === 'wall') {
      const item = walls.find((w) => w.id === selectedId);
      if (!item) return;
      const copy: GeometricWall = { ...item, id: `wall_${Date.now()}`, x: item.x + offset, y: item.y + offset };
      setWalls((prev) => [...prev, copy]);
      setSelectedId(copy.id);
      notify('Duplicated Wall');
    } else if (selectedType === 'exit') {
      const item = exits.find((e) => e.id === selectedId);
      if (!item) return;
      const copy: GeometricExit = {
        ...item,
        id: `exit_${Date.now()}`,
        label: `${item.label} (2)`,
        x: item.x + offset,
        y: item.y + offset,
        exitPoint: { x: item.exitPoint.x + offset, y: item.exitPoint.y + offset },
      };
      setExits((prev) => [...prev, copy]);
      setSelectedId(copy.id);
      notify('Duplicated Exit');
    }
  };

  // Delete Selected Element
  const handleDeleteSelected = () => {
    if (!selectedId || !selectedType) return;
    if (selectedType === 'room') setRooms((prev) => prev.filter((r) => r.id !== selectedId));
    else if (selectedType === 'corridor') setCorridors((prev) => prev.filter((c) => c.id !== selectedId));
    else if (selectedType === 'void') setVoids((prev) => prev.filter((v) => v.id !== selectedId));
    else if (selectedType === 'wall') setWalls((prev) => prev.filter((w) => w.id !== selectedId));
    else if (selectedType === 'exit') setExits((prev) => prev.filter((e) => e.id !== selectedId));
    else if (selectedType === 'stairs') setStairs((prev) => prev.filter((s) => s.id !== selectedId));
    else if (selectedType === 'lift') setLifts((prev) => prev.filter((l) => l.id !== selectedId));

    setSelectedId(null);
    setSelectedType(null);
    notify('Deleted element');
  };

  // Compile and simulate floor plan
  const handleSimulate = () => {
    if (exits.length === 0 && stairs.length === 0) {
      alert('Floor plan requires at least one Exit Portal or Staircase to simulate evacuation.');
      return;
    }
    const finalTitle = saveTitleInput.trim() || 'Custom Architectural Blueprint';
    const config: BuildingMapConfig = {
      id: `custom_${Date.now()}`,
      title: finalTitle,
      subtitle: `${rooms.length} Rooms, ${corridors.length} Hallways, ${exits.length} Exits`,
      rooms,
      corridors,
      exits,
      walls,
      voids,
      stairs,
      lifts,
    };
    onSimulateCustomMap(config);
  };

  // CAD 2D Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-DPI Display Canvas Scaling for Responsive Fullscreen CAD Studio
    const dpr = Math.min(2.5, typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, Math.round(rect.width));
    const height = Math.max(200, Math.round(rect.height));
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Deep Slate CAD Studio Workspace Canvas Background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, width, height);

    // Apply Zoom & Pan Transformation Matrix
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Dynamic Infinite CAD World Coordinate Bounds Visible in Viewport
    const worldLeft = -pan.x / zoom;
    const worldTop = -pan.y / zoom;
    const worldRight = (width - pan.x) / zoom;
    const worldBottom = (height - pan.y) / zoom;

    // Fine 1.0m (20px) Metric CAD Grid Lines (rendered smoothly across infinite space)
    const startX1m = Math.floor(worldLeft / 20) * 20;
    const endX1m = Math.ceil(worldRight / 20) * 20;
    const startY1m = Math.floor(worldTop / 20) * 20;
    const endY1m = Math.ceil(worldBottom / 20) * 20;

    if (zoom >= 0.4) {
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = startX1m; x <= endX1m; x += 20) {
        ctx.moveTo(x, worldTop);
        ctx.lineTo(x, worldBottom);
      }
      for (let y = startY1m; y <= endY1m; y += 20) {
        ctx.moveTo(worldLeft, y);
        ctx.lineTo(worldRight, y);
      }
      ctx.stroke();
    }

    // Major 5.0m (100px) Structural Metric Grid Lines & Scale Markers
    const startX5m = Math.floor(worldLeft / 100) * 100;
    const endX5m = Math.ceil(worldRight / 100) * 100;
    const startY5m = Math.floor(worldTop / 100) * 100;
    const endY5m = Math.ceil(worldBottom / 100) * 100;

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let x = startX5m; x <= endX5m; x += 100) {
      ctx.moveTo(x, worldTop);
      ctx.lineTo(x, worldBottom);
    }
    for (let y = startY5m; y <= endY5m; y += 100) {
      ctx.moveTo(worldLeft, y);
      ctx.lineTo(worldRight, y);
    }
    ctx.stroke();

    // Metric Coordinate Scale Annotations
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px monospace';
    for (let x = startX5m; x <= endX5m; x += 100) {
      ctx.fillText(`${x / 20}m`, x + 3, Math.max(worldTop + 14, 14));
    }
    for (let y = startY5m; y <= endY5m; y += 100) {
      ctx.fillText(`${y / 20}m`, Math.max(worldLeft + 3, 3), y - 3);
    }

    // Primary Site Envelope Reference Boundary (0m, 0m → 60m, 35m)
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(0, 0, 1200, 700);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.fillText('PRIMARY SITE ENVELOPE (0m → 60m) • EXPAND FREELY ACROSS INFINITE CANVAS', 8, -8);
    ctx.restore();

    // Helper: Draw High-Visibility Smooth Circular Resize Corner Grip
    const drawResizeHandle = (elemX: number, elemY: number, elemW: number, elemH: number) => {
      const hx = elemX + elemW;
      const hy = elemY + elemH;
      const radius = Math.max(6, 7 / Math.min(zoom, 1.2));

      ctx.save();
      // Outer drop glow
      ctx.fillStyle = 'rgba(2, 132, 199, 0.45)';
      ctx.beginPath();
      ctx.arc(hx, hy, radius + 3, 0, Math.PI * 2);
      ctx.fill();

      // Main handle ring
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center white dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx, hy, Math.max(1.8, radius / 3), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // 1. Corridors
    for (const c of corridors) {
      const isSel = selectedId === c.id;
      ctx.fillStyle = isSel ? 'rgba(30, 58, 138, 0.5)' : 'rgba(15, 23, 42, 0.65)';
      ctx.fillRect(c.x, c.y, c.w, c.h);

      ctx.strokeStyle = isSel ? '#38bdf8' : '#334155';
      ctx.lineWidth = isSel ? 2.5 : 1;
      ctx.strokeRect(c.x, c.y, c.w, c.h);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2);

      if (isSel) drawResizeHandle(c.x, c.y, c.w, c.h);
    }

    // 2. Rooms
    for (const r of rooms) {
      const isSel = selectedId === r.id;
      ctx.fillStyle = isSel ? 'rgba(30, 58, 138, 0.4)' : 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(r.x, r.y, r.w, r.h);

      ctx.strokeStyle = isSel ? '#38bdf8' : '#475569';
      ctx.lineWidth = isSel ? 3 : 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label, r.x + r.w / 2, r.y + r.h / 2 - 2);

      // Doorway
      ctx.save();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;

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
        ctx.arc(r.doorPoint.x, r.doorPoint.y, 14, 0, Math.PI * 0.5);
      }
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 8px Inter, sans-serif';
      const labelY = isNorth ? r.doorPoint.y + 12 : r.doorPoint.y - 4;
      ctx.fillText(r.doorLabel, r.doorPoint.x, labelY);
      ctx.restore();

      if (isSel) drawResizeHandle(r.x, r.y, r.w, r.h);
    }

    // 3. Voids
    for (const v of voids) {
      const isSel = selectedId === v.id;
      ctx.fillStyle = '#060a12';
      ctx.fillRect(v.x, v.y, v.w, v.h);

      ctx.strokeStyle = isSel ? '#38bdf8' : '#475569';
      ctx.lineWidth = isSel ? 3 : 2;
      ctx.strokeRect(v.x, v.y, v.w, v.h);

      ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(v.x + v.w, v.y + v.h);
      ctx.moveTo(v.x + v.w, v.y);
      ctx.lineTo(v.x, v.y + v.h);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(v.label || 'EMPTY VOID', v.x + v.w / 2, v.y + v.h / 2);

      if (isSel) drawResizeHandle(v.x, v.y, v.w, v.h);
    }

    // 4. Walls
    for (const w of walls) {
      const isSel = selectedId === w.id;
      ctx.fillStyle = '#334155';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = isSel ? '#38bdf8' : '#64748b';
      ctx.lineWidth = isSel ? 1.5 : 1;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
      if (isSel) drawResizeHandle(w.x, w.y, w.w, w.h);
    }

    // 5. Stairs
    for (const st of stairs) {
      const isSel = selectedId === st.id;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = isSel ? '#38bdf8' : '#0284c7';
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.fillRect(st.x, st.y, st.w, st.h);
      ctx.strokeRect(st.x, st.y, st.w, st.h);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.label, st.x + st.w / 2, st.y + st.h / 2 + 3);

      if (isSel) drawResizeHandle(st.x, st.y, st.w, st.h);
    }

    // 6. Lifts
    for (const lt of lifts) {
      const isSel = selectedId === lt.id;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = isSel ? '#38bdf8' : '#f59e0b';
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.fillRect(lt.x, lt.y, lt.w, lt.h);
      ctx.strokeRect(lt.x, lt.y, lt.w, lt.h);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 7px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lt.label || 'LIFT', lt.x + lt.w / 2, lt.y + lt.h / 2 + 3);

      if (isSel) drawResizeHandle(lt.x, lt.y, lt.w, lt.h);
    }

    // 7. Exits
    for (const ex of exits) {
      const isSel = selectedId === ex.id;
      ctx.fillStyle = '#166534';
      ctx.strokeStyle = isSel ? '#38bdf8' : '#22c55e';
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
      ctx.strokeRect(ex.x, ex.y, ex.w, ex.h);

      ctx.fillStyle = '#bbf7d0';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ex.label, ex.x + ex.w / 2, ex.y + ex.h / 2 + 3);

      if (isSel) drawResizeHandle(ex.x, ex.y, ex.w, ex.h);
    }

    // 8. Wall Drawing Preview (Rubberband Live Rendering)
    if (wallDrawStart && wallDrawCurrent) {
      const dx = wallDrawCurrent.x - wallDrawStart.x;
      const dy = wallDrawCurrent.y - wallDrawStart.y;
      const dist = Math.hypot(dx, dy);

      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      if (dist >= 20) {
        const isHorizontal = Math.abs(dx) >= Math.abs(dy);
        if (isHorizontal) {
          const minX = Math.min(wallDrawStart.x, wallDrawCurrent.x);
          const width = Math.max(30, Math.abs(dx));
          ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.fillRect(minX, wallDrawStart.y - defaultWallThickness / 2, width, defaultWallThickness);
          ctx.strokeRect(minX, wallDrawStart.y - defaultWallThickness / 2, width, defaultWallThickness);
        } else {
          const minY = Math.min(wallDrawStart.y, wallDrawCurrent.y);
          const height = Math.max(30, Math.abs(dy));
          ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.fillRect(wallDrawStart.x - defaultWallThickness / 2, minY, defaultWallThickness, height);
          ctx.strokeRect(wallDrawStart.x - defaultWallThickness / 2, minY, defaultWallThickness, height);
        }

        // Live Metric Wall HUD Badge
        const lenM = pxToM(isHorizontal ? Math.max(30, Math.abs(dx)) : Math.max(30, Math.abs(dy)));
        const thkM = pxToM(defaultWallThickness);

        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.roundRect(wallDrawCurrent.x + 10, wallDrawCurrent.y - 22, 115, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${lenM}m × ${thkM}m Wall`, wallDrawCurrent.x + 67, wallDrawCurrent.y - 8);
      } else {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.fillRect(wallDrawStart.x, wallDrawStart.y, 160, defaultWallThickness);
        ctx.strokeRect(wallDrawStart.x, wallDrawStart.y, 160, defaultWallThickness);
      }
      ctx.restore();
    }

    ctx.restore();
  }, [rooms, corridors, exits, walls, voids, stairs, lifts, selectedId, zoom, pan, wallDrawStart, wallDrawCurrent, defaultWallThickness]);

  // Find currently selected element for property inspector
  const getSelectedElement = () => {
    if (!selectedId || !selectedType) return null;
    if (selectedType === 'room') return rooms.find((r) => r.id === selectedId);
    if (selectedType === 'corridor') return corridors.find((c) => c.id === selectedId);
    if (selectedType === 'void') return voids.find((v) => v.id === selectedId);
    if (selectedType === 'wall') return walls.find((w) => w.id === selectedId);
    if (selectedType === 'exit') return exits.find((e) => e.id === selectedId);
    if (selectedType === 'stairs') return stairs.find((s) => s.id === selectedId);
    if (selectedType === 'lift') return lifts.find((l) => l.id === selectedId);
    return null;
  };

  const selectedElement = getSelectedElement();

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <Building className="w-5 h-5 text-sky-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white hidden sm:inline">Blueprint:</span>
              <input
                type="text"
                value={saveTitleInput}
                onChange={(e) => setSaveTitleInput(e.target.value)}
                placeholder="Custom Floorplan Title"
                className="text-sm font-bold text-sky-300 bg-slate-950/80 border border-slate-700/80 hover:border-sky-500 focus:border-sky-400 rounded-lg px-2.5 py-0.5 focus:outline-none transition-colors w-64"
                title="Edit blueprint name"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
              Draw and resize walls, rooms, hallways, voids, stairs, lifts, and exits with custom capacity quotas
            </p>
          </div>
        </div>

        {/* Action Controls & Demonstration Presets */}
        <div className="flex items-center gap-2">
          {/* Requirement 5: Permanent Save & Library */}
          <button
            onClick={() => {
              setSaveTitleInput(`Floorplan ${savedBlueprintsList.length + 1}`);
              setIsSaveModalOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center gap-1.5 shadow-md shadow-sky-900/30"
            title="Save this blueprint permanently with a custom name"
          >
            <Save className="w-3.5 h-3.5" /> Save Blueprint
          </button>
          <button
            onClick={() => {
              setSavedBlueprintsList(getSavedBlueprints());
              setIsLibraryModalOpen(true);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5"
            title="Open saved custom maps library"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400" /> Saved Maps ({savedBlueprintsList.length})
          </button>

          {/* Requirement 3: File Import & Export */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.evacplan.json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5"
            title="Load and import floorplan from .json file"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" /> Import JSON
          </button>
          <button
            onClick={handleExportFile}
            className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5"
            title="Export and download floorplan as .evacplan.json file"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Export JSON
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1"></div>

          <button
            onClick={() => handleLoadPreset('atrium_complex')}
            className="px-2 py-1.5 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1"
            title="Load Flagship MAIT BLOCK 1 1ST Floor Preset"
          >
            <Layers className="w-3 h-3 text-amber-400" /> MAIT Block 1 Preset
          </button>
          <button
            onClick={() => handleLoadPreset('academic')}
            className="px-2 py-1.5 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1"
            title="Load Academic Wing"
          >
            <Building className="w-3 h-3 text-sky-400" /> Academic Preset
          </button>
          <button
            onClick={handleClearAll}
            className="px-2 py-1.5 text-xs bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-lg flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
          <button
            onClick={handleSimulate}
            className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
          >
            <Play className="w-3.5 h-3.5" /> Simulate Floorplan
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 border border-slate-700 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen CAD Studio'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left CAD Toolbar */}
        <div className="w-56 border-r border-slate-800 bg-slate-900/60 p-2.5 flex flex-col gap-1.5 overflow-y-auto">
          {/* Requirement 2: Left Nav Tab Switcher */}
          <div className="flex bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 mb-1">
            <button
              onClick={() => setLeftNavTab('tools')}
              className={`flex-1 py-1 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                leftNavTab === 'tools'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🛠️ Tools
            </button>
            <button
              onClick={() => setLeftNavTab('hierarchy')}
              className={`flex-1 py-1 rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                leftNavTab === 'hierarchy'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Outliner ({rooms.length + corridors.length + walls.length + exits.length + stairs.length + lifts.length + voids.length})
            </button>
          </div>

          {leftNavTab === 'hierarchy' ? (
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Select Overlapping Elements
              </div>

              {/* Exits */}
              {exits.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-emerald-400 uppercase px-1 mb-0.5">
                    🚪 Exits ({exits.length})
                  </div>
                  <div className="flex flex-col gap-1">
                    {exits.map((ex) => (
                      <div
                        key={ex.id}
                        onClick={() => {
                          setSelectedId(ex.id);
                          setSelectedType('exit');
                        }}
                        className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          selectedId === ex.id
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{ex.label}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{pxToM(ex.w)}m×{pxToM(ex.h)}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stairs */}
              {stairs.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-cyan-400 uppercase px-1 mb-0.5">
                    🪜 Stairs ({stairs.length})
                  </div>
                  <div className="flex flex-col gap-1">
                    {stairs.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedId(st.id);
                          setSelectedType('stairs');
                        }}
                        className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          selectedId === st.id
                            ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-bold shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{st.label}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{pxToM(st.w)}m×{pxToM(st.h)}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lifts */}
              {lifts.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-amber-400 uppercase px-1 mb-0.5">
                    🛗 Lifts ({lifts.length})
                  </div>
                  <div className="flex flex-col gap-1">
                    {lifts.map((lt) => (
                      <div
                        key={lt.id}
                        onClick={() => {
                          setSelectedId(lt.id);
                          setSelectedType('lift');
                        }}
                        className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          selectedId === lt.id
                            ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{lt.label || 'LIFT'}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{pxToM(lt.w)}m×{pxToM(lt.h)}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rooms */}
              {rooms.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-sky-400 uppercase px-1 mb-0.5">
                    🏢 Rooms ({rooms.length})
                  </div>
                  <div className="flex flex-col gap-1">
                    {rooms.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => {
                          setSelectedId(r.id);
                          setSelectedType('room');
                        }}
                        className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          selectedId === r.id
                            ? 'bg-sky-950/80 border-sky-500 text-sky-200 font-bold shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{r.label}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{pxToM(r.w)}m×{pxToM(r.h)}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Corridors */}
              {corridors.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-indigo-400 uppercase px-1 mb-0.5">
                    ↔️ Corridors ({corridors.length})
                  </div>
                  <div className="flex flex-col gap-1">
                    {corridors.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedId(c.id);
                          setSelectedType('corridor');
                        }}
                        className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          selectedId === c.id
                            ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 font-bold shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{c.label}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{pxToM(c.w)}m×{pxToM(c.h)}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Walls */}
              {walls.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase px-1 mb-0.5">
                    🧱 Walls ({walls.length})
                  </div>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {walls.map((w, idx) => (
                      <div
                        key={w.id}
                        onClick={() => {
                          setSelectedId(w.id);
                          setSelectedType('wall');
                        }}
                        className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          selectedId === w.id
                            ? 'bg-slate-800 border-sky-400 text-white font-bold shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{w.label || `WALL #${idx + 1}`}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{pxToM(w.w)}m×{pxToM(w.h)}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Voids */}
              {voids.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-amber-500 uppercase px-1 mb-0.5">
                    ⬜ Voids ({voids.length})
                  </div>
                  <div className="flex flex-col gap-1">
                    {voids.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => {
                          setSelectedId(v.id);
                          setSelectedType('void');
                        }}
                        className={`p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          selectedId === v.id
                            ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{v.label || 'EMPTY VOID'}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{pxToM(v.w)}m×{pxToM(v.h)}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">Architecture Tools</p>
          <button
            onClick={() => setActiveTool('select')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'select' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Move className="w-3.5 h-3.5" /> Select / Move / Resize
          </button>
          <button
            onClick={() => setActiveTool('pan')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'pan' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Hand className="w-3.5 h-3.5" /> Pan Canvas
          </button>
          <button
            onClick={() => setActiveTool('room')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'room' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Square className="w-3.5 h-3.5" /> + Room (with Door)
          </button>
          <button
            onClick={() => setActiveTool('corridor')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'corridor' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> + Corridor / Hallway
          </button>
          <button
            onClick={() => setActiveTool('void')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'void' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Square className="w-3.5 h-3.5 text-amber-400" /> + Empty Space Void
          </button>

          {/* Upgraded Wall Tools Section */}
          <div className="flex flex-col gap-1 border-t border-b border-slate-800 py-1.5 my-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wall Tools:</span>
            <button
              onClick={() => setActiveTool('wall_draw')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTool === 'wall_draw' || activeTool === 'wall'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Click and drag to draw a wall between two points"
            >
              <Shield className="w-3.5 h-3.5 text-sky-400" /> ✏️ Draw Wall (Drag)
            </button>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setActiveTool('wall_h')}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'wall_h' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Drop Horizontal Wall (8.0m × 0.4m)"
              >
                🧱 Horiz (8m)
              </button>
              <button
                onClick={() => setActiveTool('wall_v')}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'wall_v' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Drop Vertical Wall (0.4m × 8.0m)"
              >
                🧱 Vert (8m)
              </button>
            </div>
          </div>

          <button
            onClick={() => setActiveTool('exit')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'exit' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" /> + Exit Portal
          </button>
          <button
            onClick={() => setActiveTool('stairs')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'stairs' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> + Fire Stairs
          </button>
          <button
            onClick={() => setActiveTool('lift')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'lift' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-rose-400" /> + Elevator Shaft
          </button>
          <button
            onClick={() => setActiveTool('delete')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTool === 'delete' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-800 text-rose-300 hover:bg-slate-700'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" /> Eraser Tool
          </button>

          {/* Metric Snap Grid Controller */}
          <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Grid className="w-3.5 h-3.5" /> Metric Snap Grid
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setSnapMode('0.5m')}
                className={`px-1.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                  snapMode === '0.5m'
                    ? 'bg-sky-600 text-white border-sky-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Snap to 0.5m (10px) precision"
              >
                0.5m
              </button>
              <button
                onClick={() => setSnapMode('1.0m')}
                className={`px-1.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                  snapMode === '1.0m'
                    ? 'bg-sky-600 text-white border-sky-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Snap to 1.0m (20px) standard architectural module"
              >
                1.0m
              </button>
              <button
                onClick={() => setSnapMode('off')}
                className={`px-1.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                  snapMode === 'off'
                    ? 'bg-sky-600 text-white border-sky-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Free movement without snapping"
              >
                Free
              </button>
            </div>
            <div className="text-[9px] text-slate-400 font-mono">
              Scale: 1m = 20px • Infinite Precision Workspace
            </div>
          </div>
          </>
          )}

          {notification && (
            <div className="mt-auto p-2 bg-sky-950/80 border border-sky-800 text-[11px] text-sky-200 rounded text-center">
              {notification}
            </div>
          )}
        </div>

        {/* Central CAD Canvas Viewport */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden min-h-0 min-w-0">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`w-full h-full block ${
              isPanning || activeTool === 'pan' || isSpacePressed
                ? 'cursor-grab active:cursor-grabbing'
                : hoverResizeMode
                ? 'cursor-nwse-resize'
                : hoverMoveMode
                ? 'cursor-move'
                : 'cursor-crosshair'
            }`}
          />

          {/* Selected Item HUD & Deselect Instruction Badge */}
          {selectedId && selectedElement && (
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 px-3 py-1.5 bg-sky-950/95 border border-sky-500/70 rounded-xl backdrop-blur-md shadow-2xl text-xs text-slate-200">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                <span className="font-bold text-white max-w-[150px] truncate">
                  {('label' in selectedElement && selectedElement.label) || selectedType?.toUpperCase()}
                </span>
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">• Drag to move • Bottom-right handle to resize</span>
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
                <button
                  onClick={() => {
                    setSelectedId(null);
                    setSelectedType(null);
                    setDragState(null);
                    setHoverResizeMode(false);
                    setHoverMoveMode(false);
                    notify('Item unselected');
                  }}
                  className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-mono text-[10px] rounded border border-slate-700 font-bold shadow-sm transition-colors cursor-pointer"
                  title="Click or press ESC to unselect item"
                >
                  <kbd className="px-1 bg-slate-900 rounded border border-slate-700 text-sky-400">ESC</kbd>
                  <span className="font-sans font-medium text-[11px] text-sky-200">Unselect</span>
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Floating Zoom & Pan HUD */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 p-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl backdrop-blur-md shadow-2xl text-xs">
            <button
              onClick={() => setZoom((z) => Math.min(3.0, z * 1.2))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z * 0.8))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1.0);
                setPan({ x: 0, y: 0 });
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] font-bold rounded-lg transition-colors"
              title="Reset 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => {
                setZoom(1.0);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors"
              title="Auto-Fit / Fill View"
            >
              <Expand className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool(activeTool === 'pan' ? 'select' : 'pan')}
              className={`p-1.5 rounded-lg transition-colors ${
                activeTool === 'pan'
                  ? 'bg-sky-600 text-white font-bold shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Pan Tool (or Space+drag)"
            >
              <Hand className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-400 pl-1 hidden sm:inline">
              Scroll to zoom • Drag handle to resize
            </span>
          </div>
        </div>

        {/* Right Element Properties Inspector Panel */}
        {selectedElement && selectedType && (
          <div className="w-72 border-l border-slate-800 bg-slate-900/95 p-4 flex flex-col gap-3 overflow-y-auto z-20">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-xs uppercase tracking-wider text-sky-400">
                {selectedType} Properties
              </span>
              <button
                onClick={() => {
                  setSelectedId(null);
                  setSelectedType(null);
                  setDragState(null);
                  setHoverResizeMode(false);
                  setHoverMoveMode(false);
                  notify('Item unselected');
                }}
                className="text-slate-400 hover:text-white"
                title="Unselect Item (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Unselect Pill */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/90 border border-slate-800 rounded-lg text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] font-mono text-sky-300 font-bold">ESC</kbd>
                <span className="text-[11px]">Press Escape to unselect item</span>
              </span>
              <button
                onClick={() => {
                  setSelectedId(null);
                  setSelectedType(null);
                  setDragState(null);
                  setHoverResizeMode(false);
                  setHoverMoveMode(false);
                  notify('Item unselected');
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-medium hover:underline"
              >
                Unselect
              </button>
            </div>

            {/* Label / Name */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Label</label>
              <input
                type="text"
                value={(selectedElement as any).label || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (selectedType === 'room') setRooms((prev) => prev.map((r) => (r.id === selectedId ? { ...r, label: val } : r)));
                  else if (selectedType === 'corridor') setCorridors((prev) => prev.map((c) => (c.id === selectedId ? { ...c, label: val } : c)));
                  else if (selectedType === 'exit') setExits((prev) => prev.map((ex) => (ex.id === selectedId ? { ...ex, label: val } : ex)));
                  else if (selectedType === 'stairs') setStairs((prev) => prev.map((s) => (s.id === selectedId ? { ...s, label: val } : s)));
                  else if (selectedType === 'lift') setLifts((prev) => prev.map((l) => (l.id === selectedId ? { ...l, label: val } : l)));
                  else if (selectedType === 'void') setVoids((prev) => prev.map((v) => (v.id === selectedId ? { ...v, label: val } : v)));
                  else if (selectedType === 'wall') setWalls((prev) => prev.map((w) => (w.id === selectedId ? { ...w, label: val } : w)));
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            {/* Requirement 4: Position X and Y in real metres (1m = 20px) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-1">
                  <span>X Position</span>
                  <span className="font-mono text-sky-400 font-bold">{pxToM(selectedElement.x)}m</span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  value={pxToM(selectedElement.x)}
                  onChange={(e) => {
                    const mVal = parseFloat(e.target.value) || 0;
                    const val = mToPx(mVal);
                    if (selectedType === 'room') setRooms((prev) => prev.map((r) => (r.id === selectedId ? { ...r, x: val, doorPoint: { x: val + r.w / 2, y: r.y + r.h } } : r)));
                    else if (selectedType === 'corridor') setCorridors((prev) => prev.map((c) => (c.id === selectedId ? { ...c, x: val } : c)));
                    else if (selectedType === 'void') setVoids((prev) => prev.map((v) => (v.id === selectedId ? { ...v, x: val } : v)));
                    else if (selectedType === 'wall') setWalls((prev) => prev.map((w) => (w.id === selectedId ? { ...w, x: val } : w)));
                    else if (selectedType === 'exit') setExits((prev) => prev.map((ex) => (ex.id === selectedId ? { ...ex, x: val, exitPoint: { x: val + ex.w / 2, y: ex.y + ex.h / 2 } } : ex)));
                    else if (selectedType === 'stairs') setStairs((prev) => prev.map((s) => (s.id === selectedId ? { ...s, x: val, stairPoint: { x: val + s.w / 2, y: s.y + s.h / 2 } } : s)));
                    else if (selectedType === 'lift') setLifts((prev) => prev.map((l) => (l.id === selectedId ? { ...l, x: val, liftPoint: { x: val + l.w / 2, y: l.y + l.h / 2 } } : l)));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-1">
                  <span>Y Position</span>
                  <span className="font-mono text-sky-400 font-bold">{pxToM(selectedElement.y)}m</span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  value={pxToM(selectedElement.y)}
                  onChange={(e) => {
                    const mVal = parseFloat(e.target.value) || 0;
                    const val = mToPx(mVal);
                    if (selectedType === 'room') setRooms((prev) => prev.map((r) => (r.id === selectedId ? { ...r, y: val, doorPoint: { x: r.x + r.w / 2, y: val + r.h } } : r)));
                    else if (selectedType === 'corridor') setCorridors((prev) => prev.map((c) => (c.id === selectedId ? { ...c, y: val } : c)));
                    else if (selectedType === 'void') setVoids((prev) => prev.map((v) => (v.id === selectedId ? { ...v, y: val } : v)));
                    else if (selectedType === 'wall') setWalls((prev) => prev.map((w) => (w.id === selectedId ? { ...w, y: val } : w)));
                    else if (selectedType === 'exit') setExits((prev) => prev.map((ex) => (ex.id === selectedId ? { ...ex, y: val, exitPoint: { x: ex.x + ex.w / 2, y: val + ex.h / 2 } } : ex)));
                    else if (selectedType === 'stairs') setStairs((prev) => prev.map((s) => (s.id === selectedId ? { ...s, y: val, stairPoint: { x: s.x + s.w / 2, y: val + s.h / 2 } } : s)));
                    else if (selectedType === 'lift') setLifts((prev) => prev.map((l) => (l.id === selectedId ? { ...l, y: val, liftPoint: { x: l.x + l.w / 2, y: val + l.h / 2 } } : l)));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Requirement 4: Width and Height in real metres (1m = 20px) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Width:</span>
                <span className="font-mono text-sky-400 font-bold">{pxToM(selectedElement.w)}m</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1.0"
                  max="45.0"
                  step="0.5"
                  value={pxToM(selectedElement.w)}
                  onChange={(e) => {
                    const val = mToPx(parseFloat(e.target.value) || 1.0);
                    if (selectedType === 'room') setRooms((prev) => prev.map((r) => (r.id === selectedId ? { ...r, w: val, doorPoint: { x: r.x + val / 2, y: r.y + r.h } } : r)));
                    else if (selectedType === 'corridor') setCorridors((prev) => prev.map((c) => (c.id === selectedId ? { ...c, w: val, lengthMeters: pxToM(val) } : c)));
                    else if (selectedType === 'void') setVoids((prev) => prev.map((v) => (v.id === selectedId ? { ...v, w: val } : v)));
                    else if (selectedType === 'wall') setWalls((prev) => prev.map((w) => (w.id === selectedId ? { ...w, w: val } : w)));
                    else if (selectedType === 'exit') setExits((prev) => prev.map((ex) => (ex.id === selectedId ? { ...ex, w: val, exitPoint: { x: ex.x + val / 2, y: ex.y + ex.h / 2 } } : ex)));
                    else if (selectedType === 'stairs') setStairs((prev) => prev.map((s) => (s.id === selectedId ? { ...s, w: val, stairPoint: { x: s.x + val / 2, y: s.y + s.h / 2 } } : s)));
                    else if (selectedType === 'lift') setLifts((prev) => prev.map((l) => (l.id === selectedId ? { ...l, w: val, liftPoint: { x: l.x + val / 2, y: l.y + l.h / 2 } } : l)));
                  }}
                  className="flex-1 accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
                />
                <input
                  type="number"
                  step="0.5"
                  value={pxToM(selectedElement.w)}
                  onChange={(e) => {
                    const val = mToPx(parseFloat(e.target.value) || 1.0);
                    if (selectedType === 'room') setRooms((prev) => prev.map((r) => (r.id === selectedId ? { ...r, w: val, doorPoint: { x: r.x + val / 2, y: r.y + r.h } } : r)));
                    else if (selectedType === 'corridor') setCorridors((prev) => prev.map((c) => (c.id === selectedId ? { ...c, w: val } : c)));
                    else if (selectedType === 'void') setVoids((prev) => prev.map((v) => (v.id === selectedId ? { ...v, w: val } : v)));
                    else if (selectedType === 'wall') setWalls((prev) => prev.map((w) => (w.id === selectedId ? { ...w, w: val } : w)));
                    else if (selectedType === 'exit') setExits((prev) => prev.map((ex) => (ex.id === selectedId ? { ...ex, w: val, exitPoint: { x: ex.x + val / 2, y: ex.y + ex.h / 2 } } : ex)));
                    else if (selectedType === 'stairs') setStairs((prev) => prev.map((s) => (s.id === selectedId ? { ...s, w: val, stairPoint: { x: s.x + val / 2, y: s.y + s.h / 2 } } : s)));
                    else if (selectedType === 'lift') setLifts((prev) => prev.map((l) => (l.id === selectedId ? { ...l, w: val, liftPoint: { x: l.x + val / 2, y: l.y + l.h / 2 } } : l)));
                  }}
                  className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-right font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Length / Height:</span>
                <span className="font-mono text-sky-400 font-bold">{pxToM(selectedElement.h)}m</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.4"
                  max="30.0"
                  step="0.2"
                  value={pxToM(selectedElement.h)}
                  onChange={(e) => {
                    const val = mToPx(parseFloat(e.target.value) || 0.4);
                    if (selectedType === 'room') setRooms((prev) => prev.map((r) => (r.id === selectedId ? { ...r, h: val, doorPoint: { x: r.x + r.w / 2, y: r.y + val } } : r)));
                    else if (selectedType === 'corridor') setCorridors((prev) => prev.map((c) => (c.id === selectedId ? { ...c, h: val, widthMeters: pxToM(val) } : c)));
                    else if (selectedType === 'void') setVoids((prev) => prev.map((v) => (v.id === selectedId ? { ...v, h: val } : v)));
                    else if (selectedType === 'wall') setWalls((prev) => prev.map((w) => (w.id === selectedId ? { ...w, h: val } : w)));
                    else if (selectedType === 'exit') setExits((prev) => prev.map((ex) => (ex.id === selectedId ? { ...ex, h: val, exitPoint: { x: ex.x + ex.w / 2, y: ex.y + val / 2 } } : ex)));
                    else if (selectedType === 'stairs') setStairs((prev) => prev.map((s) => (s.id === selectedId ? { ...s, h: val, stairPoint: { x: s.x + s.w / 2, y: s.y + val / 2 } } : s)));
                    else if (selectedType === 'lift') setLifts((prev) => prev.map((l) => (l.id === selectedId ? { ...l, h: val, liftPoint: { x: l.x + l.w / 2, y: l.y + val / 2 } } : l)));
                  }}
                  className="flex-1 accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
                />
                <input
                  type="number"
                  step="0.2"
                  value={pxToM(selectedElement.h)}
                  onChange={(e) => {
                    const val = mToPx(parseFloat(e.target.value) || 0.4);
                    if (selectedType === 'room') setRooms((prev) => prev.map((r) => (r.id === selectedId ? { ...r, h: val, doorPoint: { x: r.x + r.w / 2, y: r.y + val } } : r)));
                    else if (selectedType === 'corridor') setCorridors((prev) => prev.map((c) => (c.id === selectedId ? { ...c, h: val } : c)));
                    else if (selectedType === 'void') setVoids((prev) => prev.map((v) => (v.id === selectedId ? { ...v, h: val } : v)));
                    else if (selectedType === 'wall') setWalls((prev) => prev.map((w) => (w.id === selectedId ? { ...w, h: val } : w)));
                    else if (selectedType === 'exit') setExits((prev) => prev.map((ex) => (ex.id === selectedId ? { ...ex, h: val, exitPoint: { x: ex.x + ex.w / 2, y: ex.y + val / 2 } } : ex)));
                    else if (selectedType === 'stairs') setStairs((prev) => prev.map((s) => (s.id === selectedId ? { ...s, h: val, stairPoint: { x: s.x + s.w / 2, y: s.y + val / 2 } } : s)));
                    else if (selectedType === 'lift') setLifts((prev) => prev.map((l) => (l.id === selectedId ? { ...l, h: val, liftPoint: { x: l.x + l.w / 2, y: l.y + val / 2 } } : l)));
                  }}
                  className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-right font-mono"
                />
              </div>
            </div>

            {/* Requirement 3: Room occupants slider is REMOVED completely */}

            {/* Corridor Specific: Max Capacity Holding Limit with 0 and Infinite options */}
            {selectedType === 'corridor' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Holding Capacity:</span>
                  <span className="font-mono font-bold">
                    {(selectedElement as any).capacity === null || (selectedElement as any).capacity === undefined ? (
                      <span className="text-emerald-400">∞ No Limit</span>
                    ) : (selectedElement as any).capacity === 0 ? (
                      <span className="text-rose-400">0 (Choke)</span>
                    ) : (
                      <span className="text-sky-400">{(selectedElement as any).capacity}p</span>
                    )}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="5"
                  value={(selectedElement as any).capacity ?? 120}
                  onChange={(e) => {
                    const cap = parseInt(e.target.value);
                    setCorridors((prev) => prev.map((c) => (c.id === selectedId ? { ...c, capacity: cap } : c)));
                  }}
                  className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
                />
                <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold">
                  <button
                    onClick={() => setCorridors((prev) => prev.map((c) => (c.id === selectedId ? { ...c, capacity: 0 } : c)))}
                    className={`py-1 rounded border transition-colors ${
                      (selectedElement as any).capacity === 0
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    0 (Choke)
                  </button>
                  <button
                    onClick={() => setCorridors((prev) => prev.map((c) => (c.id === selectedId ? { ...c, capacity: 50 } : c)))}
                    className={`py-1 rounded border transition-colors ${
                      (selectedElement as any).capacity === 50
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    50p (Default)
                  </button>
                  <button
                    onClick={() => setCorridors((prev) => prev.map((c) => (c.id === selectedId ? { ...c, capacity: null } : c)))}
                    className={`py-1 rounded border transition-colors ${
                      (selectedElement as any).capacity === null || (selectedElement as any).capacity === undefined
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    ∞ No Limit
                  </button>
                </div>
              </div>
            )}

            {/* Exit/Stair/Lift Specific: Max Evacuation Quota Limit */}
            {(selectedType === 'exit' || selectedType === 'stairs' || selectedType === 'lift') && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Capacity Quota Limit:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {(selectedElement as any).maxCapacityLimit ? `${(selectedElement as any).maxCapacityLimit}p` : '∞ Unlimited'}
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={(selectedElement as any).maxCapacityLimit || 100}
                  onChange={(e) => {
                    const limit = parseInt(e.target.value);
                    if (selectedType === 'exit') setExits((prev) => prev.map((ex) => (ex.id === selectedId ? { ...ex, maxCapacityLimit: limit } : ex)));
                    else if (selectedType === 'stairs') setStairs((prev) => prev.map((s) => (s.id === selectedId ? { ...s, maxCapacityLimit: limit } : s)));
                    else if (selectedType === 'lift') setLifts((prev) => prev.map((l) => (l.id === selectedId ? { ...l, maxCapacityLimit: limit } : l)));
                  }}
                  className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
                />
                <button
                  onClick={() => {
                    if (selectedType === 'exit') setExits((prev) => prev.map((ex) => (ex.id === selectedId ? { ...ex, maxCapacityLimit: null } : ex)));
                    else if (selectedType === 'stairs') setStairs((prev) => prev.map((s) => (s.id === selectedId ? { ...s, maxCapacityLimit: null } : s)));
                    else if (selectedType === 'lift') setLifts((prev) => prev.map((l) => (l.id === selectedId ? { ...l, maxCapacityLimit: null } : l)));
                  }}
                  className="w-full py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  Set to Unlimited (∞)
                </button>
              </div>
            )}

            {/* Requirement 4: Room Specific 4-Direction Door Placement & Offset */}
            {selectedType === 'room' && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  🚪 Door Wall Direction (4 Sides)
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {(['north', 'south', 'west', 'east'] as const).map((side) => {
                    const currentSide = (selectedElement as GeometricRoom).doorSide || 'south';
                    const isSelected = currentSide === side;
                    const labels = {
                      north: '⬆️ North',
                      south: '⬇️ South',
                      west: '⬅️ West',
                      east: '➡️ East',
                    };
                    return (
                      <button
                        key={side}
                        onClick={() => handleSetRoomDoorSide(selectedElement.id, side)}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {labels[side]}
                      </button>
                    );
                  })}
                </div>

                {/* Door Slide Position Along Selected Wall */}
                {(() => {
                  const room = selectedElement as GeometricRoom;
                  const side = room.doorSide || 'south';
                  const isHorizWall = side === 'north' || side === 'south';
                  const currentRatio = isHorizWall
                    ? Math.max(0.1, Math.min(0.9, (room.doorPoint.x - room.x) / room.w))
                    : Math.max(0.1, Math.min(0.9, (room.doorPoint.y - room.y) / room.h));

                  return (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Position Along Wall:</span>
                        <span className="font-mono text-emerald-400 font-bold">{Math.round(currentRatio * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={currentRatio}
                        onChange={(e) => {
                          const ratio = parseFloat(e.target.value);
                          setRooms((prev) =>
                            prev.map((r) => {
                              if (r.id !== selectedId) return r;
                              let dp = { ...r.doorPoint };
                              if (side === 'north') dp = { x: Math.round(r.x + r.w * ratio), y: r.y };
                              else if (side === 'south') dp = { x: Math.round(r.x + r.w * ratio), y: r.y + r.h };
                              else if (side === 'west') dp = { x: r.x, y: Math.round(r.y + r.h * ratio) };
                              else if (side === 'east') dp = { x: r.x + r.w, y: Math.round(r.y + r.h * ratio) };
                              return { ...r, doorPoint: dp };
                            })
                          );
                        }}
                        className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
                      />
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Requirement 1: Realistic Metric Wall Thickness Presets & Fine Slider */}
            {selectedType === 'wall' && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Metric Wall Thickness Presets
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: '0.1m', px: 2, desc: 'Partition' },
                    { label: '0.15m', px: 3, desc: 'Standard' },
                    { label: '0.25m', px: 5, desc: 'Structural' },
                    { label: '0.4m', px: 8, desc: 'Barrier' },
                  ].map((preset) => {
                    const isHoriz = selectedElement.w >= selectedElement.h;
                    const currentThick = isHoriz ? selectedElement.h : selectedElement.w;
                    const isSelected = currentThick === preset.px;
                    return (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setWalls((prev) =>
                            prev.map((w) =>
                              w.id === selectedId
                                ? isHoriz
                                  ? { ...w, h: preset.px }
                                  : { ...w, w: preset.px }
                                : w
                            )
                          );
                          setDefaultWallThickness(preset.px);
                        }}
                        className={`px-1 py-1 rounded text-[10px] font-bold border transition-colors text-center ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                        title={`${preset.label} (${preset.desc})`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Fine Wall Thickness Slider (0.05m to 0.8m) */}
                {(() => {
                  const isHoriz = selectedElement.w >= selectedElement.h;
                  const currentThickPx = isHoriz ? selectedElement.h : selectedElement.w;
                  const currentThickM = pxToM(currentThickPx);

                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Fine Wall Thickness:</span>
                        <span className="font-mono text-sky-400 font-bold">{currentThickM}m</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.8"
                        step="0.05"
                        value={currentThickM}
                        onChange={(e) => {
                          const mVal = parseFloat(e.target.value) || 0.1;
                          const pxVal = Math.max(1, mToPx(mVal));
                          setWalls((prev) =>
                            prev.map((w) =>
                              w.id === selectedId
                                ? isHoriz
                                  ? { ...w, h: pxVal }
                                  : { ...w, w: pxVal }
                                : w
                            )
                          );
                          setDefaultWallThickness(pxVal);
                        }}
                        className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
                      />
                    </div>
                  );
                })()}

                <button
                  onClick={() => {
                    setWalls((prev) =>
                      prev.map((w) => (w.id === selectedId ? { ...w, w: w.h, h: w.w } : w))
                    );
                    notify('Flipped Wall Orientation');
                  }}
                  className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Flip (Horizontal ↔ Vertical)
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-auto pt-3 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={handleDuplicateSelected}
                className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate Element
              </button>
              <button
                onClick={handleDeleteSelected}
                className="w-full py-1.5 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/80 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Element
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Requirement 5: Save Blueprint Modal Dialog */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Save className="w-5 h-5 text-sky-400" />
                <span>Save Floorplan Permanently</span>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Blueprint Name / Facility Identifier
              </label>
              <input
                type="text"
                value={saveTitleInput}
                onChange={(e) => setSaveTitleInput(e.target.value)}
                placeholder="e.g. Science Wing Level 2, Transit Hub Floor 1"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveBlueprint();
                }}
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex flex-col gap-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Layout Summary</div>
              <div className="flex flex-wrap gap-2 pt-1 text-slate-300">
                <span className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800/80 text-sky-300">
                  {rooms.length} Rooms
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/80 text-indigo-300">
                  {corridors.length} Corridors
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300">
                  {exits.length} Exits
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                  {walls.length} Walls
                </span>
                {voids.length > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300">
                    {voids.length} Voids
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBlueprint}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/30 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save to Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requirement 5: Saved Blueprints Library Modal Dialog */}
      {isLibraryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <FolderOpen className="w-5 h-5 text-sky-400" />
                <span>Custom Blueprints Library ({savedBlueprintsList.length})</span>
              </div>
              <button
                onClick={() => setIsLibraryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {savedBlueprintsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Building className="w-10 h-10 text-slate-600 mb-1" />
                  <p className="font-semibold text-slate-300">No Custom Blueprints Saved Yet</p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Design your architectural layout with rooms, hallways, and walls, then click "Save Blueprint" in the top bar to permanently store it.
                  </p>
                </div>
              ) : (
                savedBlueprintsList.map((bp) => (
                  <div
                    key={bp.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                        <span>📐 {bp.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Saved: {bp.createdAt}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-800 text-sky-300">
                          {bp.config.rooms.length} Rooms
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300">
                          {bp.config.corridors.length} Corridors
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                          {bp.config.exits.length} Exits
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {bp.config.walls?.length || 0} Walls
                        </span>
                        {(bp.config.voids?.length || 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300">
                            {bp.config.voids?.length} Voids
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleLoadSavedBlueprint(bp)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        title="Load layout in CAD editor"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          onSimulateCustomMap(bp.config);
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 flex items-center gap-1"
                        title="Directly launch evacuation simulation"
                      >
                        <Play className="w-3 h-3" /> Simulate
                      </button>
                      <button
                        onClick={() => handleDeleteBlueprint(bp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-lg border border-transparent hover:border-rose-900 transition-colors"
                        title="Permanently delete blueprint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsLibraryModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Close Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
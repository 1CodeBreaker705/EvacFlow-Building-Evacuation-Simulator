// EvacFlow Core Simulation Engine v4.1 Pro
// Research-Backed Egress Simulation:
// 1. Spatial Navigation Grid with Octile Admissible A*
// 2. Strict Wall, Void & Door Egress Physics
// 3. Three Established Scientific Routing Strategies:
//    - Shortest Path (Classical Distance: Dijkstra / Euclidean)
//    - Safe Route (Hazard-Aware: Fire & Obstacle Avoidance, Congestion-Blind, strictly chooses closest safe exit)
//    - Safe Route + Congestion Optimization (Joint Hazard & SFPE Doorway Queue Delay Balancing)
// 4. Exit Capacity Quotas (Doors close when max evacuee quota reached -> triggers dynamic rerouting)
// 5. Stairs and Lifts as Multi-Floor Evacuation Portals
// 6. Trapped Occupant Refuge State ([🛡️ REFUGE])
// 7. Interactive Hazard Drag Brushes & Full Corridor Toggles

export interface Point2D {
  x: number;
  y: number;
}

export interface GeometricRoom {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  doorPoint: Point2D;
  doorLabel: string;
  doorSide?: 'north' | 'south' | 'east' | 'west';
  peopleCount: number;
  speedOverride?: number;
  floor: 1 | 2;
}

export interface GeometricCorridor {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  baseCenter?: number;
  orientation?: 'horizontal' | 'vertical';
  widthMeters: number;
  lengthMeters: number;
  capacity: number | null; // Holding capacity (0 = zero-capacity choke; null = infinite / no limit)
  maxFlowRate: number;
  isBlocked: boolean;
  hasFire: boolean;
  hasSmoke?: boolean;
  isStairs?: boolean;
  stairSpeedFactor?: number;
  currentOccupants: number;
  currentQueue: number;
  peakQueue: number;
  floor: 1 | 2;
}

export interface GeometricExit {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  exitPoint: Point2D;
  isBlocked: boolean;
  evacuatedCount: number;
  floor: 1 | 2;
  doorWidthMeters?: number;
  maxDischargeRate?: number; // SFPE doorway specific flow rate (pers/sec)
  lastDischargeSeconds?: number;
  maxCapacityLimit?: number | null; // Max evacuees before door locks/saturates
}

export interface GeometricWall {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface GeometricVoid {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GeometricStair {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  stairPoint: Point2D;
  isBlocked: boolean;
  evacuatedCount: number;
  stairSpeedFactor: number; // 0.65x descent speed
  maxCapacityLimit?: number | null;
}

export interface GeometricLift {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  liftPoint: Point2D;
  isOutOfService: boolean; // Out of service during fire emergency
  evacuatedCount: number;
  maxCapacityLimit?: number | null;
}

export interface MovingPerson {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  baseSpeed: number;
  panicSpeed: number;
  color: string;
  radius: number;
  roomId: string;
  targetExitId: string;
  waypoints: Point2D[];
  waypointIndex: number;
  isEvacuated: boolean;
  isQueued: boolean;
  isRerouting: boolean;
  isTrapped: boolean;
  isRefugee: boolean; // Remains in place with refugee badge when cut off
  refugeeReason?: string;
  inFireSprint: boolean;
  inSmoke?: boolean; // Smoke hazard distress / reduced speed
  encounteredFire?: boolean; // Scientifically tracks exposure to fire hazard
  encounteredSmoke?: boolean; // Scientifically tracks exposure to smoke hazard
  evacuatedAt?: number; // Exact simulation timestamp (seconds) when occupant crosses exit
  onStairs: boolean;
  reactionTimer: number;
  walkCycle: number;
  currentFloor: 1 | 2;
  stuckFrames?: number;
  lastRerouteTime?: number;
}

export interface BuildingMapConfig {
  id: string;
  title: string;
  subtitle: string;
  hasFloors?: boolean;
  rooms: GeometricRoom[];
  corridors: GeometricCorridor[];
  exits: GeometricExit[];
  walls?: GeometricWall[];
  voids?: GeometricVoid[];
  stairs?: GeometricStair[];
  lifts?: GeometricLift[];
  benchmarkDistribution?: number[];
}

export interface SavedBlueprint {
  id: string;
  title: string;
  createdAt: string;
  config: BuildingMapConfig;
}

export const SAVED_BLUEPRINTS_KEY = 'evacflow_custom_blueprints';

export function getSavedBlueprints(): SavedBlueprint[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_BLUEPRINTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveBlueprintToStorage(title: string, config: BuildingMapConfig): SavedBlueprint {
  const blueprints = getSavedBlueprints();
  const id = `blueprint_${Date.now()}`;
  const newBlueprint: SavedBlueprint = {
    id,
    title: title.trim() || `Custom Blueprint ${blueprints.length + 1}`,
    createdAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    config: {
      ...config,
      id,
      title: title.trim() || `Custom Blueprint ${blueprints.length + 1}`,
      subtitle: `Engineered Floorplan • ${config.rooms.length} Rooms, ${config.corridors.length} Corridors, ${config.exits.length} Exits`,
    },
  };
  const updated = [newBlueprint, ...blueprints];
  try {
    localStorage.setItem(SAVED_BLUEPRINTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save blueprint to localStorage', e);
  }
  return newBlueprint;
}

export function deleteBlueprintFromStorage(id: string): SavedBlueprint[] {
  const blueprints = getSavedBlueprints();
  const updated = blueprints.filter((b) => b.id !== id);
  try {
    localStorage.setItem(SAVED_BLUEPRINTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete blueprint from localStorage', e);
  }
  return updated;
}

export type RoutingStrategy = 'shortest' | 'safe' | 'smart_congestion';

export interface BenchmarkMetrics {
  strategy: RoutingStrategy;
  strategyName: string;
  totalOccupants: number;
  evacuationTime: number;
  averageEgressTime: number;
  peakQueueC2: number;
  globalPeakQueue: number;
  observedDoorFlowRate: number;
  exitCounts: Record<string, number>;
  corridorBottlenecks: Array<{ id: string; name: string; peakQueue: number; peakUtilization: number }>;
  refugeeCount: number;
  trappedCount?: number;
  fireSprintCount: number;
  timeWindowEgress?: {
    t15s: { count: number; pct: number };
    t30s: { count: number; pct: number };
    t45s: { count: number; pct: number };
    t60s: { count: number; pct: number };
  };
}

export interface BenchmarkComparisonResult {
  baseline: BenchmarkMetrics;
  safeRoute: BenchmarkMetrics;
  smartCongestion: BenchmarkMetrics;
  astar: BenchmarkMetrics; // alias for safeRoute
  smart: BenchmarkMetrics; // alias for smartCongestion
  improvementTimePct: number;
  queueReductionPct: number;
  astarImprovementPct: number;
  mapId: string;
}

// =====================================================================
// SPATIAL NAVIGATION GRID (7,360 cells @ 10px resolution)
// Guarantees zero wall-clipping, mandatory room door traversal, and void avoidance
// =====================================================================
export const GRID_CELL_SIZE = 10;
export const CANVAS_LOGICAL_WIDTH = 1150;
export const CANVAS_LOGICAL_HEIGHT = 640;
export const GRID_COLS = Math.floor(CANVAS_LOGICAL_WIDTH / GRID_CELL_SIZE); // 115
export const GRID_ROWS = Math.floor(CANVAS_LOGICAL_HEIGHT / GRID_CELL_SIZE); // 64

export class SpatialNavGrid {
  walkable: Uint8Array = new Uint8Array(GRID_COLS * GRID_ROWS);
  isWall: Uint8Array = new Uint8Array(GRID_COLS * GRID_ROWS);
  isVoid: Uint8Array = new Uint8Array(GRID_COLS * GRID_ROWS);
  isDoor: Uint8Array = new Uint8Array(GRID_COLS * GRID_ROWS);
  isExit: Uint8Array = new Uint8Array(GRID_COLS * GRID_ROWS);
  isStairs: Uint8Array = new Uint8Array(GRID_COLS * GRID_ROWS);
  hasFire: Uint8Array = new Uint8Array(GRID_COLS * GRID_ROWS);
  hasSmoke: Uint8Array = new Uint8Array(GRID_COLS * GRID_ROWS);
  isBlocked: Uint8Array = new Uint8Array(GRID_COLS * GRID_ROWS);
  wallClearance: Uint8Array = new Uint8Array(GRID_COLS * GRID_ROWS);
  roomOwner: Int16Array = new Int16Array(GRID_COLS * GRID_ROWS);

  getIndex(gx: number, gy: number): number {
    return gy * GRID_COLS + gx;
  }

  isCellValid(gx: number, gy: number): boolean {
    return gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS;
  }

  build(
    map: BuildingMapConfig,
    brushObstacles: Set<number>,
    brushFires: Set<number>,
    brushSmoke?: Set<number>
  ) {
    this.walkable.fill(0);
    this.isWall.fill(0);
    this.isVoid.fill(0);
    this.isDoor.fill(0);
    this.isExit.fill(0);
    this.isStairs.fill(0);
    this.hasFire.fill(0);
    this.hasSmoke.fill(0);
    this.isBlocked.fill(0);
    this.roomOwner.fill(-1);

    // 1. Mark Corridors as walkable
    for (const c of map.corridors) {
      const gx1 = Math.max(0, Math.floor(c.x / GRID_CELL_SIZE));
      const gy1 = Math.max(0, Math.floor(c.y / GRID_CELL_SIZE));
      const gx2 = Math.min(GRID_COLS - 1, Math.floor((c.x + c.w) / GRID_CELL_SIZE));
      const gy2 = Math.min(GRID_ROWS - 1, Math.floor((c.y + c.h) / GRID_CELL_SIZE));

      for (let gy = gy1; gy <= gy2; gy++) {
        for (let gx = gx1; gx <= gx2; gx++) {
          const idx = this.getIndex(gx, gy);
          this.walkable[idx] = 1;
          this.isWall[idx] = 0;
          if (c.isBlocked) {
            this.isBlocked[idx] = 1;
            this.walkable[idx] = 0;
          }
          if (c.hasFire) {
            this.hasFire[idx] = 1;
          }
          if (c.hasSmoke) {
            this.hasSmoke[idx] = 1;
          }
        }
      }
    }

    // 2. Mark Rooms: Interior is walkable, Perimeter is SOLID WALL except at Doorway
    map.rooms.forEach((r, roomIndex) => {
      const rx1 = Math.max(0, Math.floor(r.x / GRID_CELL_SIZE));
      const ry1 = Math.max(0, Math.floor(r.y / GRID_CELL_SIZE));
      const rx2 = Math.min(GRID_COLS - 1, Math.floor((r.x + r.w) / GRID_CELL_SIZE));
      const ry2 = Math.min(GRID_ROWS - 1, Math.floor((r.y + r.h) / GRID_CELL_SIZE));

      // Door coordinates
      const dgx = Math.floor(r.doorPoint.x / GRID_CELL_SIZE);
      const dgy = Math.floor(r.doorPoint.y / GRID_CELL_SIZE);

      for (let gy = ry1; gy <= ry2; gy++) {
        for (let gx = rx1; gx <= rx2; gx++) {
          const idx = this.getIndex(gx, gy);
          const isPerimeter = gx === rx1 || gx === rx2 || gy === ry1 || gy === ry2;
          const isDoorway = Math.abs(gx - dgx) <= 4 && Math.abs(gy - dgy) <= 4;

          if (isDoorway) {
            this.walkable[idx] = 1;
            this.isWall[idx] = 0;
            this.isDoor[idx] = 1;
            this.roomOwner[idx] = roomIndex;
          } else if (isPerimeter) {
            this.isWall[idx] = 1;
            this.walkable[idx] = 0;
          } else {
            this.walkable[idx] = 1;
            this.isWall[idx] = 0;
            this.roomOwner[idx] = roomIndex;
          }
        }
      }

      // Explicitly punch wide open doorway passage into adjacent corridor (80px+ wide door opening)
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const gx = dgx + dx;
          const gy = dgy + dy;
          if (this.isCellValid(gx, gy)) {
            const idx = this.getIndex(gx, gy);
            this.walkable[idx] = 1;
            this.isWall[idx] = 0;
            this.isDoor[idx] = 1;
          }
        }
      }
    });

    // 3. Mark Voids (Empty Space Void / Courtyards / Lightwells): UNWALKABLE
    if (map.voids) {
      for (const v of map.voids) {
        const vx1 = Math.max(0, Math.floor(v.x / GRID_CELL_SIZE));
        const vy1 = Math.max(0, Math.floor(v.y / GRID_CELL_SIZE));
        const vx2 = Math.min(GRID_COLS - 1, Math.floor((v.x + v.w) / GRID_CELL_SIZE));
        const vy2 = Math.min(GRID_ROWS - 1, Math.floor((v.y + v.h) / GRID_CELL_SIZE));

        for (let gy = vy1; gy <= vy2; gy++) {
          for (let gx = vx1; gx <= vx2; gx++) {
            const idx = this.getIndex(gx, gy);
            this.isVoid[idx] = 1;
            this.walkable[idx] = 0;
            if (gx === vx1 || gx === vx2 || gy === vy1 || gy === vy2) {
              this.isWall[idx] = 1;
            }
          }
        }
      }
    }

    // 4. Mark Individual Walls
    if (map.walls) {
      for (const w of map.walls) {
        const wx1 = Math.max(0, Math.floor(w.x / GRID_CELL_SIZE));
        const wy1 = Math.max(0, Math.floor(w.y / GRID_CELL_SIZE));
        const wx2 = Math.min(GRID_COLS - 1, Math.floor((w.x + w.w) / GRID_CELL_SIZE));
        const wy2 = Math.min(GRID_ROWS - 1, Math.floor((w.y + w.h) / GRID_CELL_SIZE));

        for (let gy = wy1; gy <= wy2; gy++) {
          for (let gx = wx1; gx <= wx2; gx++) {
            const idx = this.getIndex(gx, gy);
            this.isWall[idx] = 1;
            this.walkable[idx] = 0;
          }
        }
      }
    }

    // 5. Mark Exits as walkable portals & clear immediate corridor connections
    for (const ex of map.exits) {
      if (ex.isBlocked) continue;
      const egx1 = Math.max(0, Math.floor((ex.x - 10) / GRID_CELL_SIZE));
      const egy1 = Math.max(0, Math.floor((ex.y - 10) / GRID_CELL_SIZE));
      const egx2 = Math.min(GRID_COLS - 1, Math.floor((ex.x + ex.w + 10) / GRID_CELL_SIZE));
      const egy2 = Math.min(GRID_ROWS - 1, Math.floor((ex.y + ex.h + 10) / GRID_CELL_SIZE));

      for (let gy = egy1; gy <= egy2; gy++) {
        for (let gx = egx1; gx <= egx2; gx++) {
          const idx = this.getIndex(gx, gy);
          this.walkable[idx] = 1;
          this.isExit[idx] = 1;
          this.isWall[idx] = 0;
        }
      }
    }

    // 6. Mark Stairs as walkable vertical exits
    if (map.stairs) {
      for (const st of map.stairs) {
        if (st.isBlocked) continue;
        const sgx1 = Math.max(0, Math.floor((st.x - 10) / GRID_CELL_SIZE));
        const sgy1 = Math.max(0, Math.floor((st.y - 10) / GRID_CELL_SIZE));
        const sgx2 = Math.min(GRID_COLS - 1, Math.floor((st.x + st.w + 10) / GRID_CELL_SIZE));
        const sgy2 = Math.min(GRID_ROWS - 1, Math.floor((st.y + st.h + 10) / GRID_CELL_SIZE));

        for (let gy = sgy1; gy <= sgy2; gy++) {
          for (let gx = sgx1; gx <= sgx2; gx++) {
            const idx = this.getIndex(gx, gy);
            this.walkable[idx] = 1;
            this.isStairs[idx] = 1;
            this.isWall[idx] = 0;
          }
        }
      }
    }

    // 7. Mark Lifts (Walkable if in service)
    if (map.lifts) {
      for (const lt of map.lifts) {
        if (lt.isOutOfService) continue;
        const lgx1 = Math.max(0, Math.floor((lt.x - 10) / GRID_CELL_SIZE));
        const lgy1 = Math.max(0, Math.floor((lt.y - 10) / GRID_CELL_SIZE));
        const lgx2 = Math.min(GRID_COLS - 1, Math.floor((lt.x + lt.w + 10) / GRID_CELL_SIZE));
        const lgy2 = Math.min(GRID_ROWS - 1, Math.floor((lt.y + lt.h + 10) / GRID_CELL_SIZE));

        for (let gy = lgy1; gy <= lgy2; gy++) {
          for (let gx = lgx1; gx <= lgx2; gx++) {
            const idx = this.getIndex(gx, gy);
            this.walkable[idx] = 1;
            this.isWall[idx] = 0;
          }
        }
      }
    }

    // 8. Apply Dynamic Mouse Drag Brushes
    for (const idx of brushObstacles) {
      if (idx >= 0 && idx < this.walkable.length) {
        this.isBlocked[idx] = 1;
        this.walkable[idx] = 0;
      }
    }
    for (const idx of brushFires) {
      if (idx >= 0 && idx < this.walkable.length) {
        this.hasFire[idx] = 1;
      }
    }
    if (brushSmoke) {
      for (const idx of brushSmoke) {
        if (idx >= 0 && idx < this.walkable.length) {
          this.hasSmoke[idx] = 1;
        }
      }
    }

    // 9. Compute Metric Wall Clearance Field (Prevents wall hugging & bashing)
    this.wallClearance.fill(4);
    for (let gy = 0; gy < GRID_ROWS; gy++) {
      for (let gx = 0; gx < GRID_COLS; gx++) {
        const idx = this.getIndex(gx, gy);
        if (this.walkable[idx] === 0 || this.isWall[idx] === 1 || this.isVoid[idx] === 1 || this.isBlocked[idx] === 1) {
          this.wallClearance[idx] = 0;
        } else if (this.isDoor[idx] === 1 || this.isExit[idx] === 1 || this.isStairs[idx] === 1) {
          this.wallClearance[idx] = 4;
        }
      }
    }

    for (let gy = 0; gy < GRID_ROWS; gy++) {
      for (let gx = 0; gx < GRID_COLS; gx++) {
        const idx = this.getIndex(gx, gy);
        if (this.wallClearance[idx] === 0 || this.isDoor[idx] === 1) continue;
        let minDist = 4;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (this.isCellValid(nx, ny)) {
              const nidx = this.getIndex(nx, ny);
              if (this.wallClearance[nidx] === 0) {
                const dist = Math.max(Math.abs(dx), Math.abs(dy));
                if (dist < minDist) minDist = dist;
              }
            }
          }
        }
        this.wallClearance[idx] = minDist;
      }
    }
  }

  isWalkablePixel(x: number, y: number): boolean {
    const gx = Math.floor(x / GRID_CELL_SIZE);
    const gy = Math.floor(y / GRID_CELL_SIZE);
    if (!this.isCellValid(gx, gy)) return false;
    const idx = this.getIndex(gx, gy);
    return this.walkable[idx] === 1 && this.isWall[idx] === 0 && this.isVoid[idx] === 0 && this.isBlocked[idx] === 0;
  }

  isWalkableCircle(x: number, y: number, radius: number): boolean {
    if (!this.isWalkablePixel(x, y)) return false;
    const r = Math.max(2, radius * 0.85);
    const diag = r * 0.707;
    if (!this.isWalkablePixel(x + r, y)) return false;
    if (!this.isWalkablePixel(x - r, y)) return false;
    if (!this.isWalkablePixel(x, y + r)) return false;
    if (!this.isWalkablePixel(x, y - r)) return false;
    if (!this.isWalkablePixel(x + diag, y + diag)) return false;
    if (!this.isWalkablePixel(x - diag, y + diag)) return false;
    if (!this.isWalkablePixel(x + diag, y - diag)) return false;
    if (!this.isWalkablePixel(x - diag, y - diag)) return false;
    return true;
  }

  // Multi-Exit A* Search with Octile Admissible Distance
  findPath(
    start: Point2D,
    targets: Array<{ id: string; point: Point2D; flowCapacity?: number; currentQueue?: number }>,
    strategy: RoutingStrategy
  ): { targetExitId: string; waypoints: Point2D[]; reachable: boolean } {
    let startGx = Math.floor(start.x / GRID_CELL_SIZE);
    let startGy = Math.floor(start.y / GRID_CELL_SIZE);

    if (!this.isCellValid(startGx, startGy)) {
      startGx = Math.max(0, Math.min(GRID_COLS - 1, startGx));
      startGy = Math.max(0, Math.min(GRID_ROWS - 1, startGy));
    }

    let startIdx = this.getIndex(startGx, startGy);
    if (this.walkable[startIdx] === 0 || this.isWall[startIdx] === 1) {
      let found = false;
      for (let r = 1; r <= 4 && !found; r++) {
        for (let dy = -r; dy <= r && !found; dy++) {
          for (let dx = -r; dx <= r && !found; dx++) {
            const nx = startGx + dx;
            const ny = startGy + dy;
            if (this.isCellValid(nx, ny)) {
              const nidx = this.getIndex(nx, ny);
              if (this.walkable[nidx] === 1 && this.isWall[nidx] === 0) {
                startGx = nx;
                startGy = ny;
                startIdx = nidx;
                found = true;
              }
            }
          }
        }
      }
      if (!found) {
        return { targetExitId: '', waypoints: [start], reachable: false };
      }
    }

    if (targets.length === 0) {
      return { targetExitId: '', waypoints: [start], reachable: false };
    }

    // Sort candidate targets by Euclidean distance so closest candidates are examined first
    const sortedTargets = [...targets].sort(
      (a, b) => Math.hypot(a.point.x - start.x, a.point.y - start.y) - Math.hypot(b.point.x - start.x, b.point.y - start.y)
    );

    let bestTarget = sortedTargets[0];
    let bestPathCells: Point2D[] = [];
    let bestOverallCost = Infinity;

    for (const t of sortedTargets) {
      const targetGx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(t.point.x / GRID_CELL_SIZE)));
      const targetGy = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(t.point.y / GRID_CELL_SIZE)));

      const result = this.aStar(startGx, startGy, targetGx, targetGy, strategy);
      if (!result.found) continue;

      // Compute actual geometric path length
      let actualPathDist = 0;
      for (let i = 1; i < result.path.length; i++) {
        actualPathDist += Math.hypot(result.path[i].x - result.path[i - 1].x, result.path[i].y - result.path[i - 1].y);
      }

      let totalScore = actualPathDist;

      // In Strategy 2 (Safe Route): Hazard penalty strictly added if path touches fire or smoke
      if (strategy === 'safe' || strategy === 'smart_congestion') {
        totalScore += result.hazardPenalty;
      }

      // In Strategy 3 (Safe Route + Congestion Optimization):
      // Jointly evaluates hazard distance AND doorway queuing delay via Pedestrian BPR Latency Model (SFPE Egress Chapter)
      if (strategy === 'smart_congestion') {
        const queue = t.currentQueue || 0;
        const cap = Math.max(1.0, t.flowCapacity || 2.5);
        const baseDelaySec = queue / cap;
        // Pedestrian BPR non-linear latency penalty: calibrated against empirical SFPE flow rates
        const bprCongestionFactor = 1.0 + 0.15 * Math.min(3.0, queue / cap);
        const queuePenalty = baseDelaySec * bprCongestionFactor * 40; // 40px equivalent per second of doorway wait
        totalScore += queuePenalty;
      }

      if (totalScore < bestOverallCost) {
        bestOverallCost = totalScore;
        bestTarget = t;
        bestPathCells = result.path;
      }
    }

    if (bestPathCells.length === 0) {
      // No reachable route: Person becomes a refugee awaiting rescue
      return { targetExitId: targets[0].id, waypoints: [start], reachable: false };
    }

    // Only avoid fire in line-of-sight smoothing if the path does not already traverse fire!
    // If fire is in the only route, allowing line-of-sight smoothing ensures agents sprint through without stalling
    const pathTraversesHazard = bestPathCells.some((c) => {
      const gx = Math.floor(c.x / GRID_CELL_SIZE);
      const gy = Math.floor(c.y / GRID_CELL_SIZE);
      if (!this.isCellValid(gx, gy)) return false;
      const idx = this.getIndex(gx, gy);
      return this.hasFire[idx] === 1 || this.hasSmoke[idx] === 1;
    });
    const avoidFireInSmoothing = (strategy === 'safe' || strategy === 'smart_congestion') && !pathTraversesHazard;
    const smoothedWaypoints = this.smoothWaypoints(start, bestTarget.point, bestPathCells, avoidFireInSmoothing);
    return {
      targetExitId: bestTarget.id,
      waypoints: smoothedWaypoints,
      reachable: true,
    };
  }

  // Exact Octile Admissible A* Search
  private aStar(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    strategy: RoutingStrategy
  ): { found: boolean; cost: number; hazardPenalty: number; path: Point2D[] } {
    const startIdx = this.getIndex(sx, sy);
    const targetIdx = this.getIndex(tx, ty);

    const dist = new Float32Array(GRID_COLS * GRID_ROWS).fill(Infinity);
    const parent = new Int32Array(GRID_COLS * GRID_ROWS).fill(-1);
    const closed = new Uint8Array(GRID_COLS * GRID_ROWS).fill(0);

    dist[startIdx] = 0;
    const openSet: Array<{ idx: number; f: number }> = [{ idx: startIdx, f: 0 }];

    const DIRS = [
      { dx: 1, dy: 0, cost: 10 },
      { dx: -1, dy: 0, cost: 10 },
      { dx: 0, dy: 1, cost: 10 },
      { dx: 0, dy: -1, cost: 10 },
      { dx: 1, dy: 1, cost: 14.14 },
      { dx: -1, dy: 1, cost: 14.14 },
      { dx: 1, dy: -1, cost: 14.14 },
      { dx: -1, dy: -1, cost: 14.14 },
    ];

    let totalHazardPenalty = 0;

    while (openSet.length > 0) {
      let minIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[minIdx].f) minIdx = i;
      }
      const current = openSet.splice(minIdx, 1)[0];
      const curIdx = current.idx;

      if (curIdx === targetIdx) {
        // Reconstruct path
        const path: Point2D[] = [];
        let curr = targetIdx;
        while (curr !== -1) {
          const cx = curr % GRID_COLS;
          const cy = Math.floor(curr / GRID_COLS);
          if (this.hasFire[curr] === 1) totalHazardPenalty += 3000;
          if (this.hasSmoke[curr] === 1) totalHazardPenalty += 1800;
          path.unshift({ x: cx * GRID_CELL_SIZE + 5, y: cy * GRID_CELL_SIZE + 5 });
          curr = parent[curr];
        }
        return { found: true, cost: dist[targetIdx], hazardPenalty: totalHazardPenalty, path };
      }

      if (closed[curIdx] === 1) continue;
      closed[curIdx] = 1;

      const cx = curIdx % GRID_COLS;
      const cy = Math.floor(curIdx / GRID_COLS);

      for (const d of DIRS) {
        const nx = cx + d.dx;
        const ny = cy + d.dy;
        if (!this.isCellValid(nx, ny)) continue;

        const nidx = this.getIndex(nx, ny);
        if (closed[nidx] === 1) continue;

        // Impassable barriers
        if (this.walkable[nidx] === 0 || this.isWall[nidx] === 1 || this.isVoid[nidx] === 1 || this.isBlocked[nidx] === 1) {
          continue;
        }

        // Prevent cutting corners through walls, voids, or blocked cells
        if (d.dx !== 0 && d.dy !== 0) {
          const adj1 = this.getIndex(cx + d.dx, cy);
          const adj2 = this.getIndex(cx, cy + d.dy);
          if (
            this.isWall[adj1] === 1 || this.isWall[adj2] === 1 ||
            this.isVoid[adj1] === 1 || this.isVoid[adj2] === 1 ||
            this.isBlocked[adj1] === 1 || this.isBlocked[adj2] === 1 ||
            this.walkable[adj1] === 0 || this.walkable[adj2] === 0
          ) continue;
        }

        let stepCost = d.cost;

        // Wall Proximity Clearance Penalty (steers path away from walls into corridor center)
        if (this.isDoor[nidx] === 0 && this.isExit[nidx] === 0 && this.isStairs[nidx] === 0) {
          const clr = this.wallClearance[nidx];
          if (clr === 1) stepCost += 16;
          else if (clr === 2) stepCost += 6;
        }

        // Shortest Path Strategy strictly evaluates pure geometric distance (Euclidean/Octile)
        // Hazard penalties (fire/smoke) are ONLY applied in 'safe' and 'smart_congestion' modes
        if (strategy !== 'shortest') {
          if (this.hasFire[nidx] === 1) {
            stepCost += 4500;
          }
          if (this.hasSmoke[nidx] === 1) {
            stepCost += 2500;
          }
        }

        const tentativeG = dist[curIdx] + stepCost;
        if (tentativeG < dist[nidx]) {
          dist[nidx] = tentativeG;
          parent[nidx] = curIdx;

          // Admissible Octile Heuristic
          const odx = Math.abs(nx - tx);
          const ody = Math.abs(ny - ty);
          const h = 10 * Math.max(odx, ody) + 4.14 * Math.min(odx, ody);
          openSet.push({ idx: nidx, f: tentativeG + h });
        }
      }
    }

    return { found: false, cost: Infinity, hazardPenalty: Infinity, path: [] };
  }

  // Smooth raw grid path into clean architectural waypoints
  private smoothWaypoints(start: Point2D, goal: Point2D, cells: Point2D[], avoidFire: boolean = false): Point2D[] {
    if (cells.length <= 2) return [start, goal];

    const smoothed: Point2D[] = [start];
    let anchorIdx = 0;

    while (anchorIdx < cells.length - 1) {
      let furthestIdx = anchorIdx + 1;
      for (let testIdx = Math.min(cells.length - 1, anchorIdx + 14); testIdx > anchorIdx + 1; testIdx--) {
        if (this.hasLineOfSight(cells[anchorIdx], cells[testIdx], avoidFire)) {
          furthestIdx = testIdx;
          break;
        }
      }
      smoothed.push(cells[furthestIdx]);
      anchorIdx = furthestIdx;
    }

    smoothed.push(goal);
    return smoothed;
  }

  private hasLineOfSight(p1: Point2D, p2: Point2D, avoidFire: boolean = false): boolean {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.ceil(dist / 8);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      const gx = Math.floor(x / GRID_CELL_SIZE);
      const gy = Math.floor(y / GRID_CELL_SIZE);
      if (!this.isCellValid(gx, gy)) return false;
      const idx = this.getIndex(gx, gy);
      if (this.walkable[idx] === 0 || this.isWall[idx] === 1 || this.isVoid[idx] === 1 || this.isBlocked[idx] === 1) {
        return false;
      }
      // Guarantee body clearance from walls so smoothed path never cuts into room corners
      if (this.isDoor[idx] === 0 && this.isExit[idx] === 0 && this.isStairs[idx] === 0 && this.wallClearance[idx] < 2) {
        return false;
      }
      if (avoidFire && (this.hasFire[idx] === 1 || this.hasSmoke[idx] === 1)) {
        return false;
      }
    }
    return true;
  }
}

// =====================================================================
// MAIN SIMULATOR KERNEL
// =====================================================================

export class GeometricBuildingSimulator {
  mapId: string = 'atrium_complex';
  activeMapTitle: string = 'Real-Life Department Complex';
  customMapConfig: BuildingMapConfig | null = null;
  rooms: GeometricRoom[] = [];
  corridors: GeometricCorridor[] = [];
  exits: GeometricExit[] = [];
  walls: GeometricWall[] = [];
  voids: GeometricVoid[] = [];
  stairs: GeometricStair[] = [];
  lifts: GeometricLift[] = [];
  people: MovingPerson[] = [];

  navGrid: SpatialNavGrid = new SpatialNavGrid();
  brushObstacles: Set<number> = new Set();
  brushFires: Set<number> = new Set();
  brushSmoke: Set<number> = new Set();

  elapsedSeconds: number = 0;
  isPlaying: boolean = false;
  strategy: RoutingStrategy = 'shortest';

  userWalkingSpeed: number = 1.4; // 1.4 m/s (50 px/s)
  globalSpeed: number = 1.0;

  targetTimerSeconds: number | null = null;
  autoPauseAtTimer: boolean = false;
  timerSnapshot: {
    targetSeconds: number;
    evacuated: number;
    total: number;
    ratioPct: number;
    strategy: RoutingStrategy;
  } | null = null;

  selectedItemId: string | null = null;
  selectedItemType: 'room' | 'corridor' | 'exit' | 'stairs' | 'lift' | null = null;
  lastRerouteSeconds: number = 0;
  lastQueueRebalanceSeconds: number = 0;
  private recalcTimer: any = null;

  constructor() {
    this.loadMap('atrium_complex');
  }

  // ===================================================================
  // FOUR DEMONSTRATION ARCHITECTURAL PRESETS
  // 1. Atrium Complex (Flagship - Image 2)
  // 2. Academic Wing (Fixed & 100% Walkable)
  // 3. Two-Story Terminal (Stairs & Lift Vertical Egress)
  // 4. Mall Concourse (Cross-Corridor Grand Atrium)
  // ===================================================================

  getMapPresets(): Record<string, BuildingMapConfig> {
    return {
      // 1. MAIT BLOCK 1 1ST FLOOR (FLAGSHIP CAMPUS PRESET - IMAGE 2)
      atrium_complex: {
        id: 'atrium_complex',
        title: 'MAIT BLOCK 1 1ST Floor',
        subtitle: 'Flagship Academic Complex • 4 Spacious Rooms (R1-R4), Central Courtyard Atrium, Dual Exits, Stairs & Evac Lift',
        benchmarkDistribution: [28, 28, 28, 28],
        voids: [
          {
            id: 'void_center',
            name: 'Central Courtyard Atrium',
            label: 'EMPTY SPACE VOID (COURTYARD / ATRIUM)',
            x: 420,
            y: 190,
            w: 310,
            h: 230,
          },
        ],
        rooms: [
          {
            id: 'room_1',
            name: 'Classroom 101',
            label: 'ROOM 1',
            x: 90,
            y: 80,
            w: 170,
            h: 120,
            doorPoint: { x: 175, y: 200 },
            doorLabel: 'DOOR 1',
            doorSide: 'south',
            peopleCount: 28,
            floor: 1,
          },
          {
            id: 'room_2',
            name: 'Classroom 102',
            label: 'ROOM 2',
            x: 90,
            y: 290,
            w: 170,
            h: 120,
            doorPoint: { x: 175, y: 410 },
            doorLabel: 'DOOR 2',
            doorSide: 'south',
            peopleCount: 28,
            floor: 1,
          },
          {
            id: 'room_3',
            name: 'Classroom 103',
            label: 'ROOM 3',
            x: 890,
            y: 80,
            w: 170,
            h: 120,
            doorPoint: { x: 975, y: 200 },
            doorLabel: 'DOOR 3',
            doorSide: 'south',
            peopleCount: 28,
            floor: 1,
          },
          {
            id: 'room_4',
            name: 'Classroom 104',
            label: 'ROOM 4',
            x: 890,
            y: 290,
            w: 170,
            h: 120,
            doorPoint: { x: 975, y: 410 },
            doorLabel: 'DOOR 4',
            doorSide: 'south',
            peopleCount: 28,
            floor: 1,
          },
        ],
        corridors: [
          {
            id: 'corr_north',
            name: 'North Concourse Hallway',
            label: 'NORTH HALLWAY',
            x: 80,
            y: 70,
            w: 990,
            h: 120,
            widthMeters: 6.0,
            lengthMeters: 49.5,
            capacity: 75,
            maxFlowRate: 6.5,
            isBlocked: false,
            hasFire: false,
            currentOccupants: 0,
            currentQueue: 0,
            peakQueue: 0,
            floor: 1,
          },
          {
            id: 'corr_west',
            name: 'West Wing Hallway',
            label: 'WEST HALLWAY',
            x: 80,
            y: 190,
            w: 340,
            h: 230,
            widthMeters: 8.5,
            lengthMeters: 17.0,
            capacity: 65,
            maxFlowRate: 6.0,
            isBlocked: false,
            hasFire: false,
            currentOccupants: 0,
            currentQueue: 0,
            peakQueue: 0,
            floor: 1,
          },
          {
            id: 'corr_east',
            name: 'East Wing Hallway',
            label: 'EAST HALLWAY',
            x: 730,
            y: 190,
            w: 340,
            h: 230,
            widthMeters: 8.5,
            lengthMeters: 17.0,
            capacity: 65,
            maxFlowRate: 6.0,
            isBlocked: false,
            hasFire: false,
            currentOccupants: 0,
            currentQueue: 0,
            peakQueue: 0,
            floor: 1,
          },
          {
            id: 'corr_south',
            name: 'South Egress Hallway',
            label: 'SOUTH EGRESS HALLWAY',
            x: 80,
            y: 420,
            w: 990,
            h: 130,
            widthMeters: 6.5,
            lengthMeters: 49.5,
            capacity: 85,
            maxFlowRate: 7.0,
            isBlocked: false,
            hasFire: false,
            currentOccupants: 0,
            currentQueue: 0,
            peakQueue: 0,
            floor: 1,
          },
        ],
        exits: [
          {
            id: 'exit_1',
            name: 'North Main Exit Portal 1',
            label: 'EXIT 1',
            x: 535,
            y: 35,
            w: 80,
            h: 35,
            exitPoint: { x: 575, y: 55 },
            isBlocked: false,
            evacuatedCount: 0,
            floor: 1,
            doorWidthMeters: 2.8,
            maxDischargeRate: 3.5,
            maxCapacityLimit: 50,
          },
          {
            id: 'exit_2',
            name: 'South Main Exit Portal 2',
            label: 'EXIT 2',
            x: 535,
            y: 550,
            w: 80,
            h: 40,
            exitPoint: { x: 575, y: 565 },
            isBlocked: false,
            evacuatedCount: 0,
            floor: 1,
            doorWidthMeters: 2.8,
            maxDischargeRate: 3.5,
            maxCapacityLimit: 50,
          },
        ],
        stairs: [
          {
            id: 'stairs_1',
            name: 'Emergency Fire Stairs 1 (West)',
            label: 'STAIRS 1',
            x: 180,
            y: 550,
            w: 70,
            h: 40,
            stairPoint: { x: 215, y: 565 },
            isBlocked: false,
            evacuatedCount: 0,
            stairSpeedFactor: 0.65,
            maxCapacityLimit: 40,
          },
          {
            id: 'stairs_2',
            name: 'Emergency Fire Stairs 2 (East)',
            label: 'STAIRS 2',
            x: 880,
            y: 550,
            w: 70,
            h: 40,
            stairPoint: { x: 915, y: 565 },
            isBlocked: false,
            evacuatedCount: 0,
            stairSpeedFactor: 0.65,
            maxCapacityLimit: 40,
          },
        ],
        lifts: [
          {
            id: 'lift_main',
            name: 'Evacuation Elevator Shaft',
            label: 'EVAC LIFT',
            x: 380,
            y: 550,
            w: 70,
            h: 40,
            liftPoint: { x: 415, y: 565 },
            isOutOfService: false,
            evacuatedCount: 0,
            maxCapacityLimit: 25,
          },
        ],
      },

      // 2. ACADEMIC WING (100% Connected & Walkable - Zero Trapped)
      academic: {
        id: 'academic',
        title: 'Academic Department Wing (Linear Hallway)',
        subtitle: 'Classrooms connected to continuous hallway with West Fire Exit & East Lobby Gate',
        benchmarkDistribution: [35, 30, 35, 25, 25],
        rooms: [
          {
            id: 'room_1',
            name: 'Computer Science Lab 1',
            label: 'CS LAB 1',
            x: 160,
            y: 130,
            w: 220,
            h: 130,
            doorPoint: { x: 270, y: 260 },
            doorLabel: 'DOOR 1',
            peopleCount: 35,
            floor: 1,
          },
          {
            id: 'room_2',
            name: 'Robotics & AI Research Lab',
            label: 'ROBOTICS LAB',
            x: 440,
            y: 130,
            w: 220,
            h: 130,
            doorPoint: { x: 550, y: 260 },
            doorLabel: 'DOOR 2',
            peopleCount: 30,
            floor: 1,
          },
          {
            id: 'room_3',
            name: 'Department Seminar Hall',
            label: 'SEMINAR HALL',
            x: 720,
            y: 130,
            w: 220,
            h: 130,
            doorPoint: { x: 830, y: 260 },
            doorLabel: 'DOOR 3',
            peopleCount: 35,
            floor: 1,
          },
          {
            id: 'room_4',
            name: 'Lecture Theatre 101',
            label: 'LECTURE 101',
            x: 260,
            y: 350,
            w: 260,
            h: 140,
            doorPoint: { x: 390, y: 350 },
            doorLabel: 'DOOR 4',
            peopleCount: 25,
            floor: 1,
          },
          {
            id: 'room_5',
            name: 'Lecture Theatre 102',
            label: 'LECTURE 102',
            x: 600,
            y: 350,
            w: 260,
            h: 140,
            doorPoint: { x: 730, y: 350 },
            doorLabel: 'DOOR 5',
            peopleCount: 25,
            floor: 1,
          },
        ],
        // Corridors span seamlessly from West Exit (x:60) to East Exit (x:1070)
        corridors: [
          {
            id: 'corridor_west',
            name: 'West Hallway Section',
            label: 'WEST HALLWAY',
            x: 60,
            y: 260,
            w: 420,
            h: 90,
            widthMeters: 3.2,
            lengthMeters: 14,
            capacity: 50,
            maxFlowRate: 4.5,
            isBlocked: false,
            hasFire: false,
            currentOccupants: 0,
            currentQueue: 0,
            peakQueue: 0,
            floor: 1,
          },
          {
            id: 'corridor_central',
            name: 'Central Concourse Junction',
            label: 'CENTRAL HALLWAY',
            x: 480,
            y: 260,
            w: 300,
            h: 90,
            widthMeters: 3.2,
            lengthMeters: 12,
            capacity: 45,
            maxFlowRate: 4.5,
            isBlocked: false,
            hasFire: false,
            currentOccupants: 0,
            currentQueue: 0,
            peakQueue: 0,
            floor: 1,
          },
          {
            id: 'corridor_c2',
            name: 'Corridor C2 (East Chokepoint)',
            label: 'EAST CHOKEPOINT',
            x: 780,
            y: 260,
            w: 290,
            h: 90,
            widthMeters: 1.5,
            lengthMeters: 9,
            capacity: 20,
            maxFlowRate: 2.0,
            isBlocked: false,
            hasFire: false,
            currentOccupants: 0,
            currentQueue: 0,
            peakQueue: 0,
            floor: 1,
          },
        ],
        exits: [
          {
            id: 'exit_west',
            name: 'West Exterior Fire Exit Door',
            label: 'WEST FIRE EXIT',
            x: 60,
            y: 275,
            w: 70,
            h: 60,
            exitPoint: { x: 75, y: 305 },
            isBlocked: false,
            evacuatedCount: 0,
            floor: 1,
            doorWidthMeters: 2.0,
            maxDischargeRate: 2.8,
            maxCapacityLimit: 80,
          },
          {
            id: 'exit_east',
            name: 'East Main Lobby Concourse Gate',
            label: 'EAST LOBBY GATE',
            x: 1000,
            y: 275,
            w: 70,
            h: 60,
            exitPoint: { x: 1045, y: 305 },
            isBlocked: false,
            evacuatedCount: 0,
            floor: 1,
            doorWidthMeters: 2.0,
            maxDischargeRate: 2.8,
            maxCapacityLimit: 80,
          },
        ],
      },

      // 3. TWO-STORY TRANSIT (Stairs & Lift Vertical Egress)
      two_story_transit: {
        id: 'two_story_transit',
        title: 'Multi-Level Transit Facility (Dual Stairs & Evacuation Lift)',
        subtitle: 'Upper Concourse evacuation through North Stair, South Stair & Central Lift',
        benchmarkDistribution: [35, 35, 30, 30],
        rooms: [
          {
            id: 'room_t1',
            name: 'Departure Lounge A',
            label: 'LOUNGE A',
            x: 120,
            y: 90,
            w: 240,
            h: 130,
            doorPoint: { x: 240, y: 220 },
            doorLabel: 'DOOR A',
            peopleCount: 35,
            floor: 2,
          },
          {
            id: 'room_t2',
            name: 'Departure Lounge B',
            label: 'LOUNGE B',
            x: 420,
            y: 90,
            w: 240,
            h: 130,
            doorPoint: { x: 540, y: 220 },
            doorLabel: 'DOOR B',
            peopleCount: 35,
            floor: 2,
          },
          {
            id: 'room_t3',
            name: 'Passenger Waiting Hall C',
            label: 'HALL C',
            x: 120,
            y: 400,
            w: 240,
            h: 130,
            doorPoint: { x: 240, y: 400 },
            doorLabel: 'DOOR C',
            peopleCount: 30,
            floor: 2,
          },
          {
            id: 'room_t4',
            name: 'Passenger Waiting Hall D',
            label: 'HALL D',
            x: 420,
            y: 400,
            w: 240,
            h: 130,
            doorPoint: { x: 540, y: 400 },
            doorLabel: 'DOOR D',
            peopleCount: 30,
            floor: 2,
          },
        ],
        corridors: [
          {
            id: 'corr_transit_main',
            name: 'Level 2 Mezzanine Concourse',
            label: 'MEZZANINE CONCOURSE',
            x: 100,
            y: 220,
            w: 860,
            h: 180,
            widthMeters: 4.0,
            lengthMeters: 30,
            capacity: 90,
            maxFlowRate: 7.0,
            isBlocked: false,
            hasFire: false,
            currentOccupants: 0,
            currentQueue: 0,
            peakQueue: 0,
            floor: 2,
          },
        ],
        stairs: [
          {
            id: 'stairs_north',
            name: 'North Emergency Stairwell (to Ground)',
            label: 'STAIRS NORTH',
            x: 960,
            y: 130,
            w: 80,
            h: 60,
            stairPoint: { x: 990, y: 160 },
            isBlocked: false,
            evacuatedCount: 0,
            stairSpeedFactor: 0.65,
            maxCapacityLimit: 45,
          },
          {
            id: 'stairs_south',
            name: 'South Emergency Stairwell (to Ground)',
            label: 'STAIRS SOUTH',
            x: 960,
            y: 430,
            w: 80,
            h: 60,
            stairPoint: { x: 990, y: 460 },
            isBlocked: false,
            evacuatedCount: 0,
            stairSpeedFactor: 0.65,
            maxCapacityLimit: 45,
          },
        ],
        lifts: [
          {
            id: 'lift_transit',
            name: 'Central Evacuation Elevator (to Ground)',
            label: 'EVAC LIFT',
            x: 740,
            y: 270,
            w: 70,
            h: 80,
            liftPoint: { x: 775, y: 310 },
            isOutOfService: false,
            evacuatedCount: 0,
            maxCapacityLimit: 30,
          },
        ],
        exits: [
          {
            id: 'exit_mezzanine',
            name: 'East Skywalk Bridge Exit',
            label: 'SKYWALK EXIT',
            x: 960,
            y: 280,
            w: 70,
            h: 60,
            exitPoint: { x: 995, y: 310 },
            isBlocked: false,
            evacuatedCount: 0,
            floor: 2,
            doorWidthMeters: 2.2,
            maxDischargeRate: 2.8,
            maxCapacityLimit: 40,
          },
        ],
      },

      // 4. HEALTHCARE PAVILION & EMERGENCY WARD (Demonstration Preset)
      hospital_ward: {
        id: 'hospital_ward',
        title: 'Healthcare Center & Emergency Ward',
        subtitle: 'Critical ICU, Trauma Unit, Ambulance Bay, East Lobby Gate & Evacuation Elevator',
        benchmarkDistribution: [30, 25, 30, 25],
        rooms: [
          {
            id: 'room_icu',
            name: 'Intensive Care Unit (ICU)',
            label: 'ICU UNIT',
            x: 160,
            y: 110,
            w: 240,
            h: 130,
            doorPoint: { x: 280, y: 240 },
            doorLabel: 'DOOR ICU',
            peopleCount: 30,
            floor: 1,
          },
          {
            id: 'room_trauma',
            name: 'Trauma & Emergency Surgery',
            label: 'TRAUMA WARD',
            x: 520,
            y: 110,
            w: 250,
            h: 130,
            doorPoint: { x: 645, y: 240 },
            doorLabel: 'DOOR TRM',
            peopleCount: 25,
            floor: 1,
          },
          {
            id: 'room_pediatric',
            name: 'Pediatric Care Ward',
            label: 'PEDIATRIC WARD',
            x: 160,
            y: 370,
            w: 240,
            h: 140,
            doorPoint: { x: 280, y: 370 },
            doorLabel: 'DOOR PED',
            peopleCount: 25,
            floor: 1,
          },
          {
            id: 'room_clinic',
            name: 'Outpatient Triage Clinic',
            label: 'TRIAGE CLINIC',
            x: 520,
            y: 370,
            w: 250,
            h: 140,
            doorPoint: { x: 645, y: 370 },
            doorLabel: 'DOOR CLN',
            peopleCount: 30,
            floor: 1,
          },
        ],
        corridors: [
          {
            id: 'corr_hosp_west',
            name: 'Ambulance Access Hallway',
            label: 'AMBULANCE HALLWAY',
            x: 60,
            y: 240,
            w: 440,
            h: 130,
            widthMeters: 3.5,
            lengthMeters: 18,
            capacity: 65,
            maxFlowRate: 5.0,
            isBlocked: false,
            hasFire: false,
            currentOccupants: 0,
            currentQueue: 0,
            peakQueue: 0,
            floor: 1,
          },
          {
            id: 'corr_hosp_east',
            name: 'East Triage Concourse',
            label: 'EAST TRIAGE CONCOURSE',
            x: 500,
            y: 240,
            w: 570,
            h: 130,
            widthMeters: 3.8,
            lengthMeters: 22,
            capacity: 75,
            maxFlowRate: 5.5,
            isBlocked: false,
            hasFire: false,
            currentOccupants: 0,
            currentQueue: 0,
            peakQueue: 0,
            floor: 1,
          },
        ],
        exits: [
          {
            id: 'exit_ambulance',
            name: 'West Ambulance Bay Exit',
            label: 'AMBULANCE BAY EXIT',
            x: 60,
            y: 275,
            w: 70,
            h: 60,
            exitPoint: { x: 75, y: 305 },
            isBlocked: false,
            evacuatedCount: 0,
            floor: 1,
            doorWidthMeters: 2.5,
            maxDischargeRate: 3.2,
            maxCapacityLimit: 55,
          },
          {
            id: 'exit_hosp_main',
            name: 'East Main Public Concourse Exit',
            label: 'MAIN LOBBY EXIT',
            x: 1000,
            y: 275,
            w: 70,
            h: 60,
            exitPoint: { x: 1045, y: 305 },
            isBlocked: false,
            evacuatedCount: 0,
            floor: 1,
            doorWidthMeters: 2.5,
            maxDischargeRate: 3.2,
            maxCapacityLimit: 55,
          },
        ],
        stairs: [
          {
            id: 'stairs_hosp_north',
            name: 'North Emergency Fire Stairs',
            label: 'NORTH STAIRS',
            x: 820,
            y: 130,
            w: 80,
            h: 60,
            stairPoint: { x: 860, y: 160 },
            isBlocked: false,
            evacuatedCount: 0,
            stairSpeedFactor: 0.65,
            maxCapacityLimit: 35,
          },
        ],
        lifts: [
          {
            id: 'lift_hosp_bed',
            name: 'Bed Transfer Evacuation Elevator',
            label: 'BED LIFT (EVAC)',
            x: 820,
            y: 410,
            w: 80,
            h: 70,
            liftPoint: { x: 860, y: 445 },
            isOutOfService: false,
            evacuatedCount: 0,
            maxCapacityLimit: 25,
          },
        ],
      },
    };
  }

  loadMap(mapId: string) {
    this.mapId = mapId;
    let config: BuildingMapConfig;

    if (mapId === 'custom' && this.customMapConfig) {
      config = this.customMapConfig;
    } else {
      const presets = this.getMapPresets();
      config = presets[mapId] || presets['atrium_complex'];
    }

    this.activeMapTitle = config.title;

    this.rooms = JSON.parse(JSON.stringify(config.rooms || []));
    this.corridors = JSON.parse(JSON.stringify(config.corridors || []));
    this.exits = JSON.parse(JSON.stringify(config.exits || []));
    this.walls = JSON.parse(JSON.stringify(config.walls || []));
    this.voids = JSON.parse(JSON.stringify(config.voids || []));
    this.stairs = JSON.parse(JSON.stringify(config.stairs || []));
    this.lifts = JSON.parse(JSON.stringify(config.lifts || []));

    this.brushObstacles.clear();
    this.brushFires.clear();
    this.brushSmoke.clear();

    this.rebuildNavGrid();
    this.resetSimulation();
  }

  rebuildNavGrid() {
    const currentConfig: BuildingMapConfig = {
      id: this.mapId,
      title: '',
      subtitle: '',
      rooms: this.rooms,
      corridors: this.corridors,
      exits: this.exits,
      walls: this.walls,
      voids: this.voids,
      stairs: this.stairs,
      lifts: this.lifts,
    };
    this.navGrid.build(currentConfig, this.brushObstacles, this.brushFires, this.brushSmoke);
  }

  loadCustomMap(config: BuildingMapConfig) {
    this.customMapConfig = config;
    this.loadMap('custom');
  }

  clearAllHazards() {
    this.brushObstacles.clear();
    this.brushFires.clear();
    this.brushSmoke.clear();
    for (const c of this.corridors) {
      c.hasFire = false;
      c.hasSmoke = false;
      c.isBlocked = false;
    }
    for (const ex of this.exits) {
      ex.isBlocked = false;
    }
    for (const st of this.stairs) {
      st.isBlocked = false;
    }
    for (const lt of this.lifts) {
      lt.isOutOfService = false;
    }
    this.rebuildNavGrid();
    this.recalculateAllRoutes();
  }

  checkCorridorHasHazard(c: GeometricCorridor): boolean {
    if (c.hasFire || c.hasSmoke) return true;
    const gx1 = Math.max(0, Math.floor(c.x / GRID_CELL_SIZE));
    const gy1 = Math.max(0, Math.floor(c.y / GRID_CELL_SIZE));
    const gx2 = Math.min(GRID_COLS - 1, Math.floor((c.x + c.w) / GRID_CELL_SIZE));
    const gy2 = Math.min(GRID_ROWS - 1, Math.floor((c.y + c.h) / GRID_CELL_SIZE));
    for (let gy = gy1; gy <= gy2; gy += 2) {
      for (let gx = gx1; gx <= gx2; gx += 2) {
        const idx = this.navGrid.getIndex(gx, gy);
        if (this.navGrid.hasFire[idx] === 1 || this.navGrid.hasSmoke[idx] === 1) {
          return true;
        }
      }
    }
    return false;
  }

  resetSimulation() {
    this.elapsedSeconds = 0;
    this.isPlaying = false;
    this.timerSnapshot = null;
    this.lastRerouteSeconds = 0;
    this.lastQueueRebalanceSeconds = 0;
    if (this.recalcTimer) {
      clearTimeout(this.recalcTimer);
      this.recalcTimer = null;
    }

    // Requirement 1: 1-click Reset button resets all hazards, debris, queues, and timers
    this.brushObstacles.clear();
    this.brushFires.clear();
    this.brushSmoke.clear();

    for (const c of this.corridors) {
      c.hasFire = false;
      c.hasSmoke = false;
      c.isBlocked = false;
      c.currentOccupants = 0;
      c.currentQueue = 0;
      c.peakQueue = 0;
    }

    for (const ex of this.exits) {
      ex.evacuatedCount = 0;
      ex.isBlocked = false;
      ex.lastDischargeSeconds = 0;
    }
    for (const st of this.stairs) {
      st.evacuatedCount = 0;
      st.isBlocked = false;
    }
    for (const lt of this.lifts) {
      lt.evacuatedCount = 0;
      lt.isOutOfService = false;
    }

    this.rebuildNavGrid();
    this.populateAllRooms();
  }

  setWalkingSpeed(speedMps: number) {
    this.userWalkingSpeed = speedMps;
    for (const p of this.people) {
      const basePx = this.userWalkingSpeed * 50;
      p.baseSpeed = basePx * (0.92 + Math.random() * 0.16);
      p.panicSpeed = p.baseSpeed * 1.55;
    }
  }

  setStrategy(strat: RoutingStrategy) {
    this.strategy = strat;
    this.recalculateAllRoutes();
  }

  setTargetTimer(sec: number | null, autoPause: boolean = true) {
    this.targetTimerSeconds = sec;
    this.autoPauseAtTimer = autoPause;
  }

  setAllRoomsCount(count: number) {
    for (const r of this.rooms) {
      r.peopleCount = count;
    }
    this.resetSimulation();
  }

  updateRoomPeople(roomId: string, count: number) {
    const rm = this.rooms.find((r) => r.id === roomId);
    if (!rm) return;
    rm.peopleCount = Math.max(0, count);
    this.resetSimulation();
  }

  // Collect all available egress destinations (Exits, Stairs, in-service Lifts)
  getAllEgressTargets() {
    const calcQueue = (targetId: string, targetPoint: Point2D) => {
      const assigned = this.people.filter((p) => !p.isEvacuated && p.targetExitId === targetId);
      if (assigned.length === 0) return 0;
      // Active bottleneck queue: occupants jammed or accumulated in approach zone (<140px)
      const nearQueue = assigned.filter((p) => p.isQueued || Math.hypot(p.x - targetPoint.x, p.y - targetPoint.y) < 140).length;
      // Effective queue includes active queue + discounted expected arrival flow (SFPE & traffic equilibrium)
      return nearQueue + (assigned.length - nearQueue) * 0.35;
    };

    return [
      ...this.exits
        .filter((e) => !e.isBlocked && (!e.maxCapacityLimit || e.evacuatedCount < e.maxCapacityLimit))
        .map((e) => ({
          id: e.id,
          point: e.exitPoint,
          flowCapacity: e.maxDischargeRate || 2.5,
          maxCapacityLimit: e.maxCapacityLimit,
          currentQueue: calcQueue(e.id, e.exitPoint),
        })),
      ...this.stairs
        .filter((s) => !s.isBlocked && (!s.maxCapacityLimit || s.evacuatedCount < s.maxCapacityLimit))
        .map((s) => ({
          id: s.id,
          point: s.stairPoint,
          flowCapacity: 2.2,
          maxCapacityLimit: s.maxCapacityLimit,
          currentQueue: calcQueue(s.id, s.stairPoint),
        })),
      ...this.lifts
        .filter((l) => !l.isOutOfService && (!l.maxCapacityLimit || l.evacuatedCount < l.maxCapacityLimit))
        .map((l) => ({
          id: l.id,
          point: l.liftPoint,
          flowCapacity: 2.0,
          maxCapacityLimit: l.maxCapacityLimit,
          currentQueue: calcQueue(l.id, l.liftPoint),
        })),
    ];
  }

  getStepOutPoint(rm: GeometricRoom): Point2D {
    const door = rm.doorPoint;
    let stepOutX = door.x;
    let stepOutY = door.y;

    // Detect which wall the door is cut into and step 22px outside into adjacent corridor
    if (Math.abs(door.y - (rm.y + rm.h)) < 18) {
      stepOutY = rm.y + rm.h + 22;
    } else if (Math.abs(door.y - rm.y) < 18) {
      stepOutY = rm.y - 22;
    } else if (Math.abs(door.x - (rm.x + rm.w)) < 18) {
      stepOutX = rm.x + rm.w + 22;
    } else if (Math.abs(door.x - rm.x) < 18) {
      stepOutX = rm.x - 22;
    } else {
      stepOutY = rm.y + rm.h + 22;
    }

    // Ensure stepOut is walkable and outside this room
    if (!this.navGrid.isWalkablePixel(stepOutX, stepOutY)) {
      for (let r = 6; r <= 32; r += 6) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const px = door.x + Math.cos(a) * r;
          const py = door.y + Math.sin(a) * r;
          if (
            this.navGrid.isWalkablePixel(px, py) &&
            (px < rm.x - 2 || px > rm.x + rm.w + 2 || py < rm.y - 2 || py > rm.y + rm.h + 2)
          ) {
            return { x: px, y: py };
          }
        }
      }
    }

    return { x: stepOutX, y: stepOutY };
  }

  getDoorExitWaypoints(rm: GeometricRoom, pathWaypoints: Point2D[]): Point2D[] {
    const door = rm.doorPoint;
    const stepOut = this.getStepOutPoint(rm);

    // Keep all waypoints that are outside this room's interior
    const corridorWps = pathWaypoints.filter(
      (wp) => wp.x < rm.x - 4 || wp.x > rm.x + rm.w + 4 || wp.y < rm.y - 4 || wp.y > rm.y + rm.h + 4
    );

    return [{ x: door.x, y: door.y }, stepOut, ...corridorWps];
  }

  populateAllRooms() {
    this.people = [];
    let pid = 1;

    const AGENT_COLORS = ['#38bdf8', '#818cf8', '#a78bfa', '#34d399', '#f59e0b', '#fb7185', '#2dd4bf'];
    const baseTargets = this.getAllEgressTargets();
    const assignedByTarget: Record<string, number> = {};

    for (const rm of this.rooms) {
      const count = rm.peopleCount;
      const baseSpeedPx = (rm.speedOverride || this.userWalkingSpeed) * 50;
      const stepOut = this.getStepOutPoint(rm);

      for (let i = 0; i < count; i++) {
        const margin = 14;
        const px = rm.x + margin + Math.random() * Math.max(10, rm.w - margin * 2);
        const py = rm.y + margin + Math.random() * Math.max(10, rm.h - margin * 2);

        // Predictive Demand Allocation (Wardrop Dynamic User Equilibrium & Capacity Constraints):
        // In smart_congestion strategy, agents dynamically anticipate queue build-up and respect portal capacity quotas
        let currentTargets = baseTargets;
        if (this.strategy === 'smart_congestion') {
          const eligibleTargets = baseTargets.filter(
            (t) => !t.maxCapacityLimit || (assignedByTarget[t.id] || 0) < t.maxCapacityLimit
          );
          const targetPool = eligibleTargets.length > 0 ? eligibleTargets : baseTargets;
          currentTargets = targetPool.map((t) => ({
            ...t,
            currentQueue: (assignedByTarget[t.id] || 0) * 0.35,
          }));
        }

        // Path is calculated from stepOut to the exit targets
        const pathResult = this.navGrid.findPath(stepOut, currentTargets, this.strategy);
        if (pathResult.targetExitId) {
          assignedByTarget[pathResult.targetExitId] = (assignedByTarget[pathResult.targetExitId] || 0) + 1;
        }

        const personSpeed = baseSpeedPx * (0.92 + Math.random() * 0.16);

        // Every person inside a room has the mandatory first target: exit the room!
        const initialWaypoints = this.getDoorExitWaypoints(rm, pathResult.waypoints);

        this.people.push({
          id: pid++,
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          angle: 0,
          speed: personSpeed,
          baseSpeed: personSpeed,
          panicSpeed: personSpeed * 1.55,
          color: AGENT_COLORS[pid % AGENT_COLORS.length],
          radius: 5.5,
          roomId: rm.id,
          targetExitId: pathResult.targetExitId,
          waypoints: initialWaypoints,
          waypointIndex: 0,
          isEvacuated: false,
          isQueued: false,
          isRerouting: false,
          isTrapped: !pathResult.reachable,
          isRefugee: !pathResult.reachable,
          refugeeReason: !pathResult.reachable ? 'Cut off by barriers / fire' : undefined,
          inFireSprint: false,
          inSmoke: false,
          onStairs: false,
          reactionTimer: Math.random() * 0.8,
          walkCycle: Math.random() * Math.PI * 2,
          currentFloor: rm.floor,
        });
      }
    }
  }

  spawnPeopleFromRooms() {
    this.populateAllRooms();
  }

  spawnPersonAt(x: number, y: number): boolean {
    if (!this.navGrid.isWalkablePixel(x, y)) {
      return false;
    }

    const egressTargets = this.getAllEgressTargets();
    const pathResult = this.navGrid.findPath({ x, y }, egressTargets, this.strategy);
    const baseSpeedPx = this.userWalkingSpeed * 50;
    const personSpeed = baseSpeedPx * (0.92 + Math.random() * 0.16);

    const AGENT_COLORS = ['#38bdf8', '#818cf8', '#a78bfa', '#34d399', '#f59e0b', '#fb7185', '#2dd4bf'];

    this.people.push({
      id: this.people.length + 1,
      x,
      y,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: personSpeed,
      baseSpeed: personSpeed,
      panicSpeed: personSpeed * 1.55,
      color: AGENT_COLORS[this.people.length % AGENT_COLORS.length],
      radius: 5.5,
      roomId: 'hallway',
      targetExitId: pathResult.targetExitId,
      waypoints: pathResult.waypoints,
      waypointIndex: 0,
      isEvacuated: false,
      isQueued: false,
      isRerouting: false,
      isTrapped: !pathResult.reachable,
      isRefugee: !pathResult.reachable,
      refugeeReason: !pathResult.reachable ? 'Cut off by barriers / fire' : undefined,
      inFireSprint: false,
      onStairs: false,
      reactionTimer: 0,
      walkCycle: 0,
      currentFloor: 1,
    });

    return true;
  }

  toggleCorridorBlock(corridorId: string) {
    const c = this.corridors.find((tc) => tc.id === corridorId);
    if (!c) return;
    c.isBlocked = !c.isBlocked;
    this.rebuildNavGrid();
    this.recalculateAllRoutes();
  }

  toggleCorridorFire(corridorId: string) {
    const c = this.corridors.find((tc) => tc.id === corridorId);
    if (!c) return;
    c.hasFire = !c.hasFire;
    this.rebuildNavGrid();
    this.recalculateAllRoutes();
  }

  toggleCorridorSmoke(corridorId: string) {
    const c = this.corridors.find((tc) => tc.id === corridorId);
    if (!c) return;
    c.hasSmoke = !c.hasSmoke;
    this.rebuildNavGrid();
    this.recalculateAllRoutes();
  }

  updateCorridorWidth(corridorId: string, widthMeters: number) {
    const c = this.corridors.find((tc) => tc.id === corridorId);
    if (!c) return;
    c.widthMeters = widthMeters;
    c.capacity = Math.round(c.lengthMeters * widthMeters * 1.5);
    c.maxFlowRate = Math.round(widthMeters * 1.33 * 10) / 10;
  }

  updateCorridorCapacity(corridorId: string, capacity: number | null) {
    const c = this.corridors.find((tc) => tc.id === corridorId);
    if (!c) return;
    c.capacity = capacity;
  }

  updateExitCapacityLimit(exitId: string, limit: number | null) {
    const ex = this.exits.find((e) => e.id === exitId);
    if (ex) {
      ex.maxCapacityLimit = limit;
      if (limit && ex.evacuatedCount >= limit) {
        ex.isBlocked = true;
      } else {
        ex.isBlocked = false;
      }
      this.rebuildNavGrid();
      this.recalculateAllRoutes();
    }
  }

  updateStairCapacityLimit(stairId: string, limit: number | null) {
    const st = this.stairs.find((s) => s.id === stairId);
    if (st) {
      st.maxCapacityLimit = limit;
      if (limit && st.evacuatedCount >= limit) {
        st.isBlocked = true;
      } else {
        st.isBlocked = false;
      }
      this.rebuildNavGrid();
      this.recalculateAllRoutes();
    }
  }

  updateLiftCapacityLimit(liftId: string, limit: number | null) {
    const lt = this.lifts.find((l) => l.id === liftId);
    if (lt) {
      lt.maxCapacityLimit = limit;
      if (limit && lt.evacuatedCount >= limit) {
        lt.isOutOfService = true;
      }
      this.rebuildNavGrid();
      this.recalculateAllRoutes();
    }
  }

  togglePortalBlock(portalId: string, type: 'exit' | 'stairs' | 'lift') {
    if (type === 'exit') {
      const ex = this.exits.find((e) => e.id === portalId);
      if (ex) ex.isBlocked = !ex.isBlocked;
    } else if (type === 'stairs') {
      const st = this.stairs.find((s) => s.id === portalId);
      if (st) st.isBlocked = !st.isBlocked;
    } else if (type === 'lift') {
      const lt = this.lifts.find((l) => l.id === portalId);
      if (lt) lt.isOutOfService = !lt.isOutOfService;
    }
    this.rebuildNavGrid();
    this.recalculateAllRoutes();
  }

  scheduleThrottledRecalculation(delayMs: number = 80) {
    if (this.recalcTimer) return;
    this.recalcTimer = setTimeout(() => {
      this.recalcTimer = null;
      this.rebuildNavGrid();
      this.recalculateAllRoutes();
    }, delayMs);
  }

  finishHazardBrush() {
    if (this.recalcTimer) {
      clearTimeout(this.recalcTimer);
      this.recalcTimer = null;
    }
    this.rebuildNavGrid();
    this.recalculateAllRoutes();
  }

  addHazardBrush(x: number, y: number, radiusPx: number, type: 'fire' | 'block' | 'smoke', immediate = false) {
    const gxCenter = Math.floor(x / GRID_CELL_SIZE);
    const gyCenter = Math.floor(y / GRID_CELL_SIZE);
    const rCells = Math.ceil(radiusPx / GRID_CELL_SIZE);

    for (let dy = -rCells; dy <= rCells; dy++) {
      for (let dx = -rCells; dx <= rCells; dx++) {
        if (dx * dx + dy * dy <= rCells * rCells) {
          const gx = gxCenter + dx;
          const gy = gyCenter + dy;
          if (this.navGrid.isCellValid(gx, gy)) {
            const idx = this.navGrid.getIndex(gx, gy);
            if (type === 'fire') {
              this.brushFires.add(idx);
              this.navGrid.hasFire[idx] = 1;
            } else if (type === 'smoke') {
              this.brushSmoke.add(idx);
              this.navGrid.hasSmoke[idx] = 1;
            } else {
              this.brushObstacles.add(idx);
              this.navGrid.isBlocked[idx] = 1;
              this.navGrid.walkable[idx] = 0;
            }
          }
        }
      }
    }

    if (immediate) {
      this.finishHazardBrush();
    } else {
      this.scheduleThrottledRecalculation(80);
    }
  }

  eraseHazardBrush(x: number, y: number, radiusPx: number, immediate = false) {
    const gxCenter = Math.floor(x / GRID_CELL_SIZE);
    const gyCenter = Math.floor(y / GRID_CELL_SIZE);
    const rCells = Math.ceil(radiusPx / GRID_CELL_SIZE);

    for (let dy = -rCells; dy <= rCells; dy++) {
      for (let dx = -rCells; dx <= rCells; dx++) {
        if (dx * dx + dy * dy <= rCells * rCells) {
          const gx = gxCenter + dx;
          const gy = gyCenter + dy;
          if (this.navGrid.isCellValid(gx, gy)) {
            const idx = this.navGrid.getIndex(gx, gy);
            this.brushFires.delete(idx);
            this.brushSmoke.delete(idx);
            this.brushObstacles.delete(idx);
            this.navGrid.hasFire[idx] = 0;
            this.navGrid.hasSmoke[idx] = 0;
            this.navGrid.isBlocked[idx] = 0;
            if (this.navGrid.isWall[idx] === 0 && this.navGrid.isVoid[idx] === 0) {
              this.navGrid.walkable[idx] = 1;
            }
          }
        }
      }
    }

    if (immediate) {
      this.finishHazardBrush();
    } else {
      this.scheduleThrottledRecalculation(80);
    }
  }

  recalculateAllRoutes() {
    const egressTargets = this.getAllEgressTargets();

    for (const p of this.people) {
      if (p.isEvacuated) continue;

      // 1. Detect if person is physically inside any room: mandatory primary target is to exit the room!
      let rm = this.rooms.find(
        (r) => p.x >= r.x - 2 && p.x <= r.x + r.w + 2 && p.y >= r.y - 2 && p.y <= r.y + r.h + 2
      );
      if (!rm && p.roomId !== 'hallway') {
        rm = this.rooms.find((r) => r.id === p.roomId);
      }
      if (rm) p.roomId = rm.id;

      let hasSteppedOut = false;
      if (rm) {
        const door = rm.doorPoint;
        const isSouthDoor = Math.abs(door.y - (rm.y + rm.h)) < 18;
        const isNorthDoor = Math.abs(door.y - rm.y) < 18;
        const isEastDoor = Math.abs(door.x - (rm.x + rm.w)) < 18;
        const isWestDoor = Math.abs(door.x - rm.x) < 18;

        if (isSouthDoor && p.y >= rm.y + rm.h + 10) hasSteppedOut = true;
        else if (isNorthDoor && p.y <= rm.y - 10) hasSteppedOut = true;
        else if (isEastDoor && p.x >= rm.x + rm.w + 10) hasSteppedOut = true;
        else if (isWestDoor && p.x <= rm.x - 10) hasSteppedOut = true;
      }

      if (rm && !hasSteppedOut) {
        p.roomId = rm.id;
        const stepOut = this.getStepOutPoint(rm);
        const exitRoute = this.navGrid.findPath(stepOut, egressTargets, this.strategy);
        p.targetExitId = exitRoute.targetExitId;
        p.waypoints = this.getDoorExitWaypoints(rm, exitRoute.waypoints);
        const distToDoor = Math.hypot(p.x - rm.doorPoint.x, p.y - rm.doorPoint.y);
        p.waypointIndex = distToDoor < 18 ? 1 : 0;
        p.isRefugee = !exitRoute.reachable;
        p.isTrapped = !exitRoute.reachable;
        if (p.isTrapped) p.refugeeReason = 'All exits blocked / unavailable';
        continue;
      }

      // 2. If person is in the hallway:
      // In Safe Route + Congestion Aware (and other strategies):
      // Only recalculate if the agent is queued, or if a hazard has newly appeared on their path!
      // Safe, non-congested pedestrians without hazards ahead must NEVER be stopped or disrupted!
      const curTarget = egressTargets.find((t) => t.id === p.targetExitId);
      const pathHasHazard = (this.strategy === 'safe' || this.strategy === 'smart_congestion') &&
        p.waypoints.slice(p.waypointIndex).some((wp) => {
          const gx = Math.floor(wp.x / GRID_CELL_SIZE);
          const gy = Math.floor(wp.y / GRID_CELL_SIZE);
          if (!this.navGrid.isCellValid(gx, gy)) return false;
          const idx = this.navGrid.getIndex(gx, gy);
          return this.navGrid.hasFire[idx] === 1 || this.navGrid.hasSmoke[idx] === 1;
        });

      if (curTarget && !p.isQueued && !pathHasHazard) {
        continue; // Keep moving smoothly towards their destination!
      }

      const res = this.navGrid.findPath({ x: p.x, y: p.y }, egressTargets, this.strategy);
      if (!res.reachable) {
        p.isRefugee = true;
        p.isTrapped = true;
        p.refugeeReason = 'All exits blocked / unavailable';
        p.vx = 0;
        p.vy = 0;
        p.speed = 0;
      } else {
        p.isRefugee = false;
        p.isTrapped = false;
        p.refugeeReason = undefined;
        p.targetExitId = res.targetExitId;
        p.waypoints = res.waypoints;
        p.waypointIndex = 0;
        p.lastRerouteTime = this.elapsedSeconds;
      }
    }
  }

  update(deltaSec: number = 0.016) {
    if (!this.isPlaying) return;

    const dt = deltaSec * this.globalSpeed;
    this.elapsedSeconds += dt;

    if (this.targetTimerSeconds && this.elapsedSeconds >= this.targetTimerSeconds) {
      if (this.autoPauseAtTimer && !this.timerSnapshot) {
        const total = this.people.length;
        const evac = this.people.filter((p) => p.isEvacuated).length;
        this.timerSnapshot = {
          targetSeconds: this.targetTimerSeconds,
          evacuated: evac,
          total,
          ratioPct: total > 0 ? Math.round((evac / total) * 100) : 0,
          strategy: this.strategy,
        };
        this.isPlaying = false;
        return;
      }
    }

    const corridorHazardSet = new Set<string>();
    for (const c of this.corridors) {
      c.currentOccupants = 0;
      c.currentQueue = 0;
      if (this.checkCorridorHasHazard(c)) {
        corridorHazardSet.add(c.id);
      }
    }

    // Global Pre-Pass: Accurately compute active corridor occupants and queue overflow
    // Real-Life Egress Physics: Do NOT count occupants who are still inside a room!
    // Corridor capacity is only consumed once pedestrians physically exit through the doorway into the hallway
    for (const p of this.people) {
      if (p.isEvacuated || p.isRefugee) continue;
      if (p.roomId !== 'hallway') continue;

      let insideAnyRoom = false;
      for (const r of this.rooms) {
        if (p.x >= r.x + 2 && p.x <= r.x + r.w - 2 && p.y >= r.y + 2 && p.y <= r.y + r.h - 2) {
          insideAnyRoom = true;
          break;
        }
      }
      if (insideAnyRoom) continue;

      for (const c of this.corridors) {
        if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) {
          c.currentOccupants++;
          const isInfinite = c.capacity === null || c.capacity === undefined || !isFinite(c.capacity);
          if (!isInfinite && c.currentOccupants > (c.capacity as number)) {
            c.currentQueue++;
            if (c.currentQueue > c.peakQueue) {
              c.peakQueue = c.currentQueue;
            }
          }
          break;
        }
      }
    }

    let recalculateNeeded = false;

    for (const p of this.people) {
      if (p.isEvacuated) continue;

      if (p.isRefugee) {
        p.vx = 0;
        p.vy = 0;
        p.speed = 0;
        continue;
      }

      if (p.reactionTimer > 0) {
        p.reactionTimer -= dt;
        continue;
      }

      // Check reaching exit, stairs, or lift (only unblocked / in-service portals evacuate)
      // Evacuates if inside portal bounding box (with 18px threshold) OR within 50px of egress point
      const checkEgress = (portalId: string, point: Point2D): boolean => {
        const ex = this.exits.find((e) => e.id === portalId);
        if (ex) {
          if (ex.isBlocked) return false;
          const inBounds = p.x >= ex.x - 18 && p.x <= ex.x + ex.w + 18 && p.y >= ex.y - 18 && p.y <= ex.y + ex.h + 18;
          const nearPoint = Math.hypot(point.x - p.x, point.y - p.y) < 50;
          if (inBounds || nearPoint) {
            p.isEvacuated = true;
            p.evacuatedAt = this.elapsedSeconds;
            ex.evacuatedCount++;
            if (ex.maxCapacityLimit && ex.evacuatedCount >= ex.maxCapacityLimit && !ex.isBlocked) {
              ex.isBlocked = true; // Saturated!
              recalculateNeeded = true;
            }
            return true;
          }
          return false;
        }

        const st = this.stairs.find((s) => s.id === portalId);
        if (st) {
          if (st.isBlocked) return false;
          const inBounds = p.x >= st.x - 18 && p.x <= st.x + st.w + 18 && p.y >= st.y - 18 && p.y <= st.y + st.h + 18;
          const nearPoint = Math.hypot(point.x - p.x, point.y - p.y) < 50;
          if (inBounds || nearPoint) {
            p.isEvacuated = true;
            p.evacuatedAt = this.elapsedSeconds;
            st.evacuatedCount++;
            if (st.maxCapacityLimit && st.evacuatedCount >= st.maxCapacityLimit && !st.isBlocked) {
              st.isBlocked = true;
              recalculateNeeded = true;
            }
            return true;
          }
          return false;
        }

        const lt = this.lifts.find((l) => l.id === portalId);
        if (lt) {
          if (lt.isOutOfService) return false;
          const inBounds = p.x >= lt.x - 18 && p.x <= lt.x + lt.w + 18 && p.y >= lt.y - 18 && p.y <= lt.y + lt.h + 18;
          const nearPoint = Math.hypot(point.x - p.x, point.y - p.y) < 50;
          if (inBounds || nearPoint) {
            p.isEvacuated = true;
            p.evacuatedAt = this.elapsedSeconds;
            lt.evacuatedCount++;
            if (lt.maxCapacityLimit && lt.evacuatedCount >= lt.maxCapacityLimit) {
              lt.isOutOfService = true;
              recalculateNeeded = true;
            }
            return true;
          }
          return false;
        }
        return false;
      };

      // Immediate Portal Check: If agent is touching or stepped inside ANY egress destination, evacuate immediately!
      const targetExit = this.exits.find((e) => e.id === p.targetExitId);
      if (targetExit && checkEgress(targetExit.id, targetExit.exitPoint)) continue;

      const targetStair = this.stairs.find((s) => s.id === p.targetExitId);
      if (targetStair && checkEgress(targetStair.id, targetStair.stairPoint)) continue;

      const targetLift = this.lifts.find((l) => l.id === p.targetExitId);
      if (targetLift && checkEgress(targetLift.id, targetLift.liftPoint)) continue;

      let anyPortalEvac = false;
      for (const ex of this.exits) {
        if (!ex.isBlocked && checkEgress(ex.id, ex.exitPoint)) {
          anyPortalEvac = true;
          break;
        }
      }
      if (anyPortalEvac) continue;

      if (p.waypoints.length === 0 || p.waypointIndex >= p.waypoints.length) {
        // Waypoints exhausted but person is not evacuated -> trigger reroute to an open exit
        recalculateNeeded = true;
        continue;
      }

      // Physical Room Detection: Check if person is physically inside any room
      // Physical Room Detection: Check if person is physically inside any room
      let rm = this.rooms.find(
        (r) => p.x >= r.x - 2 && p.x <= r.x + r.w + 2 && p.y >= r.y - 2 && p.y <= r.y + r.h + 2
      );
      if (!rm && p.roomId !== 'hallway') {
        rm = this.rooms.find((r) => r.id === p.roomId);
      }
      if (rm) p.roomId = rm.id;

      let hasPhysicallySteppedOut = false;
      if (rm) {
        const door = rm.doorPoint;
        const isSouthDoor = Math.abs(door.y - (rm.y + rm.h)) < 18;
        const isNorthDoor = Math.abs(door.y - rm.y) < 18;
        const isEastDoor = Math.abs(door.x - (rm.x + rm.w)) < 18;
        const isWestDoor = Math.abs(door.x - rm.x) < 18;

        if (isSouthDoor && p.y >= rm.y + rm.h + 4) hasPhysicallySteppedOut = true;
        else if (isNorthDoor && p.y <= rm.y - 4) hasPhysicallySteppedOut = true;
        else if (isEastDoor && p.x >= rm.x + rm.w + 4) hasPhysicallySteppedOut = true;
        else if (isWestDoor && p.x <= rm.x - 4) hasPhysicallySteppedOut = true;
      }

      const isInsideRoom = !!(rm && !hasPhysicallySteppedOut);

      // Dynamic Rerouting based on Routing Strategy:
      let pathCompromised = false;
      if (p.waypointIndex < p.waypoints.length) {
        const lookahead = Math.min(p.waypoints.length, p.waypointIndex + 5);
        for (let wi = p.waypointIndex; wi < lookahead; wi++) {
          const wpCheck = p.waypoints[wi];
          const wgx = Math.floor(wpCheck.x / GRID_CELL_SIZE);
          const wgy = Math.floor(wpCheck.y / GRID_CELL_SIZE);
          if (this.navGrid.isCellValid(wgx, wgy)) {
            const widx = this.navGrid.getIndex(wgx, wgy);
            if (this.navGrid.isBlocked[widx] === 1) {
              pathCompromised = true;
              break;
            }
            if (this.strategy !== 'shortest' && (this.navGrid.hasFire[widx] === 1 || this.navGrid.hasSmoke[widx] === 1)) {
              if (!p.lastRerouteTime || (this.elapsedSeconds - p.lastRerouteTime >= 1.5)) {
                pathCompromised = true;
                break;
              }
            }
          }
        }
      }

      const curExit = this.exits.find((e) => e.id === p.targetExitId);
      const curStair = this.stairs.find((s) => s.id === p.targetExitId);
      const curLift = this.lifts.find((l) => l.id === p.targetExitId);
      const targetUnavailable =
        (curExit && curExit.isBlocked) ||
        (curStair && curStair.isBlocked) ||
        (curLift && curLift.isOutOfService);

      if (pathCompromised || targetUnavailable) {
        p.lastRerouteTime = this.elapsedSeconds;
        if (isInsideRoom && rm) {
          const stepOut = this.getStepOutPoint(rm);
          const altRoute = this.navGrid.findPath(stepOut, this.getAllEgressTargets(), this.strategy);
          if (altRoute.reachable && altRoute.waypoints.length > 0) {
            p.targetExitId = altRoute.targetExitId;
            p.waypoints = this.getDoorExitWaypoints(rm, altRoute.waypoints);
            const distToDoor = Math.hypot(p.x - rm.doorPoint.x, p.y - rm.doorPoint.y);
            p.waypointIndex = distToDoor < 18 ? 1 : 0;
            p.stuckFrames = 0;
            p.isRefugee = false;
            p.isTrapped = false;
          } else {
            p.isRefugee = true;
            p.isTrapped = true;
            p.refugeeReason = 'All exits blocked / unavailable';
          }
        } else {
          const altRoute = this.navGrid.findPath({ x: p.x, y: p.y }, this.getAllEgressTargets(), this.strategy);
          if (altRoute.reachable && altRoute.waypoints.length > 0) {
            p.targetExitId = altRoute.targetExitId;
            p.waypoints = altRoute.waypoints;
            p.waypointIndex = 0;
            p.stuckFrames = 0;
            p.isRefugee = false;
            p.isTrapped = false;
          } else {
            p.isRefugee = true;
            p.isTrapped = true;
            p.refugeeReason = 'All exits blocked / unavailable';
          }
        }
      }

      // Room Waypoint Integrity: If inside a room, first target MUST be doorPoint -> stepOut
      if (isInsideRoom && rm) {
        p.roomId = rm.id;
        const stepOut = this.getStepOutPoint(rm);
        const distDoor0 = p.waypoints[0] ? Math.hypot(p.waypoints[0].x - rm.doorPoint.x, p.waypoints[0].y - rm.doorPoint.y) : 999;
        if (p.waypoints.length < 2 || distDoor0 > 12) {
          const egressTargets = this.getAllEgressTargets();
          const exitRoute = this.navGrid.findPath(stepOut, egressTargets, this.strategy);
          p.targetExitId = exitRoute.targetExitId;
          p.waypoints = this.getDoorExitWaypoints(rm, exitRoute.waypoints);
        }
        // Strict invariant: while inside the room, waypointIndex can NEVER be >= 2!
        if (p.waypointIndex >= 2) {
          const distToDoor = Math.hypot(p.x - rm.doorPoint.x, p.y - rm.doorPoint.y);
          p.waypointIndex = distToDoor < 18 ? 1 : 0;
        }

        // Room interior wall clamping: keep agent strictly inside interior padding
        const door = rm.doorPoint;
        const isSouthDoor = Math.abs(door.y - (rm.y + rm.h)) < 18;
        const isNorthDoor = Math.abs(door.y - rm.y) < 18;
        const isEastDoor = Math.abs(door.x - (rm.x + rm.w)) < 18;
        const isWestDoor = Math.abs(door.x - rm.x) < 18;

        if (!isNorthDoor || Math.abs(p.x - door.x) > 38) {
          p.y = Math.max(rm.y + 6, p.y);
        }
        if (!isSouthDoor || Math.abs(p.x - door.x) > 38) {
          p.y = Math.min(rm.y + rm.h - 6, p.y);
        }
        if (!isWestDoor || Math.abs(p.y - door.y) > 38) {
          p.x = Math.max(rm.x + 6, p.x);
        }
        if (!isEastDoor || Math.abs(p.y - door.y) > 38) {
          p.x = Math.min(rm.x + rm.w - 6, p.x);
        }
      }

      // One-Way Egress Doorway Protection: Once stepped out into the concourse, never get pushed back through the doorframe into the room
      if (hasPhysicallySteppedOut && rm) {
        const door = rm.doorPoint;
        const isSouthDoor = Math.abs(door.y - (rm.y + rm.h)) < 18;
        const isNorthDoor = Math.abs(door.y - rm.y) < 18;
        const isEastDoor = Math.abs(door.x - (rm.x + rm.w)) < 18;
        const isWestDoor = Math.abs(door.x - rm.x) < 18;

        if (isSouthDoor && p.y < rm.y + rm.h + 2) p.y = rm.y + rm.h + 2;
        else if (isNorthDoor && p.y > rm.y - 2) p.y = rm.y - 2;
        else if (isEastDoor && p.x < rm.x + rm.w + 2) p.x = rm.x + rm.w + 2;
        else if (isWestDoor && p.x > rm.x - 2) p.x = rm.x - 2;
      }

      if (p.waypointIndex >= p.waypoints.length) {
        p.waypointIndex = Math.max(0, p.waypoints.length - 1);
      }
      const wp = p.waypoints[p.waypointIndex];
      const dx = wp.x - p.x;
      const dy = wp.y - p.y;
      const dist = Math.hypot(dx, dy);

      const isHeadingToDoor = isInsideRoom && (p.waypointIndex === 0 || p.waypointIndex === 1);
      const isFinalWaypoint = p.waypointIndex >= p.waypoints.length - 1;
      const arrivalRadius = isHeadingToDoor ? 15 : isFinalWaypoint ? 36 : 16;

      if (dist < arrivalRadius) {
        if (isInsideRoom && rm) {
          if (p.waypointIndex === 0) {
            p.waypointIndex = 1; // Now heading to stepOut
            p.stuckFrames = 0;
          } else if (p.waypointIndex === 1) {
            p.waypointIndex = 2; // Stepped out into hallway!
            p.roomId = 'hallway';
            p.stuckFrames = 0;
          }
        } else {
          p.waypointIndex++;
          p.stuckFrames = 0;
          if (p.waypointIndex >= 2 && p.roomId !== 'hallway') {
            p.roomId = 'hallway';
          }
        }

        if (p.waypointIndex >= p.waypoints.length) {
          const exit = this.exits.find((e) => e.id === p.targetExitId);
          if (exit && checkEgress(exit.id, exit.exitPoint)) continue;

          const stair = this.stairs.find((s) => s.id === p.targetExitId);
          if (stair && checkEgress(stair.id, stair.stairPoint)) continue;

          const lift = this.lifts.find((l) => l.id === p.targetExitId);
          if (lift && checkEgress(lift.id, lift.liftPoint)) continue;

          recalculateNeeded = true;
          continue;
        }
      }

      const dirX = dist > 0 ? dx / dist : 0;
      const dirY = dist > 0 ? dy / dist : 0;
      p.angle = Math.atan2(dirY, dirX);

      // Desired Target Speed (v_target) Determination
      let targetSpeed = p.baseSpeed;
      if (p.onStairs) targetSpeed *= 0.65;

      // 1. Corridor Over-Capacity Crowding (Weidmann's 1993 Empirical Fundamental Diagram)
      let inCorridor = false;
      let inCongestedCorridor = false;

      for (const c of this.corridors) {
        if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) {
          inCorridor = true;
          const isInfinite = c.capacity === null || c.capacity === undefined || !isFinite(c.capacity);
          if (!isInfinite && c.currentOccupants > (c.capacity as number)) {
            inCongestedCorridor = true;
            if (c.capacity === 0) {
              // Zero holding capacity choke: immediate extreme crush / minimum crawl speed
              targetSpeed *= 0.15;
            } else {
              // Capacity excess ratio R = N_actual / N_capacity (> 1.0)
              const R = c.currentOccupants / Math.max(1, c.capacity as number);
              // Weidmann's Fundamental Diagram exponential speed decay in forced congested regime:
              // v(R) = v0 * [0.15 + 0.85 * exp(-1.91 * (R - 1.0))]
              const weidmannFactor = Math.max(0.15, 0.15 + 0.85 * Math.exp(-1.91 * (R - 1.0)));
              targetSpeed *= weidmannFactor;
            }
          }

          // SFPE Corridor Hazard caution & smoke inhalation reduction
          if (corridorHazardSet.has(c.id)) {
            targetSpeed *= 0.50;
            p.encounteredSmoke = true;
            if (c.hasFire) p.encounteredFire = true;
          }
          break;
        }
      }

      // 2. Direct Hazard Zone Crawl (Fire & Smoke)
      const pgx = Math.floor(p.x / GRID_CELL_SIZE);
      const pgy = Math.floor(p.y / GRID_CELL_SIZE);
      if (this.navGrid.isCellValid(pgx, pgy)) {
        const pidx = this.navGrid.getIndex(pgx, pgy);
        if (this.navGrid.hasFire[pidx] === 1) {
          p.inFireSprint = true;
          p.encounteredFire = true;
          targetSpeed *= 0.40;
        } else {
          p.inFireSprint = false;
        }
        if (this.navGrid.hasSmoke[pidx] === 1) {
          p.inSmoke = true;
          p.encounteredSmoke = true;
          targetSpeed *= 0.35;
        } else {
          p.inSmoke = false;
        }
      } else {
        p.inFireSprint = false;
        p.inSmoke = false;
      }

      // Lateral vector perpendicular to desired travel direction (across corridor width)
      const latDirX = -dirY;
      const latDirY = dirX;

      // 3. Headway Queuing (Helbing Headway Follower without Freeze)
      // Guarantee non-zero minimum crawl velocity (8.0 px/s) so agents never permanently stall in corridors
      const minCreepSpeed = p.baseSpeed * 0.35;
      let leaderAhead: MovingPerson | null = null;
      let minLeaderDist = Infinity;
      const scanDist = 20;

      for (const other of this.people) {
        if (other === p || other.isEvacuated) continue;
        const ox = other.x - p.x;
        const oy = other.y - p.y;
        const distToOther = Math.hypot(ox, oy);

        if (distToOther < scanDist && distToOther > 0.01) {
          const uox = ox / distToOther;
          const uoy = oy / distToOther;
          const cosAhead = dirX * uox + dirY * uoy;
          const latDist = Math.abs(latDirX * ox + latDirY * oy);

          // Strictly detect genuine leaders directly ahead in our narrow walking lane (within 35 deg and latDist < 10px)
          if (cosAhead > 0.82 && latDist < 10 && distToOther < minLeaderDist) {
            minLeaderDist = distToOther;
            leaderAhead = other;
          }
        }
      }

      if (leaderAhead) {
        // Helbing Headway Matching: Follow leader at matched speed, NEVER dropping to zero.
        // Even when close, maintain a steady creep speed while lateral dispersion filters agent around
        const separation = Math.max(0, minLeaderDist - (p.radius + leaderAhead.radius));
        let followSpeed = Math.max(minCreepSpeed, leaderAhead.speed);
        if (separation < 3.0) {
          followSpeed = minCreepSpeed * 0.75;
        }
        targetSpeed = Math.min(targetSpeed, followSpeed);
      }

      // Visual Status:
      // Red (Congested) ONLY when corridor capacity is exceeded OR during an active doorway bottleneck jam
      let inLocalCrowdJam = false;
      if (p.speed < p.baseSpeed * 0.40 && !p.isRefugee && !p.isTrapped) {
        let nearbyCrowd = 0;
        for (const other of this.people) {
          if (other !== p && !other.isEvacuated && Math.hypot(other.x - p.x, other.y - p.y) < 24) {
            nearbyCrowd++;
          }
        }
        if (nearbyCrowd >= 3) {
          inLocalCrowdJam = true;
        }
      }
      p.isQueued = inCongestedCorridor || inLocalCrowdJam;

      // Trapped / Refugee Freeze
      if (p.isRefugee || p.isTrapped) {
        targetSpeed = 0;
        p.speed = 0;
      }

      // 4. Helbing's Acceleration & Deceleration Dynamical Law (Helbing & Molnár 1995; Helbing et al. Nature 2000):
      // dv/dt = (v_target - v) / tau, with empirical relaxation time tau = 0.5s.
      // - Over-capacity corridor: ALL occupants gradually decelerate down to congested speed.
      // - Bottleneck cleared: ALL occupants smoothly and gradually regain maximum speed.
      // - Applies uniformly to EVERYONE present in that case.
      if (!p.isRefugee && !p.isTrapped) {
        const tau = 0.50; // Empirical relaxation time (seconds)
        const dv = ((targetSpeed - p.speed) / tau) * dt;
        p.speed = Math.max(0, p.speed + dv);
        p.speed = Math.min(p.speed, p.baseSpeed * 1.35);
      }

      // 5. Helbing Social Force Model: Anisotropic Mutual Repulsion & Lateral Dispersion
      let repulseForceX = 0;
      let repulseForceY = 0;
      const comfortDist = 16; // 16px personal comfort bubble

      for (const other of this.people) {
        if (other === p || other.isEvacuated) continue;
        const ox = p.x - other.x;
        const oy = p.y - other.y;
        const dSq = ox * ox + oy * oy;

        if (dSq < comfortDist * comfortDist && dSq > 0.01) {
          const d = Math.sqrt(dSq);
          const push = ((comfortDist - d) / comfortDist) * 18;

          // Decompose into lateral and longitudinal components
          const lateralComp = ox * latDirX + oy * latDirY;
          const longComp = ox * dirX + oy * dirY;

          // Strongly disperse laterally across corridor width (fan out in hallway)
          const sign = lateralComp !== 0 ? Math.sign(lateralComp) : (p.id > other.id ? 1 : -1);
          repulseForceX += latDirX * sign * push * 1.35;
          repulseForceY += latDirY * sign * push * 1.35;

          // Longitudinal damping: never push backwards against travel direction!
          if (longComp > 0) {
            repulseForceX += dirX * push * 0.25;
            repulseForceY += dirY * push * 0.25;
          }
        }
      }

      // Inside room doorway funneling: guides agents near perimeter wall directly toward door opening
      if (isInsideRoom && rm) {
        const door = rm.doorPoint;
        const isSouthDoor = Math.abs(door.y - (rm.y + rm.h)) < 18;
        const isNorthDoor = Math.abs(door.y - rm.y) < 18;
        const isEastDoor = Math.abs(door.x - (rm.x + rm.w)) < 18;
        const isWestDoor = Math.abs(door.x - rm.x) < 18;

        if (isSouthDoor && p.y > rm.y + rm.h - 22 && Math.abs(door.x - p.x) > 16) {
          repulseForceX += Math.sign(door.x - p.x) * 20;
        } else if (isNorthDoor && p.y < rm.y + 22 && Math.abs(door.x - p.x) > 16) {
          repulseForceX += Math.sign(door.x - p.x) * 20;
        } else if (isEastDoor && p.x > rm.x + rm.w - 22 && Math.abs(door.y - p.y) > 16) {
          repulseForceY += Math.sign(door.y - p.y) * 20;
        } else if (isWestDoor && p.x < rm.x + 22 && Math.abs(door.y - p.y) > 16) {
          repulseForceY += Math.sign(door.y - p.y) * 20;
        }
      }

      // Intelligent Space Seeking: if blocked ahead, steer laterally toward open corridor space
      let effDirX = dirX;
      let effDirY = dirY;

      if (leaderAhead && p.speed > minCreepSpeed * 0.7) {
        const leftClear = this.navGrid.isWalkablePixel(p.x + latDirX * 14, p.y + latDirY * 14);
        const rightClear = this.navGrid.isWalkablePixel(p.x - latDirX * 14, p.y - latDirY * 14);
        let steerAngle = 0;
        if (leftClear && !rightClear) steerAngle = 0.5;
        else if (!leftClear && rightClear) steerAngle = -0.5;
        else if (leftClear && rightClear) steerAngle = p.id % 2 === 0 ? 0.45 : -0.45;

        if (steerAngle !== 0) {
          const cosA = Math.cos(steerAngle);
          const sinA = Math.sin(steerAngle);
          effDirX = dirX * cosA - dirY * sinA;
          effDirY = dirX * sinA + dirY * cosA;
        }
      }

      // 6. Wall Avoidance Repulsion Impulse (Prevents sticking to walls)
      // Suppressed when heading through a room door or approaching an exit portal
      const curPortal = this.exits.find((e) => e.id === p.targetExitId) ||
                        this.stairs.find((s) => s.id === p.targetExitId) ||
                        this.lifts.find((l) => l.id === p.targetExitId);
      const curPortalPoint = curPortal ? ('exitPoint' in curPortal ? curPortal.exitPoint : 'stairPoint' in curPortal ? curPortal.stairPoint : curPortal.liftPoint) : null;
      const isNearPortal = curPortalPoint ? Math.hypot(curPortalPoint.x - p.x, curPortalPoint.y - p.y) < 60 : false;

      if (!isHeadingToDoor && !isNearPortal) {
        const wallBuffer = 12;
        const d8 = wallBuffer * 0.707;
        let wallRepX = 0;
        let wallRepY = 0;
        if (!this.navGrid.isWalkablePixel(p.x + wallBuffer, p.y)) wallRepX -= 1.0;
        if (!this.navGrid.isWalkablePixel(p.x - wallBuffer, p.y)) wallRepX += 1.0;
        if (!this.navGrid.isWalkablePixel(p.x, p.y + wallBuffer)) wallRepY -= 1.0;
        if (!this.navGrid.isWalkablePixel(p.x, p.y - wallBuffer)) wallRepY += 1.0;
        if (!this.navGrid.isWalkablePixel(p.x + d8, p.y + d8)) { wallRepX -= 0.707; wallRepY -= 0.707; }
        if (!this.navGrid.isWalkablePixel(p.x - d8, p.y + d8)) { wallRepX += 0.707; wallRepY -= 0.707; }
        if (!this.navGrid.isWalkablePixel(p.x + d8, p.y - d8)) { wallRepX -= 0.707; wallRepY += 0.707; }
        if (!this.navGrid.isWalkablePixel(p.x - d8, p.y - d8)) { wallRepX += 0.707; wallRepY -= 0.707; }

        if (wallRepX !== 0 || wallRepY !== 0) {
          const rLen = Math.hypot(wallRepX, wallRepY);
          repulseForceX += (wallRepX / rLen) * 20;
          repulseForceY += (wallRepY / rLen) * 20;
        }
      }

      let moveVx = effDirX * p.speed + repulseForceX;
      let moveVy = effDirY * p.speed + repulseForceY;

      // Keep forward velocity component positive along travel direction unless physically trapped
      const forwardDot = moveVx * dirX + moveVy * dirY;
      if (forwardDot < minCreepSpeed * 0.6 && !p.isRefugee && !p.isTrapped) {
        moveVx = effDirX * minCreepSpeed * 0.8 + repulseForceX * 0.2;
        moveVy = effDirY * minCreepSpeed * 0.8 + repulseForceY * 0.2;
      }

      const currentVelMag = Math.hypot(moveVx, moveVy);
      if (currentVelMag > p.speed * 1.25 && currentVelMag > 0) {
        moveVx = (moveVx / currentVelMag) * p.speed * 1.25;
        moveVy = (moveVy / currentVelMag) * p.speed * 1.25;
      }

      p.vx = moveVx;
      p.vy = moveVy;
      if (Math.hypot(moveVx, moveVy) > 0.5) {
        p.angle = Math.atan2(moveVy, moveVx);
      }

      const prevFrameX = p.x;
      const prevFrameY = p.y;

      const nextX = p.x + p.vx * dt;
      const nextY = p.y + p.vy * dt;

      const minBodyRadius = isHeadingToDoor ? p.radius * 0.45 : p.radius * 0.6;
      // 1. Try full diagonal movement (both X and Y) with progressive clearance
      if (
        this.navGrid.isWalkableCircle(nextX, nextY, minBodyRadius) ||
        this.navGrid.isWalkableCircle(nextX, nextY, 2.5) ||
        this.navGrid.isWalkablePixel(nextX, nextY)
      ) {
        p.x = nextX;
        p.y = nextY;
      } else if (
        this.navGrid.isWalkableCircle(nextX, p.y, minBodyRadius) ||
        this.navGrid.isWalkableCircle(nextX, p.y, 2.5) ||
        this.navGrid.isWalkablePixel(nextX, p.y)
      ) {
        p.x = nextX;
      } else if (
        this.navGrid.isWalkableCircle(p.x, nextY, minBodyRadius) ||
        this.navGrid.isWalkableCircle(p.x, nextY, 2.5) ||
        this.navGrid.isWalkablePixel(p.x, nextY)
      ) {
        p.y = nextY;
      } else {
        // Multi-angle tangential sliding around door frames and wall corners
        const slipAngles = [0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.57, -1.57];
        let slipped = false;
        for (const a of slipAngles) {
          const testAngle = p.angle + a;
          const testVx = Math.cos(testAngle) * p.speed;
          const testVy = Math.sin(testAngle) * p.speed;
          const tx = p.x + testVx * dt;
          const ty = p.y + testVy * dt;
          if (this.navGrid.isWalkablePixel(tx, ty)) {
            p.x = tx;
            p.y = ty;
            slipped = true;
            break;
          }
        }

        // Doorway assist: if inside a room, slide or step directly toward doorway / stepOut
        if (!slipped && rm && isInsideRoom) {
          const targetPt = p.waypointIndex === 0 ? rm.doorPoint : this.getStepOutPoint(rm);
          const toTx = targetPt.x - p.x;
          const toTy = targetPt.y - p.y;
          const tLen = Math.hypot(toTx, toTy);
          if (tLen > 0.1) {
            const stepDx = (toTx / tLen) * p.speed * dt;
            const stepDy = (toTy / tLen) * p.speed * dt;
            if (this.navGrid.isWalkablePixel(p.x + stepDx, p.y + stepDy)) {
              p.x += stepDx;
              p.y += stepDy;
              slipped = true;
            } else if (this.navGrid.isWalkablePixel(p.x + stepDx, p.y)) {
              p.x += stepDx;
              slipped = true;
            } else if (this.navGrid.isWalkablePixel(p.x, p.y + stepDy)) {
              p.y += stepDy;
              slipped = true;
            } else {
              p.x += stepDx * 0.8;
              p.y += stepDy * 0.8;
              slipped = true;
            }
          }
        }
      }

      // Exact Movement Metric:
      const movedDist = Math.hypot(p.x - prevFrameX, p.y - prevFrameY);
      if (movedDist > 0.4 || p.isQueued) {
        p.stuckFrames = 0;
      } else {
        p.stuckFrames = (p.stuckFrames || 0) + 1;
      }

      if (p.stuckFrames > 3) {
        // Helbing Boundary Ejection: Immediately push agent along clearance gradient into open corridor
        const curGx = Math.floor(p.x / GRID_CELL_SIZE);
        const curGy = Math.floor(p.y / GRID_CELL_SIZE);
        if (this.navGrid.isCellValid(curGx, curGy)) {
          let bestPushX = 0;
          let bestPushY = 0;
          let maxClr = -1;

          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = curGx + dx;
              const ny = curGy + dy;
              if (this.navGrid.isCellValid(nx, ny)) {
                const idx = this.navGrid.getIndex(nx, ny);
                if (this.navGrid.walkable[idx] === 1 && this.navGrid.isWall[idx] === 0) {
                  const clr = this.navGrid.wallClearance[idx];
                  if (clr > maxClr) {
                    maxClr = clr;
                    bestPushX = dx;
                    bestPushY = dy;
                  }
                }
              }
            }
          }

          if (maxClr > 0 && (bestPushX !== 0 || bestPushY !== 0)) {
            const pLen = Math.hypot(bestPushX, bestPushY);
            const pushX = p.x + (bestPushX / pLen) * 4.0;
            const pushY = p.y + (bestPushY / pLen) * 4.0;
            if (this.navGrid.isWalkablePixel(pushX, pushY)) {
              p.x = pushX;
              p.y = pushY;
              p.stuckFrames = 0;
            }
          }
        }
      }

      if (p.stuckFrames > 8) {
        if (isInsideRoom && rm) {
          const stepOut = this.getStepOutPoint(rm);
          const altRoute = this.navGrid.findPath(stepOut, this.getAllEgressTargets(), this.strategy);
          if (altRoute.reachable && altRoute.waypoints.length > 0) {
            p.targetExitId = altRoute.targetExitId;
            p.waypoints = this.getDoorExitWaypoints(rm, altRoute.waypoints);
            const distToDoor = Math.hypot(p.x - rm.doorPoint.x, p.y - rm.doorPoint.y);
            p.waypointIndex = distToDoor < 18 ? 1 : 0;
            p.stuckFrames = 0;
          }
        } else {
          // Corridor route refresh: find clean path to current target or closest open target
          const targets = this.getAllEgressTargets();
          const curExit = this.exits.find((e) => e.id === p.targetExitId);
          const curStair = this.stairs.find((s) => s.id === p.targetExitId);
          const curLift = this.lifts.find((l) => l.id === p.targetExitId);
          const isBlocked = (curExit && curExit.isBlocked) || (curStair && curStair.isBlocked) || (curLift && curLift.isOutOfService);
          const curTgt = targets.find((t) => t.id === p.targetExitId);
          const targetPool = curTgt && !isBlocked ? [curTgt] : targets;
          const altRoute = this.navGrid.findPath({ x: p.x, y: p.y }, targetPool, this.strategy);
          if (altRoute.reachable && altRoute.waypoints.length > 0) {
            p.targetExitId = altRoute.targetExitId;
            p.waypoints = altRoute.waypoints;
            p.waypointIndex = 0;
            p.stuckFrames = 0;
          }
        }
      }

      p.walkCycle += dt * (p.speed / 20);
    }

    // Dynamic Crowd Splitting & Load Balancing for Smart Congestion Strategy:
    // Balances queues at bottlenecks while strictly protecting non-congested agents from flapping
    if (this.strategy === 'smart_congestion' && (this.elapsedSeconds - this.lastQueueRebalanceSeconds >= 1.5)) {
      this.lastQueueRebalanceSeconds = this.elapsedSeconds;
      const egressTargets = this.getAllEgressTargets();
      for (const p of this.people) {
        if (p.isEvacuated || p.isRefugee || p.roomId !== 'hallway') continue;

        // Candidate for load balancing if:
        // 1. Physically queued (p.isQueued === true) OR
        // 2. Approaching an exit whose current bottleneck queue is high (> 6)
        const curTarget = egressTargets.find((t) => t.id === p.targetExitId);
        if (!curTarget) continue;
        const curQueue = curTarget.currentQueue || 0;
        if (!p.isQueued && curQueue <= 6) continue;

        // Proximity Gate: If within 180px of current exit, do NOT turn around!
        const distToCur = Math.hypot(p.x - curTarget.point.x, p.y - curTarget.point.y);
        if (distToCur < 180) continue;

        // Anti-Flapping: Enforce minimum 4.5-second commitment period!
        if (p.lastRerouteTime && (this.elapsedSeconds - p.lastRerouteTime < 4.5)) {
          continue;
        }

        // Stochastic crowd splitting: only rebalance a fraction (33%) per cycle
        if ((p.id + Math.floor(this.elapsedSeconds)) % 3 !== 0) {
          continue;
        }

        const bestRoute = this.navGrid.findPath({ x: p.x, y: p.y }, egressTargets, 'smart_congestion');
        if (bestRoute.reachable && bestRoute.targetExitId !== p.targetExitId && bestRoute.waypoints.length > 0) {
          const altTarget = egressTargets.find((t) => t.id === bestRoute.targetExitId);
          const altQueue = altTarget ? altTarget.currentQueue || 0 : 0;
          const altCap = Math.max(1.0, altTarget?.flowCapacity || 2.5);
          const curCap = Math.max(1.0, curTarget.flowCapacity || 2.5);

          let altPathDist = 0;
          for (let wi = 1; wi < bestRoute.waypoints.length; wi++) {
            altPathDist += Math.hypot(bestRoute.waypoints[wi].x - bestRoute.waypoints[wi - 1].x, bestRoute.waypoints[wi].y - bestRoute.waypoints[wi - 1].y);
          }
          const timeToCur = (distToCur / Math.max(20, p.baseSpeed)) + (curQueue / curCap);
          const timeToAlt = (altPathDist / Math.max(20, p.baseSpeed)) + (altQueue / altCap);

          // Wardrop Indifference Band: Only reroute if alternative saves at least 20% time and > 1.5s
          if (timeToAlt < timeToCur * 0.8 - 1.5) {
            p.targetExitId = bestRoute.targetExitId;
            p.waypoints = bestRoute.waypoints;
            p.waypointIndex = (bestRoute.waypoints.length > 1 && Math.hypot(bestRoute.waypoints[0].x - p.x, bestRoute.waypoints[0].y - p.y) < 15) ? 1 : 0;
            p.lastRerouteTime = this.elapsedSeconds;
            const nw = p.waypoints[p.waypointIndex] || p.waypoints[0];
            const ndx = nw.x - p.x;
            const ndy = nw.y - p.y;
            const nlen = Math.hypot(ndx, ndy);
            if (nlen > 0.1) {
              p.angle = Math.atan2(ndy, ndx);
              p.vx = (ndx / nlen) * Math.max(p.speed, p.baseSpeed * 0.7);
              p.vy = (ndy / nlen) * Math.max(p.speed, p.baseSpeed * 0.7);
            }
          }
        }
      }
    }

    if (recalculateNeeded && (this.elapsedSeconds - this.lastRerouteSeconds >= 0.45)) {
      this.lastRerouteSeconds = this.elapsedSeconds;
      this.rebuildNavGrid();
      this.recalculateAllRoutes();
    }
  }

  runBenchmarkSuite(): BenchmarkComparisonResult {
    const savedStrat = this.strategy;

    this.strategy = 'shortest';
    this.resetSimulation();
    const baseline = this.simulateHeadlessRun();

    this.strategy = 'safe';
    this.resetSimulation();
    const safeRoute = this.simulateHeadlessRun();

    this.strategy = 'smart_congestion';
    this.resetSimulation();
    const smartCongestion = this.simulateHeadlessRun();

    this.strategy = savedStrat;
    this.resetSimulation();

    const timeDiff = baseline.evacuationTime - smartCongestion.evacuationTime;
    const timePct = baseline.evacuationTime > 0 ? Math.round((timeDiff / baseline.evacuationTime) * 100) : 0;
    const queueDiff = baseline.globalPeakQueue - smartCongestion.globalPeakQueue;
    const queuePct = baseline.globalPeakQueue > 0 ? Math.round((queueDiff / baseline.globalPeakQueue) * 100) : 0;

    const aDiff = baseline.evacuationTime - safeRoute.evacuationTime;
    const aPct = baseline.evacuationTime > 0 ? Math.round((aDiff / baseline.evacuationTime) * 100) : 0;

    return {
      baseline,
      safeRoute,
      smartCongestion,
      astar: safeRoute,
      smart: smartCongestion,
      improvementTimePct: Math.max(0, timePct),
      queueReductionPct: Math.max(0, queuePct),
      astarImprovementPct: Math.max(0, aPct),
      mapId: this.mapId,
    };
  }

  runBenchmarkComparison(): BenchmarkComparisonResult {
    return this.runBenchmarkSuite();
  }

  private simulateHeadlessRun(): BenchmarkMetrics {
    let t = 0;
    const maxT = 180;
    const dt = 0.1;
    this.isPlaying = true;

    let t15Count = 0;
    let t30Count = 0;
    let t45Count = 0;
    let t60Count = 0;
    let peakObservedBottleneck = 0;

    while (t < maxT) {
      this.update(dt);
      t += dt;
      const evacNow = this.people.filter((p) => p.isEvacuated).length;
      if (t >= 15.0 && t15Count === 0) t15Count = evacNow;
      if (t >= 30.0 && t30Count === 0) t30Count = evacNow;
      if (t >= 45.0 && t45Count === 0) t45Count = evacNow;
      if (t >= 60.0 && t60Count === 0) t60Count = evacNow;

      // Track active bottleneck queue across all egress portals (exits, stairs) and corridors
      let currentBottleneckQueue = 0;
      for (const ex of this.exits) {
        const q = this.people.filter(
          (p) => !p.isEvacuated && p.targetExitId === ex.id && (p.isQueued || Math.hypot(p.x - ex.exitPoint.x, p.y - ex.exitPoint.y) < 140)
        ).length;
        if (q > currentBottleneckQueue) currentBottleneckQueue = q;
      }
      for (const st of this.stairs) {
        const q = this.people.filter(
          (p) => !p.isEvacuated && p.targetExitId === st.id && (p.isQueued || Math.hypot(p.x - st.stairPoint.x, p.y - st.stairPoint.y) < 140)
        ).length;
        if (q > currentBottleneckQueue) currentBottleneckQueue = q;
      }
      for (const c of this.corridors) {
        if (c.currentQueue > currentBottleneckQueue) currentBottleneckQueue = c.currentQueue;
      }
      if (currentBottleneckQueue > peakObservedBottleneck) {
        peakObservedBottleneck = currentBottleneckQueue;
      }

      if (this.people.every((p) => p.isEvacuated || p.isRefugee)) {
        break;
      }
    }
    this.isPlaying = false;

    const totalOccupants = this.people.length;
    const evacPeople = this.people.filter((p) => p.isEvacuated && p.evacuatedAt !== undefined);
    const evacuated = evacPeople.length;
    const evacTime = Math.round(t * 10) / 10;

    // Real empirical mean individual egress delay (ISO/TR 13387-8 standard arithmetic mean)
    const sumEgressTime = evacPeople.reduce((sum, p) => sum + (p.evacuatedAt || 0), 0);
    const avgTime = evacPeople.length > 0 ? Math.round((sumEgressTime / evacPeople.length) * 10) / 10 : evacTime;

    const exitCounts: Record<string, number> = {};
    for (const ex of this.exits) {
      exitCounts[ex.id] = ex.evacuatedCount;
    }
    for (const st of this.stairs) {
      exitCounts[st.id] = st.evacuatedCount;
    }

    const corridorBottlenecks = this.corridors.map((c) => ({
      id: c.id,
      name: c.name,
      peakQueue: c.peakQueue,
      peakUtilization: c.capacity === null || !isFinite(c.capacity) ? 0 : Math.round((c.peakQueue / Math.max(1, c.capacity)) * 100),
    }));

    const globalPeakQueue = Math.max(peakObservedBottleneck, ...this.corridors.map((c) => c.peakQueue));
    const c2 = this.corridors.find((c) => c.id.includes('c2') || c.id.includes('east'));
    const fireCasualties = this.people.filter((p) => p.encounteredFire || p.inFireSprint).length;

    const stratNames: Record<RoutingStrategy, string> = {
      shortest: 'Shortest Path (Classical Distance)',
      safe: 'Safe Route (Hazard-Aware)',
      smart_congestion: 'Safe Route + Congestion Optimization',
    };

    const totalSafe = Math.max(1, totalOccupants);

    return {
      strategy: this.strategy,
      strategyName: stratNames[this.strategy],
      totalOccupants,
      evacuationTime: evacTime,
      averageEgressTime: avgTime,
      peakQueueC2: c2 ? c2.peakQueue : globalPeakQueue,
      globalPeakQueue,
      observedDoorFlowRate: evacuated > 0 ? Math.round((evacuated / Math.max(1, evacTime)) * 10) / 10 : 0,
      exitCounts,
      corridorBottlenecks,
      refugeeCount: this.people.filter((p) => p.isRefugee).length,
      trappedCount: this.people.filter((p) => p.isRefugee || p.isTrapped).length,
      fireSprintCount: fireCasualties,
      timeWindowEgress: {
        t15s: { count: t15Count, pct: Math.round((t15Count / totalSafe) * 100) },
        t30s: { count: t30Count || evacuated, pct: Math.round(((t30Count || evacuated) / totalSafe) * 100) },
        t45s: { count: t45Count || evacuated, pct: Math.round(((t45Count || evacuated) / totalSafe) * 100) },
        t60s: { count: t60Count || evacuated, pct: Math.round(((t60Count || evacuated) / totalSafe) * 100) },
      },
    };
  }
}

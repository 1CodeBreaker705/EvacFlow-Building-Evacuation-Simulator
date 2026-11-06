import { MapDefinition, AgentDot, FireHazard, RoutingStrategy, Point } from './types';

export interface EngineConfig {
  crowdSize: number;
  globalSpeed: number;
  doorCapacityMultiplier: number;
  strategy: RoutingStrategy;
}

const AGENT_COLORS = [
  '#38bdf8', // light cyan
  '#818cf8', // indigo
  '#a78bfa', // purple
  '#34d399', // emerald
  '#fbbf24', // amber
  '#f472b6', // pink
];

export class DotSimulationEngine {
  map: MapDefinition;
  config: EngineConfig;
  agents: AgentDot[] = [];
  fires: FireHazard[] = [];
  elapsedSeconds: number = 0;
  totalEvacuated: number = 0;
  peakQueue: number = 0;
  primaryBottleneck: string = 'None';
  isFinished: boolean = false;

  constructor(map: MapDefinition, config: EngineConfig) {
    this.map = map;
    this.config = config;
    this.initAgents();
  }

  setMap(map: MapDefinition) {
    this.map = map;
    this.fires = [];
    this.reset();
  }

  setConfig(config: Partial<EngineConfig>) {
    const oldCrowd = this.config.crowdSize;
    this.config = { ...this.config, ...config };

    if (config.strategy !== undefined) {
      this.recalculateRoutes();
    }
    if (config.crowdSize !== undefined && config.crowdSize !== oldCrowd) {
      this.adjustCrowdSize();
    }
  }

  toggleFire(x: number, y: number) {
    // Check if clicked near an existing fire -> remove it
    const existingIdx = this.fires.findIndex((f) => Math.hypot(f.x - x, f.y - y) < f.radius + 15);
    if (existingIdx >= 0) {
      this.fires.splice(existingIdx, 1);
    } else {
      this.fires.push({
        id: `fire_${Date.now()}`,
        x,
        y,
        radius: 45,
      });
    }
    this.recalculateRoutes();
  }

  clearFires() {
    this.fires = [];
    this.recalculateRoutes();
  }

  reset() {
    this.elapsedSeconds = 0;
    this.totalEvacuated = 0;
    this.peakQueue = 0;
    this.primaryBottleneck = 'None';
    this.isFinished = false;
    this.initAgents();
  }

  private initAgents() {
    this.agents = [];
    const rooms = this.map.rooms;
    if (rooms.length === 0) return;

    const perRoom = Math.max(1, Math.floor(this.config.crowdSize / rooms.length));
    let idCounter = 1;

    for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
      const room = rooms[rIdx];
      const count = rIdx === rooms.length - 1 ? this.config.crowdSize - (rooms.length - 1) * perRoom : perRoom;

      for (let i = 0; i < count; i++) {
        // Spawn randomly inside room boundaries
        const padding = 16;
        const x = room.x + padding + Math.random() * (room.w - padding * 2);
        const y = room.y + padding + Math.random() * (room.h - padding * 2);

        const route = this.selectRouteForRoom(room.id, x, y);

        this.agents.push({
          id: idCounter++,
          x,
          y,
          vx: 0,
          vy: 0,
          targetExitId: route.targetExitId,
          waypoints: [...route.waypoints],
          currentWaypointIndex: 0,
          baseSpeed: 1.1 + Math.random() * 0.4, // natural variation in walking speed
          effectiveSpeed: 1.2,
          radius: 4.5,
          color: AGENT_COLORS[idCounter % AGENT_COLORS.length],
          isEvacuated: false,
          evacuatedTime: null,
          isQueued: false,
          waitingTime: 0,
          roomId: room.id,
        });
      }
    }
  }

  private adjustCrowdSize() {
    const current = this.agents.filter((a) => !a.isEvacuated).length;
    const target = this.config.crowdSize;

    if (target > current) {
      // Spawn more in random rooms
      const rooms = this.map.rooms;
      let idCounter = this.agents.length + 1;
      for (let i = 0; i < target - current; i++) {
        const room = rooms[i % rooms.length];
        const padding = 16;
        const x = room.x + padding + Math.random() * (room.w - padding * 2);
        const y = room.y + padding + Math.random() * (room.h - padding * 2);
        const route = this.selectRouteForRoom(room.id, x, y);

        this.agents.push({
          id: idCounter++,
          x,
          y,
          vx: 0,
          vy: 0,
          targetExitId: route.targetExitId,
          waypoints: [...route.waypoints],
          currentWaypointIndex: 0,
          baseSpeed: 1.1 + Math.random() * 0.4,
          effectiveSpeed: 1.2,
          radius: 4.5,
          color: AGENT_COLORS[idCounter % AGENT_COLORS.length],
          isEvacuated: false,
          evacuatedTime: null,
          isQueued: false,
          waitingTime: 0,
          roomId: room.id,
        });
      }
    } else if (target < current) {
      // Remove excess active dots
      let toRemove = current - target;
      for (let i = this.agents.length - 1; i >= 0 && toRemove > 0; i--) {
        if (!this.agents[i].isEvacuated) {
          this.agents.splice(i, 1);
          toRemove--;
        }
      }
    }
  }

  /**
   * Route selection based on algorithm and fire obstacles
   */
  private selectRouteForRoom(roomId: string, startX?: number, startY?: number) {
    const candidateRoutes = this.map.routes.filter((r) => r.fromRoomId === roomId);
    if (candidateRoutes.length === 0) {
      return { targetExitId: this.map.exits[0]?.id || 'exit_1', waypoints: [] };
    }

    if (this.config.strategy === 'shortest') {
      // Direct shortest route blindly chosen (ignoring fire hazards and queue congestion)
      const primary = candidateRoutes.find((r) => r.isPrimaryShortest);
      return primary || candidateRoutes[0];
    } else {
      // Smart Safe Route:
      // 1. Filter out routes passing dangerously close to active fires
      const safeRoutes = candidateRoutes.filter((route) => {
        return !route.waypoints.some((wp) => {
          return this.fires.some((f) => Math.hypot(f.x - wp.x, f.y - wp.y) < f.radius + 30);
        });
      });

      const usableRoutes = safeRoutes.length > 0 ? safeRoutes : candidateRoutes;

      // Balance dots across available safe exits to prevent bottlenecking
      // Pick route with lowest current load
      const exitUsage: Record<string, number> = {};
      for (const a of this.agents) {
        if (!a.isEvacuated) {
          exitUsage[a.targetExitId] = (exitUsage[a.targetExitId] || 0) + 1;
        }
      }

      usableRoutes.sort((a, b) => {
        const loadA = exitUsage[a.targetExitId] || 0;
        const loadB = exitUsage[b.targetExitId] || 0;
        return loadA - loadB;
      });

      return usableRoutes[0];
    }
  }

  private recalculateRoutes() {
    for (const agent of this.agents) {
      if (agent.isEvacuated) continue;
      const newRoute = this.selectRouteForRoom(agent.roomId, agent.x, agent.y);
      agent.targetExitId = newRoute.targetExitId;
      agent.waypoints = [...newRoute.waypoints];
      // Find nearest waypoint ahead
      let closestIdx = 0;
      let minD = Infinity;
      for (let i = 0; i < agent.waypoints.length; i++) {
        const d = Math.hypot(agent.waypoints[i].x - agent.x, agent.waypoints[i].y - agent.y);
        if (d < minD) {
          minD = d;
          closestIdx = i;
        }
      }
      agent.currentWaypointIndex = closestIdx;
    }
  }

  /**
   * Main Physics Tick (called every 16ms or discrete delta)
   */
  update(deltaSeconds: number = 0.016) {
    if (this.isFinished) return;

    this.elapsedSeconds += deltaSeconds;
    const speedMult = this.config.globalSpeed;

    // Track active queues at doors
    const doorQueues: Record<string, number> = {};
    for (const door of this.map.doors) {
      doorQueues[door.id] = 0;
    }

    let activeCount = 0;

    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      if (agent.isEvacuated) continue;
      activeCount++;

      // 1. Waypoint steering
      if (agent.currentWaypointIndex < agent.waypoints.length) {
        const targetWp = agent.waypoints[agent.currentWaypointIndex];
        const dx = targetWp.x - agent.x;
        const dy = targetWp.y - agent.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 15) {
          agent.currentWaypointIndex++;
        } else {
          // Normalize direction
          const dirX = dx / dist;
          const dirY = dy / dist;

          // 2. Door chokepoint check & slowdown
          let doorSlowdown = 1.0;
          for (const door of this.map.doors) {
            const distToDoor = Math.hypot(door.x + door.w / 2 - agent.x, door.y + door.h / 2 - agent.y);
            if (distToDoor < 35) {
              doorQueues[door.id] = (doorQueues[door.id] || 0) + 1;
              const cap = door.capacity * this.config.doorCapacityMultiplier;
              if (doorQueues[door.id] > cap) {
                agent.isQueued = true;
                doorSlowdown = 0.25; // queued at door!
              } else {
                agent.isQueued = false;
                doorSlowdown = 0.65;
              }
            }
          }

          // 3. Fire Hazard repulsion / panic
          let fireRepulsionX = 0;
          let fireRepulsionY = 0;
          for (const fire of this.fires) {
            const dFire = Math.hypot(agent.x - fire.x, agent.y - fire.y);
            if (dFire < fire.radius + 35) {
              if (this.config.strategy === 'smart_safe') {
                // Smart dots steer strongly away from fire!
                const repelStrength = (fire.radius + 35 - dFire) * 2.5;
                fireRepulsionX += ((agent.x - fire.x) / (dFire || 1)) * repelStrength;
                fireRepulsionY += ((agent.y - fire.y) / (dFire || 1)) * repelStrength;
              } else {
                // Naive dots get trapped / hurt by walking too close
                doorSlowdown = 0.4;
              }
            }
          }

          // 4. Social Force: Separation from nearby neighbor dots
          let sepX = 0;
          let sepY = 0;
          // Check small subset of neighbors for smooth 60fps performance
          const step = Math.max(1, Math.floor(this.agents.length / 50));
          for (let j = 0; j < this.agents.length; j += step) {
            if (i === j) continue;
            const other = this.agents[j];
            if (other.isEvacuated) continue;
            const ndx = agent.x - other.x;
            const ndy = agent.y - other.y;
            const nDist = Math.hypot(ndx, ndy);
            if (nDist > 0 && nDist < 12) {
              const push = (12 - nDist) / 12;
              sepX += (ndx / nDist) * push * 1.5;
              sepY += (ndy / nDist) * push * 1.5;
            }
          }

          // Compute final velocity
          const currentSpeed = agent.baseSpeed * 65 * speedMult * doorSlowdown;
          agent.vx = dirX * currentSpeed + sepX * 10 + fireRepulsionX;
          agent.vy = dirY * currentSpeed + sepY * 10 + fireRepulsionY;

          // Apply position
          agent.x += agent.vx * deltaSeconds;
          agent.y += agent.vy * deltaSeconds;
        }
      } else {
        // Reached end of path: steer into target exit
        const exit = this.map.exits.find((e) => e.id === agent.targetExitId) || this.map.exits[0];
        if (exit) {
          const exCenter = exit.x + exit.w / 2;
          const eyCenter = exit.y + exit.h / 2;
          const dExit = Math.hypot(exCenter - agent.x, eyCenter - agent.y);

          if (dExit < 25) {
            // Evacuated!
            agent.isEvacuated = true;
            agent.evacuatedTime = this.elapsedSeconds;
            this.totalEvacuated++;
          } else {
            const edx = (exCenter - agent.x) / (dExit || 1);
            const edy = (eyCenter - agent.y) / (dExit || 1);
            agent.x += edx * agent.baseSpeed * 70 * speedMult * deltaSeconds;
            agent.y += edy * agent.baseSpeed * 70 * speedMult * deltaSeconds;
          }
        }
      }
    }

    // Peak Queue Calculation
    let currentMaxQ = 0;
    let worstDoorName = 'None';
    for (const door of this.map.doors) {
      const q = doorQueues[door.id] || 0;
      if (q > currentMaxQ) {
        currentMaxQ = q;
        worstDoorName = door.name;
      }
    }
    if (currentMaxQ > this.peakQueue) {
      this.peakQueue = currentMaxQ;
      this.primaryBottleneck = worstDoorName;
    }

    if (activeCount === 0 && this.agents.length > 0) {
      this.isFinished = true;
    }
  }
}

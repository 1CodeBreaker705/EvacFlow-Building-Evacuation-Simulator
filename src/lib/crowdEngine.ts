// Comprehensive Crowd Evacuation Engine with Weighted Graph Representation & Dynamic Reaction Physics

export interface BuildingPoint {
  x: number;
  y: number;
}

export interface CorridorEdge {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  length: number; // L_e (meters)
  width: number; // W_e (meters)
  capacity: number; // C_e (max simultaneous occupants)
  maxFlowRate: number; // F_e (people/second)
  isBlocked: boolean;
  hasFire: boolean;
  // Runtime telemetry
  currentOccupancy: number;
  currentQueue: number;
  peakQueue: number;
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'room' | 'junction' | 'stair' | 'exit';
  x: number;
  y: number;
  label: string;
}

export interface RoomZone {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  doorNodeId: string;
  doorPos: BuildingPoint;
}

export interface CrowdAgent {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  radius: number;
  color: string;
  startRoomId: string;
  targetExitId: string;
  pathNodes: string[]; // sequence of node IDs to destination
  pathIndex: number;
  isEvacuated: boolean;
  evacuatedAtTime: number | null;
  isQueued: boolean;
  isRerouting: boolean;
}

const AGENT_PALETTE = [
  '#38bdf8', // sky blue
  '#818cf8', // indigo
  '#a78bfa', // purple
  '#34d399', // emerald
  '#f59e0b', // amber
  '#fb7185', // rose
  '#2dd4bf', // teal
];

export class CrowdSimulationEngine {
  nodes: Map<string, GraphNode> = new Map();
  edges: Map<string, CorridorEdge> = new Map();
  rooms: RoomZone[] = [];
  agents: CrowdAgent[] = [];
  fires: { id: string; x: number; y: number; radius: number }[] = [];

  elapsedSeconds: number = 0;
  totalEvacuated: number = 0;
  peakQueueOverall: number = 0;
  primaryBottleneck: string = 'None';
  strategy: 'shortest' | 'smart' = 'shortest';
  globalSpeed: number = 1.0;
  isFinished: boolean = false;

  constructor() {
    this.initBuildingLayout();
  }

  initBuildingLayout() {
    this.nodes.clear();
    this.edges.clear();
    this.rooms = [];
    this.agents = [];
    this.fires = [];
    this.elapsedSeconds = 0;
    this.totalEvacuated = 0;
    this.peakQueueOverall = 0;
    this.primaryBottleneck = 'None';
    this.isFinished = false;

    // 1. Rooms Layout (College CSE Department Floor)
    this.rooms = [
      { id: 'room_lab1', name: 'Computer Lab 1', x: 80, y: 70, w: 260, h: 160, doorNodeId: 'node_d1', doorPos: { x: 210, y: 230 } },
      { id: 'room_ai', name: 'AI & Robotics Lab', x: 440, y: 70, w: 260, h: 160, doorNodeId: 'node_d2', doorPos: { x: 570, y: 230 } },
      { id: 'room_fac', name: 'Faculty Cabin', x: 800, y: 70, w: 250, h: 160, doorNodeId: 'node_d3', doorPos: { x: 925, y: 230 } },

      { id: 'room_cr1', name: 'Lecture Hall 101', x: 80, y: 450, w: 260, h: 160, doorNodeId: 'node_d4', doorPos: { x: 210, y: 450 } },
      { id: 'room_cr2', name: 'Lecture Hall 102', x: 440, y: 450, w: 260, h: 160, doorNodeId: 'node_d5', doorPos: { x: 570, y: 450 } },
      { id: 'room_sem', name: 'Seminar Hall', x: 800, y: 450, w: 250, h: 160, doorNodeId: 'node_d6', doorPos: { x: 925, y: 450 } },
    ];

    // 2. Graph Nodes
    const nodeList: GraphNode[] = [
      // Room Door Nodes
      { id: 'node_d1', name: 'Lab 1 Door', type: 'room', x: 210, y: 230, label: 'D1' },
      { id: 'node_d2', name: 'AI Lab Door', type: 'room', x: 570, y: 230, label: 'D2' },
      { id: 'node_d3', name: 'Faculty Door', type: 'room', x: 925, y: 230, label: 'D3' },
      { id: 'node_d4', name: 'Hall 101 Door', type: 'room', x: 210, y: 450, label: 'D4' },
      { id: 'node_d5', name: 'Hall 102 Door', type: 'room', x: 570, y: 450, label: 'D5' },
      { id: 'node_d6', name: 'Seminar Door', type: 'room', x: 925, y: 450, label: 'D6' },

      // Main Corridor Junctions
      { id: 'j_west', name: 'West Junction', type: 'junction', x: 210, y: 340, label: 'J-West' },
      { id: 'j_mid_n', name: 'Central North', type: 'junction', x: 570, y: 270, label: 'J-MidN' },
      { id: 'j_mid_s', name: 'Central South', type: 'junction', x: 570, y: 410, label: 'J-MidS' },
      { id: 'j_east', name: 'East Junction', type: 'junction', x: 925, y: 340, label: 'J-East' },

      // Stairwell & Emergency Exits
      { id: 'stair_west', name: 'Staircase A (West)', type: 'stair', x: 60, y: 340, label: 'Stair A' },
      { id: 'stair_east', name: 'Staircase B (East)', type: 'stair', x: 1080, y: 340, label: 'Stair B' },
    ];

    for (const n of nodeList) {
      this.nodes.set(n.id, n);
    }

    // 3. Graph Edges (Corridors) with parameters from Synopsis: Length, Width, Capacity, Flow Rate
    const edgeList: CorridorEdge[] = [
      // Crucial Bottleneck Corridor C2 from Synopsis leading to Stair A
      {
        id: 'c2',
        name: 'Corridor C2 (West Chokepoint)',
        fromNodeId: 'j_west',
        toNodeId: 'stair_west',
        length: 15,
        width: 1.8,
        capacity: 15, // capacity limit causes realistic queue
        maxFlowRate: 3.0,
        isBlocked: false,
        hasFire: false,
        currentOccupancy: 0,
        currentQueue: 0,
        peakQueue: 0,
      },
      // East Corridor leading to Stair B (Wide high-capacity bypass C4)
      {
        id: 'c4',
        name: 'Corridor C4 (East Bypass)',
        fromNodeId: 'j_east',
        toNodeId: 'stair_east',
        length: 15,
        width: 3.0,
        capacity: 40,
        maxFlowRate: 7.0,
        isBlocked: false,
        hasFire: false,
        currentOccupancy: 0,
        currentQueue: 0,
        peakQueue: 0,
      },

      // Room Connectors
      { id: 'e_d1', name: 'Lab 1 Connector', fromNodeId: 'node_d1', toNodeId: 'j_west', length: 10, width: 2.5, capacity: 30, maxFlowRate: 6, isBlocked: false, hasFire: false, currentOccupancy: 0, currentQueue: 0, peakQueue: 0 },
      { id: 'e_d4', name: 'Hall 101 Connector', fromNodeId: 'node_d4', toNodeId: 'j_west', length: 10, width: 2.5, capacity: 30, maxFlowRate: 6, isBlocked: false, hasFire: false, currentOccupancy: 0, currentQueue: 0, peakQueue: 0 },

      { id: 'e_d2', name: 'AI Lab Connector', fromNodeId: 'node_d2', toNodeId: 'j_mid_n', length: 6, width: 2.5, capacity: 30, maxFlowRate: 6, isBlocked: false, hasFire: false, currentOccupancy: 0, currentQueue: 0, peakQueue: 0 },
      { id: 'e_d5', name: 'Hall 102 Connector', fromNodeId: 'node_d5', toNodeId: 'j_mid_s', length: 6, width: 2.5, capacity: 30, maxFlowRate: 6, isBlocked: false, hasFire: false, currentOccupancy: 0, currentQueue: 0, peakQueue: 0 },

      { id: 'e_d3', name: 'Faculty Connector', fromNodeId: 'node_d3', toNodeId: 'j_east', length: 10, width: 2.5, capacity: 30, maxFlowRate: 6, isBlocked: false, hasFire: false, currentOccupancy: 0, currentQueue: 0, peakQueue: 0 },
      { id: 'e_d6', name: 'Seminar Connector', fromNodeId: 'node_d6', toNodeId: 'j_east', length: 10, width: 2.5, capacity: 30, maxFlowRate: 6, isBlocked: false, hasFire: false, currentOccupancy: 0, currentQueue: 0, peakQueue: 0 },

      // Main Central Hallways
      { id: 'e_mid_n_w', name: 'North Hall West', fromNodeId: 'j_mid_n', toNodeId: 'j_west', length: 35, width: 2.5, capacity: 35, maxFlowRate: 5, isBlocked: false, hasFire: false, currentOccupancy: 0, currentQueue: 0, peakQueue: 0 },
      { id: 'e_mid_n_e', name: 'North Hall East', fromNodeId: 'j_mid_n', toNodeId: 'j_east', length: 35, width: 2.5, capacity: 35, maxFlowRate: 5, isBlocked: false, hasFire: false, currentOccupancy: 0, currentQueue: 0, peakQueue: 0 },
      { id: 'e_mid_s_w', name: 'South Hall West', fromNodeId: 'j_mid_s', toNodeId: 'j_west', length: 35, width: 2.5, capacity: 35, maxFlowRate: 5, isBlocked: false, hasFire: false, currentOccupancy: 0, currentQueue: 0, peakQueue: 0 },
      { id: 'e_mid_s_e', name: 'South Hall East', fromNodeId: 'j_mid_s', toNodeId: 'j_east', length: 35, width: 2.5, capacity: 35, maxFlowRate: 5, isBlocked: false, hasFire: false, currentOccupancy: 0, currentQueue: 0, peakQueue: 0 },
    ];

    for (const e of edgeList) {
      this.edges.set(e.id, e);
    }
  }

  /**
   * Spawn Custom Number of Agents (Starts from 0)
   */
  spawnCrowd(count: number) {
    if (count <= 0) {
      this.agents = [];
      this.totalEvacuated = 0;
      this.elapsedSeconds = 0;
      this.peakQueueOverall = 0;
      this.primaryBottleneck = 'None';
      this.isFinished = false;
      return;
    }

    const currentCount = this.agents.filter((a) => !a.isEvacuated).length;
    if (count === currentCount) return;

    if (count > currentCount) {
      const needed = count - currentCount;
      let idGen = this.agents.length + 1;
      const rooms = this.rooms;

      for (let i = 0; i < needed; i++) {
        const rm = rooms[i % rooms.length];
        const padding = 20;
        const x = rm.x + padding + Math.random() * (rm.w - padding * 2);
        const y = rm.y + padding + Math.random() * (rm.h - padding * 2);

        const agent = this.createAgent(idGen++, rm.id, x, y);
        this.agents.push(agent);
      }
    } else {
      // Trim active agents down to count
      let toRemove = currentCount - count;
      for (let i = this.agents.length - 1; i >= 0 && toRemove > 0; i--) {
        if (!this.agents[i].isEvacuated) {
          this.agents.splice(i, 1);
          toRemove--;
        }
      }
    }

    this.recalculateAllRoutes();
  }

  /**
   * Spawn Agents directly at clicked position (e.g. inside a room)
   */
  spawnAtPoint(x: number, y: number, count: number = 10) {
    // Find room at coordinates
    const targetRoom = this.rooms.find(
      (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
    ) || this.rooms[0];

    let idGen = this.agents.length + 1;
    for (let i = 0; i < count; i++) {
      const px = Math.max(targetRoom.x + 15, Math.min(targetRoom.x + targetRoom.w - 15, x + (Math.random() - 0.5) * 30));
      const py = Math.max(targetRoom.y + 15, Math.min(targetRoom.y + targetRoom.h - 15, y + (Math.random() - 0.5) * 30));
      const agent = this.createAgent(idGen++, targetRoom.id, px, py);
      this.agents.push(agent);
    }
    this.recalculateAllRoutes();
  }

  private createAgent(id: number, roomId: string, x: number, y: number): CrowdAgent {
    const room = this.rooms.find((r) => r.id === roomId) || this.rooms[0];

    return {
      id,
      x,
      y,
      vx: 0,
      vy: 0,
      speed: 1.0 + Math.random() * 0.4,
      radius: 4.5,
      color: AGENT_PALETTE[id % AGENT_PALETTE.length],
      startRoomId: roomId,
      targetExitId: 'stair_west',
      pathNodes: [room.doorNodeId],
      pathIndex: 0,
      isEvacuated: false,
      evacuatedAtTime: null,
      isQueued: false,
      isRerouting: false,
    };
  }

  /**
   * Dijkstra / Flow Pathfinding with Obstacle & Congestion Accounting
   */
  findBestRoute(fromNodeId: string, preferredExit?: string): { exitId: string; nodePath: string[] } | null {
    const validExits = ['stair_west', 'stair_east'];

    // Graph Adjacency Construction
    const adj: Map<string, { toNode: string; edge: CorridorEdge; weight: number }[]> = new Map();
    for (const node of Array.from(this.nodes.keys())) {
      adj.set(node, []);
    }

    for (const edge of Array.from(this.edges.values())) {
      if (edge.isBlocked || edge.hasFire) continue; // blocked or on fire -> untraversable!

      // Cost formulation from Synopsis & Paper: Cost = Length * (1 + alpha * Queue / Capacity)
      let costMultiplier = 1.0;
      if (this.strategy === 'smart') {
        const queueRatio = edge.currentQueue / Math.max(1, edge.capacity);
        costMultiplier = 1.0 + queueRatio * 3.5;
      }

      const effectiveCost = edge.length * costMultiplier;

      adj.get(edge.fromNodeId)?.push({ toNode: edge.toNodeId, edge, weight: effectiveCost });
      adj.get(edge.toNodeId)?.push({ toNode: edge.fromNodeId, edge, weight: effectiveCost });
    }

    // Dijkstra
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const unvisited = new Set<string>();

    for (const n of Array.from(this.nodes.keys())) {
      dist.set(n, Infinity);
      prev.set(n, null);
      unvisited.add(n);
    }
    dist.set(fromNodeId, 0);

    while (unvisited.size > 0) {
      let minDist = Infinity;
      let curr: string | null = null;
      for (const n of Array.from(unvisited)) {
        const d = dist.get(n) ?? Infinity;
        if (d < minDist) {
          minDist = d;
          curr = n;
        }
      }

      if (curr === null || minDist === Infinity) break;
      unvisited.delete(curr);

      // Reached an exit?
      if (validExits.includes(curr) && (!preferredExit || curr === preferredExit)) {
        const nodePath: string[] = [];
        let p: string | null = curr;
        while (p) {
          nodePath.unshift(p);
          p = prev.get(p) || null;
        }
        return { exitId: curr, nodePath };
      }

      const neighbors = adj.get(curr) || [];
      for (const { toNode, weight } of neighbors) {
        if (!unvisited.has(toNode)) continue;
        const alt = minDist + weight;
        if (alt < (dist.get(toNode) ?? Infinity)) {
          dist.set(toNode, alt);
          prev.set(toNode, curr);
        }
      }
    }

    return null; // No path reachable
  }

  /**
   * Recalculate routes for all active agents
   */
  recalculateAllRoutes() {
    // Determine exit distribution
    const westCount = this.agents.filter((a) => !a.isEvacuated && a.targetExitId === 'stair_west').length;
    const eastCount = this.agents.filter((a) => !a.isEvacuated && a.targetExitId === 'stair_east').length;

    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      if (agent.isEvacuated) continue;

      const room = this.rooms.find((r) => r.id === agent.startRoomId) || this.rooms[0];
      let preferredExit: string | undefined = undefined;

      if (this.strategy === 'shortest') {
        // Naive distance: Rooms on West & Center pick Stair West!
        preferredExit = agent.x < 700 ? 'stair_west' : 'stair_east';
      } else {
        // Smart load-balanced assignment
        preferredExit = i % 2 === 0 ? 'stair_west' : 'stair_east';
      }

      // Find route from current nearest node or room door
      const startNode = agent.pathNodes[agent.pathIndex] || room.doorNodeId;
      const res = this.findBestRoute(startNode, preferredExit) || this.findBestRoute(startNode);

      if (res) {
        agent.targetExitId = res.exitId;
        agent.pathNodes = res.nodePath;
        agent.pathIndex = 0;
        agent.isRerouting = false;
      } else {
        // Trapped by fire/blockade!
        agent.isRerouting = true;
      }
    }
  }

  /**
   * Toggle Corridor Block / Hazard
   */
  toggleCorridorBlock(edgeId: string) {
    const edge = this.edges.get(edgeId);
    if (!edge) return;
    edge.isBlocked = !edge.isBlocked;
    this.recalculateAllRoutes();
  }

  /**
   * Add / Remove Fire Hazard at world coordinates
   */
  toggleFireAt(x: number, y: number) {
    const existingIdx = this.fires.findIndex((f) => Math.hypot(f.x - x, f.y - y) < f.radius + 15);
    if (existingIdx >= 0) {
      this.fires.splice(existingIdx, 1);
      // Remove fire flag on nearby edges
      for (const e of Array.from(this.edges.values())) {
        e.hasFire = false;
      }
    } else {
      this.fires.push({ id: `fire_${Date.now()}`, x, y, radius: 45 });
      // Mark nearest edge as on fire
      for (const e of Array.from(this.edges.values())) {
        const fromN = this.nodes.get(e.fromNodeId);
        const toN = this.nodes.get(e.toNodeId);
        if (fromN && toN) {
          const midX = (fromN.x + toN.x) / 2;
          const midY = (fromN.y + toN.y) / 2;
          if (Math.hypot(midX - x, midY - y) < 65) {
            e.hasFire = true;
          }
        }
      }
    }
    this.recalculateAllRoutes();
  }

  clearAllHazards() {
    this.fires = [];
    for (const e of Array.from(this.edges.values())) {
      e.isBlocked = false;
      e.hasFire = false;
    }
    this.recalculateAllRoutes();
  }

  /**
   * Physics & Crowd Simulation Step (Called each frame)
   */
  update(deltaSec: number = 0.016) {
    if (this.isFinished) return;

    this.elapsedSeconds += deltaSec;
    const speedMult = this.globalSpeed;

    // Reset current corridor occupancies & queues
    for (const edge of Array.from(this.edges.values())) {
      edge.currentOccupancy = 0;
      edge.currentQueue = 0;
    }

    let activeCount = 0;

    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      if (agent.isEvacuated) continue;
      activeCount++;

      // 1. Target node waypoint following
      if (agent.pathIndex < agent.pathNodes.length) {
        const targetNodeId = agent.pathNodes[agent.pathIndex];
        const targetNode = this.nodes.get(targetNodeId);

        if (targetNode) {
          const dx = targetNode.x - agent.x;
          const dy = targetNode.y - agent.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 14) {
            // Reached node -> proceed to next node in path
            agent.pathIndex++;
          } else {
            const dirX = dx / dist;
            const dirY = dy / dist;

            // Check if current corridor edge is congested (q_e = min[D, F, C - O])
            let corridorSpeedLimit = 1.0;
            // Corridor C2 check (West chokepoint)
            const c2 = this.edges.get('c2');
            if (c2 && agent.targetExitId === 'stair_west' && agent.x > 80 && agent.x < 220 && agent.y > 290 && agent.y < 390) {
              c2.currentOccupancy++;
              if (c2.currentOccupancy > c2.capacity) {
                agent.isQueued = true;
                c2.currentQueue++;
                corridorSpeedLimit = 0.25; // queued outside narrow corridor!
              } else {
                agent.isQueued = false;
              }
            } else {
              agent.isQueued = false;
            }

            // Fire reaction (people physically avoid fire)
            let fireAvoidX = 0;
            let fireAvoidY = 0;
            for (const f of this.fires) {
              const df = Math.hypot(agent.x - f.x, agent.y - f.y);
              if (df < f.radius + 35) {
                // Strong repulsion force
                const force = (f.radius + 35 - df) * 3.0;
                fireAvoidX += ((agent.x - f.x) / (df || 1)) * force;
                fireAvoidY += ((agent.y - f.y) / (df || 1)) * force;
              }
            }

            // Social force / crowd repulsion (so people don't overlap)
            let sepX = 0;
            let sepY = 0;
            const checkStep = Math.max(1, Math.floor(this.agents.length / 40));
            for (let j = 0; j < this.agents.length; j += checkStep) {
              if (i === j) continue;
              const other = this.agents[j];
              if (other.isEvacuated) continue;
              const ndx = agent.x - other.x;
              const ndy = agent.y - other.y;
              const nd = Math.hypot(ndx, ndy);
              if (nd > 0 && nd < 11) {
                const push = (11 - nd) / 11;
                sepX += (ndx / nd) * push * 1.6;
                sepY += (ndy / nd) * push * 1.6;
              }
            }

            const stepSpeed = agent.speed * 65 * speedMult * corridorSpeedLimit;
            agent.vx = dirX * stepSpeed + sepX * 12 + fireAvoidX;
            agent.vy = dirY * stepSpeed + sepY * 12 + fireAvoidY;

            agent.x += agent.vx * deltaSec;
            agent.y += agent.vy * deltaSec;
          }
        }
      } else {
        // Arrived at destination stairwell/exit!
        const exitNode = this.nodes.get(agent.targetExitId);
        if (exitNode) {
          const dExit = Math.hypot(exitNode.x - agent.x, exitNode.y - agent.y);
          if (dExit < 25) {
            agent.isEvacuated = true;
            agent.evacuatedAtTime = this.elapsedSeconds;
            this.totalEvacuated++;
          } else {
            agent.x += ((exitNode.x - agent.x) / (dExit || 1)) * agent.speed * 50 * speedMult * deltaSec;
            agent.y += ((exitNode.y - agent.y) / (dExit || 1)) * agent.speed * 50 * speedMult * deltaSec;
          }
        }
      }
    }

    // Telemetry updates
    let worstQ = 0;
    let worstName = 'None';
    for (const edge of Array.from(this.edges.values())) {
      if (edge.currentQueue > edge.peakQueue) {
        edge.peakQueue = edge.currentQueue;
      }
      if (edge.currentQueue > worstQ) {
        worstQ = edge.currentQueue;
        worstName = edge.name;
      }
    }

    if (worstQ > this.peakQueueOverall) {
      this.peakQueueOverall = worstQ;
      this.primaryBottleneck = worstName;
    }

    if (activeCount === 0 && this.agents.length > 0) {
      this.isFinished = true;
    }
  }
}

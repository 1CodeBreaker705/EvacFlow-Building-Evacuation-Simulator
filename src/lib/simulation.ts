import {
  BuildingNode,
  BuildingEdge,
  OccupantGroup,
  EdgeRuntimeState,
  SimulationFrame,
  SimulationSummary,
} from './types';

export interface SimulationConfig {
  timeStepSec: number;
  maxSimulationTime: number;
}

export const DEFAULT_CONFIG: SimulationConfig = {
  timeStepSec: 1,
  maxSimulationTime: 120,
};

interface SimGroupState {
  id: string;
  name: string;
  population: number;
  startNodeId: string;
  targetExitId: string;
  speed: number;
  route: string[];
  routeEdgeIds: string[];
  currentEdgeIndex: number; // -1: waiting at start room, 0..N-1: on edge
  metersCoveredOnCurrentEdge: number;
  isQueued: boolean;
  queuedAtEdgeId: string | null;
  secondsQueuedAtCurrentEdge: number;
  totalWaitTime: number;
  isEvacuated: boolean;
  evacuatedAtTime: number | null;
}

export class DiscreteTimeSimulator {
  nodes: Map<string, BuildingNode>;
  edges: Map<string, BuildingEdge>;
  initialGroups: OccupantGroup[];
  config: SimulationConfig;

  constructor(
    nodes: BuildingNode[],
    edges: BuildingEdge[],
    groups: OccupantGroup[],
    config: Partial<SimulationConfig> = {}
  ) {
    this.nodes = new Map(nodes.map((n) => [n.id, n]));
    this.edges = new Map(edges.map((e) => [e.id, e]));
    this.initialGroups = groups.map((g) => ({ ...g }));
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  runFullSimulation(): { frames: SimulationFrame[]; summary: SimulationSummary } {
    const totalOccupants = this.initialGroups.reduce((sum, g) => sum + g.population, 0);
    const frames: SimulationFrame[] = [];

    const groups: SimGroupState[] = this.initialGroups.map((g) => ({
      id: g.id,
      name: g.name,
      population: g.population,
      startNodeId: g.startNodeId,
      targetExitId: g.targetExitId || '',
      speed: g.speed || 1.2,
      route: g.route ? [...g.route] : [],
      routeEdgeIds: g.routeEdgeIds ? [...g.routeEdgeIds] : [],
      currentEdgeIndex: -1,
      metersCoveredOnCurrentEdge: 0,
      isQueued: false,
      queuedAtEdgeId: (g.routeEdgeIds && g.routeEdgeIds[0]) || null,
      secondsQueuedAtCurrentEdge: 0,
      totalWaitTime: 0,
      isEvacuated: false,
      evacuatedAtTime: null,
    }));

    // Initialize edge states
    const edgeStates: Record<string, EdgeRuntimeState> = {};
    for (const [edgeId, edge] of Array.from(this.edges.entries())) {
      edgeStates[edgeId] = {
        edgeId,
        occupancy: 0,
        queue: 0,
        flowThroughput: 0,
        utilization: 0,
        peakQueue: 0,
        totalWaitTime: 0,
        isBottleneck: false,
        isBlocked: !!edge.isBlocked,
      };
    }

    let t = 0;
    let evacuatedCount = 0;
    const exitDistribution: Record<string, number> = {};
    const timeSeries: SimulationSummary['timeSeries'] = [];
    let worstBottleneckEdgeId = '';
    let worstBottleneckPeak = 0;

    // Simulation loop
    while (evacuatedCount < totalOccupants && t <= this.config.maxSimulationTime) {
      // 1. Reset per-second flow throughput and queue counters
      for (const [edgeId, state] of Object.entries(edgeStates)) {
        state.flowThroughput = 0;
        state.queue = 0;
      }

      // 2. Count current occupancy on edges from groups traversing them
      for (const [edgeId, state] of Object.entries(edgeStates)) {
        state.occupancy = 0;
      }
      for (const grp of groups) {
        if (!grp.isEvacuated && !grp.isQueued && grp.currentEdgeIndex >= 0) {
          const eid = grp.routeEdgeIds[grp.currentEdgeIndex];
          if (edgeStates[eid]) {
            edgeStates[eid].occupancy += grp.population;
          }
        }
      }

      // 3. Advance groups currently moving along their edge
      for (const grp of groups) {
        if (grp.isEvacuated || grp.isQueued || grp.currentEdgeIndex < 0) continue;

        const currentEdgeId = grp.routeEdgeIds[grp.currentEdgeIndex];
        const edge = this.edges.get(currentEdgeId);
        const state = edgeStates[currentEdgeId];
        if (!edge || !state) continue;

        // Density speed factor
        const density = Math.min(1.0, state.occupancy / Math.max(1, edge.capacity));
        const speedFactor = Math.max(0.4, 1.0 - 0.5 * density);
        const effectiveSpeed = grp.speed * speedFactor;

        grp.metersCoveredOnCurrentEdge += effectiveSpeed * this.config.timeStepSec;

        // Check if group reached end of this edge
        if (grp.metersCoveredOnCurrentEdge >= edge.length) {
          const isFinalEdge = grp.currentEdgeIndex === grp.routeEdgeIds.length - 1;
          if (isFinalEdge) {
            // Arrived at destination exit!
            grp.isEvacuated = true;
            grp.evacuatedAtTime = t;
            evacuatedCount += grp.population;
            exitDistribution[grp.targetExitId] =
              (exitDistribution[grp.targetExitId] || 0) + grp.population;
          } else {
            // Queue for next edge in route
            const nextEdgeId = grp.routeEdgeIds[grp.currentEdgeIndex + 1];
            grp.isQueued = true;
            grp.queuedAtEdgeId = nextEdgeId;
            grp.secondsQueuedAtCurrentEdge = 0;
            grp.metersCoveredOnCurrentEdge = 0;
          }
        }
      }

      // 4. Handle corridor entry admissions
      // Group candidates seeking entry by target edge
      const candidatesByEdge: Record<string, SimGroupState[]> = {};
      for (const grp of groups) {
        if (grp.isEvacuated) continue;
        let targetEdgeId: string | null = null;

        if (grp.currentEdgeIndex === -1) {
          targetEdgeId = grp.routeEdgeIds[0];
        } else if (grp.isQueued && grp.queuedAtEdgeId) {
          targetEdgeId = grp.queuedAtEdgeId;
        }

        if (targetEdgeId) {
          if (!candidatesByEdge[targetEdgeId]) {
            candidatesByEdge[targetEdgeId] = [];
          }
          candidatesByEdge[targetEdgeId].push(grp);
        }
      }

      for (const [edgeId, candidateList] of Object.entries(candidatesByEdge)) {
        const edge = this.edges.get(edgeId);
        const state = edgeStates[edgeId];
        if (!edge || !state || edge.isBlocked) {
          for (const g of candidateList) {
            g.isQueued = true;
            g.queuedAtEdgeId = edgeId;
            g.totalWaitTime += this.config.timeStepSec;
            if (state) state.totalWaitTime += g.population * this.config.timeStepSec;
          }
          if (state) state.queue = candidateList.reduce((acc, g) => acc + g.population, 0);
          continue;
        }

        // Available capacity space
        const spaceLeft = Math.max(0, edge.capacity - state.occupancy);
        // Bandwidth allowance: max flow rate * time interval
        // Room connectors allow immediate departure into hallway
        const isRoomConnector = edge.id.startsWith('c-r');
        let allowedInflow = isRoomConnector ? 50 : Math.min(edge.maxFlowRate * 6, spaceLeft);

        for (const grp of candidateList) {
          // If group is already partially entering or can be accommodated
          const canAdmit = isRoomConnector || allowedInflow >= Math.min(grp.population, 15) || spaceLeft >= grp.population * 0.7;

          if (canAdmit && spaceLeft > 0) {
            // Group enters corridor!
            if (grp.currentEdgeIndex === -1) {
              grp.currentEdgeIndex = 0;
            } else {
              grp.currentEdgeIndex += 1;
            }
            grp.isQueued = false;
            grp.queuedAtEdgeId = null;
            grp.metersCoveredOnCurrentEdge = 0;

            state.occupancy += grp.population;
            state.flowThroughput += grp.population;
            allowedInflow = Math.max(0, allowedInflow - grp.population);
          } else {
            // Must wait in queue!
            grp.isQueued = true;
            grp.queuedAtEdgeId = edgeId;
            grp.secondsQueuedAtCurrentEdge += this.config.timeStepSec;
            grp.totalWaitTime += this.config.timeStepSec;
            state.totalWaitTime += grp.population * this.config.timeStepSec;
            state.queue += grp.population;
          }
        }

        if (state.queue > state.peakQueue) {
          state.peakQueue = state.queue;
        }
        if (state.queue > worstBottleneckPeak) {
          worstBottleneckPeak = state.queue;
          worstBottleneckEdgeId = edgeId;
        }
      }

      // 5. Update corridor utilization and bottleneck telemetry
      let maxUtilThisSec = 0;
      let totalQueuedThisSec = 0;
      let currentBottleneck: SimulationFrame['primaryBottleneck'] = null;
      let maxQueueThisSec = 0;

      for (const [edgeId, state] of Object.entries(edgeStates)) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;

        state.utilization = state.occupancy / Math.max(1, edge.capacity);
        if (state.utilization > maxUtilThisSec) {
          maxUtilThisSec = state.utilization;
        }
        totalQueuedThisSec += state.queue;
        state.isBottleneck = state.queue > 0 || state.utilization >= 0.8;

        if (state.queue > maxQueueThisSec) {
          maxQueueThisSec = state.queue;
          currentBottleneck = {
            edgeId,
            name: edge.name,
            queue: state.queue,
            utilization: state.utilization,
          };
        }
      }

      frames.push({
        time: t,
        totalOccupants,
        evacuatedCount,
        activeGroups: groups.map((g) => {
          let pos = 0;
          let eid: string | null = null;
          let nid = g.startNodeId;

          if (g.isEvacuated) {
            pos = 1.0;
            eid = g.routeEdgeIds[g.routeEdgeIds.length - 1] || null;
            nid = g.targetExitId;
          } else if (g.currentEdgeIndex >= 0) {
            eid = g.routeEdgeIds[g.currentEdgeIndex];
            const edge = this.edges.get(eid);
            pos = edge ? Math.min(1.0, g.metersCoveredOnCurrentEdge / Math.max(1, edge.length)) : 0.5;
            nid = g.route[g.currentEdgeIndex + 1] || g.targetExitId;
          } else {
            pos = 0;
            nid = g.startNodeId;
          }

          return {
            id: g.id,
            population: g.population,
            currentEdgeId: eid,
            currentNodeId: nid,
            positionOnEdge: pos,
            isWaiting: g.isQueued,
            isEvacuated: g.isEvacuated,
          };
        }),
        edgeStates: JSON.parse(JSON.stringify(edgeStates)),
        primaryBottleneck: currentBottleneck,
      });

      timeSeries.push({
        time: t,
        evacuated: evacuatedCount,
        activeQueue: totalQueuedThisSec,
        maxUtilization: Math.round(maxUtilThisSec * 100),
      });

      t += this.config.timeStepSec;
    }

    const totalWait = groups.reduce((acc, g) => acc + g.totalWaitTime, 0);
    const averageWaitTime = Math.round((totalWait / Math.max(1, groups.length)) * 10) / 10;
    const worstEdge = this.edges.get(worstBottleneckEdgeId);

    const summary: SimulationSummary = {
      completionTime: Math.min(t - this.config.timeStepSec, this.config.maxSimulationTime),
      totalOccupants,
      peakQueueLength: worstBottleneckPeak,
      primaryBottleneckCorridor: worstEdge ? worstEdge.name : 'None',
      averageWaitTime,
      exitDistribution,
      timeSeries,
    };

    return { frames, summary };
  }
}

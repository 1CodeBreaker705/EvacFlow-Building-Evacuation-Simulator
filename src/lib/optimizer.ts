import { BuildingNode, BuildingEdge, OccupantGroup, SimulationSummary, SimulationFrame } from './types';
import { BuildingGraph } from './graph';
import { DiscreteTimeSimulator } from './simulation';

export interface OptimizationResult {
  baseline: {
    groups: OccupantGroup[];
    frames: SimulationFrame[];
    summary: SimulationSummary;
  };
  optimized: {
    groups: OccupantGroup[];
    frames: SimulationFrame[];
    summary: SimulationSummary;
    iterationsRun: number;
    reassignedGroupsCount: number;
  };
  improvements: {
    timeReductionSec: number;
    timeReductionPercent: number;
    queueReductionCount: number;
    queueReductionPercent: number;
    waitReductionSec: number;
  };
}

export class EvacuationOptimizer {
  nodes: BuildingNode[];
  edges: BuildingEdge[];
  rawGroups: {
    id: string;
    name: string;
    population: number;
    startNodeId: string;
    preferredExitId?: string;
  }[];

  constructor(
    nodes: BuildingNode[],
    edges: BuildingEdge[],
    groups: {
      id: string;
      name: string;
      population: number;
      startNodeId: string;
      preferredExitId?: string;
    }[]
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.rawGroups = groups;
  }

  computeBaselineRoutes(): OccupantGroup[] {
    const graph = new BuildingGraph(this.nodes, this.edges);

    return this.rawGroups.map((g) => {
      const result = graph.findShortestPath(g.startNodeId, g.preferredExitId);
      const targetExit = result?.path[result.path.length - 1] || 'exit-a';

      return {
        id: g.id,
        name: g.name,
        population: g.population,
        startNodeId: g.startNodeId,
        targetExitId: targetExit,
        speed: 1.2,
        route: result ? result.path : [g.startNodeId],
        routeEdgeIds: result ? result.edgeIds : [],
        currentRouteIndex: -1,
        positionOnEdge: 0,
        isWaitingInQueue: false,
        waitingAtEdgeId: null,
        isEvacuated: false,
        waitTimeTotal: 0,
      };
    });
  }

  runFullOptimization(maxIterations: number = 4): OptimizationResult {
    // 1. Baseline
    const baselineGroups = this.computeBaselineRoutes();
    const baselineSim = new DiscreteTimeSimulator(this.nodes, this.edges, baselineGroups);
    const baselineOutcome = baselineSim.runFullSimulation();

    let bestGroups = baselineGroups.map((g) => ({
      ...g,
      route: [...g.route],
      routeEdgeIds: [...g.routeEdgeIds],
    }));
    let bestOutcome = baselineOutcome;
    let iterationsRun = 1;
    let totalReassigned = 0;

    const exitNodes = this.nodes.filter((n) => n.type === 'exit');
    const graph = new BuildingGraph(this.nodes, this.edges);

    // Iterative optimization heuristic
    for (let iter = 1; iter <= maxIterations; iter++) {
      // Find peak bottleneck edge
      let worstEdgeId = '';
      let worstPeak = 0;

      for (const f of bestOutcome.frames) {
        for (const [eid, st] of Object.entries(f.edgeStates)) {
          if (st.queue > worstPeak) {
            worstPeak = st.queue;
            worstEdgeId = eid;
          }
        }
      }

      if (worstPeak === 0 || !worstEdgeId) break;

      // Congestion penalty weight
      const customWeights = new Map<string, number>();
      for (const edge of this.edges) {
        if (edge.id === worstEdgeId) {
          customWeights.set(edge.id, edge.length * 5.0);
        } else {
          customWeights.set(edge.id, edge.length);
        }
      }

      // Reassign candidate groups using congested edge
      const candidateGroups: OccupantGroup[] = [];
      let iterReassigned = 0;

      for (let i = 0; i < bestGroups.length; i++) {
        const grp = bestGroups[i];
        const traversesBottleneck = grp.routeEdgeIds.includes(worstEdgeId);

        // Try reassigning subset of groups to balance load
        if (traversesBottleneck && (i % 2 === 1 || iter > 1)) {
          // Find alternative path to other exits
          let bestAlt: { path: string[]; edgeIds: string[]; exitId: string; cost: number } | null = null;

          for (const exit of exitNodes) {
            if (exit.id === grp.targetExitId && exitNodes.length > 1) continue; // explore other exits
            const altPath = graph.findShortestPath(grp.startNodeId, exit.id, customWeights);
            if (altPath) {
              if (!bestAlt || altPath.totalCost < bestAlt.cost) {
                bestAlt = {
                  path: altPath.path,
                  edgeIds: altPath.edgeIds,
                  exitId: exit.id,
                  cost: altPath.totalCost,
                };
              }
            }
          }

          if (bestAlt && bestAlt.path.join('->') !== grp.route.join('->')) {
            candidateGroups.push({
              ...grp,
              targetExitId: bestAlt.exitId,
              route: bestAlt.path,
              routeEdgeIds: bestAlt.edgeIds,
            });
            iterReassigned++;
          } else {
            candidateGroups.push({ ...grp });
          }
        } else {
          candidateGroups.push({ ...grp });
        }
      }

      if (iterReassigned === 0) break;

      const candSim = new DiscreteTimeSimulator(this.nodes, this.edges, candidateGroups);
      const candOutcome = candSim.runFullSimulation();

      // Check if improved completion time or peak queue
      const candScore = candOutcome.summary.completionTime * 10 + candOutcome.summary.peakQueueLength;
      const bestScore = bestOutcome.summary.completionTime * 10 + bestOutcome.summary.peakQueueLength;

      if (candScore < bestScore) {
        bestGroups = candidateGroups;
        bestOutcome = candOutcome;
        totalReassigned += iterReassigned;
        iterationsRun = iter;
      } else {
        break;
      }
    }

    const timeDiff = baselineOutcome.summary.completionTime - bestOutcome.summary.completionTime;
    const timePct =
      baselineOutcome.summary.completionTime > 0
        ? Math.round((timeDiff / baselineOutcome.summary.completionTime) * 100)
        : 0;

    const queueDiff = baselineOutcome.summary.peakQueueLength - bestOutcome.summary.peakQueueLength;
    const queuePct =
      baselineOutcome.summary.peakQueueLength > 0
        ? Math.round((queueDiff / baselineOutcome.summary.peakQueueLength) * 100)
        : 0;

    const waitDiff =
      Math.round((baselineOutcome.summary.averageWaitTime - bestOutcome.summary.averageWaitTime) * 10) / 10;

    return {
      baseline: {
        groups: baselineGroups,
        frames: baselineOutcome.frames,
        summary: baselineOutcome.summary,
      },
      optimized: {
        groups: bestGroups,
        frames: bestOutcome.frames,
        summary: bestOutcome.summary,
        iterationsRun,
        reassignedGroupsCount: totalReassigned,
      },
      improvements: {
        timeReductionSec: Math.max(0, timeDiff),
        timeReductionPercent: Math.max(0, timePct),
        queueReductionCount: Math.max(0, queueDiff),
        queueReductionPercent: Math.max(0, queuePct),
        waitReductionSec: Math.max(0, waitDiff),
      },
    };
  }
}

import { BuildingNode, BuildingEdge } from './types';

export interface GraphEdgeInfo {
  edge: BuildingEdge;
  targetNodeId: string;
  weight: number;
}

export class BuildingGraph {
  nodes: Map<string, BuildingNode> = new Map();
  edges: Map<string, BuildingEdge> = new Map();
  adjacency: Map<string, GraphEdgeInfo[]> = new Map();

  constructor(nodes: BuildingNode[], edges: BuildingEdge[]) {
    this.init(nodes, edges);
  }

  init(nodes: BuildingNode[], edges: BuildingEdge[]) {
    this.nodes.clear();
    this.edges.clear();
    this.adjacency.clear();

    for (const node of nodes) {
      this.nodes.set(node.id, node);
      this.adjacency.set(node.id, []);
    }

    for (const edge of edges) {
      this.edges.set(edge.id, edge);

      if (edge.isBlocked) {
        continue; // blocked corridor is untraversable
      }

      // from -> to
      this.adjacency.get(edge.from)?.push({
        edge,
        targetNodeId: edge.to,
        weight: edge.length,
      });

      // bidirectional support
      if (edge.bidirectional !== false) {
        this.adjacency.get(edge.to)?.push({
          edge,
          targetNodeId: edge.from,
          weight: edge.length,
        });
      }
    }
  }

  getExitNodes(): BuildingNode[] {
    return Array.from(this.nodes.values()).filter((n) => n.type === 'exit');
  }

  /**
   * A* algorithm to find the optimal path from startNodeId to the best reachable exit,
   * using an admissible heuristic (Manhattan or Euclidean distance by default).
   * heuristicFn: optional custom fn(nodeId, exitId) -> estimated remaining cost
   */
  findAStarPath(
    startNodeId: string,
    targetExitId?: string,
    heuristicFn?: (nodeId: string, exitId: string) => number
  ): { path: string[]; edgeIds: string[]; totalCost: number } | null {
    if (!this.nodes.has(startNodeId)) return null;

    const validExitIds = new Set(
      targetExitId
        ? [targetExitId]
        : this.getExitNodes().map((e) => e.id)
    );

    // Default heuristic: Euclidean distance between node positions (in meters, 1px = 1/50 m)
    const defaultHeuristic = (nodeId: string, exitId: string): number => {
      const node = this.nodes.get(nodeId);
      const exit = this.nodes.get(exitId);
      if (!node || !exit) return 0;
      const nx = (node as { x?: number }).x ?? 0;
      const ny = (node as { y?: number }).y ?? 0;
      const ex = (exit as { x?: number }).x ?? 0;
      const ey = (exit as { y?: number }).y ?? 0;
      // Manhattan distance scaled to meters (pixels / 50)
      return (Math.abs(nx - ex) + Math.abs(ny - ey)) / 50;
    };

    const h = heuristicFn ?? defaultHeuristic;

    // Find the best exit to target (lowest heuristic from start)
    const exitIds = Array.from(validExitIds);
    const bestExitId = exitIds.reduce((best, eid) => {
      return h(startNodeId, eid) < h(startNodeId, best) ? eid : best;
    }, exitIds[0]);
    if (!bestExitId) return null;

    // A* open set: sorted array acting as a min-heap on f = g + h
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const previous = new Map<string, { nodeId: string; edgeId: string } | null>();
    const closedSet = new Set<string>();

    for (const nodeId of Array.from(this.nodes.keys())) {
      gScore.set(nodeId, Infinity);
      fScore.set(nodeId, Infinity);
      previous.set(nodeId, null);
    }
    gScore.set(startNodeId, 0);
    fScore.set(startNodeId, h(startNodeId, bestExitId));

    // Open set as sorted array [{nodeId, f}]
    const openSet: Array<{ nodeId: string; f: number }> = [
      { nodeId: startNodeId, f: fScore.get(startNodeId)! },
    ];

    while (openSet.length > 0) {
      // Pop the node with the lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const { nodeId: current } = openSet.shift()!;

      if (closedSet.has(current)) continue;
      closedSet.add(current);

      // Goal check
      if (validExitIds.has(current)) {
        // Reconstruct path
        const path: string[] = [];
        const edgeIds: string[] = [];
        let curr: string | null = current;
        while (curr) {
          path.unshift(curr);
          const prev = previous.get(curr);
          if (prev) {
            edgeIds.unshift(prev.edgeId);
            curr = prev.nodeId;
          } else {
            curr = null;
          }
        }
        return { path, edgeIds, totalCost: gScore.get(current)! };
      }

      const neighbors = this.adjacency.get(current) || [];
      for (const { edge, targetNodeId, weight } of neighbors) {
        if (edge.isBlocked || closedSet.has(targetNodeId)) continue;

        const tentativeG = (gScore.get(current) ?? Infinity) + weight;
        if (tentativeG < (gScore.get(targetNodeId) ?? Infinity)) {
          gScore.set(targetNodeId, tentativeG);
          const fVal = tentativeG + h(targetNodeId, bestExitId);
          fScore.set(targetNodeId, fVal);
          previous.set(targetNodeId, { nodeId: current, edgeId: edge.id });
          openSet.push({ nodeId: targetNodeId, f: fVal });
        }
      }
    }

    return null; // No reachable exit
  }

  /**
   * Dijkstra algorithm to find shortest path from startNodeId to targetNodeId,
   * or to ANY reachable exit if targetNodeId is not specified.
   * customEdgeWeights optional map: edgeId -> cost multiplier or effective cost
   */
  findShortestPath(
    startNodeId: string,
    targetExitId?: string,
    customEdgeWeights?: Map<string, number>
  ): { path: string[]; edgeIds: string[]; totalCost: number } | null {
    if (!this.nodes.has(startNodeId)) return null;

    const distances = new Map<string, number>();
    const previous = new Map<string, { nodeId: string; edgeId: string } | null>();
    const visited = new Set<string>();

    for (const nodeId of Array.from(this.nodes.keys())) {
      distances.set(nodeId, Infinity);
      previous.set(nodeId, null);
    }
    distances.set(startNodeId, 0);

    const validExitIds = new Set(
      targetExitId
        ? [targetExitId]
        : this.getExitNodes().map((e) => e.id)
    );

    while (visited.size < this.nodes.size) {
      // Pick unvisited node with smallest distance
      let minDistance = Infinity;
      let currentNodeId: string | null = null;

      for (const [nodeId, dist] of Array.from(distances.entries())) {
        if (!visited.has(nodeId) && dist < minDistance) {
          minDistance = dist;
          currentNodeId = nodeId;
        }
      }

      if (currentNodeId === null || minDistance === Infinity) break;

      // Check if we reached a destination exit
      if (validExitIds.has(currentNodeId) && (targetExitId || minDistance < Infinity)) {
        // Reconstruct path
        const path: string[] = [];
        const edgeIds: string[] = [];
        let curr: string | null = currentNodeId;

        while (curr) {
          path.unshift(curr);
          const prev = previous.get(curr);
          if (prev) {
            edgeIds.unshift(prev.edgeId);
            curr = prev.nodeId;
          } else {
            curr = null;
          }
        }

        return { path, edgeIds, totalCost: minDistance };
      }

      visited.add(currentNodeId);

      const neighbors = this.adjacency.get(currentNodeId) || [];
      for (const { edge, targetNodeId, weight } of neighbors) {
        if (edge.isBlocked || visited.has(targetNodeId)) continue;

        let edgeCost = weight;
        if (customEdgeWeights && customEdgeWeights.has(edge.id)) {
          edgeCost = customEdgeWeights.get(edge.id)!;
        }

        const alt = minDistance + edgeCost;
        if (alt < (distances.get(targetNodeId) ?? Infinity)) {
          distances.set(targetNodeId, alt);
          previous.set(targetNodeId, { nodeId: currentNodeId, edgeId: edge.id });
        }
      }
    }

    return null; // No reachable exit
  }
}

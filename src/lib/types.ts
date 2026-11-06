// Unified types for visual dot simulator and graph simulator

export interface Point {
  x: number;
  y: number;
}

export interface RoomDef {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  initialOccupants: number;
}

export interface DoorDef {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  capacity: number;
  isBlocked?: boolean;
}

export interface ExitDef {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isBlocked?: boolean;
}

export interface FireHazard {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface MapDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  width: number;
  height: number;
  rooms: RoomDef[];
  doors: DoorDef[];
  exits: ExitDef[];
  routes: {
    fromRoomId: string;
    targetExitId: string;
    waypoints: Point[];
    isPrimaryShortest?: boolean;
  }[];
}

export interface AgentDot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetExitId: string;
  waypoints: Point[];
  currentWaypointIndex: number;
  baseSpeed: number;
  effectiveSpeed: number;
  radius: number;
  color: string;
  isEvacuated: boolean;
  evacuatedTime: number | null;
  isQueued: boolean;
  waitingTime: number;
  roomId: string;
}

export type RoutingStrategy = 'shortest' | 'smart_safe';

// Backwards compatibility types for components and graph logic
export type NodeType = 'room' | 'junction' | 'exit';

export interface BuildingNode {
  id: string;
  name: string;
  type: NodeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  initialOccupants?: number;
  labelPosition?: 'top' | 'bottom' | 'inside';
}

export interface BuildingEdge {
  id: string;
  name: string;
  from: string;
  to: string;
  bidirectional?: boolean;
  length: number;
  width: number;
  capacity: number;
  maxFlowRate: number;
  isBlocked?: boolean;
}

export interface OccupantGroup {
  id: string;
  name: string;
  population: number;
  startNodeId: string;
  targetExitId: string;
  speed: number;
  route: string[];
  routeEdgeIds: string[];
  currentRouteIndex: number;
  positionOnEdge: number;
  isWaitingInQueue: boolean;
  waitingAtEdgeId: string | null;
  isEvacuated: boolean;
  evacuationTime?: number;
  waitTimeTotal: number;
}

export interface EdgeRuntimeState {
  edgeId: string;
  occupancy: number;
  queue: number;
  flowThroughput: number;
  utilization: number;
  peakQueue: number;
  totalWaitTime: number;
  isBottleneck: boolean;
  isBlocked: boolean;
}

export interface SimulationFrame {
  time: number;
  totalOccupants: number;
  evacuatedCount: number;
  activeGroups: {
    id: string;
    population: number;
    currentEdgeId: string | null;
    currentNodeId: string;
    positionOnEdge: number;
    isWaiting: boolean;
    isEvacuated: boolean;
  }[];
  edgeStates: Record<string, EdgeRuntimeState>;
  primaryBottleneck: {
    edgeId: string;
    name: string;
    queue: number;
    utilization: number;
  } | null;
}

export interface SimulationSummary {
  completionTime: number;
  totalOccupants: number;
  peakQueueLength: number;
  primaryBottleneckCorridor: string;
  averageWaitTime: number;
  exitDistribution: Record<string, number>;
  timeSeries: {
    time: number;
    evacuated: number;
    activeQueue: number;
    maxUtilization: number;
  }[];
}

export interface BuildingScenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'benchmark' | 'academic' | 'blocked_test';
  nodes: BuildingNode[];
  edges: BuildingEdge[];
  groups: {
    id: string;
    name: string;
    population: number;
    startNodeId: string;
    preferredExitId?: string;
  }[];
}

export type EvacuationStrategy = 'baseline' | 'optimized';

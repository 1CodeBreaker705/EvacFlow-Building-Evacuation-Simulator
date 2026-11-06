import { BuildingScenario } from './types';

export const SCENARIOS: BuildingScenario[] = [
  {
    id: 'illustrative_benchmark',
    title: 'Research Paper Benchmark (Illustrative Scenario)',
    subtitle: '150 Occupants • Exit A & B • Corridor C2 Bottleneck (Sec 5.8 & VII)',
    category: 'benchmark',
    description:
      'The exact benchmark scenario defined in Section 5.8 of the Minor Project Synopsis and Section VII of the Research Paper. Under baseline shortest-path distance routing, 115 of the 150 occupants choose Corridor C2 to reach Exit A, producing a peak queue of 34 people and a 48s evacuation time. Congestion-aware optimization dynamically reroutes groups to Exit B, cutting queue to 0 and completion time to 32s.',
    nodes: [
      // Rooms
      { id: 'room-1', name: 'Room R1', type: 'room', x: 80, y: 80, width: 110, height: 75, initialOccupants: 40 },
      { id: 'room-2', name: 'Room R2', type: 'room', x: 240, y: 80, width: 110, height: 75, initialOccupants: 35 },
      { id: 'room-3', name: 'Room R3', type: 'room', x: 80, y: 320, width: 110, height: 75, initialOccupants: 40 },
      { id: 'room-4', name: 'Room R4', type: 'room', x: 240, y: 320, width: 110, height: 75, initialOccupants: 35 },

      // Corridors / Junctions
      { id: 'junc-1', name: 'Junction J1', type: 'junction', x: 200, y: 195 },
      { id: 'junc-2', name: 'Junction J2', type: 'junction', x: 420, y: 195 },
      { id: 'junc-3', name: 'Junction J3', type: 'junction', x: 200, y: 265 },
      { id: 'junc-4', name: 'Junction J4', type: 'junction', x: 420, y: 330 },

      // Exits
      { id: 'exit-a', name: 'Exit A (North East)', type: 'exit', x: 620, y: 195, width: 70, height: 50 },
      { id: 'exit-b', name: 'Exit B (South East)', type: 'exit', x: 620, y: 330, width: 70, height: 50 },
    ],
    edges: [
      // Room connectors to J1
      { id: 'c-r1-j1', name: 'Connector R1-J1', from: 'room-1', to: 'junc-1', length: 6, width: 2.5, capacity: 45, maxFlowRate: 8 },
      { id: 'c-r2-j1', name: 'Connector R2-J1', from: 'room-2', to: 'junc-1', length: 6, width: 2.5, capacity: 45, maxFlowRate: 8 },

      // Crucial bottleneck corridor C2 from Paper (Capacity 25, maxFlowRate 2.8 ppl/s)
      { id: 'c2', name: 'Corridor C2 (Main Hallway)', from: 'junc-1', to: 'junc-2', length: 11, width: 1.8, capacity: 25, maxFlowRate: 2.8 },

      // J2 to Exit A
      { id: 'c-j2-exita', name: 'Concourse to Exit A', from: 'junc-2', to: 'exit-a', length: 6, width: 2.8, capacity: 50, maxFlowRate: 8 },

      // Rooms 3 & 4 to Junction 3
      { id: 'c-r3-j3', name: 'Connector R3-J3', from: 'room-3', to: 'junc-3', length: 6, width: 2.5, capacity: 45, maxFlowRate: 8 },
      { id: 'c-r4-j3', name: 'Connector R4-J3', from: 'room-4', to: 'junc-3', length: 6, width: 2.5, capacity: 45, maxFlowRate: 8 },

      // Cross link between J3 and J1
      { id: 'c-j3-j1', name: 'Atrium Crosswalk (J3-J1)', from: 'junc-3', to: 'junc-1', length: 8, width: 2.2, capacity: 35, maxFlowRate: 6 },

      // Alternate route to Exit B via Corridor C4
      { id: 'c4', name: 'Corridor C4 (South Bypass)', from: 'junc-3', to: 'junc-4', length: 12, width: 3.0, capacity: 60, maxFlowRate: 8 },
      { id: 'c-j4-exitb', name: 'Concourse to Exit B', from: 'junc-4', to: 'exit-b', length: 6, width: 2.8, capacity: 50, maxFlowRate: 8 },
    ],
    groups: [
      // 150 occupants: In baseline, R1, R2, and R3 choose Exit A via C2!
      { id: 'grp-r1-a', name: 'Group R1-A', population: 20, startNodeId: 'room-1', preferredExitId: 'exit-a' },
      { id: 'grp-r1-b', name: 'Group R1-B', population: 20, startNodeId: 'room-1', preferredExitId: 'exit-a' },
      { id: 'grp-r2-a', name: 'Group R2-A', population: 18, startNodeId: 'room-2', preferredExitId: 'exit-a' },
      { id: 'grp-r2-b', name: 'Group R2-B', population: 17, startNodeId: 'room-2', preferredExitId: 'exit-a' },
      { id: 'grp-r3-a', name: 'Group R3-A', population: 20, startNodeId: 'room-3', preferredExitId: 'exit-a' },
      { id: 'grp-r3-b', name: 'Group R3-B', population: 20, startNodeId: 'room-3', preferredExitId: 'exit-a' },
      { id: 'grp-r4-a', name: 'Group R4-A', population: 18, startNodeId: 'room-4', preferredExitId: 'exit-b' },
      { id: 'grp-r4-b', name: 'Group R4-B', population: 17, startNodeId: 'room-4', preferredExitId: 'exit-b' },
    ],
  },
  {
    id: 'mait_academic_block',
    title: 'MAIT CSE Academic Department (Block 1)',
    subtitle: '240 Students • 6 Labs/Classrooms • 3 Fire Exits',
    category: 'academic',
    description:
      'Departmental floor plan modeling Maharaja Agrasen Institute of Technology CSE block with 6 labs/lecture rooms, high student occupancy (240), central atrium connector, and three strategic emergency exits.',
    nodes: [
      { id: 'lab-ds', name: 'DS & Algo Lab', type: 'room', x: 80, y: 70, width: 125, height: 70, initialOccupants: 45 },
      { id: 'lab-ai', name: 'AI & Robotics Lab', type: 'room', x: 245, y: 70, width: 125, height: 70, initialOccupants: 40 },
      { id: 'lab-sys', name: 'Systems Lab', type: 'room', x: 410, y: 70, width: 125, height: 70, initialOccupants: 35 },
      { id: 'cr-401', name: 'Classroom 401', type: 'room', x: 80, y: 340, width: 125, height: 70, initialOccupants: 40 },
      { id: 'cr-402', name: 'Classroom 402', type: 'room', x: 245, y: 340, width: 125, height: 70, initialOccupants: 45 },
      { id: 'cr-403', name: 'Seminar Hall', type: 'room', x: 410, y: 340, width: 125, height: 70, initialOccupants: 35 },

      { id: 'j-north-1', name: 'North Junction W', type: 'junction', x: 140, y: 190 },
      { id: 'j-north-2', name: 'North Lobby', type: 'junction', x: 305, y: 190 },
      { id: 'j-north-3', name: 'North Junction E', type: 'junction', x: 470, y: 190 },
      { id: 'j-south-1', name: 'South Junction W', type: 'junction', x: 140, y: 260 },
      { id: 'j-south-2', name: 'South Lobby', type: 'junction', x: 305, y: 260 },
      { id: 'j-south-3', name: 'South Junction E', type: 'junction', x: 470, y: 260 },

      { id: 'exit-west', name: 'West Fire Stair', type: 'exit', x: 20, y: 225, width: 50, height: 60 },
      { id: 'exit-main', name: 'Main East Foyer', type: 'exit', x: 620, y: 190, width: 65, height: 50 },
      { id: 'exit-south', name: 'South Quad Stair', type: 'exit', x: 305, y: 440, width: 75, height: 45 },
    ],
    edges: [
      { id: 'e-lab1', name: 'DS Lab Exit', from: 'lab-ds', to: 'j-north-1', length: 10, width: 2, capacity: 40, maxFlowRate: 6 },
      { id: 'e-lab2', name: 'AI Lab Exit', from: 'lab-ai', to: 'j-north-2', length: 10, width: 2, capacity: 40, maxFlowRate: 6 },
      { id: 'e-lab3', name: 'Sys Lab Exit', from: 'lab-sys', to: 'j-north-3', length: 10, width: 2, capacity: 40, maxFlowRate: 6 },

      { id: 'e-cr1', name: 'CR 401 Exit', from: 'cr-401', to: 'j-south-1', length: 10, width: 2, capacity: 40, maxFlowRate: 6 },
      { id: 'e-cr2', name: 'CR 402 Exit', from: 'cr-402', to: 'j-south-2', length: 10, width: 2, capacity: 40, maxFlowRate: 6 },
      { id: 'e-cr3', name: 'Seminar Hall Exit', from: 'cr-403', to: 'j-south-3', length: 10, width: 2, capacity: 40, maxFlowRate: 6 },

      { id: 'e-n1-n2', name: 'North Hall West', from: 'j-north-1', to: 'j-north-2', length: 15, width: 2.2, capacity: 30, maxFlowRate: 4 },
      { id: 'e-n2-n3', name: 'North Hall East', from: 'j-north-2', to: 'j-north-3', length: 15, width: 2.2, capacity: 30, maxFlowRate: 4 },
      { id: 'e-s1-s2', name: 'South Hall West', from: 'j-south-1', to: 'j-south-2', length: 15, width: 2.2, capacity: 30, maxFlowRate: 4 },
      { id: 'e-s2-s3', name: 'South Hall East', from: 'j-south-2', to: 'j-south-3', length: 15, width: 2.2, capacity: 30, maxFlowRate: 4 },

      { id: 'e-atrium-w', name: 'Atrium Cross W', from: 'j-north-1', to: 'j-south-1', length: 12, width: 2.0, capacity: 25, maxFlowRate: 4 },
      { id: 'e-atrium-c', name: 'Central Grand Lobby', from: 'j-north-2', to: 'j-south-2', length: 12, width: 4.0, capacity: 60, maxFlowRate: 8 },
      { id: 'e-atrium-e', name: 'Atrium Cross E', from: 'j-north-3', to: 'j-south-3', length: 12, width: 2.0, capacity: 25, maxFlowRate: 4 },

      { id: 'e-exit-w', name: 'West Fire Stair Passage', from: 'j-north-1', to: 'exit-west', length: 14, width: 1.8, capacity: 25, maxFlowRate: 3 },
      { id: 'e-exit-main', name: 'Main East Exit Concourse', from: 'j-north-3', to: 'exit-main', length: 16, width: 3.2, capacity: 60, maxFlowRate: 7 },
      { id: 'e-exit-south', name: 'South Quad Exit Passage', from: 'j-south-2', to: 'exit-south', length: 14, width: 2.6, capacity: 45, maxFlowRate: 5 },
    ],
    groups: [
      { id: 'g-ds1', name: 'DS Lab Grp 1', population: 25, startNodeId: 'lab-ds' },
      { id: 'g-ds2', name: 'DS Lab Grp 2', population: 20, startNodeId: 'lab-ds' },
      { id: 'g-ai1', name: 'AI Lab Grp 1', population: 20, startNodeId: 'lab-ai' },
      { id: 'g-ai2', name: 'AI Lab Grp 2', population: 20, startNodeId: 'lab-ai' },
      { id: 'g-sys1', name: 'Sys Lab Grp 1', population: 20, startNodeId: 'lab-sys' },
      { id: 'g-sys2', name: 'Sys Lab Grp 2', population: 15, startNodeId: 'lab-sys' },
      { id: 'g-cr1-a', name: 'CR 401 Grp 1', population: 20, startNodeId: 'cr-401' },
      { id: 'g-cr1-b', name: 'CR 401 Grp 2', population: 20, startNodeId: 'cr-401' },
      { id: 'g-cr2-a', name: 'CR 402 Grp 1', population: 25, startNodeId: 'cr-402' },
      { id: 'g-cr2-b', name: 'CR 402 Grp 2', population: 20, startNodeId: 'cr-402' },
      { id: 'g-sem-a', name: 'Seminar Grp 1', population: 20, startNodeId: 'cr-403' },
      { id: 'g-sem-b', name: 'Seminar Grp 2', population: 15, startNodeId: 'cr-403' },
    ],
  },
  {
    id: 'blocked_emergency_hazard',
    title: 'Blocked Corridor / Active Fire Hazard Scenario',
    subtitle: 'Degraded Network • Real-Time Dynamic Recalculation',
    category: 'blocked_test',
    description:
      'Demonstrates emergency hazard resilience (Paper Section V-F). When the primary direct corridor is blocked by fire or structural damage, EvacFlow detects the disruption, removes the compromised graph edges, and recalculates safe evacuation bypass routes.',
    nodes: [
      { id: 'room-alpha', name: 'Complex Zone A', type: 'room', x: 90, y: 80, width: 125, height: 75, initialOccupants: 50 },
      { id: 'room-beta', name: 'Complex Zone B', type: 'room', x: 90, y: 310, width: 125, height: 75, initialOccupants: 50 },
      { id: 'j-central', name: 'Central Foyer', type: 'junction', x: 260, y: 200 },
      { id: 'j-east-upper', name: 'North Junction', type: 'junction', x: 420, y: 130 },
      { id: 'j-east-lower', name: 'South Junction', type: 'junction', x: 420, y: 280 },
      { id: 'exit-alpha', name: 'Primary Exit Alpha', type: 'exit', x: 620, y: 130, width: 70, height: 50 },
      { id: 'exit-beta', name: 'Emergency Exit Beta', type: 'exit', x: 620, y: 280, width: 70, height: 50 },
    ],
    edges: [
      { id: 'e-ra-c', name: 'Zone A Concourse', from: 'room-alpha', to: 'j-central', length: 12, width: 2.5, capacity: 50, maxFlowRate: 6 },
      { id: 'e-rb-c', name: 'Zone B Concourse', from: 'room-beta', to: 'j-central', length: 12, width: 2.5, capacity: 50, maxFlowRate: 6 },
      { id: 'e-c-u', name: 'Direct East Corridor (🔥 Fire Hazard)', from: 'j-central', to: 'j-east-upper', length: 14, width: 2.0, capacity: 30, maxFlowRate: 4, isBlocked: true },
      { id: 'e-c-l', name: 'Reinforced South Bypass', from: 'j-central', to: 'j-east-lower', length: 16, width: 2.5, capacity: 50, maxFlowRate: 6 },
      { id: 'e-u-exit', name: 'Exit Alpha Gate', from: 'j-east-upper', to: 'exit-alpha', length: 10, width: 2.5, capacity: 40, maxFlowRate: 6 },
      { id: 'e-l-exit', name: 'Exit Beta Gate', from: 'j-east-lower', to: 'exit-beta', length: 10, width: 2.5, capacity: 40, maxFlowRate: 6 },
      { id: 'e-cross-ver', name: 'Fire Escape Connector', from: 'j-east-lower', to: 'j-east-upper', length: 12, width: 2.0, capacity: 30, maxFlowRate: 4 },
    ],
    groups: [
      { id: 'g-h1', name: 'Zone A Crew 1', population: 25, startNodeId: 'room-alpha' },
      { id: 'g-h2', name: 'Zone A Crew 2', population: 25, startNodeId: 'room-alpha' },
      { id: 'g-h3', name: 'Zone B Crew 1', population: 25, startNodeId: 'room-beta' },
      { id: 'g-h4', name: 'Zone B Crew 2', population: 25, startNodeId: 'room-beta' },
    ],
  },
];

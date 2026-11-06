import { MapDefinition } from './types';

export const MAPS: MapDefinition[] = [
  {
    id: 'college_dept',
    title: 'MAIT CSE Academic Department',
    subtitle: 'Labs, Lecture Rooms & Dual Stairwell Exits',
    description:
      'Models a college department floor. Shortest path funnels all students toward the Main Stairwell, creating severe crowd congestion. Smart routing splits flow to the North Fire Staircase.',
    width: 860,
    height: 520,
    rooms: [
      { id: 'room_ds', name: 'DS & Algo Lab', x: 60, y: 50, w: 170, h: 120, color: '#1e293b', initialOccupants: 35 },
      { id: 'room_ai', name: 'AI & Robotics Lab', x: 260, y: 50, w: 170, h: 120, color: '#1e293b', initialOccupants: 35 },
      { id: 'room_fac', name: 'Faculty Cabin', x: 460, y: 50, w: 160, h: 120, color: '#1e293b', initialOccupants: 15 },
      { id: 'room_cr1', name: 'Lecture Hall 101', x: 60, y: 350, w: 170, h: 120, color: '#1e293b', initialOccupants: 40 },
      { id: 'room_cr2', name: 'Lecture Hall 102', x: 260, y: 350, w: 170, h: 120, color: '#1e293b', initialOccupants: 40 },
      { id: 'room_sem', name: 'Seminar Hall', x: 460, y: 350, w: 160, h: 120, color: '#1e293b', initialOccupants: 35 },
    ],
    doors: [
      { id: 'door_ds', name: 'DS Lab Door', x: 135, y: 170, w: 22, h: 14, capacity: 3 },
      { id: 'door_ai', name: 'AI Lab Door', x: 335, y: 170, w: 22, h: 14, capacity: 3 },
      { id: 'door_fac', name: 'Faculty Door', x: 530, y: 170, w: 20, h: 14, capacity: 2 },
      { id: 'door_cr1', name: 'CR 101 Door', x: 135, y: 336, w: 22, h: 14, capacity: 3 },
      { id: 'door_cr2', name: 'CR 102 Door', x: 335, y: 336, w: 22, h: 14, capacity: 3 },
      { id: 'door_sem', name: 'Seminar Door', x: 530, y: 336, w: 22, h: 14, capacity: 3 },
      // Central choke door
      { id: 'door_choke', name: 'Main Concourse Gate', x: 640, y: 245, w: 16, h: 45, capacity: 3 },
    ],
    exits: [
      { id: 'exit_main', name: 'Main South Foyer', x: 800, y: 235, w: 40, h: 65 },
      { id: 'exit_fire', name: 'North Fire Stair', x: 40, y: 235, w: 40, h: 65 },
    ],
    routes: [
      // From DS Lab
      {
        fromRoomId: 'room_ds',
        targetExitId: 'exit_main',
        waypoints: [{ x: 145, y: 210 }, { x: 360, y: 265 }, { x: 630, y: 265 }, { x: 800, y: 265 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'room_ds',
        targetExitId: 'exit_fire',
        waypoints: [{ x: 145, y: 210 }, { x: 70, y: 265 }],
      },
      // From AI Lab
      {
        fromRoomId: 'room_ai',
        targetExitId: 'exit_main',
        waypoints: [{ x: 345, y: 210 }, { x: 630, y: 265 }, { x: 800, y: 265 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'room_ai',
        targetExitId: 'exit_fire',
        waypoints: [{ x: 345, y: 210 }, { x: 145, y: 265 }, { x: 70, y: 265 }],
      },
      // From Faculty
      {
        fromRoomId: 'room_fac',
        targetExitId: 'exit_main',
        waypoints: [{ x: 540, y: 210 }, { x: 630, y: 265 }, { x: 800, y: 265 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'room_fac',
        targetExitId: 'exit_fire',
        waypoints: [{ x: 540, y: 210 }, { x: 260, y: 265 }, { x: 70, y: 265 }],
      },
      // From CR 101
      {
        fromRoomId: 'room_cr1',
        targetExitId: 'exit_fire',
        waypoints: [{ x: 145, y: 310 }, { x: 70, y: 265 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'room_cr1',
        targetExitId: 'exit_main',
        waypoints: [{ x: 145, y: 310 }, { x: 360, y: 265 }, { x: 630, y: 265 }, { x: 800, y: 265 }],
      },
      // From CR 102
      {
        fromRoomId: 'room_cr2',
        targetExitId: 'exit_main',
        waypoints: [{ x: 345, y: 310 }, { x: 630, y: 265 }, { x: 800, y: 265 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'room_cr2',
        targetExitId: 'exit_fire',
        waypoints: [{ x: 345, y: 310 }, { x: 145, y: 265 }, { x: 70, y: 265 }],
      },
      // From Seminar
      {
        fromRoomId: 'room_sem',
        targetExitId: 'exit_main',
        waypoints: [{ x: 540, y: 310 }, { x: 630, y: 265 }, { x: 800, y: 265 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'room_sem',
        targetExitId: 'exit_fire',
        waypoints: [{ x: 540, y: 310 }, { x: 260, y: 265 }, { x: 70, y: 265 }],
      },
    ],
  },
  {
    id: 'benchmark_c2',
    title: 'Research Benchmark (Corridor C2 Chokepoint)',
    subtitle: '150 Occupants • Corridor C2 Bottleneck from Synopsis',
    description:
      'Directly recreates the 150-person scenario from Section 5.8 of the synopsis. With distance-only routing, dots from Rooms 1, 2, and 3 jam into narrow Corridor C2. Smart routing reroutes to Exit B.',
    width: 860,
    height: 520,
    rooms: [
      { id: 'b_r1', name: 'Room R1 (40)', x: 70, y: 60, w: 180, h: 120, color: '#1e293b', initialOccupants: 40 },
      { id: 'b_r2', name: 'Room R2 (35)', x: 280, y: 60, w: 180, h: 120, color: '#1e293b', initialOccupants: 35 },
      { id: 'b_r3', name: 'Room R3 (40)', x: 70, y: 340, w: 180, h: 120, color: '#1e293b', initialOccupants: 40 },
      { id: 'b_r4', name: 'Room R4 (35)', x: 280, y: 340, w: 180, h: 120, color: '#1e293b', initialOccupants: 35 },
    ],
    doors: [
      { id: 'd_r1', name: 'R1 Door', x: 150, y: 180, w: 24, h: 14, capacity: 4 },
      { id: 'd_r2', name: 'R2 Door', x: 360, y: 180, w: 24, h: 14, capacity: 4 },
      // The famous bottleneck C2 door
      { id: 'd_c2', name: 'Corridor C2 Choke (Narrow Door)', x: 520, y: 215, w: 16, h: 36, capacity: 2 },
      { id: 'd_r3', name: 'R3 Door', x: 150, y: 326, w: 24, h: 14, capacity: 4 },
      { id: 'd_r4', name: 'R4 Door', x: 360, y: 326, w: 24, h: 14, capacity: 4 },
      // Wide bypass C4
      { id: 'd_c4', name: 'Corridor C4 (Wide Bypass)', x: 520, y: 385, w: 16, h: 50, capacity: 6 },
    ],
    exits: [
      { id: 'exit_a', name: 'Exit A (North East)', x: 780, y: 200, w: 45, h: 65 },
      { id: 'exit_b', name: 'Exit B (South East)', x: 780, y: 375, w: 45, h: 65 },
    ],
    routes: [
      {
        fromRoomId: 'b_r1',
        targetExitId: 'exit_a',
        waypoints: [{ x: 160, y: 230 }, { x: 420, y: 230 }, { x: 520, y: 230 }, { x: 780, y: 230 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'b_r1',
        targetExitId: 'exit_b',
        waypoints: [{ x: 160, y: 230 }, { x: 260, y: 310 }, { x: 520, y: 400 }, { x: 780, y: 400 }],
      },
      {
        fromRoomId: 'b_r2',
        targetExitId: 'exit_a',
        waypoints: [{ x: 370, y: 230 }, { x: 520, y: 230 }, { x: 780, y: 230 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'b_r2',
        targetExitId: 'exit_b',
        waypoints: [{ x: 370, y: 230 }, { x: 370, y: 310 }, { x: 520, y: 400 }, { x: 780, y: 400 }],
      },
      {
        fromRoomId: 'b_r3',
        targetExitId: 'exit_a',
        waypoints: [{ x: 160, y: 310 }, { x: 260, y: 230 }, { x: 520, y: 230 }, { x: 780, y: 230 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'b_r3',
        targetExitId: 'exit_b',
        waypoints: [{ x: 160, y: 310 }, { x: 520, y: 400 }, { x: 780, y: 400 }],
      },
      {
        fromRoomId: 'b_r4',
        targetExitId: 'exit_b',
        waypoints: [{ x: 370, y: 310 }, { x: 520, y: 400 }, { x: 780, y: 400 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'b_r4',
        targetExitId: 'exit_a',
        waypoints: [{ x: 370, y: 310 }, { x: 420, y: 230 }, { x: 520, y: 230 }, { x: 780, y: 230 }],
      },
    ],
  },
  {
    id: 'mall_atrium',
    title: 'Grand Mall & Central Atrium',
    subtitle: 'High Crowd Density • Main Glass Door vs Side Fire Exits',
    description:
      'Shows panic crowds funneling to the front entrance. When fire breaks out in the central concourse, shortest-path leads directly toward danger; smart evacuation guides people away to side emergency exits.',
    width: 860,
    height: 520,
    rooms: [
      { id: 'store_a', name: 'Anchor Store A', x: 60, y: 50, w: 220, h: 130, color: '#1e293b', initialOccupants: 50 },
      { id: 'store_b', name: 'Tech Store B', x: 320, y: 50, w: 200, h: 130, color: '#1e293b', initialOccupants: 40 },
      { id: 'store_c', name: 'Food Court C', x: 60, y: 340, w: 220, h: 130, color: '#1e293b', initialOccupants: 60 },
      { id: 'store_d', name: 'Retail Store D', x: 320, y: 340, w: 200, h: 130, color: '#1e293b', initialOccupants: 40 },
    ],
    doors: [
      { id: 'd_m1', name: 'Store A Exit', x: 160, y: 180, w: 28, h: 14, capacity: 4 },
      { id: 'd_m2', name: 'Store B Exit', x: 410, y: 180, w: 28, h: 14, capacity: 4 },
      { id: 'd_m3', name: 'Food Court Exit', x: 160, y: 326, w: 28, h: 14, capacity: 4 },
      { id: 'd_m4', name: 'Store D Exit', x: 410, y: 326, w: 28, h: 14, capacity: 4 },
      // Central Atrium narrows
      { id: 'd_atrium', name: 'Central Revolving Door', x: 600, y: 235, w: 16, h: 50, capacity: 3 },
    ],
    exits: [
      { id: 'exit_glass', name: 'Main Glass Atrium Exit', x: 790, y: 225, w: 45, h: 70 },
      { id: 'exit_serv_n', name: 'North Fire Stairs', x: 40, y: 75, w: 40, h: 60 },
      { id: 'exit_serv_s', name: 'South Service Fire Door', x: 40, y: 385, w: 40, h: 60 },
    ],
    routes: [
      {
        fromRoomId: 'store_a',
        targetExitId: 'exit_glass',
        waypoints: [{ x: 170, y: 230 }, { x: 590, y: 260 }, { x: 790, y: 260 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'store_a',
        targetExitId: 'exit_serv_n',
        waypoints: [{ x: 170, y: 110 }, { x: 60, y: 105 }],
      },
      {
        fromRoomId: 'store_b',
        targetExitId: 'exit_glass',
        waypoints: [{ x: 420, y: 230 }, { x: 590, y: 260 }, { x: 790, y: 260 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'store_b',
        targetExitId: 'exit_serv_n',
        waypoints: [{ x: 300, y: 110 }, { x: 60, y: 105 }],
      },
      {
        fromRoomId: 'store_c',
        targetExitId: 'exit_glass',
        waypoints: [{ x: 170, y: 290 }, { x: 590, y: 260 }, { x: 790, y: 260 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'store_c',
        targetExitId: 'exit_serv_s',
        waypoints: [{ x: 170, y: 410 }, { x: 60, y: 415 }],
      },
      {
        fromRoomId: 'store_d',
        targetExitId: 'exit_glass',
        waypoints: [{ x: 420, y: 290 }, { x: 590, y: 260 }, { x: 790, y: 260 }],
        isPrimaryShortest: true,
      },
      {
        fromRoomId: 'store_d',
        targetExitId: 'exit_serv_s',
        waypoints: [{ x: 300, y: 410 }, { x: 60, y: 415 }],
      },
    ],
  },
];

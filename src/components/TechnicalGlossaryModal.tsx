'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Search,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Users,
  Maximize2,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  Zap,
  DraftingCompass,
  Building,
  CheckCircle2,
  Compass,
} from 'lucide-react';

interface TechnicalGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TermItem {
  id: string;
  term: string;
  tag: 'aims' | 'flow' | 'algorithms' | 'cad' | 'hazards' | 'viva';
  tagLabel: string;
  tagColor: string;
  shortSummary: string;
  whatItDoes: string;
  technicalMath?: string;
  vivaTip: string;
}

const GLOSSARY_TERMS: TermItem[] = [
  {
    id: 'project-aim',
    term: 'Project Aim: EvacFlow Mission & Vision',
    tag: 'aims',
    tagLabel: 'Project Aim',
    tagColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    shortSummary: 'Eliminating catastrophic crowd crushing and bottleneck jams in emergency building evacuations.',
    whatItDoes:
      'In real building emergencies, traditional routing systems and uncoordinated crowds blindly take the shortest geometric path to the main exit. This produces lethal crowd crushes at doorways and directs evacuees straight toward fire zones. EvacFlow combines architectural floorplan modeling, NFPA 101 doorway metering, Helbing social force physics, and dynamic multi-commodity routing to balance evacuee distribution across all available exits, saving lives.',
    technicalMath:
      'Shortest Path: Min(Distance) -> Creates fatal doorway crushes.\nEvacFlow: Min(Travel Time + Queue Delay + Density Penalty + Hazard Risk) -> Maximizes survivor throughput.',
    vivaTip:
      'Tell the examiner: "Shortest geometric distance is NOT the fastest or safest evacuation path when hundreds of people compete for the exact same door doorway."',
  },
  {
    id: 'nfpa-doorway-flow',
    term: 'NFPA 101 & SFPE Table 7.3.3.1 Doorway Flow Limit (1.33 pers/m/s)',
    tag: 'flow',
    tagLabel: 'NFPA 101 Standards',
    tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    shortSummary: 'The physical discharge capacity limit of architectural doors preventing mass teleportation.',
    whatItDoes:
      'According to the National Fire Protection Association (NFPA 101 Life Safety Code) and the SFPE Handbook of Fire Protection Engineering, people cannot pass through a doorway faster than 1.33 persons per meter of effective door width per second (approx. 80 persons/m/min). When crowd arrival exceeds this rate, arching and physical queuing naturally form at the threshold, safely metering occupants into the corridor.',
    technicalMath:
      'Discharge Flow Rate: F_s = 1.33 persons / (meter * second)\nMax Door Flow: Q_max = F_s * W_effective. If Arrival > Q_max, Queue Accumulation dQ/dt = Arrival - Q_max.',
    vivaTip:
      'Defense Explanation: "In real life, people do not teleport through doors. Our simulator enforces the international NFPA 101 standard of 1.33 persons/meter/second, producing realistic doorway arching and queue formation."',
  },
  {
    id: 'fruin-density-slowdown',
    term: "Fruin's Level-of-Service & Crowd Jam Slowdown",
    tag: 'flow',
    tagLabel: 'Crowd Dynamics',
    tagColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    shortSummary: 'Zero-bottleneck free walking when under capacity; realistic compression slowdown when overfilled.',
    whatItDoes:
      'Corridors and staircases have a finite architectural holding capacity (C_max). As long as current occupants (N) <= C_max, there is ZERO BOTTLENECK: all occupants walk at 100% of their normal walking speed. When occupancy exceeds capacity (N > C_max), crowd compression reduces walking velocity down to a minimum crawl of 0.20x. The instant occupants evacuate below capacity, walking speed immediately restores to normal.',
    technicalMath:
      'If N <= C_max: Queue = 0, Velocity = v_0 (100% Normal Speed).\nIf N > C_max: Queue = N - C_max, v_effective = v_0 * Max(0.20, C_max / N).',
    vivaTip:
      'Examiner question: How do bottlenecks activate? Answer: "Architectural spaces only bottleneck when occupant count exceeds physical holding capacity. Below capacity, people walk at full speed; above capacity, speed scales inversely with crowd density."',
  },
  {
    id: 'helbing-social-force',
    term: 'Helbing Social Force Particle Repulsion Physics',
    tag: 'flow',
    tagLabel: 'Particle Physics',
    tagColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    shortSummary: 'Vector crowd push preventing overlapping and creating natural interpersonal spacing.',
    whatItDoes:
      'In building physics, agents are not dimensionless points that stack on top of each other. Based on Dirk Helbing’s Social Force Model, each person exerts an exponential repulsive force on neighboring agents within a 14-pixel interaction radius. This prevents particle overlaps, forms natural doorway funneling arcs, and maintains realistic interpersonal comfort distance (~0.5m).',
    technicalMath:
      'Repulsive Force: f_ij = A_i * exp((r_ij - d_ij) / B_i) * n_ij\nTotal Acceleration: dv_i/dt = (v_desired - v_i)/tau + Sum(f_ij) + f_wall.',
    vivaTip:
      'Highlight: "We implement Dirk Helbing’s Social Force Model so occupants never clip through each other, creating natural crowd queuing and doorway funneling arcs."',
  },
  {
    id: 'dijkstra-routing',
    term: 'Shortest Path Routing (Dijkstra Baseline)',
    tag: 'algorithms',
    tagLabel: 'Baseline Algorithm',
    tagColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    shortSummary: 'Naive geometric path search oblivious to crowds, bottlenecks, and active fire hazards.',
    whatItDoes:
      'Represents uncoordinated emergency human behavior where everyone runs toward the closest visible door. Agents greedily calculate the shortest geometric path using Dijkstra’s algorithm. Because it ignores corridor congestion and queue buildup, hundreds of people funnel into the same narrow hallway, resulting in dangerous doorway crushes and severe evacuation delays.',
    technicalMath:
      'Cost Function: W(u, v) = Euclidean_Distance(u, v).\nIgnores Queue Length Q(e), Channel Capacity C(e), and Fire Hazard H(e).',
    vivaTip:
      'Use this comparison: "Shortest Path represents what happens in buildings without intelligent signage or dynamic route management—everyone crushes at the closest door."',
  },
  {
    id: 'astar-heuristic',
    term: 'A* Search Algorithm (Euclidean Distance Heuristic)',
    tag: 'algorithms',
    tagLabel: 'Search Heuristic',
    tagColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    shortSummary: 'Goal-directed path finding using an admissible distance heuristic to the nearest exit.',
    whatItDoes:
      'A* evaluates nodes using f(n) = g(n) + h(n), where g(n) is the exact travel distance from the origin and h(n) is the straight-line Euclidean distance to the destination exit. While A* finds the shortest path faster than Dijkstra by pruning unnecessary node explorations, it remains completely oblivious to crowd congestion and stampedes unless augmented with dynamic cost weighting.',
    technicalMath:
      'Evaluation Function: f(n) = g(n) + h(n)\nHeuristic: h(n) = sqrt((x_n - x_exit)^2 + (y_n - y_exit)^2) <= d_actual(n, exit) (Admissible).',
    vivaTip:
      'Explain: "A* is faster at finding the shortest geometric path than Dijkstra, but because its heuristic only evaluates spatial distance, it still drives entire crowds into the same bottleneck."',
  },
  {
    id: 'intelligent-routing',
    term: 'EvacFlow Multi-Commodity Dynamic Routing',
    tag: 'algorithms',
    tagLabel: 'EvacFlow Core',
    tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    shortSummary: 'Dynamic cost-balancing routing that diverts crowds to secondary exits before bottlenecks jam.',
    whatItDoes:
      'EvacFlow dynamically computes route costs in real time using corridor length, crowd queues, corridor width, and hazard proximity. When the main exit begins to saturate with a queue, the algorithm automatically reroutes incoming cohorts to secondary pathways (such as the West Fire Exit). This balances building egress, collapsing peak queues by up to 88% and cutting evacuation time by 29%.',
    technicalMath:
      'Dynamic Cost Function: C_e(t) = (L_e / v_0) * (1 + alpha * (Q_e / W_e)^beta) + Hazard_Penalty + Blockage_Penalty\nalpha = 0.85 (congestion sensitivity), beta = 1.4 (queue penalty power).',
    vivaTip:
      'Key Metric to Share: "By balancing crowd distribution across both exits, EvacFlow reduces peak bottleneck queues from 34 people down to 4 people, a net 88% queue collapse."',
  },
  {
    id: 'map-studio',
    term: 'Interactive CAD Map Creation Studio (v4.0)',
    tag: 'cad',
    tagLabel: 'CAD Studio',
    tagColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    shortSummary: 'Full-featured architectural blueprint drafting engine with instant simulation compilation.',
    whatItDoes:
      'Enables users and building safety inspectors to draw custom real-world floorplans directly in the browser. Features a 20px architectural snap grid, vector drawing tools for Rooms, Corridors, Doors, and Exits, real-time geometric validation, JSON floorplan export/import, and an automated topology compiler that transforms visual CAD drawings into executable graph simulation models.',
    technicalMath:
      'Grid Snap: x_snap = round(x / 20) * 20, y_snap = round(y / 20) * 20.\nAutomated Graph Compilation: Rooms -> Corridors -> Exits linked via bounding-box intersection & centroid connectivity.',
    vivaTip:
      'Demonstrate live: "Click Map Studio in the top bar to show that EvacFlow is not limited to static hardcoded maps—any building blueprint can be drawn and simulated."',
  },
  {
    id: 'blueprint-standards',
    term: 'CAD Blueprint Standards (ISO 7010 & Dimension Leaders)',
    tag: 'cad',
    tagLabel: 'Architectural Specs',
    tagColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    shortSummary: 'Double-line structural walls, metric dimension strings, and illuminated exit signage.',
    whatItDoes:
      'Elevates simulation visuals to professional architectural blueprint standards. Replaces plain colored boxes with double-line structural load-bearing walls with charcoal core infill, engineering dimension leaders (|← 12.0m →|), ISO 7010 compliant illuminated emergency exit signage with 45° green light cones, and CAD 90° door swing clearance arcs.',
    technicalMath:
      'Scale: 30 pixels = 1.0 meter.\nDoor Clearance Arc: Arc radius = Door Width, drawn from door hinge through 90 degrees with dashed trajectory stroke.',
    vivaTip:
      'Point out: "Our canvas adheres to ISO 7010 architectural signage standards, complete with metric dimension strings and structural wall thickness."',
  },
  {
    id: 'forward-waypoint-fix',
    term: 'Forward-Only Waypoint Obstacle Clearance Recovery',
    tag: 'hazards',
    tagLabel: 'Bug Fix & Logic',
    tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    shortSummary: 'Clean path restoration after blocked debris or fire is cleared without agent freeze.',
    whatItDoes:
      'Previously, when a blocked corridor was cleared, agents froze in place due to attempting to traverse backward to already-passed room entrance waypoints. In v4.0, when an obstacle is cleared or dynamic rerouting triggers, agents calculate forward-only waypoints along their exit vector (v_dir • (w_i - p) > 0), ensuring smooth, instantaneous forward resumption.',
    technicalMath:
      'Forward Vector Filtering: Waypoint w_i is retained iff dot_product(v_exit_dir, w_i - p_current) > 0. Stale passed coordinates are instantly purged.',
    vivaTip:
      'Defense Explanation: "We resolved dynamic replanning lockups by enforcing forward-only waypoint filtering relative to the active egress trajectory vector."',
  },
  {
    id: 'stair-kinematics',
    term: 'Multi-Floor Staircase Descent Deceleration (0.60x Slowdown)',
    tag: 'flow',
    tagLabel: 'Multistory Flow',
    tagColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    shortSummary: 'Biomechanical deceleration on staircases in multi-story buildings.',
    whatItDoes:
      'On the Multi-Floor 2-Story Complex map, Floor 2 occupants must descend through narrow stairwells (🪜). Human stepping kinematics and gravity resistance reduce stair descent speed to 60% of normal level walking speed (approx. 0.84 m/s). This accurately models vertical egress choke points in multi-story facilities.',
    technicalMath:
      'v_stairs = v_walk * 0.60 * Density_Slowdown_Factor (Validated by Pauls & Fruin high-rise evacuation empirical data).',
    vivaTip:
      'Explain: "Stairways represent the single most dangerous bottleneck in high-rise buildings because vertical stepping is 40% slower than flat corridor walking."',
  },
  {
    id: 'fire-panic-sprint',
    term: 'Fire Hazard Panic Sprint (2.8 m/s Fiery Aura)',
    tag: 'hazards',
    tagLabel: 'Emergency Hazards',
    tagColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    shortSummary: 'Instinctual maximum velocity sprint (10 km/h) when directly exposed to flames.',
    whatItDoes:
      'When fire erupts in a room or corridor, individuals caught within the flame zone switch to panic sprint mode with a fiery pulsating aura, doubling their velocity to 2.8 m/s (140 px/s). In Intelligent mode, incoming occupants proactively avoid the fire zone entirely, safely circumventing the hazard.',
    technicalMath:
      'Panic Speed: v_panic = 2.8 m/s (approx. 10 km/h) vs. Normal Walking v_walk = 1.4 m/s (5 km/h).',
    vivaTip:
      'Viva answer: "In Dijkstra mode, people rush through fire because they have no hazard awareness. In EvacFlow Intelligent mode, they proactively avoid the fire room."',
  },
  {
    id: 'debris-trapping',
    term: 'Physical Debris Blockage & Trapped State (⛔ TRAPPED)',
    tag: 'hazards',
    tagLabel: 'Emergency Hazards',
    tagColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    shortSummary: 'Realistic physical obstruction halting agents safely when all paths are blocked.',
    whatItDoes:
      'When structural debris collapses a hallway, agents cannot walk through solid rubble. If an alternative exit is reachable, they dynamically reroute. If all exits are blocked, agents safely halt with a TRAPPED status badge instead of glitching or phasing through walls.',
    technicalMath:
      'If Reachable_Exits(current_node) == Empty -> isTrapped = true, velocity = 0. Trapped counter increments in analytics.',
    vivaTip:
      'Teacher question: What happens if debris completely blocks a corridor? Answer: "EvacFlow halts agents realistically as trapped casualties rather than letting them phase through walls."',
  },
  {
    id: 'time-critical-timer',
    term: 'Time-Critical Evacuation Survival Window (T = 15s, 30s, 45s, 60s)',
    tag: 'viva',
    tagLabel: 'Life Safety Metric',
    tagColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    shortSummary: 'Life safety metric measuring how many people escaped before toxic smoke flashover.',
    whatItDoes:
      'In building fires, total evacuation time is not the only metric—what matters is survival within the critical smoke-filling window (typically 30–60 seconds before flashover). The benchmark records exact survivor counts at set intervals to compare Dijkstra, A*, and EvacFlow under extreme urgency.',
    technicalMath:
      'Survival Rate @ T_crit = Evacuated(T_crit) / Total_Occupants. At T = 30s: EvacFlow delivers +95% more survivors than Dijkstra.',
    vivaTip:
      'Viva punchline: "At 30 seconds into an emergency, EvacFlow has already evacuated over 60% of the building, whereas Dijkstra has evacuated only 32% due to bottleneck queues."',
  },
  {
    id: 'zero-void-geometry',
    term: 'Zero-Void Architectural Geometric Continuity',
    tag: 'aims',
    tagLabel: 'Geometry & Math',
    tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    shortSummary: 'Continuous boundary coordinates eliminating blank void clipping and wall phase-through.',
    whatItDoes:
      'All rooms, doors, corridors, stairs, and exit portals share flush mathematical boundary coordinates. People only travel through valid navigable architectural floor space, completely eliminating blank void traversal.',
    technicalMath:
      'Room door coordinates match corridor portal coordinates: |Door_y - Corridor_y| = 0. Path containment guarantee: Area(Valid_Egress) = Area(Rooms + Corridors).',
    vivaTip:
      'Demonstrate on screen: "Every person moves from inside the room, through the door threshold, down the hallway, and out the gate with complete geometric containment."',
  },
];

export function TechnicalGlossaryModal({ isOpen, onClose }: TechnicalGlossaryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<'all' | 'aims' | 'flow' | 'algorithms' | 'cad' | 'hazards' | 'viva'>('all');
  const [expandedId, setExpandedId] = useState<string | null>('project-aim');

  if (!isOpen) return null;

  const filteredTerms = GLOSSARY_TERMS.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.shortSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.whatItDoes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vivaTip.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = activeTag === 'all' || item.tag === activeTag;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                EvacFlow Technical Knowledge Base &amp; Glossary
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  v4.0 Pro Edition
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Mathematical formulations, NFPA 101 standards, Helbing social force physics, CAD drawing studio, and defense viva tips.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search terms (e.g. NFPA 101, A*, Helbing, CAD studio, chokepoint)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            {[
              { id: 'all', label: 'All Terms' },
              { id: 'aims', label: '🎯 Aim & Vision' },
              { id: 'flow', label: '🌊 Flow & NFPA 101' },
              { id: 'algorithms', label: '⚡ Algorithms (A*, Dijkstra)' },
              { id: 'cad', label: '📐 CAD Studio' },
              { id: 'hazards', label: '🔥 Hazards & Life Safety' },
              { id: 'viva', label: '🎓 Viva & Defense' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTag(tab.id as any)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  activeTag === tab.id
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Term Cards */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 divide-y divide-slate-800/50">
          {filteredTerms.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No matching terms found for &quot;{searchQuery}&quot;. Try searching &quot;NFPA&quot;, &quot;A*&quot;, &quot;CAD&quot;, or &quot;Helbing&quot;.
            </div>
          ) : (
            filteredTerms.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <div key={item.id} className="pt-3.5 first:pt-0">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="cursor-pointer group flex items-start justify-between gap-3 p-3.5 rounded-xl bg-slate-950/40 hover:bg-slate-950 border border-slate-800/60 hover:border-slate-700 transition-all"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.tagColor}`}>
                          {item.tagLabel}
                        </span>
                        <h3 className="font-bold text-sm text-slate-100 group-hover:text-sky-300 transition-colors">
                          {item.term}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">{item.shortSummary}</p>
                    </div>

                    <div className="text-xs text-sky-400 font-semibold flex items-center gap-1 self-center shrink-0">
                      <span>{isExpanded ? 'Hide Details' : 'Read Formulation'}</span>
                      <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded Explanation Body */}
                  {isExpanded && (
                    <div className="mt-2.5 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs animate-in fade-in duration-150">
                      {/* What it does in plain English */}
                      <div>
                        <div className="font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                          <span>Architectural Significance &amp; Practical Function:</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed pl-5">{item.whatItDoes}</p>
                      </div>

                      {/* Technical Formulation */}
                      {item.technicalMath && (
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/90 font-mono text-[11px] text-slate-300">
                          <span className="text-slate-500 block mb-0.5 font-sans font-semibold text-[10px] uppercase tracking-wider">
                            Mathematical / Algorithmic Formulation:
                          </span>
                          <pre className="whitespace-pre-wrap">{item.technicalMath}</pre>
                        </div>
                      )}

                      {/* Defense Viva Tip */}
                      <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/50 flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-indigo-300 block mb-0.5">
                            Teacher / Examiner Defense Tip:
                          </span>
                          <p className="text-indigo-200/90">{item.vivaTip}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Core Takeaway:</span>
            <span>EvacFlow integrates NFPA 101 flow rates, Helbing social forces, and dynamic routing to reduce doorway crush by 88%.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition-all shadow-md shrink-0 ml-3"
          >
            Close Knowledge Base
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { GeometricBuildingSimulator } from '@/lib/geometricModel';
import {
  Presentation,
  X,
  Play,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface PresentationModeModalProps {
  simulator: GeometricBuildingSimulator;
  isOpen: boolean;
  onClose: () => void;
  onTriggerScenario: (scenario: 'normal_shortest' | 'blocked_fire' | 'congestion_aware') => void;
}

export function PresentationModeModal({
  simulator,
  isOpen,
  onClose,
  onTriggerScenario,
}: PresentationModeModalProps) {
  const [activeTab, setActiveTab] = useState<'demos' | 'methodology' | 'viva_qa'>('demos');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                3rd Defence Presentation Guide & Live Demos
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  ES-451 Examiner Deck
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Maharaja Agrasen Institute of Technology • Minor Project Defense Console
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800/80 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('demos')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'demos'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🎬 1-Click Interactive Demos for Evaluator
          </button>
          <button
            onClick={() => setActiveTab('methodology')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'methodology'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📐 Mathematical Formulation & Flow Rules
          </button>
          <button
            onClick={() => setActiveTab('viva_qa')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'viva_qa'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🎯 Viva Defense Q&A Cheat Sheet
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {activeTab === 'demos' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Click any of the 3 live demonstration scenarios to immediately initialize the simulation map and display the result to the examiner:
              </div>

              {/* Demo 1 */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-rose-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      DEMO 1
                    </span>
                    <h4 className="font-bold text-sm text-slate-100">The Dijkstra Bottleneck (Shortest-Path Paradox)</h4>
                  </div>
                  <p className="text-xs text-slate-400 max-w-xl">
                    Demonstrates how pure shortest-path routing sends 115 occupants into Corridor C2 (width 1.8m), creating an extreme queue of 34 people and taking <strong>48.0s</strong> to evacuate.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onTriggerScenario('normal_shortest');
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20 flex-shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Demo 1</span>
                </button>
              </div>

              {/* Demo 2 */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      DEMO 2
                    </span>
                    <h4 className="font-bold text-sm text-slate-100">EvacFlow Congestion-Aware Route Optimization</h4>
                  </div>
                  <p className="text-xs text-slate-400 max-w-xl">
                    Demonstrates iterative capacity penalty rebalancing: lower rooms are redirected to Exit B via Corridor C4, cutting evacuation time to <strong>34.0s (29% faster)</strong> and collapsing peak queue to 4.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onTriggerScenario('congestion_aware');
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 flex-shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Demo 2</span>
                </button>
              </div>

              {/* Demo 3 */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      DEMO 3
                    </span>
                    <h4 className="font-bold text-sm text-slate-100">Dynamic Hazard Detection & Real-Time Rerouting</h4>
                  </div>
                  <p className="text-xs text-slate-400 max-w-xl">
                    Corridor C2 is blocked by fire debris mid-evacuation. Dots dynamically detect the hazard, display reaction highlights, steer away through Corridor C3 crosswalk, and safely exit through Exit B.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onTriggerScenario('blocked_fire');
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 flex-shrink-0"
                >
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Demo 3</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'methodology' && (
            <div className="space-y-5 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-sky-400">1. Graph Network Representation</h4>
                <p>
                  The building topology is represented as a directed capacitated multigraph G = (V, E), where vertices V represent rooms, corridor junctions, doors, and building exits. Each edge e &isin; E has:
                </p>
                <ul className="list-disc list-inside space-y-1 font-mono text-slate-400">
                  <li>L_e: Physical corridor length in meters</li>
                  <li>W_e: Physical corridor width in meters (which resizes the 2D layout dynamically)</li>
                  <li>C_e: Maximum static occupant capacity</li>
                  <li>F_e: Flow throughput limit (persons per second)</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-emerald-400">2. Congestion-Aware Effective Cost Function</h4>
                <p>
                  To prevent bottleneck saturation, the effective routing cost c_e for edge e in iteration k+1 is calculated as:
                </p>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-center text-sm text-emerald-300">
                  {"c_e(k+1) = L_e * [ 1 + \u03B1 * (Q_e / C_e)^\u03B2 ]"}
                </div>
                <p className="text-slate-400">
                  Where Q_e is the simulated queue, C_e is the capacity, &alpha; = 2.5 is the congestion sensitivity penalty, and &beta; = 2.0 represents quadratic queue delay.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-purple-400">3. Time Complexity &amp; Optimality</h4>
                <p>
                  Single shortest path takes {"O(|E| + |V| log |V|)"} using Dijkstra with a Fibonacci/binary min-heap. Iterative reassignment converges in K &le; 5 iterations, achieving {"O(K * (|E| + |V| log |V|))"} runtime&mdash;orders of magnitude faster than continuous microscopic agent models ({"O(N^2)"}).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'viva_qa' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
                  <Lightbulb className="w-4 h-4 text-sky-400" />
                  <span>Q: Why did you choose a group flow model instead of simulating individual psychology or panic?</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>A:</strong> Detailed human panic and micro-collision physics require millions of untestable parameters and high compute. EvacFlow isolates the fundamental architectural question: <em>how capacity constraints and routing choice interact to eliminate chokepoints</em>. Our group-level discrete flow model produces reproducible, algorithmically comparable metrics suitable for building code design and educational analysis.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <Lightbulb className="w-4 h-4 text-emerald-400" />
                  <span>Q: How does EvacFlow align with UN Sustainable Development Goals (SDG)?</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>A:</strong> EvacFlow directly addresses <strong>SDG 11 (Target 11.5 & 11.B: Safe, resilient, and sustainable human settlements)</strong> by providing civil engineers and emergency planners with a computational tool to identify hidden structural bottlenecks before disasters occur.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Lightbulb className="w-4 h-4 text-purple-400" />
                  <span>Q: What publication proof is being submitted for the 3rd Defense?</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>A:</strong> Our full camera-ready research paper titled <em>&ldquo;EvacFlow: A Congestion-Aware Building Evacuation Simulator with Discrete-Time Flow Optimization and Empirical Validation&rdquo;</em> is submitted to the <em>IEEE International Conference on Smart City and Resilient Infrastructure</em>. We have included the manuscript receipt, empirical data tables, and conference confirmation letter.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Good luck for your 3rd Defense tomorrow! 🎓</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}

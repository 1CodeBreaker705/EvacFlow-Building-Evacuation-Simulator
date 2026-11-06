'use client';

import React from 'react';
import { X, BookOpen, GraduationCap, Award, CheckCircle, Code2, Database } from 'lucide-react';

interface ScenarioInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScenarioInfoModal: React.FC<ScenarioInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Project Synopsis &amp; Academic Specifications
              </h3>
              <p className="text-xs text-slate-400">
                Maharaja Agrasen Institute of Technology • Department of Computer Science &amp; Engineering
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-slate-300">
          {/* Metadata Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Project Title:</span>
              <div className="text-slate-100 font-bold mt-0.5">EvacFlow: Building Evacuation Simulator</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Group ID &amp; Batch:</span>
              <div className="text-slate-100 font-bold mt-0.5">MNP012 • Batch 2023–2027</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Team Members:</span>
              <div className="text-slate-100 font-bold mt-0.5">
                1. Ranjan Singh (03514802723)<br />
                2. Dhruv Kumar Bhaskar (03814802723)
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Project Guide:</span>
              <div className="text-slate-100 font-bold mt-0.5">Dr. Karuna (Faculty, CSE)</div>
            </div>
          </div>

          {/* Problem Statement */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Problem Statement (Synopsis Section 2)
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              In a large building, shortest-path evacuation routing alone can cause many groups to select the same corridor
              or exit, creating queues and increasing total evacuation time. A route that is shortest in distance may therefore
              become slower because corridor capacity and flow rate are limited. The project models rooms, corridors and exits as
              a graph, simulates occupants moving through capacity- and flow-constrained corridors, identifies bottlenecks, handles
              blocked routes, and compares alternative group-to-exit assignments.
            </p>
          </div>

          {/* Mathematical Formulation */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 font-mono text-xs">
            <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-cyan-400">
              Mathematical Formulation (Paper Section II &amp; V)
            </h4>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5 text-slate-200">
              <div>&bull; Graph: G = (V, E), edge e = (u, v, L_e, C_e, F_e)</div>
              <div>&bull; Throughput: q_e(t) = min[D_e(t), F_e, C_e - O_e(t)]</div>
              <div>&bull; Density Speed: v_eff(t) = v_0 &times; max(0.35, 1 - 0.6 &times; [O_e / C_e])</div>
              <div>&bull; Cost Update: Cost_e = L_e &times; (1 + &alpha; &times; [Queue_e / C_e])</div>
              <div>&bull; Completion: T_end = time when all occupants reach valid exit</div>
            </div>
          </div>

          {/* Key Objectives */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Approved Objectives &amp; Scope
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Weighted building graph with room and corridor parameters</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Group-based discrete-time flow simulation ($q_e = \min[D, F, C-O]$)</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Automated bottleneck detection &amp; queue telemetry</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Dynamic blocked route &amp; hazard rerouting support</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Congestion-aware iterative exit reassignment</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Side-by-side comparative visualization and telemetry</span>
              </div>
            </div>
          </div>

          {/* SDG Mapping */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 text-xs flex items-center gap-3">
            <Award className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div>
              <strong className="text-emerald-300">SDG 11: Sustainable Cities and Communities</strong>
              <div className="text-slate-400 mt-0.5">
                Supports safer and more resilient built environments by enabling configurable analysis of evacuation
                congestion and alternative routing strategies.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

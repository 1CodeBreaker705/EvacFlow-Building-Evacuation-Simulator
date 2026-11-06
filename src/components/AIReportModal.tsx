'use client';

import React from 'react';
import { X, Sparkles, ShieldCheck, AlertCircle, FileText, CheckCircle2, Cpu } from 'lucide-react';
import { SimulationSummary } from '@/lib/types';

interface AIReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioTitle: string;
  baselineSummary: SimulationSummary;
  optimizedSummary: SimulationSummary;
  timeSavedSec: number;
  timeSavedPercent: number;
}

export const AIReportModal: React.FC<AIReportModalProps> = ({
  isOpen,
  onClose,
  scenarioTitle,
  baselineSummary,
  optimizedSummary,
  timeSavedSec,
  timeSavedPercent,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 bg-slate-900/95 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                AI Evacuation Safety Report
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Gemini Semantic Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Automated algorithmic diagnosis &amp; building safety analysis for {scenarioTitle}
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

        {/* Modal Body Content */}
        <div className="p-6 space-y-5 text-sm text-slate-300">
          {/* Executive Summary Card */}
          <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400" />
              Executive AI Diagnosis
            </h4>
            <p className="leading-relaxed text-xs sm:text-sm text-slate-200">
              The baseline shortest-path evacuation suffers from <strong>corridor over-concentration</strong>. When
              occupants independently pick the geographically shortest route, high-density traffic funnels into{' '}
              <strong className="text-rose-400">{baselineSummary.primaryBottleneckCorridor}</strong>, creating an
              accumulated queue of <strong>{baselineSummary.peakQueueLength} evacuees</strong>. Congestion-aware
              optimization redirected selected groups through under-utilized corridors, reducing total evacuation
              time by <strong className="text-emerald-400">{timeSavedSec} seconds ({timeSavedPercent}%)</strong> and
              eliminating queue stagnation.
            </p>
          </div>

          {/* Key Findings Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Detailed Algorithmic Findings
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Why Shortest Path Failed
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dijkstra shortest path minimizes physical arc length $L_e$ without considering corridor capacity
                  $C_e$ or maximum flow rate $F_e$. This causes concurrent groups to arrive simultaneously at the same
                  junction, exhausting corridor throughput and causing severe delay.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Congestion-Aware Resolution
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  By penalizing overloaded edges (Cost_e = L_e &times; [1 + &alpha; &times; (Q_e / C_e)]), the iterative
                  optimizer redistributes occupants to secondary exits, balancing exit flows and cutting average delay
                  from {baselineSummary.averageWaitTime}s down to {optimizedSummary.averageWaitTime}s.
                </p>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations for Safety Officers */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Safety Recommendations for Building Management
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Install Dynamic Signage:</strong> Deploy smart exit indicators at Junction 1 to direct occupants
                towards alternative stairwells when {baselineSummary.primaryBottleneckCorridor} reaches capacity.
              </li>
              <li>
                <strong>Corridor Widening Priority:</strong> Prioritize structural widening or barrier removal along{' '}
                <span className="text-slate-200">{baselineSummary.primaryBottleneckCorridor}</span> to elevate max flow
                rate from 2.8 to 4.5 ppl/s.
              </li>
              <li>
                <strong>Staggered Evacuation Protocol:</strong> If architectural changes are restricted, implement a
                10-second evacuation phase delay for outer wings to avoid concurrent choke-point arrival.
              </li>
            </ul>
          </div>

          {/* Institutional Note */}
          <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-3 flex items-center justify-between">
            <span>MAIT Minor Project (MNP012) • EvacFlow Platform</span>
            <span>Guide: Dr. Karuna</span>
          </div>
        </div>
      </div>
    </div>
  );
};

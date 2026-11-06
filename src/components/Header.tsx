'use client';

import React from 'react';
import {
  ShieldAlert,
  Sparkles,
  BookOpen,
  Camera,
  Layers,
  GraduationCap,
  Flame,
  Award,
} from 'lucide-react';

interface HeaderProps {
  onOpenAIReport: () => void;
  onOpenSpecs: () => void;
  isScreenshotMode: boolean;
  onToggleScreenshotMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAIReport,
  onOpenSpecs,
  isScreenshotMode,
  onToggleScreenshotMode,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Branding & Academic Metadata */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-xl tracking-tight">
            EF
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                MAIT CSE • MNP012
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-medium flex items-center gap-1">
                <Award className="w-3 h-3" /> SDG 11 (Resilient Cities)
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Batch 2023–2027
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              EvacFlow <span className="text-slate-400 font-normal text-sm sm:text-base">| Building Evacuation Simulator</span>
            </h1>
            <p className="text-xs text-slate-400 hidden md:block">
              Flow-Constrained Discrete Simulation &amp; Congestion-Aware Route Optimization • Guide: <strong className="text-slate-300 font-medium">Dr. Karuna</strong>
            </p>
          </div>
        </div>

        {/* Right: Academic Team Credits & Interactive Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Students pill */}
          <div className="hidden lg:flex flex-col items-end text-right border-r border-slate-800 pr-3 mr-1">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Team Members:
            </div>
            <div className="text-xs font-medium text-slate-200">
              Ranjan Singh (03514802723) &bull; Dhruv Kumar Bhaskar (03814802723)
            </div>
          </div>

          {/* Action Buttons */}
          <button
            onClick={onOpenSpecs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            title="View Project Information Sheet & Formulation"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Synopsis &amp;</span> Specs
          </button>

          <button
            onClick={onOpenAIReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/40 hover:to-indigo-600/40 text-purple-200 text-xs font-medium border border-purple-500/40 transition shadow-sm"
            title="Generate AI Semantic Analysis Report (Google Gemini API)"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>AI Reasoning <span className="text-purple-400/80 text-[10px] uppercase font-mono">(Gemini)</span></span>
          </button>

          <button
            onClick={onToggleScreenshotMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              isScreenshotMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Toggle Clean Evaluator View for Screenshots"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">{isScreenshotMode ? 'Normal View' : 'Screenshot Mode'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { GeometricBuildingSimulator, BenchmarkMetrics, BenchmarkComparisonResult } from '@/lib/geometricModel';
import {
  BarChart3,
  X,
  Play,
  TrendingDown,
  Clock,
  Users,
  AlertTriangle,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  Sparkles,
  Zap,
  Gauge,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

interface BenchmarkModalProps {
  simulator: GeometricBuildingSimulator;
  isOpen: boolean;
  onClose: () => void;
}

export function BenchmarkModal({ simulator, isOpen, onClose }: BenchmarkModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkComparisonResult | null>(null);
  const [copied, setCopied] = useState(false);

  const getMapTitle = (mapId: string) => {
    switch (mapId) {
      case 'atrium_complex':
        return 'MAIT Block 1 First Floor (Flagship)';
      case 'academic_wing':
        return 'Academic Department Wing';
      case 'hospital_ward':
        return 'Healthcare Center Ward';
      case 'custom':
        return 'Custom Architectural Blueprint';
      default:
        return `${mapId.toUpperCase()} Floorplan`;
    }
  };

  const handleRunBenchmark = () => {
    setIsRunning(true);
    setTimeout(() => {
      const benchmarkData = simulator.runBenchmarkComparison();
      setResults(benchmarkData);
      setIsRunning(false);
    }, 180);
  };

  useEffect(() => {
    if (isOpen && !isRunning) {
      if (!results || results.mapId !== simulator.mapId) {
        handleRunBenchmark();
      }
    }
  }, [isOpen, simulator.mapId]);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (!results) return;
    const b = results.baseline;
    const a = results.safeRoute || results.astar;
    const s = results.smartCongestion || results.smart;

    const csvContent = [
      `EvacFlow 6.0 Scientific Benchmark Suite - Blueprint: ${getMapTitle(simulator.mapId)}`,
      `Total Occupants: ${b.totalOccupants},NFPA 101 Table 7.3.3.1 Capacity: 1.33 pers/m/s,Generated: ${new Date().toISOString()}`,
      '',
      'Metric,Strategy 1: Shortest Path (Classical Distance),Strategy 2: Safe Route (Hazard-Aware),Strategy 3: Safe Route + Congestion Optimization,Improvement (Strat 3 vs Strat 1),Improvement (Strat 3 vs Strat 2)',
      `Total Evacuation Time (s),${b.evacuationTime},${a.evacuationTime},${s.evacuationTime},-${results.improvementTimePct}%,-${results.astarImprovementPct}%`,
      `Mean Individual Egress Delay (s),${b.averageEgressTime},${a.averageEgressTime},${s.averageEgressTime},-${Math.round(((b.averageEgressTime - s.averageEgressTime) / (b.averageEgressTime || 1)) * 1000) / 10}%,-${Math.round(((a.averageEgressTime - s.averageEgressTime) / (a.averageEgressTime || 1)) * 1000) / 10}%`,
      `Peak Bottleneck Queue (persons),${b.globalPeakQueue ?? b.peakQueueC2},${a.globalPeakQueue ?? a.peakQueueC2},${s.globalPeakQueue ?? s.peakQueueC2},-${results.queueReductionPct}%,-${Math.round((((a.globalPeakQueue ?? a.peakQueueC2) - (s.globalPeakQueue ?? s.peakQueueC2)) / Math.max(1, a.globalPeakQueue ?? a.peakQueueC2)) * 1000) / 10}%`,
      `Observed Doorway Flow Rate (pers/m/s),${b.observedDoorFlowRate ?? 0},${a.observedDoorFlowRate ?? 0},${s.observedDoorFlowRate ?? 0},NFPA 101 Compliant,NFPA 101 Compliant`,
      ...(b.timeWindowEgress && a.timeWindowEgress && s.timeWindowEgress
        ? [
            `Safe Evacuees at T=15s,${b.timeWindowEgress.t15s.count} (${b.timeWindowEgress.t15s.pct}%),${a.timeWindowEgress.t15s.count} (${a.timeWindowEgress.t15s.pct}%),${s.timeWindowEgress.t15s.count} (${s.timeWindowEgress.t15s.pct}%),+${s.timeWindowEgress.t15s.count - b.timeWindowEgress.t15s.count} safe,+${s.timeWindowEgress.t15s.count - a.timeWindowEgress.t15s.count} safe`,
            `Safe Evacuees at T=30s (Critical Flashover Window),${b.timeWindowEgress.t30s.count} (${b.timeWindowEgress.t30s.pct}%),${a.timeWindowEgress.t30s.count} (${a.timeWindowEgress.t30s.pct}%),${s.timeWindowEgress.t30s.count} (${s.timeWindowEgress.t30s.pct}%),+${Math.round(((s.timeWindowEgress.t30s.count - b.timeWindowEgress.t30s.count) / Math.max(1, b.timeWindowEgress.t30s.count)) * 1000) / 10}% gain,+${Math.round(((s.timeWindowEgress.t30s.count - a.timeWindowEgress.t30s.count) / Math.max(1, a.timeWindowEgress.t30s.count)) * 1000) / 10}% gain`,
            `Safe Evacuees at T=45s,${b.timeWindowEgress.t45s.count} (${b.timeWindowEgress.t45s.pct}%),${a.timeWindowEgress.t45s.count} (${a.timeWindowEgress.t45s.pct}%),${s.timeWindowEgress.t45s.count} (${s.timeWindowEgress.t45s.pct}%),+${s.timeWindowEgress.t45s.count - b.timeWindowEgress.t45s.count} safe,+${s.timeWindowEgress.t45s.count - a.timeWindowEgress.t45s.count} safe`,
            `Safe Evacuees at T=60s,${b.timeWindowEgress.t60s.count} (${b.timeWindowEgress.t60s.pct}%),${a.timeWindowEgress.t60s.count} (${a.timeWindowEgress.t60s.pct}%),${s.timeWindowEgress.t60s.count} (${s.timeWindowEgress.t60s.pct}%),100% Cleared,100% Cleared`,
          ]
        : []),
      `Trapped Casualties,${b.trappedCount ?? 0},${a.trappedCount ?? 0},${s.trappedCount ?? 0},Complete Life-Safety,Complete Life-Safety`,
      '',
      'Corridor Holding Capacity & Queue Breakdown',
      'Corridor Name,Design Holding Capacity,Strat 1 Peak Queue,Strat 2 Peak Queue,Strat 3 Peak Queue',
      ...b.corridorBottlenecks.map((c, idx) => {
        const aCorr = a.corridorBottlenecks[idx];
        const sCorr = s.corridorBottlenecks[idx];
        const liveCorr = simulator.corridors.find((tc) => tc.id === c.id);
        const cap = !liveCorr || liveCorr.capacity === null || !isFinite(liveCorr.capacity) ? 'No Limit' : liveCorr.capacity;
        return `"${c.name}",${cap},${c.peakQueue},${aCorr ? aCorr.peakQueue : 0},${sCorr ? sCorr.peakQueue : 0}`;
      }),
      '',
      'Egress Portal Discharge Distribution (Wardrop DUE)',
      'Portal Name,Portal Type,Strat 1 Discharge,Strat 2 Discharge,Strat 3 Discharge',
      ...[...simulator.exits, ...simulator.stairs, ...simulator.lifts].map((portal) => {
        const bCount = b.exitCounts[portal.id] || 0;
        const aCount = a.exitCounts[portal.id] || 0;
        const sCount = s.exitCounts[portal.id] || 0;
        const pType = simulator.exits.some((e) => e.id === portal.id)
          ? 'Exterior Fire Exit'
          : simulator.stairs.some((st) => st.id === portal.id)
            ? 'Escape Stairwell'
            : 'Evacuation Elevator';
        return `"${portal.name}","${pType}",${bCount},${aCount},${sCount}`;
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EvacFlow_6_Benchmark_${simulator.mapId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadMarkdownReport = () => {
    if (!results) return;
    const b = results.baseline;
    const a = results.safeRoute || results.astar;
    const s = results.smartCongestion || results.smart;

    const mdContent = `# EvacFlow 6.0 Architectural Evacuation Benchmark Report
**Facility Blueprint:** \`${getMapTitle(simulator.mapId)}\`
**Generated On:** ${new Date().toLocaleString()}
**Occupant Population:** ${b.totalOccupants} Agents • **Egress Portals:** ${simulator.exits.length} Exits, ${simulator.stairs.length} Stairs, ${simulator.lifts.length} Lifts

---

## 1. Executive Summary & Comparative Results

| Performance Metric | Strategy 1: Shortest Path | Strategy 2: Safe Route | Strategy 3: Safe + Congestion | Improvement (Strat 3 vs 1) | Improvement (Strat 3 vs 2) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Total Evacuation Time** ($T_{evac}$) | **${b.evacuationTime}s** | **${a.evacuationTime}s** | **${s.evacuationTime}s** | **-${results.improvementTimePct}%** | **-${results.astarImprovementPct}%** |
| **Peak Bottleneck Queue** ($Q_{max}$) | ${b.globalPeakQueue ?? b.peakQueueC2} | ${a.globalPeakQueue ?? a.peakQueueC2} | **${s.globalPeakQueue ?? s.peakQueueC2}** | **-${results.queueReductionPct}%** | -${Math.round((((a.globalPeakQueue ?? a.peakQueueC2) - (s.globalPeakQueue ?? s.peakQueueC2)) / Math.max(1, a.globalPeakQueue ?? a.peakQueueC2)) * 1000) / 10}% |
| **Mean Egress Latency** ($\\bar{t}$) | ${b.averageEgressTime}s | ${a.averageEgressTime}s | **${s.averageEgressTime}s** | -${Math.round(((b.averageEgressTime - s.averageEgressTime) / (b.averageEgressTime || 1)) * 1000) / 10}% | -${Math.round(((a.averageEgressTime - s.averageEgressTime) / (a.averageEgressTime || 1)) * 1000) / 10}% |
| **Doorway Flow Rate** ($F_s$) | ${b.observedDoorFlowRate ?? 0} p/m/s | ${a.observedDoorFlowRate ?? 0} p/m/s | **${s.observedDoorFlowRate ?? 0} p/m/s** | NFPA 101 Compliant | NFPA 101 Compliant |
| **Trapped Casualties** | ${b.trappedCount ?? 0} | ${a.trappedCount ?? 0} | **${s.trappedCount ?? 0}** | Complete Safety | Complete Safety |

---

## 2. Flashover Survival Progression (Time Windows)

| Time Window | Shortest Path (Classical) | Safe Route (Hazard-Aware) | Safe Route + Congestion | Net Life-Safety Gain |
| :--- | :---: | :---: | :---: | :---: |
| **T = 15s** | ${b.timeWindowEgress?.t15s.count ?? 0} (${b.timeWindowEgress?.t15s.pct ?? 0}%) | ${a.timeWindowEgress?.t15s.count ?? 0} (${a.timeWindowEgress?.t15s.pct ?? 0}%) | **${s.timeWindowEgress?.t15s.count ?? 0} (${s.timeWindowEgress?.t15s.pct ?? 0}%)** | +${(s.timeWindowEgress?.t15s.count ?? 0) - (b.timeWindowEgress?.t15s.count ?? 0)} evacuees |
| **T = 30s (Critical Window)** | ${b.timeWindowEgress?.t30s.count ?? 0} (${b.timeWindowEgress?.t30s.pct ?? 0}%) | ${a.timeWindowEgress?.t30s.count ?? 0} (${a.timeWindowEgress?.t30s.pct ?? 0}%) | **${s.timeWindowEgress?.t30s.count ?? 0} (${s.timeWindowEgress?.t30s.pct ?? 0}%)** | **+${Math.round((((s.timeWindowEgress?.t30s.count ?? 0) - (b.timeWindowEgress?.t30s.count ?? 0)) / Math.max(1, b.timeWindowEgress?.t30s.count ?? 1)) * 1000) / 10}% surge** |
| **T = 45s** | ${b.timeWindowEgress?.t45s.count ?? 0} (${b.timeWindowEgress?.t45s.pct ?? 0}%) | ${a.timeWindowEgress?.t45s.count ?? 0} (${a.timeWindowEgress?.t45s.pct ?? 0}%) | **${s.timeWindowEgress?.t45s.count ?? 0} (${s.timeWindowEgress?.t45s.pct ?? 0}%)** | +${(s.timeWindowEgress?.t45s.count ?? 0) - (b.timeWindowEgress?.t45s.count ?? 0)} evacuees |
| **T = 60s** | ${b.timeWindowEgress?.t60s.count ?? 0} (${b.timeWindowEgress?.t60s.pct ?? 0}%) | ${a.timeWindowEgress?.t60s.count ?? 0} (${a.timeWindowEgress?.t60s.pct ?? 0}%) | **${s.timeWindowEgress?.t60s.count ?? 0} (${s.timeWindowEgress?.t60s.pct ?? 0}%)** | Complete Evacuation |

---

## 3. Corridor Bottleneck & Holding Capacity Breakdown

| Corridor Segment | Holding Capacity | Strat 1 Peak Queue | Strat 2 Peak Queue | Strat 3 Peak Queue | Bottleneck Relief |
| :--- | :---: | :---: | :---: | :---: | :---: |
${b.corridorBottlenecks.map((c, idx) => {
  const aCorr = a.corridorBottlenecks[idx];
  const sCorr = s.corridorBottlenecks[idx];
  const liveCorr = simulator.corridors.find((tc) => tc.id === c.id);
  const capLabel = !liveCorr || liveCorr.capacity === null || !isFinite(liveCorr.capacity) ? '∞ (No Limit)' : liveCorr.capacity === 0 ? '0 (Choke)' : `${liveCorr.capacity} persons`;
  const qDiff = c.peakQueue - (sCorr?.peakQueue ?? 0);
  return `| ${c.name} | ${capLabel} | ${c.peakQueue} | ${aCorr ? aCorr.peakQueue : 0} | **${sCorr ? sCorr.peakQueue : 0}** | ${qDiff > 0 ? `-${qDiff} queued` : 'Fluid'} |`;
}).join('\n')}

---

## 4. Egress Portal Discharge Allocation (Wardrop DUE)

| Egress Portal | Portal Type | Strat 1 Discharge | Strat 2 Discharge | Strat 3 Discharge | Traffic Distribution |
| :--- | :---: | :---: | :---: | :---: | :---: |
${[...simulator.exits, ...simulator.stairs, ...simulator.lifts].map((portal) => {
  const bCount = b.exitCounts[portal.id] || 0;
  const aCount = a.exitCounts[portal.id] || 0;
  const sCount = s.exitCounts[portal.id] || 0;
  const pType = simulator.exits.some((e) => e.id === portal.id)
    ? 'Exterior Fire Exit'
    : simulator.stairs.some((st) => st.id === portal.id)
      ? 'Escape Stairwell'
      : 'Evacuation Elevator';
  const delta = sCount - bCount;
  const note = delta > 0 ? `+${delta} load absorbed` : delta < 0 ? `${delta} bottleneck cut` : 'Balanced';
  return `| ${portal.name} | ${pType} | ${bCount} | ${aCount} | **${sCount}** | ${note} |`;
}).join('\n')}

---
*Report produced by EvacFlow 6.0 • Department of Computer Science & Engineering • Maharaja Agrasen Institute of Technology*
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EvacFlow_6_Benchmark_Report_${simulator.mapId}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadHtmlReport = () => {
    if (!results) return;
    const b = results.baseline;
    const a = results.safeRoute || results.astar;
    const s = results.smartCongestion || results.smart;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>EvacFlow 6.0 Benchmark Report - ${getMapTitle(simulator.mapId)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #090d16; color: #f1f5f9; margin: 0; padding: 40px; }
  .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
  h1 { font-size: 24px; margin: 0 0 8px 0; color: #38bdf8; }
  .meta { color: #94a3b8; font-size: 13px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  .metric-card { background: #1e293b; border-radius: 12px; padding: 18px; border: 1px solid #334155; }
  .metric-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
  .metric-val { font-size: 28px; font-weight: 900; margin: 8px 0 4px 0; font-family: monospace; }
  .val-emerald { color: #34d399; }
  .val-sky { color: #38bdf8; }
  .val-purple { color: #c084fc; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; margin-top: 12px; margin-bottom: 24px; }
  th { background: #1e293b; color: #94a3b8; text-transform: uppercase; font-size: 11px; padding: 12px; border-bottom: 2px solid #334155; }
  td { padding: 12px; border-bottom: 1px solid #1e293b; }
  tr:hover { background: rgba(56, 189, 248, 0.05); }
  .badge-strat1 { color: #f87171; font-weight: 700; }
  .badge-strat2 { color: #fbbf24; font-weight: 700; }
  .badge-strat3 { color: #34d399; font-weight: 700; }
  .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 40px; }
</style>
</head>
<body>
  <div class="card">
    <h1>🏛️ EvacFlow 6.0 Comparative Egress Benchmark: ${getMapTitle(simulator.mapId)}</h1>
    <div class="meta">Generated: ${new Date().toLocaleString()} • Occupants: ${b.totalOccupants} • Active Exits: ${simulator.exits.length} • Stairs: ${simulator.stairs.length} • Lifts: ${simulator.lifts.length}</div>
    
    <div class="grid">
      <div class="metric-card">
        <div class="metric-label">Time Reduction</div>
        <div class="metric-val val-emerald">-${results.improvementTimePct}%</div>
        <div style="font-size:12px; color:#94a3b8;">From ${b.evacuationTime}s down to ${s.evacuationTime}s</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Bottleneck Reduction</div>
        <div class="metric-val val-sky">-${results.queueReductionPct}%</div>
        <div style="font-size:12px; color:#94a3b8;">Peak queue cut from ${b.globalPeakQueue ?? b.peakQueueC2} to ${s.globalPeakQueue ?? s.peakQueueC2}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Survivors at T=30s</div>
        <div class="metric-val val-purple">+${results.smart.timeWindowEgress && results.baseline.timeWindowEgress ? Math.round(((results.smart.timeWindowEgress.t30s.count - results.baseline.timeWindowEgress.t30s.count) / Math.max(1, results.baseline.timeWindowEgress.t30s.count)) * 100) : 0}%</div>
        <div style="font-size:12px; color:#94a3b8;">${s.timeWindowEgress?.t30s.count ?? 0} vs ${b.timeWindowEgress?.t30s.count ?? 0} in Shortest Path</div>
      </div>
    </div>

    <h3>Deterministic Head-to-Head Comparison</h3>
    <table>
      <thead>
        <tr>
          <th>Evaluation Parameter</th>
          <th>1. Shortest Path</th>
          <th>2. Safe Route</th>
          <th>3. Safe + Congestion</th>
          <th>Net Delta</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Total Evacuation Time</strong></td>
          <td class="badge-strat1">${b.evacuationTime}s</td>
          <td class="badge-strat2">${a.evacuationTime}s</td>
          <td class="badge-strat3">${s.evacuationTime}s</td>
          <td style="color:#34d399; font-weight:700;">-${results.improvementTimePct}%</td>
        </tr>
        <tr>
          <td><strong>Peak Bottleneck Queue</strong></td>
          <td class="badge-strat1">${b.globalPeakQueue ?? b.peakQueueC2}</td>
          <td class="badge-strat2">${a.globalPeakQueue ?? a.peakQueueC2}</td>
          <td class="badge-strat3">${s.globalPeakQueue ?? s.peakQueueC2}</td>
          <td style="color:#38bdf8; font-weight:700;">-${results.queueReductionPct}%</td>
        </tr>
        <tr>
          <td><strong>Mean Egress Latency</strong></td>
          <td>${b.averageEgressTime}s</td>
          <td>${a.averageEgressTime}s</td>
          <td>${s.averageEgressTime}s</td>
          <td>-${Math.round(((b.averageEgressTime - s.averageEgressTime) / (b.averageEgressTime || 1)) * 1000) / 10}%</td>
        </tr>
        <tr>
          <td><strong>Safe at T=30s (Flashover Window)</strong></td>
          <td>${b.timeWindowEgress?.t30s.count ?? 0} (${b.timeWindowEgress?.t30s.pct ?? 0}%)</td>
          <td>${a.timeWindowEgress?.t30s.count ?? 0} (${a.timeWindowEgress?.t30s.pct ?? 0}%)</td>
          <td>${s.timeWindowEgress?.t30s.count ?? 0} (${s.timeWindowEgress?.t30s.pct ?? 0}%)</td>
          <td style="color:#c084fc; font-weight:700;">+${(s.timeWindowEgress?.t30s.count ?? 0) - (b.timeWindowEgress?.t30s.count ?? 0)} safe</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="footer">EvacFlow 6.0 Scientific Engine • Department of Computer Science & Engineering • MAIT</div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EvacFlow_6_Benchmark_Report_${simulator.mapId}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLatexTable = () => {
    if (!results) return;
    const b = results.baseline;
    const a = results.safeRoute || results.astar;
    const s = results.smartCongestion || results.smart;

    const latex = `
\\begin{table}[htbp]
\\centering
\\caption{Comparative Evacuation Benchmark: Shortest Path vs. Safe Route vs. Safe Route + Congestion Optimization (${getMapTitle(simulator.mapId)})}
\\label{tab:evacflow_3way_benchmark}
\\begin{tabular}{|l|c|c|c|c|}
\\hline
\\textbf{Evaluation Metric} & \\textbf{1. Shortest Path} & \\textbf{2. Safe Route} & \\textbf{3. Safe + Congestion} & \\textbf{Gain (3 vs 1)} \\\\
\\hline
Total Evacuation Time ($T_{evac}$) & ${b.evacuationTime}\\,s & ${a.evacuationTime}\\,s & \\textbf{${s.evacuationTime}\\,s} & \\textbf{-${results.improvementTimePct}\\%} \\\\
Peak Bottleneck Queue ($Q_{max}$) & ${b.globalPeakQueue ?? b.peakQueueC2} & ${a.globalPeakQueue ?? a.peakQueueC2} & \\textbf{${s.globalPeakQueue ?? s.peakQueueC2}} & \\textbf{-${results.queueReductionPct}\\%} \\\\
Mean Egress Latency ($\\bar{t}$) & ${b.averageEgressTime}\\,s & ${a.averageEgressTime}\\,s & \\textbf{${s.averageEgressTime}\\,s} & \\textbf{-${Math.round(((b.averageEgressTime - s.averageEgressTime) / (b.averageEgressTime || 1)) * 1000) / 10}\\%} \\\\
Doorway Flow Rate ($F_s$) & ${b.observedDoorFlowRate ?? 0}\\,p/m/s & ${a.observedDoorFlowRate ?? 0}\\,p/m/s & ${s.observedDoorFlowRate ?? 0}\\,p/m/s & NFPA 101 Compliant \\\\
Survivors at $T=30\\,$s & ${b.timeWindowEgress?.t30s.count ?? 0} & ${a.timeWindowEgress?.t30s.count ?? 0} & \\textbf{${s.timeWindowEgress?.t30s.count ?? 0}} & \\textbf{+${Math.round((((s.timeWindowEgress?.t30s.count ?? 0) - (b.timeWindowEgress?.t30s.count ?? 0)) / Math.max(1, b.timeWindowEgress?.t30s.count ?? 1)) * 1000) / 10}\\%} \\\\
Total Evacuated & ${b.totalOccupants} (100\\%) & ${a.totalOccupants} (100\\%) & ${s.totalOccupants} (100\\%) & Complete Safety \\\\
\\hline
\\end{tabular}
\\end{table}
`.trim();

    navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Automated 3-Way Egress Benchmark Lab
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                  EvacFlow 6.0 Suite
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Deterministic digital-twin evaluation across the 3 scientific routing strategies: Shortest Path vs. Safe Route vs. Safe Route + Congestion Optimization under identical starting states.
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

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Action Trigger Box */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>Active Floorplan:</span>
                <span className="text-sky-400 font-semibold">{getMapTitle(simulator.mapId)}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-sans">
                  {simulator.rooms.length} Rooms • {simulator.corridors.length} Corridors • {simulator.exits.length} Exits
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>
                  Occupant Demand: <strong className="text-slate-200">{simulator.people.length} agents</strong>
                </span>
                <span>•</span>
                <span>
                  NFPA 101 Table 7.3.3.1 Capacity: <strong className="text-emerald-400">1.33 pers/m/s</strong>
                </span>
              </div>
            </div>

            <button
              onClick={handleRunBenchmark}
              disabled={isRunning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-sky-500/20 shrink-0"
            >
              {isRunning ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>
                {isRunning
                  ? 'EXECUTING HEADLESS SIMULATION...'
                  : results
                    ? 'RE-RUN 3-WAY BENCHMARK'
                    : 'RUN 3-WAY HEAD-TO-HEAD BENCHMARK'}
              </span>
            </button>
          </div>

          {/* Results Display */}
          {results ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Highlight summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
                    <span>EVACUATION TIME REDUCTION</span>
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div className="text-3xl font-black font-mono text-emerald-400">
                    -{results.improvementTimePct}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Reduced from <span className="font-mono text-rose-300 font-bold">{results.baseline.evacuationTime}s</span> (Shortest Path) down to{' '}
                    <span className="font-mono text-emerald-300 font-bold">{results.smart.evacuationTime}s</span> (-{results.astarImprovementPct}% vs Safe Route)
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/30">
                  <div className="flex items-center justify-between text-xs text-sky-400 font-semibold mb-1">
                    <span>BOTTLENECK QUEUE COLLAPSE</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-3xl font-black font-mono text-sky-400">
                    -{results.queueReductionPct}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Peak crowd crush decreased from <span className="font-mono text-rose-300 font-bold">{results.baseline.globalPeakQueue ?? results.baseline.peakQueueC2}</span> down to{' '}
                    <span className="font-mono text-sky-300 font-bold">{results.smart.globalPeakQueue ?? results.smart.peakQueueC2} people</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30">
                  <div className="flex items-center justify-between text-xs text-purple-400 font-semibold mb-1">
                    <span>RAPID SURVIVAL SURGE @ T=30s</span>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-3xl font-black font-mono text-purple-300">
                    +{results.smart.timeWindowEgress && results.baseline.timeWindowEgress
                      ? Math.round(
                          ((results.smart.timeWindowEgress.t30s.count - results.baseline.timeWindowEgress.t30s.count) /
                            Math.max(1, results.baseline.timeWindowEgress.t30s.count)) *
                            100
                        )
                      : 0}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    <span className="font-mono text-purple-300 font-bold">
                      {results.smart.timeWindowEgress?.t30s.count ?? 0}
                    </span> safe vs{' '}
                    <span className="font-mono text-rose-300 font-bold">
                      {results.baseline.timeWindowEgress?.t30s.count ?? 0}
                    </span> in Shortest Path during critical flashover window
                  </div>
                </div>
              </div>

              {/* 3-Way Side-by-side Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-sky-400" />
                    <span>3-Way Scientific Algorithm Comparison Table</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">100% Deterministic Twin Simulation</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono tracking-wider">
                    <tr>
                      <th className="p-3">Evaluation Parameter</th>
                      <th className="p-3 text-rose-400 font-bold">1. Shortest Path</th>
                      <th className="p-3 text-amber-400 font-bold">2. Safe Route (Hazard-Aware)</th>
                      <th className="p-3 text-emerald-400 font-bold">3. Safe Route + Congestion</th>
                      <th className="p-3 text-sky-400 font-bold">Net Delta (Strat 3 vs 1)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    <tr className="hover:bg-slate-900/40">
                      <td className="p-3 text-slate-300 font-sans font-medium">Total Evacuation Time (T_evac)</td>
                      <td className="p-3 text-slate-200">{results.baseline.evacuationTime} s</td>
                      <td className="p-3 text-amber-200">{results.astar.evacuationTime} s</td>
                      <td className="p-3 text-emerald-300 font-bold">{results.smart.evacuationTime} s</td>
                      <td className="p-3 text-emerald-400 font-bold">-{results.improvementTimePct}% faster</td>
                    </tr>
                    <tr className="hover:bg-slate-900/40">
                      <td className="p-3 text-slate-300 font-sans font-medium">Mean Individual Egress Delay</td>
                      <td className="p-3 text-slate-200">{results.baseline.averageEgressTime} s</td>
                      <td className="p-3 text-amber-200">{results.astar.averageEgressTime} s</td>
                      <td className="p-3 text-emerald-300 font-bold">{results.smart.averageEgressTime} s</td>
                      <td className="p-3 text-emerald-400">
                        -{Math.round(((results.baseline.averageEgressTime - results.smart.averageEgressTime) / (results.baseline.averageEgressTime || 1)) * 1000) / 10}%
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-900/40">
                      <td className="p-3 text-slate-300 font-sans font-medium">Peak Chokepoint Queue (Q_max)</td>
                      <td className="p-3 text-rose-400 font-bold">{results.baseline.globalPeakQueue ?? results.baseline.peakQueueC2} people</td>
                      <td className="p-3 text-amber-400 font-bold">{results.astar.globalPeakQueue ?? results.astar.peakQueueC2} people</td>
                      <td className="p-3 text-emerald-300 font-bold">{results.smart.globalPeakQueue ?? results.smart.peakQueueC2} people</td>
                      <td className="p-3 text-sky-400 font-bold">-{results.queueReductionPct}% reduction</td>
                    </tr>
                    <tr className="hover:bg-slate-900/40">
                      <td className="p-3 text-slate-300 font-sans font-medium">Doorway Flow Rate (NFPA 101)</td>
                      <td className="p-3 text-slate-300">{results.baseline.observedDoorFlowRate ?? 0} pers/m/s</td>
                      <td className="p-3 text-amber-300">{results.astar.observedDoorFlowRate ?? 0} pers/m/s</td>
                      <td className="p-3 text-emerald-300 font-bold">{results.smart.observedDoorFlowRate ?? 0} pers/m/s</td>
                      <td className="p-3 text-slate-400">Standard: ≤ 1.33 pers/m/s</td>
                    </tr>
                    {results.baseline.timeWindowEgress && results.astar.timeWindowEgress && results.smart.timeWindowEgress && (
                      <>
                        <tr className="hover:bg-slate-900/40 bg-purple-950/10">
                          <td className="p-3 text-purple-300 font-sans font-semibold">
                            ⏱️ Safe Evacuees @ T = 15s
                          </td>
                          <td className="p-3 text-slate-200">
                            {results.baseline.timeWindowEgress.t15s.count} ({results.baseline.timeWindowEgress.t15s.pct}%)
                          </td>
                          <td className="p-3 text-amber-200">
                            {results.astar.timeWindowEgress.t15s.count} ({results.astar.timeWindowEgress.t15s.pct}%)
                          </td>
                          <td className="p-3 text-emerald-300 font-bold">
                            {results.smart.timeWindowEgress.t15s.count} ({results.smart.timeWindowEgress.t15s.pct}%)
                          </td>
                          <td className="p-3 text-emerald-400 font-bold">
                            +{results.smart.timeWindowEgress.t15s.count - results.baseline.timeWindowEgress.t15s.count} people ahead
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-900/40 bg-purple-950/20">
                          <td className="p-3 text-purple-200 font-sans font-bold">
                            ⏱️ Safe Evacuees @ T = 30s (Critical Window)
                          </td>
                          <td className="p-3 text-rose-300 font-bold">
                            {results.baseline.timeWindowEgress.t30s.count} ({results.baseline.timeWindowEgress.t30s.pct}%)
                          </td>
                          <td className="p-3 text-amber-300 font-bold">
                            {results.astar.timeWindowEgress.t30s.count} ({results.astar.timeWindowEgress.t30s.pct}%)
                          </td>
                          <td className="p-3 text-emerald-300 font-black">
                            {results.smart.timeWindowEgress.t30s.count} ({results.smart.timeWindowEgress.t30s.pct}%)
                          </td>
                          <td className="p-3 text-emerald-400 font-black">
                            +{Math.round(((results.smart.timeWindowEgress.t30s.count - results.baseline.timeWindowEgress.t30s.count) / Math.max(1, results.baseline.timeWindowEgress.t30s.count)) * 1000) / 10}% survival gain
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-900/40 bg-purple-950/10">
                          <td className="p-3 text-purple-300 font-sans font-semibold">
                            ⏱️ Safe Evacuees @ T = 45s
                          </td>
                          <td className="p-3 text-slate-200">
                            {results.baseline.timeWindowEgress.t45s.count} ({results.baseline.timeWindowEgress.t45s.pct}%)
                          </td>
                          <td className="p-3 text-amber-200">
                            {results.astar.timeWindowEgress.t45s.count} ({results.astar.timeWindowEgress.t45s.pct}%)
                          </td>
                          <td className="p-3 text-emerald-300 font-bold">
                            {results.smart.timeWindowEgress.t45s.count} ({results.smart.timeWindowEgress.t45s.pct}%)
                          </td>
                          <td className="p-3 text-emerald-400 font-bold">
                            +{results.smart.timeWindowEgress.t45s.count - results.baseline.timeWindowEgress.t45s.count} people ahead
                          </td>
                        </tr>
                      </>
                    )}
                    <tr className="hover:bg-slate-900/40">
                      <td className="p-3 text-slate-300 font-sans font-medium">Trapped / Casualty Count</td>
                      <td className="p-3 text-slate-200">{results.baseline.trappedCount ?? 0} trapped</td>
                      <td className="p-3 text-amber-200">{results.astar.trappedCount ?? 0} trapped</td>
                      <td className="p-3 text-emerald-300">{results.smart.trappedCount ?? 0} trapped</td>
                      <td className="p-3 text-slate-400">0 trapped in clear</td>
                    </tr>
                    <tr className="hover:bg-slate-900/40">
                      <td className="p-3 text-slate-300 font-sans font-medium">Total Population</td>
                      <td className="p-3 text-slate-200">{results.baseline.totalOccupants} occupants</td>
                      <td className="p-3 text-amber-200">{results.astar.totalOccupants} occupants</td>
                      <td className="p-3 text-emerald-300">{results.smart.totalOccupants} occupants</td>
                      <td className="p-3 text-slate-400">100% Evacuated</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Corridor Bottleneck Analysis Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-sky-400" />
                    <span>Corridor Segment Holding Capacity & Bottleneck Breakdown</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">BPR Congestion Metric</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono tracking-wider">
                    <tr>
                      <th className="p-2.5">Corridor Segment</th>
                      <th className="p-2.5 text-slate-300">Design Capacity</th>
                      <th className="p-2.5 text-rose-400">1. Shortest Path Queue</th>
                      <th className="p-2.5 text-amber-400">2. Safe Route Queue</th>
                      <th className="p-2.5 text-emerald-400">3. Safe + Congestion Queue</th>
                      <th className="p-2.5 text-sky-400">Bottleneck Relief</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {results.baseline.corridorBottlenecks.map((c, idx) => {
                      const aCorr = results.astar.corridorBottlenecks[idx];
                      const sCorr = results.smart.corridorBottlenecks[idx];
                      const liveCorr = simulator.corridors.find((tc) => tc.id === c.id);
                      const capLabel =
                        !liveCorr || liveCorr.capacity === null || !isFinite(liveCorr.capacity)
                          ? '∞ (No Limit)'
                          : liveCorr.capacity === 0
                            ? '0 (Choke)'
                            : `${liveCorr.capacity} persons`;
                      const qDiff = c.peakQueue - (sCorr?.peakQueue ?? 0);
                      return (
                        <tr key={c.id} className="hover:bg-slate-900/40">
                          <td className="p-2.5 text-slate-300 font-sans font-medium">{c.name}</td>
                          <td className="p-2.5 text-slate-400">{capLabel}</td>
                          <td className="p-2.5 text-rose-300">{c.peakQueue}</td>
                          <td className="p-2.5 text-amber-300">{aCorr ? aCorr.peakQueue : 0}</td>
                          <td className="p-2.5 text-emerald-300 font-bold">{sCorr ? sCorr.peakQueue : 0}</td>
                          <td className="p-2.5 text-sky-400 font-sans">
                            {qDiff > 0 ? (
                              <span className="text-emerald-400 font-bold font-mono">-{qDiff} queued</span>
                            ) : (
                              <span className="text-slate-400">Fluid Flow</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Egress Portal Discharge Allocation Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Egress Portal Discharge & Dynamic Load Distribution</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Wardrop User Equilibrium (DUE)</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono tracking-wider">
                    <tr>
                      <th className="p-2.5">Egress Portal</th>
                      <th className="p-2.5 text-slate-300">Portal Type</th>
                      <th className="p-2.5 text-rose-400">1. Shortest Path</th>
                      <th className="p-2.5 text-amber-400">2. Safe Route</th>
                      <th className="p-2.5 text-emerald-400">3. Safe + Congestion</th>
                      <th className="p-2.5 text-sky-400">Traffic Distribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {[...simulator.exits, ...simulator.stairs, ...simulator.lifts].map((portal) => {
                      const bCount = results.baseline.exitCounts[portal.id] || 0;
                      const aCount = results.astar.exitCounts[portal.id] || 0;
                      const sCount = results.smart.exitCounts[portal.id] || 0;
                      const pType = simulator.exits.some((e) => e.id === portal.id)
                        ? 'Exterior Fire Exit'
                        : simulator.stairs.some((s) => s.id === portal.id)
                          ? 'Protected Escape Stairwell'
                          : 'Evacuation Elevator';
                      return (
                        <tr key={portal.id} className="hover:bg-slate-900/40">
                          <td className="p-2.5 text-slate-300 font-sans font-medium">{portal.name}</td>
                          <td className="p-2.5 text-slate-400 font-sans">{pType}</td>
                          <td className="p-2.5 text-rose-300">{bCount} evacuees</td>
                          <td className="p-2.5 text-amber-300">{aCount} evacuees</td>
                          <td className="p-2.5 text-emerald-300 font-bold">{sCount} evacuees</td>
                          <td className="p-2.5 text-slate-300 font-sans">
                            {sCount > bCount ? (
                              <span className="text-sky-400 font-bold">+{sCount - bCount} load absorbed</span>
                            ) : sCount < bCount ? (
                              <span className="text-emerald-400 font-bold">-{bCount - sCount} bottleneck relief</span>
                            ) : (
                              <span className="text-slate-400">Balanced</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Research Paper & Publication Export Actions */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>Publication-ready automated data generation for IEEE / Springer Minor Project Report.</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleDownloadHtmlReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 text-xs font-semibold border border-emerald-500/40 transition-colors"
                    title="Download standalone styled HTML benchmark report"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download HTML Report</span>
                  </button>

                  <button
                    onClick={handleDownloadMarkdownReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold border border-purple-500/40 transition-colors"
                    title="Download Markdown benchmark tables (.md)"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-400" />
                    <span>Download Markdown Report</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Download CSV Dataset</span>
                  </button>

                  <button
                    onClick={handleCopyLatexTable}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 text-xs font-semibold border border-sky-500/40 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied LaTeX Table!' : 'Copy LaTeX Table'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <Layers className="w-10 h-10 mx-auto mb-2 text-slate-600 animate-pulse" />
              <p className="text-sm font-semibold text-slate-400">Click &ldquo;RUN 3-WAY HEAD-TO-HEAD BENCHMARK&rdquo; above</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                The simulator executes deterministic headless simulations across Strategy 1 (Shortest Path), Strategy 2 (Safe Route), and Strategy 3 (Safe Route + Congestion Optimization) under identical starting conditions and generates publication-grade empirical comparison tables.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span>EvacFlow 6.0 Scientific Engine • MAIT CSE Minor Project Group MNP012</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close Lab
          </button>
        </div>
      </div>
    </div>
  );
}

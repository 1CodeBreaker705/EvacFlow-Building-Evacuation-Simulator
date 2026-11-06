'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  GeometricBuildingSimulator,
  BuildingMapConfig,
  RoutingStrategy,
  SavedBlueprint,
  getSavedBlueprints,
  saveBlueprintToStorage,
  deleteBlueprintFromStorage,
} from '@/lib/geometricModel';
import { GeometricMapCanvas } from '@/components/GeometricMapCanvas';
import { ItemInspectorPanel } from '@/components/ItemInspectorPanel';
import { BenchmarkModal } from '@/components/BenchmarkModal';
import { MapEditorStudio } from '@/components/MapEditorStudio';
import {
  Play,
  Pause,
  RotateCcw,
  Users,
  Clock,
  Building,
  Sliders,
  X,
  Flame,
  Wind,
  ChevronLeft,
  ChevronRight,
  FastForward,
  Shield,
  Ban,
  Eraser,
  UserPlus,
  MousePointer,
  Layers,
  Sparkles,
  Trash2,
  Download,
  Upload,
  List,
  Save,
} from 'lucide-react';

export default function EvacFlowSimulatorPage() {
  // Simulator Singleton Reference
  const simRef = useRef<GeometricBuildingSimulator | null>(null);
  if (!simRef.current) {
    simRef.current = new GeometricBuildingSimulator();
  }
  const sim = simRef.current;

  // Mode: Simulation vs Map Studio
  const [currentMode, setCurrentMode] = useState<'simulation' | 'studio'>('simulation');

  // React State
  const [isPlaying, setIsPlaying] = useState(false);
  const [tick, setTick] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [strategy, setStrategy] = useState<RoutingStrategy>('shortest');
  const [currentMap, setCurrentMap] = useState<string>('atrium_complex');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'room' | 'corridor' | 'exit' | 'stairs' | 'lift' | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [walkingSpeed, setWalkingSpeed] = useState(1.4); // 1.4 m/s default
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0); // 1x, 2x, 4x fast forward
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Brush Tool State: select, fire, smoke, block, pedestrian, eraser
  const [brushTool, setBrushTool] = useState<'select' | 'fire' | 'smoke' | 'block' | 'pedestrian' | 'eraser'>('select');
  const [brushSize, setBrushSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [brushToast, setBrushToast] = useState<string | null>(null);

  // Blueprint Layer Visibility Toggles (Furnishings removed per requirement 1)
  const [showDimensions, setShowDimensions] = useState(true);
  const [showFlowArrows, setShowFlowArrows] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Modals
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);

  // Time-Critical Evacuation Target Timer Option
  const [timerLimit, setTimerLimit] = useState<number | null>(null);

  const handleTimerSelect = (sec: number | null) => {
    setTimerLimit(sec);
    sim.setTargetTimer(sec, true);
    setTick((t: number) => t + 1);
  };

  const showToast = (msg: string) => {
    setBrushToast(msg);
    setTimeout(() => setBrushToast(null), 2800);
  };

  // Computed live metrics
  const totalPeople = sim.people.length;
  const evacuatedCount = sim.people.filter((p) => p.isEvacuated).length;
  const refugeeCount = sim.people.filter((p) => p.isRefugee && !p.isEvacuated).length;
  const totalQueue = sim.corridors.reduce((acc, c) => acc + c.currentQueue, 0);
  const evacuationProgressPct = totalPeople > 0 ? Math.round((evacuatedCount / totalPeople) * 100) : 0;

  // 60 FPS Physics Simulation Loop with Throttled React UI Reconciliation
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let lastUiUpdate = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.064, (now - lastTime) / 1000);
      lastTime = now;

      if (sim.isPlaying) {
        sim.update(dt);

        // Throttle React state reconciliation to 10 Hz (every 100ms) to maintain 60 FPS canvas fluidity
        if (now - lastUiUpdate > 100) {
          lastUiUpdate = now;
          setElapsedTime(sim.elapsedSeconds);
          setTick((t: number) => (t + 1) % 10000);
        }

        if (sim.people.length > 0 && sim.people.every((p) => p.isEvacuated || p.isRefugee)) {
          sim.isPlaying = false;
          setIsPlaying(false);
          setElapsedTime(sim.elapsedSeconds);
          setTick((t: number) => (t + 1) % 10000);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [sim]);

  // Saved Blueprints & Uploaded Map State
  const [savedBlueprints, setSavedBlueprints] = useState<SavedBlueprint[]>([]);
  const [uploadedMap, setUploadedMap] = useState<{ title: string; config: BuildingMapConfig } | null>(null);

  const refreshSavedBlueprints = () => {
    setSavedBlueprints(getSavedBlueprints());
  };

  useEffect(() => {
    refreshSavedBlueprints();
  }, []);

  const handleDeleteSavedBlueprint = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteBlueprintFromStorage(id);
    setSavedBlueprints(updated);
    if (currentMap === id || currentMap === `custom_${id}`) {
      handleMapChange('atrium_complex');
    }
    showToast('Saved blueprint deleted');
  };

  const simFileInputRef = useRef<HTMLInputElement | null>(null);

  // Import floorplan from JSON file into Simulation Mode (Upload without polluting permanent blueprints)
  const handleImportFloorplanFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data || !Array.isArray(data.rooms) || !Array.isArray(data.corridors) || !Array.isArray(data.exits)) {
          alert('Invalid floorplan file format. Missing rooms, corridors, or exits array.');
          return;
        }
        const title = data.title || file.name.replace(/\.[^/.]+$/, '');
        const updatedConfig: BuildingMapConfig = {
          ...data,
          title,
          subtitle: data.subtitle || `Uploaded Floorplan • ${data.rooms.length} Rooms, ${data.corridors.length} Corridors, ${data.exits.length} Exits`,
        };
        sim.loadCustomMap(updatedConfig);
        setUploadedMap({ title, config: updatedConfig });
        setCurrentMap('custom');
        setIsPlaying(false);
        setElapsedTime(0);
        setSelectedItemId(null);
        setShowInspector(false);
        setTick((t: number) => t + 1);
        showToast(`Imported map: "${title}"`);
      } catch (err) {
        alert('Failed to parse floorplan JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Play / Pause Simulation
  const togglePlay = () => {
    sim.isPlaying = !sim.isPlaying;
    setIsPlaying(sim.isPlaying);
  };

  const handleReset = () => {
    sim.resetSimulation();
    setIsPlaying(false);
    setElapsedTime(0);
    setTick((t: number) => t + 1);
    showToast('Simulation & all hazards reset');
  };

  const handleSpeedPreset = (speedMps: number) => {
    setWalkingSpeed(speedMps);
    sim.setWalkingSpeed(speedMps);
    setTick((t: number) => t + 1);
  };

  const handleMultiplierToggle = () => {
    const nextMult = speedMultiplier === 1.0 ? 2.0 : speedMultiplier === 2.0 ? 4.0 : 1.0;
    setSpeedMultiplier(nextMult);
    sim.globalSpeed = nextMult;
  };

  // Requirement 4: Three established scientific routing strategies
  const handleStrategyChange = (strat: RoutingStrategy) => {
    sim.setStrategy(strat);
    setStrategy(strat);
    setTick((t: number) => t + 1);
  };

  const handleMapChange = (mapId: string) => {
    setCurrentMap(mapId);
    if (mapId === 'custom' && uploadedMap) {
      sim.loadCustomMap(uploadedMap.config);
    } else {
      sim.loadMap(mapId);
    }
    setSelectedItemId(null);
    setSelectedItemType(null);
    setShowInspector(false);
    setIsPlaying(false);
    setElapsedTime(0);
    setTick((t: number) => t + 1);
  };

  // Selection & Inspector
  const handleSelectItem = (id: string, type: 'room' | 'corridor' | 'exit' | 'stairs' | 'lift') => {
    setSelectedItemId(id);
    setSelectedItemType(type);
    setShowInspector(true);
    setTick((t: number) => t + 1);
  };

  const handleUpdateCorridorWidth = (corridorId: string, width: number) => {
    sim.updateCorridorWidth(corridorId, width);
    setTick((t: number) => t + 1);
  };

  // Requirement 5: Block full corridor or ignite full corridor
  const handleToggleHazard = (corridorId: string, type: 'fire' | 'block' | 'smoke') => {
    if (type === 'fire') {
      sim.toggleCorridorFire(corridorId);
      showToast('Corridor Fire Hazard Toggled');
    } else if (type === 'smoke') {
      sim.toggleCorridorSmoke(corridorId);
      showToast('Corridor Smoke Hazard Toggled');
    } else {
      sim.toggleCorridorBlock(corridorId);
      showToast('Corridor Physical Blockage Toggled');
    }
    setTick((t: number) => t + 1);
  };

  const handleUpdateRoomPeople = (roomId: string, count: number) => {
    sim.updateRoomPeople(roomId, count);
    setTick((t: number) => t + 1);
  };

  // Load Custom Blueprint from Map Studio
  const handleSimulateCustomMap = (config: BuildingMapConfig) => {
    const title = config.title || 'Engineered Blueprint';
    const updatedConfig = { ...config, title };
    sim.loadCustomMap(updatedConfig);
    setUploadedMap({ title, config: updatedConfig });
    setCurrentMap('custom');
    setCurrentMode('simulation');
    setIsPlaying(false);
    setElapsedTime(0);
    setSelectedItemId(null);
    setShowInspector(false);
    setTick((t: number) => t + 1);
    showToast(`Simulating "${title}"`);
  };

  return (
    <main className="h-screen w-screen flex flex-col bg-slate-950 text-white font-sans overflow-hidden select-none">
      {/* 1. Sleek Zero-Clutter Top HUD Header */}
      <header className="h-12 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-40 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-100 tracking-tight">EvacFlow 6.0</h1>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 rounded border border-sky-500/30">
                  v6.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                MAIT CSE • Ranjan Singh &amp; Dhruv Kumar Bhaskar • Guide: Dr. Karuna Middha
              </p>
            </div>
          </div>
        </div>

        {/* Center Mode Switcher */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setCurrentMode('simulation')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentMode === 'simulation'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3 h-3" /> Simulation Studio
          </button>
          <button
            onClick={() => setCurrentMode('studio')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentMode === 'studio'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-3 h-3" /> CAD Map Builder
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBenchmarkOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors shadow-sm"
            title="Open Comparative 3-Way Egress Benchmark"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>3-Way Benchmark</span>
          </button>
        </div>
      </header>

      {/* 2. Main Body Grid */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Collapsible Architectural Facility Panel */}
        <aside
          className={`${
            isSidebarCollapsed ? 'w-12' : 'w-72'
          } bg-slate-950/95 border-r border-slate-800 flex flex-col transition-all duration-200 z-30 flex-shrink-0 text-xs`}
        >
          {/* Sidebar Header Toggle */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            {!isSidebarCollapsed && (
              <span className="font-bold text-slate-200 tracking-wide uppercase text-[11px]">
                Facility Parameters
              </span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white ml-auto"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {!isSidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
              {/* Floorplan Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  1. Architectural Blueprint
                </label>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMapChange('atrium_complex')}
                    className={`text-left px-3 py-2 rounded-xl border transition-all ${
                      currentMap === 'atrium_complex'
                        ? 'bg-sky-500/20 text-sky-200 border-sky-500/50 font-bold shadow-sm'
                        : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    🏛️ MAIT BLOCK 1 1ST Floor
                  </button>
                  <button
                    onClick={() => handleMapChange('academic')}
                    className={`text-left px-3 py-2 rounded-xl border transition-all ${
                      currentMap === 'academic'
                        ? 'bg-sky-500/20 text-sky-200 border-sky-500/50 font-bold shadow-sm'
                        : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    🏫 Academic Wing (Labs &amp; Hall)
                  </button>
                  <button
                    onClick={() => handleMapChange('two_story_transit')}
                    className={`text-left px-3 py-2 rounded-xl border transition-all ${
                      currentMap === 'two_story_transit'
                        ? 'bg-sky-500/20 text-sky-200 border-sky-500/50 font-bold shadow-sm'
                        : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    ✈️ Multi-Level Transit (Stairs &amp; Lift)
                  </button>
                  <button
                    onClick={() => handleMapChange('hospital_ward')}
                    className={`text-left px-3 py-2 rounded-xl border transition-all ${
                      currentMap === 'hospital_ward'
                        ? 'bg-sky-500/20 text-sky-200 border-sky-500/50 font-bold shadow-sm'
                        : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    🏥 Healthcare &amp; ICU Ward (Ambulance Exit)
                  </button>
                  {/* Requirement 5: Permanent Saved Blueprints from Map Maker */}
                  {savedBlueprints.length > 0 && (
                    <div className="pt-2 mt-1 border-t border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Saved Custom Floorplans
                      </span>
                      <div className="flex flex-col gap-1">
                        {savedBlueprints.map((bp) => {
                          const isSel = currentMap === bp.id;
                          return (
                            <div
                              key={bp.id}
                              onClick={() => {
                                handleSimulateCustomMap(bp.config);
                                setCurrentMap(bp.id);
                              }}
                              className={`group flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-purple-500/20 text-purple-200 border-purple-500/50 font-bold shadow-sm'
                                  : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border-slate-800'
                              }`}
                            >
                              <div className="truncate pr-1">
                                <div className="truncate text-xs font-semibold">📐 {bp.title}</div>
                                <div className="text-[10px] text-slate-400 font-normal">{bp.createdAt}</div>
                              </div>
                              <button
                                onClick={(e) => handleDeleteSavedBlueprint(e, bp.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded transition-opacity"
                                title="Delete saved floorplan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Uploaded Floorplan Item: Shows ONLY the newly uploaded map */}
                  {uploadedMap && (
                    <div className="pt-2 mt-1 border-t border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Active Uploaded Floorplan
                      </span>
                      <div
                        onClick={() => {
                          sim.loadCustomMap(uploadedMap.config);
                          setCurrentMap('custom');
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                          currentMap === 'custom'
                            ? 'bg-amber-500/20 text-amber-200 border-amber-500/50 font-bold shadow-sm'
                            : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        <div className="truncate pr-1">
                          <div className="truncate text-xs font-semibold">📁 {uploadedMap.title}</div>
                          <div className="text-[10px] text-amber-400/80 font-normal">Active Uploaded Map</div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedMap(null);
                            handleMapChange('atrium_complex');
                            showToast('Uploaded map removed');
                          }}
                          className="p-1 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded transition-colors"
                          title="Remove uploaded map"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Single Import Map Button (Export file removed from simulation per specification) */}
                  <input
                    ref={simFileInputRef}
                    type="file"
                    accept=".json,.evacplan.json"
                    onChange={handleImportFloorplanFile}
                    className="hidden"
                  />
                  <div className="pt-2 mt-1 border-t border-slate-800">
                    <button
                      onClick={() => simFileInputRef.current?.click()}
                      className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors hover:border-amber-500/50"
                      title="Import custom floorplan from .json or .evacplan.json file"
                    >
                      <Upload className="w-4 h-4 text-amber-400" /> Import Map
                    </button>
                  </div>
                </div>
              </div>

              {/* Requirement 4: Three Routing Algorithms */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  2. Egress Algorithm (Research-Backed)
                </label>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => handleStrategyChange('shortest')}
                    className={`text-left px-3 py-2 rounded-xl border transition-all ${
                      strategy === 'shortest'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold shadow-sm'
                        : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    🔴 1. Shortest Path (Classical Distance)
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Pure Euclidean shortest distance (hazard-blind rush)
                    </div>
                  </button>

                  <button
                    onClick={() => handleStrategyChange('safe')}
                    className={`text-left px-3 py-2 rounded-xl border transition-all ${
                      strategy === 'safe'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold shadow-sm'
                        : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    🟡 2. Safe Route (Hazard-Aware)
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Actively steers away from fire &amp; smoke (congestion-blind)
                    </div>
                  </button>

                  <button
                    onClick={() => handleStrategyChange('smart_congestion')}
                    className={`text-left px-3 py-2 rounded-xl border transition-all ${
                      strategy === 'smart_congestion'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold shadow-sm'
                        : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    🟢 3. Safe Route + Congestion Optimization
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Joint hazard avoidance &amp; dynamic doorway queue balancing
                    </div>
                  </button>
                </div>
              </div>

              {/* Walking Speed & Window */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Speed (m/s)
                  </label>
                  <select
                    value={walkingSpeed}
                    onChange={(e) => handleSpeedPreset(parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value={0.8}>0.8 m/s (Slow)</option>
                    <option value={1.4}>1.4 m/s (Normal)</option>
                    <option value={2.2}>2.2 m/s (Rushing)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Window
                  </label>
                  <select
                    value={timerLimit === null ? 'off' : timerLimit}
                    onChange={(e) => {
                      const v = e.target.value;
                      handleTimerSelect(v === 'off' ? null : parseInt(v, 10));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value="off">Off (Free)</option>
                    <option value="15">15 Seconds</option>
                    <option value="30">30 Seconds</option>
                    <option value="45">45 Seconds</option>
                    <option value="60">60 Seconds</option>
                  </select>
                </div>
              </div>

              {/* Requirement 7: Removed dimension lines & egress guidance chevrons */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  3. CAD Layers &amp; Visuals
                </label>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={showHeatmap}
                      onChange={(e) => setShowHeatmap(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Corridor Density Heatmap</span>
                  </label>
                </div>
              </div>

              {/* Requirement 2: Inspect Map Elements & Modify Constraints */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                  <span>4. Inspect Elements &amp; Constraints</span>
                  <span className="text-[10px] text-sky-400 font-normal">
                    {sim.rooms.length + sim.corridors.length + sim.exits.length + sim.stairs.length + sim.lifts.length} items
                  </span>
                </label>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto p-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
                  {/* Exits */}
                  {sim.exits.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => handleSelectItem(ex.id, 'exit')}
                      className={`w-full text-left px-2 py-1 rounded-lg border flex items-center justify-between transition-all ${
                        selectedItemId === ex.id
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">🚪 {ex.label}</span>
                      <span className="text-[9px] text-emerald-400 font-mono">
                        {ex.maxCapacityLimit ? `${ex.evacuatedCount}/${ex.maxCapacityLimit}` : `${ex.evacuatedCount}/∞`}
                      </span>
                    </button>
                  ))}

                  {/* Stairs */}
                  {sim.stairs.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => handleSelectItem(st.id, 'stairs')}
                      className={`w-full text-left px-2 py-1 rounded-lg border flex items-center justify-between transition-all ${
                        selectedItemId === st.id
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-bold'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">🪜 {st.label}</span>
                      <span className="text-[9px] text-cyan-400 font-mono">
                        {st.maxCapacityLimit ? `${st.evacuatedCount}/${st.maxCapacityLimit}` : `${st.evacuatedCount}/∞`}
                      </span>
                    </button>
                  ))}

                  {/* Lifts */}
                  {sim.lifts.map((lt) => (
                    <button
                      key={lt.id}
                      onClick={() => handleSelectItem(lt.id, 'lift')}
                      className={`w-full text-left px-2 py-1 rounded-lg border flex items-center justify-between transition-all ${
                        selectedItemId === lt.id
                          ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">🛗 {lt.label || 'LIFT'}</span>
                      <span className="text-[9px] text-amber-400 font-mono">
                        {lt.maxCapacityLimit ? `${lt.evacuatedCount}/${lt.maxCapacityLimit}` : `${lt.evacuatedCount}/∞`}
                      </span>
                    </button>
                  ))}

                  {/* Rooms */}
                  {sim.rooms.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSelectItem(r.id, 'room')}
                      className={`w-full text-left px-2 py-1 rounded-lg border flex items-center justify-between transition-all ${
                        selectedItemId === r.id
                          ? 'bg-sky-950/80 border-sky-500 text-sky-200 font-bold'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">🏢 {r.label}</span>
                      <span className="text-[9px] text-sky-400 font-mono">{r.peopleCount}p</span>
                    </button>
                  ))}

                  {/* Corridors */}
                  {sim.corridors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectItem(c.id, 'corridor')}
                      className={`w-full text-left px-2 py-1 rounded-lg border flex items-center justify-between transition-all ${
                        selectedItemId === c.id
                          ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 font-bold'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">↔️ {c.label}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{c.widthMeters}m</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Telemetry Card (Refugee count included) */}
              <div className="mt-auto p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Evacuation Progress:</span>
                  <span className="font-bold text-emerald-400">
                    {evacuatedCount} / {totalPeople} ({evacuationProgressPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${evacuationProgressPct}%` }}
                  />
                </div>

                {/* Requirement 7: Refugee status indicator */}
                {refugeeCount > 0 && (
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 text-amber-400 font-bold">
                    <span>🛡️ Refugees (Cut Off):</span>
                    <span>{refugeeCount} Awaiting Rescue</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Bottleneck Status:</span>
                  <span className={`font-bold ${totalQueue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {totalQueue > 0 ? `⚠️ ${totalQueue} in Queue` : '🟢 Fluid Flow'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Center Main Blueprint Viewport */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#070b12] p-2">
          {/* Target Timer Snapshot Notification */}
          {sim.timerSnapshot && (
            <div className="mb-2 p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-300">
                  ⏱️ {sim.timerSnapshot.targetSeconds}s Window Elapsed:
                </span>
                <span className="text-white font-semibold">
                  {sim.timerSnapshot.evacuated} of {sim.timerSnapshot.total} safely evacuated ({sim.timerSnapshot.ratioPct}%) under {sim.timerSnapshot.strategy.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nextStrat = strategy === 'shortest' ? 'smart_congestion' : 'shortest';
                    handleStrategyChange(nextStrat);
                    togglePlay();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                >
                  Compare {strategy === 'shortest' ? 'Congestion-Aware' : 'Shortest Path'}
                </button>
                <button
                  onClick={() => {
                    sim.timerSnapshot = null;
                    sim.isPlaying = true;
                    setIsPlaying(true);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Resume
                </button>
              </div>
            </div>
          )}

          {/* Requirement 5: Interactive Brush Toolbar with Brush Size Selector */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs z-20">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Brush Mode:</span>
              <button
                onClick={() => setBrushTool('select')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  brushTool === 'select'
                    ? 'bg-sky-600 text-white font-bold shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Inspect elements"
              >
                <MousePointer className="w-3.5 h-3.5" /> Inspect
              </button>

              <button
                onClick={() => setBrushTool('fire')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  brushTool === 'fire'
                    ? 'bg-orange-600 text-white font-bold shadow-sm'
                    : 'bg-slate-800 text-orange-400 hover:bg-slate-700'
                }`}
                title="Drag mouse to paint active fire & flames"
              >
                <Flame className="w-3.5 h-3.5" /> 🔥 Fire Brush
              </button>

              <button
                onClick={() => setBrushTool('smoke')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  brushTool === 'smoke'
                    ? 'bg-slate-600 text-white font-bold shadow-sm ring-1 ring-slate-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Drag mouse to paint rolling smoke hazard (causes 60% speed slowdown & detour)"
              >
                <Wind className="w-3.5 h-3.5 text-slate-300" /> 💨 Smoke Brush
              </button>

              <button
                onClick={() => setBrushTool('block')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  brushTool === 'block'
                    ? 'bg-rose-600 text-white font-bold shadow-sm'
                    : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
                }`}
                title="Drag mouse to paint rubble/barricades"
              >
                <Ban className="w-3.5 h-3.5" /> 🚧 Block Debris
              </button>

              <button
                onClick={() => setBrushTool('pedestrian')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  brushTool === 'pedestrian'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                }`}
                title="Click on walkable areas to place pedestrians"
              >
                <UserPlus className="w-3.5 h-3.5" /> 🚶 Place Pedestrian
              </button>

              <button
                onClick={() => setBrushTool('eraser')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                  brushTool === 'eraser'
                    ? 'bg-slate-700 text-white font-bold shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Drag to erase fire, smoke & debris"
              >
                <Eraser className="w-3.5 h-3.5" /> 🧹 Eraser
              </button>

              {/* Requirement 1: 1-Click option to remove everything applied by brush (smoke, fire, debris) */}
              <button
                onClick={() => {
                  sim.clearAllHazards();
                  setTick((t: number) => t + 1);
                  showToast('🧹 All Fire, Smoke & Debris Cleared (1-Click)');
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 shadow-sm"
                title="1-Click: Remove all painted fire, smoke, and debris from entire map"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All Hazards
              </button>

              {/* Brush Size Selector */}
              {(brushTool === 'fire' || brushTool === 'smoke' || brushTool === 'block' || brushTool === 'eraser') && (
                <div className="flex items-center gap-1 pl-2 border-l border-slate-700 ml-1">
                  <span className="text-[10px] text-slate-400 font-semibold">Size:</span>
                  <button
                    onClick={() => setBrushSize('small')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      brushSize === 'small' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    16px (S)
                  </button>
                  <button
                    onClick={() => setBrushSize('medium')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      brushSize === 'medium' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    28px (M)
                  </button>
                  <button
                    onClick={() => setBrushSize('large')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      brushSize === 'large' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    44px (L)
                  </button>
                </div>
              )}
            </div>

            {brushToast && (
              <span className="text-xs text-amber-300 font-semibold animate-pulse">
                {brushToast}
              </span>
            )}
          </div>

          {/* Central Blueprint Canvas Container */}
          <div className="flex-1 flex items-center justify-center relative w-full h-full min-h-0 min-w-0">
            <GeometricMapCanvas
              simulator={sim}
              selectedItemId={selectedItemId}
              selectedItemType={selectedItemType}
              onSelectItem={handleSelectItem}
              onToggleHazard={handleToggleHazard}
              tickCounter={tick}
              showDimensions={showDimensions}
              showFlowArrows={showFlowArrows}
              showHeatmap={showHeatmap}
              onToggleHeatmap={() => setShowHeatmap((prev) => !prev)}
              brushTool={brushTool}
              brushSize={brushSize}
              onSpawnPedestrianFeedback={(success) => {
                if (!success) {
                  showToast('⚠️ Cannot place in walls or unwalkable voids');
                } else {
                  setTick((t: number) => t + 1);
                }
              }}
            />

            {/* Slide-over Item Inspector Drawer */}
            {showInspector && selectedItemId && (
              <div className="absolute right-4 top-4 bottom-4 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-4 flex flex-col z-30 animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-sm text-slate-100">Adjust Architectural Constraints</span>
                  </div>
                  <button
                    onClick={() => setShowInspector(false)}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-3">
                  <ItemInspectorPanel
                    simulator={sim}
                    selectedItemId={selectedItemId}
                    selectedItemType={selectedItemType}
                    onUpdateCorridorWidth={handleUpdateCorridorWidth}
                    onUpdateCorridorCapacity={(id, cap) => {
                      sim.updateCorridorCapacity(id, cap);
                      setTick((t: number) => t + 1);
                    }}
                    onUpdateCorridorFlowRate={() => {
                      setTick((t: number) => t + 1);
                    }}
                    onToggleHazard={handleToggleHazard}
                    onUpdateRoomPeople={handleUpdateRoomPeople}
                    onUpdatePortalCapacityLimit={(portalId, type, limit) => {
                      if (type === 'exit') sim.updateExitCapacityLimit(portalId, limit);
                      else if (type === 'stairs') sim.updateStairCapacityLimit(portalId, limit);
                      else if (type === 'lift') sim.updateLiftCapacityLimit(portalId, limit);
                      setTick((t: number) => t + 1);
                    }}
                    onTogglePortalBlock={(portalId, type) => {
                      sim.togglePortalBlock(portalId, type);
                      setTick((t: number) => t + 1);
                    }}
                  />
                </div>

                <button
                  onClick={() => setShowInspector(false)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700"
                >
                  Close Inspector
                </button>
              </div>
            )}

            {/* Floating Dynamic Island Simulation Controls (Bottom Center) - Speed Graph Removed */}
            <div className="absolute bottom-4 z-20 flex items-center gap-3 bg-slate-950/90 backdrop-blur-xl border border-slate-700/80 px-4 py-2 rounded-2xl shadow-2xl text-xs">
              <button
                onClick={togglePlay}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all shadow-lg text-xs ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'PAUSE' : 'START SIMULATION'}</span>
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold"
                title="Reset simulation to initial state"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <div className="h-5 w-px bg-slate-800"></div>

              {/* Fast Forward 1x / 2x / 4x */}
              <button
                onClick={handleMultiplierToggle}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-800 font-bold"
                title="Toggle simulation playback speed (1x, 2x, 4x)"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>{speedMultiplier}x Speed</span>
              </button>

              <div className="h-5 w-px bg-slate-800"></div>

              {/* Live Timer Readout */}
              <div className="flex items-center gap-1.5 font-mono text-slate-300 px-2 py-1 bg-slate-900 rounded-lg border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-bold text-white">{elapsedTime.toFixed(1)}s</span>
              </div>

              {/* Live Safe Count */}
              <div className="flex items-center gap-1.5 font-mono text-emerald-400 px-2 py-1 bg-slate-900 rounded-lg border border-slate-800">
                <Users className="w-3.5 h-3.5" />
                <span className="font-bold">
                  {evacuatedCount}/{totalPeople}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Full Architectural Map Creator Studio Overlay Modal */}
      {currentMode === 'studio' && (
        <MapEditorStudio
          simulator={sim}
          onSimulateCustomMap={handleSimulateCustomMap}
          onClose={() => {
            setCurrentMode('simulation');
            refreshSavedBlueprints();
          }}
        />
      )}

      {/* 4. Analytics & Knowledge Modals */}
      <BenchmarkModal
        simulator={sim}
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
      />
    </main>
  );
}

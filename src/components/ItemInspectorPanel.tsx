'use client';

import React from 'react';
import { GeometricBuildingSimulator } from '@/lib/geometricModel';
import {
  Flame,
  Ban,
  Maximize2,
  Users,
  Sliders,
  CheckCircle2,
  Gauge,
  AlertCircle,
  ArrowRight,
  Layers,
  Building,
  ShieldCheck,
  Lock,
  Unlock,
  Wind,
} from 'lucide-react';

interface ItemInspectorPanelProps {
  simulator: GeometricBuildingSimulator;
  selectedItemId: string | null;
  selectedItemType: 'room' | 'corridor' | 'exit' | 'stairs' | 'lift' | null;
  onUpdateCorridorWidth: (corridorId: string, width: number) => void;
  onUpdateCorridorCapacity: (corridorId: string, capacity: number | null) => void;
  onUpdateCorridorFlowRate: (corridorId: string, flow: number) => void;
  onToggleHazard: (corridorId: string, type: 'fire' | 'block' | 'smoke') => void;
  onUpdateRoomPeople: (roomId: string, count: number) => void;
  onUpdatePortalCapacityLimit?: (portalId: string, type: 'exit' | 'stairs' | 'lift', limit: number | null) => void;
  onTogglePortalBlock?: (portalId: string, type: 'exit' | 'stairs' | 'lift') => void;
}

export function ItemInspectorPanel({
  simulator,
  selectedItemId,
  selectedItemType,
  onUpdateCorridorWidth,
  onUpdateCorridorCapacity,
  onUpdateCorridorFlowRate,
  onToggleHazard,
  onUpdateRoomPeople,
  onUpdatePortalCapacityLimit,
  onTogglePortalBlock,
}: ItemInspectorPanelProps) {
  if (!selectedItemId || !selectedItemType) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <Sliders className="w-8 h-8 mb-2 text-slate-600 animate-pulse" />
        <p className="font-semibold text-slate-400 text-sm">No Item Selected</p>
        <p className="text-xs text-slate-500 max-w-[200px]">
          Click any room, corridor, exit door, stairwell, or elevator to inspect and configure constraints.
        </p>
      </div>
    );
  }

  // 1. If Exit Portal is Selected
  if (selectedItemType === 'exit') {
    const exit = simulator.exits.find((e) => e.id === selectedItemId);
    if (!exit) return null;

    const isSaturated = exit.maxCapacityLimit ? exit.evacuatedCount >= exit.maxCapacityLimit : false;
    const isClosed = exit.isBlocked || isSaturated;

    return (
      <div className="h-full flex flex-col p-1 space-y-4">
        {/* Header */}
        <div className="pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" /> EXIT PORTAL
            </span>
            <h3 className="font-bold text-slate-100 text-sm">{exit.label}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">{exit.name}</p>
        </div>

        {/* Live Evacuation Status */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-300">Evacuated Through Exit:</span>
            <span className="font-bold font-mono text-emerald-400 text-sm">
              {exit.evacuatedCount}{' '}
              <span className="text-slate-400 text-xs font-normal">
                / {exit.maxCapacityLimit ? `${exit.maxCapacityLimit} limit` : '∞ unlimited'}
              </span>
            </span>
          </div>

          {isClosed ? (
            <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <span>⛔ Exit Closed / Saturated!</span>
                <p className="text-[11px] font-normal text-rose-300/80 mt-0.5">
                  Capacity quota reached ({exit.evacuatedCount} evacuees). Door is now blocked. Remaining occupants dynamically reroute to alternate safe exits or stairs.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>✓ Portal Open &amp; Discharging</span>
            </div>
          )}
        </div>

        {/* Evacuee Capacity Quota Config */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              Max Evacuee Quota (Before Blocked):
            </span>
            <span className="font-bold font-mono text-sky-400 text-sm">
              {exit.maxCapacityLimit ? `${exit.maxCapacityLimit} people` : 'Unlimited (∞)'}
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={exit.maxCapacityLimit || 100}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (onUpdatePortalCapacityLimit) onUpdatePortalCapacityLimit(exit.id, 'exit', val);
            }}
            className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
          />

          {/* Quick Quota Buttons */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 text-xs font-semibold">
            <button
              onClick={() => onUpdatePortalCapacityLimit && onUpdatePortalCapacityLimit(exit.id, 'exit', null)}
              className={`py-1 rounded-lg border transition-all ${
                !exit.maxCapacityLimit
                  ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              No Limit (∞)
            </button>
            {[15, 30, 50].map((preset) => (
              <button
                key={preset}
                onClick={() => onUpdatePortalCapacityLimit && onUpdatePortalCapacityLimit(exit.id, 'exit', preset)}
                className={`py-1 rounded-lg border transition-all ${
                  exit.maxCapacityLimit === preset
                    ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {preset}p Limit
              </button>
            ))}
          </div>
        </div>

        {/* Lock / Block Exit Toggle */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => onTogglePortalBlock && onTogglePortalBlock(exit.id, 'exit')}
            className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
              exit.isBlocked
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg'
                : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/60'
            }`}
          >
            {exit.isBlocked ? (
              <>
                <Unlock className="w-4 h-4" /> Unblock &amp; Reopen Exit Door
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Manually Lock &amp; Block Exit
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 2. If Emergency Stairs is Selected
  if (selectedItemType === 'stairs') {
    const stair = simulator.stairs.find((s) => s.id === selectedItemId);
    if (!stair) return null;

    const isSaturated = stair.maxCapacityLimit ? stair.evacuatedCount >= stair.maxCapacityLimit : false;
    const isClosed = stair.isBlocked || isSaturated;

    return (
      <div className="h-full flex flex-col p-1 space-y-4">
        {/* Header */}
        <div className="pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 font-bold text-xs flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> FIRE STAIRCASE
            </span>
            <h3 className="font-bold text-slate-100 text-sm">{stair.label}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">{stair.name}</p>
        </div>

        {/* Live Evacuation Status */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-300">Evacuated to Lower Floor:</span>
            <span className="font-bold font-mono text-sky-400 text-sm">
              {stair.evacuatedCount}{' '}
              <span className="text-slate-400 text-xs font-normal">
                / {stair.maxCapacityLimit ? `${stair.maxCapacityLimit} limit` : '∞ unlimited'}
              </span>
            </span>
          </div>

          {isClosed ? (
            <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <span>⛔ Stairwell Closed / Quota Full!</span>
                <p className="text-[11px] font-normal text-rose-300/80 mt-0.5">
                  Capacity quota reached ({stair.evacuatedCount} evacuees). Stairwell door is locked. Remaining occupants reroute to alternate stairs or exits.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-sky-950/50 border border-sky-800/60 text-sky-300 font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>✓ Stairs Active (0.65x walking speed)</span>
            </div>
          )}
        </div>

        {/* Capacity Quota Setting */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              Stairwell Capacity Quota:
            </span>
            <span className="font-bold font-mono text-sky-400 text-sm">
              {stair.maxCapacityLimit ? `${stair.maxCapacityLimit} people` : 'Unlimited (∞)'}
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={stair.maxCapacityLimit || 100}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (onUpdatePortalCapacityLimit) onUpdatePortalCapacityLimit(stair.id, 'stairs', val);
            }}
            className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
          />

          <div className="grid grid-cols-4 gap-1.5 pt-1 text-xs font-semibold">
            <button
              onClick={() => onUpdatePortalCapacityLimit && onUpdatePortalCapacityLimit(stair.id, 'stairs', null)}
              className={`py-1 rounded-lg border transition-all ${
                !stair.maxCapacityLimit
                  ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              No Limit (∞)
            </button>
            {[15, 30, 45].map((preset) => (
              <button
                key={preset}
                onClick={() => onUpdatePortalCapacityLimit && onUpdatePortalCapacityLimit(stair.id, 'stairs', preset)}
                className={`py-1 rounded-lg border transition-all ${
                  stair.maxCapacityLimit === preset
                    ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {preset}p Limit
              </button>
            ))}
          </div>
        </div>

        {/* Lock Stairwell */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => onTogglePortalBlock && onTogglePortalBlock(stair.id, 'stairs')}
            className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
              stair.isBlocked
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg'
                : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/60'
            }`}
          >
            {stair.isBlocked ? (
              <>
                <Unlock className="w-4 h-4" /> Reopen Stairwell
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Block Stairwell (Smoke / Jam)
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 3. If Elevator Shaft is Selected
  if (selectedItemType === 'lift') {
    const lift = simulator.lifts.find((l) => l.id === selectedItemId);
    if (!lift) return null;

    const isSaturated = lift.maxCapacityLimit ? lift.evacuatedCount >= lift.maxCapacityLimit : false;
    const isClosed = lift.isOutOfService || isSaturated;

    return (
      <div className="h-full flex flex-col p-1 space-y-4">
        {/* Header */}
        <div className="pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs flex items-center gap-1">
              <Building className="w-3.5 h-3.5" /> ELEVATOR SHAFT
            </span>
            <h3 className="font-bold text-slate-100 text-sm">{lift.label}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">{lift.name}</p>
        </div>

        {/* Live Evacuation Status */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-300">Evacuated via Elevator:</span>
            <span className="font-bold font-mono text-amber-400 text-sm">
              {lift.evacuatedCount}{' '}
              <span className="text-slate-400 text-xs font-normal">
                / {lift.maxCapacityLimit ? `${lift.maxCapacityLimit} limit` : '∞ unlimited'}
              </span>
            </span>
          </div>

          {isClosed ? (
            <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <span>⛔ Elevator Out of Service / Saturated!</span>
                <p className="text-[11px] font-normal text-rose-300/80 mt-0.5">
                  Elevator grounded or capacity quota reached ({lift.evacuatedCount} evacuees). Occupants reroute to stairs and ground exits.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>✓ Evacuation Elevator In Service</span>
            </div>
          )}
        </div>

        {/* Capacity Quota Setting */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              Elevator Quota Limit:
            </span>
            <span className="font-bold font-mono text-amber-400 text-sm">
              {lift.maxCapacityLimit ? `${lift.maxCapacityLimit} people` : 'Unlimited (∞)'}
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={lift.maxCapacityLimit || 60}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (onUpdatePortalCapacityLimit) onUpdatePortalCapacityLimit(lift.id, 'lift', val);
            }}
            className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
          />

          <div className="grid grid-cols-4 gap-1.5 pt-1 text-xs font-semibold">
            <button
              onClick={() => onUpdatePortalCapacityLimit && onUpdatePortalCapacityLimit(lift.id, 'lift', null)}
              className={`py-1 rounded-lg border transition-all ${
                !lift.maxCapacityLimit
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              No Limit (∞)
            </button>
            {[10, 20, 30].map((preset) => (
              <button
                key={preset}
                onClick={() => onUpdatePortalCapacityLimit && onUpdatePortalCapacityLimit(lift.id, 'lift', preset)}
                className={`py-1 rounded-lg border transition-all ${
                  lift.maxCapacityLimit === preset
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {preset}p Limit
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Elevator Service */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => onTogglePortalBlock && onTogglePortalBlock(lift.id, 'lift')}
            className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
              lift.isOutOfService
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg'
                : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/60'
            }`}
          >
            {lift.isOutOfService ? (
              <>
                <Unlock className="w-4 h-4" /> Enable Elevator for Evacuation
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Ground Elevator (Emergency Recall)
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 4. If Room is Selected
  if (selectedItemType === 'room') {
    const room = simulator.rooms.find((r) => r.id === selectedItemId);
    if (!room) return null;

    return (
      <div className="h-full flex flex-col p-1 space-y-4">
        {/* Header */}
        <div className="pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 font-bold text-xs">
              ROOM
            </span>
            <h3 className="font-bold text-slate-100 text-sm">{room.label}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">{room.name}</p>
        </div>

        {/* Evacuee Count Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              People Inside Room:
            </span>
            <span className="font-bold font-mono text-sky-400 text-sm">
              {room.peopleCount} <span className="font-normal text-slate-400 text-xs">people</span>
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={room.peopleCount}
            onChange={(e) => onUpdateRoomPeople(room.id, parseInt(e.target.value) || 0)}
            className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
          />

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[0, 25, 50, 100].map((preset) => (
              <button
                key={preset}
                onClick={() => onUpdateRoomPeople(room.id, preset)}
                className={`py-1 text-xs font-semibold rounded-lg border transition-all ${
                  room.peopleCount === preset
                    ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {preset === 0 ? 'Empty' : `${preset}p`}
              </button>
            ))}
          </div>
        </div>

        {/* Room Specific Walking Speed Preset */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            Room Walking Speed Override:
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs font-medium">
            <button
              onClick={() => {
                room.speedOverride = 0.8;
                simulator.spawnPeopleFromRooms();
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-center"
            >
              🚶 Slow (0.8 m/s)
            </button>
            <button
              onClick={() => {
                room.speedOverride = 1.4;
                simulator.spawnPeopleFromRooms();
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-center"
            >
              🚶‍♂️ Normal (1.4 m/s)
            </button>
            <button
              onClick={() => {
                room.speedOverride = 2.2;
                simulator.spawnPeopleFromRooms();
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-center"
            >
              🏃 Run (2.2 m/s)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. If Corridor is Selected
  const corridor = simulator.corridors.find((c) => c.id === selectedItemId);
  if (!corridor) return null;

  return (
    <div className="h-full flex flex-col p-1 space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs">
            {corridor.isStairs ? 'STAIRS' : 'HALLWAY'}
          </span>
          <h3 className="font-bold text-slate-100 text-sm">{corridor.label}</h3>
        </div>
        <p className="text-xs text-slate-400 mt-1">{corridor.name}</p>
      </div>

      {/* Corridor Maximum Capacity Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            Max Capacity (Holding Limit):
          </span>
          <span className="font-bold font-mono text-sm">
            {corridor.capacity === null || corridor.capacity === undefined ? (
              <span className="text-emerald-400">∞ No Limit (Infinite)</span>
            ) : corridor.capacity === 0 ? (
              <span className="text-rose-400">0 (Zero Capacity Choke)</span>
            ) : (
              <span className="text-sky-400">{corridor.capacity} <span className="font-normal text-slate-400 text-xs">people max</span></span>
            )}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="120"
          step="5"
          value={corridor.capacity === null || corridor.capacity === undefined ? 120 : corridor.capacity}
          onChange={(e) => onUpdateCorridorCapacity(corridor.id, parseInt(e.target.value))}
          className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
        />

        <div className="grid grid-cols-5 gap-1 pt-1 text-[10px] font-semibold">
          <button
            onClick={() => onUpdateCorridorCapacity(corridor.id, 0)}
            className={`py-1 rounded-lg border transition-colors ${
              corridor.capacity === 0
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="0 Capacity: Immediate bottleneck crush"
          >
            0 (Choke)
          </button>
          <button
            onClick={() => onUpdateCorridorCapacity(corridor.id, 15)}
            className={`py-1 rounded-lg border transition-colors ${
              corridor.capacity === 15
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 font-bold'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            15p
          </button>
          <button
            onClick={() => onUpdateCorridorCapacity(corridor.id, 30)}
            className={`py-1 rounded-lg border transition-colors ${
              corridor.capacity === 30
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 font-bold'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            30p
          </button>
          <button
            onClick={() => onUpdateCorridorCapacity(corridor.id, 60)}
            className={`py-1 rounded-lg border transition-colors ${
              corridor.capacity === 60
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 font-bold'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            60p
          </button>
          <button
            onClick={() => onUpdateCorridorCapacity(corridor.id, null)}
            className={`py-1 rounded-lg border transition-colors ${
              corridor.capacity === null || corridor.capacity === undefined
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Infinite Capacity: No bottlenecks"
          >
            ∞ No Limit
          </button>
        </div>
      </div>

      {/* Real-Time Bottleneck Status Meter */}
      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-300">Live Occupancy vs Capacity:</span>
          <span className="font-mono font-bold text-slate-200">
            {corridor.capacity === null || corridor.capacity === undefined ? (
              <span className="text-emerald-400">{corridor.currentOccupants} / ∞ (No Limit)</span>
            ) : corridor.capacity === 0 ? (
              <span className="text-rose-400">{corridor.currentOccupants} / 0 (Choked)</span>
            ) : (
              <span>
                {corridor.currentOccupants} / {corridor.capacity} people ({Math.round((corridor.currentOccupants / (corridor.capacity || 1)) * 100)}%)
              </span>
            )}
          </span>
        </div>

        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              corridor.capacity !== null && corridor.capacity !== undefined && (corridor.capacity === 0 ? corridor.currentOccupants > 0 : corridor.currentOccupants > corridor.capacity)
                ? 'bg-rose-500'
                : 'bg-emerald-400'
            }`}
            style={{
              width:
                corridor.capacity === null || corridor.capacity === undefined
                  ? '0%'
                  : corridor.capacity === 0
                  ? corridor.currentOccupants > 0
                    ? '100%'
                    : '0%'
                  : `${Math.min(100, Math.round((corridor.currentOccupants / (corridor.capacity || 1)) * 100))}%`,
            }}
          />
        </div>

        {corridor.capacity === null || corridor.capacity === undefined ? (
          <div className="text-emerald-400 font-medium flex items-start gap-1.5 pt-1">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">✓ Infinite Capacity • Free Flowing</span>
              <p className="text-[11px] font-normal text-emerald-300/80 mt-0.5 leading-tight">
                No capacity limit enforced. All occupants traverse this hallway at normal free-flow speed.
              </p>
            </div>
          </div>
        ) : corridor.capacity === 0 && corridor.currentOccupants > 0 ? (
          <div className="text-rose-400 font-bold flex items-start gap-1.5 pt-1">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span>⚠️ Zero Capacity Choke! Max Bottleneck Active</span>
              <p className="text-[11px] font-normal text-rose-300/80 mt-0.5 leading-tight">
                Capacity set to 0. All {corridor.currentOccupants} occupants in this corridor experience forced crawl congestion.
              </p>
            </div>
          </div>
        ) : corridor.currentOccupants > (corridor.capacity || 0) ? (
          <div className="text-rose-400 font-bold flex items-start gap-1.5 pt-1">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span>⚠️ Bottleneck Active! Over 100% Capacity</span>
              <p className="text-[11px] font-normal text-rose-300/80 mt-0.5 leading-tight">
                Capacity exceeded by {corridor.currentQueue} people! Occupants slow down proportionally until density eases below {corridor.capacity} people.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-emerald-400 font-medium flex items-start gap-1.5 pt-1">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">✓ Free Flowing • Normal Selected Speed</span>
              <p className="text-[11px] font-normal text-emerald-300/80 mt-0.5 leading-tight">
                Within capacity limit ({corridor.currentOccupants} &le; {corridor.capacity}). All occupants walk at normal speed.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hazard Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="text-xs font-semibold text-slate-400">Emergency Disasters &amp; Blockages:</div>
        <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
          <button
            onClick={() => onToggleHazard(corridor.id, 'fire')}
            className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
              corridor.hasFire
                ? 'bg-rose-600 text-white border-rose-500 shadow-lg'
                : 'bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 border-rose-800/60'
            }`}
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-[10px]">{corridor.hasFire ? 'Extinguish' : 'Fire 🔥'}</span>
          </button>

          <button
            onClick={() => onToggleHazard(corridor.id, 'smoke')}
            className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
              corridor.hasSmoke
                ? 'bg-slate-600 text-white border-slate-400 shadow-lg'
                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700/60'
            }`}
          >
            <Wind className="w-4 h-4 text-slate-300" />
            <span className="text-[10px]">{corridor.hasSmoke ? 'Clear Smoke' : 'Smoke 💨'}</span>
          </button>

          <button
            onClick={() => onToggleHazard(corridor.id, 'block')}
            className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
              corridor.isBlocked
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg'
                : 'bg-amber-950/30 hover:bg-amber-950/60 text-amber-300 border-amber-800/60'
            }`}
          >
            <Ban className="w-4 h-4 text-amber-400" />
            <span className="text-[10px]">{corridor.isBlocked ? 'Clear Path' : 'Debris 🚧'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
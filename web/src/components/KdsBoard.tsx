import React, { useState, useMemo } from 'react';
import { Ticket, TicketStatus, Recipe } from '../types/index.js';
import { TicketCard } from './TicketCard.js';
import {
  Layers,
  Flame,
  CheckCircle,
  Inbox,
  LayoutGrid,
  Search,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';
import { kitchenAudio } from '../utils/kitchenAudio.js';

interface KdsBoardProps {
  tickets: Ticket[];
  onUpdateStatus: (id: string, status: TicketStatus) => void;
  updatingTicketId?: string | null;
  recipes?: Recipe[];
}

// Compute average wait time in mm:ss format
function calculateAverageWaitTime(ticketList: Ticket[]): string {
  if (ticketList.length === 0) return '00:00';
  const now = Date.now();
  let totalSecs = 0;

  for (const t of ticketList) {
    const start = new Date(t.created_at).getTime();
    const end = t.completed_at ? new Date(t.completed_at).getTime() : now;
    totalSecs += Math.max(0, Math.floor((end - start) / 1000));
  }

  const avgSecs = Math.floor(totalSecs / ticketList.length);
  const mins = Math.floor(avgSecs / 60);
  const secs = avgSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const KdsBoard: React.FC<KdsBoardProps> = ({
  tickets,
  onUpdateStatus,
  updatingTicketId,
  recipes = [],
}) => {
  const [mobileColumnFilter, setMobileColumnFilter] = useState<'ALL' | 'QUEUE' | 'FIRING' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCompactDensity, setIsCompactDensity] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => kitchenAudio.isMuted());

  // Recipe lookup map for O(1) metadata access (BOM ingredients, prep times, pricing)
  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes.forEach((r) => {
      if (r.id) map.set(r.id, r);
      if (r.menu_item_name) map.set(r.menu_item_name.toLowerCase(), r);
      if (r.name) map.set(r.name.toLowerCase(), r);
    });
    return map;
  }, [recipes]);

  // Handle Audio toggle
  const toggleAudio = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    kitchenAudio.setMuted(nextMuted);
    if (!nextMuted) {
      kitchenAudio.playFire();
    }
  };

  // Filter tickets by search query (Table #, Ticket ID, Dish Name)
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase().trim();

    return tickets.filter((t) => {
      const matchId = t.id.toLowerCase().includes(q);
      const matchTable = `table ${t.table_number || 1}`.includes(q) || `t-${t.table_number || 1}`.includes(q) || String(t.table_number).includes(q);
      const matchRecipe = (t.recipe_name || '').toLowerCase().includes(q);
      const matchStation = (t.station || '').toLowerCase().includes(q);
      const matchNotes = (t.notes || '').toLowerCase().includes(q);
      return matchId || matchTable || matchRecipe || matchStation || matchNotes;
    });
  }, [tickets, searchQuery]);

  // Split into columns
  const queueTickets = filteredTickets.filter((t) => t.status === 'QUEUE');
  const firingTickets = filteredTickets.filter((t) => t.status === 'FIRING');
  const completedTickets = filteredTickets
    .filter((t) => t.status === 'COMPLETED')
    .sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime())
    .slice(0, 18);

  // Column performance metrics
  const queueAvgWait = useMemo(() => calculateAverageWaitTime(queueTickets), [queueTickets]);
  const firingAvgWait = useMemo(() => calculateAverageWaitTime(firingTickets), [firingTickets]);

  // Overdue count in active tickets
  const now = Date.now();
  const overdueCount = useMemo(() => {
    return firingTickets.filter((t) => {
      const start = new Date(t.created_at).getTime();
      const elapsedSecs = Math.floor((now - start) / 1000);
      const targetSecs = (t.prep_time_minutes || 15) * 60;
      return elapsedSecs > targetSecs;
    }).length;
  }, [firingTickets, now]);

  const showQueue = mobileColumnFilter === 'ALL' || mobileColumnFilter === 'QUEUE';
  const showFiring = mobileColumnFilter === 'ALL' || mobileColumnFilter === 'FIRING';
  const showCompleted = mobileColumnFilter === 'ALL' || mobileColumnFilter === 'COMPLETED';

  return (
    <div className="space-y-3.5">
      {/* KDS Control Toolbar: Search & View Options */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-xl glass-panel border border-white/10 backdrop-blur-xl">
        {/* Left: Quick Search Filter */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by Table, Item, #ID, or Notes..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg glass-input border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Board Utilities */}
        <div className="flex items-center space-x-2 shrink-0 justify-end">
          {/* Overdue Warning Pill */}
          {overdueCount > 0 && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.25)]">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>{overdueCount} Overdue</span>
            </div>
          )}

          {/* Density Toggle (Compact vs Comfortable) */}
          <button
            type="button"
            onClick={() => setIsCompactDensity(!isCompactDensity)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isCompactDensity
                ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 shadow-sm'
                : 'bg-white/5 text-slate-300 hover:text-white border-white/10 hover:bg-white/10'
            }`}
            title="Toggle card layout density"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isCompactDensity ? 'Compact' : 'Comfortable'}</span>
          </button>

          {/* Kitchen Audio Chime Toggle */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              !isMuted
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-glow-amber'
                : 'bg-white/5 text-slate-400 hover:text-slate-200 border-white/10'
            }`}
            title={isMuted ? 'Unmute kitchen audio chime' : 'Mute kitchen audio chime'}
          >
            {!isMuted ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{!isMuted ? 'Sound ON' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Column Selector Tabs */}
      <div className="flex md:hidden items-center justify-between p-1 rounded-xl glass-panel border border-white/10 gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setMobileColumnFilter('ALL')}
          className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
            mobileColumnFilter === 'ALL'
              ? 'bg-slate-700/80 text-white border border-white/20 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="w-3 h-3" />
          <span>All</span>
          <span className="text-[10px] opacity-75">({filteredTickets.length})</span>
        </button>

        <button
          onClick={() => setMobileColumnFilter('QUEUE')}
          className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
            mobileColumnFilter === 'QUEUE'
              ? 'bg-sky-500/25 text-sky-300 border border-sky-400/40 shadow-glow-sky'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3 h-3 text-sky-400" />
          <span>Queue</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800/80">
            {queueTickets.length}
          </span>
        </button>

        <button
          onClick={() => setMobileColumnFilter('FIRING')}
          className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
            mobileColumnFilter === 'FIRING'
              ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40 shadow-glow-amber'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3 h-3 text-amber-400" />
          <span>Firing</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/80">
            {firingTickets.length}
          </span>
        </button>

        <button
          onClick={() => setMobileColumnFilter('COMPLETED')}
          className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
            mobileColumnFilter === 'COMPLETED'
              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 shadow-glow-emerald'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          <span>Done</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/80">
            {completedTickets.length}
          </span>
        </button>
      </div>

      {/* Main KDS Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[calc(100vh-14.5rem)] min-h-[520px]">
        {/* Column 1: QUEUE (Incoming Orders) */}
        {showQueue && (
          <div className="flex flex-col glass-panel rounded-xl border border-sky-500/20 overflow-hidden shadow-glass transition-all">
            {/* Column Header */}
            <div className="p-3 border-b border-sky-500/20 flex items-center justify-between bg-sky-950/30 backdrop-blur-xl">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-sky-200">
                    Queue / Pending
                  </h3>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Avg wait: {queueAvgWait}</span>
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-sky-950/90 text-sky-300 border border-sky-500/40 shadow-sm">
                {queueTickets.length}
              </span>
            </div>

            {/* Column Tickets Scroll Area */}
            <div
              className={`flex-1 p-2.5 overflow-y-auto ${
                isCompactDensity ? 'space-y-2' : 'space-y-2.5'
              }`}
            >
              {queueTickets.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-2 p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                    <Inbox className="w-5 h-5 opacity-40 text-sky-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-300">Queue is Clear</p>
                  <p className="text-[11px] text-slate-500 max-w-[200px]">
                    Incoming orders will appear here automatically in real time.
                  </p>
                </div>
              ) : (
                queueTickets.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onUpdateStatus={onUpdateStatus}
                    isUpdating={updatingTicketId === t.id}
                    recipe={recipeMap.get(t.recipe_id) || recipeMap.get((t.recipe_name || '').toLowerCase())}
                    isCompactMode={isCompactDensity}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Column 2: FIRING (Active on the Line) */}
        {showFiring && (
          <div className="flex flex-col glass-panel rounded-xl border border-amber-500/30 overflow-hidden shadow-glass ring-1 ring-amber-500/25 transition-all">
            {/* Column Header */}
            <div className="p-3 border-b border-amber-500/30 flex items-center justify-between bg-amber-950/30 backdrop-blur-xl">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-glow-amber">
                  <Flame className="w-3.5 h-3.5 fill-amber-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-amber-300">
                    Firing / Cooking
                  </h3>
                  <div className="flex items-center space-x-1.5 text-[10px] text-amber-200/70 font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Avg fire: {firingAvgWait}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                {overdueCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    {overdueCount} late
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-950/90 text-amber-300 border border-amber-500/50 shadow-sm animate-pulse">
                  {firingTickets.length}
                </span>
              </div>
            </div>

            {/* Column Tickets Scroll Area */}
            <div
              className={`flex-1 p-2.5 overflow-y-auto ${
                isCompactDensity ? 'space-y-2' : 'space-y-2.5'
              }`}
            >
              {firingTickets.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-2 p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                    <Flame className="w-5 h-5 opacity-40 text-amber-500" />
                  </div>
                  <p className="text-xs font-medium text-slate-300">Stations Idle</p>
                  <p className="text-[11px] text-slate-500 max-w-[200px]">
                    Fire tickets from queue to assign to kitchen line stations.
                  </p>
                </div>
              ) : (
                firingTickets.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onUpdateStatus={onUpdateStatus}
                    isUpdating={updatingTicketId === t.id}
                    recipe={recipeMap.get(t.recipe_id) || recipeMap.get((t.recipe_name || '').toLowerCase())}
                    isCompactMode={isCompactDensity}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Column 3: COMPLETED / EXPEDITE */}
        {showCompleted && (
          <div className="flex flex-col glass-panel rounded-xl border border-emerald-500/20 overflow-hidden shadow-glass transition-all">
            {/* Column Header */}
            <div className="p-3 border-b border-emerald-500/20 flex items-center justify-between bg-emerald-950/20 backdrop-blur-xl">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-300">
                    Expedite / Ready
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Recent Fulfilled ({completedTickets.length})
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 shadow-sm">
                {completedTickets.length}
              </span>
            </div>

            {/* Column Tickets Scroll Area */}
            <div
              className={`flex-1 p-2.5 overflow-y-auto ${
                isCompactDensity ? 'space-y-2' : 'space-y-2.5'
              }`}
            >
              {completedTickets.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-2 p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                    <CheckCircle className="w-5 h-5 opacity-40 text-emerald-500" />
                  </div>
                  <p className="text-xs font-medium text-slate-300">No Orders Fulfilled Yet</p>
                  <p className="text-[11px] text-slate-500 max-w-[200px]">
                    Completed dishes ready for table service will list here.
                  </p>
                </div>
              ) : (
                completedTickets.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onUpdateStatus={onUpdateStatus}
                    isUpdating={updatingTicketId === t.id}
                    recipe={recipeMap.get(t.recipe_id) || recipeMap.get((t.recipe_name || '').toLowerCase())}
                    isCompactMode={isCompactDensity}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

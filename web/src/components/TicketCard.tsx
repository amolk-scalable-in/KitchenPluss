import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, TicketStatus, Recipe } from '../types/index.js';
import {
  Clock,
  Flame,
  CheckCircle,
  Ban,
  ChefHat,
  Utensils,
  UtensilsCrossed,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  RotateCcw,
  Zap,
  Sparkles,
  Timer as TimerIcon,
} from 'lucide-react';
import { kitchenAudio } from '../utils/kitchenAudio.js';

interface TicketCardProps {
  ticket: Ticket;
  onUpdateStatus: (id: string, status: TicketStatus) => void;
  isUpdating?: boolean;
  recipe?: Recipe;
  isCompactMode?: boolean;
}

// Helper to determine station icon and badge style
function getStationStyle(stationName?: string) {
  const s = (stationName || '').toLowerCase();
  if (s.includes('grill') || s.includes('tandoor') || s.includes('bbq')) {
    return {
      icon: Flame,
      color: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
      label: stationName || 'Grill',
    };
  }
  if (s.includes('sauté') || s.includes('saute') || s.includes('curry') || s.includes('wok')) {
    return {
      icon: UtensilsCrossed,
      color: 'text-sky-300 bg-sky-950/60 border-sky-500/40',
      label: stationName || 'Sauté',
    };
  }
  if (s.includes('oven') || s.includes('bakery') || s.includes('pizza') || s.includes('roast')) {
    return {
      icon: Zap,
      color: 'text-purple-300 bg-purple-950/60 border-purple-500/40',
      label: stationName || 'Oven',
    };
  }
  if (s.includes('pantry') || s.includes('salad') || s.includes('cold') || s.includes('dessert')) {
    return {
      icon: Sparkles,
      color: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40',
      label: stationName || 'Pantry',
    };
  }
  return {
    icon: ChefHat,
    color: 'text-indigo-300 bg-indigo-950/60 border-indigo-500/40',
    label: stationName || 'Kitchen',
  };
}

// Extract culinary alert tags from notes (e.g. Allergy, Spicy, No Onion, etc.)
function extractSpecialTags(notes?: string | null): { tags: string[]; isUrgent: boolean } {
  if (!notes) return { tags: [], isUrgent: false };
  const lower = notes.toLowerCase();
  const tags: string[] = [];
  let isUrgent = false;

  if (lower.includes('allergy') || lower.includes('allergic') || lower.includes('nut free')) {
    tags.push('⚠️ ALLERGY');
    isUrgent = true;
  }
  if (lower.includes('rush') || lower.includes('urgent') || lower.includes('vip') || lower.includes('asap')) {
    tags.push('⚡ RUSH / VIP');
    isUrgent = true;
  }
  if (lower.includes('spicy') || lower.includes('extra spicy') || lower.includes('hot')) {
    tags.push('🔥 EXTRA SPICY');
  }
  if (lower.includes('no onion') || lower.includes('no garlic') || lower.includes('jain')) {
    tags.push('🚫 NO ALLIUM');
  }
  if (lower.includes('gluten free') || lower.includes('gf')) {
    tags.push('🌱 GLUTEN-FREE');
  }
  if (lower.includes('vegan') || lower.includes('dairy free')) {
    tags.push('🥑 VEGAN / DF');
  }
  if (lower.includes('takeaway') || lower.includes('to go') || lower.includes('pack')) {
    tags.push('📦 TAKEAWAY');
  }

  return { tags, isUrgent };
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onUpdateStatus,
  isUpdating = false,
  recipe,
  isCompactMode = false,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [elapsedDisplay, setElapsedDisplay] = useState<string>('00:00');
  const [isBomOpen, setIsBomOpen] = useState<boolean>(false);

  // Target cook time (defaults to 15m if not specified)
  const targetPrepMins = ticket.prep_time_minutes || recipe?.prep_time_minutes || 15;
  const targetPrepSecs = targetPrepMins * 60;

  // Real-time elapsed clock
  useEffect(() => {
    const updateTimer = () => {
      const start = new Date(ticket.created_at).getTime();
      const end = ticket.completed_at ? new Date(ticket.completed_at).getTime() : Date.now();
      const diffSecs = Math.max(0, Math.floor((end - start) / 1000));

      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      setElapsedSeconds(diffSecs);
      setElapsedDisplay(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    updateTimer();
    if (!ticket.completed_at) {
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [ticket.created_at, ticket.completed_at]);

  // Derived wait metrics
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const progressRatio = Math.min(1.2, elapsedSeconds / (targetPrepSecs || 1));
  const progressPercent = Math.min(100, Math.round(progressRatio * 100));

  const isOverdue = !ticket.completed_at && elapsedSeconds > targetPrepSecs;
  const isApproaching = !ticket.completed_at && !isOverdue && progressRatio >= 0.65;

  const { tags: specialTags, isUrgent: isNotesUrgent } = useMemo(
    () => extractSpecialTags(ticket.notes),
    [ticket.notes]
  );
  const isPriorityOrder = isNotesUrgent || isOverdue;

  // Status-based styling
  const stationMeta = getStationStyle(ticket.station);
  const StationIcon = stationMeta.icon;
  const shortId = ticket.id.slice(0, 6).toUpperCase();

  // Resolved ingredients list
  const ingredientsList = ticket.ingredients || recipe?.ingredients || [];

  // Pacing bar color
  let pacingColor = 'bg-emerald-400';
  if (isOverdue) pacingColor = 'bg-rose-500 animate-pulse';
  else if (isApproaching) pacingColor = 'bg-amber-400';

  // Sound triggers
  const handleFire = () => {
    kitchenAudio.playFire();
    onUpdateStatus(ticket.id, 'FIRING');
  };

  const handleComplete = () => {
    kitchenAudio.playComplete();
    onUpdateStatus(ticket.id, 'COMPLETED');
  };

  const handleRecall = () => {
    onUpdateStatus(ticket.id, 'QUEUE');
  };

  const handleReopen = () => {
    kitchenAudio.playFire();
    onUpdateStatus(ticket.id, 'FIRING');
  };

  // Card outline and glow based on status & urgency
  let cardBorderClass = 'border-white/10 hover:border-white/20 bg-slate-900/80';
  if (ticket.status === 'FIRING') {
    cardBorderClass = isOverdue
      ? 'border-rose-500/80 bg-slate-900/90 shadow-[0_0_20px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/50'
      : 'border-amber-500/60 bg-slate-900/85 shadow-[0_0_18px_rgba(245,158,11,0.18)] ring-1 ring-amber-500/30';
  } else if (ticket.status === 'COMPLETED') {
    cardBorderClass = 'border-emerald-500/30 bg-slate-950/60 opacity-85 hover:opacity-100';
  } else if (isOverdue) {
    cardBorderClass = 'border-rose-500/80 bg-slate-900/90 shadow-[0_0_18px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/40';
  }

  // Timer pill colors
  let timerBadgeColor = 'bg-slate-800/80 text-slate-300 border-slate-700/80';
  if (!ticket.completed_at) {
    if (isOverdue) {
      timerBadgeColor = 'bg-rose-950/90 text-rose-200 border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse';
    } else if (isApproaching) {
      timerBadgeColor = 'bg-amber-950/80 text-amber-200 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.2)]';
    } else {
      timerBadgeColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
    }
  }

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 backdrop-blur-xl flex flex-col justify-between overflow-hidden shadow-glass ${cardBorderClass} ${
        isCompactMode ? 'p-2.5 space-y-2' : 'p-3 space-y-2.5'
      }`}
    >
      {/* 1. Dynamic Top Pacing Gauge Bar (2.5px micro-meter) */}
      {!ticket.completed_at && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-800/80 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${pacingColor}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* 2. Top Header Metadata */}
      <div>
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          {/* Left: ID & Table */}
          <div className="flex items-center space-x-1.5">
            <span className="font-mono text-[11px] font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 shadow-sm tracking-tight">
              #{shortId}
            </span>

            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-200 bg-slate-800/90 px-2 py-0.5 rounded-md border border-white/10">
              <Utensils className="w-2.5 h-2.5 text-slate-400" />
              <span>T-{ticket.table_number || 1}</span>
            </span>

            {isPriorityOrder && (
              <span className="inline-flex items-center space-x-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded-md animate-pulse">
                <Zap className="w-2.5 h-2.5 text-rose-400" />
                <span>RUSH</span>
              </span>
            )}
          </div>

          {/* Right: Dynamic Pace Timer */}
          <div
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border backdrop-blur-md tabular-numbers shadow-sm ${timerBadgeColor}`}
            title={`Elapsed: ${elapsedDisplay} | Target: ${targetPrepMins}m`}
          >
            <Clock className="w-3 h-3 opacity-90" />
            <span>T+ {elapsedDisplay}</span>
            {!ticket.completed_at && (
              <span className="text-[9px] opacity-70 font-normal">/{targetPrepMins}m</span>
            )}
          </div>
        </div>

        {/* 3. Main Dish Title & Station Multiplier */}
        <div className="mt-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-1.5 flex-1 min-w-0">
              <span className="shrink-0 font-mono text-xs font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md shadow-sm">
                1x
              </span>
              <h4 className="text-[13px] font-bold text-white tracking-tight truncate leading-tight drop-shadow-sm group-hover:text-amber-100 transition-colors">
                {ticket.recipe_name || recipe?.name || 'Kitchen Dish'}
              </h4>
            </div>

            {/* Price Badge if available */}
            {(ticket.recipe_price || recipe?.price) && (
              <span className="shrink-0 text-[11px] font-mono font-medium text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                ₹{Number(ticket.recipe_price || recipe?.price).toFixed(0)}
              </span>
            )}
          </div>

          {/* Station & Prep Time Row */}
          <div className="flex items-center space-x-1.5 mt-1.5 flex-wrap gap-y-1">
            <span
              className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border backdrop-blur-md ${stationMeta.color}`}
            >
              <StationIcon className="w-2.5 h-2.5" />
              <span>{stationMeta.label}</span>
            </span>

            <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-slate-400 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">
              <TimerIcon className="w-2.5 h-2.5 text-slate-400" />
              <span>{targetPrepMins}m cook</span>
            </span>

            {/* BOM Ingredients Peek Toggle */}
            {ingredientsList.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBomOpen(!isBomOpen)}
                className={`inline-flex items-center space-x-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border transition-all ${
                  isBomOpen
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-slate-200 border-white/5 hover:border-white/15'
                }`}
              >
                <Layers className="w-2.5 h-2.5" />
                <span>{ingredientsList.length} BOM</span>
                {isBomOpen ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              </button>
            )}
          </div>
        </div>

        {/* 4. Special Culinary Tags & Notes */}
        {specialTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {specialTags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {ticket.notes && (
          <div className="mt-1.5 text-[11px] bg-amber-950/30 p-2 rounded-lg text-amber-200/90 border border-amber-500/25 backdrop-blur-md leading-relaxed flex items-start space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-amber-400 mr-1">Note:</span>
              <span>{ticket.notes}</span>
            </div>
          </div>
        )}

        {/* 5. Collapsible Recipe BOM Drawer */}
        {isBomOpen && ingredientsList.length > 0 && (
          <div className="mt-2 p-2 rounded-lg bg-slate-950/80 border border-white/10 text-[11px] space-y-1 animate-in fade-in duration-150">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between pb-1 border-b border-white/10">
              <span>Recipe Bill of Materials</span>
              <span className="font-mono text-[9px] text-sky-400">Station Prep</span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-1 scrollbar-none">
              {ingredientsList.map((ing, idx) => (
                <div key={idx} className="flex items-center justify-between text-slate-300 py-0.5">
                  <span className="truncate pr-2">{ing.ingredient_name || 'Ingredient'}</span>
                  <span className="font-mono text-sky-300 font-bold shrink-0">
                    {Number(ing.quantity_required).toFixed(Number.isInteger(Number(ing.quantity_required)) ? 0 : 2)}{' '}
                    {ing.unit || 'qty'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Compact Ergonomic Action Footer */}
      <div className="pt-2 border-t border-white/10">
        {ticket.status === 'QUEUE' && (
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handleFire}
              disabled={isUpdating}
              className="flex-1 h-9 flex items-center justify-center space-x-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-glow-amber transition-all duration-150 disabled:opacity-50"
            >
              <Flame className="w-3.5 h-3.5 fill-slate-950" />
              <span>Fire to Line</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(ticket.id, 'CANCELLED')}
              disabled={isUpdating}
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-white/5 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/40 transition-colors"
              title="Void / Cancel Ticket"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {ticket.status === 'FIRING' && (
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handleComplete}
              disabled={isUpdating}
              className="flex-1 h-9 flex items-center justify-center space-x-1.5 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.98] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-glow-emerald transition-all duration-150 disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Mark Done</span>
            </button>

            {/* Quick Recall back to Queue if fired by accident */}
            <button
              type="button"
              onClick={handleRecall}
              disabled={isUpdating}
              className="h-9 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[10px] font-semibold flex items-center space-x-1 transition-colors"
              title="Recall back to Queue"
            >
              <RotateCcw className="w-3 h-3 text-sky-400" />
              <span className="hidden sm:inline">Recall</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateStatus(ticket.id, 'CANCELLED')}
              disabled={isUpdating}
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-white/5 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/40 transition-colors"
              title="Void Ticket"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {ticket.status === 'COMPLETED' && (
          <div className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center space-x-1.5 text-emerald-300 font-semibold text-[11px]">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fulfilled</span>
              <span className="text-[10px] font-mono text-slate-400">
                ({elapsedDisplay})
              </span>
            </div>

            <button
              type="button"
              onClick={handleReopen}
              disabled={isUpdating}
              className="text-[10px] font-semibold text-slate-400 hover:text-amber-300 flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors"
              title="Reopen order back to firing"
            >
              <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
              <span>Reopen</span>
            </button>
          </div>
        )}

        {ticket.status === 'CANCELLED' && (
          <div className="flex items-center justify-between text-[11px] text-rose-400 font-medium py-0.5">
            <span>Voided / Cancelled</span>
            <button
              type="button"
              onClick={handleRecall}
              disabled={isUpdating}
              className="text-[10px] font-semibold text-slate-400 hover:text-white flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Restore</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

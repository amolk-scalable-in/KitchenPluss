import React, { useState } from 'react';
import { AiPrepSheetResponse, FoodCostSummary } from '../types/index.js';
import {
  Sparkles,
  RefreshCw,
  TrendingDown,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Calendar,
} from 'lucide-react';

interface AiPrepViewProps {
  prepSheet: AiPrepSheetResponse | null;
  foodCostSummaries: FoodCostSummary[];
  onRunOptimization: (dayOfWeek: string) => Promise<void>;
  onRefreshFoodCost: () => Promise<void>;
  isLoadingPrep?: boolean;
  isRefreshingCost?: boolean;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const AiPrepView: React.FC<AiPrepViewProps> = ({
  prepSheet,
  foodCostSummaries,
  onRunOptimization,
  onRefreshFoodCost,
  isLoadingPrep = false,
  isRefreshingCost = false,
}) => {
  const tomorrowDay = new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'long' });
  const [selectedDay, setSelectedDay] = useState<string>(tomorrowDay);
  const [expandedReasoning, setExpandedReasoning] = useState<boolean>(true);

  // Financial rollups from foodCostSummaries
  const totalPrepSpend = foodCostSummaries.reduce((sum, item) => sum + Number(item.total_recipe_cost || 0), 0);
  const totalWasteLoss = foodCostSummaries.reduce((sum, item) => sum + Number(item.total_waste_cost || 0), 0);
  const overallWasteRatio = totalPrepSpend > 0 ? ((totalWasteLoss / totalPrepSpend) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-8">
      {/* Top Controls: Day selector + Run button */}
      <div className="glass-panel border border-purple-500/30 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-glow-purple">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight drop-shadow-sm">
                Autonomous AI Prep Optimization Engine
              </h3>
              <p className="text-xs text-purple-200/80">
                Mined from PostgreSQL Historical Prep Logs via Model Context Protocol & Gemini LLM
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Day Selector */}
          <div className="flex items-center space-x-2 glass-input px-3.5 py-2 rounded-xl border border-white/10">
            <Calendar className="w-4 h-4 text-purple-300" />
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d} className="bg-slate-900 text-white">
                  Target: {d}
                </option>
              ))}
            </select>
          </div>

          {/* Trigger button */}
          <button
            onClick={() => onRunOptimization(selectedDay)}
            disabled={isLoadingPrep}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-glow-purple border border-purple-400/30 transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>{isLoadingPrep ? 'Running Model...' : `Forecast for ${selectedDay}`}</span>
          </button>
        </div>
      </div>

      {/* AI Prep Sheet Recommendations */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-glass">
        <div className="p-4 sm:px-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/40">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-base font-bold text-white tracking-tight">
                Recommended Prep List ({prepSheet ? prepSheet.day_of_week : selectedDay})
              </span>
              {prepSheet?.model_used && (
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-sm">
                  {prepSheet.model_used}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Targeted batch prep quantities engineered to reduce end-of-shift scrap without 86-ing menu items
            </p>
          </div>

          {prepSheet?.summary_rationale && (
            <button
              onClick={() => setExpandedReasoning(!expandedReasoning)}
              className="flex items-center space-x-1.5 text-xs font-semibold text-purple-300 hover:text-purple-200 self-start sm:self-auto px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-800/40"
            >
              <span>{expandedReasoning ? 'Hide AI Rationale' : 'View AI Rationale'}</span>
              {expandedReasoning ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* AI Rationale Drawer */}
        {prepSheet?.summary_rationale && expandedReasoning && (
          <div className="bg-purple-950/30 border-b border-purple-500/20 p-4 sm:px-6 text-xs text-purple-200 font-mono leading-relaxed backdrop-blur-md">
            <div className="font-bold text-purple-300 uppercase tracking-wider text-[11px] mb-1.5 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Executive Synthesis:</span>
            </div>
            <p className="whitespace-pre-line">{prepSheet.summary_rationale}</p>
          </div>
        )}

        {/* Recommendations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Menu Item / Recipe</th>
                <th className="py-3 px-4">Suggested Prep Qty</th>
                <th className="py-3 px-4">Avg Historical Waste</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">AI Driver / Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!prepSheet || !prepSheet.recommendations || prepSheet.recommendations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No active forecast generated yet. Click &quot;Forecast for {selectedDay}&quot; above to run the AI engine.
                  </td>
                </tr>
              ) : (
                prepSheet.recommendations.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white text-sm">
                      {item.recipe_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-sm font-extrabold text-sky-300 bg-sky-950/60 px-3 py-1 rounded-xl border border-sky-500/30 shadow-[0_0_10px_rgba(56,189,248,0.15)]">
                        {item.suggested_prep_qty} portions
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-amber-300">
                      {(Number(item.historical_waste_percent) || 0).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm">
                        {Math.round((Number(item.confidence) || 0.9) * 100)}% Match
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-sm leading-relaxed">
                      {item.reasoning}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Food Cost Materialized View Section */}
      <div className="space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel border border-emerald-500/30 rounded-2xl p-5 flex items-center space-x-4 shadow-[0_0_20px_rgba(16,185,129,0.12)]">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <span className="font-bold text-2xl text-emerald-400 select-none">₹</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Prep Expenditure</p>
              <h3 className="text-2xl font-bold text-emerald-300 font-mono">₹{totalPrepSpend.toFixed(2)}</h3>
            </div>
          </div>

          <div className="glass-panel border border-rose-500/30 rounded-2xl p-5 flex items-center space-x-4 shadow-[0_0_20px_rgba(244,63,94,0.12)]">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-400/30 flex items-center justify-center text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Scrap Waste Loss</p>
              <h3 className="text-2xl font-bold text-rose-400 font-mono">₹{totalWasteLoss.toFixed(2)}</h3>
            </div>
          </div>

          <div className="glass-panel border border-amber-500/30 rounded-2xl p-5 flex items-center justify-between shadow-[0_0_20px_rgba(245,158,11,0.12)]">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Waste Cost Ratio</p>
                <h3 className="text-2xl font-bold text-amber-300 font-mono">{overallWasteRatio}%</h3>
              </div>
            </div>

            <button
              onClick={onRefreshFoodCost}
              disabled={isRefreshingCost}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl glass-input text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
              title="Refresh PostgreSQL Materialized View (mv_food_cost_summary)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCost ? 'animate-spin' : ''}`} />
              <span>Refresh MV</span>
            </button>
          </div>
        </div>

        {/* Food Cost Materialized View Table */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-glass">
          <div className="p-4 sm:px-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/40">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                PostgreSQL Materialized View: Hourly Food Cost Summary
              </h3>
              <p className="text-xs text-slate-400">
                Aggregated from prep logs, recipe bill of materials, and live completed ticket inventory deductions
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40 self-start sm:self-auto">
              mv_food_cost_summary
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Menu Item</th>
                  <th className="py-3 px-4">Menu Price</th>
                  <th className="py-3 px-4">Prepped</th>
                  <th className="py-3 px-4">Wasted</th>
                  <th className="py-3 px-4">Waste Rate</th>
                  <th className="py-3 px-4">Total Cost</th>
                  <th className="py-3 px-4">Waste Cost</th>
                  <th className="py-3 px-4">Waste Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {foodCostSummaries.map((f, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{f.recipe_name}</td>
                    <td className="py-3.5 px-4 font-mono font-medium">₹{(Number(f.menu_price) || 0).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono font-medium">{f.total_prepped}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-rose-400">{f.total_wasted}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {(Number(f.waste_rate_percent) || 0).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      ₹{(Number(f.total_recipe_cost) || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                      ₹{(Number(f.total_waste_cost) || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono ${
                        Number(f.waste_cost_ratio_percent) > 20
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                          : 'bg-white/5 text-slate-300 border border-white/10'
                      }`}>
                        {(Number(f.waste_cost_ratio_percent) || 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};


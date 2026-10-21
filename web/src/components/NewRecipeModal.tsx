import React, { useState } from 'react';
import {
  X,
  UtensilsCrossed,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  Layers,
  Sparkles,
  AlertCircle,
  Package,
  PackagePlus,
  CheckCircle2,
  RefreshCw,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { Ingredient } from '../types/index.js';
import { recipesApi } from '../api/client.js';

export interface RecipeIngredientRow {
  ingredient_id?: string;
  name: string;
  unit: string;
  quantity_required: number;
  cost_per_unit: number;
  current_stock: number;
  minimum_threshold: number;
  is_new: boolean;
}

interface NewRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  onSubmit: (data: {
    menu_item_name: string;
    station: string;
    price: number;
    prep_time_minutes: number;
    ingredients: Array<{
      ingredient_id?: string;
      name: string;
      unit: string;
      quantity_required: number;
      cost_per_unit?: number;
      current_stock?: number;
      minimum_threshold?: number;
    }>;
  }) => Promise<void>;
}

const STATION_PRESETS = [
  'Tandoor & Starters',
  'Curry & Handi',
  'Biryani & Rice',
  'Tawa & Breads',
  'Bar & Drinks',
  'Desserts & Mithai',
  'South Indian',
  'Chinese & Wok',
];

const COMMON_UNITS = ['kg', 'g', 'L', 'ml', 'oz', 'pcs', 'tbsp', 'tsp', 'bottle'];

const SAMPLE_AI_PROMPTS = [
  'Butter Chicken',
  'Paneer Butter Masala',
  'Hyderabadi Dum Biryani',
  'Dal Makhani',
  'Tandoori Chicken',
  'Paneer Tikka Angara',
  'Royal Mango Lassi',
  'Gulab Jamun with Rabdi',
];

export const NewRecipeModal: React.FC<NewRecipeModalProps> = ({
  isOpen,
  onClose,
  ingredients = [],
  onSubmit,
}) => {
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

  // Modal Mode: 'ai' or 'manual'
  const [activeMode, setActiveMode] = useState<'ai' | 'manual'>('ai');

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStationHint, setAiStationHint] = useState<string>('AUTO');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDescription, setAiDescription] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [station, setStation] = useState('Curry & Handi');
  const [customStation, setCustomStation] = useState('');
  const [price, setPrice] = useState('320.00');
  const [prepTime, setPrepTime] = useState('20');
  const [ingredientRows, setIngredientRows] = useState<RecipeIngredientRow[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Initialize first row when opened if empty
  React.useEffect(() => {
    if (isOpen && ingredientRows.length === 0) {
      if (safeIngredients.length > 0) {
        const defaultIng = safeIngredients[0];
        setIngredientRows([
          {
            ingredient_id: defaultIng.id,
            name: defaultIng.name,
            unit: defaultIng.unit || 'kg',
            quantity_required: 0.25,
            cost_per_unit: Number(defaultIng.cost_per_unit) || 0,
            current_stock: Number(defaultIng.current_stock) || 10,
            minimum_threshold: Number(defaultIng.min_threshold ?? defaultIng.minimum_threshold) || 3,
            is_new: false,
          },
        ]);
      } else {
        setIngredientRows([
          {
            ingredient_id: undefined,
            name: '',
            unit: 'kg',
            quantity_required: 0.25,
            cost_per_unit: 5.0,
            current_stock: 10.0,
            minimum_threshold: 3.0,
            is_new: true,
          },
        ]);
      }
    }
  }, [isOpen, safeIngredients]);

  if (!isOpen) return null;

  const finalStation = station === 'CUSTOM' ? customStation.trim() || 'Main Kitchen' : station;

  // ---------------------------------------------------------------- //
  // AI Recipe Generation Handler
  // ---------------------------------------------------------------- //
  const handleGenerateAiRecipe = async (promptOverride?: string) => {
    const promptToUse = promptOverride || aiPrompt;
    if (!promptToUse.trim()) {
      setError('Please enter a dish name or culinary prompt for AI generation');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setSuccessInfo(null);

    try {
      const res = await recipesApi.aiGenerate({
        prompt: promptToUse.trim(),
        station: aiStationHint !== 'AUTO' ? aiStationHint : undefined,
      });

      setName(res.dish_name);
      setStation(STATION_PRESETS.includes(res.station) ? res.station : 'CUSTOM');
      if (!STATION_PRESETS.includes(res.station)) {
        setCustomStation(res.station);
      }
      setPrice(res.price.toFixed(2));
      setPrepTime(String(res.prep_time_minutes));
      setAiDescription(res.description || null);

      // Populate ingredient rows from AI response
      const rows: RecipeIngredientRow[] = res.ingredients.map((ing) => ({
        ingredient_id: ing.matched_ingredient_id,
        name: ing.name,
        unit: ing.unit || 'kg',
        quantity_required: Number(ing.quantity_required) || 0.1,
        cost_per_unit: Number(ing.cost_per_unit) || 0,
        current_stock: Number(ing.current_stock) || 10,
        minimum_threshold: Number(ing.minimum_threshold) || 3,
        is_new: ing.is_new ?? !ing.matched_ingredient_id,
      }));

      setIngredientRows(rows);

      const newItemsCount = rows.filter((r) => r.is_new).length;
      setSuccessInfo(
        `AI generated complete recipe! ${newItemsCount} ingredient(s) will be newly added to inventory.`
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to generate recipe with AI');
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------------------------- //
  // Ingredient Row Management
  // ---------------------------------------------------------------- //
  const handleAddExistingIngredientRow = () => {
    const unselected = safeIngredients.find((i) => !ingredientRows.some((r) => r.ingredient_id === i.id));
    const ingToUse = unselected || safeIngredients[0];

    if (ingToUse) {
      setIngredientRows([
        ...ingredientRows,
        {
          ingredient_id: ingToUse.id,
          name: ingToUse.name,
          unit: ingToUse.unit || 'kg',
          quantity_required: 0.1,
          cost_per_unit: Number(ingToUse.cost_per_unit) || 0,
          current_stock: Number(ingToUse.current_stock) || 10,
          minimum_threshold: Number(ingToUse.min_threshold ?? ingToUse.minimum_threshold) || 3,
          is_new: false,
        },
      ]);
    } else {
      handleAddNewCustomIngredientRow();
    }
  };

  const handleAddNewCustomIngredientRow = () => {
    setIngredientRows([
      ...ingredientRows,
      {
        ingredient_id: undefined,
        name: '',
        unit: 'kg',
        quantity_required: 0.1,
        cost_per_unit: 5.0,
        current_stock: 10.0,
        minimum_threshold: 3.0,
        is_new: true,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setIngredientRows(ingredientRows.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index: number, field: keyof RecipeIngredientRow, val: any) => {
    const updated = [...ingredientRows];
    const currentRow = { ...updated[index] };

    if (field === 'ingredient_id') {
      if (val === '__NEW__') {
        currentRow.ingredient_id = undefined;
        currentRow.is_new = true;
        currentRow.name = '';
      } else {
        const found = safeIngredients.find((i) => i.id === val);
        if (found) {
          currentRow.ingredient_id = found.id;
          currentRow.name = found.name;
          currentRow.unit = found.unit || 'kg';
          currentRow.cost_per_unit = Number(found.cost_per_unit) || 0;
          currentRow.is_new = false;
        }
      }
    } else {
      (currentRow as any)[field] = val;
    }

    updated[index] = currentRow;
    setIngredientRows(updated);
  };

  // ---------------------------------------------------------------- //
  // Financial & Inventory Statistics
  // ---------------------------------------------------------------- //
  const calculatedCost = ingredientRows.reduce((sum, row) => {
    return sum + (Number(row.cost_per_unit) || 0) * (Number(row.quantity_required) || 0);
  }, 0);

  const salePriceNum = parseFloat(price) || 0;
  const foodCostPct = salePriceNum > 0 ? ((calculatedCost / salePriceNum) * 100).toFixed(1) : '0.0';
  const grossMargin = Math.max(0, salePriceNum - calculatedCost);
  const grossMarginPct = salePriceNum > 0 ? ((grossMargin / salePriceNum) * 100).toFixed(1) : '0.0';

  const newIngredientsCount = ingredientRows.filter((r) => r.is_new).length;
  const existingIngredientsCount = ingredientRows.filter((r) => !r.is_new).length;

  // ---------------------------------------------------------------- //
  // Submit Handler
  // ---------------------------------------------------------------- //
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a dish/drink name');
      return;
    }

    if (salePriceNum <= 0) {
      setError('Selling price must be greater than zero');
      return;
    }

    if (ingredientRows.length === 0) {
      setError('Please add at least one ingredient to the Bill of Materials');
      return;
    }

    const invalidRow = ingredientRows.find((r) => !r.name.trim() || Number(r.quantity_required) <= 0);
    if (invalidRow) {
      setError('All ingredients must have a valid name and positive quantity required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        menu_item_name: name.trim(),
        station: finalStation,
        price: salePriceNum,
        prep_time_minutes: parseInt(prepTime, 10) || 15,
        ingredients: ingredientRows.map((r) => ({
          ingredient_id: r.ingredient_id,
          name: r.name.trim(),
          unit: r.unit.trim() || 'kg',
          quantity_required: Number(r.quantity_required),
          cost_per_unit: Number(r.cost_per_unit) || 0,
          current_stock: Number(r.current_stock) || 10,
          minimum_threshold: Number(r.minimum_threshold) || 3,
        })),
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create dish and update inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="glass-panel border border-white/15 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500/20 via-indigo-500/20 to-amber-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-glow-sky">
              <UtensilsCrossed className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <span>Add Dish, Drink & Ingredients</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono">
                  BOM Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                AI auto-generates ingredients & seeds inventory, or create recipes manually.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-white/10 bg-slate-950/60 px-5 pt-3">
          <button
            type="button"
            onClick={() => setActiveMode('ai')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeMode === 'ai'
                ? 'border-sky-500 text-sky-400 shadow-glow-sky'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>AI Dish & Ingredients Generator</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px]">
              Gemini Powered
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeMode === 'manual'
                ? 'border-sky-500 text-sky-400 shadow-glow-sky'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Manual Dish & BOM Builder</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* AI PROMPT SECTION */}
          {activeMode === 'ai' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/30 via-slate-900/60 to-indigo-950/20 border border-sky-500/30 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Type Dish Prompt for Instant Extraction</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Adds missing ingredients to stock + creates recipe BOM
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. Chicken Masala Handi, Truffle Tagliatelle, Classic Mojito..."
                    className="w-full bg-slate-950/80 border border-sky-500/40 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGenerateAiRecipe();
                      }
                    }}
                  />
                </div>

                <select
                  value={aiStationHint}
                  onChange={(e) => setAiStationHint(e.target.value)}
                  className="bg-slate-950/80 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
                >
                  <option value="AUTO">Station: Auto-Detect</option>
                  {STATION_PRESETS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleGenerateAiRecipe()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-amber-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/20 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating BOM...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Extract & Build</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sample Prompt Chips */}
              <div className="flex items-center flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500 mr-1">Quick prompts:</span>
                {SAMPLE_AI_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setAiPrompt(p);
                      handleGenerateAiRecipe(p);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-white/5 text-slate-300 hover:text-white text-[11px] transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {aiDescription && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 italic flex items-start space-x-2">
                  <span className="text-amber-400 font-bold not-italic shrink-0">Chef Note:</span>
                  <span>{aiDescription}</span>
                </div>
              )}
            </div>
          )}

          {/* DISH DETAILS SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-sky-400" />
                <span>Dish Information</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Dish Name */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Dish / Drink Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Butter Chicken or Paneer Butter Masala"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Station */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Station *</label>
                <select
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  {STATION_PRESETS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Custom Station</option>
                </select>
                {station === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Enter station name"
                    value={customStation}
                    onChange={(e) => setCustomStation(e.target.value)}
                    className="w-full mt-1.5 bg-slate-900/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                )}
              </div>

              {/* Selling Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Menu Price (₹) *</label>
                <div className="relative">
                  <span className="font-bold text-emerald-400 absolute left-3 top-2 text-sm select-none">₹</span>
                  <input
                    type="number"
                    step="5"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm font-semibold text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Prep Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Prep Time (min)</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-amber-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="1"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* BILL OF MATERIALS & INGREDIENTS SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Recipe Bill of Materials (BOM) & Inventory Integration</span>
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono">
                  {ingredientRows.length} items
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleAddExistingIngredientRow}
                  className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-xs text-slate-200 flex items-center space-x-1.5 transition-colors"
                >
                  <Package className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ From Stock</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddNewCustomIngredientRow}
                  className="px-3 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs text-sky-300 flex items-center space-x-1.5 transition-colors"
                >
                  <PackagePlus className="w-3.5 h-3.5 text-sky-400" />
                  <span>+ New Stock Item</span>
                </button>
              </div>
            </div>

            {/* Ingredients Table / Card List */}
            <div className="space-y-2.5">
              {ingredientRows.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 hover:border-white/20 transition-all flex flex-col lg:flex-row items-start lg:items-center gap-3"
                >
                  {/* Status Indicator */}
                  <div className="shrink-0 flex items-center space-x-1.5">
                    {row.is_new ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold flex items-center space-x-1" title="Will be automatically inserted into the ingredients table">
                        <PackagePlus className="w-3 h-3 text-amber-400" />
                        <span>New to Stock</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center space-x-1" title="Matches existing pantry item">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>In Stock</span>
                      </span>
                    )}
                  </div>

                  {/* Ingredient Name (Select existing or Custom Input) */}
                  <div className="flex-1 w-full lg:w-auto">
                    {row.is_new ? (
                      <input
                        type="text"
                        placeholder="Ingredient Name (e.g. Garam Masala)"
                        value={row.name}
                        onChange={(e) => handleRowChange(idx, 'name', e.target.value)}
                        className="w-full bg-slate-950/80 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                      />
                    ) : (
                      <select
                        value={row.ingredient_id || ''}
                        onChange={(e) => handleRowChange(idx, 'ingredient_id', e.target.value)}
                        className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                      >
                        {safeIngredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit || 'kg'}) — ₹{Number(ing.cost_per_unit || 0).toFixed(2)}/{ing.unit || 'kg'}
                          </option>
                        ))}
                        <option value="__NEW__">+ Switch to New Ingredient...</option>
                      </select>
                    )}
                  </div>

                  {/* Portion Quantity Required */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className="text-[11px] text-slate-400">Qty/Dish:</span>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={row.quantity_required}
                      onChange={(e) => handleRowChange(idx, 'quantity_required', parseFloat(e.target.value) || 0)}
                      className="w-20 bg-slate-950/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-center text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Unit Selector */}
                  <div className="shrink-0">
                    <select
                      value={row.unit}
                      onChange={(e) => handleRowChange(idx, 'unit', e.target.value)}
                      className="bg-slate-950/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Extra Fields for New Ingredients (Cost, Stock, Threshold) */}
                  {row.is_new && (
                    <div className="flex items-center space-x-2 shrink-0 bg-slate-950/50 p-1.5 rounded-lg border border-white/5">
                      <div className="flex items-center space-x-1" title="Unit Cost">
                        <span className="text-[10px] text-slate-500">₹</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={row.cost_per_unit}
                          onChange={(e) => handleRowChange(idx, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                          placeholder="Cost"
                          className="w-14 bg-transparent border-b border-slate-700 text-right text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="flex items-center space-x-1" title="Initial Stock">
                        <span className="text-[10px] text-slate-500">Init:</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={row.current_stock}
                          onChange={(e) => handleRowChange(idx, 'current_stock', parseFloat(e.target.value) || 0)}
                          placeholder="Stock"
                          className="w-12 bg-transparent border-b border-slate-700 text-right text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="flex items-center space-x-1" title="Safety Threshold">
                        <span className="text-[10px] text-slate-500">Min:</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={row.minimum_threshold}
                          onChange={(e) => handleRowChange(idx, 'minimum_threshold', parseFloat(e.target.value) || 0)}
                          placeholder="Min"
                          className="w-12 bg-transparent border-b border-slate-700 text-right text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Cost per portion */}
                  <div className="shrink-0 text-right w-16">
                    <span className="text-xs font-mono text-slate-400">
                      ₹{(Number(row.quantity_required) * Number(row.cost_per_unit)).toFixed(2)}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(idx)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors shrink-0"
                    title="Remove ingredient"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* LIVE COST & MARGIN HUD */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Est. Cost / Portion</div>
              <div className="text-lg font-bold font-mono text-slate-100">
                ₹{calculatedCost.toFixed(2)}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 font-medium">Food Cost %</div>
              <div
                className={`text-lg font-bold font-mono ${
                  Number(foodCostPct) <= 32 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {foodCostPct}%
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 font-medium">Gross Margin</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                ₹{grossMargin.toFixed(2)}{' '}
                <span className="text-xs font-normal text-slate-400">({grossMarginPct}%)</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-medium">Inventory Sync</div>
              <div className="text-xs font-semibold text-sky-400">
                {newIngredientsCount > 0 ? (
                  <span className="text-amber-400">+{newIngredientsCount} New to Stock</span>
                ) : (
                  <span className="text-emerald-400">All in Stock</span>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-emerald-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-sky-500/25 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Dish & Inventory...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Dish & Add Ingredients to Inventory</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

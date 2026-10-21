import React, { useState, useMemo, useEffect } from 'react';
import { Recipe, Ticket } from '../types/index.js';
import {
  X,
  Flame,
  ChefHat,
  Search,
  Plus,
  Minus,
  Trash2,
  Utensils,
  Clock,
  CheckCircle,
  AlertTriangle,
  Layers,
  FileText,
  Timer,
  Info,
} from 'lucide-react';
import { kitchenAudio } from '../utils/kitchenAudio.js';

interface DraftCartItem {
  cartId: string;
  recipe_id: string;
  recipe_name: string;
  station: string;
  quantity: number;
  price: number;
  prep_time_minutes: number;
  notes: string;
}

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
  tickets?: Ticket[];
  onSubmit?: (data: { recipe_id: string; station?: string; table_number?: number; notes?: string }) => Promise<void>;
  onSubmitBatch?: (data: {
    table_number: number;
    items: Array<{
      recipe_id: string;
      station?: string;
      quantity?: number;
      notes?: string;
    }>;
    common_notes?: string;
  }) => Promise<void>;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({
  isOpen,
  onClose,
  recipes,
  tickets = [],
  onSubmit,
  onSubmitBatch,
}) => {
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [customTableInput, setCustomTableInput] = useState<string>('');
  const [menuSearch, setMenuSearch] = useState<string>('');
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('ALL');
  const [defaultStation, setDefaultStation] = useState<string>('Main Kitchen');
  const [cart, setCart] = useState<DraftCartItem[]>([]);
  const [commonNotes, setCommonNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'current' | 'previous' | 'upcoming'>('upcoming');

  // Generate 16 standard table squares
  const standardTables = useMemo(() => Array.from({ length: 16 }, (_, i) => i + 1), []);

  // Distinct list of stations available in kitchen
  const availableStations = useMemo(() => {
    const set = new Set<string>([
      'Grill Station',
      'Sauté Station',
      'Oven Station',
      'Pantry / Cold',
      'Main Kitchen',
    ]);
    recipes.forEach((r) => {
      if (r.station) set.add(r.station);
    });
    return Array.from(set).sort();
  }, [recipes]);

  // Reset or initialize state on open
  useEffect(() => {
    if (isOpen) {
      if (recipes.length > 0 && cart.length === 0) {
        // Pre-fill with first recipe as 1x item for fast single-tap workflow
        const first = recipes[0];
        setCart([
          {
            cartId: `draft_${Date.now()}_0`,
            recipe_id: first.id,
            recipe_name: first.menu_item_name || first.name || 'Dish',
            station: first.station || 'Main Kitchen',
            quantity: 1,
            price: Number(first.price || first.sale_price) || 0,
            prep_time_minutes: first.prep_time_minutes || 15,
            notes: '',
          },
        ]);
        setDefaultStation(first.station || 'Main Kitchen');
      }
    }
  }, [isOpen, recipes]);

  // Derived table ticket history
  const activeOrdersForTable = useMemo(() => {
    return tickets.filter(
      (t) => (t.table_number || 1) === selectedTable && (t.status === 'QUEUE' || t.status === 'FIRING')
    );
  }, [tickets, selectedTable]);

  const completedOrdersForTable = useMemo(() => {
    return tickets
      .filter((t) => (t.table_number || 1) === selectedTable && t.status === 'COMPLETED')
      .sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime())
      .slice(0, 10);
  }, [tickets, selectedTable]);

  // Table status map for all squares
  const tableStatusMap = useMemo(() => {
    const map = new Map<number, { activeCount: number; completedCount: number }>();
    tickets.forEach((t) => {
      const num = t.table_number || 1;
      const current = map.get(num) || { activeCount: 0, completedCount: 0 };
      if (t.status === 'QUEUE' || t.status === 'FIRING') {
        current.activeCount += 1;
      } else if (t.status === 'COMPLETED') {
        current.completedCount += 1;
      }
      map.set(num, current);
    });
    return map;
  }, [tickets]);

  // Filtered menu dishes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const name = (r.menu_item_name || r.name || '').toLowerCase();
      const station = (r.station || '').toLowerCase();
      const matchesSearch = !menuSearch.trim() || name.includes(menuSearch.toLowerCase().trim());
      const matchesStation =
        selectedStationFilter === 'ALL' || station === selectedStationFilter.toLowerCase();
      return matchesSearch && matchesStation;
    });
  }, [recipes, menuSearch, selectedStationFilter]);

  // Cart operations
  const handleAddDishToCart = (recipe: Recipe) => {
    const existingIndex = cart.findIndex((i) => i.recipe_id === recipe.id);
    if (existingIndex >= 0) {
      // Increase quantity
      setCart((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      // Add new item
      const newItem: DraftCartItem = {
        cartId: `draft_${Date.now()}_${Math.random()}`,
        recipe_id: recipe.id,
        recipe_name: recipe.menu_item_name || recipe.name || 'Dish',
        station: recipe.station || defaultStation || 'Main Kitchen',
        quantity: 1,
        price: Number(recipe.price || recipe.sale_price) || 0,
        prep_time_minutes: recipe.prep_time_minutes || 15,
        notes: '',
      };
      setCart((prev) => [...prev, newItem]);
    }
    setActiveHistoryTab('upcoming');
  };

  const handleUpdateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartId === cartId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as DraftCartItem[]
    );
  };

  const handleUpdateItemStation = (cartId: string, newStation: string) => {
    setCart((prev) =>
      prev.map((item) => (item.cartId === cartId ? { ...item, station: newStation } : item))
    );
  };

  const handleUpdateItemNotes = (cartId: string, itemNotes: string) => {
    setCart((prev) =>
      prev.map((item) => (item.cartId === cartId ? { ...item, notes: itemNotes } : item))
    );
  };

  const handleRemoveFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  // Cart totals
  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const maxPrepTime = cart.reduce((max, item) => Math.max(max, item.prep_time_minutes), 0) || 15;

  // Handle table square selection
  const handleSelectTable = (tableNo: number) => {
    setSelectedTable(tableNo);
    setCustomTableInput('');
  };

  const handleCustomTableChange = (val: string) => {
    setCustomTableInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedTable(parsed);
    }
  };

  // Form submission: batch or single fallback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    try {
      setIsSubmitting(true);

      if (onSubmitBatch) {
        await onSubmitBatch({
          table_number: selectedTable,
          items: cart.map((i) => ({
            recipe_id: i.recipe_id,
            station: i.station,
            quantity: i.quantity,
            notes: i.notes.trim() || undefined,
          })),
          common_notes: commonNotes.trim() || undefined,
        });
      } else if (onSubmit) {
        // Fallback for each item in cart
        for (const item of cart) {
          for (let q = 0; q < item.quantity; q++) {
            await onSubmit({
              recipe_id: item.recipe_id,
              station: item.station,
              table_number: selectedTable,
              notes: [item.notes.trim(), commonNotes.trim()].filter(Boolean).join(' | ') || undefined,
            });
          }
        }
      }

      kitchenAudio.playFire();
      onClose();
      setCart([]);
      setCommonNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel border border-white/15 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-white/10 bg-slate-900/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-sky-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-glow-amber">
              <Flame className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white tracking-tight">
                  Kitchen Ticket Dispatcher
                </h3>
                <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full">
                  Table {selectedTable}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Select table square, add multiple dishes, and fire directly to line KDS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2-Column Split Workspace */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* ======================================================== */}
          {/* LEFT COLUMN (lg:col-span-5): Table Squares & History     */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 p-3.5 sm:p-4 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-slate-950/40 overflow-y-auto space-y-4">
            {/* 1. Interactive Table Square Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                  <Utensils className="w-3.5 h-3.5 text-sky-400" />
                  <span>Select Table Square</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Active: Table {selectedTable}
                </span>
              </div>

              {/* 4x4 Table Grid */}
              <div className="grid grid-cols-4 gap-2">
                {standardTables.map((tNum) => {
                  const isSelected = selectedTable === tNum;
                  const status = tableStatusMap.get(tNum) || { activeCount: 0, completedCount: 0 };
                  const hasActive = status.activeCount > 0;

                  return (
                    <button
                      key={tNum}
                      type="button"
                      onClick={() => handleSelectTable(tNum)}
                      className={`relative p-2 rounded-xl border flex flex-col items-center justify-center transition-all duration-150 ${
                        isSelected
                          ? 'bg-sky-500/25 border-sky-400 shadow-glow-sky ring-1 ring-sky-400/50'
                          : hasActive
                          ? 'bg-amber-950/40 border-amber-500/50 hover:border-amber-400'
                          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className={`text-xs font-mono font-bold ${
                          isSelected
                            ? 'text-white'
                            : hasActive
                            ? 'text-amber-300'
                            : 'text-slate-300'
                        }`}
                      >
                        T-{tNum < 10 ? `0${tNum}` : tNum}
                      </span>

                      {/* Status indicator dot */}
                      <div className="flex items-center space-x-1 mt-1">
                        {hasActive ? (
                          <span className="flex items-center space-x-0.5 text-[9px] font-bold text-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>{status.activeCount}</span>
                          </span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Table Number Input */}
              <div className="mt-2.5 flex items-center space-x-2">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">Other Table #:</span>
                <input
                  type="number"
                  min="1"
                  max="199"
                  placeholder="e.g. 25"
                  value={customTableInput}
                  onChange={(e) => handleCustomTableChange(e.target.value)}
                  className="w-24 px-2 py-1 text-xs glass-input rounded-lg text-white font-mono"
                />
              </div>
            </div>

            {/* 2. Track Table Orders: Upcoming, Current, Previous Tabs */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              {/* Tab Selector */}
              <div className="flex items-center space-x-1 p-1 bg-slate-900/80 rounded-xl border border-white/10 text-xs font-semibold mb-2.5">
                <button
                  type="button"
                  onClick={() => setActiveHistoryTab('upcoming')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
                    activeHistoryTab === 'upcoming'
                      ? 'bg-sky-500/25 text-sky-300 border border-sky-400/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>New Cart</span>
                  <span className="text-[10px] font-mono px-1 rounded-full bg-sky-950 text-sky-300">
                    {totalCartItems}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveHistoryTab('current')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
                    activeHistoryTab === 'current'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Current</span>
                  <span className="text-[10px] font-mono px-1 rounded-full bg-amber-950 text-amber-300">
                    {activeOrdersForTable.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveHistoryTab('previous')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
                    activeHistoryTab === 'previous'
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Fulfilled</span>
                  <span className="text-[10px] font-mono px-1 rounded-full bg-emerald-950 text-emerald-300">
                    {completedOrdersForTable.length}
                  </span>
                </button>
              </div>

              {/* Tab Content Display */}
              <div className="flex-1 rounded-xl glass-card p-3 border border-white/10 overflow-y-auto space-y-2">
                {/* 1. Upcoming / Current Cart Items for Table */}
                {activeHistoryTab === 'upcoming' && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Draft Items in Batch</span>
                      <span className="text-sky-400 font-mono">Table {selectedTable}</span>
                    </div>

                    {cart.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No dishes added yet. Pick dishes from the right catalog.
                      </div>
                    ) : (
                      cart.map((item) => (
                        <div
                          key={item.cartId}
                          className="p-2 rounded-lg bg-slate-900/90 border border-white/10 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white truncate max-w-[150px]">
                              {item.recipe_name}
                            </span>
                            <span className="font-mono text-sky-300 font-semibold">
                              ₹{(item.price * item.quantity).toFixed(0)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1.5">
                            {/* Station selector per item */}
                            <select
                              value={item.station}
                              onChange={(e) => handleUpdateItemStation(item.cartId, e.target.value)}
                              className="text-[10px] bg-slate-800 text-sky-200 border border-sky-500/30 rounded px-1.5 py-0.5 focus:outline-none"
                            >
                              {availableStations.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>

                            {/* Quantity Stepper */}
                            <div className="flex items-center space-x-1.5 bg-slate-800 px-1.5 py-0.5 rounded border border-white/10">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.cartId, -1)}
                                className="text-slate-400 hover:text-white p-0.5"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="font-mono text-xs font-bold text-amber-300">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.cartId, 1)}
                                className="text-slate-400 hover:text-white p-0.5"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.cartId)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Item modifiers input */}
                          <input
                            type="text"
                            placeholder="Add item note (e.g. extra spicy)..."
                            value={item.notes}
                            onChange={(e) => handleUpdateItemNotes(item.cartId, e.target.value)}
                            className="w-full text-[10px] bg-black/40 border border-white/10 rounded px-2 py-0.5 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
                          />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 2. Current Active Orders on Table */}
                {activeHistoryTab === 'current' && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center justify-between">
                      <span>Active on Table {selectedTable}</span>
                      <span className="font-mono">{activeOrdersForTable.length} items</span>
                    </div>

                    {activeOrdersForTable.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No active orders currently firing for Table {selectedTable}.
                      </div>
                    ) : (
                      activeOrdersForTable.map((t) => (
                        <div
                          key={t.id}
                          className="p-2 rounded-lg bg-slate-900/90 border border-amber-500/30 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white truncate">{t.recipe_name}</span>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                                t.status === 'FIRING'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Station: {t.station}</span>
                            <span className="font-mono text-amber-400 font-bold flex items-center space-x-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          </div>
                          {t.notes && (
                            <div className="text-[10px] text-amber-200 bg-amber-950/40 px-1.5 py-0.5 rounded">
                              {t.notes}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 3. Previous Fulfilled Orders on Table */}
                {activeHistoryTab === 'previous' && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center justify-between">
                      <span>Fulfilled for Table {selectedTable}</span>
                      <span className="font-mono">{completedOrdersForTable.length} served</span>
                    </div>

                    {completedOrdersForTable.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No completed dishes yet for Table {selectedTable}.
                      </div>
                    ) : (
                      completedOrdersForTable.map((t) => (
                        <div
                          key={t.id}
                          className="p-2 rounded-lg bg-slate-950/80 border border-emerald-500/20 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-300 truncate">{t.recipe_name}</span>
                            <span className="text-[10px] font-semibold text-emerald-400 flex items-center space-x-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>Served</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Station: {t.station}</span>
                            <span className="font-mono">
                              {t.completed_at ? new Date(t.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN (lg:col-span-7): Menu Catalog & Quick Tray */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 p-3.5 sm:p-4 flex flex-col overflow-hidden bg-slate-900/60">
            {/* Top Toolbar: Search & Station Filters */}
            <div className="space-y-2.5 mb-3 shrink-0">
              {/* Search Bar + Default Station Dropdown */}
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Search menu items to add..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs glass-input rounded-xl border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400"
                  />
                  {menuSearch && (
                    <button
                      onClick={() => setMenuSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Default Station Dropdown */}
                <div className="shrink-0 flex items-center space-x-1.5">
                  <ChefHat className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={defaultStation}
                    onChange={(e) => setDefaultStation(e.target.value)}
                    className="text-xs glass-input rounded-xl px-2.5 py-1.5 text-white border border-white/10 focus:outline-none"
                    title="Default destination station"
                  >
                    {availableStations.map((stn) => (
                      <option key={stn} value={stn} className="bg-slate-900 text-white">
                        {stn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Station Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedStationFilter('ALL')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                    selectedStationFilter === 'ALL'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  All Dishes ({recipes.length})
                </button>
                {availableStations.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStationFilter(st)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                      selectedStationFilter.toLowerCase() === st.toLowerCase()
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid (Scrollable) */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No matching dishes found in catalog.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredRecipes.map((recipe) => {
                    const price = Number(recipe.price || recipe.sale_price) || 0;
                    const inCartCount = cart
                      .filter((c) => c.recipe_id === recipe.id)
                      .reduce((acc, c) => acc + c.quantity, 0);

                    return (
                      <div
                        key={recipe.id}
                        onClick={() => handleAddDishToCart(recipe)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col justify-between select-none ${
                          inCartCount > 0
                            ? 'bg-sky-950/40 border-sky-500/40 shadow-sm ring-1 ring-sky-400/20'
                            : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h5 className="font-bold text-xs text-white tracking-tight leading-tight">
                              {recipe.menu_item_name || recipe.name}
                            </h5>
                            <span className="font-mono text-xs font-bold text-sky-300 shrink-0">
                              ₹{price.toFixed(0)}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 mt-1.5">
                            <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.2 rounded border border-white/5">
                              {recipe.station || 'Main Kitchen'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-0.5">
                              <Timer className="w-2.5 h-2.5" />
                              <span>{recipe.prep_time_minutes || 15}m</span>
                            </span>
                          </div>
                        </div>

                        {/* Bottom action pill */}
                        <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] text-sky-400 font-medium flex items-center space-x-1">
                            <Plus className="w-2.5 h-2.5" />
                            <span>Add Dish</span>
                          </span>

                          {inCartCount > 0 && (
                            <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-sky-500 text-white">
                              {inCartCount} in order
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Table Common Instructions */}
            <div className="mt-3 pt-2.5 border-t border-white/10 shrink-0">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5 mb-1">
                <FileText className="w-3 h-3 text-slate-400" />
                <span>Table Special Instructions / Allergy Modifiers</span>
              </label>
              <input
                type="text"
                placeholder="e.g. VIP guests, allergy: shellfish, serve all dishes together..."
                value={commonNotes}
                onChange={(e) => setCommonNotes(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
              />
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar: Summary & Dispatch Actions */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Order Metrics Summary */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 font-bold text-white">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Table {selectedTable}</span>
            </div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300">
              <span className="font-bold text-white">{totalCartItems}</span> {totalCartItems === 1 ? 'Dish' : 'Dishes'}
            </div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300 font-mono">
              Est: <span className="text-amber-400 font-bold">~{maxPrepTime}m</span>
            </div>
            <div className="text-slate-400">|</div>
            <div className="text-slate-300 font-mono">
              Total: <span className="text-emerald-400 font-bold">₹{totalCartPrice.toFixed(0)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || cart.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-glow-amber border border-amber-400/40 active:scale-95 transition-all disabled:opacity-40"
            >
              <Flame className="w-4 h-4 fill-slate-950" />
              <span>
                {isSubmitting
                  ? 'Dispatching Tickets...'
                  : `Fire ${totalCartItems} ${totalCartItems === 1 ? 'Dish' : 'Dishes'} to KDS`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, PackagePlus, Scale, ShieldAlert } from 'lucide-react';

interface NewIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    unit: string;
    current_stock: number;
    minimum_threshold: number;
    cost_per_unit: number;
  }) => Promise<void>;
}

const COMMON_UNITS = [
  'kg',
  'g',
  'liters',
  'ml',
  'pcs',
  'oz',
  'lb',
  'bottle',
  'can',
  'pack',
];

export const NewIngredientModal: React.FC<NewIngredientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [currentStock, setCurrentStock] = useState('10');
  const [minThreshold, setMinThreshold] = useState('5');
  const [costPerUnit, setCostPerUnit] = useState('0.00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const stockNum = parseFloat(currentStock);
    const thresholdNum = parseFloat(minThreshold);
    const costNum = parseFloat(costPerUnit);

    if (!name.trim()) {
      setError('Please provide an ingredient name');
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      setError('Current stock must be a non-negative number');
      return;
    }

    if (isNaN(thresholdNum) || thresholdNum < 0) {
      setError('Safety threshold must be a non-negative number');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        unit: unit.trim(),
        current_stock: stockNum,
        minimum_threshold: thresholdNum,
        cost_per_unit: isNaN(costNum) ? 0 : Math.max(0, costNum),
      });
      setName('');
      setCurrentStock('10');
      setMinThreshold('5');
      setCostPerUnit('0.00');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create ingredient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="glass-panel w-full max-w-lg rounded-2xl border border-sky-500/30 p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Add New Stock / Ingredient</h3>
              <p className="text-xs text-slate-400">Track pantry items, units, costs, and safety lines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Ingredient Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fresh Malai Paneer, Desi Cow Ghee, Basmati Rice, Boneless Chicken"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Scale className="w-3.5 h-3.5 text-sky-400" />
                <span>Unit of Measure *</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} className="bg-slate-900 text-white">
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <span className="text-emerald-400 font-bold text-xs">₹</span>
                <span>Cost Per Unit (₹)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Initial Stock Qty *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Min Safety Threshold *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Adding...</span>
              ) : (
                <>
                  <PackagePlus className="w-4 h-4" />
                  <span>Save Stock Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

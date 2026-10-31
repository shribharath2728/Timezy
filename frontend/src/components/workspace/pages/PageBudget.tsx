import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { BudgetItem, EventPlan } from '../../../types';
import { PageCornerCurl } from '../PageCornerCurl';

// PAGE 2: Budget Items in INR (₹)
export const PageBudget = React.forwardRef<HTMLDivElement, {
  plan: EventPlan;
  onPrev: () => void;
  onNext: () => void;
  onUpdatePlan: (plan: EventPlan) => void;
}>(
  (props, ref) => {
    // Sync local state when the plan prop changes (e.g. AI assistant adds an item)
    const [items, setItems] = useState<BudgetItem[]>(props.plan.budgetItems);
    const [newItemName, setNewItemName] = useState('');
    const [newItemCost, setNewItemCost] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('Catering & Dining');
    const [showAdd, setShowAdd] = useState(false);

    // Keep local items in sync whenever the parent plan updates externally
    useEffect(() => {
      setItems(props.plan.budgetItems);
    }, [props.plan.budgetItems]);

    const totalSpent = items.reduce((acc, it) => acc + (it.actualCost ?? it.estimatedCost ?? 0), 0);
    const balance = props.plan.budget - totalSpent;
    const overBudget = balance < 0;

    const CATEGORIES = [
      'Catering & Dining',
      'Venue & Decor',
      'Photography & Video',
      'Entertainment',
      'Cake & Sweets',
      'Invitations',
      'Transport',
      'Miscellaneous',
    ];

    const handleAddItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemName.trim() || !newItemCost) return;
      const cost = parseFloat(newItemCost) || 0;
      const newItem: BudgetItem = {
        id: `b-${Date.now()}`,
        category: newItemCategory,
        name: newItemName.trim(),
        estimatedCost: cost,
        actualCost: cost,
        paymentStatus: 'pending',
      };
      const updated: BudgetItem[] = [...items, newItem];
      setItems(updated);
      props.onUpdatePlan({ ...props.plan, budgetItems: updated });
      setNewItemName('');
      setNewItemCost('');
      setNewItemCategory('Catering & Dining');
      setShowAdd(false);
    };

    return (
      <div ref={ref} className="page-container relative p-5 sm:p-6 pb-8 flex flex-col justify-between bg-[#fbfdfa] border-r border-[#e0ece0] text-[#082b03]">
        <div className="overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#5e7264] block">
                Financial Tracking
              </span>
              <h2 className="text-xl font-bold text-[#082b03]">
                Budget &amp; Expenses (₹)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAdd(!showAdd)}
              aria-expanded={showAdd}
              aria-label="Add expense"
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#082b03] text-white flex items-center gap-1 shadow-sm hover:bg-[#1a4a0a] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Expense</span>
            </button>
          </div>

          {/* Quick Balance Pill Card */}
          <div className="p-3.5 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0] flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono text-[#5e7264] uppercase block">Remaining Balance</span>
              <span className={`text-lg font-bold ${overBudget ? 'text-red-600' : 'text-[#082b03]'}`}>
                ₹{Math.abs(balance).toLocaleString('en-IN')}{overBudget ? ' over' : ''}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-[#5e7264] uppercase block">Total Spent</span>
              <span className="text-sm font-semibold text-[#082b03]">₹{totalSpent.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Add Item Inline Form */}
          {showAdd && (
            <form onSubmit={handleAddItem} className="p-3 rounded-2xl bg-[#e6f2e2] border border-[#d2e5ce] mb-4 space-y-2 text-xs">
              <input
                type="text"
                placeholder="Expense item (e.g. Stage Floral Arch)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                aria-label="Expense item name"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#bad4b6] focus:outline-none focus:border-[#082b03] text-[#082b03]"
                required
              />
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                aria-label="Expense category"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#bad4b6] focus:outline-none focus:border-[#082b03] text-[#082b03]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Cost in ₹"
                  value={newItemCost}
                  onChange={(e) => setNewItemCost(e.target.value)}
                  aria-label="Cost in rupees"
                  min="0"
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#bad4b6] focus:outline-none focus:border-[#082b03] text-[#082b03]"
                  required
                />
                <button type="submit" className="timezy-btn-dark px-4 py-2 text-xs">
                  Save
                </button>
              </div>
            </form>
          )}

          {/* Item List */}
          <div className="space-y-2">
            {items.length === 0 && (
              <p className="text-xs text-[#5e7264] text-center py-4">No expenses yet. Add your first expense above.</p>
            )}
            {items.map((it) => (
              <div key={it.id} className="p-3 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0] flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-[#082b03] block truncate">{it.name}</span>
                  <span className="text-[10px] text-[#5e7264] font-mono">{it.category}</span>
                </div>
                <span className="font-bold text-[#082b03] bg-white px-2.5 py-1 rounded-full border border-[#e0ece0] shrink-0">
                  ₹{(it.actualCost ?? it.estimatedCost ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Flip Footer */}
        <div className="pt-3 border-t border-[#e0ece0] flex items-center justify-between text-xs text-[#5e7264] pr-12">
          <button type="button" onClick={props.onPrev} className="text-[#5e7264] hover:text-[#082b03] flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Summary</span>
          </button>
          <span className="font-medium">Budget</span>
          <button type="button" onClick={props.onNext} className="text-[#082b03] font-bold flex items-center gap-1 hover:underline">
            <span>Calendar</span>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <PageCornerCurl onClick={props.onNext} />
      </div>
    );
  }
);
PageBudget.displayName = 'PageBudget';

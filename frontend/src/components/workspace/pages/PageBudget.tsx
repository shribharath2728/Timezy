import React, { useState } from 'react';
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
    const [items, setItems] = useState<BudgetItem[]>(props.plan.budgetItems);
    const [newItemName, setNewItemName] = useState('');
    const [newItemCost, setNewItemCost] = useState('');
    const [showAdd, setShowAdd] = useState(false);

    const totalSpent = items.reduce((acc, it) => acc + (it.actualCost || 0), 0);
    const balance = props.plan.budget - totalSpent;

    const handleAddItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemName.trim() || !newItemCost) return;
      const cost = parseFloat(newItemCost) || 0;
      const updated: BudgetItem[] = [
        ...items,
        {
          id: `b-${Date.now()}`,
          category: 'Catering & Dining',
          name: newItemName.trim(),
          estimatedCost: cost,
          actualCost: cost,
          paymentStatus: 'paid',
        }
      ];
      setItems(updated);
      props.onUpdatePlan({ ...props.plan, budgetItems: updated });
      setNewItemName('');
      setNewItemCost('');
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
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#082b03] text-white flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </button>
          </div>

          {/* Quick Balance Pill Card */}
          <div className="p-3.5 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0] flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono text-[#5e7264] uppercase block">Remaining Balance</span>
              <span className="text-lg font-bold text-[#082b03]">₹{balance.toLocaleString('en-IN')}</span>
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
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#bad4b6] focus:outline-none text-[#082b03]"
                required
              />
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Cost in ₹" 
                  value={newItemCost}
                  onChange={(e) => setNewItemCost(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#bad4b6] focus:outline-none text-[#082b03]"
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
            {items.map((it) => (
              <div key={it.id} className="p-3 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0] flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-[#082b03] block">{it.name}</span>
                  <span className="text-[10px] text-[#5e7264] font-mono">{it.category}</span>
                </div>
                <span className="font-bold text-[#082b03] bg-white px-2.5 py-1 rounded-full border border-[#e0ece0]">
                  ₹{(it.actualCost || it.estimatedCost).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Flip Footer */}
        <div className="pt-3 border-t border-[#e0ece0] flex items-center justify-between text-xs text-[#5e7264] pr-12">
          <button type="button" onClick={props.onPrev} className="text-[#5e7264] hover:text-[#082b03] flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Summary</span>
          </button>
          <span className="font-medium">Budget</span>
          <button type="button" onClick={props.onNext} className="text-[#082b03] font-bold flex items-center gap-1 hover:underline">
            <span>Calendar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3D Corner Curl Affordance matching Image 2 */}
        <PageCornerCurl onClick={props.onNext} />
      </div>
    );
  }
);
PageBudget.displayName = 'PageBudget';

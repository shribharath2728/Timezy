import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, AlertCircle, DollarSign } from 'lucide-react';
import { BudgetItem, EventPlan, PaymentStatus } from '../types';

interface BudgetPlannerTabProps {
  plan: EventPlan;
  onUpdateBudgetItems: (items: BudgetItem[]) => void;
  onUpdateTotalBudget: (newBudget: number) => void;
}

const DEFAULT_CATEGORIES = [
  'Mandap, Stage & Venue',
  'Halwai, Catering & Chaat',
  'Shringar, Sherwani & Lehengas',
  'Photography & Drone Cinema',
  'Purohit & Puja Samagri',
  'Mehendi & Bridal Makeover',
  'DJ, Dhol & Sangeet',
  'Return Gifts & Shagun',
  'Barati Transport & Lodging',
  'Emergency & Contingency',
];

export const BudgetPlannerTab: React.FC<BudgetPlannerTabProps> = ({
  plan,
  onUpdateBudgetItems,
  onUpdateTotalBudget,
}) => {
  const [items, setItems] = useState<BudgetItem[]>(plan.budgetItems);
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalBudgetInput, setTotalBudgetInput] = useState(plan.budget.toString());

  // Add Item modal state
  const [isAdding, setIsAdding] = useState(false);
  const [newItemCategory, setNewItemCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemEstCost, setNewItemEstCost] = useState('');
  const [newItemActCost, setNewItemActCost] = useState('0');
  const [newItemStatus, setNewItemStatus] = useState<PaymentStatus>('unpaid');
  const [newItemNotes, setNewItemNotes] = useState('');

  // Editing existing item
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editEstCost, setEditEstCost] = useState('');
  const [editActCost, setEditActCost] = useState('');
  const [editStatus, setEditStatus] = useState<PaymentStatus>('unpaid');
  const [editNotes, setEditNotes] = useState('');

  // Category filter
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Calculations
  const totalPlanned = plan.budget;
  const totalEstimated = items.reduce((acc, it) => acc + (it.estimatedCost || 0), 0);
  const totalActual = items.reduce((acc, it) => acc + (it.actualCost || 0), 0);
  const remainingBudget = totalPlanned - totalActual;
  const isOverBudget = totalActual > totalPlanned;

  // Filtered items
  const filteredItems = selectedCategoryFilter === 'all'
    ? items
    : items.filter((it) => it.category === selectedCategoryFilter);

  // Category distribution
  const categoryTotals = DEFAULT_CATEGORIES.map((cat) => {
    const total = items
      .filter((it) => it.category === cat)
      .reduce((sum, it) => sum + (it.actualCost || it.estimatedCost || 0), 0);
    return { category: cat, total };
  }).filter((c) => c.total > 0);

  const handleSaveTotalBudget = () => {
    const val = parseFloat(totalBudgetInput);
    if (!isNaN(val) && val > 0) {
      onUpdateTotalBudget(val);
    }
    setEditingTotal(false);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: BudgetItem = {
      id: `b-${Date.now()}`,
      category: newItemCategory,
      name: newItemName.trim(),
      estimatedCost: parseFloat(newItemEstCost) || 0,
      actualCost: parseFloat(newItemActCost) || 0,
      paymentStatus: newItemStatus,
      notes: newItemNotes.trim() || undefined,
    };

    const updated = [...items, newItem];
    setItems(updated);
    onUpdateBudgetItems(updated);

    // Reset form
    setNewItemName('');
    setNewItemEstCost('');
    setNewItemActCost('0');
    setNewItemNotes('');
    setIsAdding(false);
  };

  const startEditItem = (item: BudgetItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditEstCost(item.estimatedCost.toString());
    setEditActCost(item.actualCost.toString());
    setEditStatus(item.paymentStatus);
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = (id: string) => {
    const updated = items.map((it) => {
      if (it.id === id) {
        return {
          ...it,
          name: editName.trim() || it.name,
          category: editCategory || it.category,
          estimatedCost: parseFloat(editEstCost) || 0,
          actualCost: parseFloat(editActCost) || 0,
          paymentStatus: editStatus,
          notes: editNotes.trim() || undefined,
        };
      }
      return it;
    });
    setItems(updated);
    onUpdateBudgetItems(updated);
    setEditingId(null);
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter((it) => it.id !== id);
    setItems(updated);
    onUpdateBudgetItems(updated);
  };

  return (
    <div className="space-y-8 animate-fade-up">
      
      {/* Top Budget Balance Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        {/* Total Planned */}
        <div className="bg-[rgba(255,255,255,0.04)]/95 backdrop-blur-xs border border-[rgba(201,168,76,0.22)] p-4 rounded-md  shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#9C9080] font-mono uppercase mb-1">
            <span>Planned Budget</span>
            <button
              onClick={() => setEditingTotal(!editingTotal)}
              className="text-[#C9A84C] hover:text-[#F5EFE0] underline text-[10px]"
            >
              {editingTotal ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editingTotal ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-serif text-[#9C9080]">₹</span>
              <input
                type="number"
                value={totalBudgetInput}
                onChange={(e) => setTotalBudgetInput(e.target.value)}
                className="w-full input-dark focus:outline-none"
              />
              <button
                onClick={handleSaveTotalBudget}
                className="p-1 rounded bg-[#A45564] text-[#FEFBF8]"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="font-serif text-2xl text-[#F5EFE0]">
              ${totalPlanned.toLocaleString('en-IN')}
            </div>
          )}
          <span className="text-[11px] text-[#9C9080] mt-1 block font-mono">
            Target Allocation
          </span>
        </div>

        {/* Estimated Expenses */}
        <div className="bg-[rgba(255,255,255,0.04)]/95 backdrop-blur-xs border border-[rgba(201,168,76,0.22)] p-4 rounded-md  shadow-xs">
          <div className="text-xs text-[#9C9080] font-mono uppercase mb-1">
            Estimated Total
          </div>
          <div className="font-serif text-2xl text-[#F5EFE0]">
            ${totalEstimated.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#9C9080] mt-1 block font-mono">
            {items.length} Expense Items
          </span>
        </div>

        {/* Actual Expenses */}
        <div className="bg-[rgba(255,255,255,0.04)]/95 backdrop-blur-xs border border-[rgba(201,168,76,0.22)] p-4 rounded-md  shadow-xs">
          <div className="text-xs text-[#9C9080] font-mono uppercase mb-1">
            Actual Paid / Booked
          </div>
          <div className="font-serif text-2xl text-[#F5EFE0]">
            ${totalActual.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#9C9080] mt-1 block font-mono">
            {totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0}% of planned
          </span>
        </div>

        {/* Remaining Balance */}
        <div className={`p-4 rounded-xl border  shadow-xs ${
          isOverBudget ? 'bg-[rgba(201,168,76,0.08)] border-[#C5A5B0]' : 'bg-[rgba(255,255,255,0.04)]/95 border-[rgba(201,168,76,0.22)]'
        }`}>
          <div className="flex items-center justify-between text-xs text-[#9C9080] font-mono uppercase mb-1">
            <span>Bachi Hui Rashi</span>
            {isOverBudget && <AlertCircle className="w-3.5 h-3.5 text-[#8E4453]" />}
          </div>
          <div className={`font-serif text-2xl ${isOverBudget ? 'text-[#8E4453]' : 'text-[#C9A84C]'}`}>
            ${remainingBudget.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#9C9080] mt-1 block font-mono">
            {isOverBudget ? 'Hisaab-Kitaab & Budget exceeded' : 'Available buffer'}
          </span>
        </div>

      </div>

      {/* Subtle Horizontal Progress Indicator & Category Breakdown */}
      <div className="bg-[rgba(255,255,255,0.04)]/95 backdrop-blur-xs border border-[rgba(201,168,76,0.22)] p-4 sm:p-5 rounded-md  shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs text-[#9C9080] font-mono">
          <span>Budget Utilization</span>
          <span>${totalActual.toLocaleString('en-IN')} / ${totalPlanned.toLocaleString('en-IN')}</span>
        </div>
        <div className="w-full bg-[rgba(201,168,76,0.08)] h-2 rounded-full overflow-hidden border border-[rgba(201,168,76,0.22)]/50">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-[#C5A5B0]' : 'bg-[#A45564]'}`}
            style={{ width: `${Math.min(100, (totalActual / totalPlanned) * 100)}%` }}
          />
        </div>

        {/* Category Allocation Chips */}
        {categoryTotals.length > 0 && (
          <div className="pt-2 border-t border-[rgba(201,168,76,0.22)]/60 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-[#9C9080] uppercase tracking-wider mr-1">
              Ledger Share:
            </span>
            {categoryTotals.map((c) => {
              const pct = totalEstimated > 0 ? Math.round((c.total / totalEstimated) * 100) : 0;
              return (
                <span
                  key={c.category}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] text-[#F5EFE0]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A45564]" />
                  <span>{c.category}:</span>
                  <span className="text-[#C9A84C] font-medium">${c.total.toLocaleString('en-IN')} ({pct}%)</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Expense Items Table Section */}
      <div className="glass-card rounded-xl p-6 ">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[rgba(201,168,76,0.22)]">
          <div>
            <h3 className="font-serif text-lg text-[#F5EFE0] font-normal">
              Itemized Event Expenses
            </h3>
            <p className="text-xs text-[#9C9080] mt-0.5">
              Organized by category with estimated and Asli Kharchas.
            </p>
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 rounded bg-[#A45564] hover:bg-[#8E4453] text-[#FEFBF8] text-xs font-sans flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-mono uppercase text-[#9C9080] mr-1">Filter:</span>
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              selectedCategoryFilter === 'all'
                ? 'bg-[#A45564] text-[#FEFBF8] font-medium'
                : 'bg-[rgba(255,255,255,0.04)] text-[#9C9080] border border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.65)]'
            }`}
          >
            All ({items.length})
          </button>
          {DEFAULT_CATEGORIES.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                type="button"
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  selectedCategoryFilter === cat
                    ? 'bg-[#A45564] text-[#FEFBF8] font-medium'
                    : 'bg-[rgba(255,255,255,0.04)] text-[#9C9080] border border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.65)]'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Add Item Inline Form */}
        {isAdding && (
          <form onSubmit={handleAddItem} className="mb-6 p-4 rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] space-y-3">
            <div className="text-xs font-mono uppercase text-[#9C9080]">New Expense Entry</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-[#9C9080] mb-1">Expense Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Photography 4-hour candid session"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] px-2.5 py-1.5 rounded text-xs text-[#F5EFE0] focus:outline-none focus:border-[rgba(201,168,76,0.65)]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#9C9080] mb-1">Category</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] px-2.5 py-1.5 rounded text-xs text-[#F5EFE0] focus:outline-none focus:border-[rgba(201,168,76,0.65)]"
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#9C9080] mb-1">Status</label>
                <select
                  value={newItemStatus}
                  onChange={(e) => setNewItemStatus(e.target.value as PaymentStatus)}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] px-2.5 py-1.5 rounded text-xs text-[#F5EFE0] focus:outline-none focus:border-[rgba(201,168,76,0.65)]"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#9C9080] mb-1">Anumaanit Kharcha (?)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newItemEstCost}
                  onChange={(e) => setNewItemEstCost(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] px-2.5 py-1.5 rounded text-xs text-[#F5EFE0] focus:outline-none focus:border-[rgba(201,168,76,0.65)]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#9C9080] mb-1">Asli Kharcha (?)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newItemActCost}
                  onChange={(e) => setNewItemActCost(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] px-2.5 py-1.5 rounded text-xs text-[#F5EFE0] focus:outline-none focus:border-[rgba(201,168,76,0.65)]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#9C9080] mb-1">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="Vendor name or details"
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] px-2.5 py-1.5 rounded text-xs text-[#F5EFE0] focus:outline-none focus:border-[rgba(201,168,76,0.65)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 rounded bg-[rgba(201,168,76,0.08)] text-xs text-[#9C9080] hover:bg-[#DEC8CF]/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded bg-[#A45564] text-xs text-[#FEFBF8] hover:bg-[#8E4453]"
              >
                Add Item
              </button>
            </div>
          </form>
        )}

        {/* Expenses List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[rgba(201,168,76,0.22)] text-[#9C9080] font-mono uppercase text-[11px]">
                <th className="py-2.5 px-3">Expense</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Estimated</th>
                <th className="py-2.5 px-3 text-right">Actual</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEC8CF]/60 font-sans">
              {filteredItems.map((it) => {
                const isEditing = editingId === it.id;

                if (isEditing) {
                  return (
                    <tr key={it.id} className="bg-[rgba(255,255,255,0.04)]">
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] px-2 py-1 rounded text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] px-2 py-1 rounded text-xs"
                        >
                          {DEFAULT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          value={editEstCost}
                          onChange={(e) => setEditEstCost(e.target.value)}
                          className="w-20 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] px-2 py-1 rounded text-xs text-right"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          value={editActCost}
                          onChange={(e) => setEditActCost(e.target.value)}
                          className="w-20 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] px-2 py-1 rounded text-xs text-right"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as PaymentStatus)}
                          className="bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] px-2 py-1 rounded text-xs"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="partial">Partial</option>
                          <option value="paid">Paid</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        <button
                          onClick={() => handleSaveEdit(it.id)}
                          className="p-1 text-[#C9A84C] hover:text-[#F5EFE0]"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-[#9C9080]"
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={it.id} className="hover:bg-[rgba(255,255,255,0.04)]/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-serif text-[#F5EFE0] font-normal">{it.name}</div>
                      {it.notes && (
                        <span className="text-[11px] text-[#9C9080] italic">{it.notes}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#9C9080]">{it.category}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#9C9080]">
                      ${it.estimatedCost.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-[#F5EFE0]">
                      ${it.actualCost.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        it.paymentStatus === 'paid'
                          ? 'bg-[#A45564]/15 text-[#C9A84C] border-[rgba(201,168,76,0.65)]/30'
                          : it.paymentStatus === 'partial'
                          ? 'bg-[#C5A5B0]/20 text-[#9C9080] border-[#C5A5B0]/40'
                          : 'bg-[rgba(201,168,76,0.08)] text-[#9C9080] border-[rgba(201,168,76,0.22)]'
                      }`}>
                        {it.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => startEditItem(it)}
                        className="p-1 text-[#9C9080] hover:text-[#F5EFE0]"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(it.id)}
                        className="p-1 text-[#C5A5B0] hover:text-[#8E4453]"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};


import React, { useState } from 'react';
import { 
  CheckSquare, 
  Users, 
  Plus, 
  Check, 
  Trash2, 
  Edit2, 
  Filter, 
  Phone, 
  Mail, 
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { ChecklistItem, EventPlan, Vendor, VendorStatus } from '../types';

interface ChecklistAndVendorsTabProps {
  plan: EventPlan;
  onUpdateChecklist: (items: ChecklistItem[]) => void;
  onUpdateVendors: (vendors: Vendor[]) => void;
  initialSubSection?: 'checklist' | 'vendors';
}

const CHECKLIST_CATEGORIES = [
  'Venue and logistics',
  'Guests and invitations',
  'Food and catering',
  'Decorations and setup',
  'Vendors and payments',
  'Personal preparations',
  'Event-day essentials',
];

const VENDOR_CATEGORIES = [
  'Catering',
  'Photography',
  'Venue',
  'Decoration',
  'Makeup',
  'Entertainment',
  'Transportation',
  'Other',
];

const VENDOR_STATUSES: VendorStatus[] = [
  'To Contact',
  'Awaiting Response',
  'Quotation Received',
  'Booked',
  'Advance Paid',
  'Completed',
];

export const ChecklistAndVendorsTab: React.FC<ChecklistAndVendorsTabProps> = ({
  plan,
  onUpdateChecklist,
  onUpdateVendors,
  initialSubSection = 'checklist',
}) => {
  const [subSection, setSubSection] = useState<'checklist' | 'vendors'>(initialSubSection);

  // Checklist State
  const [checklist, setChecklist] = useState<ChecklistItem[]>(plan.checklistItems);
  const [checklistFilter, setChecklistFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [newChecklistCategory, setNewChecklistCategory] = useState(CHECKLIST_CATEGORIES[0]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  // Vendor State
  const [vendors, setVendors] = useState<Vendor[]>(plan.vendors);
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  const [vName, setVName] = useState('');
  const [vCategory, setVCategory] = useState(VENDOR_CATEGORIES[0]);
  const [vContact, setVContact] = useState('');
  const [vQuoted, setVQuoted] = useState('');
  const [vAdvance, setVAdvance] = useState('0');
  const [vStatus, setVStatus] = useState<VendorStatus>('To Contact');
  const [vNotes, setVNotes] = useState('');

  // Checklist calculations
  const totalChecklist = checklist.length;
  const completedChecklist = checklist.filter((c) => c.completed).length;
  const checklistProgress = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  // Filter checklist
  const filteredChecklist = checklist.filter((item) => {
    if (checklistFilter === 'pending') return !item.completed;
    if (checklistFilter === 'completed') return item.completed;
    return true;
  });

  const toggleChecklist = (id: string) => {
    const updated = checklist.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c));
    setChecklist(updated);
    onUpdateChecklist(updated);
  };

  const deleteChecklistItem = (id: string) => {
    const updated = checklist.filter((c) => c.id !== id);
    setChecklist(updated);
    onUpdateChecklist(updated);
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;

    const newItem: ChecklistItem = {
      id: `c-${Date.now()}`,
      category: newChecklistCategory,
      title: newChecklistTitle.trim(),
      completed: false,
    };

    const updated = [...checklist, newItem];
    setChecklist(updated);
    onUpdateChecklist(updated);
    setNewChecklistTitle('');
    setIsAddingChecklist(false);
  };

  // Vendor handlers
  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName.trim()) return;

    const quoted = parseFloat(vQuoted) || 0;
    const advance = parseFloat(vAdvance) || 0;
    const remaining = Math.max(0, quoted - advance);

    if (editingVendorId) {
      const updated = vendors.map((v) => {
        if (v.id === editingVendorId) {
          return {
            ...v,
            name: vName.trim(),
            category: vCategory,
            contactInfo: vContact.trim(),
            quotedPrice: quoted,
            advancePayment: advance,
            remainingPayment: remaining,
            status: vStatus,
            notes: vNotes.trim() || undefined,
          };
        }
        return v;
      });
      setVendors(updated);
      onUpdateVendors(updated);
      setEditingVendorId(null);
    } else {
      const newVendor: Vendor = {
        id: `v-${Date.now()}`,
        name: vName.trim(),
        category: vCategory,
        contactInfo: vContact.trim(),
        quotedPrice: quoted,
        advancePayment: advance,
        remainingPayment: remaining,
        status: vStatus,
        notes: vNotes.trim() || undefined,
      };
      const updated = [...vendors, newVendor];
      setVendors(updated);
      onUpdateVendors(updated);
    }

    // Reset
    setVName('');
    setVContact('');
    setVQuoted('');
    setVAdvance('0');
    setVNotes('');
    setIsAddingVendor(false);
  };

  const startEditVendor = (v: Vendor) => {
    setEditingVendorId(v.id);
    setVName(v.name);
    setVCategory(v.category);
    setVContact(v.contactInfo);
    setVQuoted(v.quotedPrice.toString());
    setVAdvance(v.advancePayment.toString());
    setVStatus(v.status);
    setVNotes(v.notes || '');
    setIsAddingVendor(true);
  };

  const deleteVendor = (id: string) => {
    const updated = vendors.filter((v) => v.id !== id);
    setVendors(updated);
    onUpdateVendors(updated);
  };

  return (
    <div className="space-y-8 animate-fade-up">
      
      {/* Sub-navigation pill bar */}
      <div className="flex items-center justify-between border-b border-[rgba(201,168,76,0.22)] pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubSection('checklist')}
            className={`px-4 py-2 rounded text-xs font-serif tracking-wide transition-all flex items-center gap-2 ${
              subSection === 'checklist'
                ? 'bg-[#A45564] text-[#FEFBF8] font-medium shadow-2xs'
                : 'bg-[rgba(255,255,255,0.04)]/95 text-[#9C9080] hover:bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.22)]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Interactive Checklist ({completedChecklist}/{totalChecklist})</span>
          </button>

          <button
            onClick={() => setSubSection('vendors')}
            className={`px-4 py-2 rounded text-xs font-serif tracking-wide transition-all flex items-center gap-2 ${
              subSection === 'vendors'
                ? 'bg-[#A45564] text-[#FEFBF8] font-medium shadow-2xs'
                : 'bg-[rgba(255,255,255,0.04)]/95 text-[#9C9080] hover:bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.22)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Vendor Arrangements ({vendors.length})</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION A: INTERACTIVE CHECKLIST                                     */}
      {/* ==================================================================== */}
      {subSection === 'checklist' && (
        <div className="space-y-6">
          {/* Checklist Summary Card */}
          <div className="glass-card rounded-xl p-6 ">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <span className="font-mono text-base text-[#C9A84C] block">Event Essentials</span>
                <h3 className="font-serif text-xl text-[#F5EFE0] font-normal">Checklist Registry</h3>
                <p className="text-xs text-[#9C9080] mt-0.5">
                  {completedChecklist} of {totalChecklist} tasks completed ({checklistProgress}%)
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Filter buttons */}
                <div className="flex items-center bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.22)] rounded p-0.5 text-xs">
                  <button
                    onClick={() => setChecklistFilter('all')}
                    className={`px-2.5 py-1 rounded text-[11px] ${checklistFilter === 'all' ? 'bg-[rgba(255,255,255,0.04)] text-[#F5EFE0] font-medium shadow-2xs' : 'text-[#9C9080]'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setChecklistFilter('pending')}
                    className={`px-2.5 py-1 rounded text-[11px] ${checklistFilter === 'pending' ? 'bg-[rgba(255,255,255,0.04)] text-[#F5EFE0] font-medium shadow-2xs' : 'text-[#9C9080]'}`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setChecklistFilter('completed')}
                    className={`px-2.5 py-1 rounded text-[11px] ${checklistFilter === 'completed' ? 'bg-[rgba(255,255,255,0.04)] text-[#F5EFE0] font-medium shadow-2xs' : 'text-[#9C9080]'}`}
                  >
                    Done
                  </button>
                </div>

                <button
                  onClick={() => setIsAddingChecklist(!isAddingChecklist)}
                  className="px-3 py-1.5 rounded bg-[#A45564] text-[#FEFBF8] text-xs font-sans flex items-center gap-1.5 hover:bg-[#8E4453] transition-all shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            {/* Horizontal progress bar */}
            <div className="w-full bg-[rgba(201,168,76,0.08)] h-2 rounded-full overflow-hidden border border-[rgba(201,168,76,0.22)]/50">
              <div 
                className="h-full progress-fill rounded-full transition-all duration-500"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
          </div>

          {/* Add Checklist Item Form */}
          {isAddingChecklist && (
            <form onSubmit={handleAddChecklistItem} className="p-4 rounded bg-[rgba(255,255,255,0.04)]/95 border border-[rgba(201,168,76,0.22)] space-y-3  shadow-xs">
              <div className="text-xs font-mono uppercase text-[#9C9080]">New Checklist Task</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-[#9C9080] mb-1">Task Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Verify catering ice & bar supplies"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    className="w-full input-dark focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#9C9080] mb-1">Category</label>
                  <select
                    value={newChecklistCategory}
                    onChange={(e) => setNewChecklistCategory(e.target.value)}
                    className="w-full input-dark focus:outline-none"
                  >
                    {CHECKLIST_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingChecklist(false)}
                  className="px-3 py-1 rounded bg-[rgba(201,168,76,0.08)] text-xs text-[#9C9080] hover:bg-[#DEC8CF]/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 rounded bg-[#A45564] text-xs text-[#FEFBF8] hover:bg-[#8E4453]"
                >
                  Save Task
                </button>
              </div>
            </form>
          )}

          {/* Grouped Checklist Display */}
          <div className="space-y-5">
            {CHECKLIST_CATEGORIES.map((cat) => {
              const categoryItems = filteredChecklist.filter((c) => c.category === cat);
              if (categoryItems.length === 0) return null;

              return (
                <div key={cat} className="glass-card rounded-xl p-5 ">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[rgba(201,168,76,0.22)]">
                    <h4 className="font-serif text-sm sm:text-base text-[#F5EFE0] font-normal flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#A45564]" />
                      <span>{cat}</span>
                    </h4>
                    <span className="text-[10px] font-mono text-[#9C9080]">
                      {categoryItems.filter((i) => i.completed).length} / {categoryItems.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded border transition-all flex items-center justify-between gap-3 ${
                          item.completed 
                            ? 'bg-[rgba(255,255,255,0.04)]/40 border-[rgba(201,168,76,0.22)]/60 opacity-60' 
                            : 'bg-[rgba(255,255,255,0.04)] border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.65)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleChecklist(item.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              item.completed
                                ? 'bg-[#A45564] border-[rgba(201,168,76,0.65)] text-[#FEFBF8]'
                                : 'bg-[rgba(255,255,255,0.04)] border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.65)]'
                            }`}
                            aria-label={`Toggle checklist item: ${item.title}`}
                          >
                            {item.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </button>

                          <span className={`text-xs font-serif ${item.completed ? 'line-through text-[#9C9080]' : 'text-[#F5EFE0]'}`}>
                            {item.title}
                          </span>
                        </div>

                        <button
                          onClick={() => deleteChecklistItem(item.id)}
                          className="text-[#C5A5B0] hover:text-[#8E4453] p-1"
                          title="Delete checklist item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION B: VENDOR MANAGEMENT                                         */}
      {/* ==================================================================== */}
      {subSection === 'vendors' && (
        <div className="space-y-6">
          {/* Vendor Summary Header */}
          <div className="glass-card rounded-xl p-6   flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <span className="font-mono text-base text-[#C9A84C] block">Arrangements &amp; Partners</span>
              <h3 className="font-serif text-xl text-[#F5EFE0] font-normal">Vendor Roster</h3>
              <p className="text-xs text-[#9C9080] mt-0.5">
                Track quoted rates, booking confirmations, and pending balances.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingVendorId(null);
                setVName('');
                setVContact('');
                setVQuoted('');
                setVAdvance('0');
                setVNotes('');
                setIsAddingVendor(!isAddingVendor);
              }}
              className="px-3 py-1.5 rounded bg-[#A45564] text-[#FEFBF8] text-xs font-sans flex items-center gap-1.5 hover:bg-[#8E4453] transition-all shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Naya Vendor Jodein</span>
            </button>
          </div>

          {/* Add / Edit Vendor Modal/Inline Form */}
          {isAddingVendor && (
            <form onSubmit={handleSaveVendor} className="p-5 rounded-md bg-[rgba(255,255,255,0.04)]/95 border border-[rgba(201,168,76,0.22)] space-y-4  shadow-xs">
              <div className="text-xs font-mono uppercase text-[#9C9080]">
                {editingVendorId ? 'Edit Vendor Details' : 'New Vendor Record'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-[#9C9080] mb-1">Vendor / Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lumina Sound & Acoustic Engineering"
                    value={vName}
                    onChange={(e) => setVName(e.target.value)}
                    className="w-full input-dark focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#9C9080] mb-1">Category</label>
                  <select
                    value={vCategory}
                    onChange={(e) => setVCategory(e.target.value)}
                    className="w-full input-dark focus:outline-none"
                  >
                    {VENDOR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-[#9C9080] mb-1">Contact Info</label>
                  <input
                    type="text"
                    placeholder="Email or phone number"
                    value={vContact}
                    onChange={(e) => setVContact(e.target.value)}
                    className="w-full input-dark focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#9C9080] mb-1">Quoted Price (?)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={vQuoted}
                    onChange={(e) => setVQuoted(e.target.value)}
                    className="w-full input-dark focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#9C9080] mb-1">Advance Paid (?)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={vAdvance}
                    onChange={(e) => setVAdvance(e.target.value)}
                    className="w-full input-dark focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#9C9080] mb-1">Booking Status</label>
                  <select
                    value={vStatus}
                    onChange={(e) => setVStatus(e.target.value as VendorStatus)}
                    className="w-full input-dark focus:outline-none"
                  >
                    {VENDOR_STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[#9C9080] mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="Deliverables or agreement details"
                    value={vNotes}
                    onChange={(e) => setVNotes(e.target.value)}
                    className="w-full input-dark focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingVendor(false)}
                  className="px-3 py-1 rounded bg-[rgba(201,168,76,0.08)] text-xs text-[#9C9080] hover:bg-[#DEC8CF]/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 rounded bg-[#A45564] text-xs text-[#FEFBF8] hover:bg-[#8E4453]"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          )}

          {/* Vendor Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendors.map((v) => (
              <div
                key={v.id}
                className="glass-card rounded-xl p-5   flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-serif text-base text-[#F5EFE0] font-normal">
                        {v.name}
                      </h4>
                      <span className="text-[11px] font-mono text-[#C9A84C]">
                        {v.category}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      v.status === 'Booked'
                        ? 'bg-[#A45564]/15 text-[#C9A84C] border-[rgba(201,168,76,0.65)]/30 font-medium'
                        : v.status === 'Completed'
                        ? 'bg-[rgba(201,168,76,0.08)] text-[#F5EFE0] border-[rgba(201,168,76,0.22)]'
                        : 'bg-[rgba(255,255,255,0.04)] text-[#9C9080] border-[rgba(201,168,76,0.22)]'
                    }`}>
                      {v.status}
                    </span>
                  </div>

                  {v.contactInfo && (
                    <p className="text-xs text-[#9C9080] font-mono mb-2">
                      {v.contactInfo}
                    </p>
                  )}

                  {v.notes && (
                    <p className="text-xs text-[#9C9080] italic font-serif mb-3">
                      "{v.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[rgba(201,168,76,0.22)]/80 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 font-mono text-[11px]">
                    <div className="text-[#9C9080]">
                      Quoted: <span className="text-[#F5EFE0]">${v.quotedPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-[#9C9080]">
                      Remaining: <span className="text-[#C9A84C] font-medium">${v.remainingPayment.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => startEditVendor(v)}
                      className="p-1.5 text-[#9C9080] hover:text-[#F5EFE0] rounded hover:bg-[rgba(201,168,76,0.08)]"
                      title="Edit Vendor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteVendor(v.id)}
                      className="p-1.5 text-[#C5A5B0] hover:text-[#8E4453] rounded hover:bg-[rgba(201,168,76,0.08)]"
                      title="Delete Vendor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};


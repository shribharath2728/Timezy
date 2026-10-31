import React, { useState, useEffect } from 'react';
import { CheckCircle2, ChevronLeft, Sparkles, Plus, X } from 'lucide-react';
import { ChecklistItem, EventPlan } from '../../../types';

// PAGE 4: Checklist & Final Notes
export const PageChecklist = React.forwardRef<HTMLDivElement, {
  plan: EventPlan;
  onPrev: () => void;
  onUpdatePlan: (plan: EventPlan) => void;
  onOpenAi: () => void;
}>(
  (props, ref) => {
    // Sync local state when the plan prop changes (e.g. AI assistant adds a checklist item)
    const [tasks, setTasks] = useState<ChecklistItem[]>(props.plan.checklistItems);
    const [showAdd, setShowAdd] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskCategory, setNewTaskCategory] = useState('General');

    // Keep local tasks in sync whenever the parent plan updates externally
    useEffect(() => {
      setTasks(props.plan.checklistItems);
    }, [props.plan.checklistItems]);

    const completedCount = tasks.filter((t) => t.completed).length;
    const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    const toggleTask = (id: string) => {
      const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      setTasks(updated);
      props.onUpdatePlan({ ...props.plan, checklistItems: updated });
    };

    const handleAddTask = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTaskTitle.trim()) return;
      const newItem: ChecklistItem = {
        id: `chk-${Date.now()}`,
        category: newTaskCategory,
        title: newTaskTitle.trim(),
        completed: false,
      };
      const updated = [...tasks, newItem];
      setTasks(updated);
      props.onUpdatePlan({ ...props.plan, checklistItems: updated });
      setNewTaskTitle('');
      setNewTaskCategory('General');
      setShowAdd(false);
    };

    return (
      <div ref={ref} className="page-container relative p-5 sm:p-6 pb-8 flex flex-col justify-between bg-[#fbfdfa] text-[#082b03]">
        <div className="flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#5e7264] block">
                Task Management
              </span>
              <h2 className="text-xl font-bold text-[#082b03]">
                Checklist &amp; Vendors
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(!showAdd)}
                aria-expanded={showAdd}
                aria-label="Add checklist task"
                className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-[#082b03] text-white flex items-center gap-1 shadow-sm hover:bg-[#1a4a0a] transition-colors"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={props.onOpenAi}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#e6f2e2] text-[#082b03] border border-[#d2e5ce] flex items-center gap-1.5 cursor-pointer hover:bg-[#d5ebd0] transition-colors"
              >
                <Sparkles className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                <span>AI Advice</span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-3 shrink-0">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#5e7264] mb-1">
              <span>{completedCount}/{tasks.length} done</span>
              <span>{progressPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#e0ece0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#082b03] rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>

          {/* Add Task Form */}
          {showAdd && (
            <form onSubmit={handleAddTask} className="p-3 mb-3 rounded-2xl bg-[#e6f2e2] border border-[#d2e5ce] space-y-2 text-xs shrink-0">
              <div className="flex items-center justify-between font-bold text-[#082b03]">
                <span>New Task</span>
                <button type="button" onClick={() => setShowAdd(false)} aria-label="Close add task form">
                  <X className="w-3.5 h-3.5 text-[#5e7264]" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Task title (e.g. Confirm caterer)"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                aria-label="Task title"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#bad4b6] focus:outline-none focus:border-[#082b03] text-[#082b03]"
                required
              />
              <input
                type="text"
                placeholder="Category (e.g. Catering)"
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value)}
                aria-label="Task category"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#bad4b6] focus:outline-none focus:border-[#082b03] text-[#082b03]"
              />
              <div className="flex justify-end">
                <button type="submit" className="timezy-btn-dark px-3 py-1.5 text-xs rounded-lg">
                  Add Task
                </button>
              </div>
            </form>
          )}

          {/* ALL checklist items — scrollable, no slice(0,5) truncation */}
          <div className="overflow-y-auto flex-1 space-y-1.5 mb-3 pr-0.5" style={{ maxHeight: '220px' }}>
            {tasks.length === 0 && (
              <p className="text-xs text-[#5e7264] text-center py-4">
                No tasks yet. Add one above or ask the AI assistant for suggestions.
              </p>
            )}
            {tasks.map((t) => (
              <div
                key={t.id}
                onClick={() => toggleTask(t.id)}
                role="checkbox"
                aria-checked={t.completed}
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleTask(t.id)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                  t.completed
                    ? 'bg-[#f4f8f2] border-[#d2e5ce] text-[#5e7264]'
                    : 'bg-[#f4f8f2] border-[#e0ece0] hover:border-[#bad4b6]'
                }`}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                  t.completed ? 'bg-[#082b03] border-[#082b03] text-white' : 'border-[#5e7264]'
                }`}>
                  {t.completed && <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                </div>
                <div className="min-w-0">
                  <span className={`text-xs font-medium leading-snug block truncate ${t.completed ? 'line-through' : ''}`}>
                    {t.title}
                  </span>
                  {t.category && (
                    <span className="text-[10px] text-[#5e7264] font-mono">{t.category}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Vendors Box */}
          <div className="p-3 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0] mb-2 shadow-2xs shrink-0">
            <span className="text-xs font-bold text-[#082b03] block mb-1.5">Booked Vendors</span>
            {props.plan.vendors.length === 0 ? (
              <p className="text-[10px] text-[#5e7264]">No vendors booked yet.</p>
            ) : (
              <div className="space-y-1">
                {props.plan.vendors.slice(0, 4).map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#082b03] truncate">{v.name}</span>
                    <span className="font-mono text-[11px] text-[#5e7264] font-semibold shrink-0 pl-2">
                      ₹{v.quotedPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                {props.plan.vendors.length > 4 && (
                  <p className="text-[10px] text-[#5e7264]">+{props.plan.vendors.length - 4} more vendors</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Flip Footer */}
        <div className="pt-2.5 border-t border-[#e0ece0] flex items-center justify-between text-xs text-[#5e7264] shrink-0">
          <button type="button" onClick={props.onPrev} className="text-[#5e7264] hover:text-[#082b03] flex items-center gap-1 cursor-pointer">
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Calendar</span>
          </button>
          <span className="font-medium text-[#5e7264]">Checklist</span>
          <span className="text-[#082b03] font-bold">End of Book</span>
        </div>
      </div>
    );
  }
);
PageChecklist.displayName = 'PageChecklist';

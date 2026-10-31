import React, { useState } from 'react';
import { CheckCircle2, ChevronLeft, Sparkles } from 'lucide-react';
import { ChecklistItem, EventPlan } from '../../../types';

// PAGE 4: Checklist & Final Notes
export const PageChecklist = React.forwardRef<HTMLDivElement, { 
  plan: EventPlan; 
  onPrev: () => void; 
  onUpdatePlan: (plan: EventPlan) => void;
  onOpenAi: () => void;
}>(
  (props, ref) => {
    const [tasks, setTasks] = useState<ChecklistItem[]>(props.plan.checklistItems);

    const toggleTask = (id: string) => {
      const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      setTasks(updated);
      props.onUpdatePlan({ ...props.plan, checklistItems: updated });
    };

    return (
      <div ref={ref} className="page-container relative p-5 sm:p-6 pb-8 flex flex-col justify-between bg-[#fbfdfa] text-[#082b03]">
        <div className="overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#5e7264] block">
                Task Management
              </span>
              <h2 className="text-xl font-bold text-[#082b03]">
                Checklist &amp; Vendors
              </h2>
            </div>
            <button
              type="button"
              onClick={props.onOpenAi}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#e6f2e2] text-[#082b03] border border-[#d2e5ce] flex items-center gap-1.5 cursor-pointer hover:bg-[#d5ebd0] transition-colors"
            >
              <Sparkles className="w-3 h-3 text-emerald-700" />
              <span>AI Advice</span>
            </button>
          </div>

          {/* Streamlined checklist items so Booked Vendors card & footer are 100% visible */}
          <div className="space-y-1.5 mb-3">
            {tasks.slice(0, 5).map((t) => (
              <div 
                key={t.id}
                onClick={() => toggleTask(t.id)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                  t.completed 
                    ? 'bg-[#f4f8f2] border-[#d2e5ce] text-[#5e7264] line-through' 
                    : 'bg-[#f4f8f2] border-[#e0ece0] hover:border-[#bad4b6]'
                }`}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                  t.completed ? 'bg-[#082b03] border-[#082b03] text-white' : 'border-[#5e7264]'
                }`}>
                  {t.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-medium leading-snug">{t.title}</span>
              </div>
            ))}
          </div>

          {/* Vendors Box - Fully visible above the footer */}
          <div className="p-3 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0] mb-2 shadow-2xs">
            <span className="text-xs font-bold text-[#082b03] block mb-1.5">Booked Vendors</span>
            <div className="space-y-1">
              {props.plan.vendors.slice(0, 3).map((v) => (
                <div key={v.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#082b03] truncate">{v.name}</span>
                  <span className="font-mono text-[11px] text-[#5e7264] font-semibold">₹{v.quotedPrice.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flip Footer - Completely visible with ample padding from the bottom border */}
        <div className="pt-2.5 border-t border-[#e0ece0] flex items-center justify-between text-xs text-[#5e7264]">
          <button type="button" onClick={props.onPrev} className="text-[#5e7264] hover:text-[#082b03] flex items-center gap-1 cursor-pointer">
            <ChevronLeft className="w-3.5 h-3.5" />
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

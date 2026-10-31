import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { EventPlan, ScheduleMilestone } from '../../../types';
import { generateDaySchedule } from '../../../services/defaultPlanGenerator';
import { PageCornerCurl } from '../PageCornerCurl';

// PAGE 3: Daily Planner & Calendar (Dynamic, Context-Aware & Editable)
export const PageCalendar = React.forwardRef<HTMLDivElement, { 
  plan: EventPlan; 
  onPrev: () => void; 
  onNext: () => void;
  onUpdatePlan: (plan: EventPlan) => void;
}>(
  (props, ref) => {
    // Dynamic 7 days of the week surrounding or containing the selected event date
    const eventDateObj = new Date(props.plan.eventDate + 'T00:00:00');
    const dayOfWeek = isNaN(eventDateObj.getTime()) ? 3 : eventDateObj.getDay(); // 0 is Sunday
    const sundayDate = new Date(eventDateObj);
    sundayDate.setDate(eventDateObj.getDate() - dayOfWeek);

    const days = React.useMemo(() => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, index) => {
      const currentDay = new Date(sundayDate);
      currentDay.setDate(sundayDate.getDate() + index);
      const curIso = currentDay.toISOString().split('T')[0];
      return {
        d,
        n: currentDay.getDate(),
        dateStr: curIso,
        active: curIso === props.plan.eventDate,
      };
    }), [sundayDate, props.plan.eventDate]);

    // Dynamic schedule calculated contextually from event category, time & venue
    const initialSchedule = (props.plan.daySchedule && props.plan.daySchedule.length > 0)
      ? props.plan.daySchedule
      : generateDaySchedule(props.plan.category, props.plan.functionType, props.plan.commencementTime, props.plan.venue);

    const [milestones, setMilestones] = useState<ScheduleMilestone[]>(initialSchedule);
    const [showAdd, setShowAdd] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newTime, setNewTime] = useState('');
    const [newDuration, setNewDuration] = useState('');

    React.useEffect(() => {
      if (props.plan.daySchedule && props.plan.daySchedule.length > 0) {
        setMilestones(props.plan.daySchedule);
      } else {
        const generated = generateDaySchedule(props.plan.category, props.plan.functionType, props.plan.commencementTime, props.plan.venue);
        setMilestones(generated);
      }
    }, [props.plan.id, props.plan.category, props.plan.functionType, props.plan.commencementTime, props.plan.venue]);

    const handleAddMilestone = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTitle.trim()) return;
      const t = newTime.trim() || props.plan.commencementTime || '06:30 PM';
      const dur = newDuration.trim() || `${t} - 45 mins`;
      const newItem: ScheduleMilestone = {
        id: `ms-${Date.now()}`,
        time: t,
        title: newTitle.trim(),
        duration: dur,
        bg: 'bg-[#faf3e3]',
        border: 'border-[#f5e4bd]',
        avatar: '✨',
      };
      const updated = [...milestones, newItem];
      setMilestones(updated);
      props.onUpdatePlan({ ...props.plan, daySchedule: updated });
      setNewTitle('');
      setNewTime('');
      setNewDuration('');
      setShowAdd(false);
    };

    const handleDeleteMilestone = (id: string) => {
      const updated = milestones.filter(m => m.id !== id);
      setMilestones(updated);
      props.onUpdatePlan({ ...props.plan, daySchedule: updated });
    };

    return (
      <div ref={ref} className="page-container relative p-5 sm:p-6 pb-8 flex flex-col justify-between bg-[#fbfdfa] border-r border-[#e0ece0] text-[#082b03]">
        <div className="overflow-y-auto pr-1">
          {/* Top calendar header */}
          <div className="flex items-center justify-between mb-3">
            <span className="w-7 h-7 rounded-full bg-[#f4f8f2] flex items-center justify-center text-[#082b03]">
              <CalendarIcon className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#f4f8f2] text-[#082b03] border border-[#e0ece0]">
              {new Date(props.plan.eventDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="mb-4">
            <span className="text-xs text-[#5e7264]">Your Daily</span>
            <h2 className="text-xl font-bold text-[#082b03] leading-tight">
              Planner, Calendar.
            </h2>
          </div>

          {/* Dynamic Weekday Strip */}
          <div className="flex items-center justify-between bg-[#f4f8f2] p-2.5 rounded-2xl border border-[#e0ece0] mb-5">
            {days.map((item) => (
              <div 
                key={item.d} 
                className={`flex flex-col items-center py-1.5 px-2 rounded-xl text-center transition-all ${
                  item.active 
                    ? 'bg-[#082b03] text-white shadow-sm font-bold scale-105' 
                    : 'text-[#5e7264]'
                }`}
              >
                <span className="text-[9px] uppercase font-mono">{item.d}</span>
                <span className="text-xs mt-0.5">{item.n}</span>
              </div>
            ))}
          </div>

          {/* Schedule list with colored pills */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#082b03]">Day Schedule</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#5e7264] font-mono">{milestones.length} Milestones</span>
              <button
                type="button"
                onClick={() => setShowAdd(!showAdd)}
                className="text-[10px] font-bold text-[#082b03] bg-[#eaf3e7] hover:bg-[#d6ebd0] px-2 py-0.5 rounded-full border border-[#bad4b6] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Add Milestone Form */}
          {showAdd && (
            <form onSubmit={handleAddMilestone} className="p-3 mb-3 rounded-2xl bg-[#f4f8f2] border border-[#d6ebd0] text-xs space-y-2 animate-fade-in">
              <div className="flex items-center justify-between font-bold text-[#082b03]">
                <span>Add New Milestone</span>
                <button type="button" onClick={() => setShowAdd(false)} className="text-[#5e7264] hover:text-[#082b03]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                aria-label="Milestone Title"
                placeholder="Milestone title (e.g., Cake Cutting, Sound Check)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#bad4b6] bg-white text-xs outline-none focus:border-[#082b03]"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  aria-label="Start Time"
                  placeholder="Start Time (e.g., 07:00 PM)"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#bad4b6] bg-white text-xs outline-none focus:border-[#082b03]"
                />
                <input
                  type="text"
                  aria-label="Duration"
                  placeholder="Duration (e.g., 07:00 PM - 07:45 PM)"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#bad4b6] bg-white text-xs outline-none focus:border-[#082b03]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="px-2.5 py-1 rounded-md text-[#5e7264] hover:bg-gray-100">
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1 rounded-md bg-[#082b03] text-white font-semibold">
                  Save Milestone
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {milestones.map((sch) => (
              <div key={sch.id || sch.title} className="group flex items-start gap-3">
                <span className="text-[10px] font-mono text-[#5e7264] w-14 shrink-0 pt-2">
                  {sch.time}
                </span>
                <div className={`flex-1 p-3 rounded-2xl border ${sch.bg || 'bg-[#faf3e3]'} ${sch.border || 'border-[#f5e4bd]'} flex items-center justify-between transition-all hover:shadow-xs`}>
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <span className="text-base select-none shrink-0">{sch.avatar || '✨'}</span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#082b03] block leading-tight truncate">{sch.title}</span>
                      <span className="text-[10px] text-[#5e7264] font-mono block mt-0.5">{sch.duration}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMilestone(sch.id)}
                    title="Remove milestone"
                    aria-label="Remove milestone"
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#5e7264] hover:text-red-600 transition-opacity shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flip Footer */}
        <div className="pt-3 border-t border-[#e0ece0] flex items-center justify-between text-xs text-[#5e7264] pr-12">
          <button type="button" onClick={props.onPrev} className="text-[#5e7264] hover:text-[#082b03] flex items-center gap-1 cursor-pointer">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Budget</span>
          </button>
          <span className="font-medium">Calendar</span>
          <button type="button" onClick={props.onNext} className="text-[#082b03] font-bold flex items-center gap-1 hover:underline cursor-pointer">
            <span>Checklist</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3D Corner Curl Affordance */}
        <PageCornerCurl onClick={props.onNext} />
      </div>
    );
  }
);
PageCalendar.displayName = 'PageCalendar';

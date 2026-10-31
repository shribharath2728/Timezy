import React from 'react';
import { Bell, Calendar as CalendarIcon, CheckCircle2, ChevronRight, Clock, Coins, Sparkles, Sun, Users } from 'lucide-react';
import { EventPlan } from '../../../types';
import { useRealTimeClock } from '../../../hooks/useRealTimeClock';
import { PageCornerCurl } from '../PageCornerCurl';

// PAGE 1: Summary & Activity (Live Real-Time Data from Plan)
export const PageSummary = React.forwardRef<HTMLDivElement, { plan: EventPlan; onNext: () => void }>(
  (props, ref) => {
    const clock = useRealTimeClock();
    const completedTasks = props.plan.timelineTasks.filter(t => t.completed).length;
    const completedChecklist = props.plan.checklistItems.filter(c => c.completed).length;
    const totalChecklist = props.plan.checklistItems.length;
    const costPerGuest = Math.round((props.plan.budget || 0) / Math.max(1, props.plan.guestCount));

    const displayName = props.plan.personName 
      ? props.plan.personName 
      : (props.plan.title.length > 20 ? props.plan.title.slice(0, 18) + '...' : props.plan.title);

    return (
      <div ref={ref} className="page-container relative p-5 sm:p-6 pb-8 flex flex-col justify-between bg-[#fbfdfa] border-r border-[#e0ece0] text-[#082b03]">
        <div className="overflow-y-auto pr-1">
          {/* Top greeting bar with live real-time device clock */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#5e7264]">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{clock.greeting}</span>
                <span className="font-mono text-[11px] text-[#082b03] font-bold ml-1">({clock.time})</span>
              </div>
              <h2 className="text-lg font-bold text-[#082b03] mt-0.5">
                {displayName}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Notifications" className="w-8 h-8 rounded-full bg-[#f4f8f2] flex items-center justify-center text-[#082b03]">
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Event Status Banner */}
          <div className="p-3.5 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0] flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#082b03] text-white flex items-center justify-center">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#082b03] block">Event Status</span>
                <span className="text-[11px] text-[#5e7264] truncate max-w-[180px] block">{props.plan.venue}</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#082b03] bg-white px-2.5 py-1 rounded-full border border-[#e0ece0]">
              In Planning
            </span>
          </div>

          {/* 4 Cards Grid - REAL data from the plan */}
          <div className="mb-5">
            <span className="text-xs font-bold text-[#082b03] block mb-2.5">Summary</span>
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Budget Total */}
              <div className="p-3.5 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0]">
                <div className="w-7 h-7 rounded-lg bg-[#e6f2e2] text-[#082b03] flex items-center justify-center mb-2">
                  <Coins className="w-4 h-4" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[#5e7264]">Budget</span>
                  <span className="text-base font-bold text-[#082b03]">₹{props.plan.budget.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Guests */}
              <div className="p-3.5 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0]">
                <div className="w-7 h-7 rounded-lg bg-[#eaf0f8] text-[#2a5298] flex items-center justify-center mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[#5e7264]">Guests</span>
                  <span className="text-base font-bold text-[#082b03]">{props.plan.guestCount}</span>
                </div>
              </div>

              {/* Cost per guest */}
              <div className="p-3.5 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0]">
                <div className="w-7 h-7 rounded-lg bg-[#f9eef8] text-[#9b2a98] flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[#5e7264]">Per Guest</span>
                  <span className="text-base font-bold text-[#082b03]">₹{costPerGuest.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checklist Progress */}
              <div className="p-3.5 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0]">
                <div className="w-7 h-7 rounded-lg bg-[#fbf5e6] text-[#987a2a] flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[#5e7264]">Checklist</span>
                  <span className="text-base font-bold text-[#082b03]">{completedChecklist}/{totalChecklist}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Activity / Progress Bar Section with Real Timeline Breakdown */}
          <div className="p-4 rounded-2xl bg-[#e6f2e2] border border-[#d2e5ce]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#082b03] text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[#082b03]">Planning Progress</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-[#082b03]">
                {completedTasks}/{props.plan.timelineTasks.length} Milestones
              </span>
            </div>

            {/* Custom stylized bars matching actual event day */}
            <div className="h-16 flex items-end justify-between gap-1.5 pt-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
                const heights = ['h-6', 'h-9', 'h-8', 'h-14', 'h-12', 'h-7', 'h-5'];
                const eventDayIndex = new Date(props.plan.eventDate + 'T00:00:00').getDay();
                const isSelected = i === (isNaN(eventDayIndex) ? 3 : eventDayIndex);
                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full rounded-full transition-all ${
                      isSelected ? 'bg-[#082b03]' : 'bg-[#082b03]/15'
                    } ${heights[i]}`} />
                    <span className="text-[9px] font-mono text-[#5e7264]">{d}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Flip Footer */}
        <div className="pt-3 border-t border-[#e0ece0] flex items-center justify-between text-xs text-[#5e7264] pr-12">
          <span className="font-medium">Summary</span>
          <button type="button" onClick={props.onNext} className="text-[#082b03] font-bold flex items-center gap-1 hover:underline">
            <span>Next: Budget</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3D Corner Curl Affordance matching Image 2 */}
        <PageCornerCurl onClick={props.onNext} />
      </div>
    );
  }
);
PageSummary.displayName = 'PageSummary';

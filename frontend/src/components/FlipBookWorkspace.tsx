import React, { useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Users, 
  Plus, 
  Bell, 
  Sun, 
  Bookmark,
  Coins,
  MapPin
} from 'lucide-react';
import { EventPlan, BudgetItem, ChecklistItem } from '../types';
import { useRealTimeClock } from '../hooks/useRealTimeClock';
import { offsetTime } from '../services/defaultPlanGenerator';

interface FlipBookWorkspaceProps {
  plan: EventPlan;
  onBack: () => void;
  onUpdatePlan: (updated: EventPlan) => void;
  onOpenAi: () => void;
}

// 3D Corner Curl Affordance (Consistently present on all pages without randomness)
const PageCornerCurl: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  return (
    <div
      onClick={onClick}
      title="Turn page"
      className="absolute bottom-0 right-0 w-12 h-12 cursor-pointer z-30 group select-none pointer-events-auto"
    >
      <div 
        className="absolute bottom-0 right-0 w-11 h-11 bg-gradient-to-tl from-[#9cb597] via-[#dcecd2] to-[#ffffff] border-t border-l border-[#8ba588] shadow-[-3px_-3px_8px_rgba(8,43,3,0.22)] transform origin-bottom-right group-hover:scale-115 transition-all duration-200" 
        style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} 
      />
    </div>
  );
};

// React-pageflip requires React.forwardRef for page components
const PageCover = React.forwardRef<HTMLDivElement, { title: string; subtitle: string; plan: EventPlan; onStart: () => void }>(
  (props, ref) => {
    return (
      <div ref={ref} className="page-container relative p-6 sm:p-8 pb-8 flex flex-col justify-between bg-[#fbfdfa] border-r border-[#e0ece0] text-[#082b03]">
        <div>
          {/* Header pill */}
          <div className="flex items-center justify-between mb-8">
            <span className="font-extrabold text-xl tracking-tight text-[#082b03]">Timezy</span>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#eaf3e7] text-[#082b03] font-semibold border border-[#d6ebd0]">
              {new Date(props.plan.eventDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="mt-8 text-center sm:text-left">
            <span className="text-xs uppercase font-mono tracking-widest text-[#5e7264] block mb-2">
              Event Plan
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#082b03] leading-tight mb-3">
              {props.plan.title}
            </h1>
            <p className="text-xs text-[#5e7264] leading-relaxed">
              {props.plan.venue} · {props.plan.guestCount} Guests
            </p>
          </div>

          {/* Quick Stats Grid with REAL data */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            <div className="p-4 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0]">
              <span className="text-[10px] uppercase font-mono text-[#5e7264] block">Total Budget</span>
              <span className="text-lg font-bold text-[#082b03]">₹{props.plan.budget?.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0]">
              <span className="text-[10px] uppercase font-mono text-[#5e7264] block">Event Schedule</span>
              <span className="text-xs font-bold text-[#082b03] mt-1 block">
                {new Date(props.plan.eventDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-[11px] font-semibold text-[#5e7264] block mt-0.5">
                Commences: {props.plan.commencementTime || '06:30 PM'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button at bottom: Related to planning (No "Open & Turn Pages") */}
        <div className="pt-6">
          <button 
            type="button"
            onClick={props.onStart}
            className="w-full timezy-btn-dark py-3.5 px-6 flex items-center justify-center gap-2 text-sm"
          >
            <span>Review Event Plan &amp; Schedule</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Corner Curl Effect */}
        <PageCornerCurl onClick={props.onStart} />
      </div>
    );
  }
);
PageCover.displayName = 'PageCover';

// PAGE 1: Summary & Activity (Live Real-Time Data from Plan)
const PageSummary = React.forwardRef<HTMLDivElement, { plan: EventPlan; onNext: () => void }>(
  (props, ref) => {
    const clock = useRealTimeClock();
    const totalSpent = props.plan.budgetItems.reduce((acc, it) => acc + (it.actualCost || 0), 0);
    const completedTasks = props.plan.timelineTasks.filter(t => t.completed).length;
    const completedChecklist = props.plan.checklistItems.filter(c => c.completed).length;
    const totalChecklist = props.plan.checklistItems.length;
    const costPerGuest = Math.round((props.plan.budget || 0) / Math.max(1, props.plan.guestCount));

    const displayName = props.plan.personName 
      ? props.plan.personName 
      : (props.plan.title.length > 20 ? props.plan.title.slice(0, 18) + '...' : props.plan.title);

    const initial = props.plan.personName 
      ? props.plan.personName[0].toUpperCase() 
      : (props.plan.title ? props.plan.title[0].toUpperCase() : 'T');

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

            {/* Custom stylized bars matching screenshot */}
            <div className="h-16 flex items-end justify-between gap-1.5 pt-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
                const heights = ['h-6', 'h-9', 'h-8', 'h-14', 'h-12', 'h-7', 'h-5'];
                const isSelected = d === 'Wed';
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

// PAGE 2: Budget Items in INR (₹)
const PageBudget = React.forwardRef<HTMLDivElement, { 
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

// PAGE 3: Daily Planner & Calendar (Exact Match to Right Phone in Reference Design)
const PageCalendar = React.forwardRef<HTMLDivElement, { 
  plan: EventPlan; 
  onPrev: () => void; 
  onNext: () => void;
  onUpdatePlan: (plan: EventPlan) => void;
}>(
  (props, ref) => {
    const days = [
      { d: 'Sun', n: 15 },
      { d: 'Mon', n: 16 },
      { d: 'Tue', n: 17 },
      { d: 'Wed', n: 18, active: true },
      { d: 'Thu', n: 20 },
      { d: 'Fri', n: 21 },
      { d: 'Sat', n: 22 },
    ];

    // Dynamic schedule calculated relative to the event's commencement time
    const cTime = props.plan.commencementTime || '18:30';
    const scheduleItems = [
      {
        time: offsetTime(cTime, -90),
        title: 'Morning Venue Walkthrough & Setup',
        duration: `${offsetTime(cTime, -90)} - ${offsetTime(cTime, -45)}`,
        bg: 'bg-[#faedf2]',
        border: 'border-[#f6d7e2]',
        avatar: '🌸',
      },
      {
        time: offsetTime(cTime, -30),
        title: 'Decorator & Stage Floral Delivery',
        duration: `${offsetTime(cTime, -30)} - ${offsetTime(cTime, 0)}`,
        bg: 'bg-[#faf3e3]',
        border: 'border-[#f5e4bd]',
        avatar: '✨',
      },
      {
        time: offsetTime(cTime, 0),
        title: 'Guest Arrival & Welcome Commencement',
        duration: `${offsetTime(cTime, 0)} - ${offsetTime(cTime, 45)}`,
        bg: 'bg-[#eaf5e6]',
        border: 'border-[#d6ebd0]',
        avatar: '🤝',
      },
      {
        time: offsetTime(cTime, 60),
        title: 'Main Ceremony & Banquet Dinner',
        duration: `${offsetTime(cTime, 60)} - ${offsetTime(cTime, 120)}`,
        bg: 'bg-[#eef5fa]',
        border: 'border-[#d6e7f5]',
        avatar: '☕',
      },
    ];

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

          {/* Weekday Strip - Exact match to image */}
          <div className="flex items-center justify-between bg-[#f4f8f2] p-2.5 rounded-2xl border border-[#e0ece0] mb-5">
            {days.map((item) => (
              <div 
                key={item.d} 
                className={`flex flex-col items-center py-1.5 px-2 rounded-xl text-center transition-all ${
                  item.active 
                    ? 'bg-[#082b03] text-white shadow-sm font-bold' 
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
            <span className="text-[10px] text-[#5e7264] font-mono">4 Milestones</span>
          </div>

          <div className="space-y-3">
            {scheduleItems.map((sch) => (
              <div key={sch.title} className="flex items-start gap-3">
                <span className="text-[10px] font-mono text-[#5e7264] w-14 shrink-0 pt-2">
                  {sch.time}
                </span>
                <div className={`flex-1 p-3 rounded-2xl border ${sch.bg} ${sch.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base select-none">{sch.avatar}</span>
                    <div>
                      <span className="text-xs font-bold text-[#082b03] block leading-tight">{sch.title}</span>
                      <span className="text-[10px] text-[#5e7264] font-mono">{sch.duration}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Flip Footer */}
        <div className="pt-3 border-t border-[#e0ece0] flex items-center justify-between text-xs text-[#5e7264] pr-12">
          <button type="button" onClick={props.onPrev} className="text-[#5e7264] hover:text-[#082b03] flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Budget</span>
          </button>
          <span className="font-medium">Calendar</span>
          <button type="button" onClick={props.onNext} className="text-[#082b03] font-bold flex items-center gap-1 hover:underline">
            <span>Checklist</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3D Corner Curl Affordance matching Image 2 */}
        <PageCornerCurl onClick={props.onNext} />
      </div>
    );
  }
);
PageCalendar.displayName = 'PageCalendar';

// PAGE 4: Checklist & Final Notes
const PageChecklist = React.forwardRef<HTMLDivElement, { 
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

const FlipBookComponent = HTMLFlipBook as any;

export const FlipBookWorkspace: React.FC<FlipBookWorkspaceProps> = ({
  plan,
  onBack,
  onUpdatePlan,
  onOpenAi,
}) => {
  const flipBookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const flipNext = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipNext();
    }
  };

  const flipPrev = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  };

  const turnToPage = (pageNum: number) => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().turnToPage(pageNum);
    }
  };

  // Keyboard navigation: Left/Right arrows seamlessly turn pages
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        flipNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        flipPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Smooth, native touch swipe responsiveness (natural horizontal flick)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    // Trigger turn if horizontal swipe > 35px and more horizontal than vertical
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        flipNext(); // Swiped left -> Next page
      } else {
        flipPrev(); // Swiped right -> Previous page
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 flex flex-col items-center">
      
      {/* Top Breadcrumb & Navigation */}
      <div className="w-full flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-white text-[#082b03] border border-[#d6ebd0] shadow-xs hover:bg-[#f4f8f2] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>All Plans</span>
        </button>

        {/* Interactive Tab Jump Pills matching Book Flip */}
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs p-1 rounded-full border border-[#d6ebd0] shadow-xs text-xs font-semibold">
          {[
            { label: 'Cover', page: 0 },
            { label: 'Summary', page: 1 },
            { label: 'Budget', page: 2 },
            { label: 'Calendar', page: 3 },
            { label: 'Checklist', page: 4 },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => turnToPage(tab.page)}
              className={`px-3 py-1.5 rounded-full transition-all ${
                currentPage === tab.page
                  ? 'bg-[#082b03] text-white shadow-xs'
                  : 'text-[#5e7264] hover:text-[#082b03]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenAi}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full bg-[#082b03] text-white shadow-sm hover:bg-[#051c02] transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Assistant</span>
        </button>
      </div>

      {/* The Physical Realistic Book / Mockup Flip Container */}
      <div 
        className="relative w-full max-w-[420px] sm:max-w-[440px] flex items-center justify-center select-none my-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Floating Left Side Flip Arrow (One-tap effortless page turn) */}
        {currentPage > 0 && (
          <button
            type="button"
            onClick={flipPrev}
            className="absolute -left-4 sm:-left-7 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white text-[#082b03] border-2 border-[#d6ebd0] shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 hover:bg-[#eaf3e7] cursor-pointer"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Floating Right Side Flip Arrow (One-tap effortless page turn) */}
        {currentPage < 4 && (
          <button
            type="button"
            onClick={flipNext}
            className="absolute -right-4 sm:-right-7 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white text-[#082b03] border-2 border-[#d6ebd0] shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 hover:bg-[#eaf3e7] cursor-pointer"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div className="timezy-device w-full h-[640px] sm:h-[660px] flex items-center justify-center p-0 overflow-hidden shadow-2xl border-[7px] border-white rounded-[40px] bg-[#fbfdfa]">
          {/* React Pageflip instance snugly assembled to fit the frame */}
          <FlipBookComponent
            ref={flipBookRef}
            width={420}
            height={640}
            size="stretch"
            minWidth={320}
            maxWidth={440}
            minHeight={580}
            maxHeight={660}
            maxShadowOpacity={0.4}
            showCover={false}
            mobileScrollSupport={true}
            usePortrait={true}
            showPageCorners={false}
            swipeDistance={15}
            clickEventForward={true}
            drawShadow={true}
            flippingTime={400}
            className="demo-book w-full h-full"
            style={{ margin: '0 auto', width: '100%', height: '100%' }}
            onFlip={(e: any) => setCurrentPage(e.data)}
          >
            {/* Page 0: Book Cover */}
            <PageCover 
              plan={plan} 
              title="Timezy Event Planner" 
              subtitle="Schedule Smarter, Celebrate Better"
              onStart={() => turnToPage(1)} 
            />

            {/* Page 1: Middle Screen in Reference (Summary & Activity) */}
            <PageSummary 
              plan={plan} 
              onNext={flipNext} 
            />

            {/* Page 2: Budget */}
            <PageBudget 
              plan={plan} 
              onPrev={flipPrev} 
              onNext={flipNext} 
              onUpdatePlan={onUpdatePlan} 
            />

            {/* Page 3: Right Screen in Reference (Planner, Calendar & Schedulers) */}
            <PageCalendar 
              plan={plan} 
              onPrev={flipPrev} 
              onNext={flipNext} 
              onUpdatePlan={onUpdatePlan} 
            />

            {/* Page 4: Checklist & Vendors */}
            <PageChecklist 
              plan={plan} 
              onPrev={flipPrev} 
              onUpdatePlan={onUpdatePlan} 
              onOpenAi={onOpenAi} 
            />
          </FlipBookComponent>
        </div>
      </div>

      {/* Bottom Flipping Controls for User */}
      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={flipPrev}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#082b03] border border-[#d6ebd0] text-xs font-semibold shadow-2xs hover:bg-[#f4f8f2] transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* Minimal indicator dots matching reference */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-white/90 backdrop-blur-xs rounded-full border border-[#d6ebd0] shadow-2xs">
          {[0, 1, 2, 3, 4].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => turnToPage(idx)}
              className={`transition-all duration-300 rounded-full ${
                currentPage === idx
                  ? 'w-6 h-1.5 bg-[#082b03]'
                  : 'w-1.5 h-1.5 bg-[#bad4b6] hover:bg-[#8ba389]'
              }`}
            />
          ))}
        </div>

        <button
          onClick={flipNext}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#082b03] border border-[#d6ebd0] text-xs font-semibold shadow-2xs hover:bg-[#f4f8f2] transition-all"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

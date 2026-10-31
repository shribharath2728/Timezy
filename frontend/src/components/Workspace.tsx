import React, { useState } from 'react';
import {
  ArrowLeft,
  LayoutDashboard,
  Calendar,
  CheckSquare,
  MapPin,
  Users,
  CalendarCheck,
  Printer,
  Sparkles,
} from 'lucide-react';
import { BudgetItem, ChecklistItem, EventPlan, TimelineTask, Vendor } from '../types';
import { OverviewTab } from './OverviewTab';
import { BudgetPlannerTab } from './BudgetPlannerTab';
import { TimelineTab } from './TimelineTab';
import { ChecklistAndVendorsTab } from './ChecklistAndVendorsTab';

interface WorkspaceProps {
  plan: EventPlan;
  onBack: () => void;
  onUpdatePlan: (updatedPlan: EventPlan) => void;
  onOpenAi: () => void;
}

type TabKey = 'overview' | 'budget' | 'timeline' | 'checklist' | 'vendors';

export const Workspace: React.FC<WorkspaceProps> = ({
  plan,
  onBack,
  onUpdatePlan,
  onOpenAi,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const eventDateObj = new Date(plan.eventDate + 'T00:00:00');
  const formattedEventDate = eventDateObj.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const today = new Date();
  const daysRemaining = Math.ceil(
    (eventDateObj.getTime() - today.getTime()) / (1000 * 3600 * 24)
  );

  const totalItems = plan.timelineTasks.length + plan.checklistItems.length;
  const completedItems =
    plan.timelineTasks.filter((t) => t.completed).length +
    plan.checklistItems.filter((c) => c.completed).length;
  const overallProgressPct =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleUpdateBudgetItems = (budgetItems: BudgetItem[]) =>
    onUpdatePlan({ ...plan, budgetItems });
  const handleUpdateTotalBudget = (budget: number) =>
    onUpdatePlan({ ...plan, budget });
  const handleUpdateTimelineTasks = (timelineTasks: TimelineTask[]) =>
    onUpdatePlan({ ...plan, timelineTasks });
  const handleUpdateChecklist = (checklistItems: ChecklistItem[]) =>
    onUpdatePlan({ ...plan, checklistItems });
  const handleUpdateVendors = (vendors: Vendor[]) =>
    onUpdatePlan({ ...plan, vendors });

  const tabs = [
    { key: 'overview',  label: 'I. Shubh Overview',       icon: LayoutDashboard },
    { key: 'budget',    label: 'II. Budget & Kharcha (₹)', icon: () => <span className="text-xs font-bold font-serif leading-none">₹</span> },
    { key: 'timeline',  label: 'III. Tayyari Timeline',    icon: Calendar },
    { key: 'checklist', label: 'IV. Checklist & Vendors',  icon: CheckSquare },
  ] as const;

  return (
    <div className="min-h-[calc(100vh-62px)] flex flex-col animate-fade-up">

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(10,9,7,0.85)] to-[rgba(10,9,7,0.6)] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10">

          {/* Back + actions row */}
          <div className="flex items-center justify-between mb-6 no-print">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#9C9080] hover:text-[#E8C97A] transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Sabhi Plans (All Events)</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#9C9080]">
                {plan.category === 'birthday' ? 'JANMADIN' : 'SAMAROH'} · #{plan.id.slice(-4)}
              </span>
              <button
                onClick={() => window.print()}
                className="hidden md:flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-[#9C9080] hover:text-[#E8C97A] border border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.5)] px-3 py-1.5 rounded transition-all"
                title="Print Shubh Patrika"
              >
                <Printer className="w-3 h-3" />
                <span>Print Patrika</span>
              </button>
            </div>
          </div>

          {/* Title + meta */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#C9A84C] font-semibold">
                Aapka Shubh Event Plan
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#F5EFE0] font-normal tracking-tight leading-tight">
                {plan.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#9C9080] font-mono pt-1">
                <span className="flex items-center gap-1.5 text-[#F5EFE0]">
                  <CalendarCheck className="w-3.5 h-3.5 text-[#C9A84C]" />
                  {formattedEventDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C9A84C]" />
                  {plan.venue}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#C9A84C]" />
                  {plan.guestCount} Mehmaan (Guests)
                </span>
                <span className="flex items-center gap-1 text-[#E8C97A] font-medium">
                  ${plan.budget?.toLocaleString('en-IN')} Budget
                </span>
              </div>
            </div>

            {/* Countdown + progress */}
            <div className="glass-card rounded-xl px-5 py-4 min-w-[210px] shrink-0 border border-[rgba(201,168,76,0.3)]">
              <div className="text-2xl font-serif text-[#E8C97A] tracking-tight mb-2">
                {daysRemaining > 0
                  ? `${daysRemaining} Din Baqi Hai`
                  : daysRemaining === 0
                  ? 'Aaj Hai Shubh Din!'
                  : 'Sampanna Ho Gaya'}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 progress-track h-1.5">
                  <div className="progress-fill h-full" style={{ width: `${overallProgressPct}%` }} />
                </div>
                <span className="text-[11px] font-mono text-[#E8C97A] font-bold">{overallProgressPct}%</span>
              </div>
              <p className="text-[10px] font-mono text-[#9C9080] mt-1.5 uppercase tracking-wider">
                Tayyari Progress (Tasks Done)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs + content ── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 pb-16">

        {/* Tab bar */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-[rgba(201,168,76,0.2)] mb-8 overflow-x-auto no-print mt-2">
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabKey)}
                className={`tab-btn flex items-center gap-2 px-4 sm:px-5 py-3.5 text-[12px] sm:text-[13px] font-mono uppercase tracking-wider whitespace-nowrap ${
                  isActive ? 'active' : ''
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content area */}
        <div className="min-h-[500px]">
          {activeTab === 'overview' && (
            <OverviewTab plan={plan} onNavigateTab={(tab) => setActiveTab(tab)} onOpenAi={onOpenAi} />
          )}
          {activeTab === 'budget' && (
            <BudgetPlannerTab
              plan={plan}
              onUpdateBudgetItems={handleUpdateBudgetItems}
              onUpdateTotalBudget={handleUpdateTotalBudget}
            />
          )}
          {activeTab === 'timeline' && (
            <TimelineTab plan={plan} onUpdateTimelineTasks={handleUpdateTimelineTasks} />
          )}
          {activeTab === 'checklist' && (
            <ChecklistAndVendorsTab
              plan={plan}
              onUpdateChecklist={handleUpdateChecklist}
              onUpdateVendors={handleUpdateVendors}
              initialSubSection="checklist"
            />
          )}
          {activeTab === 'vendors' && (
            <ChecklistAndVendorsTab
              plan={plan}
              onUpdateChecklist={handleUpdateChecklist}
              onUpdateVendors={handleUpdateVendors}
              initialSubSection="vendors"
            />
          )}
        </div>
      </div>
    </div>
  );
};

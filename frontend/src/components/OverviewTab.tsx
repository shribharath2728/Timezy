import React from 'react';
import {
  Calendar,
  CheckSquare,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { EventPlan } from '../types';

interface OverviewTabProps {
  plan: EventPlan;
  onNavigateTab: (tab: 'budget' | 'timeline' | 'checklist' | 'vendors') => void;
  onOpenAi: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ plan, onNavigateTab, onOpenAi }) => {
  const totalPlanned = plan.budget;
  const totalActual = plan.budgetItems.reduce((acc, it) => acc + (it.actualCost || 0), 0);
  const remainingBudget = totalPlanned - totalActual;
  const budgetSpentPct = totalPlanned > 0 ? Math.min(100, Math.round((totalActual / totalPlanned) * 100)) : 0;

  const totalTasks = plan.timelineTasks.length;
  const completedTasks = plan.timelineTasks.filter((t) => t.completed).length;
  const taskProgressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalChecklist = plan.checklistItems.length;
  const completedChecklist = plan.checklistItems.filter((c) => c.completed).length;
  const checklistProgressPct = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  const daysToGo = Math.ceil(
    (new Date(plan.eventDate + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const upcomingTasks = plan.timelineTasks.filter((t) => !t.completed).slice(0, 4);

  const statCard = (
    label: string,
    value: React.ReactNode,
    sub: string,
    pct: number,
    Icon: React.ElementType,
    onClick?: () => void
  ) => (
    <div
      onClick={onClick}
      className={`glass-card rounded-xl p-5 ${onClick ? 'cursor-pointer hover:border-[rgba(201,168,76,0.5)] transition-all' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#9C9080]">{label}</span>
        <Icon className="w-4 h-4 text-[#C9A84C]" strokeWidth={1.75} />
      </div>
      <div className="font-serif text-2xl text-[#F5EFE0] mb-1">{value}</div>
      <div className="flex items-center justify-between text-[11px] text-[#9C9080] mb-2">
        <span>{sub}</span>
        <span className="font-mono text-[#E8C97A]">{pct}%</span>
      </div>
      <div className="progress-track h-1">
        <div className="progress-fill h-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Welcome card */}
      <div className="glass-panel rounded-xl p-6 sm:p-7 relative overflow-hidden">
        <div className="silk-ribbon" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pr-8">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C9A84C] block mb-1">
              Shubh Samaroh Overview
            </span>
            <h2 className="font-serif text-xl sm:text-2xl text-[#F5EFE0] font-normal">{plan.title}</h2>
            <p className="text-xs text-[#9C9080] font-mono mt-1">
              {plan.theme ? `Theme: "${plan.theme}" · ` : ''}
              {plan.guestCount} Mehmaan · {plan.venue}
            </p>
          </div>
          <button onClick={onOpenAi}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl gold-badge hover:bg-[rgba(201,168,76,0.25)] transition-all text-[12px] font-mono uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span>AI Desi Advice</span>
          </button>
        </div>

        {plan.notes && (
          <div className="mt-4 pt-4 border-t border-[rgba(201,168,76,0.2)]">
            <div className="p-3.5 rounded-xl bg-[rgba(201,168,76,0.07)] border border-[rgba(201,168,76,0.2)]">
              <span className="text-[10px] font-mono text-[#C9A84C] uppercase tracking-widest block mb-1">
                Khaas Hidayat / Notes:
              </span>
              <p className="text-xs text-[#F5EFE0]/80 font-serif italic leading-relaxed">"{plan.notes}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Countdown */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#9C9080]">Countdown</span>
            <Clock className="w-4 h-4 text-[#C9A84C]" strokeWidth={1.75} />
          </div>
          <div className="font-serif text-2xl text-[#F5EFE0] mb-1">
            {daysToGo > 0 ? `${daysToGo} Din` : daysToGo === 0 ? 'Aaj Hai!' : 'Sampanna'}
          </div>
          <span className="text-[11px] text-[#9C9080] font-mono">
            {new Date(plan.eventDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {statCard(
          'Kull Kharcha',
          `₹${totalActual.toLocaleString('en-IN')}`,
          `Kull: ₹${totalPlanned.toLocaleString('en-IN')}`,
          budgetSpentPct,
          () => <span className="text-[#C9A84C] font-serif font-bold text-sm">₹</span>,
          () => onNavigateTab('budget')
        )}
        {statCard('Timeline', `${completedTasks}/${totalTasks}`, 'Milestones poore', taskProgressPct, Calendar, () => onNavigateTab('timeline'))}
        {statCard('Checklist', `${completedChecklist}/${totalChecklist}`, 'Kaam nipta liye', checklistProgressPct, CheckSquare, () => onNavigateTab('checklist'))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming tasks */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[rgba(201,168,76,0.2)]">
            <h3 className="font-serif text-base text-[#F5EFE0] font-normal">Aage Aane Wale Mukhya Kaam (Next Milestones)</h3>
            <button onClick={() => onNavigateTab('timeline')}
              className="text-[11px] font-mono text-[#C9A84C] hover:text-[#E8C97A] flex items-center gap-1 uppercase tracking-wider transition-colors">
              <span>Poori Timeline</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-[#9C9080] font-mono italic py-4 text-center">
                Badhai ho! Sabhi timeline milestones poore ho chuke hain!
              </p>
            ) : (
              upcomingTasks.map((t) => (
                <div key={t.id}
                  className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.15)] flex items-start justify-between gap-3 hover:border-[rgba(201,168,76,0.3)] transition-colors">
                  <div>
                    <div className="text-[10px] font-mono text-[#C9A84C] mb-0.5 uppercase tracking-wider">
                      {t.phaseLabel} · Tarikh: {t.recommendedDate}
                    </div>
                    <div className="text-sm text-[#F5EFE0] font-serif">{t.name}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full gold-badge shrink-0">{t.priority}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Vendors panel */}
        <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[rgba(201,168,76,0.2)]">
              <h3 className="font-serif text-base text-[#F5EFE0] font-normal">Vendors &amp; Halwai Status</h3>
              <button onClick={() => onNavigateTab('vendors')}
                className="text-[11px] font-mono text-[#C9A84C] hover:text-[#E8C97A] flex items-center gap-1 uppercase tracking-wider transition-colors">
                <span>Sabhi ({plan.vendors.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {plan.vendors.slice(0, 4).map((v) => (
                <div key={v.id}
                  className="p-2.5 rounded-xl border border-[rgba(201,168,76,0.12)] bg-[rgba(255,255,255,0.03)] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-serif text-[#F5EFE0] block">{v.name}</span>
                    <span className="text-[11px] text-[#9C9080] font-mono">{v.category} · ${v.quotedPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    v.status === 'Booked' || v.status === 'Advance Paid'
                      ? 'gold-badge'
                      : 'bg-[rgba(255,255,255,0.05)] text-[#9C9080] border border-[rgba(255,255,255,0.1)]'
                  }`}>
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[rgba(201,168,76,0.2)]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9C9080] font-mono">Bachi Hui Rashi (Surplus):</span>
              <span className={`font-mono font-semibold ${remainingBudget < 0 ? 'text-red-400' : 'text-[#E8C97A]'}`}>
                ${remainingBudget.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

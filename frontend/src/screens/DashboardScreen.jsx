import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { formatINR, CATEGORY_META, PRIORITY_META } from '../constants';
import {
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Cake,
  HeartHandshake,
  Briefcase,
  Plane,
  Users,
  PlusCircle,
  BookOpen,
} from 'lucide-react';

const CATEGORY_ICONS = {
  birthday: Cake,
  wedding: HeartHandshake,
  meeting: Briefcase,
  travel: Plane,
  community: Users,
};

export function DashboardScreen({ onSelectEvent, onNavigateNewEvent }) {
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, plansRes] = await Promise.all([
        api.getDashboard(),
        api.getPlans(),
      ]);
      setData(dashRes);
      setPlans(plansRes || []);
    } catch (err) {
      setError(err.message || 'Failed to open journal entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="h-44 bg-[#e6decb]/40 dark:bg-[#38342e]/40 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-[#e6decb]/40 dark:bg-[#38342e]/40 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-[#e6decb]/40 dark:bg-[#38342e]/40 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-700 dark:text-amber-400 mx-auto" />
        <h3 className="font-serif-journal text-lg font-bold text-[#2c2523] dark:text-[#ede8df]">
          Could not read today's page
        </h3>
        <p className="text-xs text-[#5a4e4a] dark:text-[#beb6a8]">{error}</p>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 bg-amber-800 text-amber-50 rounded-lg text-xs font-semibold hover:bg-amber-900 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { next_event, category_counts, total_events, total_budget } = data || {};

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* 1. Today's Page Hero Header */}
      <div className="relative rounded-2xl bg-[#fdfbf7] dark:bg-[#1f1d1a] border border-[#e6decb] dark:border-[#38342e] journal-shadow p-6 sm:p-8 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="font-handwriting text-xl text-amber-800 dark:text-amber-400 block -mb-1">
              Today's Page • {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <h1 className="font-serif-journal text-2xl sm:text-4xl font-bold text-[#2c2523] dark:text-[#ede8df] tracking-tight">
              Event Chronicles
            </h1>
            <p className="text-xs sm:text-sm text-[#5a4e4a] dark:text-[#beb6a8] font-serif-journal max-w-xl">
              {total_events || 0} planned celebration{total_events === 1 ? '' : 's'} across {formatINR(total_budget || 0)} allocated funds.
            </p>
          </div>

          <button
            onClick={onNavigateNewEvent}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-800 dark:bg-amber-700 text-amber-50 hover:bg-amber-900 dark:hover:bg-amber-600 transition shadow-sm font-serif-journal text-sm font-semibold shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Write New Entry</span>
          </button>
        </div>
      </div>

      {/* 2. Next-Event Countdown Card */}
      {next_event && (
        <div
          onClick={() => onSelectEvent(next_event.id || next_event._id)}
          className="rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-[#25221d] p-6 journal-shadow cursor-pointer hover:border-amber-500 transition group"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-serif-journal uppercase tracking-wider text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/40">
                  Next Chapter
                </span>
                <span className="text-xs text-[#8b7d77] dark:text-[#8c8376] font-serif-journal">
                  {next_event.date ? new Date(next_event.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''}
                </span>
              </div>
              <h2 className="font-serif-journal text-xl sm:text-2xl font-bold text-[#2c2523] dark:text-[#ede8df] group-hover:text-amber-800 dark:group-hover:text-amber-400 transition">
                {next_event.title}
              </h2>
            </div>

            {/* Countdown Badge */}
            <div className="flex items-center gap-2 sm:gap-3 bg-[#fdfbf7] dark:bg-[#1a1917] px-4 py-2.5 rounded-xl border border-[#e6decb] dark:border-[#38342e] shrink-0 font-serif-journal">
              <div className="text-center">
                <span className="block text-lg font-bold text-amber-900 dark:text-amber-300 leading-none">
                  {next_event.days_remaining || 0}
                </span>
                <span className="text-[10px] text-[#8b7d77] uppercase">Days</span>
              </div>
              <span className="text-stone-300 dark:text-stone-700">:</span>
              <div className="text-center">
                <span className="block text-lg font-bold text-amber-900 dark:text-amber-300 leading-none">
                  {next_event.hours_remaining || 0}
                </span>
                <span className="text-[10px] text-[#8b7d77] uppercase">Hours</span>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-800 dark:text-amber-400 ml-2 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>
      )}

      {/* 3. Category Count Ribbons */}
      <div>
        <h3 className="font-serif-journal text-sm font-bold uppercase tracking-wider text-[#5a4e4a] dark:text-[#beb6a8] mb-3">
          Book Chapters by Category
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
            const count = category_counts ? category_counts[catKey] || 0 : 0;
            const Icon = CATEGORY_ICONS[catKey] || BookOpen;
            return (
              <div
                key={catKey}
                className="p-3.5 rounded-xl border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1f1d1a] journal-shadow space-y-1 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 right-0 w-1.5 h-full"
                  style={{ backgroundColor: meta.color }}
                />
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5a4e4a] dark:text-[#beb6a8]">
                  <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                  <span className="capitalize">{meta.label}</span>
                </div>
                <div className="font-serif-journal text-xl font-bold text-[#2c2523] dark:text-[#ede8df]">
                  {count} <span className="text-[11px] font-normal text-[#8b7d77]">events</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Journal Entries List (Recent Chapters) */}
      <div className="space-y-3">
        <h3 className="font-serif-journal text-sm font-bold uppercase tracking-wider text-[#5a4e4a] dark:text-[#beb6a8]">
          All Journal Pages
        </h3>

        {plans.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-[#e6decb] dark:border-[#38342e] text-center space-y-3 bg-[#fdfbf7]/50 dark:bg-[#1f1d1a]/50">
            <BookOpen className="w-10 h-10 text-amber-800/40 dark:text-amber-400/40 mx-auto" />
            <h4 className="font-serif-journal text-base font-bold text-[#2c2523] dark:text-[#ede8df]">
              Your journal is clean and empty
            </h4>
            <p className="text-xs text-[#8b7d77] dark:text-[#8c8376] font-serif-journal max-w-sm mx-auto">
              Start by penning your first event page. Groq AI will review the budget and suggest tasks.
            </p>
            <button
              onClick={onNavigateNewEvent}
              className="px-4 py-2 rounded-lg bg-amber-800 text-amber-50 text-xs font-semibold hover:bg-amber-900 transition"
            >
              Write First Entry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => {
              const meta = CATEGORY_META[p.category] || CATEGORY_META.birthday;
              const isSched = p.status === 'scheduled';
              return (
                <div
                  key={p.id || p._id}
                  onClick={() => onSelectEvent(p.id || p._id)}
                  className="p-5 rounded-xl border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1f1d1a] journal-shadow hover:border-amber-600 transition cursor-pointer space-y-3 flex flex-col justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white ${meta.tabBg}`}>
                        {meta.label}
                      </span>
                      {isSched && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Scheduled</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-serif-journal text-lg font-bold text-[#2c2523] dark:text-[#ede8df] group-hover:text-amber-800 dark:group-hover:text-amber-400 transition leading-snug">
                      {p.title}
                    </h4>
                    <p className="text-xs text-[#8b7d77] dark:text-[#8c8376] font-serif-journal">
                      {p.date ? new Date(p.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Draft'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#e6decb]/60 dark:border-[#38342e]/60 flex items-center justify-between text-xs font-serif-journal">
                    <span className="font-bold text-amber-900 dark:text-amber-300">
                      {formatINR(p.budget || p.plan?.total)}
                    </span>
                    <span className="text-amber-800 dark:text-amber-400 font-semibold group-hover:translate-x-1 transition flex items-center gap-1">
                      <span>Read Page</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

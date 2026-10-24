import React, { useEffect, useState } from 'react';
import { api, API_BASE } from '../api';
import { formatINR, CATEGORY_META, PRIORITY_META } from '../constants';
import { useToast } from '../context/ToastContext';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  Calendar,
  Clock,
  CheckSquare,
  Square,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  Cake,
  HeartHandshake,
  Briefcase,
  Plane,
  Users,
  CheckCircle2,
  CalendarPlus,
  BookOpen,
  Send,
  ExternalLink,
  RotateCw,
} from 'lucide-react';

const CHART_COLORS = ['#c28835', '#dc2626', '#ea580c', '#2563eb', '#0d9488', '#8b5cf6', '#d946ef', '#6b7280'];

export function EventDetailScreen({ eventId, onBack }) {
  const { addToast } = useToast();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scheduling state
  const [scheduling, setScheduling] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Refine state
  const [refineChange, setRefineChange] = useState('');
  const [refineBudget, setRefineBudget] = useState('');
  const [refining, setRefining] = useState(false);
  const [refine502, setRefine502] = useState(null);

  // Birthday wish consent edit state
  const [wishConsent, setWishConsent] = useState(false);
  const [wishName, setWishName] = useState('');
  const [wishEmail, setWishEmail] = useState('');
  const [savingConsent, setSavingConsent] = useState(false);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const res = await api.getPlan(eventId);
      setPlan(res);
      setWishConsent(Boolean(res.wish?.consent));
      setWishName(res.wish?.name || '');
      setWishEmail(res.wish?.email || '');
      setRefineBudget(res.budget || res.plan?.total || '');
    } catch (err) {
      addToast({ message: err.message || 'Failed to open journal entry', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadPlan();
    }
  }, [eventId]);

  // Handle user override of item verdict ("keep anyway"), edit text, or toggle
  const handleItemOverride = async (item, updates) => {
    try {
      const res = await api.patchPlanItem(eventId, item.id, updates);
      setPlan((prev) => {
        const updatedItems = (prev.items || []).map((it) => (it.id === item.id ? res.item : it));
        const updatedVendors = (prev.plan?.vendors || []).map((it) => (it.id === item.id ? res.item : it));
        return {
          ...prev,
          items: updatedItems,
          plan: { ...(prev.plan || {}), vendors: updatedVendors },
        };
      });

      if (updates.keep !== undefined) {
        addToast({
          message: updates.keep ? `Marked "${item.item}" to keep anyway!` : `Removed override for "${item.item}"`,
          type: 'info',
        });
      } else if (updates.done !== undefined) {
        addToast({
          message: `Task "${item.item}" marked ${updates.done ? 'done' : 'pending'}`,
          type: 'info',
        });
      }
    } catch (err) {
      addToast({ message: err.message || 'Failed to update item', type: 'error' });
    }
  };

  // Schedule plan: Creates Google Calendar events for essential/optional/kept items in free future slots
  const handleSchedule = async () => {
    setScheduling(true);
    try {
      const res = await api.schedulePlan(eventId);
      setPlan(res);
      addToast({
        message: 'Celebration and tasks scheduled in your Google Calendar free slots!',
        type: 'success',
      });
    } catch (err) {
      if (err.status === 401) {
        addToast({
          message: 'Please sign in with Google to create calendar events in your free slots.',
          type: 'warning',
        });
        window.location.href = `${API_BASE}/auth/login`;
      } else {
        addToast({
          message: err.message || 'Could not schedule event to calendar.',
          type: 'error',
        });
      }
    } finally {
      setScheduling(false);
    }
  };

  // Sync calendar edits/deletions via syncToken
  const handleSync = async () => {
    setSyncing(true);
    try {
      const syncRes = await api.syncPlan(eventId);
      addToast({
        message: `Synced with Google Calendar (${syncRes.updated_events?.length || 0} updated, ${syncRes.deleted_event_ids?.length || 0} removed).`,
        type: 'success',
      });
      loadPlan();
    } catch (err) {
      addToast({ message: err.message || 'Sync failed', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  // Handle AI budget refinement
  const handleRefine = async (e) => {
    e.preventDefault();
    if (!refineChange.trim()) {
      addToast({ message: 'Please describe the change you wish to make.', type: 'warning' });
      return;
    }
    setRefining(true);
    setRefine502(null);

    try {
      const updated = await api.refinePlan(eventId, {
        change: refineChange.trim(),
        new_total: refineBudget ? Number(refineBudget) : undefined,
      });
      setPlan(updated);
      setRefineChange('');
      addToast({ message: 'Journal budget refined successfully with AI!', type: 'success' });
    } catch (err) {
      if (err.status === 502) {
        setRefine502('The AI assistant took too long. Click Retry to re-submit your refinement.');
      } else {
        addToast({ message: err.message || 'Failed to refine plan', type: 'error' });
      }
    } finally {
      setRefining(false);
    }
  };

  // Handle Birthday Wish Consent update
  const handleSaveConsent = async () => {
    setSavingConsent(true);
    try {
      const res = await api.setWishConsent(eventId, {
        consent: wishConsent,
        name: wishName.trim() || undefined,
        email: wishEmail.trim() || undefined,
      });
      setPlan((prev) => ({
        ...prev,
        wish: res.wish,
      }));
      addToast({ message: 'Birthday wish consent updated in journal!', type: 'success' });
    } catch (err) {
      addToast({ message: err.message || 'Failed to update wish consent', type: 'error' });
    } finally {
      setSavingConsent(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="h-20 bg-[#e6decb]/40 dark:bg-[#38342e]/40 rounded-2xl animate-pulse" />
        <div className="h-[600px] bg-[#fdfbf7] dark:bg-[#1f1d1a] border border-[#e6decb] dark:border-[#38342e] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-[#fdfbf7] dark:bg-[#1f1d1a] border border-[#e6decb] dark:border-[#38342e] text-center space-y-4">
        <h3 className="font-serif-journal text-xl font-bold">Entry not found</h3>
        <p className="text-sm text-[#5a4e4a] dark:text-[#beb6a8]">This page seems to be missing from your journal.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-amber-800 text-amber-50 rounded-lg text-sm font-semibold"
        >
          Back to Journal
        </button>
      </div>
    );
  }

  const categoryMeta = CATEGORY_META[plan.category] || CATEGORY_META.birthday;
  const items = plan.items || plan.plan?.vendors || [];
  const budgetPlan = plan.budget_plan || plan.plan || {};
  const budgetItems = budgetPlan.items || [];
  const buffer = Number(budgetPlan.buffer || 0);
  const total = Number(plan.budget || budgetPlan.total || 0);
  const ideas = plan.ideas || budgetPlan.ideas || [];
  const isScheduled = plan.status === 'scheduled';

  // Donut chart data
  const chartData = budgetItems.map((it) => ({
    name: it.item || it.title,
    value: Number(it.cost || 0),
  }));
  if (buffer > 0) {
    chartData.push({ name: 'Contingency Buffer', value: buffer });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Bar: Back & Page Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1f1d1a] text-[#5a4e4a] dark:text-[#beb6a8] hover:bg-[#f3eee3] dark:hover:bg-[#292622] transition text-sm font-serif-journal shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Turn Page Back</span>
          </button>

          {/* Category Edge Tab */}
          <span
            className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider text-white shadow-xs ${categoryMeta.tabBg}`}
          >
            {categoryMeta.label}
          </span>

          {isScheduled && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-700 text-emerald-50">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Scheduled</span>
            </span>
          )}
        </div>

        {/* Schedule & Sync Actions */}
        <div className="flex items-center gap-2">
          {isScheduled ? (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#f3eee3] dark:bg-[#292622] border border-[#e6decb] dark:border-[#38342e] text-[#2c2523] dark:text-[#ede8df] hover:bg-[#e6decb]/50 transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Calendar'}</span>
            </button>
          ) : (
            <button
              onClick={handleSchedule}
              disabled={scheduling}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-amber-800 dark:bg-amber-700 text-amber-50 hover:bg-amber-900 transition shadow-xs"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>{scheduling ? 'Booking Free Slots...' : 'Add to My Calendar'}</span>
            </button>
          )}

          {plan.gcal_url && (
            <a
              href={plan.gcal_url}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg border border-[#e6decb] dark:border-[#38342e] text-[#5a4e4a] dark:text-[#beb6a8] hover:bg-[#f3eee3] dark:hover:bg-[#292622] transition"
              title="Open Google Calendar Event"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Two-Page Journal Spread Container (Desktop: Two Columns; Mobile: Single Page) */}
      <div className="rounded-2xl border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1a1917] journal-shadow overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* ============================================================ */}
        {/* LEFT PAGE: Details + Lined Checklist + AI Margin Notes       */}
        {/* ============================================================ */}
        <div className="p-6 sm:p-10 border-b lg:border-b-0 lg:border-r border-[#e6decb] dark:border-[#38342e] journal-spine-left relative space-y-6">
          {/* Header & Date */}
          <div className="border-b border-[#e6decb] dark:border-[#38342e] pb-4">
            <span className="font-handwriting text-xl text-amber-800 dark:text-amber-400 block">
              Event Chapter
            </span>
            <h1 className="font-serif-journal text-2xl sm:text-3xl font-bold text-[#2c2523] dark:text-[#ede8df] leading-tight">
              {plan.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-serif-journal text-[#5a4e4a] dark:text-[#beb6a8]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                {plan.date ? new Date(plan.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Future'}
              </span>
              <span>•</span>
              <span>Timezone: {plan.tz || 'Asia/Kolkata'}</span>
              {plan.location && (
                <>
                  <span>•</span>
                  <span>📍 {plan.location}</span>
                </>
              )}
            </div>

            {plan.notes && (
              <div className="mt-3 p-3 rounded-lg bg-[#f3eee3]/70 dark:bg-[#292622]/70 border border-[#e6decb] dark:border-[#38342e]">
                <span className="text-[10px] font-serif-journal uppercase tracking-wider text-[#8b7d77] block font-bold">
                  Vision Notes
                </span>
                <p className="font-handwriting text-base text-[#2c2523] dark:text-[#ede8df] mt-0.5">
                  “{plan.notes}”
                </p>
              </div>
            )}
          </div>

          {/* Lined Checklist with AI Margin Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif-journal text-lg font-bold text-[#2c2523] dark:text-[#ede8df]">
                Itemized Tasks & AI Verdicts
              </h3>
              <span className="font-handwriting text-sm text-amber-800 dark:text-amber-400">
                review margin notes below
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const verdict = (item.verdict || 'optional').toLowerCase();
                const isUnnecessary = verdict === 'unnecessary';
                const isKept = Boolean(item.keep);
                const isStruck = isUnnecessary && !isKept;
                const pMeta = PRIORITY_META[item.priority] || PRIORITY_META.P2;

                return (
                  <div
                    key={item.id || idx}
                    className={`relative p-3.5 rounded-xl border transition-all ${
                      isStruck
                        ? 'opacity-60 bg-stone-100 dark:bg-stone-900/40 border-stone-300 dark:border-stone-800'
                        : 'bg-white/80 dark:bg-[#1f1d1a] border-[#e6decb] dark:border-[#38342e] shadow-xs'
                    }`}
                  >
                    {/* Ribbon Bookmark colored by priority */}
                    <div
                      className="absolute top-0 right-3 w-5 h-6 ribbon-bookmark shadow-xs"
                      style={{ color: pMeta.color }}
                      title={`Priority ${item.priority}`}
                    />

                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleItemOverride(item, { done: !item.done })}
                        className="mt-0.5 text-[#5a4e4a] hover:text-amber-800 dark:hover:text-amber-400 transition"
                      >
                        {item.done ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Square className="w-5 h-5 text-[#8b7d77]" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`font-serif-journal text-sm font-semibold text-[#2c2523] dark:text-[#ede8df] ${
                              isStruck ? 'line-through text-stone-400 dark:text-stone-500' : ''
                            } ${item.done ? 'line-through opacity-70' : ''}`}
                          >
                            {item.item}
                          </span>

                          <span className="font-bold text-xs text-amber-900 dark:text-amber-300">
                            {formatINR(item.cost)}
                          </span>
                        </div>

                        {/* AI Margin Notes in Caveat handwriting font */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 font-handwriting text-base">
                          {verdict === 'essential' && (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                              ✓ Essential task — scheduled {item.lead_days || 3} days prior
                            </span>
                          )}

                          {verdict === 'optional' && (
                            <span className="text-amber-700 dark:text-amber-400 font-bold">
                              ★ Optional addition
                            </span>
                          )}

                          {isUnnecessary && (
                            <span className="text-rose-700 dark:text-rose-400 font-bold">
                              ✗ AI verdict: Unnecessary
                            </span>
                          )}

                          {/* "Keep anyway" override toggle */}
                          {isUnnecessary && (
                            <button
                              type="button"
                              onClick={() => handleItemOverride(item, { keep: !isKept })}
                              className={`text-xs font-serif-journal px-2 py-0.5 rounded border transition-all ${
                                isKept
                                  ? 'bg-amber-800 text-amber-50 border-amber-800 font-bold'
                                  : 'bg-transparent text-amber-800 dark:text-amber-400 border-amber-800/40 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                              }`}
                            >
                              {isKept ? 'Kept anyway (Will schedule)' : 'Keep anyway?'}
                            </button>
                          )}
                        </div>

                        {/* Schedule timestamp if already scheduled */}
                        {item.scheduled_start && (
                          <div className="mt-1 text-[11px] font-serif-journal text-[#8b7d77] dark:text-[#8c8376]">
                            Calendar slot: {new Date(item.scheduled_start).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Birthday Wish Consent Card */}
          {plan.category === 'birthday' && (
            <div className="p-4 rounded-xl border border-pink-200 dark:border-pink-900/40 bg-pink-50/50 dark:bg-pink-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cake className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                  <span className="font-serif-journal text-sm font-bold text-pink-950 dark:text-pink-200">
                    Birthday Wish Dispatch
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wishConsent}
                    onChange={(e) => setWishConsent(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-stone-300 peer-focus:outline-hidden rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
              </div>

              {wishConsent && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={wishName}
                      onChange={(e) => setWishName(e.target.value)}
                      placeholder="Celebrant's Name"
                      className="px-3 py-1.5 rounded-lg border border-pink-200 dark:border-pink-800 bg-white dark:bg-[#1a1917] text-xs focus:ring-1 focus:ring-pink-600 outline-hidden"
                    />
                    <input
                      type="email"
                      value={wishEmail}
                      onChange={(e) => setWishEmail(e.target.value)}
                      placeholder="Celebrant's Email"
                      className="px-3 py-1.5 rounded-lg border border-pink-200 dark:border-pink-800 bg-white dark:bg-[#1a1917] text-xs focus:ring-1 focus:ring-pink-600 outline-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveConsent}
                    disabled={savingConsent}
                    className="px-3 py-1 text-xs font-semibold rounded bg-pink-600 text-white hover:bg-pink-700 transition"
                  >
                    {savingConsent ? 'Saving...' : 'Save Wish Settings'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* RIGHT PAGE: Budget Ledger + Donut Chart + Refine + Ideas     */}
        {/* ============================================================ */}
        <div className="p-6 sm:p-10 journal-spine-right relative space-y-6 bg-[#f9f6f0] dark:bg-[#1f1d1a]/50">
          <div>
            <span className="font-handwriting text-xl text-amber-800 dark:text-amber-400 block">
              Financial Ledger & Visuals
            </span>
            <div className="flex items-center justify-between">
              <h2 className="font-serif-journal text-2xl font-bold text-[#2c2523] dark:text-[#ede8df]">
                Budget Allocation
              </h2>
              <span className="font-serif-journal text-lg font-bold text-amber-900 dark:text-amber-300">
                {formatINR(total)}
              </span>
            </div>
          </div>

          {/* Recharts Budget Donut Chart */}
          <div className="h-60 w-full relative flex items-center justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [formatINR(val), 'Cost']}
                    contentStyle={{
                      backgroundColor: 'var(--paper-card)',
                      borderColor: 'var(--paper-border)',
                      borderRadius: '8px',
                      fontFamily: 'Lora, serif',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center font-handwriting text-base text-[#8b7d77]">
                No budget lines recorded yet
              </div>
            )}
          </div>

          {/* Budget Ledger Table */}
          <div className="border border-[#e6decb] dark:border-[#38342e] rounded-xl overflow-hidden bg-white/70 dark:bg-[#1f1d1a]/80 shadow-xs">
            <table className="w-full text-xs text-left font-serif-journal">
              <thead className="bg-[#f3eee3] dark:bg-[#292622] text-[#5a4e4a] dark:text-[#beb6a8] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3.5 py-2">Item</th>
                  <th className="px-3.5 py-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6decb]/60 dark:divide-[#38342e]/60">
                {budgetItems.map((bItem, i) => (
                  <tr key={i} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20">
                    <td className="px-3.5 py-2 text-[#2c2523] dark:text-[#ede8df]">
                      {bItem.item || bItem.title}
                    </td>
                    <td className="px-3.5 py-2 text-right font-semibold text-amber-900 dark:text-amber-300">
                      {formatINR(bItem.cost)}
                    </td>
                  </tr>
                ))}
                {buffer > 0 && (
                  <tr className="bg-amber-100/30 dark:bg-amber-950/20 font-semibold">
                    <td className="px-3.5 py-2 text-amber-800 dark:text-amber-400">
                      Contingency Buffer
                    </td>
                    <td className="px-3.5 py-2 text-right text-amber-800 dark:text-amber-400">
                      {formatINR(buffer)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* AI Refine Box */}
          <div className="p-4 rounded-xl border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1a1917] space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
              <h4 className="font-serif-journal text-sm font-bold text-[#2c2523] dark:text-[#ede8df]">
                Refine Journal Budget
              </h4>
            </div>

            {refine502 && (
              <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 border border-amber-300">
                {refine502}
              </div>
            )}

            <form onSubmit={handleRefine} className="space-y-2">
              <input
                type="text"
                value={refineChange}
                onChange={(e) => setRefineChange(e.target.value)}
                placeholder="e.g. Cut decorations by 20% and add live acoustic band"
                className="w-full px-3 py-2 rounded-lg border border-[#e6decb] dark:border-[#38342e] bg-white dark:bg-[#1f1d1a] text-xs font-serif-journal focus:ring-1 focus:ring-amber-700 outline-hidden"
              />

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={refineBudget}
                  onChange={(e) => setRefineBudget(e.target.value)}
                  placeholder="New Total ₹"
                  className="w-32 px-2.5 py-1.5 rounded-lg border border-[#e6decb] dark:border-[#38342e] bg-white dark:bg-[#1f1d1a] text-xs font-semibold focus:ring-1 focus:ring-amber-700 outline-hidden"
                />

                <button
                  type="submit"
                  disabled={refining}
                  className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-amber-800 text-amber-50 hover:bg-amber-900 transition shadow-xs"
                >
                  {refining ? 'Recalculating...' : 'Apply AI Refinement'}
                </button>
              </div>
            </form>
          </div>

          {/* AI Creative Ideas */}
          {ideas.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="font-handwriting text-lg text-amber-800 dark:text-amber-400 block">
                Journal Ideas & Sparks
              </span>
              <ul className="space-y-1.5">
                {ideas.map((idea, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs font-serif-journal text-[#5a4e4a] dark:text-[#beb6a8]"
                  >
                    <span className="text-amber-700 dark:text-amber-400 font-bold">•</span>
                    <span>{idea}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

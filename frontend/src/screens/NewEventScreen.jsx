import React, { useState, useId } from 'react';
import { api } from '../api';
import { CATEGORY_META, PRIORITY_META } from '../constants';
import { useToast } from '../context/ToastContext';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Cake,
  HeartHandshake,
  Briefcase,
  Plane,
  Users,
  ShieldCheck,
  Send,
  Plus,
  Trash2,
  BookOpen,
} from 'lucide-react';

const CATEGORY_ICONS = {
  birthday: Cake,
  wedding: HeartHandshake,
  meeting: Briefcase,
  travel: Plane,
  community: Users,
};

export function NewEventScreen({ onCreated, onCancel }) {
  const { addToast } = useToast();

  const [step, setStep] = useState(1); // 1: "Dear Journal" story & details, 2: "Your list" on lined paper
  const [loading, setLoading] = useState(false);
  const [friendlyError502, setFriendlyError502] = useState(null);

  // Compute minimum date: now in local timezone YYYY-MM-DDTHH:MM
  const nowMinIso = (() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  // Form State: 1) "Dear Journal" entry
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('birthday');
  const [eventStart, setEventStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(18, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [budget, setBudget] = useState(50000);
  const [guests, setGuests] = useState(25);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Form State: 2) "Your list" user tasks on lined paper
  const [userTasks, setUserTasks] = useState([
    { id: 'task_1', item: 'Find venue or cozy hall', cost: 15000, priority: 'P1', lead_days: 14 },
    { id: 'task_2', item: 'Catering & dessert table', cost: 20000, priority: 'P1', lead_days: 7 },
    { id: 'task_3', item: 'Decorations & memory photos', cost: 5000, priority: 'P2', lead_days: 3 },
  ]);

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCost, setNewTaskCost] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('P2');
  const [newTaskLeadDays, setNewTaskLeadDays] = useState(3);

  // Birthday wish consent state
  const [wishConsent, setWishConsent] = useState(false);
  const [wishName, setWishName] = useState('');
  const [wishEmail, setWishEmail] = useState('');

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    const newTask = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      item: newTaskText.trim(),
      cost: Number(newTaskCost) || 0,
      priority: newTaskPriority,
      lead_days: Number(newTaskLeadDays) || 3,
    };
    setUserTasks((prev) => [...prev, newTask]);
    setNewTaskText('');
    setNewTaskCost('');
  };

  const handleRemoveTask = (id) => {
    setUserTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!title.trim()) {
        addToast({ message: 'Please give your journal entry a title.', type: 'warning' });
        return;
      }
      if (!eventStart) {
        addToast({ message: 'Please pick an event date & time.', type: 'warning' });
        return;
      }
      if (new Date(eventStart) < new Date()) {
        addToast({ message: 'Past dates are disabled. Please pick a future date.', type: 'warning' });
        return;
      }
      if (!budget || Number(budget) <= 0) {
        addToast({ message: 'Budget must be greater than ₹0.', type: 'warning' });
        return;
      }
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setFriendlyError502(null);

    const payload = {
      title: title.trim(),
      category,
      event_start: eventStart,
      budget: Number(budget),
      guests: Number(guests) || 0,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      status: 'draft',
      user_items: userTasks.length > 0 ? userTasks : undefined,
      wish: category === 'birthday' && wishConsent ? {
        name: wishName.trim() || title.trim(),
        email: wishEmail.trim() || undefined,
        consent: true,
      } : undefined,
    };

    try {
      const createdPlan = await api.createPlan(payload);
      addToast({
        message: `AI analysis complete! Entry saved to journal.`,
        type: 'success',
      });
      onCreated(createdPlan.id || createdPlan._id);
    } catch (err) {
      if (err.status === 502) {
        setFriendlyError502(
          'The Groq AI assistant took too long or returned an invalid summary. Your journal draft is preserved! Click "Retry AI Review" below.'
        );
      } else {
        addToast({
          message: err.message || 'Could not save plan. Please verify the date is in the future.',
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Journal Book Container */}
      <div className="relative rounded-2xl bg-[#fdfbf7] dark:bg-[#1f1d1a] border border-[#e6decb] dark:border-[#38342e] journal-shadow overflow-hidden transition-colors">
        {/* Ribbon Bookmark decoration for active category */}
        <div className="absolute top-0 right-12 z-10 w-8 h-12 ribbon-bookmark shadow-md" style={{ color: CATEGORY_META[category].color }}>
          <div className="w-full h-full rounded-b-sm bg-current flex items-center justify-center text-white/90">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>

        {/* Journal Header with Lora Serif */}
        <div className="px-6 sm:px-10 pt-8 pb-4 border-b border-[#e6decb] dark:border-[#38342e] bg-[#f9f6f0] dark:bg-[#1a1917]/70">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-handwriting text-2xl text-amber-800 dark:text-amber-400 block -mb-1">
                Entry #{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <h2 className="font-serif-journal text-2xl sm:text-3xl font-bold text-[#2c2523] dark:text-[#ede8df]">
                {step === 1 ? '“Dear Journal...”' : 'Your Task List & Checklist'}
              </h2>
            </div>

            {/* Stepper Dots */}
            <div className="flex items-center gap-2 text-xs font-serif-journal text-[#8b7d77] dark:text-[#8c8376]">
              <span className={`px-2.5 py-1 rounded-md border ${step === 1 ? 'bg-amber-800 text-amber-50 font-bold border-amber-800' : 'bg-transparent border-[#e6decb] dark:border-[#38342e]'}`}>
                1. The Story
              </span>
              <span>→</span>
              <span className={`px-2.5 py-1 rounded-md border ${step === 2 ? 'bg-amber-800 text-amber-50 font-bold border-amber-800' : 'bg-transparent border-[#e6decb] dark:border-[#38342e]'}`}>
                2. Lined Notes & AI
              </span>
            </div>
          </div>
        </div>

        {/* 502 Friendly Retry Banner */}
        {friendlyError502 && (
          <div className="m-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold">AI Assistant Paused</p>
              <p className="mt-1 text-xs opacity-90">{friendlyError502}</p>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-800 dark:bg-amber-700 text-amber-50 hover:bg-amber-900 transition shadow-xs"
              >
                {loading ? 'Consulting AI...' : 'Retry AI Review'}
              </button>
            </div>
          </div>
        )}

        {/* Skeleton Loader during AI Call */}
        {loading ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center animate-bounce">
              <Sparkles className="w-8 h-8 text-amber-700 dark:text-amber-400" />
            </div>
            <h3 className="font-serif-journal text-xl font-bold text-[#2c2523] dark:text-[#ede8df]">
              Writing AI margin notes...
            </h3>
            <p className="font-handwriting text-lg text-amber-800 dark:text-amber-400 mt-2 max-w-md mx-auto">
              Analyzing budget, classifying essential vs optional items, and checking your free calendar slots.
            </p>

            <div className="mt-8 max-w-md mx-auto space-y-3">
              <div className="h-4 bg-[#e6decb]/60 dark:bg-[#38342e]/60 rounded-full animate-pulse w-3/4 mx-auto" />
              <div className="h-4 bg-[#e6decb]/60 dark:bg-[#38342e]/60 rounded-full animate-pulse w-5/6 mx-auto" />
              <div className="h-4 bg-[#e6decb]/60 dark:bg-[#38342e]/60 rounded-full animate-pulse w-2/3 mx-auto" />
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-10">
            {step === 1 ? (
              /* Step 1: "Dear Journal" Story & Event Details */
              <div className="space-y-6">
                {/* Category Selection with Book Edge Tabs */}
                <div>
                  <label className="block text-xs font-serif-journal uppercase tracking-wider text-[#5a4e4a] dark:text-[#beb6a8] mb-2 font-semibold">
                    Select Event Section (Category)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {Object.entries(CATEGORY_META).map(([key, meta]) => {
                      const Icon = CATEGORY_ICONS[key];
                      const isSelected = category === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setCategory(key)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium border transition-all text-left ${
                            isSelected
                              ? 'bg-amber-900/10 dark:bg-amber-400/10 border-amber-800 dark:border-amber-400 text-amber-900 dark:text-amber-200 font-bold shadow-xs'
                              : 'border-[#e6decb] dark:border-[#38342e] text-[#5a4e4a] dark:text-[#beb6a8] hover:bg-[#f3eee3] dark:hover:bg-[#292622]'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" style={{ color: meta.color }} />
                          <span className="capitalize">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Event Title */}
                <div>
                  <label className="block text-xs font-serif-journal uppercase tracking-wider text-[#5a4e4a] dark:text-[#beb6a8] mb-1 font-semibold">
                    Event Title / Occasion *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Maya's 25th Birthday Gala"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1a1917] text-[#2c2523] dark:text-[#ede8df] font-serif-journal text-base focus:ring-2 focus:ring-amber-700 dark:focus:ring-amber-400 outline-hidden"
                  />
                </div>

                {/* Date & Time (min = now, past disabled) & Budget */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-serif-journal uppercase tracking-wider text-[#5a4e4a] dark:text-[#beb6a8] mb-1 font-semibold">
                      Date & Time (Future Only) *
                    </label>
                    <div className="relative">
                      <input
                        type="datetime-local"
                        required
                        min={nowMinIso}
                        value={eventStart}
                        onChange={(e) => setEventStart(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1a1917] text-[#2c2523] dark:text-[#ede8df] text-sm focus:ring-2 focus:ring-amber-700 dark:focus:ring-amber-400 outline-hidden"
                      />
                    </div>
                    <span className="text-[11px] text-[#8b7d77] dark:text-[#8c8376] mt-0.5 block font-serif-journal">
                      Must be at least 1 hour from now.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-serif-journal uppercase tracking-wider text-[#5a4e4a] dark:text-[#beb6a8] mb-1 font-semibold">
                      Total Target Budget (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1a1917] text-[#2c2523] dark:text-[#ede8df] text-sm font-semibold focus:ring-2 focus:ring-amber-700 dark:focus:ring-amber-400 outline-hidden"
                    />
                  </div>
                </div>

                {/* Location and Guests */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-serif-journal uppercase tracking-wider text-[#5a4e4a] dark:text-[#beb6a8] mb-1 font-semibold">
                      Location / Venue
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Garden Pavilion, Indiranagar"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1a1917] text-[#2c2523] dark:text-[#ede8df] text-sm focus:ring-2 focus:ring-amber-700 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-serif-journal uppercase tracking-wider text-[#5a4e4a] dark:text-[#beb6a8] mb-1 font-semibold">
                      Expected Guest Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1a1917] text-[#2c2523] dark:text-[#ede8df] text-sm focus:ring-2 focus:ring-amber-700 outline-hidden"
                    />
                  </div>
                </div>

                {/* Notes in handwriting style */}
                <div>
                  <label className="block text-xs font-serif-journal uppercase tracking-wider text-[#5a4e4a] dark:text-[#beb6a8] mb-1 font-semibold">
                    Dear Journal... (Event Vision & Notes)
                  </label>
                  <textarea
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe your vision, special surprises, or theme wishes..."
                    className="w-full px-3.5 py-2 rounded-lg border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1a1917] text-[#2c2523] dark:text-[#ede8df] font-handwriting text-lg focus:ring-2 focus:ring-amber-700 outline-hidden"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[#e6decb] dark:border-[#38342e]">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-[#e6decb] dark:border-[#38342e] text-[#5a4e4a] dark:text-[#beb6a8] hover:bg-[#f3eee3] dark:hover:bg-[#292622] transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-800 dark:bg-amber-700 text-amber-50 hover:bg-amber-900 transition shadow-xs"
                  >
                    <span>Write Your Task List</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: "Your list" on lined paper */
              <div className="space-y-6">
                <div>
                  <h3 className="font-serif-journal text-lg font-bold text-[#2c2523] dark:text-[#ede8df]">
                    Lined Paper: Jot Down Your Items & Tasks
                  </h3>
                  <p className="font-handwriting text-base text-amber-800 dark:text-amber-400 mt-0.5">
                    Write what you have in mind. The AI will review each line in the margins and mark Essential, Optional, or Unnecessary.
                  </p>
                </div>

                {/* Lined Paper Container */}
                <div className="journal-lined-paper p-6 rounded-xl border border-[#e6decb] dark:border-[#38342e] shadow-inner space-y-3">
                  {userTasks.map((t, idx) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 bg-white/70 dark:bg-[#1f1d1a]/80 px-3 py-1.5 rounded-lg border border-[#e6decb]/80 dark:border-[#38342e]/80"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-serif-journal text-xs font-semibold text-amber-900 dark:text-amber-400 w-6">
                          {idx + 1}.
                        </span>
                        <span className="font-serif-journal text-sm text-[#2c2523] dark:text-[#ede8df] truncate">
                          {t.item}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="font-semibold text-amber-900 dark:text-amber-300">
                          ₹{Number(t.cost).toLocaleString('en-IN')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${PRIORITY_META[t.priority]?.badge || ''}`}>
                          {t.priority}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(t.id)}
                          className="text-[#8b7d77] hover:text-red-600 transition p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add New Line Input */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); } }}
                      placeholder="Add an item (e.g. Photography, Floral arch, DJ)"
                      className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1a1917] text-sm focus:ring-1 focus:ring-amber-700 outline-hidden"
                    />

                    <input
                      type="number"
                      value={newTaskCost}
                      onChange={(e) => setNewTaskCost(e.target.value)}
                      placeholder="Estimated ₹"
                      className="w-28 px-2.5 py-2 rounded-lg border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1a1917] text-sm focus:ring-1 focus:ring-amber-700 outline-hidden"
                    />

                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      className="px-2.5 py-2 rounded-lg border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1a1917] text-xs font-semibold focus:ring-1 focus:ring-amber-700 outline-hidden"
                    >
                      <option value="P1">P1 (High)</option>
                      <option value="P2">P2 (Med)</option>
                      <option value="P3">P3 (Low)</option>
                      <option value="P4">P4 (Info)</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleAddTask}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-800 text-amber-50 hover:bg-amber-900 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Line</span>
                    </button>
                  </div>
                </div>

                {/* Birthday Wish Consent Toggle (If category == birthday) */}
                {category === 'birthday' && (
                  <div className="p-4 rounded-xl border border-pink-200 dark:border-pink-900/50 bg-pink-50/60 dark:bg-pink-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cake className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                        <span className="font-serif-journal text-sm font-bold text-pink-950 dark:text-pink-200">
                          Automatic Birthday Wish Email
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <input
                          type="text"
                          value={wishName}
                          onChange={(e) => setWishName(e.target.value)}
                          placeholder="Celebrant's Name"
                          className="px-3 py-1.5 rounded-lg border border-pink-300 dark:border-pink-800 bg-white dark:bg-[#1a1917] text-xs focus:ring-1 focus:ring-pink-600 outline-hidden"
                        />
                        <input
                          type="email"
                          value={wishEmail}
                          onChange={(e) => setWishEmail(e.target.value)}
                          placeholder="Celebrant's Email Address"
                          className="px-3 py-1.5 rounded-lg border border-pink-300 dark:border-pink-800 bg-white dark:bg-[#1a1917] text-xs focus:ring-1 focus:ring-pink-600 outline-hidden"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[#e6decb] dark:border-[#38342e]">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-[#e6decb] dark:border-[#38342e] text-[#5a4e4a] dark:text-[#beb6a8] hover:bg-[#f3eee3] dark:hover:bg-[#292622] transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Story</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-amber-800 dark:bg-amber-700 text-amber-50 hover:bg-amber-900 transition shadow-xs"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Send for AI Review</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

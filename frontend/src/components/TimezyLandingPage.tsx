import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ChevronLeft,
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  Cake, 
  HeartHandshake, 
  Bookmark,
  Sun,
  Coins,
  Hourglass,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { DateSelector } from './DateSelector';
import { SampleIllustrationUI } from './SampleIllustrationUI';
import { EventCategory, EventPlan, FunctionType } from '../types';
import { 
  generateInitialBudget, 
  generateInitialChecklist, 
  generateInitialTimeline, 
  generateInitialVendors,
  formatTime12h,
  parseTimeString
} from '../services/defaultPlanGenerator';
import { useRealTimeClock } from '../hooks/useRealTimeClock';

interface TimezyLandingPageProps {
  onCreatePlan: (plan: EventPlan) => void;
  savedPlans: EventPlan[];
  onSelectSavedPlan: (planId: string) => void;
}

export const TimezyLandingPage: React.FC<TimezyLandingPageProps> = ({
  onCreatePlan,
  savedPlans,
  onSelectSavedPlan,
}) => {
  // Live real-time device clock and greeting
  const clock = useRealTimeClock();

  // 1 = Welcome Hero, 2 = Event Planning Setup
  const [activeView, setActiveView] = useState<'welcome' | 'setup' | 'saved'>('welcome');

  // Realistic default date: 3 weeks ahead of real current date
  const today = new Date();
  const defaultDateStr = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(defaultDateStr);
  const [commencementTime, setCommencementTime] = useState<string>('18:30');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('birthday');
  const [functionType, setFunctionType] = useState<FunctionType>('wedding');

  // No hardcoded predefined names!
  const [personName, setPersonName] = useState('');
  const [age, setAge] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [guestCount, setGuestCount] = useState('50');
  const [budget, setBudget] = useState('25000');
  const [formError, setFormError] = useState<string | null>(null);

  // Real-time live calculations based on user input
  const numBudget = Math.max(0, parseFloat(budget) || 0);
  const numGuests = Math.max(1, parseInt(guestCount, 10) || 1);
  const costPerGuest = Math.round(numBudget / numGuests);
  const daysUntilEvent = Math.max(
    0, 
    Math.ceil((new Date(selectedDate + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  );

  const parsedTime = parseTimeString(commencementTime);
  const displayCommencement = formatTime12h(parsedTime.hours, parsedTime.minutes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let finalTitle = '';
    if (selectedCategory === 'birthday') {
      const name = personName.trim() || 'Celebrant';
      finalTitle = age.trim() 
        ? `${name}'s ${age.trim()}th Birthday Celebration` 
        : `${name}'s Birthday Celebration`;
    } else {
      finalTitle = customTitle.trim() || 'Celebration Gala & Reception';
    }

    const budgetItems = generateInitialBudget(selectedCategory, functionType, numBudget, venue.trim());
    const timelineTasks = generateInitialTimeline(selectedCategory, functionType, selectedDate, commencementTime);
    const checklistItems = generateInitialChecklist(selectedCategory, functionType);
    const vendors = generateInitialVendors(selectedCategory, functionType, numBudget, venue.trim());

    const newPlan: EventPlan = {
      id: `plan-${Date.now()}`,
      title: finalTitle,
      category: selectedCategory,
      functionType: selectedCategory === 'functions' ? functionType : undefined,
      eventDate: selectedDate,
      commencementTime: displayCommencement,
      personName: selectedCategory === 'birthday' ? personName.trim() : undefined,
      age: selectedCategory === 'birthday' && age.trim() ? parseInt(age.trim(), 10) : undefined,
      venue: venue.trim() || 'Celebration Venue',
      guestCount: numGuests,
      budget: numBudget,
      notes: '',
      createdAt: new Date().toISOString(),
      budgetItems,
      timelineTasks,
      checklistItems,
      vendors,
    };

    onCreatePlan(newPlan);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 flex flex-col items-center">

      {/* ─────────────────────────────────────────────────────────────
          PAGE 1: TIMEZY WELCOME SCREEN
          ───────────────────────────────────────────────────────────── */}
      {activeView === 'welcome' && (
        <div className="timezy-device w-full max-w-[400px] p-6 sm:p-7 pb-8 flex flex-col justify-between min-h-[650px] h-auto text-[#082b03] animate-fade-up">
          <div>
            {/* Top time indicator: Live dynamic device time */}
            <div className="flex items-center justify-between text-xs font-bold text-[#082b03] mb-4">
              <span className="font-mono tracking-tight">{clock.time}</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1.5 bg-[#082b03] rounded-xs" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#082b03]" />
              </div>
            </div>

            {/* Timezy Title */}
            <div className="text-center mt-1 mb-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-[#082b03]">
                Timezy
              </h1>
            </div>

            {/* Pure Vector Sample UI (No external image) */}
            <div className="my-3">
              <SampleIllustrationUI />
            </div>

            {/* Headings from reference design */}
            <div className="mt-4 text-center">
              <h2 className="text-2xl font-extrabold text-[#082b03] leading-snug">
                Schedule Smarter,<br />Work Better
              </h2>
              <p className="text-xs text-[#5e7264] mt-2.5 leading-relaxed max-w-[260px] mx-auto font-medium">
                Plan your celebrations, track realistic Indian Rupee budgets, and organize complete vendor schedules.
              </p>
            </div>
          </div>

          {/* Bottom Action Area */}
          <div className="pt-4 flex flex-col items-center gap-3">
            {/* Live date indicator */}
            <div className="text-[11px] font-mono text-[#5e7264] px-3 py-1 rounded-full bg-[#eaf3e7] border border-[#d6ebd0]">
              {clock.todayFormatted}
            </div>

            <button
              type="button"
              onClick={() => setActiveView('setup')}
              className="w-full timezy-btn-dark py-4 px-6 text-sm text-center flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
            >
              <span>Let's Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {savedPlans.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveView('saved')}
                className="text-xs font-semibold text-[#5e7264] hover:text-[#082b03] transition-colors underline underline-offset-4 cursor-pointer pt-1"
              >
                View Saved Plans ({savedPlans.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PAGE 2: CLEAN EVENT PLANNER CONSOLE (No Fake Stats)
          ───────────────────────────────────────────────────────────── */}
      {activeView === 'setup' && (
        <div className="timezy-device w-full max-w-[420px] p-5 sm:p-6 pb-8 flex flex-col justify-between min-h-[640px] h-auto text-[#082b03] animate-fade-up shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            
            {/* Real device time & status */}
            <div className="flex items-center justify-between text-xs font-bold text-[#082b03]">
              <span className="font-mono">{clock.time}</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1.5 bg-[#082b03] rounded-xs" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#082b03]" />
              </div>
            </div>

            {/* Live Greeting based on real-time device hour (Only greeting, no 'Event Planner', no logo) */}
            <div className="pt-0.5">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-xl font-extrabold text-[#082b03] tracking-tight">
                  {clock.greeting}
                </span>
              </div>
            </div>

            {/* Occasion Category */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#5e7264] block mb-1">
                Occasion Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('birthday')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedCategory === 'birthday'
                      ? 'bg-[#082b03] text-white border-[#082b03] shadow-xs'
                      : 'bg-white text-[#082b03] border-[#e2ebe0] hover:bg-[#f4f8f2]'
                  }`}
                >
                  <Cake className="w-4 h-4 mb-0.5" />
                  <span className="font-bold block text-xs">Birthdays &amp; Parties</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('functions')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedCategory === 'functions'
                      ? 'bg-[#082b03] text-white border-[#082b03] shadow-xs'
                      : 'bg-white text-[#082b03] border-[#e2ebe0] hover:bg-[#f4f8f2]'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4 mb-0.5" />
                  <span className="font-bold block text-xs">Weddings &amp; Galas</span>
                </button>
              </div>
            </div>

            {/* Dynamic Name / Title Input */}
            {selectedCategory === 'birthday' ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5e7264] block mb-1">
                    Celebrant Name
                  </label>
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2ebe0] text-xs text-[#082b03] font-medium focus:outline-none focus:border-[#082b03]"
                    placeholder="e.g. Sophia"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5e7264] block mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2ebe0] text-xs text-[#082b03] font-medium focus:outline-none focus:border-[#082b03]"
                    placeholder="18"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5e7264] block mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2ebe0] text-xs text-[#082b03] font-medium focus:outline-none focus:border-[#082b03]"
                  placeholder="e.g. Grand Wedding Gala &amp; Reception"
                />
              </div>
            )}

            {/* Venue & Guests */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5e7264] block mb-1">
                  Venue / Location
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2ebe0] text-xs text-[#082b03] font-medium focus:outline-none focus:border-[#082b03]"
                  placeholder="e.g. Banquet Hall"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5e7264] block mb-1">
                  Expected Guests
                </label>
                <input
                  type="number"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2ebe0] text-xs text-[#082b03] font-medium focus:outline-none focus:border-[#082b03]"
                  placeholder="50"
                  min="1"
                />
              </div>
            </div>

            {/* Realistic Budget Input in INR (₹) */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#5e7264] block mb-1">
                Target Budget (Indian Rupees ₹)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#e2ebe0] text-xs text-[#082b03] font-bold focus:outline-none focus:border-[#082b03]"
                placeholder="25000"
                min="1000"
              />
            </div>

            {/* Celebration Date */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#5e7264] block mb-1">
                Celebration Date
              </label>
              <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
            </div>

            {/* Commencement Time (Streamlined Row with presets) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5e7264] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#082b03]" />
                  <span>Commencement Time</span>
                </label>
                <span className="text-[10px] font-mono font-bold text-[#082b03] bg-[#eaf3e7] px-2 py-0.5 rounded-full border border-[#d6ebd0]">
                  {displayCommencement}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={commencementTime}
                  onChange={(e) => setCommencementTime(e.target.value)}
                  className="w-28 shrink-0 px-2.5 py-1.5 rounded-xl bg-white border border-[#e2ebe0] text-xs text-[#082b03] font-bold focus:outline-none focus:border-[#082b03]"
                />

                {/* Quick Presets for Commencement Time */}
                <div className="flex-1 grid grid-cols-4 gap-1">
                  {[
                    { label: '11:00 AM', val: '11:00' },
                    { label: '04:00 PM', val: '16:00' },
                    { label: '06:30 PM', val: '18:30' },
                    { label: '07:30 PM', val: '19:30' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setCommencementTime(preset.val)}
                      className={`text-[9px] py-1.5 px-0.5 rounded-lg border font-semibold text-center transition-all truncate cursor-pointer ${
                        commencementTime === preset.val
                          ? 'bg-[#082b03] text-white border-[#082b03] shadow-xs'
                          : 'bg-white text-[#5e7264] border-[#e2ebe0] hover:bg-[#f4f8f2]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* REAL Dynamic Event Preview Cards (Calculated directly from inputs) */}
            <div className="p-2.5 rounded-xl bg-[#eaf3e7] border border-[#d6ebd0] grid grid-cols-4 gap-1 text-center">
              <div>
                <span className="text-[9px] font-bold text-[#5e7264] block uppercase">Budget</span>
                <span className="text-xs font-extrabold text-[#082b03]">₹{numBudget.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#5e7264] block uppercase">Cost/Guest</span>
                <span className="text-xs font-extrabold text-[#082b03]">₹{costPerGuest.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#5e7264] block uppercase">Countdown</span>
                <span className="text-xs font-extrabold text-[#082b03]">{daysUntilEvent} days</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#5e7264] block uppercase">Commences</span>
                <span className="text-xs font-extrabold text-[#082b03]">{displayCommencement}</span>
              </div>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-red-100 text-red-800 text-xs font-medium">
                {formError}
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView('welcome')}
                className="w-10 h-10 rounded-full bg-white border border-[#e2ebe0] flex items-center justify-center text-[#082b03] hover:bg-[#f4f8f2] shrink-0 cursor-pointer shadow-xs"
                title="Back to Welcome"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="submit"
                className="flex-1 timezy-btn-dark py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
              >
                <span>Create Event Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PAGE 3: SAVED PLANS DIRECTORY
          ───────────────────────────────────────────────────────────── */}
      {activeView === 'saved' && (
        <div className="timezy-device w-full max-w-[400px] p-6 flex flex-col justify-between min-h-[640px] h-auto text-[#082b03] animate-fade-up">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-[#082b03]">
              <span className="font-mono">{clock.time}</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#eaf3e7] text-[#082b03] border border-[#d6ebd0]">
                {clock.todayFormatted}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-[#082b03]">
                Your Saved Plans
              </h2>
              <p className="text-xs text-[#5e7264]">Select any plan to continue</p>
            </div>

            <div className="space-y-2.5">
              {savedPlans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectSavedPlan(p.id)}
                  className="p-3.5 rounded-2xl bg-white border border-[#e2ebe0] hover:border-[#082b03] cursor-pointer flex items-center justify-between shadow-2xs group"
                >
                  <div className="min-w-0 mr-2">
                    <span className="font-bold text-xs text-[#082b03] block truncate group-hover:text-emerald-950">
                      {p.title}
                    </span>
                    <span className="text-[11px] text-[#5e7264] font-mono block">
                      ₹{p.budget?.toLocaleString('en-IN')} · {p.guestCount} Guests
                    </span>
                  </div>
                  <ChevronLeft className="w-4 h-4 rotate-180 text-[#082b03]" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => setActiveView('setup')}
              className="w-full timezy-btn-dark py-3 text-xs flex items-center justify-center gap-1.5"
            >
              <span>Create Another Event</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

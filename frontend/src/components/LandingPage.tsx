import React, { useState } from 'react';
import {
  Cake, CalendarDays, MapPin, Users, Bookmark,
  ChevronRight, Sparkles, ArrowRight, HeartHandshake,
  Flame, Flower2
} from 'lucide-react';
import { DateSelector } from './DateSelector';
import { EventCategory, EventPlan, FunctionType } from '../types';
import {
  generateInitialBudget,
  generateInitialChecklist,
  generateInitialTimeline,
  generateInitialVendors,
} from '../services/defaultPlanGenerator';

interface LandingPageProps {
  onCreatePlan: (plan: EventPlan) => void;
  savedPlans: EventPlan[];
  onSelectSavedPlan: (planId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreatePlan,
  savedPlans,
  onSelectSavedPlan,
}) => {
  const today = new Date();
  const defaultDateStr = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(defaultDateStr);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>('functions');

  const [personName, setPersonName] = useState('');
  const [age, setAge] = useState<string>('');
  const [birthdayTheme, setBirthdayTheme] = useState('');

  const [functionType, setFunctionType] = useState<FunctionType>('wedding');
  const [customFunctionTitle, setCustomFunctionTitle] = useState('');

  const [venue, setVenue] = useState('Heritage Palace & Lawns, Jaipur');
  const [guestCount, setGuestCount] = useState<string>('250');
  const [budget, setBudget] = useState<string>('800000');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedCategory) {
      setFormError('Kripya event category select karein (Janamdin ya Shaadi & Samaroh).');
      return;
    }

    let title = '';
    if (selectedCategory === 'birthday') {
      if (!personName.trim()) {
        setFormError("Kripya janamdin vyakti ka shubh naam enter karein.");
        return;
      }
      title = age.trim()
        ? `${personName.trim()} Ka ${age.trim()}th Janamdin Samaroh`
        : `${personName.trim()} Ka Shubh Janamdin Utsav`;
    } else {
      if (customFunctionTitle.trim()) {
        title = customFunctionTitle.trim();
      } else {
        const typeLabels: Partial<Record<FunctionType, string>> = {
          wedding: 'Shree Vivah & Grand Reception',
          engagement: 'Shubh Roka & Ring Ceremony (Sagai)',
          sangeet_mehendi: 'Rangilo Sangeet & Mehendi Night',
          anniversary: 'Shaadi Ki Saalgirah & Sashti Poorthi',
          family: 'Khandani Milan & Griha Pravesh',
          puja_ceremony: 'Satyanarayan Puja & Havan Samaroh',
          celebration: 'Khaas Utsav & Grand Gala',
        };
        title = typeLabels[functionType] || 'Shubh Samaroh';
      }
    }

    const numBudget = parseFloat(budget) || 500000;
    const numGuests = parseInt(guestCount, 10) || 150;

    const budgetItems = generateInitialBudget(selectedCategory, functionType, numBudget);
    const timelineTasks = generateInitialTimeline(selectedCategory, functionType, selectedDate);
    const checklistItems = generateInitialChecklist(selectedCategory, functionType);
    const vendors = generateInitialVendors(selectedCategory, functionType);

    const newPlan: EventPlan = {
      id: `plan-${Date.now()}`,
      title,
      category: selectedCategory,
      functionType: selectedCategory === 'functions' ? functionType : undefined,
      eventDate: selectedDate,
      personName: selectedCategory === 'birthday' ? personName.trim() : undefined,
      age: selectedCategory === 'birthday' && age.trim() ? parseInt(age.trim(), 10) : undefined,
      theme: selectedCategory === 'birthday' ? birthdayTheme.trim() : undefined,
      venue: venue.trim() || 'Shubh Sthal (To be finalized)',
      guestCount: numGuests,
      budget: numBudget,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      budgetItems,
      timelineTasks,
      checklistItems,
      vendors,
    };

    onCreatePlan(newPlan);
  };

  const inputClass =
    'w-full input-dark px-3.5 py-2.5 rounded-lg text-sm text-[#F5EFE0] focus:outline-none';
  const labelClass =
    'block text-[10px] font-mono uppercase tracking-[0.12em] text-[#9C9080] mb-1.5';

  return (
    <div className="min-h-[calc(100vh-62px)] flex flex-col lg:flex-row animate-fade-up">

      {/* ── LEFT HERO PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] xl:w-[46%] min-h-full px-12 xl:px-16 py-14 relative">
        <div className="fixed inset-y-0 left-0 w-[44%] xl:w-[46%] bg-gradient-to-r from-[rgba(10,9,7,0.85)] via-[rgba(10,9,7,0.6)] to-transparent pointer-events-none z-0" />

        <div className="relative z-10 pt-6">
          <div className="flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-[#C9A84C] opacity-70" />
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#C9A84C] font-semibold">
              Shubh Samaroh &amp; Shaadi Planner
            </span>
          </div>

          <h1 className="font-serif text-4xl xl:text-5xl text-[#F5EFE0] font-normal leading-[1.2] mb-6">
            Har Utsav, Ek<br />
            <em className="not-italic text-[#E8C97A]">Yaadgaar Shuruat.</em><br />
            Grand Desi Celebrations.
          </h1>

          <p className="text-[#9C9080] text-[15px] leading-relaxed max-w-md mb-10">
            Shaadi, Sangeet, Mehendi, Janamdin ya Griha Pravesh — Halwai se lekar Mandap, Dhol aur Panditji tak, sabkuch ekdum pakka organize karein.
          </p>

          <div className="flex flex-col gap-3.5">
            {[
              { title: 'Desi AI Planning Guru', desc: 'Muhurat, Halwai menu aur Shagun suggestions' },
              { title: 'Hisaab-Kitaab in INR (₹)', desc: 'Advance payment, baqi rashi aur contingency buffer' },
              { title: 'Step-by-Step Desi Timeline', desc: 'Roka se lekar Varmala aur Vidai tak ka roadmap' },
              { title: 'Vendors & Barati Management', desc: 'Dhol walas, Mehendi artists, caterers & decor' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-[#C9A84C] mt-1.5 shrink-0" />
                <div>
                  <span className="text-[#F5EFE0] font-medium block">{f.title}</span>
                  <span className="text-[12px] text-[#9C9080]">{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[10px] font-mono text-[#9C9080]/60 tracking-widest uppercase">
          Gather &amp; Plan — Paramparik Shubh Aayojan Studio
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col justify-start lg:justify-center py-8 px-4 sm:px-8 lg:px-10 xl:px-14 overflow-y-auto">

        {/* Mobile hero */}
        <div className="lg:hidden mb-8 text-center">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C9A84C]">
            Shubh Samaroh &amp; Shaadi Planner
          </span>
          <h1 className="font-serif text-3xl text-[#F5EFE0] font-normal leading-tight mt-2">
            Plan your <em className="not-italic text-[#E8C97A]">Grand Desi Celebration.</em>
          </h1>
          <p className="text-xs text-[#9C9080] mt-1">Shaadi, Sangeet, Janamdin &amp; Griha Pravesh Planning in INR (₹)</p>
        </div>

        {/* Glass form card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 max-w-xl w-full mx-auto relative overflow-hidden">
          <div className="silk-ribbon" />

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles className="w-4 h-4 text-[#C9A84C]" />
              <h2 className="font-serif text-[22px] text-[#F5EFE0] font-normal tracking-tight">
                Shubh Aarambh Karein — New Event Plan
              </h2>
            </div>
            <p className="text-[11px] text-[#9C9080] font-mono uppercase tracking-widest pl-6">
              Aaj Ki Tarikh: {today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="gold-line mb-6" />

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ① Shubh Din / Event Date */}
            <div>
              <label className={labelClass}>① Shubh Din (Auspicious Event Date)</label>
              <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
            </div>

            {/* ② Category */}
            <div>
              <label className={labelClass}>② Occasion Type (Aayojan Ka Prakar)</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'functions', label: 'Shaadi & Samaroh', Icon: HeartHandshake, desc: 'Vivah, Sangeet, Roka, Griha Pravesh, Anniversaries' },
                  { key: 'birthday', label: 'Janamdin & Milestones', Icon: Cake, desc: 'Birthdays, Annaprashan, Namakaran, 60th Jubilee' },
                ].map(({ key, label, Icon, desc }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCategory(key as EventCategory)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedCategory === key
                        ? 'border-[rgba(201,168,76,0.8)] bg-[rgba(201,168,76,0.15)] shadow-[0_0_12px_rgba(201,168,76,0.15)]'
                        : 'border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.04)] hover:border-[rgba(201,168,76,0.4)]'
                    }`}
                  >
                    <div className={`mb-2 p-1.5 rounded-lg inline-flex ${
                      selectedCategory === key
                        ? 'bg-[rgba(201,168,76,0.25)] text-[#E8C97A]'
                        : 'bg-[rgba(255,255,255,0.06)] text-[#9C9080]'
                    }`}>
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className={`font-serif text-sm font-medium ${selectedCategory === key ? 'text-[#E8C97A]' : 'text-[#F5EFE0]'}`}>
                      {label}
                    </div>
                    <div className="text-[10px] text-[#9C9080] mt-0.5 leading-snug">{desc}</div>
                  </button>
                ))}
              </div>

              {/* Quick Fill Desi Inspirations */}
              <div className="mt-3.5 flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-mono text-[#9C9080]/70 uppercase tracking-wider">Quick Desi Presets:</span>
                {selectedCategory === 'functions' ? (
                  <>
                    <button type="button"
                      onClick={() => {
                        setFunctionType('wedding');
                        setCustomFunctionTitle("Meera & Rohan Ki Royal Shaadi");
                        setVenue('Heritage Palace & Lawns, Jaipur');
                        setGuestCount('350');
                        setBudget('1500000');
                        setNotes('Rajputana theme, Shehnai & Dhol entry, pure veg royal halwai feast.');
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full gold-badge hover:bg-[rgba(201,168,76,0.25)] transition-colors font-mono">
                      Royal Shaadi (₹15L)
                    </button>
                    <button type="button"
                      onClick={() => {
                        setFunctionType('sangeet_mehendi');
                        setCustomFunctionTitle("Rangilo Sangeet & Mehendi Night");
                        setVenue('The Courtyard Garden Lawns, Bengaluru');
                        setGuestCount('150');
                        setBudget('400000');
                        setNotes('Genda phool decor, Punjabi Dhol, live chaat stalls & DJ.');
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full gold-badge hover:bg-[rgba(201,168,76,0.25)] transition-colors font-mono">
                      Sangeet &amp; Mehendi (₹4L)
                    </button>
                    <button type="button"
                      onClick={() => {
                        setFunctionType('family');
                        setCustomFunctionTitle("New Home Griha Pravesh & Havan");
                        setVenue('Skyline Greens Villa, Pune');
                        setGuestCount('60');
                        setBudget('120000');
                        setNotes('Satyanarayan puja, morning havan with Panditji & traditional lunch feast.');
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full gold-badge hover:bg-[rgba(201,168,76,0.25)] transition-colors font-mono">
                      Griha Pravesh (₹1.2L)
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button"
                      onClick={() => {
                        setPersonName('Aarav');
                        setAge('1');
                        setBirthdayTheme('Bal Gopal & Peacock Feather Theme');
                        setVenue('Grand Crystal Banquet, Mumbai');
                        setGuestCount('75');
                        setBudget('150000');
                        setNotes('First birthday celebration with Annaprashan ceremony, live pasta/chaat counter & return gift hampers.');
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full gold-badge hover:bg-[rgba(201,168,76,0.25)] transition-colors font-mono">
                      1st Birthday &amp; Annaprashan
                    </button>
                    <button type="button"
                      onClick={() => {
                        setPersonName('Sharma Ji');
                        setAge('60');
                        setBirthdayTheme('Golden Jubilee Sashti Poorthi');
                        setVenue('Orchid Banquet Hall, New Delhi');
                        setGuestCount('120');
                        setBudget('350000');
                        setNotes('60th birthday jubilee with Shanti havan, ghazal evening & family felicitation.');
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full gold-badge hover:bg-[rgba(201,168,76,0.25)] transition-colors font-mono">
                      60th Sashti Poorthi
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ③ Specific details */}
            <div>
              <label className={labelClass}>③ Samaroh Details &amp; Kharcha</label>
              <div className="space-y-3">

                {selectedCategory === 'functions' && (
                  <div className="space-y-3 animate-fade-up">
                    <div>
                      <label className={labelClass}>Function Type (Utsav Prakar)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {([
                          { type: 'wedding', label: 'Shaadi / Vivah' },
                          { type: 'engagement', label: 'Roka & Sagai' },
                          { type: 'sangeet_mehendi', label: 'Sangeet & Mehendi' },
                          { type: 'family', label: 'Griha Pravesh' },
                          { type: 'puja_ceremony', label: 'Puja & Havan' },
                          { type: 'anniversary', label: 'Saalgirah / Jubilee' },
                        ] as { type: FunctionType; label: string }[]).map((item) => (
                          <button key={item.type} type="button"
                            onClick={() => setFunctionType(item.type)}
                            className={`px-2.5 py-2 text-[11px] font-mono rounded-lg border text-center transition-all ${
                              functionType === item.type
                                ? 'btn-gold border-transparent'
                                : 'border-[rgba(201,168,76,0.2)] text-[#9C9080] hover:border-[rgba(201,168,76,0.5)] hover:text-[#E8C97A] bg-[rgba(255,255,255,0.04)]'
                            }`}>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Custom Title (Samaroh Ka Naam)</label>
                      <input type="text" placeholder="e.g. Meera & Rohan Ki Royal Shaadi"
                        value={customFunctionTitle} onChange={(e) => setCustomFunctionTitle(e.target.value)}
                        className={inputClass} />
                    </div>
                  </div>
                )}

                {selectedCategory === 'birthday' && (
                  <div className="space-y-3 animate-fade-up">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className={labelClass}>Janamdin Vyakti Ka Shubh Naam *</label>
                        <input type="text" required placeholder="e.g. Aarav, Ananya, Sharma Ji"
                          value={personName} onChange={(e) => setPersonName(e.target.value)}
                          className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Umar (Age)</label>
                        <input type="number" min="1" max="120" placeholder="e.g. 1, 25, 60"
                          value={age} onChange={(e) => setAge(e.target.value)}
                          className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Theme / Vibe (optional)</label>
                      <input type="text" placeholder="e.g. Bal Gopal, Bollywood Disco, Royal Marigold, Pastel Floral..."
                        value={birthdayTheme} onChange={(e) => setBirthdayTheme(e.target.value)}
                        className={inputClass} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`${labelClass} flex items-center gap-1`}>
                      <MapPin className="w-3 h-3 text-[#C9A84C]" /> Shubh Sthal / Venue
                    </label>
                    <input type="text" placeholder="e.g. Heritage Palace, Jaipur / Banquet Hall"
                      value={venue} onChange={(e) => setVenue(e.target.value)}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className={`${labelClass} flex items-center gap-1`}>
                      <Users className="w-3 h-3 text-[#C9A84C]" /> Mehmaan (Guest Count)
                    </label>
                    <input type="number" min="10" placeholder="e.g. 250 Baratis & Mehman"
                      value={guestCount} onChange={(e) => setGuestCount(e.target.value)}
                      className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={`${labelClass} flex items-center gap-1`}>
                    <span className="text-[#C9A84C] font-serif font-bold text-xs">₹</span> Kull Budget / Estimated Kharcha (INR)
                  </label>
                  <input type="number" min="10000" step="10000" placeholder="e.g. 800000"
                    value={budget} onChange={(e) => setBudget(e.target.value)}
                    className={inputClass} />
                  <p className="text-[10px] text-[#9C9080] font-mono mt-1">
                    Entered: ₹{parseInt(budget || '0', 10).toLocaleString('en-IN')} (
                    {parseInt(budget || '0', 10) >= 100000 
                      ? `${(parseInt(budget || '0', 10) / 100000).toFixed(1)} Lakhs` 
                      : `₹${budget}`})
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Khaas Hidayat / Notes (optional)</label>
                  <textarea rows={2} placeholder="Traditions, pure veg requirements, panditji samagri, baraat timings..."
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    className={`${inputClass} resize-none`} />
                </div>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-lg border border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.07)] text-[#E8C97A] text-xs font-mono">
                {formError}
              </div>
            )}

            <button type="submit"
              className="btn-gold w-full py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-sm">
              <span className="font-serif text-base tracking-wide">Shubh Aarambh Karein — Create Event Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Saved Plans */}
        {savedPlans.length > 0 && (
          <div className="max-w-xl w-full mx-auto mt-8 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <Bookmark className="w-3.5 h-3.5 text-[#C9A84C]" />
              <h2 className="font-serif text-[15px] text-[#F5EFE0] font-normal">Purane Shubh Plans (Saved Entries)</h2>
              <div className="flex-1 gold-line ml-2" />
            </div>

            <div className="space-y-2">
              {savedPlans.map((p) => {
                const daysLeft = Math.ceil(
                  (new Date(p.eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectSavedPlan(p.id)}
                    className="glass-card rounded-xl px-4 py-3.5 cursor-pointer hover:border-[rgba(201,168,76,0.5)] transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0 mr-4">
                      <span className="font-serif text-sm text-[#F5EFE0] block truncate group-hover:text-[#E8C97A] transition-colors">
                        {p.title}
                      </span>
                      <span className="text-[11px] text-[#9C9080] font-mono">
                        {new Date(p.eventDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}{p.venue} · ₹{p.budget?.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        daysLeft > 0 ? 'gold-badge' : 'bg-[rgba(255,255,255,0.05)] text-[#9C9080] border border-[rgba(255,255,255,0.08)]'
                      }`}>
                        {daysLeft > 0 ? `${daysLeft} din baqi` : 'Sampanna (Done)'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#9C9080] group-hover:text-[#E8C97A] transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

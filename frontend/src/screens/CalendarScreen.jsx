import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { CATEGORY_META, formatINR } from '../constants';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Cake,
  HeartHandshake,
  Briefcase,
  Plane,
  Users,
  BookOpen,
} from 'lucide-react';

const CATEGORY_ICONS = {
  birthday: Cake,
  wedding: HeartHandshake,
  meeting: Briefcase,
  travel: Plane,
  community: Users,
};

export function CalendarScreen({ onSelectEvent }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await api.getPlans();
      setPlans(res || []);
    } catch (err) {
      console.error('Failed to load plans for calendar', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      month: month - 1,
      year: year,
      isCurrentMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({
      day: d,
      month: month,
      year: year,
      isCurrentMonth: true,
    });
  }
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let n = 1; n <= remaining; n++) {
    calendarDays.push({
      day: n,
      month: month + 1,
      year: year,
      isCurrentMonth: false,
    });
  }

  // Map plans to date string YYYY-MM-DD
  const eventsByDate = {};
  plans.forEach((p) => {
    const rawDate = p.date || p.event_start;
    if (rawDate) {
      const dtKey = new Date(rawDate).toISOString().split('T')[0];
      if (!eventsByDate[dtKey]) {
        eventsByDate[dtKey] = [];
      }
      eventsByDate[dtKey].push(p);
    }
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Calendar Header with Journal Styling */}
      <div className="rounded-2xl bg-[#fdfbf7] dark:bg-[#1f1d1a] border border-[#e6decb] dark:border-[#38342e] journal-shadow p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-handwriting text-xl text-amber-800 dark:text-amber-400 block -mb-1">
            Almanac & Scheduled Pages
          </span>
          <h2 className="font-serif-journal text-2xl sm:text-3xl font-bold text-[#2c2523] dark:text-[#ede8df]">
            {monthNames[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg border border-[#e6decb] dark:border-[#38342e] text-xs font-serif-journal font-semibold hover:bg-[#f3eee3] dark:hover:bg-[#292622] transition"
          >
            Today
          </button>
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-[#e6decb] dark:border-[#38342e] hover:bg-[#f3eee3] dark:hover:bg-[#292622] transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-[#e6decb] dark:border-[#38342e] hover:bg-[#f3eee3] dark:hover:bg-[#292622] transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month Grid */}
      <div className="rounded-2xl border border-[#e6decb] dark:border-[#38342e] bg-[#fdfbf7] dark:bg-[#1f1d1a] journal-shadow overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-[#e6decb] dark:border-[#38342e] bg-[#f9f6f0] dark:bg-[#1a1917] text-center font-serif-journal text-xs uppercase font-bold text-[#5a4e4a] dark:text-[#beb6a8] py-2.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#e6decb]/60 dark:divide-[#38342e]/60">
          {calendarDays.map((c, i) => {
            const pad = (n) => String(n).padStart(2, '0');
            const dateObj = new Date(c.year, c.month, c.day);
            const dateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
            const dayEvents = eventsByDate[dateStr] || [];
            const isToday = new Date().toDateString() === dateObj.toDateString();

            return (
              <div
                key={i}
                onClick={() => dayEvents.length > 0 && setSelectedDayEvents({ date: dateStr, events: dayEvents })}
                className={`min-h-[100px] sm:min-h-[120px] p-2 transition flex flex-col justify-between ${
                  !c.isCurrentMonth ? 'bg-stone-50/50 dark:bg-stone-900/30 opacity-40' : 'hover:bg-amber-50/30 dark:hover:bg-amber-950/20'
                } ${dayEvents.length > 0 ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-serif-journal text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? 'bg-amber-800 text-amber-50'
                        : 'text-[#2c2523] dark:text-[#ede8df]'
                    }`}
                  >
                    {c.day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-handwriting text-amber-800 dark:text-amber-400 font-bold">
                      {dayEvents.length} entry
                    </span>
                  )}
                </div>

                {/* Event Dots / Badges */}
                <div className="space-y-1 mt-1">
                  {dayEvents.slice(0, 2).map((ev, idx) => {
                    const meta = CATEGORY_META[ev.category] || CATEGORY_META.birthday;
                    return (
                      <div
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev.id || ev._id);
                        }}
                        className={`text-[10px] truncate px-1.5 py-0.5 rounded font-serif-journal font-semibold text-white ${meta.tabBg}`}
                      >
                        {ev.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-[#8b7d77] block font-serif-journal">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Modal / Popover */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#fdfbf7] dark:bg-[#1f1d1a] border border-[#e6decb] dark:border-[#38342e] rounded-2xl p-6 journal-shadow space-y-4">
            <div className="flex items-center justify-between border-b border-[#e6decb] dark:border-[#38342e] pb-2">
              <h3 className="font-serif-journal text-lg font-bold text-[#2c2523] dark:text-[#ede8df]">
                Entries on {new Date(selectedDayEvents.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </h3>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="text-xs font-semibold px-2 py-1 rounded bg-[#f3eee3] dark:bg-[#292622]"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              {selectedDayEvents.events.map((ev) => (
                <div
                  key={ev.id || ev._id}
                  onClick={() => {
                    setSelectedDayEvents(null);
                    onSelectEvent(ev.id || ev._id);
                  }}
                  className="p-3 rounded-lg border border-[#e6decb] dark:border-[#38342e] hover:bg-amber-50/60 dark:hover:bg-amber-950/30 cursor-pointer flex items-center justify-between"
                >
                  <span className="font-serif-journal text-sm font-bold text-[#2c2523] dark:text-[#ede8df]">
                    {ev.title}
                  </span>
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                    Open Page →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

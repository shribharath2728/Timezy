import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateSelectorProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onDateChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const parsedDate = new Date(selectedDate + 'T00:00:00');
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const [viewYear, setViewYear] = useState(validDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(validDate.getMonth());

  const dayOfWeek = validDate.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNumber = validDate.getDate();
  const monthYear = validDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) { 
      setViewMonth(11); 
      setViewYear(viewYear - 1); 
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) { 
      setViewMonth(0); 
      setViewYear(viewYear + 1); 
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(i + 1).padStart(2, '0');
    return { day: i + 1, dateString: `${viewYear}-${mm}-${dd}` };
  });

  const handleSelectDay = (dateStr: string) => {
    onDateChange(dateStr);
    setIsOpen(false);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);

  return (
    <div className="w-full relative">
      {/* Compact date trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-[#e2ebe0] rounded-2xl px-3.5 py-2.5 cursor-pointer hover:border-[#082b03] transition-all flex items-center justify-between group shadow-2xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#eaf3e7] text-[#082b03] flex items-center justify-center font-bold text-sm">
            {dayNumber}
          </div>
          <div>
            <div className="text-xs font-bold text-[#082b03]">{monthYear} ({dayOfWeek})</div>
            <div className="text-[10px] text-[#5e7264]">Click to pick celebration date</div>
          </div>
        </div>
        <CalendarIcon className="w-4 h-4 text-[#082b03]" />
      </div>

      {/* Calendar popover */}
      {isOpen && (
        <div className="w-full mt-2 bg-white border border-[#d6ebd0] rounded-2xl p-4 z-30 shadow-lg animate-fade-up">
          {/* Controls */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#eef5eb]">
            <button 
              type="button" 
              onClick={handlePrevMonth}
              className="p-1 rounded-full text-[#082b03] hover:bg-[#eaf3e7] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <select 
                value={viewMonth} 
                onChange={(e) => setViewMonth(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#f4f8f2] border border-[#e2ebe0] text-xs font-semibold text-[#082b03] px-2 py-1 rounded-lg focus:outline-none"
              >
                {monthNames.map((name, idx) => (
                  <option key={name} value={idx}>{name}</option>
                ))}
              </select>

              <select 
                value={viewYear} 
                onChange={(e) => setViewYear(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#f4f8f2] border border-[#e2ebe0] text-xs font-semibold text-[#082b03] px-2 py-1 rounded-lg focus:outline-none"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <button 
              type="button" 
              onClick={handleNextMonth}
              className="p-1 rounded-full text-[#082b03] hover:bg-[#eaf3e7] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[#5e7264] mb-1.5">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => <span key={d}>{d}</span>)}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-7" />
            ))}
            {calendarDays.map((item) => {
              const isSelected = item.dateString === selectedDate;
              return (
                <button 
                  type="button" 
                  key={item.dateString}
                  onClick={() => handleSelectDay(item.dateString)}
                  className={`h-7 w-full rounded-lg flex items-center justify-center font-semibold transition-all text-xs ${
                    isSelected
                      ? 'bg-[#082b03] text-white shadow-xs'
                      : 'text-[#082b03] hover:bg-[#eaf3e7]'
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-2.5 pt-2 border-t border-[#eef5eb] flex items-center justify-between">
            <button 
              type="button"
              onClick={() => handleSelectDay(new Date().toISOString().split('T')[0])}
              className="text-[11px] font-semibold text-[#5e7264] hover:text-[#082b03]"
            >
              Today
            </button>
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#082b03] text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

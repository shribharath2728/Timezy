import React from 'react';
import { Sparkles, User, ArrowLeft, Flame, Sun, PenTool, Printer, CalendarHeart } from 'lucide-react';

interface HeaderProps {
  onToggleAi: () => void;
  isAiOpen: boolean;
  isInWorkspace?: boolean;
  onBackToHome?: () => void;
  savedPlansCount?: number;
  onOpenSavedPlans?: () => void;
  isCandlelight?: boolean;
  onToggleCandlelight?: () => void;
  onOpenScrapbook?: () => void;
  onPrintKeepsake?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleAi,
  isAiOpen,
  isInWorkspace,
  onBackToHome,
  savedPlansCount = 0,
  onOpenSavedPlans,
  isCandlelight = false,
  onToggleCandlelight,
  onOpenScrapbook,
  onPrintKeepsake,
}) => {
  return (
    <header className="w-full sticky top-0 z-40 no-print">
      {/* Gold top hairline */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent opacity-60" />

      <div className="glass-panel border-t-0 border-x-0 border-b border-[rgba(201,168,76,0.25)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-[64px] flex items-center justify-between gap-4">

          {/* LEFT: Logo + Back */}
          <div className="flex items-center gap-3 min-w-0">
            {isInWorkspace && onBackToHome && (
              <button
                onClick={onBackToHome}
                className="flex items-center gap-1.5 text-xs text-[#9C9080] hover:text-[#E8C97A] transition-colors group shrink-0"
                title="Wapas Homepage Par Jayein"
                aria-label="Back to home"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline font-mono uppercase tracking-widest text-[10px]">Wapas Home</span>
              </button>
            )}

            <div
              onClick={isInWorkspace ? onBackToHome : undefined}
              className={`flex items-center gap-3 ${isInWorkspace ? 'cursor-pointer' : ''}`}
            >
              {/* Royal gold seal */}
              <div className="wax-seal w-9 h-9 rounded-full flex items-center justify-center select-none shrink-0 shadow-md">
                <CalendarHeart className="w-4 h-4 text-[#0D0C0A]" strokeWidth={2.2} />
              </div>

              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-[17px] tracking-tight font-semibold text-[#F5EFE0] leading-none">
                    Gather &amp; Plan
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C9A84C] px-1.5 py-0.5 rounded gold-badge">
                    Shubh Aayojan
                  </span>
                </div>
                <p className="text-[11px] text-[#9C9080] tracking-wide mt-0.5">
                  Desi Shaadi, Sangeet &amp; Event Planner Studio
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

            {/* Diya / Candlelight toggle */}
            {onToggleCandlelight && (
              <button
                onClick={onToggleCandlelight}
                className={`p-2 rounded-full border transition-all text-sm ${
                  isCandlelight
                    ? 'bg-[rgba(201,168,76,0.2)] text-[#E8C97A] border-[rgba(201,168,76,0.5)]'
                    : 'text-[#9C9080] border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.5)] hover:text-[#E8C97A]'
                }`}
                title={isCandlelight ? 'Daylight (Din Ka Ujala)' : 'Diya & Candlelight Warmth (Shaam Ki Roshni)'}
                aria-label="Toggle ambient lighting"
              >
                {isCandlelight ? <Sun className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Scrapbook / Diary */}
            {onOpenScrapbook && (
              <button
                onClick={onOpenScrapbook}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[#9C9080] hover:text-[#E8C97A] border border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.5)] rounded transition-all"
                title="Shubh Vichar & Scrapbook Diary"
              >
                <PenTool className="w-3 h-3" />
                <span>Patrika / Notes</span>
              </button>
            )}

            {/* Print keepsake */}
            {isInWorkspace && onPrintKeepsake && (
              <button
                onClick={onPrintKeepsake}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[#9C9080] hover:text-[#E8C97A] border border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.5)] rounded transition-all"
                title="Print Shubh Patrika / Keepsake PDF"
              >
                <Printer className="w-3 h-3" />
                <span>Print Patrika</span>
              </button>
            )}

            {/* Saved Plans */}
            {savedPlansCount > 0 && onOpenSavedPlans && (
              <button
                onClick={onOpenSavedPlans}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[#9C9080] hover:text-[#E8C97A] border border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.5)] rounded transition-all"
                title="Aapke Purane Plans"
              >
                <span>Aayojan</span>
                <span className="w-4 h-4 rounded-full bg-[rgba(201,168,76,0.2)] text-[10px] font-mono flex items-center justify-center text-[#E8C97A] font-bold">
                  {savedPlansCount}
                </span>
              </button>
            )}

            {/* AI Guru Button */}
            <button
              onClick={onToggleAi}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-widest rounded-lg transition-all ${
                isAiOpen
                  ? 'btn-gold shadow-md'
                  : 'text-[#E8C97A] border border-[rgba(201,168,76,0.45)] hover:border-[rgba(201,168,76,0.8)] bg-[rgba(201,168,76,0.08)] hover:bg-[rgba(201,168,76,0.15)]'
              }`}
              aria-label="Toggle AI Assistant"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-semibold">AI Planner Guru</span>
            </button>

            {/* Profile */}
            <div
              className="w-8 h-8 rounded-full border border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.1)] flex items-center justify-center text-[#9C9080] hover:border-[rgba(201,168,76,0.6)] hover:text-[#E8C97A] cursor-pointer transition-colors"
              title="Yajman Profile"
            >
              <User className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

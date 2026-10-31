import React from 'react';
import { Sparkles, ArrowLeft, Sun, Flame, PenTool, Printer } from 'lucide-react';

interface TimezyHeaderProps {
  onToggleAi: () => void;
  isAiOpen: boolean;
  isInWorkspace?: boolean;
  onBackToHome?: () => void;
  savedPlansCount?: number;
  onOpenSavedPlans?: () => void;
  onOpenScrapbook?: () => void;
}

export const TimezyHeader: React.FC<TimezyHeaderProps> = ({
  onToggleAi,
  isAiOpen,
  isInWorkspace,
  onBackToHome,
  savedPlansCount = 0,
  onOpenSavedPlans,
  onOpenScrapbook,
}) => {
  return (
    <header className="w-full sticky top-0 z-40 bg-[#dcecd2]/90 backdrop-blur-md border-b border-[#c8dec0] no-print">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-3">
          {isInWorkspace && onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-2 rounded-full bg-white text-[#082b03] border border-[#e2ede0] shadow-xs hover:bg-[#f4f8f2] transition-colors"
              title="Return to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div 
            onClick={isInWorkspace ? onBackToHome : undefined}
            className={`flex items-center gap-2.5 ${isInWorkspace ? 'cursor-pointer' : ''}`}
          >
            <div>
              <span className="font-extrabold text-2xl tracking-tight text-[#082b03] block leading-none">
                Timezy
              </span>
              <span className="text-[10px] font-mono text-[#5e7264] uppercase tracking-wider">
                Event Diary &amp; Planner
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenScrapbook && (
            <button
              onClick={onOpenScrapbook}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#082b03] bg-white border border-[#e2ede0] rounded-full shadow-xs hover:bg-[#f4f8f2] transition-all"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>
          )}

          <button
            onClick={onToggleAi}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full shadow-sm transition-all ${
              isAiOpen
                ? 'bg-[#082b03] text-white ring-2 ring-[#082b03]/20'
                : 'bg-white text-[#082b03] border border-[#e2ede0] hover:bg-[#f4f8f2]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI Assistant</span>
          </button>
        </div>

      </div>
    </header>
  );
};


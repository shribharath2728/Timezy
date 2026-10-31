import React from 'react';
import { Sparkles } from 'lucide-react';

interface FloatingQuillButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const FloatingQuillButton: React.FC<FloatingQuillButtonProps> = ({
  onClick,
  isOpen,
}) => {
  if (isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 no-print group">
      <button
        onClick={onClick}
        className="timezy-btn-dark w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 relative border-2 border-white"
        aria-label="Open AI Planning Assistant"
      >
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
      </button>

      {/* Hover tooltip */}
      <div className="absolute right-16 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#e2ede0] text-xs font-semibold text-[#113425] shadow-sm whitespace-nowrap pointer-events-none">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
        <span>Timezy AI Assistant</span>
      </div>
    </div>
  );
};

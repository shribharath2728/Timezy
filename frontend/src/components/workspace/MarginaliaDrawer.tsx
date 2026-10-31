import React, { useState, useEffect } from 'react';
import { X, PenTool, Copy, Check, Bookmark } from 'lucide-react';

interface MarginaliaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle?: string;
}

const STORAGE_KEY = 'timezy_scrapbook_notes';

const INSPIRATIONAL_QUOTES = [
  "Hospitality is making others feel warmly welcome and celebrated.",
  "Great celebrations are created from thoughtful, caring details.",
  "Every milestone, song and shared laugh creates a lasting memory.",
  "Careful planning lets you relax and enjoy the moment with your loved ones.",
];

export const MarginaliaDrawer: React.FC<MarginaliaDrawerProps> = ({
  isOpen,
  onClose,
  planTitle,
}) => {
  const [notes, setNotes] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || '';
    setNotes(saved);
    setQuoteIndex(Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length));
  }, []);

  const handleNotesChange = (val: string) => {
    setNotes(val);
    localStorage.setItem(STORAGE_KEY, val);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md h-full flex flex-col z-10 bg-white border-l border-[#e2ede0] shadow-2xl">

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#e2ede0] flex items-center justify-between bg-[#f4f8f2]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#113425] flex items-center justify-center text-white">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#113425] leading-none">
                Diary Notes &amp; Ideas
              </h3>
              <p className="text-[11px] text-[#6b7f73] font-mono mt-1">
                {planTitle ? `Reflections for ${planTitle}` : 'Personal musings and checklists'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-full text-[#6b7f73] hover:text-[#113425] hover:bg-[#eaf5e6] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quote banner */}
        <div className="mx-4 mt-4 p-3.5 rounded-2xl bg-[#f8faf7] border border-[#eef4ec]">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#113425] uppercase tracking-widest mb-1.5 font-bold">
            <Bookmark className="w-3 h-3" />
            <span>Thought of the Day</span>
          </div>
          <p className="italic text-xs text-[#113425] leading-relaxed">
            "{INSPIRATIONAL_QUOTES[quoteIndex]}"
          </p>
        </div>

        {/* Notes area */}
        <div className="flex-1 p-5 flex flex-col">
          <label className="block text-[10px] font-mono text-[#6b7f73] uppercase tracking-widest mb-3">
            Personal Notes &amp; Thoughts
          </label>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Type quick ideas, catering notes, guest gift thoughts, florist quotes, or contact numbers..."
            className="flex-1 w-full bg-[#f8faf7] border border-[#e2ede0] rounded-2xl p-4 focus:outline-none focus:border-[#113425] text-[#113425] font-sans text-sm leading-relaxed resize-none placeholder:text-[#6b7f73]/50"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e2ede0] flex items-center justify-between text-xs font-mono text-[#6b7f73] bg-[#f8faf7]">
          <span>{notes.length} characters</span>
          <div className="flex items-center gap-2">
            {notes.trim() && (
              <button onClick={handleCopy}
                className="px-3 py-1.5 rounded-full border border-[#e2ede0] text-[#113425] hover:bg-white flex items-center gap-1.5 transition-all text-xs font-semibold">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            )}
            <button onClick={onClose} className="timezy-btn-dark px-4 py-1.5 rounded-full text-xs">
              Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

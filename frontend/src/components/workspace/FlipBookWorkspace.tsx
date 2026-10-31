import React, { useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { EventPlan } from '../../types';
import { PageBudget, PageCalendar, PageChecklist, PageCover, PageSummary } from './pages';

interface FlipBookWorkspaceProps {
  plan: EventPlan;
  onBack: () => void;
  onUpdatePlan: (updated: EventPlan) => void;
  onOpenAi: () => void;
}

interface IPageFlipInstance {
  flipNext: () => void;
  flipPrev: () => void;
  turnToPage: (page: number) => void;
}

interface IPageFlipContainer {
  pageFlip: () => IPageFlipInstance;
}

interface IFlipEvent {
  data: number;
}

// Strictly typed wrapper for HTMLFlipBook
const FlipBookComponent = HTMLFlipBook as unknown as React.ComponentType<{
  ref?: React.Ref<IPageFlipContainer>;
  width: number;
  height: number;
  size?: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  maxShadowOpacity?: number;
  showCover?: boolean;
  mobileScrollSupport?: boolean;
  usePortrait?: boolean;
  showPageCorners?: boolean;
  swipeDistance?: number;
  clickEventForward?: boolean;
  drawShadow?: boolean;
  flippingTime?: number;
  className?: string;
  style?: React.CSSProperties;
  onFlip?: (e: IFlipEvent) => void;
  children: React.ReactNode;
}>;

export const FlipBookWorkspace: React.FC<FlipBookWorkspaceProps> = ({
  plan,
  onBack,
  onUpdatePlan,
  onOpenAi,
}) => {
  const flipBookRef = useRef<IPageFlipContainer | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const flipNext = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipNext();
    }
  };

  const flipPrev = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  };

  const turnToPage = (pageNum: number) => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().turnToPage(pageNum);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        flipNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        flipPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        flipNext();
      } else {
        flipPrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 flex flex-col items-center">
      
      {/* Top Breadcrumb & Navigation */}
      <div className="w-full flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-white text-[#082b03] border border-[#d6ebd0] shadow-xs hover:bg-[#f4f8f2] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>All Plans</span>
        </button>

        {/* Interactive Tab Jump Pills matching Book Flip */}
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs p-1 rounded-full border border-[#d6ebd0] shadow-xs text-xs font-semibold">
          {[
            { label: 'Cover', page: 0 },
            { label: 'Summary', page: 1 },
            { label: 'Budget', page: 2 },
            { label: 'Calendar', page: 3 },
            { label: 'Checklist', page: 4 },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => turnToPage(tab.page)}
              className={`px-3 py-1.5 rounded-full transition-all ${
                currentPage === tab.page
                  ? 'bg-[#082b03] text-white shadow-xs'
                  : 'text-[#5e7264] hover:text-[#082b03]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenAi}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full bg-[#082b03] text-white shadow-sm hover:bg-[#051c02] transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Assistant</span>
        </button>
      </div>

      {/* The Physical Realistic Book / Mockup Flip Container */}
      <div 
        className="relative w-full max-w-[420px] sm:max-w-[440px] flex items-center justify-center select-none my-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Floating Left Side Flip Arrow (One-tap effortless page turn) */}
        {currentPage > 0 && (
          <button
            type="button"
            onClick={flipPrev}
            className="absolute -left-4 sm:-left-7 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white text-[#082b03] border-2 border-[#d6ebd0] shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 hover:bg-[#eaf3e7] cursor-pointer"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Floating Right Side Flip Arrow (One-tap effortless page turn) */}
        {currentPage < 4 && (
          <button
            type="button"
            onClick={flipNext}
            className="absolute -right-4 sm:-right-7 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white text-[#082b03] border-2 border-[#d6ebd0] shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 hover:bg-[#eaf3e7] cursor-pointer"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div className="timezy-device w-full h-[640px] sm:h-[660px] flex items-center justify-center p-0 overflow-hidden shadow-2xl border-[7px] border-white rounded-[40px] bg-[#fbfdfa]">
          {/* React Pageflip instance snugly assembled to fit the frame */}
          <FlipBookComponent
            ref={flipBookRef}
            width={420}
            height={640}
            size="stretch"
            minWidth={320}
            maxWidth={440}
            minHeight={580}
            maxHeight={660}
            maxShadowOpacity={0.4}
            showCover={false}
            mobileScrollSupport={true}
            usePortrait={true}
            showPageCorners={false}
            swipeDistance={15}
            clickEventForward={true}
            drawShadow={true}
            flippingTime={400}
            className="demo-book w-full h-full"
            style={{ margin: '0 auto', width: '100%', height: '100%' }}
            onFlip={(e: IFlipEvent) => setCurrentPage(e.data)}
          >
            {/* Page 0: Book Cover */}
            <PageCover 
              plan={plan} 
              title="Timezy Event Planner" 
              subtitle="Schedule Smarter, Celebrate Better"
              onStart={() => turnToPage(1)} 
            />

            {/* Page 1: Middle Screen in Reference (Summary & Activity) */}
            <PageSummary 
              plan={plan} 
              onNext={flipNext} 
            />

            {/* Page 2: Budget */}
            <PageBudget 
              plan={plan} 
              onPrev={flipPrev} 
              onNext={flipNext} 
              onUpdatePlan={onUpdatePlan} 
            />

            {/* Page 3: Right Screen in Reference (Planner, Calendar & Schedulers) */}
            <PageCalendar 
              plan={plan} 
              onPrev={flipPrev} 
              onNext={flipNext} 
              onUpdatePlan={onUpdatePlan} 
            />

            {/* Page 4: Checklist & Vendors */}
            <PageChecklist 
              plan={plan} 
              onPrev={flipPrev} 
              onUpdatePlan={onUpdatePlan} 
              onOpenAi={onOpenAi} 
            />
          </FlipBookComponent>
        </div>
      </div>

      {/* Bottom Flipping Controls for User */}
      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={flipPrev}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#082b03] border border-[#d6ebd0] text-xs font-semibold shadow-2xs hover:bg-[#f4f8f2] transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* Minimal indicator dots matching reference */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-white/90 backdrop-blur-xs rounded-full border border-[#d6ebd0] shadow-2xs">
          {[0, 1, 2, 3, 4].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => turnToPage(idx)}
              className={`transition-all duration-300 rounded-full ${
                currentPage === idx
                  ? 'w-6 h-1.5 bg-[#082b03]'
                  : 'w-1.5 h-1.5 bg-[#bad4b6] hover:bg-[#8ba389]'
              }`}
            />
          ))}
        </div>

        <button
          onClick={flipNext}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#082b03] border border-[#d6ebd0] text-xs font-semibold shadow-2xs hover:bg-[#f4f8f2] transition-all"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { EventPlan } from '../../../types';
import { PageCornerCurl } from '../PageCornerCurl';

// React-pageflip requires React.forwardRef for page components
export const PageCover = React.forwardRef<HTMLDivElement, { title: string; subtitle: string; plan: EventPlan; onStart: () => void }>(
  (props, ref) => {
    return (
      <div ref={ref} className="page-container relative p-6 sm:p-8 pb-8 flex flex-col justify-between bg-[#fbfdfa] border-r border-[#e0ece0] text-[#082b03]">
        <div>
          {/* Header pill */}
          <div className="flex items-center justify-between mb-8">
            <span className="font-extrabold text-xl tracking-tight text-[#082b03]">Timezy</span>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#eaf3e7] text-[#082b03] font-semibold border border-[#d6ebd0]">
              {new Date(props.plan.eventDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="mt-8 text-center sm:text-left">
            <span className="text-xs uppercase font-mono tracking-widest text-[#5e7264] block mb-2">
              Event Plan
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#082b03] leading-tight mb-3">
              {props.plan.title}
            </h1>
            <p className="text-xs text-[#5e7264] leading-relaxed">
              {props.plan.venue} · {props.plan.guestCount} Guests
            </p>
          </div>

          {/* Quick Stats Grid with REAL data */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            <div className="p-4 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0]">
              <span className="text-[10px] uppercase font-mono text-[#5e7264] block">Total Budget</span>
              <span className="text-lg font-bold text-[#082b03]">₹{props.plan.budget?.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-4 rounded-2xl bg-[#f4f8f2] border border-[#e0ece0]">
              <span className="text-[10px] uppercase font-mono text-[#5e7264] block">Event Schedule</span>
              <span className="text-xs font-bold text-[#082b03] mt-1 block">
                {new Date(props.plan.eventDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-[11px] font-semibold text-[#5e7264] block mt-0.5">
                Commences: {props.plan.commencementTime || '06:30 PM'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button at bottom: Related to planning (No "Open & Turn Pages") */}
        <div className="pt-6">
          <button 
            type="button"
            onClick={props.onStart}
            className="w-full timezy-btn-dark py-3.5 px-6 flex items-center justify-center gap-2 text-sm"
          >
            <span>Review Event Plan &amp; Schedule</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Corner Curl Effect */}
        <PageCornerCurl onClick={props.onStart} />
      </div>
    );
  }
);
PageCover.displayName = 'PageCover';

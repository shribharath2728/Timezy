import React from 'react';

export const SampleIllustrationUI: React.FC = () => {
  return (
    <div className="relative w-full h-56 flex flex-col items-center justify-between select-none px-2">
      
      {/* Background soft ambient sun & birds */}
      <div className="absolute top-1 right-8 flex items-center gap-2">
        {/* Flying birds */}
        <svg width="32" height="16" viewBox="0 0 32 16" fill="none" className="text-[#8ba389] opacity-70">
          <path d="M2 8 C5 4, 8 4, 11 8 C14 4, 17 4, 20 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M18 5 C20 2, 22 2, 24 5 C26 2, 28 2, 30 5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>

        {/* Cheerful Sun */}
        <div className="relative w-9 h-9 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#fce881]/40 blur-xs animate-pulse" />
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#f6ce48] to-[#ffea88] flex items-center justify-center shadow-[0_0_14px_rgba(246,206,72,0.6)]">
            <div className="w-5 h-5 rounded-full bg-[#fde98a]" />
          </div>
          {/* Subtle sun rays */}
          <div className="absolute -inset-1 border border-dashed border-[#f6cf4c]/50 rounded-full animate-spin-slow opacity-60" />
        </div>
      </div>

      {/* Vector / SVG Character at desk with laptop and coffee */}
      <div className="relative w-full max-w-[260px] flex-1 flex items-end justify-center">
        <svg 
          viewBox="0 0 260 170" 
          className="w-full h-full max-h-[160px]"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Desk line stretching across */}
          <line x1="5" y1="154" x2="255" y2="154" stroke="#082b03" strokeWidth="2.4" strokeLinecap="round" />

          {/* Coffee Mug on Left */}
          <g id="mug">
            {/* Mug body */}
            <rect x="26" y="122" width="24" height="30" rx="5" fill="#cae5f5" stroke="#082b03" strokeWidth="2" />
            {/* Mug handle */}
            <path d="M50 128 C56 128, 56 144, 50 144" stroke="#082b03" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Steam curves rising */}
            <path d="M32 116 Q35 110, 32 104" stroke="#9bc5dc" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M41 117 Q44 111, 41 105" stroke="#9bc5dc" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </g>

          {/* Character Body / Shoulders & Shirt */}
          <g id="body">
            {/* White Collared Shirt */}
            <path 
              d="M80 154 L84 126 C88 102, 106 98, 130 98 C154 98, 172 102, 176 126 L180 154 Z" 
              fill="#ffffff" 
              stroke="#082b03" 
              strokeWidth="2.2" 
            />
            {/* Shirt Collar flaps */}
            <path d="M114 98 L130 118 L121 125 L112 103" fill="#f4f8f3" stroke="#082b03" strokeWidth="1.6" />
            <path d="M146 98 L130 118 L139 125 L148 103" fill="#f4f8f3" stroke="#082b03" strokeWidth="1.6" />
            {/* Placket seam */}
            <line x1="130" y1="118" x2="130" y2="154" stroke="#082b03" strokeWidth="1.8" />
            {/* Subtle shirt buttons */}
            <circle cx="130" cy="130" r="1.2" fill="#082b03" />
            <circle cx="130" cy="142" r="1.2" fill="#082b03" />
          </g>

          {/* Hair behind shoulders */}
          <path 
            d="M104 68 C104 42, 156 42, 156 68 C160 82, 160 110, 166 124 C154 126, 106 126, 94 124 C100 110, 100 82, 104 68 Z" 
            fill="#754b2d" 
            stroke="#082b03" 
            strokeWidth="2" 
          />

          {/* Face */}
          <ellipse cx="130" cy="72" rx="22" ry="24" fill="#ffd8b8" stroke="#082b03" strokeWidth="2" />

          {/* Ears */}
          <circle cx="106" cy="72" r="5" fill="#ffd8b8" stroke="#082b03" strokeWidth="1.6" />
          <circle cx="154" cy="72" r="5" fill="#ffd8b8" stroke="#082b03" strokeWidth="1.6" />

          {/* Green Headset Band */}
          <path d="M106 70 C106 46, 154 46, 154 70" stroke="#1d4825" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          {/* Ear pads */}
          <rect x="101" y="65" width="7" height="14" rx="3.5" fill="#082b03" />
          <rect x="152" y="65" width="7" height="14" rx="3.5" fill="#082b03" />
          {/* Headset boom mic to mouth */}
          <path d="M152 74 Q148 88, 137 88" stroke="#082b03" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="136" cy="88" r="2.8" fill="#082b03" />

          {/* Hair Bangs front */}
          <path 
            d="M110 57 C117 48, 134 48, 150 54 C145 61, 138 63, 130 61 C122 63, 115 61, 110 57 Z" 
            fill="#754b2d" 
          />

          {/* Eyes and Friendly Expression */}
          <circle cx="122" cy="70" r="2.2" fill="#082b03" />
          <circle cx="138" cy="70" r="2.2" fill="#082b03" />
          {/* Delicate Eyebrows */}
          <path d="M119 65 Q122 63, 125 65" stroke="#082b03" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M135 65 Q138 63, 141 65" stroke="#082b03" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          {/* Cheerful Smile */}
          <path d="M125 80 Q130 85, 135 80" stroke="#082b03" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Rosy cheeks */}
          <circle cx="118" cy="76" r="3" fill="#f8b6a8" opacity="0.5" />
          <circle cx="142" cy="76" r="3" fill="#f8b6a8" opacity="0.5" />

          {/* Hands resting on Laptop */}
          <g id="hands">
            <ellipse cx="96" cy="144" rx="9" ry="6.5" fill="#ffd8b8" stroke="#082b03" strokeWidth="1.8" />
            <ellipse cx="164" cy="144" rx="9" ry="6.5" fill="#ffd8b8" stroke="#082b03" strokeWidth="1.8" />
          </g>

          {/* Laptop in Center */}
          <g id="laptop">
            {/* Open Lid (Back of display) */}
            <path d="M92 112 L168 112 L174 144 L86 144 Z" fill="#9ba2aa" stroke="#082b03" strokeWidth="2.2" />
            {/* Metallic inner shade */}
            <path d="M96 116 L164 116 L169 141 L91 141 Z" fill="#808892" />
            {/* Glowing Logo Circle */}
            <circle cx="130" cy="128" r="3.4" fill="#ffffff" opacity="0.95" />
            {/* Laptop Base / Keyboard deck */}
            <path d="M78 144 L182 144 L188 152 L72 152 Z" fill="#c4ccd5" stroke="#082b03" strokeWidth="2.2" />
            {/* Trackpad notch */}
            <line x1="120" y1="150" x2="140" y2="150" stroke="#082b03" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        </svg>
      </div>

    </div>
  );
};

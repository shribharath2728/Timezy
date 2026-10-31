import React from 'react';

export const PageCornerCurl: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  return (
    <div
      onClick={onClick}
      title="Turn page"
      className="absolute bottom-0 right-0 w-12 h-12 cursor-pointer z-30 group select-none pointer-events-auto"
    >
      <div
        className="absolute bottom-0 right-0 w-11 h-11 bg-gradient-to-tl from-[#9cb597] via-[#dcecd2] to-[#ffffff] border-t border-l border-[#8ba588] shadow-[-3px_-3px_8px_rgba(8,43,3,0.22)] transform origin-bottom-right group-hover:scale-115 transition-all duration-200"
        style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
      />
    </div>
  );
};

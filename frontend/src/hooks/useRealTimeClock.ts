import { useState, useEffect } from 'react';

export interface DeviceRealTime {
  time: string;           // e.g. "12:15 PM"
  time24: string;         // e.g. "12:15"
  greeting: string;       // "Good Morning" | "Good Afternoon" | "Good Evening" | "Good Night"
  todayFormatted: string; // e.g. "Friday, 30 Oct 2026"
  dayName: string;        // "Friday"
  monthName: string;      // "October"
  dayNumber: number;      // 30
  year: number;           // 2026
}

export function useRealTimeClock(): DeviceRealTime {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    // Update every second for live real-time accuracy
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = now.getHours();
  let greeting = 'Good Morning';
  if (hours >= 12 && hours < 17) {
    greeting = 'Good Afternoon';
  } else if (hours >= 17 && hours < 22) {
    greeting = 'Good Evening';
  } else if (hours >= 22 || hours < 5) {
    greeting = 'Good Evening';
  }

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const time24 = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const dayNumber = now.getDate();
  const year = now.getFullYear();

  const todayFormatted = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return {
    time,
    time24,
    greeting,
    todayFormatted,
    dayName,
    monthName,
    dayNumber,
    year,
  };
}


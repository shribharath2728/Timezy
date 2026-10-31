import { useState, useEffect, useRef } from 'react';

export interface DeviceRealTime {
  time: string;           // e.g. "12:15 PM"
  time24: string;         // e.g. "12:15"
  greeting: string;       // "Good Morning" | "Good Afternoon" | "Good Evening" | "Good Night"
  todayFormatted: string; // e.g. "Fri, 30 Oct 2026"
  dayName: string;        // "Friday"
  monthName: string;      // "October"
  dayNumber: number;      // 30
  year: number;           // 2026
}

function getGreeting(hours: number): string {
  if (hours >= 5 && hours < 12) return 'Good Morning';
  if (hours >= 12 && hours < 17) return 'Good Afternoon';
  if (hours >= 17 && hours < 22) return 'Good Evening';
  return 'Good Night';
}

export function useRealTimeClock(): DeviceRealTime {
  const [now, setNow] = useState<Date>(() => new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const startInterval = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => setNow(new Date()), 1000);
    };

    const stopInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause timer while tab is in the background to save CPU
        stopInterval();
      } else {
        // Immediately sync on tab focus, then resume
        setNow(new Date());
        startInterval();
      }
    };

    startInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const hours = now.getHours();

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
    year: 'numeric',
  });

  return {
    time,
    time24,
    greeting: getGreeting(hours),
    todayFormatted,
    dayName,
    monthName,
    dayNumber,
    year,
  };
}

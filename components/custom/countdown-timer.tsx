"use client";

import { useState, useEffect } from 'react';
import { VOTING_END_DATE } from '@/lib/config';

// --- IMPORTANT: Set your actual voting end date here ---
// const VOTING_END_DATE = new Date("2025-08-17T23:59:59");

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = VOTING_END_DATE.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(timer);
  }, []);

  const timeUnits = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  return (
    <div className="flex justify-center items-center gap-3 sm:gap-6 mt-8">
      {timeUnits.map((unit) => (
        <div key={unit.label} className="bg-white rounded-lg shadow-md w-20 sm:w-28 h-20 sm:h-28 flex flex-col justify-center items-center">
          <span className="text-3xl sm:text-5xl font-bold text-slate-800 tracking-tighter">
            {String(unit.value).padStart(2, '0')}
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground mt-1">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
};
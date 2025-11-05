
'use client';

import { useState, useEffect, useRef } from 'react';

interface UseIdleParams {
  onIdle: () => void;
  idleTime: number; // in minutes
}

export const useIdle = ({ onIdle, idleTime }: UseIdleParams) => {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const idleTimeout = idleTime * 60 * 1000;

  const resetTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setIsIdle(true);
      onIdle();
    }, idleTimeout);
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      if (isIdle) {
        // This won't be reached in current setup as we log out immediately
        // but good for potential future use cases.
        setIsIdle(false);
      }
      resetTimer();
    };

    events.forEach(event => window.addEventListener(event, handleActivity));
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [onIdle, idleTime, isIdle]); // Re-run effect if onIdle or idleTime changes

  return isIdle;
};

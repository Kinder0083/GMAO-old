import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const HeaderClock = () => {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [offsetMs, setOffsetMs] = useState(null);

  const fetchServerTime = useCallback(async () => {
    try {
      const res = await api.timezone.getCurrentTime();
      const serverLocal = new Date(res.data.local_time);
      const clientNow = new Date();
      setOffsetMs(serverLocal.getTime() - clientNow.getTime());
    } catch {
      // Fallback : offset 0 (heure navigateur)
      if (offsetMs === null) setOffsetMs(0);
    }
  }, []);

  // Synchro initiale + toutes les 60s
  useEffect(() => {
    fetchServerTime();
    const sync = setInterval(fetchServerTime, 60000);
    return () => clearInterval(sync);
  }, [fetchServerTime]);

  // Tick chaque seconde
  useEffect(() => {
    if (offsetMs === null) return;

    const tick = () => {
      const now = new Date(Date.now() + offsetMs);
      setTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [offsetMs]);

  if (!time) return null;

  return (
    <div className="flex flex-col items-center justify-center px-2 select-none" data-testid="header-clock">
      <span className="text-sm font-semibold text-gray-700 leading-tight tabular-nums">{time}</span>
      <span className="text-[11px] text-gray-500 leading-tight tabular-nums">{date}</span>
    </div>
  );
};

export default HeaderClock;

import React, { useState, useEffect } from 'react';

const HeaderClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div
      className="flex flex-col items-center justify-center px-3 py-1 rounded-md bg-gray-50 border border-gray-200 select-none min-w-[90px]"
      data-testid="header-clock"
    >
      <span className="text-sm font-semibold text-gray-800 leading-tight tracking-wide tabular-nums">
        {time}
      </span>
      <span className="text-[11px] text-gray-500 leading-tight tabular-nums">
        {date}
      </span>
    </div>
  );
};

export default HeaderClock;

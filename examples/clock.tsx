import { useState, useEffect } from "react";

export default function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <p className="text-gray-400 text-sm uppercase tracking-widest mb-4">Current Time</p>
      <h1 className="text-7xl font-mono font-bold tabular-nums">
        {time.toLocaleTimeString()}
      </h1>
      <p className="text-gray-500 mt-4">{time.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
  );
}

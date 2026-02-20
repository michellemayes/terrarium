import { useState, useEffect } from "react";

export default function Progress() {
  const [value, setValue] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (value >= 100) { setRunning(false); return; }
    const id = setTimeout(() => setValue(v => Math.min(v + 1, 100)), 30);
    return () => clearTimeout(id);
  }, [running, value]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">Progress</h1>
      <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-100"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="text-gray-400 mb-6 font-mono">{value}%</p>
      <div className="flex gap-3">
        <button
          onClick={() => { setValue(0); setRunning(true); }}
          className="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
        >
          {value >= 100 ? "Restart" : "Start"}
        </button>
        <button
          onClick={() => { setValue(0); setRunning(false); }}
          className="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

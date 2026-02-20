import { useState } from "react";

export default function Toggle() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <p className="text-gray-400 mb-6 text-sm uppercase tracking-widest">Flip the switch</p>
      <button
        onClick={() => setOn(v => !v)}
        className={`w-20 h-10 rounded-full relative transition-colors duration-300 ${on ? 'bg-purple-600' : 'bg-gray-600'}`}
      >
        <span className={`block w-8 h-8 bg-white rounded-full absolute top-1 transition-transform duration-300 ${on ? 'translate-x-11' : 'translate-x-1'}`} />
      </button>
      <p className="mt-6 text-2xl font-semibold">{on ? "ON" : "OFF"}</p>
    </div>
  );
}

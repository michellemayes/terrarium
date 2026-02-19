import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-2">Count: {count}</h1>
      <p className="text-gray-400 mb-8">Click the button to increment</p>
      <div className="flex gap-4">
        <button
          onClick={() => setCount(c => c - 1)}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-lg font-semibold transition-colors"
        >
          -
        </button>
        <button
          onClick={() => setCount(0)}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-lg font-semibold transition-colors"
        >
          Reset
        </button>
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg font-semibold transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

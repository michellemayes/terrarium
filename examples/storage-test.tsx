import { useState, useEffect } from "react";

export default function StorageTest() {
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.storage.getItem("count").then((saved: string | null) => {
      if (saved !== null) setCount(parseInt(saved, 10));
      setLoaded(true);
    });
  }, []);

  const increment = () => {
    const next = count + 1;
    setCount(next);
    window.storage.setItem("count", String(next));
  };

  const decrement = () => {
    const next = count - 1;
    setCount(next);
    window.storage.setItem("count", String(next));
  };

  const reset = () => {
    setCount(0);
    window.storage.removeItem("count");
  };

  if (!loaded) return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-400">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-2">Persistent Counter</h1>
      <p className="text-gray-400 mb-8">Close and reopen — the count persists!</p>
      <p className="text-6xl font-mono mb-8">{count}</p>
      <div className="flex gap-4">
        <button
          onClick={decrement}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-lg font-semibold transition-colors"
        >
          -
        </button>
        <button
          onClick={reset}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg text-lg font-semibold transition-colors"
        >
          Reset
        </button>
        <button
          onClick={increment}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg font-semibold transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

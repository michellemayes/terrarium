import { useState } from "react";

const NAMES = ["Alice", "Bob", "Clara", "Dan", "Eve", "Frank"];
const COLORS = ["bg-purple-500", "bg-pink-500", "bg-blue-500", "bg-green-500", "bg-amber-500", "bg-red-500"];

export default function Avatar() {
  const [index, setIndex] = useState(0);
  const name = NAMES[index % NAMES.length];
  const color = COLORS[index % COLORS.length];
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className={`w-24 h-24 rounded-full ${color} flex items-center justify-center text-3xl font-bold mb-4 transition-colors duration-300`}>
        {name[0]}
      </div>
      <h2 className="text-2xl font-semibold mb-1">{name}</h2>
      <p className="text-gray-500 mb-6">user@example.com</p>
      <button
        onClick={() => setIndex(i => i + 1)}
        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
      >
        Next Person
      </button>
    </div>
  );
}

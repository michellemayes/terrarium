import { useState } from "react";

export default function Gradient() {
  const [hue, setHue] = useState(270);
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen text-white transition-all duration-500"
      style={{ background: `linear-gradient(135deg, hsl(${hue}, 70%, 15%), hsl(${hue + 60}, 70%, 25%))` }}
    >
      <h1 className="text-4xl font-bold mb-2">Gradient Picker</h1>
      <p className="text-white/60 mb-8">Drag the slider to shift the hue</p>
      <input
        type="range"
        min={0}
        max={360}
        value={hue}
        onChange={e => setHue(Number(e.target.value))}
        className="w-64 accent-purple-500"
      />
      <p className="mt-4 font-mono text-white/50">hsl({hue}, 70%, 15%)</p>
    </div>
  );
}

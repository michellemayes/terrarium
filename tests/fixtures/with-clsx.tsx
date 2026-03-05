import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export default function App() {
  const active = true;
  const className = twMerge(clsx("p-4 text-red-500", active && "text-blue-500"));
  return <div className={className}>Hello</div>;
}

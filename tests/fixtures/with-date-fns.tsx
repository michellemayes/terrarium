import { format } from "date-fns";

export default function App() {
  return (
    <div className="p-4">
      <p>{format(new Date(2024, 0, 1), "MMMM do, yyyy")}</p>
    </div>
  );
}

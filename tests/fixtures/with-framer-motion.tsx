import { motion } from "framer-motion";

export default function App() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4"
    >
      <p>Hello with animation</p>
    </motion.div>
  );
}

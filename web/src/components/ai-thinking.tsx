"use client";

import { motion } from "framer-motion";

export function AIThinking() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <div className="relative h-24 w-24">
        {/* Animated circles */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-primary/40"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [0.8, 1.5],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeInOut",
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-primary shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
        </div>
      </div>
      <motion.p
        className="text-sm font-mono text-primary uppercase tracking-[0.2em]"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Neural Processing...
      </motion.p>
    </div>
  );
}

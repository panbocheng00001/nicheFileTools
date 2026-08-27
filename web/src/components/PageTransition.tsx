"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

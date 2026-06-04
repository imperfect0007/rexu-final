'use client';

import * as React from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function InteractiveBackground() {
  const mouseX = useMotionValue(-500); // Start off-screen
  const mouseY = useMotionValue(-500);

  const springConfig = { damping: 50, stiffness: 200, mass: 0.8 };
  const glowX = useSpring(mouseX, springConfig);
  const glowY = useSpring(mouseY, springConfig);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // clientX/clientY are viewport relative
      mouseX.set(e.clientX - 175); // Half of 350px width
      mouseY.set(e.clientY - 175); // Half of 350px height
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden" aria-hidden>
      <motion.div
        style={{
          x: glowX,
          y: glowY,
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(137, 217, 87, 0.24) 0%, rgba(201, 226, 101, 0.08) 50%, transparent 100%)',
          filter: 'blur(40px)',
          position: 'absolute',
        }}
      />
    </div>
  );
}

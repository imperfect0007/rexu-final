'use client';

import * as React from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function CustomCursor() {
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const [visible, setVisible] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [isTouch, setIsTouch] = React.useState(true); // Default true, disable in useEffect if matchMedia passes

  // Springs for dot and trailing ring
  const dotSpringConfig = { damping: 40, stiffness: 450, mass: 0.5 };
  const ringSpringConfig = { damping: 30, stiffness: 180, mass: 0.8 };

  const dotX = useSpring(mouseX, dotSpringConfig);
  const dotY = useSpring(mouseY, dotSpringConfig);

  const ringX = useSpring(mouseX, ringSpringConfig);
  const ringY = useSpring(mouseY, ringSpringConfig);

  React.useEffect(() => {
    // Hide on touch screens
    const matchTouch = window.matchMedia('(pointer: coarse)');
    setIsTouch(matchTouch.matches);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!visible) setVisible(true);
    };

    const handleMouseLeave = () => {
      setVisible(false);
    };

    const handleMouseEnter = () => {
      setVisible(true);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const isInteractive =
        target.closest('a') ||
        target.closest('button') ||
        target.closest('[role="button"]') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.classList.contains('interactive-hover');

      setHovered(!!isInteractive);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [mouseX, mouseY, visible]);

  if (isTouch) return null;

  return (
    <>
      {/* Outer Ring */}
      <motion.div
        style={{
          x: ringX,
          y: ringY,
          opacity: visible ? 1 : 0,
        }}
        transition={{ opacity: { duration: 0.2 } }}
        className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:block"
      >
        <motion.div
          animate={{
            scale: hovered ? 1.8 : 1,
            backgroundColor: hovered ? 'rgba(137, 217, 87, 0.15)' : 'rgba(137, 217, 87, 0)',
            borderColor: hovered ? 'rgba(137, 217, 87, 0.8)' : 'rgba(137, 217, 87, 0.4)',
            width: 24,
            height: 24,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="rounded-full border border-[#89d957] -translate-x-1/2 -translate-y-1/2"
        />
      </motion.div>

      {/* Inner Dot */}
      <motion.div
        style={{
          x: dotX,
          y: dotY,
          opacity: visible ? 1 : 0,
        }}
        transition={{ opacity: { duration: 0.2 } }}
        className="fixed top-0 left-0 pointer-events-none z-[9999] hidden md:block"
      >
        <motion.div
          animate={{
            scale: hovered ? 0.6 : 1,
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="w-2.5 h-2.5 rounded-full bg-[#5a9c32] -translate-x-1/2 -translate-y-1/2 shadow-sm"
        />
      </motion.div>
    </>
  );
}

'use client';

import * as React from 'react';
import { Instagram, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { MotionSection, staggerChildVariants } from '@/components/MotionSection';

const instagramPosts = [
  { id: 1, src: '/instagram/post1.png', link: 'https://www.instagram.com/rexu.india/' },
  { id: 2, src: '/instagram/post2.png', link: 'https://www.instagram.com/rexu.india/' },
  { id: 3, src: '/instagram/post3.png', link: 'https://www.instagram.com/rexu.india/' },
  { id: 4, src: '/instagram/post4.png', link: 'https://www.instagram.com/rexu.india/' },
  { id: 5, src: '/instagram/post5.png', link: 'https://www.instagram.com/rexu.india/' },
];

export function InstagramSection() {
  return (
    <MotionSection className="px-4 py-20 sm:px-6" stagger staggerDelay={0.08}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <motion.div variants={staggerChildVariants}>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a9c32] bg-[#89d957]/10 px-3 py-1 rounded-full">
              Social Media
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Stay Connected on Instagram
            </h2>
            <p className="mt-2 text-neutral-600 max-w-xl">
              Get real-world safety tips, fleet operations guides, and product updates directly on your feed.
            </p>
          </motion.div>
          <motion.div variants={staggerChildVariants} className="shrink-0">
            <a
              href="https://www.instagram.com/rexu.india/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 group text-sm font-semibold text-[#5a9c32] hover:text-[#427424] transition-colors"
            >
              Follow @rexu.india
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-5">
          {instagramPosts.map((post) => (
            <motion.div
              key={post.id}
              variants={staggerChildVariants}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-neutral-100 bg-neutral-50 shadow-sm"
            >
              <a
                href={post.link}
                target="_blank"
                rel="noreferrer"
                className="block w-full h-full"
              >
                {/* Image */}
                <img
                  src={post.src}
                  alt={`REXU Instagram Post ${post.id}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[3px] p-4 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md transition-transform duration-300 scale-90 group-hover:scale-100">
                    <Instagram className="h-6 w-6" />
                  </div>
                  <span className="mt-3 text-xs font-semibold text-white tracking-wide uppercase">
                    View on Instagram
                  </span>
                </div>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

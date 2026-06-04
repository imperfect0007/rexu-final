"use client";
import React from "react";
import { BentoGrid } from "@/components/ui/bento-grid";
import {
  Shield,
  Heart,
  Users,
} from "lucide-react";

export default function AboutBentoGrid() {
  return (
    <BentoGrid className="max-w-5xl mx-auto md:auto-rows-auto w-full">
      {/* Our Story — full-width hero card */}
      <div className="md:col-span-3 row-span-1 rounded-[28px] border border-neutral-100 bg-white shadow-sm p-8 md:p-10 transition duration-200 hover:shadow-xl overflow-hidden break-words">
        <div className="flex flex-col md:flex-row gap-8 h-full">
          {/* Left — story text */}
          <div className="flex-1 flex flex-col justify-center space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a9c32]">
              Our Story
            </p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-neutral-900 leading-tight">
              Technology that speaks when you can&apos;t.
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              REXU is a safety and trust platform designed for real-world emergencies—where quick access to the right information can make all the difference. Built for the realities of India, it enables instant access to critical safety information while preserving privacy and dignity.
            </p>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Whether used by individuals, families, communities or workplaces, REXU works as a quiet layer of protection—always available, never intrusive. At its core, it is about taking care of the people who matter most.
            </p>
          </div>

          {/* Right — values cards */}
          <div className="md:w-[40%] flex flex-col gap-3">
            {/* What We Stand For card */}
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5 flex-1 flex flex-col justify-center space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-gradient-brand flex items-center justify-center">
                  <Shield className="h-3 w-3 text-[#5a9c32]" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  What We Stand For
                </p>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed">
                We believe that safety should not depend on luck. It should be engineered—with empathy, clarity and respect for privacy.
              </p>
            </div>

            {/* Two mini cards */}
            <div className="flex gap-3">
              <div className="flex-1 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 space-y-1.5">
                <p className="text-sm font-bold text-neutral-900">Built for India</p>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Designed around Indian roads, families &amp; workplaces.
                </p>
              </div>
              <div className="flex-1 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 space-y-1.5">
                <p className="text-sm font-bold text-neutral-900">Privacy First</p>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Help moves fast while personal details stay protected.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why We Exist — full-width section with 3 cards */}
      <div className="md:col-span-3 row-span-1 rounded-[28px] border border-neutral-100 bg-white shadow-sm p-8 md:p-10 transition duration-200 hover:shadow-xl flex flex-col justify-center overflow-hidden break-words">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a9c32] mb-3">
            Why We Exist
          </p>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-neutral-900 leading-tight">
            Reducing silence between emergencies and action.
          </h2>
        </div>

        {/* Three cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5 space-y-3">
            <p className="text-sm font-bold text-neutral-900">Our purpose</p>
            <p className="text-sm text-neutral-600 leading-relaxed">
              To reduce emergency response time, improve accountability and save lives—without adding complexity or compromising privacy.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5 space-y-3">
            <p className="text-sm font-bold text-neutral-900">Our vision</p>
            <p className="text-sm text-neutral-600 leading-relaxed">
              A world where no life is lost because someone could not be reached in time—and where every journey carries an invisible safety shield.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-5 space-y-3">
            <p className="text-sm font-bold text-neutral-900">Our mission</p>
            <p className="text-sm text-neutral-600 leading-relaxed">
              To engineer faster emergency response through simple, human-centered technology that connects people within seconds when it matters most.
            </p>
          </div>
        </div>
      </div>

      {/* Built for Families & Communities — two equal cards */}
      <div className="md:col-span-3 grid md:grid-cols-2 gap-4 overflow-hidden">
        {/* Built for Families & Loved Ones */}
        <div className="rounded-[28px] border border-neutral-100 bg-white shadow-sm p-6 md:p-8 transition duration-200 hover:shadow-xl overflow-hidden break-words">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-gradient-brand/20 border border-[#89d957]/30">
              <Heart className="h-5 w-5 text-[#5a9c32]" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">Built for Families &amp; Loved Ones</h3>
          </div>
          <div className="space-y-4 text-sm text-neutral-600 leading-relaxed">
            <p>
              In today&apos;s world, safety is no longer something we can assume—it&apos;s something we must actively care for.
            </p>
            <p>
              For families, safety means knowing that parents, children, elders and loved ones can access help when they need it—today, tomorrow and in the future. REXU supports this responsibility without fear, dependence or constant monitoring.
            </p>
            <p className="font-semibold text-neutral-900">REXU helps families:</p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-600">
              <li>Reach help faster during emergencies</li>
              <li>Share essential information without exposing personal details</li>
              <li>Stay prepared without tracking, surveillance or intrusion</li>
              <li>Build long-term peace of mind for every stage of life</li>
            </ul>
            <p className="italic text-[#5a9c32]/80">
              It&apos;s not about control. It&apos;s about care, preparedness and trust—so families can focus on living, knowing protection is already in place.
            </p>
          </div>
        </div>

        {/* Built for Communities & Workplaces */}
        <div className="rounded-[28px] border border-neutral-100 bg-white shadow-sm p-6 md:p-8 transition duration-200 hover:shadow-xl overflow-hidden break-words">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-gradient-brand/20 border border-[#89d957]/30">
              <Users className="h-5 w-5 text-[#5a9c32]" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">Built for Communities &amp; Workplaces</h3>
          </div>
          <div className="space-y-4 text-sm text-neutral-600 leading-relaxed">
            <p>
              Communities and workplaces depend on people moving safely, reliably and responsibly every day.
            </p>
            <p>
              Whether it&apos;s shared spaces, daily operations or workplace fleets, safety systems must be dependable, easy to use and respectful of privacy. REXU helps protect what matters most—their people and the assets that keep everything running.
            </p>
            <p className="font-semibold text-neutral-900">REXU helps communities and workplaces:</p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-600">
              <li>Improve emergency response without operational friction</li>
              <li>Maintain accountability without constant supervision</li>
              <li>Protect critical assets while prioritizing human safety</li>
              <li>Adapt easily to changing people, roles and situations</li>
            </ul>
            <p>
              By simplifying safety and removing complexity, REXU enables organizations and communities to operate with greater confidence and care.
            </p>
          </div>
        </div>
      </div>
    </BentoGrid>
  );
}

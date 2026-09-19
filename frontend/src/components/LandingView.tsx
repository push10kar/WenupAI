import React, { useState } from "react";

interface LandingViewProps {
  onEnterWorkspace?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onEnterWorkspace,
}) => {
  const [activeDensity, setActiveDensity] = useState<"zen" | "dense">("zen");
  const [viewModeActive, setViewModeActive] = useState(false);

  const handleLaunch = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onEnterWorkspace) {
      onEnterWorkspace();
    }
  };

  return (
    <div className="bg-background-cream font-body-md text-on-surface min-h-screen flex flex-col w-full selection:bg-secondary-fixed selection:text-on-secondary-fixed">
      {/* Fixed Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background-cream/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(78,31,190,0.05)] w-full">
        <div className="h-20 w-full max-w-[1280px] mx-auto px-margin-sm lg:px-margin flex items-center justify-between gap-space-md">
          {/* Logo & Brand */}
          <div className="flex items-center gap-space-md">
            <img
              alt="Aura Minimalist Brand Icon"
              className="h-8 w-auto object-contain"
              src="/aura-logo.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://lh3.googleusercontent.com/aida/AEtjO1XnGUj7zNKaZzp5EWn_-UmnllmmByqUw-SuqOoEbpHxZOg8YxEKXY2Hjc0IhibvKMqfIdC9sa8vB8uE09WaqkGS_5zjYP5LWCX2vRMQ-p7MD-DLcuGc3XNRcB1sEfHCcDxrmJ57EvhPLvv--XWleTAW-GAzjYGxkZ80eaN94t7l61eenUMBX-4_QLv_5tQwQ2VlrCX_jG6NilhhpfuhJyvEtFGZpRpqsBqOnP8r2_2aOo-ny3-3Fh_IpMQ";
              }}
            />
            <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-bold">
              AURA
            </span>
          </div>

          {/* Navigation links matching screen.png */}
          <nav
            className="hidden md:flex items-center gap-space-lg"
            data-active-classes="bg-primary-container text-on-primary font-bold rounded-lg"
          >
            <a
              aria-current="page"
              className="transition-colors px-space-sm py-space-xs bg-primary-container text-on-primary font-bold rounded-lg"
              data-path="landing"
              href="#overview"
            >
              Overview
            </a>
            <a
              aria-current="page"
              className="transition-colors px-space-sm py-space-xs bg-primary-container text-on-primary font-bold rounded-lg"
              data-path="landing"
              href="#features-overview"
            >
              Features
            </a>
            <a
              aria-current="page"
              className="transition-colors px-space-sm py-space-xs bg-primary-container text-on-primary font-bold rounded-lg"
              data-path="landing"
              href="#features-overview"
            >
              Solutions
            </a>
            <a
              role="button"
              onClick={handleLaunch}
              className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors px-space-sm py-space-xs cursor-pointer no-underline"
              data-path="app"
              href="#workspace"
            >
              Workspace
            </a>
          </nav>

          {/* Action button & user profile */}
          <div className="flex items-center gap-space-md">
            <a
              role="button"
              onClick={handleLaunch}
              className="inline-flex items-center justify-center bg-primary-container text-on-primary font-headline-sm text-label-lg px-space-lg py-space-sm rounded-lg shadow-[0_4px_20px_-2px_rgba(78,31,190,0.2)] hover:bg-primary transition-colors cursor-pointer no-underline"
              data-path="app"
              href="#workspace"
            >
              Launch Workspace
            </a>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full pt-20 flex-1 bg-background-cream" id="overview">
        <div className="flex flex-col w-full items-center">
          {/* Subtle Ambient Glows contained in hero section */}
          <div className="relative w-full overflow-hidden flex flex-col items-center">
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[700px] h-[380px] bg-gradient-to-tr from-tint-purple/60 via-secondary-container/20 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />
            <div className="absolute -top-16 right-10 w-96 h-96 bg-primary-fixed/40 blur-[120px] pointer-events-none -z-10 rounded-full" />

            {/* Main Content Container */}
            <div className="w-full max-w-[1280px] mx-auto px-margin-sm lg:px-margin pt-space-xl pb-space-xl flex flex-col items-center text-center">
              {/* Version Pill Badge */}
              <div
                onClick={handleLaunch}
                className="inline-flex items-center gap-space-sm bg-tint-purple/80 hover:bg-tint-purple text-primary-container px-space-md py-space-xs rounded-full shadow-sm mb-space-lg transition-all duration-300 cursor-pointer"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-secondary-fixed shadow-[0_0_8px_#d9ee47]" />
                <span className="font-label-md text-label-md font-semibold tracking-wide flex items-center gap-1">
                  Aura v2.0 is live
                  <span className="bg-secondary-fixed text-on-secondary-fixed px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ml-1">
                    New
                  </span>
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-headline-xl text-headline-xl text-primary-container max-w-4xl tracking-tight leading-[1.1] mb-space-md">
                Design without friction.
                <br className="hidden sm:inline" />{" "}
                <span className="relative inline-block">
                  Create with clarity.
                  <svg
                    className="absolute -bottom-2 left-0 w-full h-3 text-secondary-fixed -z-10 opacity-80"
                    fill="none"
                    preserveAspectRatio="none"
                    viewBox="0 0 300 12"
                  >
                    <path
                      d="M2 9C78 2 222 2 298 9"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="5"
                    />
                  </svg>
                </span>
              </h1>

              {/* Subtitle */}
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl font-normal leading-relaxed mb-space-xl">
                The minimalist creative workspace built for modern thinkers.
                Unify your research, strategy, and interface prototyping in one
                distraction-free canvas.
              </p>

              {/* CTA Button Row */}
              <div className="flex flex-wrap items-center justify-center gap-space-md w-full max-w-md mb-space-xl">
                <a
                  role="button"
                  onClick={handleLaunch}
                  href="#workspace"
                  className="group flex-1 sm:flex-initial inline-flex items-center justify-center gap-space-sm bg-primary-container text-on-primary font-headline-sm text-label-lg px-8 py-4 rounded-xl shadow-[0_12px_28px_-6px_rgba(78,31,190,0.35)] hover:bg-primary transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer no-underline"
                  data-path="app"
                >
                  <span>Enter Workspace</span>
                  <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </a>
                <a
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-space-xs bg-tint-purple text-primary-container font-headline-sm text-label-lg px-7 py-4 rounded-xl hover:bg-primary-fixed transition-all duration-200 cursor-pointer no-underline"
                  href="#features-overview"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    layers
                  </span>
                  <span>Explore Features</span>
                </a>
              </div>

              {/* Interactive Aura Studio Preview Teaser Card */}
              <div className="w-full max-w-5xl bg-surface-white rounded-2xl shadow-[0_20px_50px_-10px_rgba(78,31,190,0.08)] p-space-md sm:p-space-lg mb-space-xl text-left relative group">
                {/* Window Mockup Bar */}
                <div className="flex items-center justify-between pb-space-md mb-space-md">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                    <span className="font-label-sm text-label-sm text-outline ml-space-sm font-medium tracking-wide">
                      aura_canvas_main.session
                    </span>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-primary-container font-label-sm text-label-sm">
                      <span className="w-2 h-2 rounded-full bg-secondary-fixed" />
                      Live Sync Active
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewModeActive(!viewModeActive)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewModeActive
                          ? "bg-secondary-fixed text-on-secondary-fixed"
                          : "bg-surface-container hover:bg-tint-purple text-primary-container"
                      }`}
                      id="view-mode-toggle"
                      aria-label="Toggle view mode"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        view_quilt
                      </span>
                    </button>
                  </div>
                </div>

                {/* Canvas Interior Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
                  {/* Left Workspace Sidebar / Canvas Tree */}
                  <div className="lg:col-span-4 flex flex-col gap-space-sm bg-surface-container-low/70 p-space-md rounded-xl">
                    <div className="flex items-center justify-between mb-space-xs">
                      <span className="font-label-sm text-label-sm font-bold tracking-wider uppercase text-on-surface-variant">
                        Active Nodes
                      </span>
                      <span className="font-label-sm text-label-sm text-primary-container bg-surface-white px-2 py-0.5 rounded-md shadow-sm">
                        4 Active
                      </span>
                    </div>

                    {/* Workspace Node Items */}
                    <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-white shadow-sm transition-all">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-[16px]">
                            psychology
                          </span>
                        </div>
                        <div>
                          <div className="font-headline-sm text-label-md text-on-surface">
                            Cognitive Engine
                          </div>
                          <div className="font-body-sm text-label-sm text-outline">
                            Latent Map · Layer 01
                          </div>
                        </div>
                      </div>
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold">
                        99.4%
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-white/60 hover:bg-surface-white transition-all cursor-pointer">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-7 h-7 rounded-lg bg-tint-purple text-primary-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-[16px]">
                            draw
                          </span>
                        </div>
                        <div>
                          <div className="font-headline-sm text-label-md text-on-surface">
                            Interface Schematic
                          </div>
                          <div className="font-body-sm text-label-sm text-outline">
                            Component Wire · Wireframe
                          </div>
                        </div>
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                        Synced
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-white/60 hover:bg-surface-white transition-all cursor-pointer">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-7 h-7 rounded-lg bg-surface-container-high text-primary-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-[16px]">
                            token
                          </span>
                        </div>
                        <div>
                          <div className="font-headline-sm text-label-md text-on-surface">
                            Color Space Tokens
                          </div>
                          <div className="font-body-sm text-label-sm text-outline">
                            Cream &amp; Purple V2
                          </div>
                        </div>
                      </div>
                      <span className="w-3 h-3 rounded-full bg-secondary-fixed" />
                    </div>

                    {/* Focus Meter */}
                    <div className="mt-space-sm pt-space-sm bg-surface-white p-space-md rounded-xl shadow-sm">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-label-md text-label-md font-semibold text-primary-container">
                          Focus Index
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Deep State
                        </span>
                      </div>
                      {/* Mini SVG Line Chart for focus score */}
                      <svg
                        className="w-full h-10 text-primary-container"
                        fill="none"
                        viewBox="0 0 160 40"
                      >
                        <path
                          d="M0 32C24 30 38 12 60 16C82 20 102 4 124 10C140 14 150 6 160 4"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="2.5"
                        />
                        <circle
                          cx="160"
                          cy="4"
                          fill="#d9ee47"
                          r="3.5"
                          stroke="#4e1fbe"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Right Interactive Visual Canvas Preview */}
                  <div className="lg:col-span-8 flex flex-col justify-between bg-surface-container-low/40 rounded-xl p-space-md sm:p-space-lg relative overflow-hidden">
                    {/* Floating Canvas Toolbar */}
                    <div className="flex items-center justify-between gap-space-sm bg-surface-white px-space-md py-space-xs rounded-xl shadow-sm w-fit self-center mb-space-lg">
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-tint-purple text-primary-container font-medium hover:opacity-90 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          pan_tool
                        </span>
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg text-outline hover:text-primary-container hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          near_me
                        </span>
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg text-outline hover:text-primary-container hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          shape_line
                        </span>
                      </button>
                      <span className="w-px h-4 bg-tint-purple" />
                      <div className="flex items-center gap-1.5 text-primary-container font-label-sm text-label-sm font-semibold">
                        <span className="material-symbols-outlined text-[16px] text-secondary-fixed-variant">
                          bolt
                        </span>
                        Zero-Latency
                      </div>
                    </div>

                    {/* Centered Spatial Diagram Node */}
                    <div className="relative w-full py-space-lg flex flex-col items-center justify-center">
                      {/* Floating Pill Card 1 */}
                      <div className="absolute -top-2 left-6 bg-surface-white px-3.5 py-2 rounded-xl shadow-md flex items-center gap-2 z-10">
                        <span className="w-2.5 h-2.5 rounded-full bg-secondary-fixed" />
                        <span className="font-label-sm text-label-sm font-semibold text-primary-container">
                          Adaptive Grid Auto-Aligned
                        </span>
                      </div>

                      {/* Main Canvas Core Icon & Orbit Preview */}
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-tint-purple animate-[spin_20s_linear_infinite]" />
                        <div className="w-24 h-24 rounded-3xl bg-primary-container flex items-center justify-center shadow-[0_12px_30px_-4px_rgba(78,31,190,0.4)]">
                          {/* Custom Triangular Brand Symbol from reference */}
                          <svg
                            className="w-12 h-12 text-secondary-container"
                            fill="none"
                            viewBox="0 0 100 100"
                          >
                            <path
                              d="M50 15L85 75C87 78 85 82 81 82H19C15 82 13 78 15 75L50 15Z"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="12"
                            />
                            <circle cx="50" cy="56" fill="#E2D6FF" r="10" />
                          </svg>
                        </div>
                        {/* Small satellite tag */}
                        <div className="absolute -bottom-3 -right-2 bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                          Active
                        </div>
                      </div>

                      {/* Floating Pill Card 2 */}
                      <div className="absolute -bottom-1 right-8 bg-surface-white px-3.5 py-2 rounded-xl shadow-md flex items-center gap-2 z-10">
                        <span className="material-symbols-outlined text-[16px] text-primary-container">
                          speed
                        </span>
                        <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                          12ms Render Roundtrip
                        </span>
                      </div>
                    </div>

                    {/* Bottom Teaser Card Footer Controls */}
                    <div className="flex items-center justify-between pt-space-md mt-space-md">
                      <div className="flex items-center gap-space-sm">
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                          Workspace Density
                        </span>
                        <div className="flex bg-surface-white p-1 rounded-lg shadow-sm gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveDensity("zen")}
                            className={`px-2.5 py-0.5 rounded text-label-sm font-semibold cursor-pointer transition-colors ${
                              activeDensity === "zen"
                                ? "bg-primary-container text-on-primary"
                                : "text-outline hover:text-primary-container"
                            }`}
                          >
                            Zen
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveDensity("dense")}
                            className={`px-2.5 py-0.5 rounded text-label-sm font-semibold cursor-pointer transition-colors ${
                              activeDensity === "dense"
                                ? "bg-primary-container text-on-primary"
                                : "text-outline hover:text-primary-container"
                            }`}
                          >
                            Dense
                          </button>
                        </div>
                      </div>
                      <a
                        role="button"
                        onClick={handleLaunch}
                        className="font-label-sm text-label-sm text-primary-container font-bold flex items-center gap-1 hover:underline cursor-pointer no-underline"
                        data-path="app"
                        href="#workspace"
                      >
                        Open in Full Canvas
                        <span className="material-symbols-outlined text-[16px]">
                          open_in_new
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Indicator / Metric Ribbon */}
              <div className="w-full max-w-4xl flex flex-wrap items-center justify-around gap-space-lg py-space-md px-space-lg bg-surface-white/60 rounded-2xl mb-space-xl text-center">
                <div>
                  <div className="font-headline-md text-headline-md text-primary-container font-bold">
                    100k+
                  </div>
                  <div className="font-label-sm text-label-sm text-outline">
                    Active Canvases Built
                  </div>
                </div>
                <div className="hidden sm:block w-px h-8 bg-tint-purple" />
                <div>
                  <div className="font-headline-md text-headline-md text-primary-container font-bold">
                    0ms
                  </div>
                  <div className="font-label-sm text-label-sm text-outline">
                    Offline-to-Cloud Friction
                  </div>
                </div>
                <div className="hidden sm:block w-px h-8 bg-tint-purple" />
                <div>
                  <div className="font-headline-md text-headline-md text-primary-container font-bold">
                    4.9/5
                  </div>
                  <div className="font-label-sm text-label-sm text-outline">
                    Designer Satisfaction Rating
                  </div>
                </div>
              </div>

              {/* Key Minimalist Features Grid */}
              <section
                className="w-full max-w-5xl mx-auto text-left pt-space-md"
                id="features-overview"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-lg">
                  <div>
                    <div className="font-label-sm text-label-sm font-bold uppercase tracking-widest text-primary-container mb-space-xs">
                      Pillars of Aura
                    </div>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface">
                      Designed for flow, not clutter.
                    </h2>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mt-2 md:mt-0">
                    Every component is tuned to protect mental headroom and
                    accelerate high-fidelity decision making.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                  {/* Card 1: Distraction-Free Focus */}
                  <div className="bg-surface-white p-space-lg rounded-2xl shadow-[0_4px_20px_-2px_rgba(78,31,190,0.05)] hover:shadow-[0_12px_32px_-4px_rgba(78,31,190,0.1)] transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-tint-purple flex items-center justify-center text-primary-container mb-space-md group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[24px]">
                          visibility_off
                        </span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm text-primary-container mb-space-xs font-bold">
                        Distraction-Free Focus
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                        Adaptive interfaces automatically collapse auxiliary
                        inspector panels when your keyboard velocity rises.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-space-md">
                      <span className="font-label-sm text-label-sm font-semibold text-primary-container bg-surface-container-low px-2.5 py-1 rounded-full">
                        Zen Workspace
                      </span>
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        check_circle
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Instant Prototyping (Accent highlighted) */}
                  <div className="bg-tint-purple/50 p-space-lg rounded-2xl shadow-[0_4px_20px_-2px_rgba(78,31,190,0.05)] hover:shadow-[0_12px_32px_-4px_rgba(78,31,190,0.12)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-4 right-4">
                      <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                        Velocity Core
                      </span>
                    </div>
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary mb-space-md group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[24px]">
                          bolt
                        </span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm text-primary-container mb-space-xs font-bold">
                        Instant Prototyping
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                        Zero build step compile. Turn spatial layout sketches
                        into functional interactive nodes with real reactive
                        state.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-space-md">
                      <span className="font-label-sm text-label-sm font-semibold text-primary bg-surface-white px-2.5 py-1 rounded-full shadow-sm">
                        Reactive State Engine
                      </span>
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        offline_bolt
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Seamless Collaboration */}
                  <div className="bg-surface-white p-space-lg rounded-2xl shadow-[0_4px_20px_-2px_rgba(78,31,190,0.05)] hover:shadow-[0_12px_32px_-4px_rgba(78,31,190,0.1)] transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-tint-purple flex items-center justify-center text-primary-container mb-space-md group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[24px]">
                          hub
                        </span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm text-primary-container mb-space-xs font-bold">
                        Seamless Collaboration
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                        Multi-cursor presence with zero jitter. Review,
                        annotate, and co-author architecture maps without
                        leaving the viewport.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-space-md">
                      <div className="flex -space-x-2 overflow-hidden">
                        <span className="inline-block h-6 w-6 rounded-full ring-2 ring-surface-white bg-primary text-[10px] text-on-primary font-bold flex items-center justify-center">
                          JD
                        </span>
                        <span className="inline-block h-6 w-6 rounded-full ring-2 ring-surface-white bg-secondary-fixed text-[10px] text-on-secondary-fixed font-bold flex items-center justify-center">
                          MK
                        </span>
                        <span className="inline-block h-6 w-6 rounded-full ring-2 ring-surface-white bg-tint-purple text-[10px] text-primary font-bold flex items-center justify-center">
                          +4
                        </span>
                      </div>
                      <span className="font-label-sm text-label-sm text-outline">
                        Real-time
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Bottom Minimalist CTA Banner */}
              <div className="w-full max-w-5xl mx-auto mt-space-xl bg-primary-container rounded-2xl p-space-lg sm:p-space-xl text-center relative overflow-hidden shadow-[0_20px_40px_-8px_rgba(78,31,190,0.3)]">
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-secondary-fixed/20 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center">
                  <span className="bg-secondary-fixed text-on-secondary-fixed px-3 py-1 rounded-full font-label-sm text-label-sm font-bold uppercase tracking-wider mb-space-sm">
                    Ready to experience clarity?
                  </span>
                  <h2 className="font-headline-lg text-headline-lg text-on-primary mb-space-xs font-bold">
                    Start crafting on Aura today.
                  </h2>
                  <p className="font-body-md text-body-md text-tint-purple max-w-lg mb-space-lg">
                    No credit card required. Free tier includes up to 3 unified
                    workspace canvases with realtime sync.
                  </p>
                  <a
                    role="button"
                    onClick={handleLaunch}
                    className="inline-flex items-center justify-center gap-space-sm bg-secondary-fixed hover:bg-secondary-fixed-dim text-on-secondary-fixed font-headline-sm text-label-lg px-8 py-4 rounded-xl shadow-lg transition-all transform hover:scale-105 cursor-pointer no-underline"
                    data-path="app"
                    href="#workspace"
                  >
                    <span>Launch Studio Workspace</span>
                    <span className="material-symbols-outlined text-[20px]">
                      arrow_outward
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-white shadow-[0_-4px_20px_-2px_rgba(78,31,190,0.03)] py-space-xl mt-auto">
        <div className="w-full max-w-[1280px] mx-auto px-margin-sm lg:px-margin flex flex-col md:flex-row items-center justify-between gap-space-lg">
          <div className="flex items-center gap-space-sm">
            <img
              alt="Aura Minimalist Brand Icon"
              className="h-6 w-auto object-contain opacity-70"
              src="/aura-logo.png"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://lh3.googleusercontent.com/aida/AEtjO1XnGUj7zNKaZzp5EWn_-UmnllmmByqUw-SuqOoEbpHxZOg8YxEKXY2Hjc0IhibvKMqfIdC9sa8vB8uE09WaqkGS_5zjYP5LWCX2vRMQ-p7MD-DLcuGc3XNRcB1sEfHCcDxrmJ57EvhPLvv--XWleTAW-GAzjYGxkZ80eaN94t7l61eenUMBX-4_QLv_5tQwQ2VlrCX_jG6NilhhpfuhJyvEtFGZpRpqsBqOnP8r2_2aOo-ny3-3Fh_IpMQ";
              }}
            />
            <span className="font-headline-sm text-label-md text-primary font-bold tracking-tight">
              AURA
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant ml-space-xs">
              © 2025 Aura Intelligence Corp. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-space-lg">
            <a
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
              href="#"
            >
              Privacy Policy
            </a>
            <a
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
              href="#"
            >
              Terms of Service
            </a>
            <a
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
              href="#"
            >
              System Architecture
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

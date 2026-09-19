import React, { useState } from "react";

interface LandingViewProps {
  onEnterWorkspace?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onEnterWorkspace,
}) => {
  const [activeNav, setActiveNav] = useState<
    "overview" | "features" | "solutions"
  >("overview");

  const handleLaunch = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onEnterWorkspace) {
      onEnterWorkspace();
    }
  };

  const handleNavigation = (
    e: React.MouseEvent<HTMLAnchorElement>,
    section: "overview" | "features" | "solutions",
  ) => {
    e.preventDefault();
    setActiveNav(section);
    document.getElementById(section)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const navClassName = (section: "overview" | "features" | "solutions") =>
    `rounded-lg px-space-sm py-space-xs font-label-md text-label-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container ${
      activeNav === section
        ? "bg-primary-container text-on-primary shadow-sm"
        : "text-on-surface-variant hover:bg-tint-purple hover:text-primary-container"
    }`;

  return (
    <div className="bg-background-cream font-body-md text-on-surface min-h-screen flex flex-col w-full max-w-full overflow-x-hidden selection:bg-secondary-fixed selection:text-on-secondary-fixed">
      {/* Fixed Sticky Header */}
      <header className="hidden">
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
            className="hidden md:flex items-center gap-space-sm"
            aria-label="Main navigation"
          >
            <a
              aria-current={activeNav === "overview" ? "page" : undefined}
              className={navClassName("overview")}
              href="#overview"
              onClick={(e) => handleNavigation(e, "overview")}
            >
              Overview
            </a>
            <a
              aria-current={activeNav === "features" ? "page" : undefined}
              className={navClassName("features")}
              href="#features-overview"
              onClick={(e) => handleNavigation(e, "features")}
            >
              Features
            </a>
            <a
              aria-current={activeNav === "solutions" ? "page" : undefined}
              className={navClassName("solutions")}
              href="#solutions"
              onClick={(e) => handleNavigation(e, "solutions")}
            >
              Solutions
            </a>
            <a
              role="button"
              onClick={handleLaunch}
              className="rounded-lg px-space-sm py-space-xs font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-tint-purple hover:text-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container cursor-pointer no-underline"
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
              className="inline-flex items-center justify-center rounded-lg bg-primary-container px-space-lg py-space-sm font-headline-sm text-label-lg text-on-primary shadow-[0_4px_20px_-2px_rgba(78,31,190,0.2)] transition-all hover:-translate-y-0.5 hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container cursor-pointer no-underline"
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
      <main className="w-full flex-1 bg-background-cream" id="overview">
        <div className="flex flex-col w-full items-center">
          {/* Subtle Ambient Glows contained in hero section */}
          <div className="relative w-full overflow-hidden flex flex-col items-center">
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[700px] h-[380px] bg-gradient-to-tr from-tint-purple/60 via-secondary-container/20 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />
            <div className="absolute -top-16 right-10 w-96 h-96 bg-primary-fixed/40 blur-[120px] pointer-events-none -z-10 rounded-full" />

            {/* Main Content Container */}
            <div className="w-full max-w-[1280px] mx-auto px-margin-sm lg:px-margin pt-space-xl pb-28 sm:pb-32 lg:pb-36 flex flex-col items-center text-center">
              <div className="mb-space-lg inline-flex flex-col items-center justify-center">
                <h1 className="inline-block bg-[#EAFF57] px-5 py-2 text-3xl font-bold tracking-tight text-[#240067] sm:text-4xl">
                  Document Intake Assistant
                </h1>
                <span className="mt-1 inline-flex items-end gap-1 self-end text-[10px] font-medium leading-none text-[#240067] sm:text-xs">
                  <span className="leading-none">for</span>
                  <img
                    src="/logo.svg"
                    alt="Wenup"
                    className="h-3.5 w-auto shrink-0 leading-none"
                  />
                </span>
              </div>

              {/* Headline */}
              <h2 className="hero-tagline font-headline-xl text-headline-xl max-w-4xl tracking-tight leading-[1.1] mb-space-md">
                Turn conversation
                <br className="hidden sm:inline" /> to{" "}
                <span className="relative inline-block bg-[#D2BFFF] px-1 text-[#240067]">
                  document
                </span>
                .
              </h2>

              {/* Subtitle */}
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl font-normal leading-relaxed mb-space-xl">
                A small application that conducts a conversational interview,
                maintain structured information collected during that
                conversation, and produce a draft document from the information
                supplied.
              </p>

              {/* CTA Button Row */}
              <div className="flex items-center justify-center mb-space-xl">
                <a
                  role="button"
                  onClick={handleLaunch}
                  href="#workspace"
                  className="hero-action hero-action-primary group inline-flex items-center justify-center rounded-xl bg-primary-container text-on-primary shadow-[0_12px_28px_-6px_rgba(78,31,190,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container cursor-pointer no-underline"
                  data-path="app"
                >
                  <span>Enter Workspace</span>
                  <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </a>
              </div>

              {/* Empty demo-video placeholder. */}
              <div
                className="mb-space-xl aspect-video w-full max-w-5xl rounded-2xl border-[6px] border-primary-container bg-surface-white"
                aria-label="Demo video placeholder"
              />

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
                    <h2 className="font-headline-lg text-headline-lg text-on-surface">
                      Designed for flow, not clutter.
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                  {/* Card 1: Guided Interview */}
                  <div className="bg-surface-white p-space-lg rounded-[28px] shadow-[0_4px_20px_-2px_rgba(78,31,190,0.05)] hover:shadow-[0_12px_32px_-4px_rgba(78,31,190,0.1)] transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      <span className="material-symbols-outlined text-[32px] text-primary-container mb-space-md block group-hover:scale-105 transition-transform">
                        chat
                      </span>
                      <h3
                        className="mb-space-xs"
                        style={{
                          fontFamily: "Onsite",
                          fontWeight: 500,
                          color: "#240067",
                          fontSize: "1.5rem",
                          lineHeight: 1.2,
                        }}
                      >
                        Guided Interview
                      </h3>
                      <p
                        className="mb-space-lg"
                        style={{
                          fontFamily: "Onsite",
                          fontWeight: 400,
                          color: "#240067",
                          fontSize: "1rem",
                          lineHeight: 1.6,
                        }}
                      >
                        Ask questions in natural language and collect multiple
                        facts in one response without forcing a rigid form.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-space-md gap-3 mt-2">
                      <span className="font-label-sm text-label-sm font-semibold text-primary-container bg-surface-container-low px-4 py-2 rounded-full leading-none">
                        Conversational
                      </span>
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        check_circle
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Structured State Capture */}
                  <div className="bg-tint-purple/50 p-space-lg rounded-[28px] shadow-[0_4px_20px_-2px_rgba(78,31,190,0.05)] hover:shadow-[0_12px_32px_-4px_rgba(78,31,190,0.12)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 h-20 w-20 overflow-hidden">
                      <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-[30px] bg-[#EAFF57]" />
                      <span
                        className="absolute right-0 top-0 flex h-20 w-20 items-center justify-center text-center"
                        style={{
                          fontFamily: "Onsite",
                          fontWeight: 700,
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#240067",
                          lineHeight: 1.1,
                          padding: "0 6px 0 0",
                          transform: "translateX(2px)",
                        }}
                      >
                        State Sync
                      </span>
                    </div>
                    <div>
                      <span className="material-symbols-outlined text-[32px] text-primary-container mb-space-md block group-hover:scale-105 transition-transform">
                        database
                      </span>
                      <h3
                        className="mb-space-xs"
                        style={{
                          fontFamily: "Onsite",
                          fontWeight: 500,
                          color: "#240067",
                          fontSize: "1.5rem",
                          lineHeight: 1.2,
                        }}
                      >
                        Structured Capture
                      </h3>
                      <p
                        className="mb-space-lg"
                        style={{
                          fontFamily: "Onsite",
                          fontWeight: 400,
                          color: "#240067",
                          fontSize: "1rem",
                          lineHeight: 1.6,
                        }}
                      >
                        Maintain a canonical record of personal wishes, family
                        details, executor information, and confirmed status.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-space-md gap-3 mt-2">
                      <span className="font-label-sm text-label-sm font-semibold text-primary bg-surface-white px-4 py-2 shadow-sm leading-none">
                        Canonical State
                      </span>
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        schema
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Draft Document Generation */}
                  <div className="bg-surface-white p-space-lg rounded-[28px] shadow-[0_4px_20px_-2px_rgba(78,31,190,0.05)] hover:shadow-[0_12px_32px_-4px_rgba(78,31,190,0.1)] transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      <span className="material-symbols-outlined text-[32px] text-primary-container mb-space-md block group-hover:scale-105 transition-transform">
                        article
                      </span>
                      <h3
                        className="mb-space-xs"
                        style={{
                          fontFamily: "Onsite",
                          fontWeight: 500,
                          color: "#240067",
                          fontSize: "1.5rem",
                          lineHeight: 1.2,
                        }}
                      >
                        Draft Document
                      </h3>
                      <p
                        className="mb-space-lg"
                        style={{
                          fontFamily: "Onsite",
                          fontWeight: 400,
                          color: "#240067",
                          fontSize: "1rem",
                          lineHeight: 1.6,
                        }}
                      >
                        Turn collected answers into a structured draft document
                        ready for review, refinement, and finalisation.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-space-md gap-3 mt-2">
                      <span className="font-label-sm text-label-sm font-semibold text-primary-container bg-surface-container-low px-4 py-2 rounded-full leading-none">
                        Ready to Review
                      </span>
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        task_alt
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* How it works */}
              <div
                id="solutions"
                className="w-full max-w-5xl mx-auto mt-space-xl rounded-[28px] p-space-lg sm:p-space-xl text-left relative overflow-hidden shadow-[0_20px_40px_-8px_rgba(78,31,190,0.3)] bg-[#4E1FBE]"
              >
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col gap-4">
                  <h2
                    className="mb-0 flex items-end gap-1"
                    style={{
                      fontFamily: "Onsite",
                      fontWeight: 700,
                      color: "#FFFFFF",
                      fontSize: "2.25rem",
                      lineHeight: 1.1,
                    }}
                  >
                    <span>How it works</span>
                    <span
                      style={{
                        fontFamily:
                          "SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace",
                        fontWeight: 1000,
                        fontSize: "2.1rem",
                        lineHeight: 1,
                        transform: "translateY(-0.05em)",
                        display: "inline-block",
                      }}
                    >
                      ?
                    </span>
                  </h2>
                  <p
                    className="max-w-3xl"
                    style={{
                      fontFamily: "Onsite",
                      fontWeight: 400,
                      color: "rgba(255,255,255,0.92)",
                      fontSize: "1.05rem",
                      lineHeight: 1.7,
                    }}
                  >
                    The process begins with a simple conversational interview.
                    As the user speaks naturally, the system asks clarifying
                    questions only when needed, collects the relevant facts, and
                    keeps them in a structured state. Once the required details
                    are confirmed, it turns that information into a draft
                    document that reflects the user’s wishes clearly and
                    consistently.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <footer
            className="relative mt-space-xl w-full px-4 py-space-md sm:px-6 lg:px-10"
            style={{
              backgroundColor: "#4E1FBE",
              color: "#E9FF57",
            }}
          >
            <p
              className="m-0 text-center"
              style={{
                fontFamily: "Onsite",
                fontWeight: 700,
                color: "#E9FF57",
                fontSize: "1.05rem",
                lineHeight: 1.6,
              }}
            >
              *This is not a real product, but a solution to a problem provided
              by the Wenup Team. This is an assessment to test how I approach
              the problem.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};

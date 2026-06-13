"use client";

import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const PHASES = [
  {
    id: 1,
    title: "FOUNDATION - Know the placement path",
    tag: "PHASE 01",
    days: [
      { day: "Day 1", topics: ["Introduction, Hiring Process, Domain Selection"] },
      { day: "Day 2", topics: ["Resume Building"] },
      { day: "Day 3", topics: ["Task: Resume Submission"] },
      { day: "Day 4", topics: ["Task: Record Self-Introduction"] },
    ]
  },
  {
    id: 2,
    title: "APTITUDE TRAINING - Train your brain",
    tag: "PHASE 02",
    days: [
      { day: "Day 1", topics: ["Aptitude Fundamentals, Types of Questions, Strategy"] },
      { day: "Day 2", topics: ["Self-Learning & Daily Practice"] },
      { day: "Day 3", topics: ["Task: Submit Topics & 5 Questions Each"] },
      { day: "Day 4", topics: ["Task: Secure Online Aptitude Test"] },
    ]
  },
  {
    id: 3,
    title: "TECHNICAL CORE - Build your technical strength",
    tag: "PHASE 03",
    days: [
      { day: "Day 1", topics: ["Core Subject Prep, Interview Skills, Importance of Projects"] },
      { day: "Day 2", topics: ["DSA & Core Training (Basic/Intermediate/Advanced Tracks)"] },
      { day: "Day 3", topics: ["Task: Submit Technical Topics & Questions"] },
      { day: "Day 4", topics: ["Task: Online Core & Technical Test"] },
    ]
  },
  {
    id: 4,
    title: "PROFESSIONAL SKILLS - Build your profile",
    tag: "PHASE 04",
    days: [
      { day: "Day 1", topics: ["Communication Skills & Group Discussion (GD)"] },
      { day: "Day 2 & 3", topics: ["Daily Communication Practice"] },
      { day: "Day 4", topics: ["Task: Recorded Speaking Session Submission"] },
      { day: "Day 5", topics: ["Task: LinkedIn Profile Optimization"] },
    ]
  },
  {
    id: 5,
    title: "FINAL READINESS - Face real interviews",
    tag: "PHASE 05",
    days: [
      { day: "Day 1", topics: ["Application Strategies (On/Off-Campus)"] },
      { day: "Day 2", topics: ["Task: Final Resume/CV Submission"] },
      { day: "Day 3", topics: ["Task: Domain Mini-Project Submission"] },
      { day: "Day 4", topics: ["Task: Mock Interviews & Elimination"] },
      { day: "Day 5", topics: ["Task: Mock Interviews & Elimination"] },
      { day: "Day 6", topics: ["Task: Apply for 5 Internship/Job Roles"] },
      { day: "Day 7", topics: ["Closing Session: Handling Rejection & Career Focus"] },
    ]
  },
];

export default function InteractiveRoadmap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const bgPathRef = useRef<SVGPathElement>(null);
  const timelineCanvasRef = useRef<HTMLDivElement>(null);

  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1000);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1024);
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth - 40); // account for padding
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const activePhase = PHASES[activePhaseIdx];
  const numDays = activePhase.days.length;

  // Bulletproof IntersectionObserver to detect when the section is in view
  useEffect(() => {
    const el = timelineCanvasRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 } // Triggers when 10% is visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Animation timeline triggers when in view OR when tab changes
  useGSAP(() => {
    if (!pathRef.current || !timelineCanvasRef.current || !hasEntered) {
      gsap.set(".day-node", { opacity: 0, scale: 0 });
      gsap.set(".day-card", { opacity: 0, y: 20 });
      if (pathRef.current) {
        const pathLength = pathRef.current.getTotalLength();
        gsap.set(pathRef.current, { strokeDasharray: pathLength, strokeDashoffset: pathLength });
      }
      return;
    }

    // Reset items for animation
    gsap.set(".day-node", { opacity: 0, scale: 0 });
    gsap.set(".day-card", { opacity: 0, y: 20 });

    const path = pathRef.current;
    const pathLength = path.getTotalLength();
    gsap.set(path, { strokeDasharray: pathLength, strokeDashoffset: pathLength });

    const tl = gsap.timeline();

    // 1. Draw the SVG line
    tl.to(path, {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: "power2.inOut",
    });

    // 2. Reveal nodes and cards sequentially
    tl.to(".day-node", {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      stagger: 0.15,
      ease: "back.out(1.5)",
    }, "-=0.8");

    tl.to(".day-card", {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.15,
      ease: "power2.out",
    }, "-=0.8");

  }, { scope: containerRef, dependencies: [activePhaseIdx, isMobile, hasEntered] });

  // Generate SVG Path based on layout
  const generatePath = () => {
    if (isMobile) {
      const canvasHeight = Math.max(600, numDays * 180);
      const startOffsetY = 80;
      const step = (canvasHeight - 160) / (numDays - 1 || 1);
      const centerX = 40;

      let d = `M ${centerX} 0 L ${centerX} ${startOffsetY}`;
      for (let i = 0; i < numDays; i++) {
        const y = i * step + startOffsetY;
        d += ` L ${centerX} ${y}`;
      }
      return d;
    } else {
      const step = 380; // Fixed wide step to ensure scrolling and cut-off cards
      const startOffsetX = 140;
      const endOffsetX = 140;
      const computedWidth = (numDays - 1) * step + startOffsetX + endOffsetX;
      const canvasWidth = Math.max(containerWidth, computedWidth);
      const centerY = 200;
      const amplitude = 60;

      let d = `M 0 ${centerY} L ${startOffsetX} ${centerY}`;
      for (let i = 0; i < numDays; i++) {
        const x = i * step + startOffsetX;
        const isTop = i % 2 === 0;

        if (i === 0) {
          d += ` L ${x} ${centerY}`;
        } else {
          const prevX = (i - 1) * step + startOffsetX;
          const cp1X = prevX + step / 2;
          const cp1Y = isTop ? centerY + amplitude : centerY - amplitude;
          const cp2X = prevX + step / 2;
          const cp2Y = isTop ? centerY - amplitude : centerY + amplitude;

          d += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${x} ${centerY}`;
        }
      }
      d += ` L ${canvasWidth} ${centerY}`;
      return d;
    }
  };

  return (
    <section
      ref={containerRef}
      style={{
        padding: "100px 20px",
        background: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden", // Keeps faint waves contained
      }}
    >
      {/* Subtle Background Waves (only in roadmap) */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.03, zIndex: 0 }}
        preserveAspectRatio="none"
        viewBox="0 0 1200 600"
      >
        {[100, 200, 300, 400, 500].map((y) => (
          <path
            key={y}
            d={`M0 ${y} C300 ${y - 80} 600 ${y + 80} 900 ${y - 40} S1200 ${y + 60} 1200 ${y}`}
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="2"
          />
        ))}
      </svg>

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 className="display-text" style={{ fontSize: "clamp(3rem, 10vw, 5rem)", lineHeight: 1 }}>
            06 <span className="accent-yellow">ROADMAP</span>
          </h2>
        </div>

        {/* Top Navigation (The Phases) */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 60
        }}>
          {PHASES.map((phase, i) => {
            const isActive = activePhaseIdx === i;
            return (
              <button
                key={phase.id}
                onClick={() => setActivePhaseIdx(i)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  if (!isActive) e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  if (!isActive) e.currentTarget.style.boxShadow = "none";
                }}
                style={{
                  background: isActive ? "var(--accent-primary)" : "var(--surface-glass)",
                  border: `1px solid ${isActive ? "var(--accent-primary)" : "var(--border-strong)"}`,
                  color: isActive ? "var(--bg-primary)" : "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: isMobile ? 12 : 14,
                  fontWeight: isActive ? 700 : 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  padding: "12px 28px",
                  borderRadius: "var(--radius-full)",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: isActive ? "0 10px 30px var(--border-strong)" : "none",
                  backdropFilter: "blur(8px)",
                }}
              >
                {isMobile ? `P${phase.id}` : phase.tag}
              </button>
            );
          })}
        </div>

        {/* Phase Meta Title */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-3xl)", color: "var(--text-primary)" }}>
            {activePhase.title}
          </h3>
        </div>

        {/* The Timeline Canvas */}
        <div style={{ width: "100%", overflowX: isMobile ? "hidden" : "auto", overflowY: "hidden", paddingBottom: 40, WebkitOverflowScrolling: "touch" }}>
          <div
            ref={timelineCanvasRef}
            style={{
              position: "relative",
              height: isMobile ? Math.max(600, numDays * 180) : 400,
              minWidth: isMobile ? "100%" : Math.max(containerWidth, (numDays - 1) * 380 + 280),
              margin: "0 auto",
              padding: isMobile ? "0 20px" : "0 40px",
            }}
          >
          {/* SVG Line Canvas */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 1,
            }}
            preserveAspectRatio="none"
          >
            <path
              ref={bgPathRef}
              d={generatePath()}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="2"
            />
            <path
              ref={pathRef}
              d={generatePath()}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="4"
              style={{ filter: "drop-shadow(0 0 8px var(--accent-primary))" }}
            />
          </svg>

          {/* Nodes and Content Blocks */}
          {activePhase.days.map((dayObj, i) => {
            let xPos, yPos, cardLeft, cardTop;

            if (isMobile) {
              const canvasHeight = Math.max(600, numDays * 180);
              const step = (canvasHeight - 160) / (numDays - 1 || 1);
              xPos = 40;
              yPos = i * step + 80;
              cardLeft = xPos + 40;
              cardTop = yPos - 30; // Center card vertically with node
            } else {
              const step = 380;
              const computedWidth = (numDays - 1) * step + 280;
              const canvasWidth = Math.max(containerWidth, computedWidth);
              const startOffsetX = 140;
              const isTop = i % 2 === 0;
              xPos = i * step + startOffsetX;
              yPos = 200; // centerY
              cardLeft = xPos - 120; // Center card (width 240) horizontally
              cardTop = isTop ? yPos - 160 : yPos + 40;
            }

            return (
              <div key={`${activePhaseIdx}-${i}`} style={{ position: "absolute", zIndex: 5, left: 0, top: 0 }}>
                {/* Milestone Node */}
                <div
                  className="day-node"
                  style={{
                    position: "absolute",
                    left: xPos - 12,
                    top: yPos - 12,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--bg-primary)",
                    border: "4px solid var(--accent-primary)",
                    boxShadow: "0 0 16px var(--accent-primary)",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.3)";
                    e.currentTarget.style.boxShadow = "0 0 30px var(--accent-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 0 16px var(--accent-primary)";
                  }}
                />

                {/* Content Block */}
                <div
                  className="day-card"
                  style={{
                    position: "absolute",
                    left: cardLeft,
                    top: cardTop,
                    width: isMobile ? "calc(100vw - 120px)" : 240,
                    maxWidth: 320,
                    background: "var(--surface-glass)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-xl)",
                    padding: "20px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                    borderTop: `2px solid var(--accent-primary)`,
                    transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 15px 35px rgba(0,0,0,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
                  }}
                >
                  <div className="mono-text" style={{ fontSize: 12, color: "var(--accent-primary)", marginBottom: 12 }}>
                    {dayObj.day}
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {dayObj.topics.map((topic, tIdx) => (
                      <li key={tIdx} style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ color: "var(--accent-primary)", fontSize: 10, marginTop: 4 }}>▹</span>
                        <span style={{ lineHeight: 1.4 }}>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
          </div>
        </div>

      </div>
    </section>
  );
}

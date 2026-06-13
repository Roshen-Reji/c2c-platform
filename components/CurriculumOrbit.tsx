"use client";

import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const PILLARS = [
  { title: "Structured Learning", desc: "5-Phase training from basics to mock interviews" },
  { title: "Aptitude & Core", desc: "Branch-specific technical and aptitude prep" },
  { title: "Professional Skills", desc: "Communication, GDs, & LinkedIn optimization" },
  { title: "Placement Ready", desc: "Mock interviews, resumes, & application strategies" },
];

const NEW_FEATURES = [
  {
    title: "Structured Learning",
    icon: (
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
      </svg>
    ),
    description: "A comprehensive 5-phase training program that guides you systematically from basic placement awareness to final interview readiness over 4-6 weeks."
  },
  {
    title: "Aptitude & Core Prep",
    icon: (
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    ),
    description: "Master quantitative aptitude and core subjects with branch-specific technical training tailored for CSE, ECE, EEE, CE, and EL students."
  },
  {
    title: "Professional Skills",
    icon: (
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
    description: "Build your professional profile and enhance your communication skills through group discussions, presentation practice, and LinkedIn optimization."
  },
  {
    title: "Placement Readiness",
    icon: (
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    ),
    description: "Face real interviews with confidence. Participate in mock technical and HR interviews with industry experts and receive personalized feedback."
  }
];

export default function CurriculumOrbit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitGroupRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const gridGroupRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useGSAP(() => {
    if (!containerRef.current) return;

    ScrollTrigger.refresh();

    // Set initial grid state
    gsap.set(".horizontal-feature-card", { opacity: 0, y: 50, scale: 0.9 });
    gsap.set(gridGroupRef.current, { opacity: 0, pointerEvents: "none" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        pin: true,
        scrub: 1.5,
        start: "top top",
        end: "+=2500", 
      }
    });

    // 1. Orbit animation
    tl.to(orbitGroupRef.current, {
      rotation: 360,
      ease: "none",
      duration: 2,
    }, 0);

    // Keep the cards upright
    tl.to(".orbit-card-inner", {
      rotation: -360,
      ease: "none",
      duration: 2,
    }, 0);

    // 2. Transition out of Orbit
    tl.to(orbitGroupRef.current, {
      scale: 1.5,
      opacity: 0,
      duration: 0.8,
      ease: "power2.inOut"
    }, 1.5);

    tl.to(logoRef.current, {
      scale: 0,
      opacity: 0,
      duration: 0.6,
      ease: "back.in(1.5)"
    }, 1.5);

    // 3. Transition into Horizontal Array
    tl.to(gridGroupRef.current, {
      opacity: 1,
      pointerEvents: "auto",
      duration: 0.2
    }, 2.0);

    tl.to(".horizontal-feature-card", {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      stagger: 0.15,
      ease: "back.out(1.2)"
    }, 2.0);

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, { scope: containerRef });

  const orbitRadius = isMobile ? 140 : 280; 
  const cardWidth = isMobile ? 140 : 240;

  return (
    <section 
      ref={containerRef}
      style={{
        height: "100vh",
        width: "100vw",
        background: "var(--bg-secondary)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title */}
      <div style={{ position: "absolute", top: isMobile ? 40 : 80, left: 0, width: "100%", textAlign: "center", zIndex: 20 }}>
        <p className="mono-text" style={{ color: "var(--accent-primary)", fontSize: "var(--text-xs)", letterSpacing: 4, marginBottom: 16 }}>THE REASON</p>
        <h2 className="display-text" style={{ fontSize: isMobile ? "clamp(3rem, 10vw, 4rem)" : "clamp(4.5rem, 8vw, 7rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.85, textTransform: "uppercase" }}>
          WHY <span className="accent-green">C2C</span>
        </h2>
      </div>

      {/* Animation Area */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 140 }}>
        
        {/* Orbit Group */}
        <div 
          ref={orbitGroupRef}
          style={{
            position: "absolute",
            width: orbitRadius * 2,
            height: orbitRadius * 2,
            zIndex: 5,
          }}
        >
          {PILLARS.map((pillar, i) => {
            const angle = (i / PILLARS.length) * Math.PI * 2;
            const x = Math.cos(angle) * orbitRadius;
            const y = Math.sin(angle) * orbitRadius;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                  width: cardWidth,
                  height: cardWidth * 0.7,
                }}
              >
                <div 
                  className="orbit-card-inner"
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "var(--bg-card)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-xl)",
                    padding: isMobile ? "16px" : "24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    boxShadow: "var(--shadow-md)"
                  }}
                >
                  <h4 style={{ fontFamily: "var(--font-heading)", fontSize: isMobile ? 14 : 20, color: "var(--accent-primary)", marginBottom: 8 }}>
                    {pillar.title}
                  </h4>
                  {!isMobile && <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{pillar.desc}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Logo */}
        <div 
          ref={logoRef}
          style={{
            position: "absolute",
            width: isMobile ? 120 : 180,
            height: isMobile ? 120 : 180,
            borderRadius: "50%",
            background: "var(--surface-glass)",
            border: "2px solid var(--accent-primary)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-glow)",
            zIndex: 6,
          }}
        >
          <span className="display-text" style={{ fontSize: isMobile ? "var(--text-4xl)" : "var(--text-6xl)", color: "var(--text-primary)", lineHeight: 1 }}>
            C<span style={{ color: "var(--accent-primary)" }}>2</span>C
          </span>
          <span className="mono-text" style={{ fontSize: 10, letterSpacing: 3, marginTop: 8, color: "var(--accent-primary)" }}>CORE</span>
        </div>

        {/* Horizontal Array (Inactive Cards) */}
        <div 
          ref={gridGroupRef}
          style={{
            position: "absolute",
            width: "100%",
            maxWidth: 1400,
            padding: "0 24px",
            zIndex: 10,
          }}
        >
          <div style={{
            display: "flex",
            overflowX: "auto",
            gap: isMobile ? 16 : 24,
            paddingBottom: 32, // space for scrollbar/hover lift
            scrollbarWidth: "none", // Firefox
            WebkitOverflowScrolling: "touch",
            paddingLeft: isMobile ? 0 : 24,
            paddingRight: isMobile ? 0 : 24,
          }}>
            {NEW_FEATURES.map((feature, i) => (
              <div 
                key={i}
                className="horizontal-feature-card"
                style={{
                  width: isMobile ? 280 : 360,
                  flex: "0 0 auto",
                  background: "var(--surface-glass)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-2xl)",
                  padding: "32px 24px",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s, box-shadow 0.4s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-12px)";
                  e.currentTarget.style.borderColor = "var(--accent-primary)";
                  e.currentTarget.style.boxShadow = "var(--shadow-glow)";
                  e.currentTarget.style.background = "var(--surface-glass-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "var(--surface-glass)";
                }}
              >
                {/* Top: Center SVG Icon */}
                <div style={{ 
                  width: 64, height: 64, 
                  margin: "0 auto 24px auto",
                  color: "var(--accent-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {feature.icon}
                </div>
                
                {/* Middle: Brutalist Title */}
                <h3 style={{ 
                  fontFamily: "var(--font-heading)", 
                  fontSize: 24, 
                  lineHeight: 1.1,
                  textAlign: "center",
                  color: "var(--text-primary)",
                  textTransform: "uppercase",
                  marginBottom: 32,
                  flex: 1, // push data points to bottom
                }}>
                  {feature.title}
                </h3>
                
                {/* Bottom: Description */}
                <div style={{ 
                  color: "var(--text-secondary)", 
                  fontSize: 14, 
                  lineHeight: 1.6,
                  textAlign: "center"
                }}>
                  {feature.description}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </section>
  );
}

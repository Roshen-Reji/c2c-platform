"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import "./landing.css";

const InteractiveRoadmap = dynamic(() => import("@/components/InteractiveRoadmap"), { ssr: false });
const CurriculumOrbit = dynamic(() => import("@/components/CurriculumOrbit"), { ssr: false });



const MARQUEE_ITEMS = [
  "Resume Building",
  "Aptitude Training",
  "Technical Core",
  "Mock Interviews",
  "Professional Skills",
  "LinkedIn Optimization",
  "Group Discussions",
  "Domain Selection",
  "Communication",
  "Placement Prep",
  "Core Subjects",
  "Self Introduction",
];

const FEES_FEATURES = [
  "Access to all 5 phases",
  "Live interactive sessions",
  "Hands-on tasks & projects",
  "Mock interview sessions",
  "Personalized evaluator feedback",
  "Leaderboard & gamification",
  "Completion certificate",
  "Lifetime access to materials",
];

/* ===== Scroll Reveal Hook ===== */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const el = ref.current;
    if (el) {
      const children = el.querySelectorAll(".animate-reveal");
      children.forEach((child) => observer.observe(child));
      // also observe the element itself
      if (el.classList.contains("animate-reveal")) {
        observer.observe(el);
      }
    }

    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ===== Components ===== */

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    // Explicitly enforce dark mode on load
    document.body.classList.remove("theme-light");
    setIsLightMode(false);

    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    if (isLightMode) {
      document.body.classList.remove("theme-light");
      setIsLightMode(false);
    } else {
      document.body.classList.add("theme-light");
      setIsLightMode(true);
    }
  };

  return (
    <header className={`header ${scrolled ? "scrolled" : ""}`} id="header">
      <div className="container header-inner">
        <Link href="/" className="header-logo" id="logo">
          C<span>2</span>C
        </Link>

        <nav className={`header-nav ${mobileOpen ? "open" : ""}`} id="main-nav">
          <a href="#phases" className="header-nav-link" onClick={() => setMobileOpen(false)}>
            Phases
          </a>
          <a href="#features" className="header-nav-link" onClick={() => setMobileOpen(false)}>
            Features
          </a>
          <a href="#fees" className="header-nav-link" onClick={() => setMobileOpen(false)}>
            Fees
          </a>
          <Link href="/login" className="header-nav-link" id="nav-login-link" onClick={() => setMobileOpen(false)}>
            Login
          </Link>
          <Link href="/register" className="btn btn-primary hide-desktop" style={{ marginTop: 'var(--space-2)' }} onClick={() => setMobileOpen(false)}>
            Register
          </Link>
        </nav>

        <div className="header-actions">
          <button
            className="theme-toggle"
            id="theme-toggle"
            aria-label="Toggle theme"
            title="Toggle theme"
            onClick={toggleTheme}
          >
            {isLightMode ? "☾" : "☀"}
          </button>
          <Link href="/register" className="btn btn-primary hide-mobile" id="nav-register-btn">
            Register
          </Link>
          <button
            className="mobile-menu-btn hide-desktop"
            id="mobile-menu-btn"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
}

function ScrollIndicator() {
  return (
    <div className="scroll-indicator">
      <div className="scroll-indicator-circle">
        <div className="scroll-indicator-text">
          <svg viewBox="0 0 100 100">
            <defs>
              <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
            </defs>
            <text>
              <textPath xlinkHref="#circlePath">
                SCROLL DOWN • EXPLORE MORE • SCROLL DOWN •&nbsp;
              </textPath>
            </text>
          </svg>
        </div>
        <span className="scroll-indicator-arrow">↓</span>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="hero" id="hero">
      <div className="hero-bg-glow hero-bg-glow-1" />
      <div className="hero-bg-glow hero-bg-glow-2" />

      <div className="container">
        <div className="hero-left">
          <h1 className="hero-title">
            <span className="line">
              <span>Campus</span>
            </span>
            <span className="line">
              <span>
                <span className="accent-yellow">2</span>
              </span>
            </span>
            <span className="line">
              <span>Corporate</span>
            </span>
          </h1>

          <p className="hero-subtitle">
            4 to 6 Weeks Online Training Program — B.Tech Students
          </p>

          <div className="hero-cta-group">
            <Link href="/register" className="btn btn-primary btn-large" id="hero-register-btn">
              Register Now
            </Link>
            <a href="#phases" className="btn btn-secondary btn-large" id="hero-explore-btn">
              Explore Phases
            </a>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-info-card">
            <h2 className="hero-info-title">
              Your Bridge to the <span className="accent-green">Industry</span>
            </h2>
            <p className="hero-info-text">
              A comprehensive multi-session online program organised by the Women In Engineering Branch of IEEE CEK designed specifically for 2nd-year,
              3rd-year, and final-year B.Tech students in CSE, ECE, EEE, CE &amp; EL. Prepare
              for placements with structured learning, practical tasks, and real interview
              simulations across 5 intensive phases.
            </p>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-number">5</div>
              <div className="hero-stat-label">Phases</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-number">9+</div>
              <div className="hero-stat-label">Sessions</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-number">20+</div>
              <div className="hero-stat-label">Days</div>
            </div>
          </div>
        </div>
      </div>
      <ScrollIndicator />
    </section>
  );
}

function MarqueeSection() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <section className="marquee-section" id="marquee">
      <div className="marquee-row">
        <div className="marquee-track animate-marquee-left">
          {items.map((item, i) => (
            <span className="marquee-item" key={`l-${i}`}>
              {item}
              <span className="marquee-separator">◆</span>
            </span>
          ))}
        </div>
      </div>
      <div className="marquee-row">
        <div className="marquee-track animate-marquee-right">
          {items.map((item, i) => (
            <span className="marquee-item" key={`r-${i}`}>
              {item}
              <span className="marquee-separator">◆</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// Sections removed in favor of InteractiveRoadmap and CurriculumOrbit components

function FeesSection() {
  const ref = useScrollReveal();

  return (
    <section className="fees-section" id="fees" ref={ref}>
      <div className="container">
        <div className="animate-reveal" style={{ textAlign: "center", marginBottom: "var(--space-16)" }}>
          <p className="section-label" style={{ textAlign: "center" }}>Investment</p>
          <h2
            className="section-title"
            style={{ textAlign: "center", maxWidth: "900px", margin: "0 auto var(--space-6)" }}
          >
            One <span className="accent-purple">Program</span>, Complete <span className="accent-yellow">Transformation</span>
          </h2>
        </div>

        <div className="fees-card animate-reveal">
          <span className="badge badge-green fees-badge">Limited Seats</span>
          <div className="fees-price">
            ₹300
            <div className="fees-price-sub">One-time payment • Full access</div>
          </div>
          <p className="fees-description">
            Get complete access to all 5 phases, live sessions, hands-on tasks,
            mock interviews, and your completion certificate — all for less than
            the cost of a textbook.
          </p>
          <ul className="fees-features">
            {FEES_FEATURES.map((feature, i) => (
              <li key={i}>
                <span className="fees-check">✓</span>
                {feature}
              </li>
            ))}
          </ul>
          <Link href="/register" className="btn btn-primary btn-large w-full" id="fees-register-btn">
            Register Now
          </Link>
        </div>
      </div>
    </section>
  );
}

function FooterCTA() {
  const ref = useScrollReveal();

  return (
    <section className="footer-cta" ref={ref}>
      <div className="container">
        <div className="animate-reveal">
          <h2 className="footer-cta-title">
            Start Your
            <br />
            Journey
          </h2>
          <p className="footer-cta-sub">
            Don&apos;t wait until placements are around the corner. Start preparing now and
            be the candidate everyone wants to hire.
          </p>
          <Link href="/register" className="btn btn-primary btn-large" id="footer-register-btn">
            Register for C2C
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="container footer-inner">
        <div className="footer-logo">
          C<span>2</span>C
        </div>
        <div className="footer-links">
          <a href="#phases" className="footer-link">
            Phases
          </a>
          <a href="#features" className="footer-link">
            Features
          </a>
          <a href="#fees" className="footer-link">
            Fees
          </a>
          <Link href="/register" className="footer-link">
            Register
          </Link>
        </div>
        <div className="footer-copy">© 2026 Campus 2 Corporate.  WIE IEEE CEK.</div>
      </div>
    </footer>
  );
}

/* ===== Main Page ===== */
export default function LandingPage() {
  /* Global scroll reveal observer */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll(".animate-reveal").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <Header />
      <HeroSection />
      <MarqueeSection />
      <div id="phases"><InteractiveRoadmap /></div>
      <div id="features"><CurriculumOrbit /></div>
      <FeesSection />
      <FooterCTA />
      <Footer />
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "./coming-soon.css";
import PreRegisterForm from "@/components/coming-soon/PreRegisterForm";

/* Dynamically import the 3D scene — no SSR, only client */
const GlassCubeScene = dynamic(
  () => import("@/components/coming-soon/GlassCubeScene"),
  { ssr: false }
);

/* ── Countdown logic ── */
function useCountdown() {
  const [timeStr, setTimeStr] = useState("00 : 00 : 00 : 00");

  useEffect(() => {
    const launchDateStr = process.env.NEXT_PUBLIC_LAUNCH_DATE;
    const targetDate = launchDateStr ? new Date(launchDateStr).getTime() : 0;

    const tick = () => {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeStr("00 : 00 : 00 : 00");
        if (targetDate > 0) window.location.reload();
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      const pad = (n: number) => n.toString().padStart(2, "0");
      setTimeStr(`${pad(d)} : ${pad(h)} : ${pad(m)} : ${pad(s)}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return timeStr;
}

export default function ComingSoonPage() {
  const timeStr = useCountdown();

  return (
    <div className="cs-page">


      {/* Top Header */}
      <header className="cs-header">
        <div className="cs-c2c-badge">[ C2C ]</div>
        <h1 className="cs-header-title">
          <span className="cs-title-word">Campus</span>
          <span className="cs-title-accent">2</span>
          <span className="cs-title-word">Corporate</span>
        </h1>
        <div className="cs-header-tagline-wrapper">
          <span className="cs-tagline-prefix">LOG //</span>
          <p className="cs-header-tagline">
            <span className="cs-tagline-dim">From</span> Theory <span className="cs-tagline-dim">To</span> Legacy<span className="cs-tagline-dots">.....</span>
          </p>
        </div>
      </header>

      {/* 3D Scene + Timer */}
      <div className="cs-scene-wrapper">
        {/* Corner technical text */}
        <div className="cs-corner cs-corner--tl">
          SYS.ACTIVE<br />
          09°56′N 76°20′E
        </div>
        <div className="cs-corner cs-corner--tr">
          2026<br />
          BUILD.007
        </div>
        <div className="cs-corner cs-corner--bl">
          IEEE SB CEK<br />
          WOMEN IN ENG.
        </div>
        <div className="cs-corner cs-corner--br">
          TRANSMISSION<br />
          STATUS: PENDING
        </div>

        {/* HTML timer behind the 3D canvas as visual anchor / fallback */}
        <div className="cs-timer-overlay">
          <span className="cs-timer-text">{timeStr}</span>
        </div>
        {/* WebGL canvas with wireframe geometry (overlays the timer) */}
        <GlassCubeScene />
      </div>

      {/* Pre-Registration */}
      <PreRegisterForm />

      {/* Footer */}
      <footer className="cs-footer">
        <div className="cs-footer-col">
          <span className="cs-footer-label">Follow Us</span>
          <div className="cs-footer-links">
            <a href="#" className="cs-footer-link">LinkedIn</a>
            <a href="#" className="cs-footer-link">WhatsApp</a>
            <a href="#" className="cs-footer-link">Instagram</a>
          </div>
        </div>

        <div className="cs-footer-col">
          <span className="cs-footer-label">For Enquiries</span>
          <div className="cs-footer-links">
            <a href="mailto:contact@example.com" className="cs-footer-link">contact@example.com</a>
            <span className="cs-footer-text">
              +91 123 456 7890 <br/>
              <span className="cs-contact-name">(John Doe)</span>
            </span>
          </div>
        </div>

        <div className="cs-footer-right">
          <img src="/ieee-sb-cek.png" alt="IEEE CE Kidangoor Student Branch" className="cs-footer-logo" />
          <img src="/ieee-logo.png" alt="IEEE" className="cs-footer-logo" />
          <img src="/ieee-wie.png" alt="IEEE WIE" className="cs-footer-logo" />
        </div>
      </footer>
    </div>
  );
}

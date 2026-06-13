"use client";

import React, { useState } from "react";

export default function PreRegisterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/pre-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("NOTIFIED — YOU'RE IN");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "TRANSMISSION FAILED");
      }
    } catch {
      setStatus("error");
      setMessage("SYSTEM ERROR — RETRY");
    }
  };

  return (
    <div className="cs-register">
      <form className="cs-register-row" onSubmit={handleSubmit}>
        <input
          type="email"
          className="cs-register-input"
          placeholder="enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading" || status === "success"}
          required
        />
        <button
          type="submit"
          className="cs-register-btn"
          disabled={status === "loading" || status === "success"}
        >
          {status === "loading" ? "..." : status === "success" ? "✓ DONE" : "NOTIFY ME"}
        </button>
      </form>
      <div className={`cs-register-msg ${status === "success" ? "success" : status === "error" ? "error" : ""}`}>
        {message}
      </div>
    </div>
  );
}

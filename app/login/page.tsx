"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup, UserCredential } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [isSetup, setIsSetup] = useState(false);

  const processLogin = async (userCredential: UserCredential) => {
    const uid = userCredential.user.uid;

    // Check user role by checking different collections
    const [studentDoc, adminDoc, organiserDoc, evaluatorDoc] = await Promise.all([
      getDoc(doc(db, "students", uid)),
      getDoc(doc(db, "admins", uid)),
      getDoc(doc(db, "organisers", uid)),
      getDoc(doc(db, "evaluators", uid)),
    ]);

    let role = "student";
    let data = null;

    if (adminDoc.exists()) {
      data = adminDoc.data();
      role = data?.role || "admin";
    } else if (organiserDoc.exists()) {
      data = organiserDoc.data();
      role = data?.role || "organiser";
    } else if (evaluatorDoc.exists()) {
      data = evaluatorDoc.data();
      role = data?.role || "evaluator";
    } else if (studentDoc.exists()) {
      data = studentDoc.data();
      role = data?.role || "student";
    } else {
      setError("Account not found. Please register first.");
      return;
    }

    if (role === "admin") {
      router.push("/admin");
    } else if (role === "organiser") {
      router.push("/organiser/dashboard");
    } else if (role === "evaluator") {
      router.push("/evaluator/dashboard");
    } else {
      if (data?.status === "pending") {
        setError("Your account is pending approval. Please wait for admin verification.");
        return;
      }
      if (data?.status === "rejected") {
        setError("Your payment was not verified. Please contact the organizers.");
        return;
      }
      router.push("/student/dashboard");
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to check email");
      }

      if (!data.exists) {
        setError("Account not found. Please register first.");
        setLoading(false);
        return;
      }

      setIsSetup(!data.hasPassword);
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSetup) {
        const setupRes = await fetch("/api/setup-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password })
        });
        const setupData = await setupRes.json();
        if (!setupRes.ok) {
          throw new Error(setupData.error || "Failed to set up password");
        }
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      await processLogin(userCredential);
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.message && !err.code) {
        setError(err.message);
      } else {
        const code = err.code;
        if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
          setError("Invalid email or password.");
        } else if (code === "auth/too-many-requests") {
          setError("Too many failed attempts. Please try again later.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      await processLogin(userCredential);
    } catch (err) {
      console.error("Google Login error:", err);
      setError("Failed to sign in with Google.");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="container login-container">
        <Link href="/" className="register-back" id="login-back-link">
          ← Back to Home
        </Link>

        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">
              Welcome <span className="accent-yellow">Back</span>
            </h1>
            <p className="login-subtitle">
              Sign in to the C2C Portal
            </p>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary w-full" 
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{ marginBottom: "var(--space-6)", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
            <span style={{ padding: '0 10px', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>OR SIGN IN WITH EMAIL</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
          </div>

          {step === 1 ? (
            <form onSubmit={handleEmailSubmit} className="login-form">
              <div className="input-group">
                <label className="input-label" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="input"
                  placeholder="your.email@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="login-error" id="login-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-large w-full"
                disabled={loading}
                id="login-continue-btn"
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Checking...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="login-form">
              <div className="input-group">
                <label className="input-label" htmlFor="login-email-display">
                  Email
                </label>
                <input
                  id="login-email-display"
                  type="email"
                  className="input"
                  value={email}
                  disabled
                  style={{ opacity: 0.7, cursor: "not-allowed" }}
                />
                <button
                  type="button"
                  onClick={() => { setStep(1); setPassword(""); setError(""); }}
                  style={{ background: "none", border: "none", color: "var(--accent-secondary)", fontSize: "var(--text-xs)", marginTop: "var(--space-1)", cursor: "pointer", textDecoration: "underline", textAlign: "left", padding: 0 }}
                >
                  Change Email
                </button>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="login-password">
                  {isSetup ? "Create Password" : "Password"}
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="input"
                  placeholder={isSetup ? "Create a secure password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {isSetup && (
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
                    This is your first time logging in. Please set a password for your account.
                  </div>
                )}
              </div>

              {error && (
                <div className="login-error" id="login-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-large w-full"
                disabled={loading}
                id="login-submit-btn"
              >
                {loading ? (
                  <>
                    <span className="spinner" /> {isSetup ? "Setting up..." : "Signing in..."}
                  </>
                ) : (
                  isSetup ? "Set Password & Sign In" : "Sign In"
                )}
              </button>
            </form>
          )}

          <div className="login-footer">
          </div>
        </div>
      </div>
    </div>
  );
}

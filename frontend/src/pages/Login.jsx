import { useState } from "react";
import { api, setToken } from "../api";

export default function Login({ onDone }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api(`/auth/${mode}`, {
        method: "POST",
        body: { email, password },
      });
      setToken(result.token);
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <a className="brand-lockup" href="/" aria-label="Study Planner home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M6 21.5 13.5 14l5 5L27 10.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19.5 10.5H27V18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>STUDY<span className="brand-light">/</span>OS</span>
        </a>

        <div className="auth-copy">
          <p className="eyebrow"><span className="status-pulse" /> YOUR PERSONAL LEARNING SYSTEM</p>
          <h1>Make your next<br /><span>breakthrough</span><br />inevitable.</h1>
          <p className="auth-description">
            One clear plan. Better focus. A little progress, every day.
          </p>
        </div>

        <div className="auth-orbit" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-core"><span>FOCUS<br />MODE</span></div>
          <span className="orbit-label orbit-label-top">PLAN / 01</span>
          <span className="orbit-label orbit-label-bottom">PROGRESS /∞</span>
          <span className="orbit-dot orbit-dot-one" />
          <span className="orbit-dot orbit-dot-two" />
        </div>

        <p className="auth-footer">A calmer way to get exam-ready <span>•</span> Built for momentum</p>
      </section>

      <section className="auth-panel-wrap">
        <div className="auth-panel">
          <div className="mobile-brand brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M6 21.5 13.5 14l5 5L27 10.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19.5 10.5H27V18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>STUDY<span className="brand-light">/</span>OS</span>
          </div>
          <div className="auth-heading">
            <span className="auth-kicker">YOUR WORKSPACE AWAITS</span>
            <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p>{mode === "login" ? "Pick up where your progress left off." : "Set up your space and start moving forward."}</p>
          </div>

          <div className="auth-divider"><span>SIGN IN WITH EMAIL</span></div>

          <form onSubmit={submit} className="auth-form">
            <label>
              <span>Email address</span>
              <input
                className="input auth-input"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              <span>Password</span>
              <input
                className="input auth-input"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={6}
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="btn btn-primary auth-submit" disabled={busy}>
              <span>{busy ? "Connecting..." : mode === "login" ? "Sign in" : "Create account"}</span>
              {!busy && <span aria-hidden="true">↗</span>}
            </button>
          </form>

          <p className="auth-switch">
            {mode === "login" ? "New to Study OS?" : "Already have an account?"}
            {" "}
            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="auth-privacy">Your study data stays yours. Always.</p>
        </div>
      </section>
    </main>
  );
}

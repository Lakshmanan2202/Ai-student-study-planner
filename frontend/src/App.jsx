import { useState } from "react";
import { getToken, setToken } from "./api";
import Login from "./pages/Login";
import Today from "./pages/Today";
import Subjects from "./pages/Subjects";
import Progress from "./pages/Progress";
import Chat from "./pages/Chat";

const TABS = [
  ["today", "Today", Today],
  ["subjects", "Subjects", Subjects],
  ["progress", "Progress", Progress],
  ["chat", "Study chat", Chat],
];

function NavIcon({ name }) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const paths = {
    today: <><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17M8 14h3M8 17h7" /></>,
    subjects: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8M8 10h6" /></>,
    progress: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /><path d="M16 6h4v4" /></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.5 8.5 0 0 1-3.4-.7L4 20l1.5-3.7A7.1 7.1 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H4" /><path d="M12 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...shared}>{paths[name]}</svg>;
}

function Brand() {
  return (
    <div className="brand-lockup">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M6 21.5 13.5 14l5 5L27 10.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19.5 10.5H27V18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>STUDY<span className="brand-light">/</span>OS</span>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [tab, setTab] = useState("today");
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  const Page = TABS.find((item) => item[0] === tab)[2];
  const today = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return (
    <div className="app-shell md:flex">
      <nav className="app-sidebar" aria-label="Main navigation">
        <div className="sidebar-brand"><Brand /></div>
        <p className="sidebar-section-label">WORKSPACE</p>
        <div className="app-nav">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`nav-item ${tab === id ? "nav-item-active" : ""}`}
            >
              <NavIcon name={id} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-status"><span /> YOUR WORKSPACE IS READY</div>
          <button
            onClick={() => { setToken(null); setAuthed(false); }}
            className="nav-item"
          >
            <NavIcon name="logout" />
            <span>Log out</span>
          </button>
        </div>
      </nav>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-label">Your study space</div>
          <div className="topbar-caption">{today} <span aria-hidden="true">·</span> MAKE IT COUNT</div>
        </header>
        <main className="app-content">
          <Page />
        </main>
      </div>
    </div>
  );
}

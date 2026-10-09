import { useEffect, useState } from "react";
import { api } from "../api";

export default function Progress() {
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("/progress").then(setP).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!p) return <p className="text-sm text-muted">Loading</p>;

  const hours = (p.minutes_studied / 60).toFixed(1);
  const rows = [
    ["Sessions completed", `${p.sessions_done} of ${p.sessions_total}`],
    ["Time studied", `${hours} hours`],
    ["Current streak", `${p.streak_days} ${p.streak_days === 1 ? "day" : "days"}`],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Progress</h1>
      <div className="panel max-w-md p-4">
        <div className="mb-2 flex justify-between text-sm"><span>Plan completed so far</span><span className="font-medium">{p.percent}%</span></div>
        <div className="h-2 rounded bg-page"><div className="h-2 rounded bg-accent" style={{ width: `${p.percent}%` }} /></div>
      </div>
      <dl className="panel max-w-md divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-4 py-2.5 text-sm"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

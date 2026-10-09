import { useEffect, useState } from "react";
import { api, fmtDay, daysUntil } from "../api";

export default function Today() {
  const [today, setToday] = useState([]);
  const [week, setWeek] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [days, setDays] = useState(7);
  const [hours, setHours] = useState(2);
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [t, w, s] = await Promise.all([api("/planner/today"), api("/planner/week"), api("/subjects")]);
    setToday(t); setWeek(w); setSubjects(s);
  }
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  async function run(fn) {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(e.message); }
    setBusy(false);
  }

  const generate = () => run(async () => {
    await api("/planner/generate", { method: "POST", body: { days: Number(days), hours_per_day: Number(hours) } });
    setExplanation("");
    await load();
  });
  const toggle = (id) => run(async () => { await api(`/sessions/${id}/complete`, { method: "PATCH" }); await load(); });
  const explain = () => run(async () => setExplanation((await api("/ai/explain-plan", { method: "POST" })).explanation));

  const byDay = week.reduce((m, s) => ((m[s.day] = m[s.day] || []).push(s), m), {});
  const exams = subjects.map((s) => ({ ...s, left: daysUntil(s.exam_date) })).filter((s) => s.left >= 0);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-semibold">Today</h1>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">Days to plan
            <input className="input ml-2 w-16" type="number" min="1" max="30" value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
          <label className="text-sm">Hours per day
            <input className="input ml-2 w-16" type="number" min="0.5" max="14" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
          <button className="btn btn-primary" disabled={busy} onClick={generate}>Generate plan</button>
          <button className="btn" disabled={busy || !today.length} onClick={explain}>Explain this plan</button>
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {explanation && <p className="panel mt-4 max-w-prose p-3 text-sm leading-relaxed">{explanation}</p>}
      </section>

      <section>
        <h2 className="mb-2 font-medium">Sessions for today</h2>
        {today.length === 0 ? (
          <p className="text-sm text-muted">Nothing planned. Add subjects with topics, then generate a plan.</p>
        ) : (
          <ul className="panel divide-y divide-line">
            {today.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                  <input type="checkbox" checked={s.completed} onChange={() => toggle(s.id)} />
                  <span className={`flex-1 ${s.completed ? "text-muted line-through" : ""}`}>
                    {s.topic} <span className="text-sm text-muted">{s.subject}</span>
                  </span>
                  <span className="text-sm text-muted">{s.minutes} min</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium">This week</h2>
        {week.length === 0 ? (
          <p className="text-sm text-muted">No sessions scheduled.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {Object.keys(byDay).sort().map((d) => (
                <div key={d} className="panel w-44 shrink-0 p-2">
                  <div className="mb-2 border-b border-line pb-1 text-sm font-medium">{fmtDay(d)}</div>
                  <ul className="space-y-1.5 text-sm">
                    {byDay[d].map((s) => (
                      <li key={s.id} className={s.completed ? "text-muted line-through" : ""}>
                        {s.topic} <span className="text-muted">{s.minutes}m</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium">Upcoming exams</h2>
        {exams.length === 0 ? (
          <p className="text-sm text-muted">No upcoming exams. Add a subject with an exam date.</p>
        ) : (
          <ul className="panel divide-y divide-line">
            {exams.map((s) => (
              <li key={s.id} className="flex justify-between px-3 py-2.5 text-sm">
                <span>{s.name}</span>
                <span className="text-muted">{fmtDay(s.exam_date)}, {s.left === 0 ? "today" : `in ${s.left} days`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

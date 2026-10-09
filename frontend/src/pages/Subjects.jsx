import { useEffect, useState } from "react";
import { api, fmtDay } from "../api";

const RATINGS = [1, 2, 3, 4, 5];

function Subject({ s, reload, setError }) {
  const [name, setName] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [busy, setBusy] = useState(false);

  const act = async (fn) => {
    setError(""); setBusy(true);
    try { await fn(); await reload(); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const addTopic = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    act(async () => { await api(`/subjects/${s.id}/topics`, { method: "POST", body: { name } }); setName(""); });
  };
  const importSyllabus = () => act(async () => {
    const topics = await api("/ai/breakdown", { method: "POST", body: { subject: s.name, syllabus } });
    for (const t of topics) {
      await api(`/subjects/${s.id}/topics`, { method: "POST", body: { name: t.name, weight: Math.min(5, Math.max(1, t.weight || 1)) } });
    }
    setSyllabus(""); setShowImport(false);
  });
  const patch = (id, body) => act(() => api(`/topics/${id}`, { method: "PATCH", body }));

  return (
    <section className="panel">
      <header className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <div>
          <h2 className="font-medium">{s.name}</h2>
          <p className="text-sm text-muted">Exam on {fmtDay(s.exam_date)}</p>
        </div>
        <button className="btn" onClick={() => confirm(`Delete ${s.name} and its topics?`) && act(() => api(`/subjects/${s.id}`, { method: "DELETE" }))}>
          Delete
        </button>
      </header>

      {s.topics.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr><th className="px-3 py-2 font-normal">Topic</th><th className="px-3 py-2 font-normal">Confidence (1 weak)</th><th className="px-3 py-2 font-normal">Exam weight</th><th className="px-3 py-2 font-normal">Done</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {s.topics.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2">{t.name}</td>
                  <td className="px-3 py-2"><select className="input" value={t.confidence} onChange={(e) => patch(t.id, { confidence: Number(e.target.value) })}>{RATINGS.map((r) => <option key={r}>{r}</option>)}</select></td>
                  <td className="px-3 py-2"><select className="input" value={t.weight} onChange={(e) => patch(t.id, { weight: Number(e.target.value) })}>{RATINGS.map((r) => <option key={r}>{r}</option>)}</select></td>
                  <td className="px-3 py-2"><input type="checkbox" checked={t.done} onChange={(e) => patch(t.id, { done: e.target.checked })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="space-y-3 border-t border-line p-3">
        <form onSubmit={addTopic} className="flex gap-2">
          <input className="input flex-1" placeholder="Topic name, e.g. Laplace transforms" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" disabled={busy}>Add topic</button>
          <button type="button" className="btn" onClick={() => setShowImport(!showImport)}>Import from syllabus</button>
        </form>
        {showImport && (
          <div className="space-y-2">
            <textarea className="input w-full" rows={5} placeholder="Paste the syllabus text. Gemini will split it into topics." value={syllabus} onChange={(e) => setSyllabus(e.target.value)} />
            <button className="btn btn-primary" disabled={busy || !syllabus.trim()} onClick={importSyllabus}>{busy ? "Importing" : "Create topics"}</button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [error, setError] = useState("");

  const reload = async () => setSubjects(await api("/subjects"));
  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  async function addSubject(e) {
    e.preventDefault();
    setError("");
    try { await api("/subjects", { method: "POST", body: { name, exam_date: examDate } }); setName(""); setExamDate(""); await reload(); }
    catch (err) { setError(err.message); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Subjects</h1>
      <form onSubmit={addSubject} className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Subject
          <input className="input ml-2" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm">Exam date
          <input className="input ml-2" type="date" required value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </label>
        <button className="btn btn-primary">Add subject</button>
      </form>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {subjects.length === 0 && <p className="text-sm text-muted">No subjects yet. Add one with its exam date.</p>}
      {subjects.map((s) => <Subject key={s.id} s={s} reload={reload} setError={setError} />)}
    </div>
  );
}

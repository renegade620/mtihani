import React, { useState, useEffect } from "react";
import { apiFetch } from "./api";

type Role = "DIRECTOR" | "TEACHER" | "STUDENT";

function AppLayout({
  user,
  onLogout,
  sidebar,
  children,
  title,
}: {
  user: User;
  onLogout: () => void;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header
        style={{
          background: "var(--mtihani-header-bg)",
          borderBottom: "1px solid var(--mtihani-header-border)",
          padding: "0.75rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem", color: "var(--mtihani-sidebar-active)" }}>
            Mtihani
          </h1>
          {title && (
            <span style={{ color: "#666", fontSize: "0.9rem" }}>/{title}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.9rem", color: "#666" }}>{user.username}</span>
          <span
            style={{
              background: "var(--mtihani-status-approved)",
              color: "#fff",
              padding: "0.2rem 0.5rem",
              borderRadius: 9999,
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            {user.role}
          </span>
          <button onClick={onLogout} style={{ padding: "0.25rem 0.75rem" }}>
            Logout →
          </button>
        </div>
      </header>
      <div style={{ display: "flex", flex: 1 }}>
        <aside
          style={{
            width: 260,
            minWidth: 260,
            background: "var(--mtihani-sidebar-bg)",
            color: "#fff",
            padding: "1rem 0",
          }}
        >
          {sidebar}
        </aside>
        <main
          style={{
            flex: 1,
            padding: "1.5rem",
            background: "#f5f5f5",
            overflow: "auto",
          }}
        >
          <div
            style={{
              background: "var(--mtihani-card-bg)",
              border: "1px solid var(--mtihani-card-border)",
              borderRadius: 6,
              padding: "1.25rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

type User = {
  id: number;
  username: string;
  email: string;
  role: Role;
};

type Worksheet = {
  id: number;
  title: string;
  instructions: string;
  questions: Question[];
};

type Question = {
  id: number;
  prompt: string;
  max_score: string;
};

type AnswerVersion = {
  id: number;
  text: string;
  is_teacher_suggestion: boolean;
  author_username?: string;
};

type Answer = {
  id?: number;
  question: number;
  current_text: string;
  status: "DRAFT" | "SUBMITTED";
  versions?: AnswerVersion[];
};

function StudentHome({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [selectedWorksheetId, setSelectedWorksheetId] = useState<number | null>(
    null
  );
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [worksheetGrades, setWorksheetGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const all = await apiFetch("/api/worksheets/");
        setWorksheets(all);
        if (all.length > 0) setSelectedWorksheetId(all[0].id);
      } catch (e: any) {
        setError(e.message ?? "Failed to load worksheets");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function loadGrades() {
    try {
      const data = await apiFetch("/api/worksheet-grades/");
      setWorksheetGrades(data);
    } catch {
      /* ignore */
    }
  }

  async function loadAnswers() {
    if (!selectedWorksheetId) return;
    try {
      const data = await apiFetch(`/api/answers/?worksheet=${selectedWorksheetId}`);
      const byQuestion: Record<number, Answer> = {};
      for (const a of data) {
        byQuestion[a.question] = a;
      }
      setAnswers(prev => ({ ...prev, ...byQuestion }));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadGrades();
  }, []);

  useEffect(() => {
    loadAnswers();
  }, [selectedWorksheetId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadGrades();
      loadAnswers();
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedWorksheetId]);

  async function handleApplySuggestion(answerId: number, versionId: number) {
    try {
      setLoading(true);
      setError(null);
      const saved = await apiFetch(`/api/answers/${answerId}/apply-suggestion/`, {
        method: "POST",
        body: JSON.stringify({ version_id: versionId }),
      });
      setAnswers(prev => ({ ...prev, [saved.question]: saved }));
    } catch (e: any) {
      setError(e.message ?? "Failed to apply suggestion");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswerChange(q: Question, text: string) {
    setAnswers(prev => ({
      ...prev,
      [q.id]: {
        ...(prev[q.id] || { question: q.id, current_text: "", status: "DRAFT" }),
        current_text: text,
      },
    }));
  }

  async function handleSubmitAnswer(q: Question) {
    const existing = answers[q.id];
    if (!existing || !existing.current_text.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const body: Answer = {
        ...existing,
        question: q.id,
        status: "SUBMITTED",
      };

      let saved: Answer;
      if (existing.id) {
        saved = await apiFetch(`/api/answers/${existing.id}/`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        saved = await apiFetch("/api/answers/", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      setAnswers(prev => ({ ...prev, [q.id]: saved }));
    } catch (e: any) {
      setError(e.message ?? "Failed to submit answer");
    } finally {
      setLoading(false);
    }
  }

  const selectedWorksheet = worksheets.find(w => w.id === selectedWorksheetId) || null;
  const currentWorksheetGrade =
    selectedWorksheet &&
    worksheetGrades.find(g => g.worksheet === selectedWorksheet.id);

  const studentSidebar = (
    <>
      <h3 style={{ margin: "0 1rem 0.75rem", fontSize: "0.85rem", opacity: 0.9 }}>
        Assignments
      </h3>
      {worksheets.map(w => (
        <div
          key={w.id}
          onClick={() => setSelectedWorksheetId(w.id)}
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
            background:
              w.id === selectedWorksheetId
                ? "var(--mtihani-sidebar-active)"
                : "transparent",
          }}
        >
          {w.title}
        </div>
      ))}
    </>
  );

  return (
    <AppLayout user={user} onLogout={onLogout} sidebar={studentSidebar} title="Student">
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {worksheetGrades.length > 0 && (
        <section style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>My Grades</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {worksheetGrades.map((g: any) => (
              <div
                key={g.id}
                style={{
                  padding: "0.75rem 1rem",
                  background: "var(--mtihani-card-bg)",
                  border: "1px solid var(--mtihani-card-border)",
                  borderRadius: 8,
                  minWidth: 180,
                }}
              >
                <strong style={{ display: "block", marginBottom: "0.35rem" }}>{g.worksheet_title ?? `Assignment #${g.worksheet}`}</strong>
                <span style={{ marginRight: "0.5rem" }}>{g.score_total}</span>
                <span
                  style={{
                    padding: "0.15rem 0.5rem",
                    borderRadius: 9999,
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    background: g.status === "PENDING_APPROVAL" ? "#fef3c7" : g.status === "APPROVED" ? "#d1fae5" : "#fee2e2",
                    color: g.status === "PENDING_APPROVAL" ? "var(--mtihani-status-pending)" : g.status === "APPROVED" ? "var(--mtihani-status-approved)" : "var(--mtihani-status-rejected)",
                  }}
                >
                  {g.status === "PENDING_APPROVAL" ? "Pending Approval" : g.status === "APPROVED" ? "Approved" : "Rejected"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      {selectedWorksheet ? (
            <>
              <h2>{selectedWorksheet.title}</h2>
              {selectedWorksheet.instructions && (
                <p>{selectedWorksheet.instructions}</p>
              )}
              {currentWorksheetGrade && (
                <div
                  style={{
                    border: "1px solid var(--mtihani-status-approved)",
                    background: "#ecfdf5",
                    padding: "0.75rem",
                    marginBottom: "0.75rem",
                    borderRadius: 8,
                  }}
                >
                  <strong>Your grade:</strong> {currentWorksheetGrade.score_total}
                  {currentWorksheetGrade.status === "PENDING_APPROVAL" && (
                    <>
                      <span style={{ display: "block", fontSize: "0.9rem", color: "#047857", marginTop: "0.35rem" }}>
                        ⏳ Waiting for Director to approve.
                      </span>
                    </>
                  )}
                  {currentWorksheetGrade.status === "APPROVED" && (
                    <span style={{ display: "inline-block", marginLeft: "0.5rem", padding: "0.15rem 0.5rem", background: "#d1fae5", color: "var(--mtihani-status-approved)", borderRadius: 9999, fontSize: "0.8rem" }}>Approved</span>
                  )}
                  {currentWorksheetGrade.status === "REJECTED" && (
                    <span style={{ display: "inline-block", marginLeft: "0.5rem", padding: "0.15rem 0.5rem", background: "#fee2e2", color: "var(--mtihani-status-rejected)", borderRadius: 9999, fontSize: "0.8rem" }}>Rejected</span>
                  )}
                </div>
              )}
              {selectedWorksheet.questions.map(q => {
                const ans = answers[q.id] || {
                  question: q.id,
                  current_text: "",
                  status: "DRAFT" as const,
                };
                const submitted = ans.status === "SUBMITTED";
                const suggestions = (ans.versions || []).filter(
                  (v: AnswerVersion) => v.is_teacher_suggestion
                );
                return (
                  <div
                    key={q.id}
                    style={{
                      border: "1px solid #ccc",
                      padding: "0.75rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <p>{q.prompt}</p>
                    <textarea
                      style={{
                        width: "100%",
                        minHeight: 80,
                        opacity: submitted ? 0.9 : 1,
                      }}
                      value={ans.current_text}
                      onChange={e => handleAnswerChange(q, e.target.value)}
                      readOnly={submitted}
                    />
                    {!submitted && (
                      <button
                        style={{ marginTop: "0.5rem" }}
                        onClick={() => handleSubmitAnswer(q)}
                      >
                        Submit answer
                      </button>
                    )}
                    {submitted && (
                      <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#666" }}>
                        Submitted
                      </p>
                    )}
                    {suggestions.length > 0 && (
                      <div style={{ marginTop: "0.75rem", borderTop: "1px solid #ddd", paddingTop: "0.5rem" }}>
                        <strong>Teacher suggestions:</strong>
                        {suggestions.map((v: AnswerVersion) => (
                          <div key={v.id} style={{ marginTop: "0.25rem" }}>
                            <pre
                              style={{
                                background: "#fff8e1",
                                padding: "0.5rem",
                                fontSize: "0.9rem",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {v.text}
                            </pre>
                            <button
                              style={{ marginTop: "0.25rem", fontSize: "0.85rem" }}
                              onClick={() => ans.id && handleApplySuggestion(ans.id, v.id)}
                            >
                              Apply suggestion
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
      ) : (
        <p>Select an assignment to begin.</p>
      )}
    </AppLayout>
  );
}

function TeacherHome({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [selectedWorksheetId, setSelectedWorksheetId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [suggestText, setSuggestText] = useState<Record<number, string>>({});
  const [gradeScore, setGradeScore] = useState<Record<number, string>>({});
  const [gradeFeedback, setGradeFeedback] = useState<Record<number, string>>({});
  const [newQuestionPrompt, setNewQuestionPrompt] = useState("");
  const [newQuestionMaxScore, setNewQuestionMaxScore] = useState("");
  const [worksheetTotalScore, setWorksheetTotalScore] = useState<Record<number, string>>({});
  const [worksheetGrades, setWorksheetGrades] = useState<any[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editQuestionPrompt, setEditQuestionPrompt] = useState("");
  const [editQuestionMaxScore, setEditQuestionMaxScore] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const ws = await apiFetch("/api/worksheets/");
        setWorksheets(ws);
        if (ws.length > 0) setSelectedWorksheetId(ws[0].id);
      } catch (e: any) {
        setError(e.message ?? "Failed to load worksheets");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedWorksheetId) return;

    let cancelled = false;

    async function loadAnswersOnce() {
      try {
        setError(null);
        const data = await apiFetch<any[]>(`/api/answers/?worksheet=${selectedWorksheetId}`);
        if (cancelled) return;
        setAnswers(data);
        const scoreByAnswer: Record<number, string> = {};
        const feedbackByAnswer: Record<number, string> = {};
        for (const a of data) {
          if (a.grade_summary) {
            scoreByAnswer[a.id] = a.grade_summary.score ?? "";
            feedbackByAnswer[a.id] = a.grade_summary.feedback ?? "";
          }
        }
        setGradeScore(prev => ({ ...prev, ...scoreByAnswer }));
        setGradeFeedback(prev => ({ ...prev, ...feedbackByAnswer }));
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load answers");
      }
    }

    // initial load
    loadAnswersOnce();
    // poll every 15s for near real-time updates
    const intervalId = window.setInterval(loadAnswersOnce, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedWorksheetId]);

  useEffect(() => {
    if (!selectedWorksheetId) return;

    let cancelled = false;

    async function loadGradesOnce() {
      try {
        const data = await apiFetch<any[]>("/api/worksheet-grades/");
        if (cancelled) return;
        setWorksheetGrades(data.filter((g: any) => g.worksheet === selectedWorksheetId));
      } catch {
        if (!cancelled) setWorksheetGrades([]);
      }
    }

    loadGradesOnce();
    const intervalId = window.setInterval(loadGradesOnce, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedWorksheetId]);

  const selectedWorksheet =
    worksheets.find(w => w.id === selectedWorksheetId) || null;

  async function handleSuggest(answerId: number) {
    const text = suggestText[answerId];
    if (!text || !text.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await apiFetch(`/api/answers/${answerId}/suggest/`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setSuggestText(prev => ({ ...prev, [answerId]: "" }));
    } catch (e: any) {
      setError(e.message ?? "Failed to send suggestion");
    } finally {
      setLoading(false);
    }
  }

  async function handleGrade(answerId: number) {
    const scoreStr = gradeScore[answerId];
    if (!scoreStr) return;
    const score = parseFloat(scoreStr);
    if (Number.isNaN(score)) return;

    try {
      setLoading(true);
      setError(null);
      await apiFetch("/api/answer-grades/", {
        method: "POST",
        body: JSON.stringify({
          answer: answerId,
          score,
          feedback: gradeFeedback[answerId] || "",
          is_final_for_answer: true,
        }),
      });
    } catch (e: any) {
      setError(e.message ?? "Failed to save grade");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWorksheetId || !newQuestionPrompt.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await apiFetch("/api/questions/", {
        method: "POST",
        body: JSON.stringify({
          worksheet: selectedWorksheetId,
          prompt: newQuestionPrompt,
          max_score: parseFloat(newQuestionMaxScore || "0"),
          order_index: selectedWorksheet
            ? selectedWorksheet.questions.length
            : 0,
        }),
      });
      setNewQuestionPrompt("");
      setNewQuestionMaxScore("");
      // reload worksheets to get updated questions
      const ws = await apiFetch("/api/worksheets/");
      setWorksheets(ws);
    } catch (e: any) {
      setError(e.message ?? "Failed to create question");
    } finally {
      setLoading(false);
    }
  }

  async function handleWorksheetGrade(studentId: number) {
    if (!selectedWorksheetId) return;
    const totalStr = worksheetTotalScore[studentId];
    if (!totalStr) return;
    const score_total = parseFloat(totalStr);
    if (Number.isNaN(score_total)) return;

    try {
      setLoading(true);
      setError(null);
      await apiFetch("/api/worksheet-grades/", {
        method: "POST",
        body: JSON.stringify({
          worksheet: selectedWorksheetId,
          student: studentId,
          score_total,
        }),
      });
      const data = await apiFetch("/api/worksheet-grades/");
      setWorksheetGrades(data.filter((g: any) => g.worksheet === selectedWorksheetId));
    } catch (e: any) {
      setError(e.message ?? "Failed to save worksheet grade");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateQuestion(id: number) {
    try {
      setLoading(true);
      setError(null);
      await apiFetch(`/api/questions/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          prompt: editQuestionPrompt.trim() || undefined,
          max_score: editQuestionMaxScore !== "" ? parseFloat(editQuestionMaxScore) : undefined,
        }),
      });
      setEditingQuestionId(null);
      const ws = await apiFetch("/api/worksheets/");
      setWorksheets(ws);
    } catch (e: any) {
      setError(e.message ?? "Failed to update question");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteQuestion(id: number) {
    if (!window.confirm("Delete this question? Answers to it will be affected.")) return;
    try {
      setLoading(true);
      setError(null);
      await apiFetch(`/api/questions/${id}/`, { method: "DELETE" });
      setEditingQuestionId(null);
      const ws = await apiFetch("/api/worksheets/");
      setWorksheets(ws);
    } catch (e: any) {
      setError(e.message ?? "Failed to delete question");
    } finally {
      setLoading(false);
    }
  }

  function getWorksheetGradeStatusForStudent(studentId: number): string | null {
    const g = worksheetGrades.find((x: any) => x.student === studentId);
    return g ? g.status : null;
  }

  const teacherSidebar = (
    <>
      <h3 style={{ margin: "0 1rem 0.75rem", fontSize: "0.85rem", opacity: 0.9 }}>
        Assignments
      </h3>
      {worksheets.map(w => (
        <div
          key={w.id}
          onClick={() => setSelectedWorksheetId(w.id)}
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
            background:
              w.id === selectedWorksheetId
                ? "var(--mtihani-sidebar-active)"
                : "transparent",
          }}
        >
          {w.title}
        </div>
      ))}
    </>
  );

  return (
    <AppLayout user={user} onLogout={onLogout} sidebar={teacherSidebar} title="Teacher">
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {selectedWorksheet && (
            <section style={{ marginBottom: "1.5rem" }}>
              <h2>Questions in this assignment</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {selectedWorksheet.questions.map((q: any) => (
                  <li key={q.id} style={{ marginBottom: "0.5rem", padding: "0.5rem", background: "#f8f9fa", borderRadius: 6 }}>
                    {editingQuestionId === q.id ? (
                      <div>
                        <input value={editQuestionPrompt} onChange={e => setEditQuestionPrompt(e.target.value)} placeholder="Question prompt" style={{ width: "100%", marginBottom: "0.25rem" }} />
                        <input type="number" step="0.5" value={editQuestionMaxScore} onChange={e => setEditQuestionMaxScore(e.target.value)} placeholder="Max" style={{ width: "6rem", marginRight: "0.5rem" }} />
                        <button type="button" onClick={() => handleUpdateQuestion(q.id)}>Save</button>
                        <button type="button" onClick={() => setEditingQuestionId(null)}>Cancel</button>
                        <button type="button" onClick={() => handleDeleteQuestion(q.id)} style={{ color: "var(--mtihani-btn-reject)" }}>Delete</button>
                      </div>
                    ) : (
                      <>
                        {q.prompt} <span style={{ color: "#64748b" }}>(Max: {q.max_score})</span>
                        <div style={{ marginTop: "0.25rem" }}>
                          <button type="button" onClick={() => { setEditingQuestionId(q.id); setEditQuestionPrompt(q.prompt); setEditQuestionMaxScore(String(q.max_score)); }} style={{ fontSize: "0.8rem" }}>Edit</button>
                          <button type="button" onClick={() => handleDeleteQuestion(q.id)} style={{ fontSize: "0.8rem", marginLeft: "0.25rem", color: "var(--mtihani-btn-reject)" }}>Delete</button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <form onSubmit={handleCreateQuestion} style={{ marginTop: "0.75rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Question prompt</label>
                <textarea
                  placeholder="Question prompt"
                  value={newQuestionPrompt}
                  onChange={e => setNewQuestionPrompt(e.target.value)}
                  style={{ width: "100%", minHeight: 60, marginBottom: "0.5rem" }}
                />
                <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Max</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="10"
                  value={newQuestionMaxScore}
                  onChange={e => setNewQuestionMaxScore(e.target.value)}
                  style={{ width: "6rem", marginRight: "0.5rem" }}
                />
                <button type="submit" style={{ background: "var(--mtihani-status-approved)", color: "#fff", border: "none", padding: "0.35rem 0.6rem", borderRadius: 6 }}>+ Add</button>
              </form>
            </section>
          )}

          <h2>Submissions</h2>
          {answers.length === 0 && <p>No submissions yet for this assignment.</p>}
          {(() => {
            const byStudent = new Map<number, { username: string; answers: any[] }>();
            for (const a of answers) {
              const id = a.student;
              if (!byStudent.has(id)) byStudent.set(id, { username: String(a.student_username ?? id), answers: [] });
              byStudent.get(id)!.answers.push(a);
            }
            return Array.from(byStudent.entries()).map(([studentId, { username, answers: studentAnswers }]) => (
              <section
                key={studentId}
                style={{
                  border: "1px solid var(--mtihani-card-border)",
                  borderRadius: 8,
                  padding: "1rem",
                  marginBottom: "1.25rem",
                  background: "var(--mtihani-card-bg)",
                }}
              >
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>{username}</h3>
                {studentAnswers.map((a: any) => (
                  <div
                    key={a.id}
                    style={{
                      border: "1px solid #ddd",
                      padding: "0.75rem",
                      marginBottom: "0.75rem",
                      borderRadius: 6,
                    }}
                  >
                    <p style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", color: "#64748b" }}>
                      {selectedWorksheet?.questions.find((q: any) => q.id === a.question)?.prompt ?? `Question #${a.question}`}
                    </p>
                    <pre
                      style={{
                        background: "#f7f7f7",
                        padding: "0.5rem",
                        whiteSpace: "pre-wrap",
                        margin: "0.5rem 0 0",
                        fontSize: "0.9rem",
                      }}
                    >
                      {a.current_text}
                    </pre>
                    <label style={{ display: "block", marginTop: "0.5rem", fontSize: "0.85rem" }}>Suggestion for student...</label>
                    <textarea
                      placeholder="Suggestion for student..."
                      style={{ width: "100%", minHeight: 50, marginTop: "0.25rem" }}
                      value={suggestText[a.id] || ""}
                      onChange={e =>
                        setSuggestText(prev => ({ ...prev, [a.id]: e.target.value }))
                      }
                    />
                    <button
                      style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}
                      onClick={() => handleSuggest(a.id)}
                    >
                      Suggest
                    </button>
                    <div style={{ marginTop: "0.75rem" }}>
                      <span style={{ fontSize: "0.85rem" }}>Grade: </span>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Score"
                        value={gradeScore[a.id] || ""}
                        onChange={e =>
                          setGradeScore(prev => ({ ...prev, [a.id]: e.target.value }))
                        }
                        style={{ width: "5rem", marginRight: "0.5rem" }}
                      />
                      <input
                        placeholder="Feedback"
                        value={gradeFeedback[a.id] || ""}
                        onChange={e =>
                          setGradeFeedback(prev => ({ ...prev, [a.id]: e.target.value }))
                        }
                        style={{ flex: 1, minWidth: "8rem", marginRight: "0.5rem" }}
                      />
                      <button onClick={() => handleGrade(a.id)}>Save</button>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px dashed #ccc" }}>
                  <strong>Final Assignment Grade: </strong>
                  {getWorksheetGradeStatusForStudent(studentId) === "APPROVED" ? (
                    <span style={{ marginLeft: "0.5rem", padding: "0.2rem 0.5rem", background: "#d1fae5", color: "var(--mtihani-status-approved)", borderRadius: 9999, fontSize: "0.85rem" }}>Approved</span>
                  ) : (
                    <>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Total score"
                        value={worksheetTotalScore[studentId] || ""}
                        onChange={e =>
                          setWorksheetTotalScore(prev => ({ ...prev, [studentId]: e.target.value }))
                        }
                        style={{ width: "7rem", marginLeft: "0.5rem", marginRight: "0.5rem" }}
                      />
                      <button onClick={() => handleWorksheetGrade(studentId)} style={{ background: "var(--mtihani-status-approved)", color: "#fff", border: "none", padding: "0.35rem 0.6rem", borderRadius: 6 }}>Save Final Grade</button>
                    </>
                  )}
                </div>
              </section>
            ));
          })()}
    </AppLayout>
  );
}

type DirectorTab = "grades" | "assignments";

function DirectorHome({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [directorTab, setDirectorTab] = useState<DirectorTab>("grades");
  const [grades, setGrades] = useState<any[]>([]);
  const [workbooks, setWorkbooks] = useState<any[]>([]);
  const [selectedWorkbookId, setSelectedWorkbookId] = useState<number | null>(null);

  const [newWorkbookTitle, setNewWorkbookTitle] = useState("");
  const [newWorkbookDescription, setNewWorkbookDescription] = useState("");
  const [newWorksheetTitle, setNewWorksheetTitle] = useState("");
  const [newWorksheetInstructions, setNewWorksheetInstructions] = useState("");
  const [editingWorkbookId, setEditingWorkbookId] = useState<number | null>(null);
  const [editingWorksheetId, setEditingWorksheetId] = useState<number | null>(null);
  const [editWorkbookTitle, setEditWorkbookTitle] = useState("");
  const [editWorkbookDescription, setEditWorkbookDescription] = useState("");
  const [editWorksheetTitle, setEditWorksheetTitle] = useState("");
  const [editWorksheetInstructions, setEditWorksheetInstructions] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadGrades() {
    const data = await apiFetch("/api/worksheet-grades/");
    setGrades(data);
  }

  async function loadWorkbooks() {
    const data = await apiFetch("/api/workbooks/");
    setWorkbooks(data);
    if (!selectedWorkbookId && data.length > 0) {
      setSelectedWorkbookId(data[0].id);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([loadGrades(), loadWorkbooks()]);
      } catch (e: any) {
        setError(e.message ?? "Failed to load director data");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Near real-time updates for grades tab
  useEffect(() => {
    if (directorTab !== "grades") return;

    let cancelled = false;

    async function tick() {
      try {
        await loadGrades();
      } catch (e) {
        if (!cancelled) {
          // swallow for now; initial load effect already surfaces errors
        }
      }
    }

    tick();
    const intervalId = window.setInterval(tick, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [directorTab]);

  async function handleApprove(id: number, statusValue: "APPROVED" | "REJECTED") {
    try {
      setLoading(true);
      setError(null);
      await apiFetch(`/api/worksheet-grades/${id}/approve/`, {
        method: "POST",
        body: JSON.stringify({ status: statusValue, comment: "" }),
      });
      await loadGrades();
    } catch (e: any) {
      setError(e.message ?? "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWorkbook(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorkbookTitle.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await apiFetch("/api/workbooks/", {
        method: "POST",
        body: JSON.stringify({ title: newWorkbookTitle, description: newWorkbookDescription }),
      });
      setNewWorkbookTitle("");
      setNewWorkbookDescription("");
      await loadWorkbooks();
    } catch (e: any) {
      setError(e.message ?? "Failed to create workbook");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWorksheet(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWorkbookId || !newWorksheetTitle.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await apiFetch("/api/worksheets/", {
        method: "POST",
        body: JSON.stringify({
          workbook: selectedWorkbookId,
          title: newWorksheetTitle,
          instructions: newWorksheetInstructions,
          order_index: 0,
          published: false,
        }),
      });
      setNewWorksheetTitle("");
      setNewWorksheetInstructions("");
      await loadWorkbooks();
    } catch (e: any) {
      setError(e.message ?? "Failed to create worksheet");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateWorkbook(id: number) {
    try {
      setLoading(true);
      setError(null);
      await apiFetch(`/api/workbooks/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ title: editWorkbookTitle.trim() || undefined, description: editWorkbookDescription }),
      });
      setEditingWorkbookId(null);
      await loadWorkbooks();
    } catch (e: any) {
      setError(e.message ?? "Failed to update workbook");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateWorksheet(id: number) {
    try {
      setLoading(true);
      setError(null);
      await apiFetch(`/api/worksheets/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ title: editWorksheetTitle.trim() || undefined, instructions: editWorksheetInstructions }),
      });
      setEditingWorksheetId(null);
      await loadWorkbooks();
    } catch (e: any) {
      setError(e.message ?? "Failed to update assignment");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteWorkbook(id: number) {
    if (!window.confirm("Delete this workbook and all its assignments?")) return;
    try {
      setLoading(true);
      setError(null);
      await apiFetch(`/api/workbooks/${id}/`, { method: "DELETE" });
      if (selectedWorkbookId === id) setSelectedWorkbookId(workbooks.find((w: any) => w.id !== id)?.id ?? null);
      await loadWorkbooks();
    } catch (e: any) {
      setError(e.message ?? "Failed to delete workbook");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteWorksheet(id: number) {
    if (!window.confirm("Delete this assignment and all its questions and answers?")) return;
    try {
      setLoading(true);
      setError(null);
      await apiFetch(`/api/worksheets/${id}/`, { method: "DELETE" });
      await loadWorkbooks();
    } catch (e: any) {
      setError(e.message ?? "Failed to delete assignment");
    } finally {
      setLoading(false);
    }
  }

  function startEditWorkbook(w: { id: number; title: string; description?: string }) {
    setEditingWorkbookId(w.id);
    setEditWorkbookTitle(w.title);
    setEditWorkbookDescription(w.description ?? "");
  }

  function startEditWorksheet(ws: { id: number; title: string; instructions?: string }) {
    setEditingWorksheetId(ws.id);
    setEditWorksheetTitle(ws.title);
    setEditWorksheetInstructions(ws.instructions ?? "");
  }

  const selectedWorkbook = workbooks.find((w: any) => w.id === selectedWorkbookId) || null;

  const directorSidebar = (
    <>
      <h3 style={{ margin: "0 1rem 0.75rem", fontSize: "0.85rem", opacity: 0.9 }}>Director</h3>
      <div style={{ padding: "0 1rem 0.5rem", display: "flex", gap: "0.25rem" }}>
        <button
          type="button"
          onClick={() => setDirectorTab("grades")}
          style={{
            flex: 1,
            padding: "0.35rem 0.5rem",
            fontSize: "0.8rem",
            background: directorTab === "grades" ? "var(--mtihani-sidebar-active)" : "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 4,
            color: "inherit",
            cursor: "pointer",
          }}
        >
          Grades to approve
        </button>
        <button
          type="button"
          onClick={() => setDirectorTab("assignments")}
          style={{
            flex: 1,
            padding: "0.35rem 0.5rem",
            fontSize: "0.8rem",
            background: directorTab === "assignments" ? "var(--mtihani-sidebar-active)" : "transparent",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 4,
            color: "inherit",
            cursor: "pointer",
          }}
        >
          Assignments
        </button>
      </div>
    </>
  );

  async function handleReopen(gradeId: number) {
    try {
      setLoading(true);
      setError(null);
      await apiFetch(`/api/worksheet-grades/${gradeId}/reopen/`, { method: "POST" });
      await loadGrades();
    } catch (e: any) {
      setError(e.message ?? "Failed to reopen");
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePublish(worksheetId: number, currentlyPublished: boolean) {
    try {
      setLoading(true);
      setError(null);
      await apiFetch(`/api/worksheets/${worksheetId}/`, {
        method: "PATCH",
        body: JSON.stringify({ published: !currentlyPublished }),
      });
      await loadWorkbooks();
    } catch (e: any) {
      setError(e.message ?? "Failed to update publish status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout user={user} onLogout={onLogout} sidebar={directorSidebar} title="Director">
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {directorTab === "grades" && (
        <>
          <h2>Grades to approve</h2>
          {grades.length === 0 && !loading && (
            <p style={{ color: "#64748b" }}>No grades to approve yet. Teachers set final grades from the Teacher view.</p>
          )}
          {grades.map(g => (
            <div
              key={g.id}
              style={{
                border: "1px solid var(--mtihani-card-border)",
                borderRadius: 8,
                padding: "1rem",
                marginBottom: "0.75rem",
                background: g.status === "PENDING_APPROVAL" ? "#fffbeb" : "#fff",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>Assignment:</strong> {g.worksheet_title ?? `#${g.worksheet}`}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Student:</strong> {g.student_username ?? g.student}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Score:</strong> {g.score_total}
              </p>
              <span
                style={{
                  padding: "0.2rem 0.6rem",
                  borderRadius: 9999,
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  background:
                    g.status === "PENDING_APPROVAL"
                      ? "#fef3c7"
                      : g.status === "APPROVED"
                        ? "#d1fae5"
                        : "#fee2e2",
                  color:
                    g.status === "PENDING_APPROVAL"
                      ? "var(--mtihani-status-pending)"
                      : g.status === "APPROVED"
                        ? "var(--mtihani-status-approved)"
                        : "var(--mtihani-status-rejected)",
                }}
              >
                {g.status === "PENDING_APPROVAL" ? "Pending" : g.status === "APPROVED" ? "Approved" : "Rejected"}
              </span>
              <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
                {g.status === "PENDING_APPROVAL" && (
                  <>
                    <button
                      onClick={() => handleApprove(g.id, "APPROVED")}
                      style={{ background: "var(--mtihani-btn-approve)", color: "#fff", border: "none", padding: "0.35rem 0.75rem", borderRadius: 6 }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleApprove(g.id, "REJECTED")}
                      style={{ background: "var(--mtihani-btn-reject)", color: "#fff", border: "none", padding: "0.35rem 0.75rem", borderRadius: 6 }}
                    >
                      ✕ Reject
                    </button>
                  </>
                )}
                {(g.status === "APPROVED" || g.status === "REJECTED") && (
                  <button
                    onClick={() => handleReopen(g.id)}
                    style={{ background: "var(--mtihani-btn-reopen)", color: "#fff", border: "none", padding: "0.35rem 0.75rem", borderRadius: 6 }}
                  >
                    ↻ Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
      {directorTab === "assignments" && (
        <div>
          <h2>Assignments</h2>
          <section style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Create Workbook</h3>
            <form onSubmit={handleCreateWorkbook} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 400 }}>
              <input
                placeholder="Workbook title"
                value={newWorkbookTitle}
                onChange={e => setNewWorkbookTitle(e.target.value)}
                style={{ padding: "0.4rem 0.5rem" }}
              />
              <input
                placeholder="Description (optional)"
                value={newWorkbookDescription}
                onChange={e => setNewWorkbookDescription(e.target.value)}
                style={{ padding: "0.4rem 0.5rem" }}
              />
              <button type="submit" style={{ background: "var(--mtihani-status-approved)", color: "#fff", border: "none", padding: "0.4rem 0.75rem", borderRadius: 6, alignSelf: "flex-start" }}>
                + Add
              </button>
            </form>
          </section>
          {workbooks.length > 0 && (
            <section style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Workbooks</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                {workbooks.map((w: any) => (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWorkbookId(w.id)}
                    style={{
                      border: selectedWorkbookId === w.id ? "2px solid var(--mtihani-status-approved)" : "1px solid var(--mtihani-card-border)",
                      borderRadius: 8,
                      padding: "1rem",
                      minWidth: 180,
                      maxWidth: 260,
                      cursor: "pointer",
                      background: "var(--mtihani-card-bg)",
                    }}
                  >
                    {editingWorkbookId === w.id ? (
                      <div onClick={e => e.stopPropagation()}>
                        <input
                          value={editWorkbookTitle}
                          onChange={e => setEditWorkbookTitle(e.target.value)}
                          placeholder="Title"
                          style={{ width: "100%", marginBottom: "0.5rem" }}
                        />
                        <textarea
                          value={editWorkbookDescription}
                          onChange={e => setEditWorkbookDescription(e.target.value)}
                          placeholder="Description"
                          style={{ width: "100%", minHeight: 60, marginBottom: "0.5rem" }}
                        />
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button type="button" onClick={() => handleUpdateWorkbook(w.id)}>Save</button>
                          <button type="button" onClick={() => setEditingWorkbookId(null)}>Cancel</button>
                          <button type="button" onClick={() => handleDeleteWorkbook(w.id)} style={{ color: "var(--mtihani-btn-reject)" }}>Delete</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <strong>{w.title}</strong>
                        {w.description && <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem", color: "#64748b" }}>{w.description}</p>}
                        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.25rem" }}>
                          <button type="button" onClick={e => { e.stopPropagation(); startEditWorkbook(w); }} style={{ fontSize: "0.8rem" }}>Edit</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
          {selectedWorkbook && (
            <>
              <section style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Create Assignment</h3>
                <form onSubmit={handleCreateWorksheet} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <input
                    placeholder="Assignment title"
                    value={newWorksheetTitle}
                    onChange={e => setNewWorksheetTitle(e.target.value)}
                    style={{ minWidth: 200, padding: "0.4rem 0.5rem" }}
                  />
                  <button type="submit" style={{ background: "var(--mtihani-status-approved)", color: "#fff", border: "none", padding: "0.4rem 0.75rem", borderRadius: 6 }}>
                    + Add
                  </button>
                </form>
              </section>
              <section>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Assignments in "{selectedWorkbook.title}"</h3>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {selectedWorkbook.worksheets.map((ws: any) => (
                    <li key={ws.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      {editingWorksheetId === ws.id ? (
                        <>
                          <input value={editWorksheetTitle} onChange={e => setEditWorksheetTitle(e.target.value)} placeholder="Title" style={{ flex: 1, minWidth: 120 }} />
                          <textarea value={editWorksheetInstructions} onChange={e => setEditWorksheetInstructions(e.target.value)} placeholder="Instructions" style={{ flex: 1, minWidth: 180, minHeight: 40 }} />
                          <button type="button" onClick={() => handleUpdateWorksheet(ws.id)}>Save</button>
                          <button type="button" onClick={() => setEditingWorksheetId(null)}>Cancel</button>
                          <button type="button" onClick={() => handleDeleteWorksheet(ws.id)} style={{ color: "var(--mtihani-btn-reject)" }}>Delete</button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1 }}>{ws.title} {ws.published ? "(published)" : "(draft)"}</span>
                          <button type="button" onClick={e => { e.preventDefault(); handleTogglePublish(ws.id, ws.published); }} style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", background: ws.published ? "var(--mtihani-btn-reject)" : "var(--mtihani-status-approved)", color: "#fff", border: "none", borderRadius: 4 }}>
                            {ws.published ? "Unpublish" : "Publish"}
                          </button>
                          <button type="button" onClick={() => startEditWorksheet(ws)} style={{ fontSize: "0.8rem" }}>Edit</button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    apiFetch("/api/auth/me/")
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
      });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const data = await apiFetch("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem("token", data.token);
      const me = await apiFetch("/api/auth/me/");
      setUser(me);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch("/api/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          email: "",
          role,
          organization: null,
        }),
      });
      await handleLogin(e);
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
    setUsername("");
    setPassword("");
    setMode("login");
  }

  if (!user) {
    const isLogin = mode === "login";
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #f5f9fc 0%, #e5edf5 100%)",
          padding: "1rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
            padding: "2rem",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                margin: "0 auto 0.75rem",
                background: "rgba(0,119,182,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "1.75rem" }}>📘</span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.7rem",
                color: "#0077b6",
                letterSpacing: "-0.03em",
              }}
            >
              Mtihani
            </h1>
            <p
              style={{
                margin: "0.35rem 0 0",
                fontSize: "0.9rem",
                color: "#64748b",
              }}
            >
              Sign in or create an account
            </p>
          </div>

          <div
            style={{
              display: "flex",
              background: "#f1f5f9",
              padding: 4,
              borderRadius: 999,
              marginBottom: "1.5rem",
            }}
          >
            <button
              type="button"
              onClick={() => setMode("login")}
              style={{
                flex: 1,
                padding: "0.4rem 0.75rem",
                borderRadius: 999,
                border: "1px solid transparent",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 600,
                background: isLogin ? "#0077b6" : "transparent",
                color: isLogin ? "#fff" : "#475569",
                boxShadow: "none",
                transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              style={{
                flex: 1,
                padding: "0.4rem 0.75rem",
                borderRadius: 999,
                border: "1px solid transparent",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 600,
                background: !isLogin ? "#0077b6" : "transparent",
                color: !isLogin ? "#fff" : "#475569",
                boxShadow: "none",
                transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={isLogin ? handleLogin : handleRegister}>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "#334155",
                  marginBottom: "0.35rem",
                }}
              >
                Username
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
                placeholder="Your username"
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "#334155",
                  marginBottom: "0.35rem",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
                placeholder="••••••••"
              />
            </div>
            {!isLogin && (
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    color: "#334155",
                    marginBottom: "0.35rem",
                  }}
                >
                  Role
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as Role)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: "1rem",
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="DIRECTOR">Director</option>
                </select>
              </div>
            )}
            {error && (
              <p
                style={{
                  margin: "0 0 0.75rem",
                  fontSize: "0.85rem",
                  color: "#dc2626",
                  background: "#fef2f2",
                  padding: "0.5rem 0.75rem",
                  borderRadius: 6,
                }}
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                marginTop: "0.25rem",
                background: "#0077b6",
                color: "#fff",
                border: "none",
                borderRadius: 999,
                fontSize: "0.98rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,119,182,0.35)",
              }}
            >
              {isLogin ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (user.role === "STUDENT") {
    return <StudentHome user={user} onLogout={handleLogout} />;
  }
  if (user.role === "TEACHER") {
    return <TeacherHome user={user} onLogout={handleLogout} />;
  }
  if (user.role === "DIRECTOR") {
    return <DirectorHome user={user} onLogout={handleLogout} />;
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Mtihani</h1>
      <p>Logged in as {user.username} (no app role assigned).</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default App;
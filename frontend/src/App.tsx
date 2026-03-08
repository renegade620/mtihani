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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.9rem", color: "#666" }}>{user.username}</span>
          <button onClick={onLogout} style={{ padding: "0.25rem 0.75rem" }}>
            Logout
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
        Worksheets
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
      {selectedWorksheet ? (
            <>
              <h2>{selectedWorksheet.title}</h2>
              {selectedWorksheet.instructions && (
                <p>{selectedWorksheet.instructions}</p>
              )}
              {currentWorksheetGrade && (
                <div
                  style={{
                    border: "1px solid #4caf50",
                    background: "#e8f5e9",
                    padding: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <strong>Your grade:</strong> {currentWorksheetGrade.score_total}{" "}
                  ({currentWorksheetGrade.status})
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
        <p>Select a worksheet to begin.</p>
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
    async function loadAnswers() {
      if (!selectedWorksheetId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch(`/api/answers/?worksheet=${selectedWorksheetId}`);
        setAnswers(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load answers");
      } finally {
        setLoading(false);
      }
    }
    loadAnswers();
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
    } catch (e: any) {
      setError(e.message ?? "Failed to save worksheet grade");
    } finally {
      setLoading(false);
    }
  }

  const teacherSidebar = (
    <>
      <h3 style={{ margin: "0 1rem 0.75rem", fontSize: "0.85rem", opacity: 0.9 }}>
        Worksheets
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
              <h2>Questions in this worksheet</h2>
              <ul>
                {selectedWorksheet.questions.map(q => (
                  <li key={q.id}>
                    {q.prompt} (max {q.max_score})
                  </li>
                ))}
              </ul>
              <form onSubmit={handleCreateQuestion} style={{ marginTop: "0.5rem" }}>
                <textarea
                  placeholder="New question prompt"
                  value={newQuestionPrompt}
                  onChange={e => setNewQuestionPrompt(e.target.value)}
                  style={{ width: "100%", minHeight: 60 }}
                />
                <input
                  type="number"
                  step="0.5"
                  placeholder="Max score (optional)"
                  value={newQuestionMaxScore}
                  onChange={e => setNewQuestionMaxScore(e.target.value)}
                  style={{ marginTop: "0.5rem" }}
                />
                <button type="submit" style={{ marginTop: "0.5rem" }}>
                  Add question
                </button>
              </form>
            </section>
          )}

          <h2>Student Answers</h2>
          {answers.map(a => (
            <div
              key={a.id}
              style={{
                border: "1px solid #ccc",
                padding: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <p>
                <strong>Student:</strong> {a.student}
              </p>
              <p>
                <strong>Current answer:</strong>
              </p>
              <pre
                style={{
                  background: "#f7f7f7",
                  padding: "0.5rem",
                  whiteSpace: "pre-wrap",
                }}
              >
                {a.current_text}
              </pre>

              <label>Suggestion</label>
              <textarea
                style={{ width: "100%", minHeight: 60 }}
                value={suggestText[a.id] || ""}
                onChange={e =>
                  setSuggestText(prev => ({ ...prev, [a.id]: e.target.value }))
                }
              />
              <button
                style={{ marginTop: "0.5rem" }}
                onClick={() => handleSuggest(a.id)}
              >
                Send suggestion
              </button>
              <div style={{ marginTop: "0.75rem" }}>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Grade</h3>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Score"
                    value={gradeScore[a.id] || ""}
                    onChange={e =>
                      setGradeScore(prev => ({ ...prev, [a.id]: e.target.value }))
                    }
                    style={{ width: "6rem" }}
                  />
                  <input
                    placeholder="Feedback"
                    value={gradeFeedback[a.id] || ""}
                    onChange={e =>
                      setGradeFeedback(prev => ({
                        ...prev,
                        [a.id]: e.target.value,
                      }))
                    }
                    style={{ flex: 1 }}
                  />
                  <button onClick={() => handleGrade(a.id)}>Save</button>
                </div>
              </div>
            </div>
          ))}
          {answers.length === 0 && <p>No answers yet for this worksheet.</p>}

          {answers.length > 0 && (
            <section style={{ marginTop: "1.5rem" }}>
              <h2>Final worksheet grades</h2>
              {Array.from(new Set(answers.map(a => a.student))).map(studentId => (
                <div
                  key={studentId}
                  style={{
                    border: "1px dashed #aaa",
                    padding: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <strong>Student {studentId}</strong>
                  <div
                    style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}
                  >
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Total score"
                      value={worksheetTotalScore[studentId] || ""}
                      onChange={e =>
                        setWorksheetTotalScore(prev => ({
                          ...prev,
                          [studentId]: e.target.value,
                        }))
                      }
                      style={{ width: "7rem" }}
                    />
                    <button onClick={() => handleWorksheetGrade(studentId)}>
                      Save final grade
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
    </AppLayout>
  );
}

function DirectorHome({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [grades, setGrades] = useState<any[]>([]);
  const [workbooks, setWorkbooks] = useState<any[]>([]);
  const [selectedWorkbookId, setSelectedWorkbookId] = useState<number | null>(null);

  const [newWorkbookTitle, setNewWorkbookTitle] = useState("");
  const [newWorksheetTitle, setNewWorksheetTitle] = useState("");
  const [newWorksheetInstructions, setNewWorksheetInstructions] = useState("");

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
        body: JSON.stringify({ title: newWorkbookTitle, description: "" }),
      });
      setNewWorkbookTitle("");
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

  const selectedWorkbook = workbooks.find((w: any) => w.id === selectedWorkbookId) || null;

  const directorSidebar = (
    <>
      <h3 style={{ margin: "0 1rem 0.75rem", fontSize: "0.85rem", opacity: 0.9 }}>
        Workbooks
      </h3>
      <form onSubmit={handleCreateWorkbook} style={{ padding: "0 1rem" }}>
        <input
          placeholder="New workbook"
          value={newWorkbookTitle}
          onChange={e => setNewWorkbookTitle(e.target.value)}
          style={{ width: "100%" }}
        />
        <button type="submit" style={{ marginTop: "0.5rem" }}>
          Create
        </button>
      </form>
      <div style={{ marginTop: "0.75rem" }}>
        {workbooks.map((w: any) => (
          <div
            key={w.id}
            onClick={() => setSelectedWorkbookId(w.id)}
            style={{
              padding: "0.5rem 1rem",
              cursor: "pointer",
              background:
                w.id === selectedWorkbookId
                  ? "var(--mtihani-sidebar-active)"
                  : "transparent",
            }}
          >
            {w.title}
          </div>
        ))}
      </div>
      {selectedWorkbook && (
        <div style={{ marginTop: "0.75rem", padding: "0 1rem" }}>
          <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", opacity: 0.9 }}>
            Worksheets in "{selectedWorkbook.title}"
          </h4>
          <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.9rem" }}>
            {selectedWorkbook.worksheets.map((ws: any) => (
              <li key={ws.id}>
                {ws.title} {ws.published ? "(pub)" : "(draft)"}
              </li>
            ))}
          </ul>
          <form onSubmit={handleCreateWorksheet} style={{ marginTop: "0.5rem" }}>
            <input
              placeholder="New worksheet"
              value={newWorksheetTitle}
              onChange={e => setNewWorksheetTitle(e.target.value)}
              style={{ width: "100%", marginBottom: "0.25rem" }}
            />
            <textarea
              placeholder="Instructions (opt)"
              value={newWorksheetInstructions}
              onChange={e => setNewWorksheetInstructions(e.target.value)}
              style={{ width: "100%", minHeight: 48 }}
            />
            <button type="submit" style={{ marginTop: "0.25rem" }}>
              Create worksheet
            </button>
          </form>
        </div>
      )}
    </>
  );

  return (
    <AppLayout user={user} onLogout={onLogout} sidebar={directorSidebar} title="Director">
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <h2>Worksheet Grades</h2>
          {grades.map(g => (
            <div
              key={g.id}
              style={{
                border: "1px solid #ccc",
                padding: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <p>
                <strong>Worksheet:</strong> {g.worksheet}
              </p>
              <p>
                <strong>Student:</strong> {g.student}
              </p>
              <p>
                <strong>Total score:</strong> {g.score_total}
              </p>
              <p>
                <strong>Status:</strong> {g.status}
              </p>
              {g.status === "PENDING_APPROVAL" && (
                <div style={{ marginTop: "0.5rem" }}>
                  <button onClick={() => handleApprove(g.id, "APPROVED")}>
                    Approve
                  </button>
                  <button
                    style={{ marginLeft: "0.5rem" }}
                    onClick={() => handleApprove(g.id, "REJECTED")}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
      {grades.length === 0 && !loading && <p>No worksheet grades yet.</p>}
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
      <div style={{ maxWidth: 400, margin: "4rem auto", fontFamily: "system-ui" }}>
        <h1>Mtihani {isLogin ? "Login" : "Sign up"}</h1>
        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          <div>
            <label>Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {!isLogin && (
            <div style={{ marginTop: 8 }}>
              <label>Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as Role)}
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="DIRECTOR">Director</option>
              </select>
            </div>
          )}
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" style={{ marginTop: 12 }}>
            {isLogin ? "Login" : "Sign up"}
          </button>
        </form>
        <button
          type="button"
          style={{ marginTop: 8 }}
          onClick={() => setMode(isLogin ? "register" : "login")}
        >
          {isLogin ? "Need an account? Sign up" : "Have an account? Login"}
        </button>
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
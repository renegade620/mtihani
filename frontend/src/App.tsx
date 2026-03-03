import React, { useState, useEffect } from "react";
import { apiFetch } from "./api";

type Role = "DIRECTOR" | "TEACHER" | "STUDENT";

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

type Answer = {
  id?: number;
  question: number;
  current_text: string;
  status: "DRAFT" | "SUBMITTED";
};

function StudentHome({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [selectedWorksheetId, setSelectedWorksheetId] = useState<number | null>(
    null
  );
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
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

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>Mtihani</h1>
          <p>
            Logged in as <strong>{user.username}</strong> ({user.role})
          </p>
        </div>
        <button onClick={onLogout}>Logout</button>
      </header>

      <hr />

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "flex", gap: "2rem", marginTop: "1rem" }}>
        <aside style={{ minWidth: 220 }}>
          <h2>Worksheets</h2>
          {worksheets.map(w => (
            <div
              key={w.id}
              onClick={() => setSelectedWorksheetId(w.id)}
              style={{
                padding: "0.5rem",
                marginBottom: "0.25rem",
                cursor: "pointer",
                background:
                  w.id === selectedWorksheetId ? "#eef" : "transparent",
              }}
            >
              {w.title}
            </div>
          ))}
        </aside>

        <main style={{ flex: 1 }}>
          {selectedWorksheet ? (
            <>
              <h2>{selectedWorksheet.title}</h2>
              {selectedWorksheet.instructions && (
                <p>{selectedWorksheet.instructions}</p>
              )}
              {selectedWorksheet.questions.map(q => {
                const ans = answers[q.id] || {
                  question: q.id,
                  current_text: "",
                  status: "DRAFT" as const,
                };
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
                      style={{ width: "100%", minHeight: 80 }}
                      value={ans.current_text}
                      onChange={e => handleAnswerChange(q, e.target.value)}
                    />
                    <button
                      style={{ marginTop: "0.5rem" }}
                      onClick={() => handleSubmitAnswer(q)}
                    >
                      Submit answer
                    </button>
                  </div>
                );
              })}
            </>
          ) : (
            <p>Select a worksheet to begin.</p>
          )}
        </main>
      </div>
    </div>
  );
}

function TeacherHome({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [selectedWorksheetId, setSelectedWorksheetId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [suggestText, setSuggestText] = useState<Record<number, string>>({});
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

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>Mtihani</h1>
          <p>
            Logged in as <strong>{user.username}</strong> ({user.role})
          </p>
        </div>
        <button onClick={onLogout}>Logout</button>
      </header>

      <hr />

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "flex", gap: "2rem", marginTop: "1rem" }}>
        <aside style={{ minWidth: 220 }}>
          <h2>Worksheets</h2>
          {worksheets.map(w => (
            <div
              key={w.id}
              onClick={() => setSelectedWorksheetId(w.id)}
              style={{
                padding: "0.5rem",
                marginBottom: "0.25rem",
                cursor: "pointer",
                background:
                  w.id === selectedWorksheetId ? "#eef" : "transparent",
              }}
            >
              {w.title}
            </div>
          ))}
        </aside>

        <main style={{ flex: 1 }}>
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
            </div>
          ))}
          {answers.length === 0 && <p>No answers yet for this worksheet.</p>}
        </main>
      </div>
    </div>
  );
}

function DirectorHome({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadGrades() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch("/api/worksheet-grades/");
      setGrades(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load worksheet grades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGrades();
  }, []);

  async function handleApprove(id: number, statusValue: "APPROVED" | "REJECTED") {
    try {
      setLoading(true);
      setError(null);
      await apiFetch(`/api/worksheet-grades/${id}/approve/`, {
        method: "POST",
        body: JSON.stringify({ status: statusValue, comment: "" }),
      });
      // Refresh list (simple + clear)
      await loadGrades();
    } catch (e: any) {
      setError(e.message ?? "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>Mtihani</h1>
          <p>
            Logged in as <strong>{user.username}</strong> ({user.role})
          </p>
        </div>
        <button onClick={onLogout}>Logout</button>
      </header>

      <hr />

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
    </div>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<Role>("STUDENT");


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    apiFetch("/api/auth/me/")
      .then(setUser)
      .catch(() => localStorage.removeItem("token"));
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
        body: JSON.stringify({ username, password, email: "", role }),
      });
      // After successful signup, log in automatically
      await handleLogin(e);
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  if (!user) {
    const isLogin = mode === "login";
    return (
      <div style={{ maxWidth: 400, margin: "4rem auto", fontFamily: "system-ui" }}>
        <h1>Mtihani {isLogin ? "Login" : "Sign up"}</h1>
        <form onSubmit={isLogin ? handleLogin : handleRegister}>
          {/* username/password fields reused */}
          {/* for signup, add role select (optional) */}
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

  // For now, we only implement the student home explicitly.
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
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>Mtihani</h1>
          <p>
            Logged in as <strong>{user.username}</strong> ({user.role})
          </p>
        </div>
        <button onClick={handleLogout}>Logout</button>
      </header>
      <p>Teacher/Director UI coming next.</p>
    </div>
  );
}

export default App;
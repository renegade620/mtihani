import React, { useState } from "react";
import { useWorksheets, useAnswers, useWorksheetGrades, apiFetch } from "../services/api";
import { AppLayout } from "../components/layout/AppLayout";
import { User, Question, Worksheet, Answer, WorksheetGrade } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, ChevronRight, PenTool, CheckCircle, Trash2, Edit3, Plus } from "lucide-react";

export function TeacherDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [selectedWorksheetId, setSelectedWorksheetId] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editQuestionPrompt, setEditQuestionPrompt] = useState("");
  const [editQuestionMaxScore, setEditQuestionMaxScore] = useState("");
  
  const [newQuestionPrompt, setNewQuestionPrompt] = useState("");
  const [newQuestionMaxScore, setNewQuestionMaxScore] = useState("");

  const [suggestText, setSuggestText] = useState<Record<number, string>>({});
  const [gradeScore, setGradeScore] = useState<Record<number, string>>({});
  const [gradeFeedback, setGradeFeedback] = useState<Record<number, string>>({});
  const [worksheetTotalScore, setWorksheetTotalScore] = useState<Record<number, string>>({});

  const queryClient = useQueryClient();
  const { data: worksheets = [], isLoading: loadingWorksheets } = useWorksheets();
  const { data: answers = [], isLoading: loadingAnswers } = useAnswers(selectedWorksheetId);
  const { data: grades = [] } = useWorksheetGrades();

  React.useEffect(() => {
    if (worksheets.length > 0 && !selectedWorksheetId) {
      setSelectedWorksheetId(worksheets[0].id);
    }
  }, [worksheets, selectedWorksheetId]);

  const selectedWorksheet = worksheets.find(w => w.id === selectedWorksheetId);

  // Mutations
  const createQuestionMutation = useMutation({
    mutationFn: async () => {
      return apiFetch("/api/questions/", {
        method: "POST",
        body: JSON.stringify({
          worksheet: selectedWorksheetId,
          prompt: newQuestionPrompt,
          max_score: parseFloat(newQuestionMaxScore || "0"),
          order_index: selectedWorksheet ? selectedWorksheet.questions.length : 0,
        }),
      });
    },
    onSuccess: () => {
      setNewQuestionPrompt("");
      setNewQuestionMaxScore("");
      queryClient.invalidateQueries({ queryKey: ["worksheets"] });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiFetch(`/api/questions/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          prompt: editQuestionPrompt.trim() || undefined,
          max_score: editQuestionMaxScore !== "" ? parseFloat(editQuestionMaxScore) : undefined,
        }),
      });
    },
    onSuccess: () => {
      setEditingQuestionId(null);
      queryClient.invalidateQueries({ queryKey: ["worksheets"] });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/questions/${id}/`, { method: "DELETE" }),
    onSuccess: () => {
      setEditingQuestionId(null);
      queryClient.invalidateQueries({ queryKey: ["worksheets"] });
    },
  });

  const suggestMutation = useMutation({
    mutationFn: async (answerId: number) => {
      const text = suggestText[answerId];
      if (!text || !text.trim()) throw new Error("Empty suggestion");
      return apiFetch(`/api/answers/${answerId}/suggest/`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
    },
    onSuccess: (_, answerId) => {
      setSuggestText(prev => ({ ...prev, [answerId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["answers", selectedWorksheetId] });
    },
  });

  const gradeAnswerMutation = useMutation({
    mutationFn: async (answerId: number) => {
      const score = parseFloat(gradeScore[answerId]);
      if (Number.isNaN(score)) throw new Error("Invalid score");
      return apiFetch("/api/answer-grades/", {
        method: "POST",
        body: JSON.stringify({
          answer: answerId,
          score,
          feedback: gradeFeedback[answerId] || "",
          is_final_for_answer: true,
        }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["answers", selectedWorksheetId] }),
  });

  const worksheetGradeMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const score_total = parseFloat(worksheetTotalScore[studentId]);
      if (Number.isNaN(score_total)) throw new Error("Invalid total");
      return apiFetch("/api/worksheet-grades/", {
        method: "POST",
        body: JSON.stringify({ worksheet: selectedWorksheetId, student: studentId, score_total }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["worksheetGrades"] }),
  });

  const getWorksheetGradeStatusForStudent = (studentId: number) => {
    const g = grades.find((x: any) => x.student === studentId && x.worksheet === selectedWorksheetId);
    return g ? g.status : null;
  };

  const sidebar = (
    <div className="space-y-1">
      <h3 className="px-3 text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">Manage Assignments</h3>
      {loadingWorksheets ? (
        <div className="animate-pulse flex space-x-4 px-3"><div className="h-4 bg-slate-200 rounded w-3/4"></div></div>
      ) : worksheets.length === 0 ? (
        <p className="px-3 text-sm text-slate-500">No assignments to manage.</p>
      ) : (
        worksheets.map((w: Worksheet) => {
          const isActive = w.id === selectedWorksheetId;
          return (
            <button
              key={w.id}
              onClick={() => setSelectedWorksheetId(w.id)}
              className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <FileText size={16} className={isActive ? "text-indigo-500" : "text-slate-400"} />
                <span className="truncate">{w.title}</span>
              </div>
              {isActive && <ChevronRight size={16} className="text-indigo-400 shrink-0" />}
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <AppLayout user={user} onLogout={onLogout} sidebar={sidebar} title="Teacher Portal">
      {selectedWorksheet ? (
        <div className="space-y-8">
          
          {/* Question Editor */}
          <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                 <PenTool size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Assignment Builder</h2>
                <p className="text-slate-500 text-sm">Create and modify questions for {selectedWorksheet.title}</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {selectedWorksheet.questions.map((q: Question, idx: number) => (
                <div key={q.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl group transition-all hover:bg-white hover:shadow-md">
                  {editingQuestionId === q.id ? (
                    <div className="space-y-3">
                      <input
                        className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-800"
                        value={editQuestionPrompt}
                        onChange={e => setEditQuestionPrompt(e.target.value)}
                        placeholder="Question prompt"
                      />
                      <div className="flex items-center gap-3">
                        <input
                          type="number" step="0.5"
                          className="w-24 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          value={editQuestionMaxScore}
                          onChange={e => setEditQuestionMaxScore(e.target.value)}
                          placeholder="Max Pts"
                        />
                        <button
                          onClick={() => updateQuestionMutation.mutate(q.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingQuestionId(null)}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-xl text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold tracking-widest text-slate-400 uppercase block mb-1">Question {idx + 1}</span>
                        <p className="text-slate-800 font-medium text-lg leading-relaxed">{q.prompt}</p>
                        <span className="inline-block mt-2 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500">
                          {q.max_score} pts
                        </span>
                      </div>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                        <button
                          onClick={() => { setEditingQuestionId(q.id); setEditQuestionPrompt(q.prompt); setEditQuestionMaxScore(String(q.max_score)); }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button
                          onClick={() => window.confirm("Delete this question?") && deleteQuestionMutation.mutate(q.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); createQuestionMutation.mutate(); }}
              className="bg-indigo-50/50 border border-indigo-100 p-6 rounded-2xl"
            >
              <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
                 <Plus size={16} /> Add New Question
              </h3>
              <textarea
                placeholder="Type the question prompt here..."
                className="w-full bg-white px-4 py-3 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[80px] text-slate-800 mb-3"
                value={newQuestionPrompt}
                onChange={e => setNewQuestionPrompt(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Pts</span>
                  <input
                    type="number" step="0.5"
                    placeholder="10"
                    className="w-28 pl-10 pr-4 py-2 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
                    value={newQuestionMaxScore}
                    onChange={e => setNewQuestionMaxScore(e.target.value)}
                  />
                </div>
                <button
                  type="submit" disabled={createQuestionMutation.isPending || !newQuestionPrompt.trim()}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
                >
                  Create
                </button>
              </div>
            </form>
          </section>

          {/* Submissions Section */}
          <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Student Submissions</h2>
            
            {answers.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-500 font-medium">No submissions yet for this assignment.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {(() => {
                  const byStudent = new Map<number, { username: string; answers: any[] }>();
                  for (const a of answers) {
                    const id = a.student;
                    if (!byStudent.has(id)) byStudent.set(id, { username: String(a.student_username ?? id), answers: [] });
                    byStudent.get(id)!.answers.push(a);
                  }

                  return Array.from(byStudent.entries()).map(([studentId, { username, answers: studentAnswers }]) => {
                    const gradeStatus = getWorksheetGradeStatusForStudent(studentId);
                    
                    return (
                      <div key={studentId} className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden p-6">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm">
                                {username.charAt(0).toUpperCase()}
                             </div>
                             {username}
                           </h3>
                           {gradeStatus === "APPROVED" && (
                             <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm">
                               <CheckCircle size={14}/> Approved
                             </span>
                           )}
                        </div>

                        <div className="space-y-6">
                          {studentAnswers.map((a: any) => (
                            <div key={a.id} className="bg-white border p-5 rounded-2xl shadow-sm relative group">
                              <p className="font-semibold text-slate-800 mb-3">
                                {selectedWorksheet?.questions.find((q: any) => q.id === a.question)?.prompt ?? `Question #${a.question}`}
                              </p>
                              
                              <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm whitespace-pre-wrap border border-slate-100 mb-4 font-medium leading-relaxed">
                                {a.current_text || <span className="text-slate-400 italic">No answer provided</span>}
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Suggestion Box */}
                                <div>
                                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Teacher Suggestion</label>
                                  <textarea
                                    className="w-full px-3 py-2 text-sm border focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none rounded-xl"
                                    placeholder="Type a correction here..."
                                    rows={3}
                                    value={suggestText[a.id] || ""}
                                    onChange={e => setSuggestText(prev => ({ ...prev, [a.id]: e.target.value }))}
                                  />
                                  <button
                                    onClick={() => suggestMutation.mutate(a.id)}
                                    disabled={!suggestText[a.id]?.trim()}
                                    className="mt-2 px-4 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    Send Suggestion
                                  </button>
                                </div>

                                {/* Grade Box */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Per-Question Grade</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="number" step="0.5"
                                      placeholder="Score"
                                      className="w-20 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-indigo-500/20"
                                      value={gradeScore[a.id] || ""}
                                      onChange={e => setGradeScore(prev => ({ ...prev, [a.id]: e.target.value }))}
                                    />
                                    <input
                                      placeholder="Feedback"
                                      className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-indigo-500/20"
                                      value={gradeFeedback[a.id] || ""}
                                      onChange={e => setGradeFeedback(prev => ({ ...prev, [a.id]: e.target.value }))}
                                    />
                                  </div>
                                  <button
                                    onClick={() => gradeAnswerMutation.mutate(a.id)}
                                    className="mt-3 px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    Save Grade
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Final Assignment Grade Submission */}
                        {gradeStatus !== "APPROVED" && (
                          <div className="mt-8 pt-6 border-t border-slate-200">
                            <h4 className="text-sm font-bold text-slate-800 mb-3 block">Finalize Assignment Details</h4>
                            <div className="flex items-center gap-3">
                              <input
                                type="number" step="0.5"
                                placeholder="Final total score"
                                className="w-40 px-4 py-2 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-800 shadow-sm"
                                value={worksheetTotalScore[studentId] || ""}
                                onChange={e => setWorksheetTotalScore(prev => ({ ...prev, [studentId]: e.target.value }))}
                              />
                              <button
                                onClick={() => worksheetGradeMutation.mutate(studentId)}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
                              >
                                Submit Final Grade to Director
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </section>

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FileText size={48} className="text-slate-200 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800">No assignment selected</h2>
          <p className="text-slate-500 mt-1">Choose an assignment to manage questions and grade submissions.</p>
        </div>
      )}
    </AppLayout>
  );
}

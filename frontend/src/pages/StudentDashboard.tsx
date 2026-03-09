import React, { useState } from "react";
import { useWorksheets, useAnswers, useWorksheetGrades, apiFetch } from "../services/api";
import { AppLayout } from "../components/layout/AppLayout";
import { User, Worksheet, Question, Answer } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle, ChevronRight, FileText, Send } from "lucide-react";

export function StudentDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [selectedWorksheetId, setSelectedWorksheetId] = useState<number | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<number, string>>({});

  const queryClient = useQueryClient();
  const { data: worksheets = [], isLoading: loadingWorksheets } = useWorksheets();
  const { data: answers = [], isLoading: loadingAnswers } = useAnswers(selectedWorksheetId);
  const { data: grades = [] } = useWorksheetGrades();

  // Initialize selected worksheet
  React.useEffect(() => {
    if (worksheets.length > 0 && !selectedWorksheetId) {
      setSelectedWorksheetId(worksheets[0].id);
    }
  }, [worksheets, selectedWorksheetId]);

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ qId, text, existingId }: { qId: number, text: string, existingId?: number }) => {
      const payload = { question: qId, current_text: text, status: "SUBMITTED" };
      if (existingId) {
        return apiFetch(`/api/answers/${existingId}/`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      return apiFetch("/api/answers/", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["answers", selectedWorksheetId] }),
  });

  const applySuggestionMutation = useMutation({
    mutationFn: async ({ answerId, versionId }: { answerId: number, versionId: number }) => {
      return apiFetch(`/api/answers/${answerId}/apply-suggestion/`, {
        method: "POST",
        body: JSON.stringify({ version_id: versionId }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["answers", selectedWorksheetId] }),
  });

  const handleDraftChange = (qId: number, text: string) => {
    setDraftAnswers(prev => ({ ...prev, [qId]: text }));
  };

  const getAnswerForQuestion = (qId: number) => answers.find(a => a.question === qId);

  const selectedWorksheet = worksheets.find(w => w.id === selectedWorksheetId);
  const currentGrade = grades.find(g => g.worksheet === selectedWorksheetId);

  const sidebar = (
    <div className="space-y-1">
      <h3 className="px-3 text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">Assignments</h3>
      {loadingWorksheets ? (
        <div className="animate-pulse flex space-x-4 px-3"><div className="h-4 bg-slate-200 rounded w-3/4"></div></div>
      ) : worksheets.length === 0 ? (
        <p className="px-3 text-sm text-slate-500">No assignments yet.</p>
      ) : (
        worksheets.map(w => {
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
    <AppLayout user={user} onLogout={onLogout} sidebar={sidebar} title="Student Portal">
      {/* Grades Overview Section */}
      {grades.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase mb-4">My Grades</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {grades.map(g => (
              <div key={g.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
                <h3 className="font-semibold text-slate-800 mb-1 truncate">{g.worksheet_title || `Assignment #${g.worksheet}`}</h3>
                <div className="flex items-end justify-between mt-3">
                  <div className="text-2xl font-black text-indigo-900">{g.score_total}</div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    g.status === "PENDING_APPROVAL" ? "bg-amber-100 text-amber-700" :
                    g.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}>
                    {g.status === "PENDING_APPROVAL" ? <Clock size={12} /> : g.status === "APPROVED" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {g.status === "PENDING_APPROVAL" ? "Reviewing" : g.status === "APPROVED" ? "Approved" : "Rejected"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Worksheet Section */}
      {selectedWorksheet ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{selectedWorksheet.title}</h1>
            {selectedWorksheet.instructions && (
              <p className="text-slate-600 leading-relaxed">{selectedWorksheet.instructions}</p>
            )}
            
            {currentGrade && (
              <div className={`mt-4 p-4 rounded-xl border flex items-center justify-between ${
                currentGrade.status === "APPROVED" ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
              }`}>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-0.5">Final Grade</p>
                  <p className={`text-xl font-bold ${currentGrade.status === "APPROVED" ? "text-emerald-700" : "text-amber-700"}`}>
                    {currentGrade.score_total}
                  </p>
                </div>
                {currentGrade.status === "PENDING_APPROVAL" && (
                  <span className="text-amber-600 text-sm font-medium flex items-center gap-1.5"><Clock size={16}/> Awaiting Director</span>
                )}
                {currentGrade.status === "APPROVED" && (
                  <span className="text-emerald-600 text-sm font-medium flex items-center gap-1.5"><CheckCircle2 size={16}/> Finalized</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-5">
            {selectedWorksheet.questions.map((q, idx) => {
              const ans = getAnswerForQuestion(q.id);
              const submitted = ans?.status === "SUBMITTED";
              const suggestions = (ans?.versions || []).filter(v => v.is_teacher_suggestion);
              
              // use local draft if available, otherwise server answer
              const currentText = draftAnswers[q.id] !== undefined ? draftAnswers[q.id] : (ans?.current_text || "");

              return (
                <div key={q.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
                  {submitted && <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400"></div>}
                  {suggestions.length > 0 && <div className="absolute top-0 right-0 p-1.5 bg-amber-100 text-amber-700 rounded-bl-xl text-xs font-bold tracking-wide">TEACHER FIXES</div>}
                  
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Question {idx + 1}</span>
                    <span className="text-sm font-medium text-slate-400">{q.max_score} pts</span>
                  </div>
                  
                  <p className="font-semibold text-slate-800 text-lg mb-4">{q.prompt}</p>
                  
                  <textarea
                    className={`w-full min-h-[120px] p-4 rounded-xl border focus:ring-2 outline-none transition-all resize-y ${
                      submitted 
                        ? "bg-slate-50 border-slate-200 text-slate-600 focus:ring-0" 
                        : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400 focus:ring-indigo-400/20"
                    }`}
                    value={currentText}
                    onChange={e => handleDraftChange(q.id, e.target.value)}
                    readOnly={submitted}
                    placeholder="Type your answer here..."
                  />
                  
                  <div className="mt-4 flex items-center justify-between">
                    {submitted ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                        <CheckCircle2 size={16} /> Submitted
                      </div>
                    ) : (
                      <button
                        onClick={() => submitAnswerMutation.mutate({ qId: q.id, text: currentText, existingId: ans?.id })}
                        disabled={submitAnswerMutation.isPending || !currentText.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
                      >
                         <Send size={16} /> Submit Answer
                      </button>
                    )}
                  </div>

                  {suggestions.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-slate-100">
                      <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                         Teacher Suggestions
                      </h4>
                      <div className="space-y-3">
                        {suggestions.map(v => (
                          <div key={v.id} className="bg-amber-50 rounded-xl p-4 border border-amber-100 relative">
                            <p className="text-slate-800 whitespace-pre-wrap text-sm mb-3 font-medium bg-white/60 p-3 rounded-lg border border-amber-50">{v.text}</p>
                            <button
                              onClick={() => ans?.id && applySuggestionMutation.mutate({ answerId: ans.id, versionId: v.id })}
                              disabled={applySuggestionMutation.isPending}
                              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                            >
                              Apply to answer
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FileText size={48} className="text-slate-200 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800">No assignment selected</h2>
          <p className="text-slate-500 mt-1">Choose an assignment from the sidebar to begin.</p>
        </div>
      )}
    </AppLayout>
  );
}

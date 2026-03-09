import React, { useState } from "react";
import { useWorkbooks, useWorksheetGrades, apiFetch } from "../services/api";
import { AppLayout } from "../components/layout/AppLayout";
import { User, Workbook, WorksheetGrade, Worksheet } from "../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, CheckSquare, FilePlus2, BookCopy, Edit, Trash2, Eye, EyeOff, Activity } from "lucide-react";

export function DirectorDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"grades" | "assignments">("grades");
  const [selectedWorkbookId, setSelectedWorkbookId] = useState<number | null>(null);

  const [newWorkbookTitle, setNewWorkbookTitle] = useState("");
  const [newWorksheetTitle, setNewWorksheetTitle] = useState("");

  const queryClient = useQueryClient();
  const { data: workbooks = [], isLoading: loadingWorkbooks } = useWorkbooks();
  const { data: grades = [], isLoading: loadingGrades } = useWorksheetGrades();

  React.useEffect(() => {
    if (workbooks.length > 0 && !selectedWorkbookId) {
      setSelectedWorkbookId(workbooks[0].id);
    }
  }, [workbooks, selectedWorkbookId]);

  const selectedWorkbook = workbooks.find((w: Workbook) => w.id === selectedWorkbookId);
  const pendingApprovals = grades.filter((g: WorksheetGrade) => g.status === "PENDING_APPROVAL");

  // Mutations
  const approveGradeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: "APPROVED" | "REJECTED" }) => {
      return apiFetch(`/api/worksheet-grades/${id}/approve/`, {
        method: "POST",
        body: JSON.stringify({ status, comment: "" }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["worksheetGrades"] }),
  });

  const reopenGradeMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/worksheet-grades/${id}/reopen/`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["worksheetGrades"] }),
  });

  const createWorkbookMutation = useMutation({
    mutationFn: async () => {
      return apiFetch("/api/workbooks/", {
        method: "POST",
        body: JSON.stringify({ title: newWorkbookTitle, description: "" }),
      });
    },
    onSuccess: () => {
      setNewWorkbookTitle("");
      queryClient.invalidateQueries({ queryKey: ["workbooks"] });
    },
  });

  const createWorksheetMutation = useMutation({
    mutationFn: async () => {
      return apiFetch("/api/worksheets/", {
        method: "POST",
        body: JSON.stringify({
          workbook: selectedWorkbookId,
          title: newWorksheetTitle,
          instructions: "",
          order_index: 0,
          published: false,
        }),
      });
    },
    onSuccess: () => {
      setNewWorksheetTitle("");
      queryClient.invalidateQueries({ queryKey: ["workbooks"] });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: number, published: boolean }) => {
      return apiFetch(`/api/worksheets/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ published }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workbooks"] }),
  });

  const deleteWorkbookMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/workbooks/${id}/`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      if (selectedWorkbookId === id) setSelectedWorkbookId(null);
      queryClient.invalidateQueries({ queryKey: ["workbooks"] });
    },
  });

  const deleteWorksheetMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/api/worksheets/${id}/`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workbooks"] }),
  });

  const sidebar = (
    <div className="space-y-6">
      <div>
        <h3 className="px-3 text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">Director View</h3>
        <button
          onClick={() => setActiveTab("grades")}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1 ${
            activeTab === "grades" ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckSquare size={16} className={activeTab === "grades" ? "text-amber-500" : "text-slate-400"} />
            <span>Grade Approvals</span>
          </div>
          {pendingApprovals.length > 0 && (
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold shrink-0">{pendingApprovals.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "assignments" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <LayoutDashboard size={16} className={activeTab === "assignments" ? "text-indigo-500" : "text-slate-400"} />
          <span>Workbook Management</span>
        </button>
      </div>

      {activeTab === "assignments" && (
        <div className="pt-4 border-t border-slate-200">
          <h3 className="px-3 text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">Workbooks</h3>
          {workbooks.map((w: Workbook) => (
            <button
              key={w.id}
              onClick={() => setSelectedWorkbookId(w.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                w.id === selectedWorkbookId ? "text-indigo-700 font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookCopy size={14} className={w.id === selectedWorkbookId ? "text-indigo-400" : "text-slate-400"} />
              <span className="truncate">{w.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <AppLayout user={user} onLogout={onLogout} sidebar={sidebar} title="Director Dashboard">
      {activeTab === "grades" && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                 <Activity size={24} className="text-amber-500"/> Grade Approvals
              </h2>
              <p className="text-slate-500 text-sm mt-1">Review and approve final worksheet grades submitted by teachers.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold tracking-wider text-slate-500 uppercase">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Assignment</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grades.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                        No grades have been submitted yet.
                     </td>
                   </tr>
                ) : grades.map((g: any) => {
                  const isPending = g.status === "PENDING_APPROVAL";
                  return (
                    <tr key={g.id} className={`transition-colors hover:bg-slate-50 ${isPending ? "bg-amber-50/30" : ""}`}>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{g.student_username ?? g.student}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[200px]">{g.worksheet_title ?? `#${g.worksheet}`}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{g.score_total}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isPending ? "bg-amber-100 text-amber-800" : g.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {isPending ? "Pending" : g.status === "APPROVED" ? "Approved" : "Rejected"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => approveGradeMutation.mutate({ id: g.id, status: "APPROVED" })}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => approveGradeMutation.mutate({ id: g.id, status: "REJECTED" })}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg shadow-sm transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => reopenGradeMutation.mutate(g.id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                          >
                            Reopen
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "assignments" && (
        <div className="space-y-6">
          {/* Create Workbook */}
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl">
            <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
               <BookCopy size={18} /> Create New Workbook
            </h3>
            <form onSubmit={e => { e.preventDefault(); createWorkbookMutation.mutate(); }} className="flex gap-3">
              <input
                placeholder="Ex: Spring Semester Calculus"
                className="flex-1 px-4 py-2 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-800"
                value={newWorkbookTitle}
                onChange={e => setNewWorkbookTitle(e.target.value)}
              />
              <button
                type="submit" disabled={!newWorkbookTitle.trim() || createWorkbookMutation.isPending}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-sm"
              >
                Create
              </button>
            </form>
          </div>

          {/* Manage Selected Workbook */}
          {selectedWorkbook ? (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
               <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                 <div>
                   <h2 className="text-xl font-bold text-slate-900">{selectedWorkbook.title}</h2>
                   <p className="text-slate-500 text-sm mt-1">Manage assignments inside this workbook</p>
                 </div>
                 <button
                   onClick={() => window.confirm(`Delete workbook "${selectedWorkbook.title}"?`) && deleteWorkbookMutation.mutate(selectedWorkbook.id)}
                   className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
                   title="Delete Workbook"
                 >
                   <Trash2 size={18} />
                 </button>
               </div>

               <div className="space-y-4">
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-lg inline-block border border-slate-200 mb-2">Assignments</h3>
                 
                 <form onSubmit={e => { e.preventDefault(); createWorksheetMutation.mutate(); }} className="flex gap-3 mb-6">
                    <div className="relative flex-1">
                      <FilePlus2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        placeholder="New Assignment Title..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        value={newWorksheetTitle}
                        onChange={e => setNewWorksheetTitle(e.target.value)}
                      />
                    </div>
                    <button type="submit" disabled={!newWorksheetTitle.trim() || createWorksheetMutation.isPending} className="px-6 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl disabled:opacity-50 transition-colors">
                      Add
                    </button>
                 </form>

                 {(selectedWorkbook.worksheets ?? []).map((ws: any) => (
                   <div key={ws.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl bg-white hover:border-indigo-300 transition-colors group">
                     <div>
                       <div className="flex items-center gap-3">
                         <h4 className="font-semibold text-slate-900">{ws.title}</h4>
                         <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                           ws.published ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                         }`}>
                           {ws.published ? 'Live' : 'Draft'}
                         </span>
                       </div>
                       {ws.instructions && <p className="text-sm text-slate-500 mt-1">{ws.instructions}</p>}
                     </div>
                     <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => togglePublishMutation.mutate({ id: ws.id, published: !ws.published })}
                          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 bg-slate-50 border border-slate-200 transition-colors"
                          title={ws.published ? "Unpublish" : "Publish"}
                        >
                          {ws.published ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => window.confirm(`Delete assignment "${ws.title}"?`) && deleteWorksheetMutation.mutate(ws.id)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 bg-slate-50 border border-slate-200 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                   </div>
                 ))}
                 {(selectedWorkbook.worksheets ?? []).length === 0 && (
                   <p className="text-slate-400 text-sm italic py-4">No assignments yet. Create one above.</p>
                 )}
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-3xl">
              <BookCopy size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">Select a workbook to manage its assignments</p>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

import React from "react";
import { User } from "../../types";
import { LogOut, BookOpen } from "lucide-react";

type AppLayoutProps = {
  user: User;
  onLogout: () => void;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  title?: string;
};

export function AppLayout({ user, onLogout, sidebar, children, title }: AppLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200/80 shadow-sm backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600">
             <BookOpen size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-indigo-900">
            Mtihani
          </h1>
          {title && (
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full hidden sm:inline-block">
              {title}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">{user.username}</span>
            <span className="px-2.5 py-1 text-xs font-semibold tracking-wide text-emerald-700 bg-emerald-100 rounded-full shadow-sm">
              {user.role}
            </span>
          </div>
          
          <button 
            onClick={onLogout} 
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors rounded-lg hover:text-slate-900 hover:bg-slate-100"
          >
            <span className="hidden sm:inline">Logout</span>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
          <div className="p-4">
             {sidebar}
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

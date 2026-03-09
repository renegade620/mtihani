import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "./services/api";

import { Auth } from "./pages/Auth";
import { StudentDashboard } from "./pages/StudentDashboard";
import { TeacherDashboard } from "./pages/TeacherDashboard";
import { DirectorDashboard } from "./pages/DirectorDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRouter() {
  const { data: user, isLoading, refetch } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("token");
    queryClient.clear();
    refetch(); // Trigger re-render to clear user state and drop to Auth
  };

  const handleLoginSuccess = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
         <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/student" 
          element={user.role === "STUDENT" ? <StudentDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/teacher" 
          element={user.role === "TEACHER" ? <TeacherDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/director" 
          element={user.role === "DIRECTOR" ? <DirectorDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />} 
        />
        
        <Route 
          path="*" 
          element={
            <Navigate 
              to={
                user.role === "STUDENT" ? "/student" : 
                user.role === "TEACHER" ? "/teacher" : 
                user.role === "DIRECTOR" ? "/director" : "/"
              } 
              replace 
            />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  );
}

export default App;
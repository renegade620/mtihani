import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { apiFetch } from "../services/api";
import { Role } from "../types";
import { ClipboardList } from "lucide-react";

type AuthProps = {
  onLoginSuccess: () => void;
};

export function Auth({ onLoginSuccess }: AuthProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { username: "", password: "", role: "STUDENT" as Role }
  });

  const onSubmit = async (data: any) => {
    setError(null);
    setIsLoading(true);
    try {
      if (mode === "register") {
        await apiFetch("/api/auth/register/", {
          method: "POST",
          body: JSON.stringify({ ...data, email: "", organization: null }),
        });
      }
      const loginData = await apiFetch("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username: data.username, password: data.password }),
      });
      localStorage.setItem("token", loginData.token);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message ?? `${mode === "login" ? "Login" : "Registration"} failed`);
    } finally {
      setIsLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-100 blur-3xl opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-emerald-50 blur-3xl opacity-60"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100 p-8 relative z-10 transition-all duration-300">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm border border-indigo-100">
             <ClipboardList size={28} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Mtihani
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Beating deadlines appropriately
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-8 relative">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 z-10 ${isLogin ? "text-indigo-700 shadow-sm bg-white ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 z-10 ${!isLogin ? "text-indigo-700 shadow-sm bg-white ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
            <input
              {...register("username", { required: true })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-800"
              placeholder="Ex: jane_doe"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              {...register("password", { required: true, minLength: 4 })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-800"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
              <select
                {...register("role")}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-800 appearance-none"
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="DIRECTOR">Director</option>
              </select>
            </div>
          )}

          {error && (
            <div className="p-3 mt-4 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
               isLogin ? "Access Account" : "Create Account"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

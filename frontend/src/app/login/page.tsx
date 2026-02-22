"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Mail, Lock, Sparkles, Loader2 } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setError("Check your email for a confirmation link!");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push("/dashboard");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f18] px-4 font-sans selection:bg-emerald-500/30">
            {/* Animated Ambient Background Objects */}
            <div className="absolute top-1/4 -left-20 h-[500px] w-[500px] rounded-full bg-emerald-600/20 blur-[120px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-1/4 -right-20 h-[600px] w-[600px] rounded-full bg-cyan-600/10 blur-[150px] animate-pulse pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-blue-900/10 blur-[100px] pointer-events-none" />

            {/* Subtle Grain Overlay */}
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>

            <div className="relative w-full max-w-[420px] z-10 animate-fade-in-up">
                {/* Brand Header */}
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center justify-center p-3 mb-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 ring-1 ring-emerald-500/20 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]">
                        <Sparkles className="w-8 h-8 text-emerald-400" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight">
                        <span className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                            Lefstyle
                        </span>{" "}
                        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            Student
                        </span>
                    </h1>
                    <p className="mt-3 text-sm font-medium text-gray-400/80">
                        Campus Expense Intelligence System
                    </p>
                </div>

                {/* Glassmorphism Card */}
                <div className="relative rounded-3xl border border-white/10 bg-[#0f1724]/60 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                    <h2 className="mb-8 text-2xl font-bold text-white text-center">
                        {isSignUp ? "Create an account" : "Welcome back"}
                    </h2>

                    <form onSubmit={handleSubmit} className="relative space-y-5">
                        <div className="space-y-4">
                            {/* Email Input */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-emerald-400 transition-colors">
                                    <Mail className="h-5 w-5" strokeWidth={1.5} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="student@university.edu"
                                    className="w-full rounded-2xl border border-white/5 bg-white/[0.03] py-3.5 pl-12 pr-4 text-white placeholder-gray-500/80 outline-none backdrop-blur-md transition-all focus:border-emerald-500/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-emerald-500/10"
                                    required
                                />
                            </div>

                            {/* Password Input */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-emerald-400 transition-colors">
                                    <Lock className="h-5 w-5" strokeWidth={1.5} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    minLength={6}
                                    className="w-full rounded-2xl border border-white/5 bg-white/[0.03] py-3.5 pl-12 pr-4 text-white placeholder-gray-500/80 outline-none backdrop-blur-md transition-all focus:border-emerald-500/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-emerald-500/10"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-200 text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full overflow-hidden rounded-2xl bg-white text-[#0a0f18] font-semibold py-3.5 px-4 transition-all hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        {isSignUp ? "Sign Up" : "Sign In"}
                                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={2} />
                                    </>
                                )}
                            </span>
                        </button>

                        <div className="pt-2 text-center text-sm font-medium text-gray-400">
                            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                            <button
                                type="button"
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-white hover:text-emerald-400 transition-colors underline decoration-white/20 hover:decoration-emerald-400/50 underline-offset-4"
                            >
                                {isSignUp ? "Sign In" : "Sign Up"}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="mt-8 text-center text-xs text-gray-600 font-medium tracking-wide pb-10">
                    SECURE ENCRYPTED CONNECTION
                </div>
            </div>
        </div>
    );
}

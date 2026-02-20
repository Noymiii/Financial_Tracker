"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="mb-8 text-center">
                    <span className="text-5xl">🎓</span>
                    <h1 className="mt-4 text-3xl font-bold">
                        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            CEIS
                        </span>
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Campus Expense Intelligence System
                    </p>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-white/10 bg-gray-900/50 p-8 backdrop-blur-sm">
                    <h2 className="mb-6 text-xl font-semibold text-white">
                        {isSignUp ? "Create Account" : "Welcome Back"}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-400">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="student@university.edu"
                                className="w-full rounded-xl border border-white/10 bg-gray-800/50 py-3 px-4 text-white placeholder-gray-600 transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-400">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                minLength={6}
                                className="w-full rounded-xl border border-white/10 bg-gray-800/50 py-3 px-4 text-white placeholder-gray-600 transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25"
                                required
                            />
                        </div>

                        {error && (
                            <p
                                className={`rounded-lg px-3 py-2 text-sm ${error.includes("Check your email")
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-red-500/10 text-red-400"
                                    }`}
                            >
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 disabled:opacity-50"
                        >
                            {loading
                                ? "Loading..."
                                : isSignUp
                                    ? "Sign Up"
                                    : "Sign In"}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError("");
                            }}
                            className="text-sm text-gray-500 transition-colors hover:text-emerald-400"
                        >
                            {isSignUp
                                ? "Already have an account? Sign in"
                                : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

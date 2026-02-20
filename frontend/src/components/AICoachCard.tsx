"use client";

import { useState } from "react";
import { apiGet } from "@/lib/api";

export default function AICoachCard() {
    const [advice, setAdvice] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const getAdvice = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await apiGet<{ advice: string }>("/api/ai/advice");
            setAdvice(res.advice);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-lg transition-all hover:shadow-xl">
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white opacity-10 blur-xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-32 w-32 rounded-full bg-pink-500 opacity-20 blur-xl"></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold">
                        🤖 AI Financial Coach
                    </h2>
                    {advice && (
                        <button
                            onClick={getAdvice}
                            className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors"
                            title="Refresh Advice"
                        >
                            🔄
                        </button>
                    )}
                </div>

                {!advice ? (
                    <div className="text-center py-2">
                        <p className="mb-4 text-indigo-100 text-sm">
                            Get personalized "tough love" advice based on your current spending, runway, and commitments.
                        </p>
                        <button
                            onClick={getAdvice}
                            disabled={loading}
                            className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-70 transition-colors"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                                    Coach is thinking...
                                </span>
                            ) : (
                                "Get Advice"
                            )}
                        </button>
                        {error && <p className="mt-2 text-xs text-red-200">Coach is sleeping (Error).</p>}
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        <div className="flex gap-3 items-start">
                            <span className="text-2xl mt-1">💬</span>
                            <p className="text-sm font-medium leading-relaxed opacity-95 whitespace-pre-wrap">
                                {advice}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

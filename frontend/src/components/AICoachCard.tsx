"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, MessageCircle, Loader2, RefreshCw } from "lucide-react";
import { apiGet } from "@/lib/api";
import ReactMarkdown from 'react-markdown';

export default function AICoachCard() {
    const [isHovered, setIsHovered] = useState(false);
    const [advice, setAdvice] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getAdvice = async () => {
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const res = await apiGet<{ advice: string }>("/api/ai/advice");
            setAdvice(res.advice);
        } catch (err) {
            console.error("AI advice failed:", err);
            setError("Couldn't reach the AI right now. Try again in a moment.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative rounded-2xl overflow-hidden group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Background with depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] transition-all duration-500">
                <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/30 rounded-full blur-3xl group-hover:bg-violet-500/40 transition-colors duration-700"></div>
                <div className="absolute bottom-0 left-16 w-32 h-32 bg-sky-500/15 rounded-full blur-3xl group-hover:bg-sky-400/25 transition-colors duration-700"></div>
                <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-emerald-400/10 rounded-full blur-2xl animate-float"></div>
            </div>

            {/* Dot grid decoration */}
            <svg className="absolute bottom-3 right-4 opacity-[0.08]" width="60" height="60" viewBox="0 0 60 60">
                {Array.from({ length: 16 }).map((_, i) => (
                    <circle key={i} cx={(i % 4) * 16 + 8} cy={Math.floor(i / 4) * 16 + 8} r="1.5" fill="white" />
                ))}
            </svg>

            {/* Content */}
            <div className="relative z-10 p-6">
                <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                        <Sparkles size={15} className="text-violet-200" />
                    </div>
                    <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">AI Coach</span>
                </div>

                {/* No advice yet — show prompt */}
                {!advice && !loading && !error && (
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-base font-semibold text-white mb-1.5">Need help with your budget?</h3>
                            <p className="text-sm text-violet-200/70 leading-relaxed max-w-sm">
                                Ask me anything about your spending habits, savings goals, or upcoming bills.
                            </p>
                        </div>
                        <button
                            onClick={getAdvice}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm font-medium transition-all duration-300 cursor-pointer hover:bg-white/20 hover:border-white/20 mt-1`}
                        >
                            <MessageCircle size={14} />
                            <span>Ask</span>
                            <ArrowRight size={14} className={`transition-transform duration-300 ${isHovered ? 'translate-x-0.5' : ''}`} />
                        </button>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex items-center gap-3 py-2">
                        <Loader2 size={18} className="text-violet-300 animate-spin" />
                        <p className="text-sm text-violet-200/80">Analyzing your finances...</p>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="flex items-start justify-between">
                        <p className="text-sm text-red-300/80">{error}</p>
                        <button
                            onClick={getAdvice}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium cursor-pointer hover:bg-white/20 transition-all"
                        >
                            <RefreshCw size={12} />
                            Retry
                        </button>
                    </div>
                )}

                {/* Advice result */}
                {advice && !loading && (
                    <div>
                        <div className="text-sm text-violet-100/90 leading-relaxed mb-5">
                            <ReactMarkdown
                                components={{
                                    p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1.5" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5" {...props} />,
                                    li: ({ node, ...props }) => <li className="marker:text-violet-400" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-semibold text-white tracking-wide" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-base font-bold text-white mt-4 mb-2" {...props} />,
                                    h4: ({ node, ...props }) => <h4 className="font-bold text-white mt-3 mb-1.5" {...props} />,
                                }}
                            >
                                {advice}
                            </ReactMarkdown>
                        </div>
                        <button
                            onClick={getAdvice}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs font-medium cursor-pointer hover:bg-white/20 transition-all"
                        >
                            <RefreshCw size={12} />
                            Get fresh advice
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

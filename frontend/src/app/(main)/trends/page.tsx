"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiGet } from "@/lib/api";
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface Snapshot {
    id: string;
    balance: number;
    burn_rate: number;
    runway_days: number;
    snapshot_date: string;
}

const PERIODS = [
    { label: "7d", value: 7 },
    { label: "14d", value: 14 },
    { label: "30d", value: 30 },
];

function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function formatPeso(value: number) {
    return `₱${value.toLocaleString("en-PH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
}

const chartTooltipStyle = {
    contentStyle: {
        background: "rgba(17, 24, 39, 0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        fontSize: "13px",
        color: "#e5e7eb",
    },
    labelStyle: { color: "#9ca3af" },
};

export default function TrendsPage() {
    const router = useRouter();
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30);

    useEffect(() => {
        const checkAuth = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }
            await loadSnapshots(period);
        };
        checkAuth();
    }, [router, period]);

    const loadSnapshots = async (days: number) => {
        setLoading(true);
        try {
            const res = await apiGet<{ data: Snapshot[] }>(
                `/api/snapshots?days=${days}`
            );
            setSnapshots(res.data);
        } catch {
            setSnapshots([]);
        } finally {
            setLoading(false);
        }
    };

    const chartData = snapshots.map((s) => ({
        date: formatDate(s.snapshot_date),
        balance: Number(s.balance),
        burnRate: Number(s.burn_rate),
        runway: Number(s.runway_days),
    }));

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <>
            <main className="mx-auto max-w-6xl px-6 pt-8 pb-12">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between animate-fade-in">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Trends
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Your financial health over time
                        </p>
                    </div>

                    {/* Period selector */}
                    <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                        {PERIODS.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${period === p.value
                                    ? "bg-gray-100 text-gray-900"
                                    : "text-gray-500 hover:text-gray-900"
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {chartData.length === 0 ? (
                    /* Empty state */
                    <div className="animate-fade-in flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 shadow-sm">
                        <span className="text-5xl mb-4">📊</span>
                        <h2 className="text-xl font-semibold text-gray-900">
                            No snapshot data yet
                        </h2>
                        <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
                            Snapshots are recorded daily when you use the app.
                            Check back after a few days to see your trends.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        {/* Balance Chart */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900">
                                💰 Balance
                            </h2>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient
                                            id="balanceGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="#10b981"
                                                stopOpacity={0.3}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="#10b981"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="rgba(0,0,0,0.05)"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#9ca3af"
                                        fontSize={12}
                                    />
                                    <YAxis
                                        stroke="#9ca3af"
                                        fontSize={12}
                                        tickFormatter={formatPeso}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: "#ffffff",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "12px",
                                            fontSize: "13px",
                                            color: "#111827",
                                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                        }}
                                        formatter={(value: number | undefined) => [
                                            formatPeso(value ?? 0),
                                            "Balance",
                                        ]}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="balance"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fill="url(#balanceGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Burn Rate Chart */}
                            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                                    🔥 Burn Rate
                                </h2>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="rgba(0,0,0,0.05)"
                                        />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#9ca3af"
                                            fontSize={12}
                                        />
                                        <YAxis
                                            stroke="#9ca3af"
                                            fontSize={12}
                                            tickFormatter={formatPeso}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "#ffffff",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: "12px",
                                                fontSize: "13px",
                                                color: "#111827",
                                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                            }}
                                            formatter={(value: number | undefined) => [
                                                formatPeso(value ?? 0),
                                                "Daily Burn",
                                            ]}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="burnRate"
                                            stroke="#f59e0b"
                                            strokeWidth={2}
                                            dot={{ fill: "#f59e0b", r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Runway Chart */}
                            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                                <h2 className="mb-4 text-lg font-semibold text-gray-900">
                                    📅 Runway Days
                                </h2>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="rgba(0,0,0,0.05)"
                                        />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#9ca3af"
                                            fontSize={12}
                                        />
                                        <YAxis
                                            stroke="#9ca3af"
                                            fontSize={12}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "#ffffff",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: "12px",
                                                fontSize: "13px",
                                                color: "#111827",
                                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                            }}
                                            formatter={(value: number | undefined) => [
                                                `${Math.round(value ?? 0)} days`,
                                                "Runway",
                                            ]}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="runway"
                                            stroke="#06b6d4"
                                            strokeWidth={2}
                                            dot={{ fill: "#06b6d4", r: 3 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

type FixedCost = {
    id: string;
    name: string;
    amount: number;
    due_day_of_month: number;
    frequency: string;
    due_day_of_week: number | null;
};

export default function FixedCostsPage() {
    const router = useRouter();
    const [costs, setCosts] = useState<FixedCost[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [day, setDay] = useState("1");
    const [frequency, setFrequency] = useState("monthly");
    const [dayOfWeek, setDayOfWeek] = useState("1");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadCosts();
    }, []);

    const loadCosts = async () => {
        setLoading(true);
        try {
            const res = await apiGet<{ data: FixedCost[] }>("/api/fixed-costs");
            setCosts(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !amount) return;
        setSubmitting(true);

        try {
            await apiPost("/api/fixed-costs", {
                name,
                amount: parseFloat(amount),
                due_day_of_month: parseInt(day),
                frequency,
                due_day_of_week: frequency === "weekly" ? parseInt(dayOfWeek) : null,
            });
            setName("");
            setAmount("");
            setDay("1");
            setFrequency("monthly");
            setDayOfWeek("1");
            loadCosts();
        } catch (err) {
            console.error(err);
            alert("Failed to add fixed cost");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this subscription?")) return;
        try {
            await apiDelete(`/api/fixed-costs/${id}`);
            setCosts(costs.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <main className="mx-auto max-w-4xl px-6 pt-8 pb-12">
            <div className="mb-8 animate-fade-in">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fixed Costs & Subscriptions</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Track your recurring monthly bills to see your real disposable income.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Form */}
                <div className="animate-fade-in rounded-2xl border border-gray-100 bg-white p-6 shadow-sm h-fit dark:bg-gray-900 dark:border-gray-800">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Add Subscription</h2>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Netflix, Rent"
                                className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-emerald-500/50"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Amount (₱)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-emerald-500/50"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Frequency</label>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-emerald-500/50"
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </div>
                        </div>
                        {frequency === "monthly" ? (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Due Day of Month</label>
                                <select
                                    value={day}
                                    onChange={(e) => setDay(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-emerald-500/50"
                                >
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Due Day of Week</label>
                                <select
                                    value={dayOfWeek}
                                    onChange={(e) => setDayOfWeek(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-emerald-500/50"
                                >
                                    <option value="1">Monday</option>
                                    <option value="2">Tuesday</option>
                                    <option value="3">Wednesday</option>
                                    <option value="4">Thursday</option>
                                    <option value="5">Friday</option>
                                    <option value="6">Saturday</option>
                                    <option value="7">Sunday</option>
                                </select>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                            {submitting ? "Adding..." : "Add Subscription"}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Commitments</h2>
                    {loading ? (
                        <div className="text-center py-8 text-gray-400 dark:text-gray-500">Loading...</div>
                    ) : costs.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-800">
                            <p className="text-sm text-gray-500 dark:text-gray-400">No subscriptions added yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {costs.map(c => (
                                <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:bg-gray-900 dark:border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {c.frequency === 'weekly'
                                                    ? `Every ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(c.due_day_of_week || 1) - 1]}`
                                                    : `Due day ${c.due_day_of_month}`
                                                }
                                                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium dark:bg-gray-800 dark:text-gray-400">
                                                    {c.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="font-semibold text-gray-900 dark:text-white">₱{c.amount.toLocaleString()}</p>
                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors dark:hover:text-red-400"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className="mt-6 rounded-xl bg-gray-50 p-4 border border-gray-100 dark:bg-gray-800/50 dark:border-gray-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Monthly Commitments</span>
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                        ₱{costs.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost } from "@/lib/api";
import { TrendingUp, TrendingDown, Wallet, PieChart, Plus, GraduationCap, Coffee } from "lucide-react";
import TransactionModal from "@/components/TransactionModal";
import AICoachCard from "@/components/AICoachCard";

interface RunwayData {
    balance: number;
    burn_rate: number;
    runway_days: number;
    status: string;
    message: string;
    free_to_spend: number;
    monthly_commitments: number;
    period_commitments: number;
}

interface Transaction {
    id: string;
    amount: number;
    category: string;
    description: string;
    transaction_type: string;
    transaction_date: string;
}

interface CategoryExpense {
    category: string;
    value: number;
    percent: number;
}

interface BillInfo {
    name: string;
    amount: number;
    reserve: number;
    due_day: number;
    frequency: string;
    is_due_this_period: boolean;
    days_until_due: number;
}

interface PendingBill {
    id: string;
    fixed_cost_id: string;
    name: string;
    amount: number;
    frequency: string;
    due_date: string;
    days_until_due: number;
    is_overdue: boolean;
}

interface FinancialRhythm {
    income: number;
    expense: number;
    saving: number;
    income_growth: number;
    expense_growth: number;
    saving_growth: number;
    days_remaining?: number;
    daily_safe_spend?: number;
    budget_status?: string;
    school_day_budget?: number;
    free_day_budget?: number;
    is_school_day_today?: boolean;
    period_commitments?: number;
    bill_reserve?: {
        total_reserve: number;
        monthly_total: number;
        bills: BillInfo[];
    };
}

export default function DashboardPage() {
    const router = useRouter();
    const pathname = usePathname();
    const [runway, setRunway] = useState<RunwayData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [rhythm, setRhythm] = useState<FinancialRhythm | null>(null);
    const [rhythmPeriod, setRhythmPeriod] = useState<"monthly" | "weekly">("weekly");
    const [displayName, setDisplayName] = useState("Student");
    const [lowRunwayThreshold, setLowRunwayThreshold] = useState(7);
    const [balance, setBalance] = useState(0);
    const [expensesByCategory, setExpensesByCategory] = useState<CategoryExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
    const [confirmingBillId, setConfirmingBillId] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }
            await loadProfile();
        };
        checkAuth();
    }, [router]);

    // Reload when rhythmPeriod changes
    useEffect(() => {
        if (balance) loadData(balance, true);
    }, [rhythmPeriod]);

    // Reload data when navigating back to dashboard
    useEffect(() => {
        if (pathname === "/dashboard" && !loading && balance) {
            loadData(balance, true);
        }
    }, [pathname]);

    const loadProfile = async () => {
        try {
            const profileRes = await apiGet<{ data: { initial_balance: number, display_name: string, alert_thresholds?: { low_runway_days: number } } }>("/api/profile");
            const userBalance = Number(profileRes.data.initial_balance) || 0;
            setBalance(userBalance);
            if (profileRes.data.display_name) {
                setDisplayName(profileRes.data.display_name);
            }
            if (profileRes.data.alert_thresholds?.low_runway_days) {
                setLowRunwayThreshold(profileRes.data.alert_thresholds.low_runway_days);
            }
            await loadData(userBalance);
        } catch {
            await loadData(0);
        }
    };

    const loadData = async (bal: number, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const daysParam = rhythmPeriod === "weekly" ? 7 : 30;
            const runwayPromise = apiGet<RunwayData>(`/api/runway?days=${daysParam}`).catch(err => {
                console.error("Runway fetch failed:", err);
                return null;
            });
            const txnPromise = apiGet<{ data: Transaction[] }>("/api/transactions?limit=5").catch(err => {
                console.error("Transactions fetch failed:", err);
                return null;
            });
            const rhythmPromise = apiGet<{ data: FinancialRhythm }>(`/api/financial-rhythm?period=${rhythmPeriod}`).catch(err => {
                console.error("Rhythm fetch failed:", err);
                return null;
            });
            const expensesPromise = apiGet<{ data: CategoryExpense[] }>("/api/expenses-by-category").catch(err => {
                console.error("Expenses fetch failed:", err);
                return null;
            });
            const billsPromise = apiGet<{ data: PendingBill[] }>("/api/pending-bills").catch(err => {
                console.error("Pending bills fetch failed:", err);
                return null;
            });

            const [runwayRes, txnRes, rhythmRes, expensesRes, billsRes] = await Promise.all([
                runwayPromise,
                txnPromise,
                rhythmPromise,
                expensesPromise,
                billsPromise
            ]);

            if (runwayRes) {
                setRunway(runwayRes);
            } else {
                setRunway(prev => prev || {
                    balance: bal,
                    burn_rate: 0,
                    runway_days: Infinity,
                    status: "healthy",
                    message: "Failed to load runway data. Check console.",
                    free_to_spend: 0,
                    monthly_commitments: 0,
                    period_commitments: 0,
                });
            }

            if (txnRes) setTransactions(txnRes.data);
            if (rhythmRes) setRhythm(rhythmRes.data);
            if (expensesRes) setExpensesByCategory(expensesRes.data);
            if (billsRes) setPendingBills(billsRes.data);

        } catch (error) {
            console.error("Dashboard loadData failed:", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleAddTransaction = async (data: {
        amount: number;
        category: string;
        description: string;
        transaction_type: string;
    }) => {
        // Optimistic Update
        const tempId = crypto.randomUUID();
        const newTxn: Transaction = {
            id: tempId,
            amount: data.amount,
            category: data.category,
            description: data.description,
            transaction_type: data.transaction_type,
            transaction_date: new Date().toISOString().split("T")[0],
        };

        setTransactions(prev => [newTxn, ...prev]);

        if (data.transaction_type === "expense") {
            setBalance(prev => prev - data.amount);
        } else {
            setBalance(prev => prev + data.amount);
        }

        try {
            await apiPost("/api/transactions", data);
            await loadData(balance, true);
        } catch (err) {
            console.error("Add transaction failed:", err);
            alert("Failed to add transaction. Check console.");
            setTransactions(prev => prev.filter(t => t.id !== tempId));
            if (data.transaction_type === "expense") {
                setBalance(prev => prev + data.amount);
            } else {
                setBalance(prev => prev - data.amount);
            }
        }
    };

    const handleBillConfirm = async (billId: string, status: "paid" | "skipped") => {
        setConfirmingBillId(billId);
        try {
            await apiPost(`/api/bills/${billId}/confirm`, { status });
            setPendingBills(prev => prev.filter(b => b.id !== billId));
            await loadData(balance, true);
        } catch (err) {
            console.error("Bill confirm failed:", err);
        } finally {
            setConfirmingBillId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
        );
    }

    // Calculate Spending Limit Percentage — subtract bill reserve from limit
    const billReserve = rhythm?.period_commitments ?? 0;
    const effectiveLimit = rhythm ? Math.max(rhythm.income - billReserve, 0) : 0;
    const spendingLimitPercent = effectiveLimit > 0
        ? Math.min((rhythm!.expense / effectiveLimit) * 100, 100)
        : 0;

    const daysUntilBroke = runway?.runway_days === Infinity ? "∞" : Math.floor(runway?.runway_days || 0);

    // Dynamic Safe Spend Logic
    // If budget exists (income > 0), use the backend calculated safe spend
    // If no budget (income == 0), fallback to Balance / Remaining Days
    let safeDailySpend = 0;

    // Calculate remaining days if rhythm data not yet available (fallback)
    const fallbackDays = rhythmPeriod === "weekly" ? 7 : 30;
    const daysRemaining = rhythm?.days_remaining || fallbackDays;

    if (rhythm?.budget_status === "no_budget" || !rhythm?.income) {
        // Fallback: Balance / Days Remaining
        safeDailySpend = (runway?.balance ?? balance) > 0
            ? ((runway?.balance ?? balance) / daysRemaining)
            : 0;
    } else {
        // Use backend calculated safe spend
        safeDailySpend = rhythm?.daily_safe_spend || 0;
    }

    return (
        <>
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Good morning, {displayName} 👋</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Here's your budget overview</p>
                </div>
                <button
                    onClick={() => setIsTransactionModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-gray-900/10 hover:bg-gray-800 transition-all dark:bg-white dark:text-gray-900"
                >
                    <Plus size={18} />
                    Add Transaction
                </button>
            </div>

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSubmit={handleAddTransaction}
            />

            <div className="mb-8 animate-fade-in">
                <AICoachCard />
            </div>

            {/* Alert Banner */}
            {runway && runway.runway_days < lowRunwayThreshold && (
                <div className="mb-8 rounded-xl bg-red-50 border border-red-100 p-4 flex items-start gap-3 animate-fade-in">
                    <div className="p-2 bg-white rounded-full text-red-500 shadow-sm">
                        <TrendingDown size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-red-800">Low Runway Warning</h3>
                        <p className="text-xs text-red-600 mt-1">
                            You have less than <b>{Math.floor(runway.runway_days)} days</b> of funs left based on your current spending.
                            Consider reducing expenses immediately.
                        </p>
                    </div>
                </div>
            )}

            {/* Current Balance */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</h2>
                </div>
                <div className="flex items-baseline gap-4">
                    <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
                        ₱{(runway?.balance ?? balance).toLocaleString("en-US")}
                    </h1>
                </div>

                <div className="mt-6 flex flex-wrap gap-4 animate-fade-in">
                    <div className="rounded-xl bg-emerald-50 px-4 py-3 border border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20">
                        <span className="block text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-1">Free to Spend</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            ₱{(runway?.free_to_spend ?? 0).toLocaleString()}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">Real disposable income</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-4 py-3 border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                        <span className="block text-xs font-bold uppercase text-gray-500 mb-1">{rhythmPeriod === "weekly" ? "Weekly" : "Monthly"} Bill Reserve</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            ₱{(runway?.period_commitments ?? 0).toLocaleString()}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                            Reserved for {rhythmPeriod === "weekly" ? "this week" : "this month"}
                        </p>
                    </div>
                </div>
                <div className="mt-2 text-sm text-gray-400">
                    {rhythm?.budget_status === "deficit" ? (
                        <span className="text-red-500 font-bold">⚠️ You are over budget! Stop spending to recover.</span>
                    ) : rhythm?.school_day_budget && rhythm?.free_day_budget && rhythm.school_day_budget !== rhythm.free_day_budget ? (
                        <div className="flex items-center gap-1.5">
                            {rhythm.is_school_day_today ? (
                                <GraduationCap size={16} className="text-violet-500" />
                            ) : (
                                <Coffee size={16} className="text-amber-500" />
                            )}
                            <span>
                                Today is a <span className={`font-semibold ${rhythm.is_school_day_today ? "text-violet-600 dark:text-violet-400" : "text-amber-600 dark:text-amber-400"}`}>
                                    {rhythm.is_school_day_today ? "school day" : "free day"}
                                </span> → safe to spend{" "}
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    ₱{safeDailySpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-gray-400 text-xs ml-1">
                                    ({rhythm.is_school_day_today ? "free days" : "school days"}: ₱{(rhythm.is_school_day_today ? rhythm.free_day_budget : rhythm.school_day_budget).toLocaleString(undefined, { maximumFractionDigits: 0 })})
                                </span>
                            </span>
                        </div>
                    ) : (
                        <>
                            You can spend <span className="font-semibold text-gray-900 dark:text-white">₱{safeDailySpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>/day to last per {rhythmPeriod} cycle ({daysRemaining} days left).
                        </>
                    )}
                </div>
            </div>

            {/* Spending Limit / Rhythm */}
            <div className="mb-12" >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {rhythmPeriod === "weekly" ? "Weekly" : "Monthly"} Spending Limit
                        </h3>
                    </div>
                    <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-xs font-medium text-gray-500">
                        <button
                            onClick={() => setRhythmPeriod("weekly")}
                            className={`rounded px-3 py-1 transition-all ${rhythmPeriod === "weekly" ? "bg-white text-gray-900 shadow-sm" : "hover:text-gray-900"}`}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => setRhythmPeriod("monthly")}
                            className={`rounded px-3 py-1 transition-all ${rhythmPeriod === "monthly" ? "bg-white text-gray-900 shadow-sm" : "hover:text-gray-900"}`}
                        >
                            Monthly
                        </button>
                    </div>
                </div>


                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:bg-gray-900 dark:border-gray-800">
                    {(rhythm?.income || 0) > 0 ? (
                        <>
                            <div className="mb-4 flex justify-between text-sm font-medium text-gray-500 dark:text-gray-400">
                                <span>₱{rhythm?.expense.toLocaleString() ?? "0"} spent</span>
                                <div className="text-right">
                                    <span>₱{effectiveLimit.toLocaleString()} {rhythmPeriod} limit</span>
                                    {billReserve > 0 && (
                                        <span className="block text-[10px] text-gray-400">
                                            ₱{rhythm?.income.toLocaleString()} - ₱{billReserve.toLocaleString()} bills
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="h-4 w-full rounded-full bg-gray-100 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${spendingLimitPercent > 90 ? "bg-red-500" : "bg-emerald-500"}`}
                                    style={{ width: `${spendingLimitPercent}%` }}
                                />
                            </div>
                            <div className="mt-2 text-right text-xs font-medium text-gray-500">
                                {spendingLimitPercent.toFixed(1)}% of budget used
                            </div>

                            {/* Bill Reserve Breakdown */}
                            {rhythm?.bill_reserve && rhythm.bill_reserve.bills.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Bill Reserve This Period</h4>
                                    <div className="space-y-2">
                                        {rhythm.bill_reserve.bills.map((bill, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2 w-2 rounded-full ${bill.is_due_this_period ? 'bg-orange-400 animate-pulse' : 'bg-gray-300'}`} />
                                                    <span className="text-gray-700 dark:text-gray-300">{bill.name}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 font-medium">
                                                        {bill.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                                                    </span>
                                                    {bill.is_due_this_period && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 font-medium">
                                                            Due in {bill.days_until_due}d
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-semibold text-gray-900 dark:text-gray-100">₱{bill.reserve.toLocaleString()}</span>
                                                    <span className="text-[10px] text-gray-400 ml-1">/{bill.frequency === 'weekly' ? 'wk' : 'mo'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pending Bills Confirmation */}
                            {pendingBills.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <h4 className="text-xs font-bold uppercase text-orange-500 mb-3 flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                                        Bills Due — Did you pay?
                                    </h4>
                                    <div className="space-y-3">
                                        {pendingBills.map((bill) => (
                                            <div key={bill.id} className="flex items-center justify-between rounded-xl bg-orange-50 dark:bg-orange-900/10 px-4 py-3 border border-orange-100 dark:border-orange-900/20">
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{bill.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        ₱{bill.amount.toLocaleString()} · {bill.frequency} · {bill.is_overdue ? (
                                                            <span className="text-red-500 font-semibold">Overdue!</span>
                                                        ) : (
                                                            `Due in ${bill.days_until_due}d`
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleBillConfirm(bill.id, "paid")}
                                                        disabled={confirmingBillId === bill.id}
                                                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                                                    >
                                                        ✓ Paid
                                                    </button>
                                                    <button
                                                        onClick={() => handleBillConfirm(bill.id, "skipped")}
                                                        disabled={confirmingBillId === bill.id}
                                                        className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-300 disabled:opacity-50 transition-colors dark:bg-gray-700 dark:text-gray-300"
                                                    >
                                                        Skip →
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-2">
                            <p className="text-gray-500 text-sm mb-2">No income recorded for this period.</p>
                            <p className="text-xs text-gray-400">Add an income transaction to set a spending limit.</p>
                        </div>
                    )}
                </div>
            </div >

            {/* Expenses by Category */}
            < div >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Expenses by Category</h3>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:bg-gray-900 dark:border-gray-800">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 text-xs font-medium text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Category</th>
                                <th className="px-6 py-4 font-semibold w-1/2">Distribution</th>
                                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {expensesByCategory.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No expenses found. Start spending!
                                    </td>
                                </tr>
                            ) : (
                                expensesByCategory.map((item) => (
                                    <tr key={item.category} className="hover:bg-gray-50/50 transition-colors dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">{item.category}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-1.5 w-full rounded-full bg-gray-100">
                                                    <div
                                                        className="h-1.5 rounded-full bg-blue-500"
                                                        style={{ width: `${item.percent}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-gray-500 w-8">{item.percent}%</span>
                                            </div>

                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                                            ₱{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div >
        </>
    );
}

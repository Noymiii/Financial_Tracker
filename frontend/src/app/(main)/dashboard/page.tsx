"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost } from "@/lib/api";
import { TrendingDown, Wallet, Plus, GraduationCap, Coffee, ArrowUpRight, Clock, ShieldCheck, Sparkles, Flame, Target, Zap } from "lucide-react";
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

const CATEGORIES: Record<string, { bg: string; fill: string; label: string; icon: React.ReactNode }> = {
    food: { bg: "bg-orange-50", fill: "bg-orange-400", label: "Food", icon: <span className="text-orange-500 text-lg">🍽</span> },
    transport: { bg: "bg-rose-50", fill: "bg-rose-400", label: "Transport", icon: <span className="text-rose-500 text-lg">🚌</span> },
    school: { bg: "bg-violet-50", fill: "bg-violet-400", label: "School", icon: <span className="text-violet-500 text-lg">📚</span> },
    entertainment: { bg: "bg-emerald-50", fill: "bg-emerald-400", label: "Entertainment", icon: <span className="text-emerald-500 text-lg">🎮</span> },
    utilities: { bg: "bg-amber-50", fill: "bg-amber-400", label: "Utilities", icon: <span className="text-amber-500 text-lg">⚡</span> },
    personal: { bg: "bg-sky-50", fill: "bg-sky-400", label: "Personal", icon: <span className="text-sky-500 text-lg">👤</span> },
    income: { bg: "bg-emerald-50", fill: "bg-emerald-400", label: "Income", icon: <span className="text-emerald-500 text-lg">💰</span> },
    other: { bg: "bg-gray-50", fill: "bg-gray-400", label: "Other", icon: <span className="text-gray-500 text-lg">📦</span> },
    uncategorized: { bg: "bg-gray-50", fill: "bg-gray-400", label: "Other", icon: <span className="text-gray-500 text-lg">📦</span> },
};

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

function getMotivation(status?: string, days?: number): string {
    if (status === "critical" || (days && days < 3))
        return "Time to tighten the belt. Every peso counts right now.";
    if (status === "warning" || (days && days < 7))
        return "A bit tight this week — focus on needs over wants.";
    return "You're doing great! Keep the momentum going.";
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
            if (!session) { router.push("/login"); return; }
            await loadProfile();
        };
        checkAuth();
    }, [router]);

    useEffect(() => { if (balance) loadData(balance, true); }, [rhythmPeriod]);
    useEffect(() => { if (pathname === "/dashboard" && !loading && balance) loadData(balance, true); }, [pathname]);

    const loadProfile = async () => {
        try {
            const profileRes = await apiGet<{ data: { initial_balance: number, display_name: string, alert_thresholds?: { low_runway_days: number } } }>("/api/profile");
            const userBalance = Number(profileRes.data.initial_balance) || 0;
            setBalance(userBalance);
            if (profileRes.data.display_name) setDisplayName(profileRes.data.display_name);
            if (profileRes.data.alert_thresholds?.low_runway_days) setLowRunwayThreshold(profileRes.data.alert_thresholds.low_runway_days);
            await loadData(userBalance);
        } catch { await loadData(0); }
    };

    const loadData = async (bal: number, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const daysParam = rhythmPeriod === "weekly" ? 7 : 30;
            const [runwayRes, txnRes, rhythmRes, expensesRes, billsRes] = await Promise.all([
                apiGet<RunwayData>(`/api/runway?days=${daysParam}`).catch(() => null),
                apiGet<{ data: Transaction[] }>("/api/transactions?limit=5").catch(() => null),
                apiGet<{ data: FinancialRhythm }>(`/api/financial-rhythm?period=${rhythmPeriod}`).catch(() => null),
                apiGet<{ data: CategoryExpense[] }>("/api/expenses-by-category").catch(() => null),
                apiGet<{ data: PendingBill[] }>("/api/pending-bills").catch(() => null),
            ]);

            if (runwayRes) setRunway(runwayRes);
            else setRunway(prev => prev || { balance: bal, burn_rate: 0, runway_days: Infinity, status: "healthy", message: "", free_to_spend: 0, monthly_commitments: 0, period_commitments: 0 });
            if (txnRes) setTransactions(txnRes.data);
            if (rhythmRes) setRhythm(rhythmRes.data);
            if (expensesRes) setExpensesByCategory(expensesRes.data);
            if (billsRes) setPendingBills(billsRes.data);
        } catch (error) { console.error("Dashboard loadData failed:", error); }
        finally { if (!silent) setLoading(false); }
    };

    const handleAddTransaction = async (data: { amount: number; category: string; description: string; transaction_type: string; }) => {
        const tempId = crypto.randomUUID();
        const newTxn: Transaction = { id: tempId, amount: data.amount, category: data.category, description: data.description, transaction_type: data.transaction_type, transaction_date: new Date().toISOString().split("T")[0] };
        setTransactions(prev => [newTxn, ...prev]);
        if (data.transaction_type === "expense") setBalance(prev => prev - data.amount);
        else setBalance(prev => prev + data.amount);
        try {
            await apiPost("/api/transactions", data);
            await loadData(balance, true);
        } catch (err) {
            console.error("Add transaction failed:", err);
            setTransactions(prev => prev.filter(t => t.id !== tempId));
            if (data.transaction_type === "expense") setBalance(prev => prev + data.amount);
            else setBalance(prev => prev - data.amount);
        }
    };

    const handleBillConfirm = async (billId: string, status: "paid" | "skipped") => {
        setConfirmingBillId(billId);
        try {
            await apiPost(`/api/bills/${billId}/confirm`, { status });
            setPendingBills(prev => prev.filter(b => b.id !== billId));
            await loadData(balance, true);
        } catch (err) { console.error("Bill confirm failed:", err); }
        finally { setConfirmingBillId(null); }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
                    <p className="text-sm text-gray-400 animate-pulse">Loading your finances...</p>
                </div>
            </div>
        );
    }

    const billReserve = rhythm?.period_commitments ?? 0;
    const effectiveLimit = rhythm ? Math.max(rhythm.income - billReserve, 0) : 0;
    const spendingLimitPercent = effectiveLimit > 0 ? Math.min((rhythm!.expense / effectiveLimit) * 100, 100) : 0;
    const fallbackDays = rhythmPeriod === "weekly" ? 7 : 30;
    const daysRemaining = rhythm?.days_remaining || fallbackDays;

    let safeDailySpend = 0;
    if (rhythm?.budget_status === "no_budget" || !rhythm?.income) {
        safeDailySpend = (runway?.balance ?? balance) > 0 ? ((runway?.balance ?? balance) / daysRemaining) : 0;
    } else {
        safeDailySpend = rhythm?.daily_safe_spend || 0;
    }

    const currentBalance = runway?.balance ?? balance;

    return (
        <div className="max-w-[860px] mx-auto">
            {/* ═══════════ Hero Section ═══════════ */}
            <div className="mb-10 animate-fade-in">
                {/* Greeting with personality */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {getGreeting()}, <span className="text-emerald-600 dark:text-emerald-400">{displayName}</span>
                        </h1>
                        <p className="text-sm text-gray-400 mt-1 max-w-md leading-relaxed">
                            {getMotivation(runway?.status, runway?.runway_days)}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsTransactionModalOpen(true)}
                        className="group flex items-center gap-2 rounded-full bg-emerald-500 pl-4 pr-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus size={16} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                        Add Transaction
                    </button>
                </div>

                {/* Balance — the hero moment */}
                <div className="relative rounded-3xl bg-gradient-to-br from-[#0f1b2d] via-[#162338] to-[#0d1926] p-8 overflow-hidden grain-overlay">
                    {/* Decorative orbs */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-500/8 rounded-full blur-3xl"></div>
                    <div className="absolute top-8 right-12 w-20 h-20 bg-emerald-400/15 rounded-full blur-xl animate-float"></div>

                    {/* Dot grid decoration */}
                    <svg className="absolute top-4 right-4 opacity-10" width="80" height="80" viewBox="0 0 80 80">
                        {Array.from({ length: 25 }).map((_, i) => (
                            <circle key={i} cx={(i % 5) * 18 + 8} cy={Math.floor(i / 5) * 18 + 8} r="1.5" fill="white" />
                        ))}
                    </svg>

                    <div className="relative z-10">
                        <p className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                            <Wallet size={14} className="text-emerald-400" />
                            Total Balance
                        </p>
                        <div className="flex items-baseline gap-3 mb-4">
                            <span className="text-5xl font-extrabold text-white tracking-tight">
                                ₱{currentBalance.toLocaleString("en-US")}
                            </span>
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold">
                                <ArrowUpRight size={12} />
                                Active
                            </div>
                        </div>

                        {/* Smart daily rhythm */}
                        <div className="text-sm text-gray-400">
                            {rhythm?.budget_status === "deficit" ? (
                                <span className="text-red-400 font-medium flex items-center gap-1.5">
                                    <Flame size={14} />
                                    Over budget — pause spending to recover.
                                </span>
                            ) : rhythm?.school_day_budget && rhythm?.free_day_budget && rhythm.school_day_budget !== rhythm.free_day_budget ? (
                                <div className="flex items-center gap-2">
                                    {rhythm.is_school_day_today ? (
                                        <GraduationCap size={14} className="text-violet-400" />
                                    ) : (
                                        <Coffee size={14} className="text-amber-400" />
                                    )}
                                    <span>
                                        <span className={`font-medium ${rhythm.is_school_day_today ? "text-violet-400" : "text-amber-400"}`}>
                                            {rhythm.is_school_day_today ? "School day" : "Free day"}
                                        </span>
                                        {" · "}safe to spend{" "}
                                        <span className="font-semibold text-white">₱{safeDailySpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <Target size={14} className="text-sky-400" />
                                    <span>
                                        Daily budget: <span className="font-semibold text-white">₱{safeDailySpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        <span className="text-gray-500 ml-1">· {daysRemaining} days left</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSubmit={handleAddTransaction}
            />

            {/* ═══════════ At-a-Glance Cards ═══════════ */}
            <div className="grid grid-cols-2 gap-5 mb-8">
                <div className="animate-fade-in-up stagger-1 rounded-2xl bg-gradient-to-br from-sky-50 to-sky-100/50 border border-sky-200/40 p-5 relative overflow-hidden dark:from-sky-900/20 dark:to-sky-900/10 dark:border-sky-800/30">
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-sky-300/20 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-8 w-8 rounded-full bg-sky-500/15 flex items-center justify-center">
                                <Wallet size={15} className="text-sky-600 dark:text-sky-400" />
                            </div>
                            <span className="text-xs font-semibold text-sky-600/80 dark:text-sky-400 uppercase tracking-wider">Free to Spend</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{(runway?.free_to_spend ?? 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1.5">Your real spending power</p>
                    </div>
                </div>

                <div className="animate-fade-in-up stagger-2 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-200/40 p-5 relative overflow-hidden dark:from-violet-900/20 dark:to-violet-900/10 dark:border-violet-800/30">
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-violet-300/20 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-8 w-8 rounded-full bg-violet-500/15 flex items-center justify-center">
                                <ShieldCheck size={15} className="text-violet-600 dark:text-violet-400" />
                            </div>
                            <span className="text-xs font-semibold text-violet-600/80 dark:text-violet-400 uppercase tracking-wider">Bill Reserve</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{(runway?.period_commitments ?? 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1.5">Set aside for bills this {rhythmPeriod === "weekly" ? "week" : "month"}</p>
                    </div>
                </div>
            </div>

            {/* ═══════════ AI Coach ═══════════ */}
            <div className="mb-8 animate-fade-in-up stagger-3">
                <AICoachCard />
            </div>

            {/* ═══════════ Alert ═══════════ */}
            {runway && runway.runway_days < lowRunwayThreshold && (
                <div className="mb-8 rounded-2xl bg-red-50 border border-red-100 p-5 flex items-start gap-4 animate-scale-in dark:bg-red-900/10 dark:border-red-900/30">
                    <div className="p-2.5 bg-red-100 rounded-xl text-red-500 flex-shrink-0 dark:bg-red-900/30">
                        <TrendingDown size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-red-800 dark:text-red-400 mb-0.5">Heads up — funds are running low</h3>
                        <p className="text-xs text-red-600/80 dark:text-red-300/60 leading-relaxed">
                            At your current pace, you have roughly <b>{Math.floor(runway.runway_days)} day{Math.floor(runway.runway_days) !== 1 ? "s" : ""}</b> of funds left.
                            Try to hold off on non-essentials.
                        </p>
                    </div>
                </div>
            )}

            {/* ═══════════ Spending Limit ═══════════ */}
            <div className="mb-8 animate-fade-in-up stagger-4">
                <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm dark:bg-[#181b24] dark:border-[#1e2230]">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                {rhythmPeriod === "weekly" ? "Weekly" : "Monthly"} Spending Limit
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Track your spending against your budget
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {rhythm?.bill_reserve && rhythm.bill_reserve.bills.filter(b => b.is_due_this_period).slice(0, 1).map((bill, i) => (
                                <div key={i} className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/15 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-800/30">
                                    <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <span className="text-white text-[8px] font-bold">{bill.name.charAt(0)}</span>
                                    </div>
                                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{bill.name}</span>
                                    <span className="text-[10px] text-amber-500">Due in {bill.days_until_due}d</span>
                                </div>
                            ))}
                            <div className="flex rounded-full bg-gray-100 dark:bg-[#242731] p-0.5 text-xs font-medium">
                                <button onClick={() => setRhythmPeriod("weekly")} className={`rounded-full px-3 py-1 transition-all ${rhythmPeriod === "weekly" ? "bg-white text-gray-900 shadow-sm dark:bg-[#363a47] dark:text-white" : "text-gray-500 hover:text-gray-800 dark:hover:text-white"}`}>Weekly</button>
                                <button onClick={() => setRhythmPeriod("monthly")} className={`rounded-full px-3 py-1 transition-all ${rhythmPeriod === "monthly" ? "bg-white text-gray-900 shadow-sm dark:bg-[#363a47] dark:text-white" : "text-gray-500 hover:text-gray-800 dark:hover:text-white"}`}>Monthly</button>
                            </div>
                        </div>
                    </div>

                    {(rhythm?.income || 0) > 0 ? (
                        <>
                            <div className="mb-2 flex justify-between items-baseline text-sm">
                                <span className="text-gray-500">
                                    <span className="font-bold text-gray-900 dark:text-white text-lg">₱{rhythm?.expense.toLocaleString() ?? "0"}</span>
                                    <span className="text-gray-400 ml-1">of ₱{effectiveLimit.toLocaleString()}</span>
                                </span>
                                {billReserve > 0 && (
                                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        <Clock size={11} className="text-amber-400" />
                                        ₱{billReserve.toLocaleString()} reserved
                                    </span>
                                )}
                            </div>
                            <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-[#242731] overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${spendingLimitPercent > 90 ? "bg-gradient-to-r from-red-400 to-orange-400" : "bg-gradient-to-r from-sky-500 via-emerald-400 to-emerald-500"}`}
                                    style={{ width: `${spendingLimitPercent}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                {spendingLimitPercent > 90 ? "⚠️ Almost at your limit!" : spendingLimitPercent > 50 ? "More than halfway through your budget" : "Plenty of room — keep it up!"}
                            </p>

                            {rhythm?.bill_reserve && rhythm.bill_reserve.bills.length > 0 && (
                                <div className="mt-5 pt-5 border-t border-gray-50 dark:border-[#242731]">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Upcoming Bills</p>
                                    <div className="space-y-2.5">
                                        {rhythm.bill_reserve.bills.map((bill, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm group">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`h-2 w-2 rounded-full ${bill.is_due_this_period ? 'bg-amber-400 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{bill.name}</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-[#242731] dark:text-gray-400">
                                                        {bill.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                                                    </span>
                                                    {bill.is_due_this_period && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 font-medium">
                                                            {bill.days_until_due}d left
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-semibold text-gray-900 dark:text-gray-100">₱{bill.reserve.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {pendingBills.length > 0 && (
                                <div className="mt-5 pt-5 border-t border-gray-50 dark:border-[#242731]">
                                    <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <Zap size={10} />
                                        Action needed
                                    </p>
                                    <div className="space-y-2">
                                        {pendingBills.map((bill) => (
                                            <div key={bill.id} className="flex items-center justify-between rounded-xl bg-amber-50/60 dark:bg-amber-900/10 px-4 py-3 border border-amber-100/60 dark:border-amber-900/20">
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{bill.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        ₱{bill.amount.toLocaleString()} · {bill.is_overdue ? (
                                                            <span className="text-red-500 font-semibold">Overdue</span>
                                                        ) : (`${bill.days_until_due}d left`)}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleBillConfirm(bill.id, "paid")} disabled={confirmingBillId === bill.id}
                                                        className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-all">
                                                        Paid
                                                    </button>
                                                    <button onClick={() => handleBillConfirm(bill.id, "skipped")} disabled={confirmingBillId === bill.id}
                                                        className="rounded-full bg-white border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all dark:bg-[#242731] dark:border-[#363a47] dark:text-gray-300">
                                                        Skip
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#242731] flex items-center justify-center mx-auto mb-3">
                                <Sparkles size={20} className="text-gray-400" />
                            </div>
                            <p className="text-gray-500 text-sm mb-1">No income recorded yet</p>
                            <p className="text-xs text-gray-400 max-w-[240px] mx-auto">Add an income transaction and your spending limit will appear here.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════ Expenses by Category ═══════════ */}
            <div className="mb-8 animate-fade-in-up stagger-5">
                <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm dark:bg-[#181b24] dark:border-[#1e2230]">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Where your money goes</h3>
                    <p className="text-xs text-gray-400 mb-5">This month&apos;s spending breakdown</p>

                    {expensesByCategory.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#242731] flex items-center justify-center mx-auto mb-3">
                                <Target size={20} className="text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-500">No expenses yet</p>
                            <p className="text-xs text-gray-400 mt-1">Your spending breakdown will show up here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {expensesByCategory.map((item) => {
                                const cat = CATEGORIES[item.category] || CATEGORIES.other;
                                return (
                                    <div key={item.category} className="group flex items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-[#1e2230]/50 -mx-2 px-2 py-1.5 rounded-xl transition-colors">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cat.bg} flex-shrink-0 transition-transform group-hover:scale-105`}>
                                            {cat.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{item.category}</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">₱{item.value.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-[#242731] overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${cat.fill}`}
                                                        style={{ width: `${Math.max(item.percent, 3)}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-medium text-gray-400 w-7 text-right tabular-nums">{item.percent}%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

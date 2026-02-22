"use client";

import { Bell, Moon, Sun, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiGet } from "@/lib/api";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: "warning" | "success" | "info";
    date: string;
}

interface Transaction {
    id: string;
    description: string;
    amount: number;
    transaction_date: string;
    transaction_type: string;
}

interface RightPanelProps {
    children?: React.ReactNode;
}

export default function RightPanel({ children }: RightPanelProps) {
    const router = useRouter();
    const [isDark, setIsDark] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const isDarkMode = document.documentElement.classList.contains("dark");
            setIsDark(isDarkMode);
        }

        fetchNotifications();
        fetchRecentTransactions();

        const interval = setInterval(() => {
            fetchNotifications();
            fetchRecentTransactions();
        }, 60000);

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            clearInterval(interval);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await apiGet<{ runway_days: number, status: string, message: string }>("/api/runway");
            const data = res;

            const newNotifs: Notification[] = [];

            if (data.status === 'critical' || data.status === 'warning') {
                newNotifs.push({
                    id: 'runway-alert',
                    title: 'Low Runway Warning',
                    message: data.message || `You have ${Math.floor(data.runway_days)} days of funding left.`,
                    type: 'warning',
                    date: new Date().toISOString()
                });
            } else {
                newNotifs.push({
                    id: 'runway-ok',
                    title: 'Financial Health',
                    message: "You are consistent with your spending limit.",
                    type: 'success',
                    date: new Date().toISOString()
                });
            }

            setNotifications(newNotifs);
            setUnreadCount(newNotifs.filter(n => n.type === 'warning').length);

        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    const fetchRecentTransactions = async () => {
        try {
            // Fetch recent transactions (slice the first 3 for the sidebar)
            const res = await apiGet<{ data: Transaction[] }>("/api/transactions?limit=3");

            // if limit parameter isn't respected by backend, we slice manually just in case
            if (res.data) {
                setRecentTransactions(res.data.slice(0, 3));
            }
        } catch (error) {
            console.error("Failed to fetch recent transactions", error);
        }
    };

    const toggleTheme = () => {
        const newMode = !isDark;
        setIsDark(newMode);
        if (newMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    const toggleNotifications = () => {
        setShowNotifications(!showNotifications);
        if (!showNotifications) {
            setUnreadCount(0);
        }
    };

    const getInitial = (name: string) => {
        if (!name) return "?";
        return name.charAt(0).toUpperCase();
    };

    const getIconColor = (type: string, index: number) => {
        if (type === 'income') return "from-emerald-400 to-emerald-600 shadow-emerald-400/30";
        const colors = [
            "from-blue-400 to-indigo-600 shadow-blue-400/30",
            "from-orange-400 to-red-500 shadow-orange-400/30",
            "from-fuchsia-400 to-purple-600 shadow-purple-400/30",
        ];
        return colors[index % colors.length];
    };

    return (
        <aside className="fixed right-0 top-0 h-screen w-[320px] border-l border-gray-100 bg-white p-6 hidden xl:flex flex-col dark:bg-gray-900 dark:border-gray-800 transition-colors z-30">
            {/* Top Toolbar */}
            <div className="mb-6 flex justify-end gap-2 relative">
                <button
                    onClick={toggleTheme}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                    title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={toggleNotifications}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                    >
                        <Bell size={16} />
                    </button>
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 animate-pulse"></span>
                    )}

                    {/* Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-fade-in">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center text-gray-400 text-sm">
                                        No new notifications
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div key={notif.id} className="p-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex gap-3">
                                                <div className={`mt-0.5 p-1.5 rounded-xl h-fit flex-shrink-0 ${notif.type === 'warning'
                                                    ? 'bg-red-100 text-red-500 dark:bg-red-900/20 dark:text-red-400'
                                                    : notif.type === 'success'
                                                        ? 'bg-emerald-100 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                        : 'bg-blue-100 text-blue-500'
                                                    }`}>
                                                    {notif.type === 'warning' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{notif.title}</h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{notif.message}</p>
                                                    <span className="text-[10px] text-gray-400 mt-2 block">Just now</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-6 overflow-y-auto pb-6 flex-1">
                {/* Injected Content */}
                {children}

                {/* Recent Transactions — derived from user data */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Transactions</h3>
                        <button
                            onClick={() => router.push('/transactions')}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1 group"
                        >
                            View all
                            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {recentTransactions.length === 0 ? (
                            <div className="text-sm text-center py-6 text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                                No recent activity
                            </div>
                        ) : (
                            recentTransactions.map((txn, index) => (
                                <div key={txn.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
                                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${getIconColor(txn.transaction_type, index)} text-white flex items-center justify-center font-bold text-xs shadow-sm`}>
                                        {getInitial(txn.description || txn.transaction_type)}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {txn.description || "Transaction"}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {format(new Date(txn.transaction_date), "MMM d, yyyy")}
                                        </p>
                                    </div>
                                    <p className={`text-sm font-bold ${txn.transaction_type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                                        {txn.transaction_type === 'income' ? '+' : '-'}₱{txn.amount.toLocaleString()}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}

"use client";

import { Bell, Moon, Sun, AlertTriangle, CheckCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiGet } from "@/lib/api";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: "warning" | "success" | "info";
    date: string;
}

interface RightPanelProps {
    children?: React.ReactNode;
}

export default function RightPanel({ children }: RightPanelProps) {
    const [isDark, setIsDark] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const isDarkMode = document.documentElement.classList.contains("dark");
            setIsDark(isDarkMode);
        }

        // Polling for notifications (runway status)
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Check every minute

        // Click outside to close
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
            // We'll use the runway status as a dynamic notification
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
                    title: 'Financial Health Healthy',
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
            setUnreadCount(0); // Mark as read when opened
        }
    };

    return (
        <aside className="fixed right-0 top-0 h-screen w-80 border-l border-gray-100 bg-white p-6 hidden xl:flex flex-col dark:bg-gray-900 dark:border-gray-800 transition-colors">
            {/* Top Toolbar */}
            <div className="mb-8 flex justify-end gap-3 px-2 relative">
                <button
                    onClick={toggleTheme}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                    title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={toggleNotifications}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <Bell size={18} />
                    </button>
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 animate-pulse"></span>
                    )}

                    {/* Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-fade-in">
                            <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-gray-400 text-sm">
                                        No new notifications
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div key={notif.id} className="p-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex gap-3">
                                                <div className={`mt-0.5 p-1.5 rounded-full h-fit flex-shrink-0 ${notif.type === 'warning'
                                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                    : notif.type === 'success'
                                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    {notif.type === 'warning' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{notif.title}</h4>
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

            <div className="space-y-8 overflow-y-auto pb-6 px-1">


                {/* Injected Content (Gauge/Transactions) */}
                {children}

                {/* Favorite Transaction (Mock) */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900">Favorite transaction</h3>
                        <button className="text-gray-400">•••</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="mb-4 h-8 w-8 rounded bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">Grab</div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Grabfood</p>
                            <p className="text-lg font-bold text-gray-900">$9,000</p>
                            <p className="text-[10px] text-gray-400 mt-1">Per month</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="mb-4 h-8 w-8 rounded bg-blue-500 text-white flex items-center justify-center font-bold text-[8px] text-center leading-none p-1">The<br />Trade<br />Desk</div>
                            <p className="text-xs font-medium text-gray-500 mb-1">The Trade Desk</p>
                            <p className="text-lg font-bold text-gray-900">$42,000</p>
                            <p className="text-[10px] text-gray-400 mt-1">Per month</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

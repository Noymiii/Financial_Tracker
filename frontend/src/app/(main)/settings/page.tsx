"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { Save, Bell, Smartphone, User, Wallet, Check, AlertTriangle } from "lucide-react";

interface UserProfile {
    id: string;
    display_name: string;
    initial_balance: number;
    currency: string;
    week_start_day?: string;
    month_start_day?: number;
    telegram_id?: number;
    alert_thresholds?: {
        low_runway_days: number;
        spending_spike_percent: number;
    };
}

export default function SettingsPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [linkToken, setLinkToken] = useState<string | null>(null);
    const [tokenTime, setTokenTime] = useState(0);

    // Form States
    const [displayName, setDisplayName] = useState("");
    const [balance, setBalance] = useState<number>(0);
    const [weekStart, setWeekStart] = useState("Monday");
    const [monthStart, setMonthStart] = useState<number>(1);
    const [lowRunway, setLowRunway] = useState<number>(7);
    const [spikePercent, setSpikePercent] = useState<number>(200);

    useEffect(() => {
        loadProfile();
    }, []);

    useEffect(() => {
        if (tokenTime > 0) {
            const timer = setInterval(() => setTokenTime(t => t - 1), 1000);
            return () => clearInterval(timer);
        } else if (linkToken) {
            setLinkToken(null);
        }
    }, [tokenTime, linkToken]);

    const loadProfile = async () => {
        try {
            const res = await apiGet<{ data: UserProfile }>("/api/profile");
            const data = res.data;
            setProfile(data);
            setDisplayName(data.display_name || "");
            setBalance(data.initial_balance);
            setWeekStart(data.week_start_day || "Monday");
            setMonthStart(data.month_start_day || 1);
            setLowRunway(data.alert_thresholds?.low_runway_days ?? 7);
            setSpikePercent(data.alert_thresholds?.spending_spike_percent ?? 200);
        } catch (error) {
            console.error("Failed to load profile", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            // Update Profile & Balance
            await apiPut("/api/profile", {
                display_name: displayName,
                initial_balance: balance,
                week_start_day: weekStart,
                month_start_day: monthStart
            });

            // Update Alerts
            await apiPost("/api/settings/alerts", {
                low_runway_days: lowRunway,
                spending_spike_percent: spikePercent
            });

            alert("Settings saved successfully!");
            loadProfile(); // Refresh
        } catch (error) {
            console.error("Failed to save settings", error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const handleConnectTelegram = async () => {
        try {
            const res = await apiPost<{ token: string; expires_in: number }>("/api/telegram/link", {});
            setLinkToken(res.token);
            setTokenTime(res.expires_in);
        } catch (error) {
            console.error("Failed to generate token", error);
            alert("Failed to generate link token.");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading settings...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account and preferences</p>
            </div>

            {/* Profile Section */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm dark:bg-gray-900 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <User size={20} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
                </div>

                <div className="grid gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-emerald-500/50"
                        />
                    </div>
                </div>
            </div>

            {/* Financial Section */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm dark:bg-gray-900 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <Wallet size={20} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Balance</h2>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Manual Balance Override</label>
                    <p className="text-xs text-gray-500 mb-2 dark:text-gray-400">Adjust this only if your calculated balance is out of sync with your real bank account.</p>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium dark:text-gray-500">₱</span>
                        <input
                            type="number"
                            value={balance}
                            onChange={(e) => setBalance(Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-200 pl-8 pr-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500/50"
                        />
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Weekly Budget Resets On</label>
                        <select
                            value={weekStart}
                            onChange={(e) => setWeekStart(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500/50"
                        >
                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                                <option key={day} value={day}>{day}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Monthly Budget Resets On</label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Day</span>
                            <input
                                type="number"
                                min="1" max="31"
                                value={monthStart}
                                onChange={(e) => setMonthStart(Number(e.target.value))}
                                className="w-20 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:focus:ring-blue-500/50"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">of every month</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts Section */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm dark:bg-gray-900 dark:border-gray-800" >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        <Bell size={20} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications & Alerts</h2>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Low Runway Warning</label>
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{lowRunway} days</span>
                        </div>
                        <input
                            type="range"
                            min="1" max="60"
                            value={lowRunway}
                            onChange={(e) => setLowRunway(Number(e.target.value))}
                            className="w-full accent-amber-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Receive an alert when you have less than {lowRunway} days of funds left.</p>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Spending Spike Sensitivity</label>
                            <span className="text-xs font-bold text-red-600 dark:text-red-400">{spikePercent}%</span>
                        </div>
                        <input
                            type="range"
                            min="100" max="500" step="10"
                            value={spikePercent}
                            onChange={(e) => setSpikePercent(Number(e.target.value))}
                            className="w-full accent-red-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Receive an alert when a single transaction exceeds {spikePercent}% of your daily average spending.</p>
                    </div>
                </div>
            </div >

            {/* Telegram Section */}
            < div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm dark:bg-gray-900 dark:border-gray-800" >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-sky-50 rounded-lg text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                        <Smartphone size={20} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Telegram Integration</h2>
                </div>

                {
                    profile?.telegram_id ? (
                        <div className="flex items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30">
                            <div className="p-2 bg-white rounded-full text-emerald-500 mr-3 dark:bg-emerald-900/50">
                                <Check size={16} strokeWidth={3} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Connected</p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-500">Your account is linked to Telegram.</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">
                                Connect your Telegram account to receive instant alerts and add transactions on the go.
                            </p>

                            {!linkToken ? (
                                <button
                                    onClick={handleConnectTelegram}
                                    className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Connect Telegram
                                </button>
                            ) : (
                                <div className="p-6 bg-gray-900 rounded-xl text-center">
                                    <p className="text-gray-400 text-sm mb-2">Send this code to the bot:</p>
                                    <div className="text-3xl font-mono font-bold text-white tracking-widest mb-4">
                                        /start {linkToken}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Expires in {Math.floor(tokenTime / 60)}:{(tokenTime % 60).toString().padStart(2, '0')}
                                    </p>
                                    <a
                                        href="https://t.me/CEIS_Bot"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block mt-4 text-sky-400 hover:text-sky-300 text-sm font-medium"
                                    >
                                        Open Telegram Bot &rarr;
                                    </a>
                                </div>
                            )}
                        </div>
                    )
                }
            </div >

            {/* Save Button */}
            < div className="flex justify-end pt-4" >
                <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                >
                    <Save size={18} />
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div >
        </div >
    );
}

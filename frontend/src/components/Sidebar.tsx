"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    CreditCard,
    Leaf,
    LogOut,
    User,
    Calendar,
    Settings,
    BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [displayName, setDisplayName] = useState("User");

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const res = await apiGet<{ data: { display_name: string } }>("/api/profile");
                    if (res.data?.display_name) {
                        setDisplayName(res.data.display_name);
                    }
                }
            } catch (e) {
                console.error("Failed to load sidebar profile", e);
            }
        };
        loadProfile();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const navItems = [
        { name: "Home", href: "/dashboard", icon: LayoutDashboard },
        { name: "Spending", href: "/transactions", icon: CreditCard },
        { name: "Fixed Costs", href: "/fixed-costs", icon: Calendar },
        { name: "Schedule", href: "/schedule", icon: BookOpen },
        { name: "Settings", href: "/settings", icon: Settings },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-gray-100 p-5 hidden lg:flex flex-col justify-between dark:bg-gray-900 dark:border-gray-800 transition-colors z-40">
                <div>
                    {/* Logo */}
                    <div className="mb-8 flex items-center gap-3 px-3 pt-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 shadow-sm shadow-emerald-500/10">
                            <Leaf size={22} />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white leading-tight block tracking-tight">Lefstyle</span>
                            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 leading-none block uppercase tracking-wider">Student</span>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="space-y-1.5 px-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-white"
                                        }`}
                                >
                                    <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* User Profile Footer */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 px-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-gray-800 dark:text-gray-400 shadow-sm">
                                <User size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{displayName}</p>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500">Premium Account</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2.5 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all dark:hover:bg-red-900/20"
                            title="Logout"
                        >
                            <LogOut size={16} strokeWidth={2} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation Component */}
            <nav className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-200 pb-safe pt-2 px-4 flex lg:hidden justify-between items-center dark:bg-gray-900/80 dark:border-gray-800 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 ${isActive
                                    ? "text-emerald-500 scale-105"
                                    : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                }`}
                        >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-1 transition-all ${isActive ? "bg-emerald-50 dark:bg-emerald-500/10" : ""}`}>
                                <item.icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[10px] font-medium tracking-tight ${isActive ? "font-bold" : ""}`}>
                                {item.name === "Fixed Costs" ? "Bills" : item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}

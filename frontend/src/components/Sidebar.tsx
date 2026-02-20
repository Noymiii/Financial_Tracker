"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    CreditCard,
    TrendingUp,
    Heart,
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
        <aside className="fixed left-0 top-0 h-screen w-64 border-r border-gray-100 bg-white p-6 hidden lg:flex flex-col justify-between dark:bg-gray-900 dark:border-gray-800 transition-colors">
            <div>
                {/* Logo */}
                <div className="mb-10 flex items-center gap-2 px-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Leaf size={20} />
                    </div>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">Lefstyle Student</span>
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${isActive
                                    ? "bg-gray-100/80 text-gray-900 dark:bg-gray-800 dark:text-white"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                                    }`}
                            >
                                <item.icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="space-y-6">


                {/* User Profile */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 px-2 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            <User size={16} />
                        </div>
                        <div className="text-xs">
                            <p className="font-medium text-gray-900 dark:text-white">{displayName}</p>
                            <p className="text-gray-400">Basic Plan</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}

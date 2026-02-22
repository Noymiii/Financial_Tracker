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
        <aside className="fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-gray-100 p-5 hidden lg:flex flex-col justify-between dark:bg-gray-900 dark:border-gray-800 transition-colors z-30">
            <div>
                {/* Logo — matching mockup: leaf icon + Lefstyle Student */}
                <div className="mb-8 flex items-center gap-3 px-3 pt-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
                        <Leaf size={22} />
                    </div>
                    <div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white leading-tight block">Lefstyle</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 leading-none block">Student</span>
                    </div>
                </div>

                {/* Navigation — green active state pill like mockup */}
                <nav className="space-y-1 px-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                                    }`}
                            >
                                <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* User Profile Footer — matching mockup */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 px-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-gray-800 dark:text-gray-400">
                            <User size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{displayName}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Premium Account</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all dark:hover:bg-red-900/20"
                        title="Logout"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}

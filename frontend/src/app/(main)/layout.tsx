"use client";

import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-[#f8f9fb] text-gray-900 font-sans dark:bg-[#0f1117] dark:text-white transition-colors">
            <Sidebar />
            <main className="flex-1 lg:ml-[260px] xl:mr-[320px] px-4 sm:px-8 py-8 pb-28 lg:pb-8 max-w-[960px]">
                {children}
            </main>
            <RightPanel />
        </div>
    );
}

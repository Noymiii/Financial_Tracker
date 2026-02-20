"use client";

import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-[#f9fafb] text-gray-900 font-sans dark:bg-gray-950 dark:text-white transition-colors">
            <Sidebar />
            <main className="flex-1 lg:ml-64 xl:mr-80 p-8">
                {children}
            </main>
            <RightPanel>
                {/* Default content for RightPanel if needed, or leave empty to be filled by page specific content via portal if we were using that pattern.
            For now, RightPanel content is static or page-specific logic needs to be lifted. 
            However, the design shows consistent RightPanel. 
            Let's keep the RightPanel generic here. 
            If pages need to inject content, we might need a context or just let them be static for now as per "copy ui" request.
        */}
            </RightPanel>
        </div>
    );
}

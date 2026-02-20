"use client";

import { useEffect, useRef } from "react";

interface ConfirmModalProps {
    open: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    open,
    title = "Confirm",
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    danger = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === "Escape") onCancel();
            };
            document.addEventListener("keydown", handleEsc);
            return () => document.removeEventListener("keydown", handleEsc);
        }
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center animate-modal-backdrop"
            onClick={onCancel}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div
                ref={dialogRef}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-gray-900/90 p-6 backdrop-blur-xl animate-modal-slide-up shadow-2xl"
            >
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                    {message}
                </p>

                <div className="mt-6 flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 transition-colors hover:bg-white/10"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all ${danger
                                ? "bg-red-500 shadow-lg shadow-red-500/25 hover:bg-red-600 hover:shadow-red-500/40"
                                : "bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

"use client";

import { X } from "lucide-react";
import TransactionForm from "./TransactionForm";

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        amount: number;
        category: string;
        description: string;
        transaction_type: string;
    }) => Promise<void>;
}

export default function TransactionModal({ isOpen, onClose, onSubmit }: TransactionModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-fade-in relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-full p-2 hover:bg-gray-100 text-gray-500 transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-gray-900 mb-6">Add Transaction</h2>

                <TransactionForm onSubmit={async (data) => {
                    await onSubmit(data);
                    onClose();
                }} />
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";

interface TransactionFormProps {
    onSubmit: (data: {
        amount: number;
        category: string;
        description: string;
        transaction_type: string;
    }) => Promise<void>;
    compact?: boolean;
}

const CATEGORIES = [
    "food",
    "transport",
    "school",
    "entertainment",
    "utilities",
    "personal",
    "other",
];

export default function TransactionForm({
    onSubmit,
    compact = false,
}: TransactionFormProps) {
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("food");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("expense");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) return;

        setLoading(true);
        try {
            await onSubmit({
                amount: parseFloat(amount),
                category,
                description,
                transaction_type: type,
            });
            setAmount("");
            setDescription("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type toggle */}
            <div className="flex gap-2 rounded-xl bg-gray-100 p-1">
                <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${type === "expense"
                        ? "bg-white text-red-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Expense
                </button>
                <button
                    type="button"
                    onClick={() => setType("income")}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${type === "income"
                        ? "bg-white text-emerald-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Income
                </button>
            </div>

            {/* Amount */}
            <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-500">
                    Amount
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        ₱
                    </span>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-8 pr-4 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                        required
                    />
                </div>
            </div>

            {/* Category */}
            {type === "expense" && (
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-500">
                        Category
                    </label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 px-4 text-gray-900 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    >
                        {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Description */}
            {!compact && (
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-500">
                        Note (optional)
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What was this for?"
                        maxLength={200}
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 px-4 text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white shadow-lg shadow-gray-900/10 transition-all hover:bg-gray-800 hover:shadow-gray-900/20 disabled:opacity-50"
            >
                {loading ? "Saving..." : "Add Transaction"}
            </button>
        </form>
    );
}

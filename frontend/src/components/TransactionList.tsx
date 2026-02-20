"use client";

interface Transaction {
    id: string;
    amount: number;
    category: string;
    description: string;
    transaction_type: string;
    transaction_date: string;
}

interface TransactionListProps {
    transactions: Transaction[];
    onDelete?: (id: string) => void | Promise<void>;
}

const CATEGORY_COLORS: Record<string, string> = {
    food: "bg-orange-500/20 text-orange-400",
    transport: "bg-blue-500/20 text-blue-400",
    school: "bg-purple-500/20 text-purple-400",
    entertainment: "bg-pink-500/20 text-pink-400",
    utilities: "bg-yellow-500/20 text-yellow-400",
    personal: "bg-cyan-500/20 text-cyan-400",
    income: "bg-emerald-500/20 text-emerald-400",
    other: "bg-gray-500/20 text-gray-400",
    uncategorized: "bg-gray-500/20 text-gray-400",
};

export default function TransactionList({
    transactions,
    onDelete,
}: TransactionListProps) {
    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-12 text-gray-500">
                <span className="text-4xl">📭</span>
                <p className="mt-2 text-sm">No transactions yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {transactions.map((txn) => {
                const isExpense = txn.transaction_type === "expense";
                const colorClass =
                    CATEGORY_COLORS[txn.category] || CATEGORY_COLORS.other;

                return (
                    <div
                        key={txn.id}
                        className="group flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 transition-all hover:border-gray-200 hover:shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">
                                {isExpense ? "🔴" : "🟢"}
                            </span>
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {txn.description || txn.category}
                                </p>
                                <div className="mt-0.5 flex items-center gap-2">
                                    <span
                                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${colorClass}`}
                                    >
                                        {txn.category}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {txn.transaction_date}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span
                                className={`text-sm font-bold ${isExpense ? "text-red-600" : "text-emerald-600"
                                    }`}
                            >
                                {isExpense ? "-" : "+"}₱
                                {txn.amount.toLocaleString("en-PH", {
                                    minimumFractionDigits: 2,
                                })}
                            </span>

                            {onDelete && (
                                <button
                                    onClick={() => onDelete(txn.id)}
                                    className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                                    title="Delete"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

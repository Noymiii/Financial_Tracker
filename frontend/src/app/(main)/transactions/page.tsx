"use client";

import { useState, useEffect } from "react";
import { apiGet, apiDelete, apiPut } from "@/lib/api";
import { format } from "date-fns";
import { Trash2, Edit2, Check, X, Search, Filter } from "lucide-react";

interface Transaction {
    id: string;
    amount: number;
    category: string;
    description: string;
    transaction_type: string;
    transaction_date: string;
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Transaction>>({});
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            const res = await apiGet<{ data: Transaction[] }>("/api/transactions?limit=100");
            setTransactions(res.data);
        } catch (error) {
            console.error("Failed to load transactions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this transaction?")) return;
        try {
            await apiDelete(`/api/transactions/${id}`);
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Failed to delete transaction");
        }
    };

    const startEdit = (txn: Transaction) => {
        setEditingId(txn.id);
        setEditForm(txn);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            const res = await apiPut<{ data: Transaction }>(`/api/transactions/${editingId}`, editForm);
            setTransactions(prev => prev.map(t => t.id === editingId ? res.data : t));
            setEditingId(null);
        } catch (error) {
            console.error("Failed to update", error);
            alert("Failed to update transaction");
        }
    };

    const filteredTransactions = transactions.filter(t => {
        const matchesFilter = filter === "all" || t.transaction_type === filter;
        const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) ||
            t.category.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (loading) return <div className="p-8 text-center text-gray-500">Loading transactions...</div>;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                    <p className="text-sm text-gray-500">Manage your financial history</p>
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                    >
                        <option value="all">All</option>
                        <option value="expense">Expenses</option>
                        <option value="income">Income</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/50 text-xs font-medium text-gray-500 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No transactions found.
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map((txn) => (
                                <tr key={txn.id} className="hover:bg-gray-50/50 transition-colors group">
                                    {editingId === txn.id ? (
                                        <>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="date"
                                                    value={editForm.transaction_date?.split('T')[0]}
                                                    onChange={e => setEditForm({ ...editForm, transaction_date: e.target.value })}
                                                    className="w-full rounded border-gray-200 text-xs p-1"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="text"
                                                    value={editForm.description}
                                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                    className="w-full rounded border-gray-200 text-xs p-1"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="text"
                                                    value={editForm.category}
                                                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                                    className="w-full rounded border-gray-200 text-xs p-1"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <input
                                                    type="number"
                                                    value={editForm.amount}
                                                    onChange={e => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                                                    className="w-24 rounded border-gray-200 text-xs p-1 text-right ml-auto"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={16} /></button>
                                                    <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={16} /></button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 text-gray-500 w-32">
                                                {format(new Date(txn.transaction_date), "MMM d, yyyy")}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {txn.description || "—"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                                    {txn.category}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${txn.transaction_type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                {txn.transaction_type === 'income' ? '+' : ''}₱{txn.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEdit(txn)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(txn.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { BookOpen, Save, GraduationCap, Coffee } from "lucide-react";

interface ScheduleDay {
    day_of_week: string;
    has_class: boolean;
}

export default function SchedulePage() {
    const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
    const [multiplier, setMultiplier] = useState(1.5);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSchedule();
    }, []);

    const loadSchedule = async () => {
        try {
            const res = await apiGet<{ data: ScheduleDay[]; multiplier: number }>("/api/schedule");
            setSchedule(res.data);
            setMultiplier(res.multiplier);
        } catch (error) {
            console.error("Failed to load schedule", error);
            // Fallback defaults
            setSchedule([
                { day_of_week: "Monday", has_class: true },
                { day_of_week: "Tuesday", has_class: true },
                { day_of_week: "Wednesday", has_class: true },
                { day_of_week: "Thursday", has_class: true },
                { day_of_week: "Friday", has_class: true },
                { day_of_week: "Saturday", has_class: false },
                { day_of_week: "Sunday", has_class: false },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const toggleDay = (dayOfWeek: string) => {
        setSchedule(prev =>
            prev.map(d =>
                d.day_of_week === dayOfWeek
                    ? { ...d, has_class: !d.has_class }
                    : d
            )
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiPut("/api/schedule", { days: schedule });
            await apiPut("/api/profile", { school_day_multiplier: multiplier });
            alert("Schedule saved! Your daily budgets have been adjusted.");
        } catch (error) {
            console.error("Failed to save schedule", error);
            alert("Failed to save schedule.");
        } finally {
            setSaving(false);
        }
    };

    const schoolDays = schedule.filter(d => d.has_class).length;
    const freeDays = schedule.filter(d => !d.has_class).length;

    // Preview calculation (example with ₱1000 remaining, 7 days)
    const exampleBudget = 1000;
    const weightedTotal = (schoolDays * multiplier) + (freeDays * 1.0);
    const exampleFree = weightedTotal > 0 ? exampleBudget / weightedTotal : 0;
    const exampleSchool = exampleFree * multiplier;

    const dayShort: Record<string, string> = {
        Monday: "Mon",
        Tuesday: "Tue",
        Wednesday: "Wed",
        Thursday: "Thu",
        Friday: "Fri",
        Saturday: "Sat",
        Sunday: "Sun",
    };

    if (loading) return <div className="p-8 text-center">Loading schedule...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Schedule</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Set your school days to get smarter daily budgets
                </p>
            </div>

            {/* Weekly Grid */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm dark:bg-gray-900 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-violet-50 rounded-lg text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                        <BookOpen size={20} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Schedule</h2>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Tap a day to toggle between <span className="font-semibold text-violet-600 dark:text-violet-400">school day</span> and <span className="font-semibold text-gray-600 dark:text-gray-300">free day</span>.
                </p>

                <div className="grid grid-cols-7 gap-2 sm:gap-3">
                    {schedule.map((day) => (
                        <button
                            key={day.day_of_week}
                            onClick={() => toggleDay(day.day_of_week)}
                            className={`
                                relative flex flex-col items-center gap-2 rounded-2xl p-4 sm:p-5 
                                border-2 transition-all duration-200 cursor-pointer
                                ${day.has_class
                                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-500"
                                    : "border-gray-200 bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600"
                                }
                            `}
                        >
                            <div className={`
                                flex h-10 w-10 items-center justify-center rounded-full transition-colors
                                ${day.has_class
                                    ? "bg-violet-500 text-white"
                                    : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                }
                            `}>
                                {day.has_class
                                    ? <GraduationCap size={18} />
                                    : <Coffee size={18} />
                                }
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wide ${day.has_class
                                    ? "text-violet-700 dark:text-violet-300"
                                    : "text-gray-500 dark:text-gray-400"
                                }`}>
                                {dayShort[day.day_of_week]}
                            </span>
                            <span className={`text-[10px] font-medium ${day.has_class
                                    ? "text-violet-500 dark:text-violet-400"
                                    : "text-gray-400 dark:text-gray-500"
                                }`}>
                                {day.has_class ? "Class" : "Free"}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="mt-6 flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-violet-500"></div>
                        <span><strong className="text-gray-900 dark:text-white">{schoolDays}</strong> school days</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                        <span><strong className="text-gray-900 dark:text-white">{freeDays}</strong> free days</span>
                    </div>
                </div>
            </div>

            {/* Multiplier */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm dark:bg-gray-900 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        <GraduationCap size={20} />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">School Day Multiplier</h2>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    How much more do you spend on school days? (transport, food on campus, etc.)
                </p>

                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Multiplier</span>
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{multiplier.toFixed(1)}×</span>
                </div>
                <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    value={multiplier}
                    onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1.0× (Same)</span>
                    <span>2.0× (Double)</span>
                    <span>3.0× (Triple)</span>
                </div>
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-violet-50 to-amber-50 rounded-2xl border border-violet-100 p-6 shadow-sm dark:from-violet-900/10 dark:to-amber-900/10 dark:border-violet-900/30">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Budget Preview</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Example: If you have ₱1,000 left for the week
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/80 rounded-xl p-4 border border-violet-200 dark:bg-gray-900/50 dark:border-violet-800">
                        <div className="flex items-center gap-2 mb-2">
                            <GraduationCap size={16} className="text-violet-600 dark:text-violet-400" />
                            <span className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase">School Day</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            ₱{exampleSchool.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">per day × {schoolDays} days</p>
                    </div>
                    <div className="bg-white/80 rounded-xl p-4 border border-gray-200 dark:bg-gray-900/50 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Coffee size={16} className="text-gray-500 dark:text-gray-400" />
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Free Day</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            ₱{exampleFree.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">per day × {freeDays} days</p>
                    </div>
                </div>

                {multiplier === 1.0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 font-medium">
                        💡 Tip: Set the multiplier above 1.0× to allocate more budget for school days.
                    </p>
                )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                >
                    <Save size={18} />
                    {saving ? "Saving..." : "Save Schedule"}
                </button>
            </div>
        </div>
    );
}

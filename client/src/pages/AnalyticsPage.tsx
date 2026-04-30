import { useEffect, useState } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import type { ChartOptions, TooltipItem } from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';


// ── Types ──────────────────────────────────────────────────────────────
interface KPIs {
    total_classes:     number;
    total_enrollments: number;
    total_waitlisted:  number;
    avg_fill_rate:     number;
}
interface ClassStat {
    class_id:  string;
    title:     string;
    category:  string;
    capacity:  number;
    active:    number;
    waitlisted: number;
    fill_rate: number;
}
interface DayTrend  { date: string; count: number }
interface CatDist   { category: string; count: number }
interface Analytics {
    kpis:                   KPIs;
    enrollment_per_class:   ClassStat[];
    daily_trend:            DayTrend[];
    category_distribution:  CatDist[];
}


// ── Chart theme colours (dark-mode friendly) ──────────────────────────
const EMERALD   = 'rgba(52, 211, 153, 0.85)';
const EMERALD_B = 'rgba(52, 211, 153, 1)';
const AMBER     = 'rgba(251, 191, 36, 0.7)';
const AMBER_B   = 'rgba(251, 191, 36, 1)';
const SLATE     = 'rgba(100, 116, 139, 0.5)';


const CAT_COLORS: Record<string, string> = {
    opening:    'rgba(99, 179, 237, 0.85)',
    middlegame: 'rgba(167, 139, 250, 0.85)',
    endgame:    'rgba(251, 191, 36, 0.85)',
    tactics:    'rgba(252, 129, 74, 0.85)',
};


// ── Shared chart options base ─────────────────────────────────────────
const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: { color: '#94a3b8', font: { size: 12 } }
        },
    },
    scales: {
        x: {
            ticks: { color: '#64748b', font: { size: 11 } },
            grid:  { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
            ticks: { color: '#64748b', font: { size: 11 } },
            grid:  { color: 'rgba(255,255,255,0.06)' },
            beginAtZero: true,
        },
    },
};


export default function AnalyticsPage() {
    useAuth();
    const [data, setData]               = useState<Analytics | null>(null);
    const [loading, setLoading]         = useState(true);
    const [activeChart, setActiveChart] = useState<'bar' | 'line' | 'doughnut'>('bar');


    useEffect(() => {
        api.get('/analytics/coach')
            .then(r => setData(r.data))
            .finally(() => setLoading(false));
    }, []);


    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center
        justify-center text-slate-400 animate-pulse">
            Loading analytics...
        </div>
    );


    if (!data) return null;


    // ── Bar chart — enrolled + waitlisted per class ────────────────────
    const barData = {
        labels: data.enrollment_per_class.map(c => c.title),
        datasets: [
            {
                label: 'Active',
                data:  data.enrollment_per_class.map(c => c.active),
                backgroundColor: EMERALD,
                borderColor:     EMERALD_B,
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'Waitlisted',
                data:  data.enrollment_per_class.map(c => c.waitlisted),
                backgroundColor: AMBER,
                borderColor:     AMBER_B,
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'Remaining',
                data:  data.enrollment_per_class.map(c => c.capacity - c.active),
                backgroundColor: SLATE,
                borderColor:     'rgba(100,116,139,0.8)',
                borderWidth: 1,
                borderRadius: 4,
            },
        ],
    };


    const barOptions: ChartOptions<'bar'> = {
        ...baseOptions,
        plugins: {
            ...baseOptions.plugins,
            title: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    afterLabel: (ctx: TooltipItem<'bar'>) => {
                        const mc = data.enrollment_per_class[ctx.dataIndex];
                        return `Fill rate: ${mc.fill_rate}%`;
                    },
                },
            },
        },
        scales: {
            ...baseOptions.scales,
            x: { ...baseOptions.scales.x, stacked: true },
            y: { ...baseOptions.scales.y, stacked: true },
        },
    };


    // ── Line chart — daily enrollment trend ───────────────────────────
    // Compute rolling 7-day average
    const rawCounts = data.daily_trend.map(d => d.count);
    const rollingAvg = rawCounts.map((_, i) => {
        const slice = rawCounts.slice(Math.max(0, i - 6), i + 1);
        return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 10) / 10;
    });


    const lineData = {
        labels: data.daily_trend.map(d =>
            new Date(d.date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short',
            })
        ),
        datasets: [
            {
                label: 'Enrollments',
                data:  rawCounts,
                borderColor:          EMERALD_B,
                backgroundColor:      'rgba(52,211,153,0.08)',
                pointBackgroundColor: EMERALD_B,
                pointRadius: 3,
                tension: 0.3,
                fill: true,
            },
            {
                label: '7-day avg',
                data:  rollingAvg,
                borderColor:     AMBER_B,
                backgroundColor: 'transparent',
                pointRadius: 0,
                borderDash: [4, 4],
                tension: 0.3,
                fill: false,
            },
        ],
    };


    const lineOptions: ChartOptions<'line'> = {
        ...baseOptions,
        plugins: {
            ...baseOptions.plugins,
        },
    };


    // ── Doughnut — category distribution ─────────────────────────────
    const doughnutData = {
        labels: data.category_distribution.map(c =>
            c.category.charAt(0).toUpperCase() + c.category.slice(1)
        ),
        datasets: [{
            data:            data.category_distribution.map(c => c.count),
            backgroundColor: data.category_distribution.map(c => CAT_COLORS[c.category]),
            borderColor:     '#1e293b',
            borderWidth: 3,
            hoverOffset: 8,
        }],
    };


    const doughnutOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels:   { color: '#94a3b8', font: { size: 12 }, padding: 16 },
            },
            tooltip: {
                callbacks: {
                    label: (ctx: TooltipItem<'doughnut'>) => {
                        const total = (ctx.dataset.data as number[]).reduce(
                            (a, b) => a + b,
                            0,
                        );
                        const pct = Math.round((ctx.parsed / total) * 100);
                        return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                    },
                },
            },
        },
    };


    return (
        <div className="min-h-screen bg-slate-950 text-white">

            {/* ── Header ── */}
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-4
            flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <a href="/" className="flex items-center gap-2 hover:opacity-80 transition">
                        <span className="text-2xl">♟</span>
                        <span className="font-bold text-lg">Chess Arena</span>
                    </a>
                    <span className="text-slate-600">/ Analytics</span>
                </div>
                <a href="/coach"
                    className="text-sm text-slate-400 hover:text-white transition">
                    ← Dashboard
                </a>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">

                <div className="mb-7">
                    <h2 className="text-2xl font-bold">Your Analytics</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Performance overview across all your masterclasses
                    </p>
                </div>

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        {
                            label: 'Total Classes',
                            value: data.kpis.total_classes,
                            icon:  '📋',
                            color: 'text-white',
                        },
                        {
                            label: 'Active Enrollments',
                            value: data.kpis.total_enrollments,
                            icon:  '👥',
                            color: 'text-emerald-400',
                        },
                        {
                            label: 'Waitlisted',
                            value: data.kpis.total_waitlisted,
                            icon:  '⏳',
                            color: 'text-amber-400',
                        },
                        {
                            label: 'Avg Fill Rate',
                            value: `${data.kpis.avg_fill_rate}%`,
                            icon:  '📈',
                            color: data.kpis.avg_fill_rate >= 75
                                ? 'text-emerald-400'
                                : data.kpis.avg_fill_rate >= 40
                                    ? 'text-amber-400'
                                    : 'text-red-400',
                        },
                    ].map(({ label, value, icon, color }) => (
                        <div key={label}
                            className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-slate-400 text-xs">{label}</p>
                                <span className="text-xl">{icon}</span>
                            </div>
                            <p className={`text-3xl font-bold ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* ── Empty state ── */}
                {data.enrollment_per_class.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <p className="text-5xl mb-4">📊</p>
                        <p className="text-lg font-medium text-slate-400 mb-1">
                            No data yet
                        </p>
                        <p className="text-sm">
                            Create masterclasses and get enrollments to see analytics
                        </p>
                        <a href="/coach"
                            className="inline-block mt-4 text-emerald-400
                            hover:text-emerald-300 text-sm transition">
                            Go to Dashboard →
                        </a>
                    </div>
                ) : (
                    <>
                        {/* ── Chart Tab Switcher ── */}
                        <div className="flex gap-2 mb-6">
                            {([
                                { key: 'bar',      label: '📊 Enrollments per Class' },
                                { key: 'line',     label: '📈 Daily Trend'           },
                                { key: 'doughnut', label: '🍩 By Category'           },
                            ] as const).map(({ key, label }) => (
                                <button key={key}
                                    onClick={() => setActiveChart(key)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium
                                    transition ${
                                        activeChart === key
                                            ? 'bg-emerald-500 text-slate-950'
                                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                                    }`}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* ── Chart Panel ── */}
                        <div className="bg-slate-900 border border-slate-800
                        rounded-2xl p-6 mb-8">

                            {/* Bar — Enrollments per Class */}
                            {activeChart === 'bar' && (
                                <>
                                    <h3 className="text-sm font-semibold text-slate-300 mb-1">
                                        Enrollments per Masterclass
                                    </h3>
                                    <p className="text-slate-500 text-xs mb-5">
                                        Active · Waitlisted · Remaining seats (stacked)
                                    </p>
                                    <div style={{ height: '340px' }}>
                                        <Bar data={barData} options={barOptions} />
                                    </div>
                                </>
                            )}

                            {/* Line — Daily Trend */}
                            {activeChart === 'line' && (
                                <>
                                    <h3 className="text-sm font-semibold text-slate-300 mb-1">
                                        Daily Enrollment Trend — Last 30 Days
                                    </h3>
                                    <p className="text-slate-500 text-xs mb-5">
                                        Raw count vs 7-day rolling average
                                    </p>
                                    <div style={{ height: '340px' }}>
                                        <Line data={lineData} options={lineOptions} />
                                    </div>
                                </>
                            )}

                            {/* Doughnut — By Category */}
                            {activeChart === 'doughnut' && (
                                <>
                                    <h3 className="text-sm font-semibold text-slate-300 mb-1">
                                        Active Enrollments by Category
                                    </h3>
                                    <p className="text-slate-500 text-xs mb-5">
                                        Which topics attract the most students
                                    </p>
                                    <div style={{ height: '340px' }}>
                                        <Doughnut data={doughnutData} options={doughnutOptions} />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ── Class Performance Table ── */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
                            <h3 className="text-sm font-semibold text-slate-300 mb-4">
                                Class Performance Breakdown
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-slate-500 text-xs border-b border-slate-800">
                                            <th className="text-left pb-3 font-medium">Class</th>
                                            <th className="text-left pb-3 font-medium">Category</th>
                                            <th className="text-right pb-3 font-medium">Capacity</th>
                                            <th className="text-right pb-3 font-medium">Active</th>
                                            <th className="text-right pb-3 font-medium">Waitlist</th>
                                            <th className="text-left pb-3 font-medium pl-4">Fill Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {data.enrollment_per_class.map(mc => (
                                            <tr key={mc.class_id}
                                                className="hover:bg-slate-800/50 transition">
                                                <td className="py-3 text-white font-medium pr-4">
                                                    <a href={`/class/${mc.class_id}`}
                                                        className="hover:text-emerald-400 transition">
                                                        {mc.title}
                                                    </a>
                                                </td>
                                                <td className="py-3">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full
                                                    capitalize ${
                                                        {
                                                            opening:    'bg-blue-500/20 text-blue-400',
                                                            middlegame: 'bg-purple-500/20 text-purple-400',
                                                            endgame:    'bg-amber-500/20 text-amber-400',
                                                            tactics:    'bg-red-500/20 text-red-400',
                                                        }[mc.category]
                                                    }`}>
                                                        {mc.category}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right text-slate-400 tabular-nums">
                                                    {mc.capacity}
                                                </td>
                                                <td className="py-3 text-right text-emerald-400 tabular-nums font-semibold">
                                                    {mc.active}
                                                </td>
                                                <td className="py-3 text-right text-amber-400 tabular-nums">
                                                    {mc.waitlisted}
                                                </td>
                                                <td className="py-3 pl-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 bg-slate-800 rounded-full h-1.5">
                                                            <div
                                                                className={`h-1.5 rounded-full transition-all ${
                                                                    mc.fill_rate >= 75 ? 'bg-emerald-500'
                                                                    : mc.fill_rate >= 40 ? 'bg-amber-500'
                                                                    : 'bg-red-500'
                                                                }`}
                                                                style={{ width: `${mc.fill_rate}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-slate-400 text-xs tabular-nums">
                                                            {mc.fill_rate}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ── Individual Class Cards ── */}
                        <h3 className="text-sm font-semibold text-slate-300 mb-4">
                            Individual Class Analytics
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {data.enrollment_per_class.map(mc => {
                                const occupancy  = mc.capacity > 0 ? Math.round((mc.active / mc.capacity) * 100) : 0;
                                const demand     = mc.active + mc.waitlisted;
                                const demandRatio = mc.capacity > 0 ? Math.round((demand / mc.capacity) * 100) : 0;
                                return (
                                    <div key={mc.class_id}
                                        className="bg-slate-900 border border-slate-800 rounded-2xl p-5
                                        hover:border-slate-700 transition">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                                                    CAT_COLORS[mc.category] ? 'text-white' : 'text-slate-400'
                                                }`}
                                                style={{ backgroundColor: CAT_COLORS[mc.category] || '#334155' }}>
                                                {mc.category}
                                            </span>
                                            <a href={`/class/${mc.class_id}`}
                                                className="font-semibold text-white text-sm truncate
                                                hover:text-emerald-400 transition flex-1">
                                                {mc.title}
                                            </a>
                                        </div>

                                        {/* Stat grid */}
                                        <div className="grid grid-cols-3 gap-3 mb-3">
                                            <div className="bg-slate-800 rounded-xl px-3 py-2 text-center">
                                                <p className="text-lg font-bold text-emerald-400">{mc.active}</p>
                                                <p className="text-slate-500 text-xs">Active</p>
                                            </div>
                                            <div className="bg-slate-800 rounded-xl px-3 py-2 text-center">
                                                <p className="text-lg font-bold text-amber-400">{mc.waitlisted}</p>
                                                <p className="text-slate-500 text-xs">Waitlisted</p>
                                            </div>
                                            <div className="bg-slate-800 rounded-xl px-3 py-2 text-center">
                                                <p className="text-lg font-bold text-blue-400">{mc.capacity - mc.active}</p>
                                                <p className="text-slate-500 text-xs">Seats Left</p>
                                            </div>
                                        </div>

                                        {/* Fill rate bar */}
                                        <div className="mb-2">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-500">Occupancy</span>
                                                <span className="text-slate-400">{occupancy}%</span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-2">
                                                <div className={`h-2 rounded-full transition-all ${
                                                    occupancy >= 75 ? 'bg-emerald-500' : occupancy >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                                }`} style={{ width: `${occupancy}%` }} />
                                            </div>
                                        </div>

                                        {/* Demand indicator */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-500">Demand (active + waitlist)</span>
                                                <span className="text-slate-400">{demandRatio}% of capacity</span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-2">
                                                <div className="h-2 rounded-full bg-purple-500 transition-all"
                                                    style={{ width: `${Math.min(demandRatio, 100)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

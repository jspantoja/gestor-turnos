
import React, { useMemo } from 'react';
import { Users, UserCheck, UserMinus, Activity, TrendingUp, CheckSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { toLocalISOString, getShift } from '../../utils/helpers';
import { SHIFT_COLORS, SHIFT_TYPES } from '../../config/constants';

const DashboardView = ({ workers, shifts, currentDate, settings }) => {

    // --- STATISTICS CALCULATION ---
    const stats = useMemo(() => {
        const todayStr = toLocalISOString(new Date());
        const activeWorkers = workers.filter(w => w.isActive !== false);

        // 1. Today's Overview
        let workingToday = 0;
        let restingToday = 0;
        let absentToday = 0; // Sick, vacation, etc.

        const workingTypes = ['morning', 'afternoon', 'night', 'custom'];
        const absentTypes = ['sick', 'vacation', 'permit', 'license'];

        activeWorkers.forEach(w => {
            const shift = getShift(shifts, w.id, todayStr);
            if (workingTypes.includes(shift.type) || (shift.type === 'custom' && !absentTypes.some(t => shift.code?.toLowerCase().includes(t)))) {
                workingToday++;
            } else if (shift.type === 'off' || shift.type === 'unassigned') {
                restingToday++;
            } else {
                absentToday++;
            }
        });

        // 2. Weekly Distribution (Start from Monday of current view)
        // We Use 'currentDate' from props to determine the week being viewed or just "This Week"?
        // Let's use the current week relative to TODAY for relevance in a Dashboard.
        const startOfWeek = new Date();
        const day = startOfWeek.getDay() || 7;
        startOfWeek.setDate(startOfWeek.getDate() - (day - 1)); // Monday

        const weeklyData = [];
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            const dStr = toLocalISOString(d);

            let count = 0;
            activeWorkers.forEach(w => {
                const s = getShift(shifts, w.id, dStr);
                if (workingTypes.includes(s.type) || s.type === 'custom') count++;
            });
            weeklyData.push({ name: days[i], turnos: count });
        }

        // 3. Shift Type Distribution (Global or Monthly?) -> Let's do Monthly relative to currentDate
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const typesCount = {};

        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
            const dStr = toLocalISOString(d);
            activeWorkers.forEach(w => {
                const s = getShift(shifts, w.id, dStr);
                if (s.type !== 'unassigned') {
                    let label;
                    if (s.type === 'custom') {
                        // Priority: Look up in Settings -> Saved Name -> 'Personalizado'
                        const customDef = settings.customShifts?.find(cs => cs.id === s.customShiftId || cs.code === s.code);
                        label = customDef?.name || s.customShiftName || 'Personalizado';
                    } else {
                        // Standard types or specific custom statuses (like absences)
                        label = SHIFT_TYPES[s.type]?.label || settings.customStatuses?.find(cs => cs.id === s.type)?.name || 'Otro';
                    }
                    typesCount[label] = (typesCount[label] || 0) + 1;
                }
            });
        }

        // Helper to get color for a label
        const getLabelColor = (label, type) => {
            if (type === 'morning') return '#3B82F6'; // blue
            if (type === 'afternoon') return '#F97316'; // orange
            if (type === 'night') return '#4F46E5'; // indigo
            if (type === 'off') return '#64748b'; // slate

            // For custom shifts or others, try to find in settings or use default
            const customStatus = settings.customStatuses?.find(cs => cs.name === label);
            if (customStatus?.color) return SHIFT_COLORS.find(c => c.id === customStatus.color)?.hex || '#8b5cf6';

            const customShift = settings.customShifts?.find(cs => cs.name === label);
            if (customShift?.color) return SHIFT_COLORS.find(c => c.id === customShift.color)?.hex || '#8b5cf6';

            return '#8b5cf6'; // default violet
        };

        const pieData = Object.entries(typesCount)
            .map(([name, value]) => ({
                name,
                value,
                color: getLabelColor(name, Object.keys(SHIFT_TYPES).find(k => SHIFT_TYPES[k].label === name))
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Top 6

        // 4. Task Compliance
        let totalTasks = 0;
        let completedTasks = 0;
        const workerCompliance = [];

        activeWorkers.forEach(w => {
            const tasks = (w.notes || []).filter(n => n.type === 'task');
            if (tasks.length > 0) {
                const completed = tasks.filter(t => t.checked).length;
                totalTasks += tasks.length;
                completedTasks += completed;
                workerCompliance.push({
                    id: w.id,
                    name: w.name,
                    total: tasks.length,
                    completed: completed,
                    percentage: Math.round((completed / tasks.length) * 100),
                    color: w.color || '#8E8E93'
                });
            }
        });

        const globalCompliance = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const topCompliant = [...workerCompliance].sort((a, b) => b.percentage - a.percentage).slice(0, 5);

        return {
            totalWorkers: activeWorkers.length,
            workingToday,
            restingToday,
            absentToday,
            weeklyData,
            pieData,
            globalCompliance,
            totalTasks,
            topCompliant
        };
    }, [workers, shifts, currentDate, settings]);

    // --- RENDER HELPERS ---
    const StatCard = ({ title, value, sub, icon: Icon, color }) => (
        <div className="p-6 rounded-2xl border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-sm flex items-start justify-between relative overflow-hidden group">
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 bg-${color}-500 blur-2xl transition-all group-hover:scale-150`} />
            <div>
                <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-[var(--text-primary)]">{value}</h3>
                {sub && <p className="text-[var(--text-tertiary)] text-[10px] mt-1">{sub}</p>}
            </div>
            <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500`}>
                <Icon size={24} />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full animate-enter p-6 overflow-y-auto pb-32">

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Dashboard Operativo</h1>
                <p className="text-[var(--text-secondary)]">Resumen en tiempo real de la gestión de turnos.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard
                    title="Personal Activo"
                    value={stats.totalWorkers}
                    icon={Users}
                    color="blue"
                />
                <StatCard
                    title="Trabajando Hoy"
                    value={stats.workingToday}
                    sub={`${Math.round((stats.workingToday / stats.totalWorkers) * 100)}% de la fuerza laboral`}
                    icon={Activity}
                    color="green"
                />
                <StatCard
                    title="Cumplimiento Tareas"
                    value={`${stats.globalCompliance}%`}
                    sub={`${stats.totalTasks} tareas totales asignadas`}
                    icon={CheckSquare}
                    color="purple"
                />
                <StatCard
                    title="Descansando"
                    value={stats.restingToday}
                    icon={UserCheck}
                    color="gray"
                />
                <StatCard
                    title="Ausencias"
                    value={stats.absentToday}
                    sub="Incapacidades, vacaciones..."
                    icon={UserMinus}
                    color="red"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">

                {/* Weekly Activity Chart */}
                <div className="p-6 rounded-3xl border border-[var(--glass-border)] bg-[var(--card-bg)] h-[350px] flex flex-col shadow-sm">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                        <TrendingUp size={18} />
                        Carga de Trabajo (Esta Semana)
                    </h3>
                    <div className="flex-1 w-full relative -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.weeklyData}>
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: 'var(--glass-border)' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'var(--bg-body)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="turnos" radius={[6, 6, 6, 6]} barSize={32}>
                                    {stats.weeklyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Dom' ? 'var(--accent-solid)' : '#64748b'} fillOpacity={entry.name === 'Dom' ? 1 : 0.5} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Distribution Chart */}
                <div className="p-6 rounded-3xl border border-[var(--glass-border)] bg-[var(--card-bg)] h-[350px] flex flex-col shadow-sm">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">
                        Distribución de Turnos ({currentDate.toLocaleDateString('es-ES', { month: 'long' })})
                    </h3>
                    <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <span className="text-2xl font-bold text-[var(--text-primary)]">{stats.pieData.reduce((a, b) => a + b.value, 0)}</span>
                            <span className="block text-[8px] uppercase text-[var(--text-secondary)]">Turnos</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Task Compliance Section */}
            <div className="glass-panel p-8 rounded-[2rem] border border-[var(--glass-border)] bg-[var(--card-bg)] shadow-sm mb-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">Cumplimiento por Trabajador</h3>
                        <p className="text-sm text-[var(--text-secondary)]">Basado en las tareas asignadas en el perfil.</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
                        <CheckSquare size={24} />
                    </div>
                </div>

                {stats.topCompliant.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stats.topCompliant.map(w => (
                            <div key={w.id} className="p-4 rounded-2xl bg-[var(--glass-dock)] border border-[var(--glass-border)] flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color }} />
                                        <span className="font-bold text-sm text-[var(--text-primary)]">{w.name}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">{w.percentage}%</span>
                                </div>
                                <div className="w-full h-2 bg-[var(--glass-border)] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 transition-all duration-1000"
                                        style={{ width: `${w.percentage}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider">
                                    <span>{w.completed} Completadas</span>
                                    <span>{w.total} Totales</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 opacity-50 italic text-[var(--text-secondary)]">
                        No hay tareas asignadas actualmente en los perfiles de los trabajadores.
                    </div>
                )}
            </div>

        </div>
    );
};

export default DashboardView;

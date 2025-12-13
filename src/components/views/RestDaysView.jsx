import React, { useState, useMemo, useEffect } from 'react';
import { Coffee, ChevronLeft, ChevronRight, Trash2, Eye, EyeOff, Share2, CheckSquare, Shield, Plus } from 'lucide-react';
import SectionHeader from '../shared/SectionHeader';
import { toLocalISOString, addDays, isToday, getShift, getWorkerDisplayName } from '../../utils/helpers';
import { SHIFT_TYPES } from '../../config/constants';

const RestDaysView = ({ workers, shifts, currentDate, setShifts, setCurrentDate, weeklyNotes, setWeeklyNotes, weeklyChecklists, setWeeklyChecklists, settings }) => {
    const [viewDetail, setViewDetail] = useState('simple');
    const [showCovering, setShowCovering] = useState(true);
    const [newItemText, setNewItemText] = useState('');
    const [copied, setCopied] = useState(false);

    const weekDays = useMemo(() => {
        const d = new Date(currentDate);
        const day = d.getDay() || 7;
        const start = new Date(d);
        start.setHours(-24 * (day - 1));
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }, [currentDate]);

    const startLabel = weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const endLabel = weekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const weekId = weekDays[0].toISOString().split('T')[0];

    // --- Checklist Logic ---
    const currentChecklist = weeklyChecklists[weekId] || [];

    // Initialize defaults if empty
    useEffect(() => {
        if (!weeklyChecklists[weekId]) {
            const defaults = [
                { id: 1, text: 'Validar descansos semanales', checked: false },
                { id: 2, text: 'Confirmar cobertura de relevos', checked: false },
                { id: 3, text: 'Revisar novedades de personal', checked: false },
                { id: 4, text: 'Enviar reporte de turnos', checked: false }
            ];
            setWeeklyChecklists(prev => ({ ...prev, [weekId]: defaults }));
        }
    }, [weekId, weeklyChecklists, setWeeklyChecklists]);

    const handleToggleItem = (id) => {
        const updatedList = currentChecklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
        setWeeklyChecklists(prev => ({ ...prev, [weekId]: updatedList }));
    };

    const handleAddItem = () => {
        if (!newItemText.trim()) return;
        const newItem = { id: Date.now(), text: newItemText, checked: false };
        setWeeklyChecklists(prev => ({ ...prev, [weekId]: [...currentChecklist, newItem] }));
        setNewItemText('');
    };

    const handleDeleteItem = (id) => {
        const updatedList = currentChecklist.filter(item => item.id !== id);
        setWeeklyChecklists(prev => ({ ...prev, [weekId]: updatedList }));
    };

    const completedCount = currentChecklist.filter(i => i.checked).length;
    const totalCount = currentChecklist.length;
    const progress = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

    const handleShare = () => {
        const startDay = weekDays[0].getDate();
        const endDay = weekDays[6].getDate();
        const monthName = weekDays[0].toLocaleDateString('es-ES', { month: 'long' });

        const cfg = settings.reportConfig || { showHeader: true, showDays: true, showLocation: true, showReliever: false, showShiftSummary: true };
        const defaultSede = settings.sedes[0]?.name || 'Homecenter';

        let report = '';
        if (cfg.showHeader) {
            report += `Descansos del ${startDay} al ${endDay} de ${monthName} \n`;
        }

        weekDays.forEach(date => {
            const dateStr = toLocalISOString(date);
            const rests = workers.filter(w => getShift(shifts, w.id, dateStr).type === 'off');

            if (rests.length > 0) {
                rests.forEach(w => {
                    let line = '';
                    if (cfg.showDays) {
                        const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
                        const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                        line += `${capitalizedDay} `;
                    } else {
                        line += `• `;
                    }

                    line += cfg.useShortName ? getWorkerDisplayName(w) : w.name;

                    if (cfg.showLocation) {
                        if (w.sede && w.sede !== defaultSede) {
                            line += ` (${w.sede})`;
                        }
                    }

                    if (cfg.showReliever) {
                        const reliever = workers.find(r => {
                            const s = getShift(shifts, r.id, dateStr);
                            return s.coveringId === w.id;
                        });
                        if (reliever) {
                            line += ` [Cubre: ${cfg.useShortName ? reliever.name.split(' ')[0] : reliever.name}]`;
                        }
                    }

                    report += `${line} \n`;
                });
            }
        });

        if (cfg.showShiftSummary) {
            report += `\nLos turnos de esta semana quedan de la siguiente manera: \n`;

            const summary = { morning: {}, afternoon: {}, night: {} };

            weekDays.forEach(date => {
                const dateStr = toLocalISOString(date);
                workers.forEach(w => {
                    const shift = getShift(shifts, w.id, dateStr);
                    if (shift.type === 'morning' || shift.type === 'afternoon' || shift.type === 'night') {
                        if (!summary[shift.type][w.id]) {
                            summary[shift.type][w.id] = { name: getWorkerDisplayName(w), places: [] };
                        }
                        if (shift.place) {
                            summary[shift.type][w.id].places.push(shift.place);
                        }
                    }
                });
            });

            ['morning', 'afternoon', 'night'].forEach(shiftType => {
                const label = shiftType === 'morning' ? 'Mañana' : shiftType === 'afternoon' ? 'Tarde' : 'Noche';
                const people = Object.values(summary[shiftType]).filter(p => p.places.length > 0);
                if (people.length > 0) {
                    report += `\n${label}: \n`;
                    people.forEach(p => {
                        const uniquePlaces = [...new Set(p.places)];
                        report += `  ${p.name}: ${uniquePlaces.join(', ')} \n`;
                    });
                }
            });
        }

        // Agregar progreso del checklist al final
        report += `\n📋 Checklist Operativo: ${Math.round(progress)}% Completado`;

        navigator.clipboard.writeText(report).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    };

    // 2. se REEMPLAZA ESTA FUNCIÓN COMPLETA
    const handleClearWeek = () => {
        if (!window.confirm("⚠️ ¿Estás seguro de BORRAR TODOS los turnos de esta semana?\n\nEsta acción no se puede deshacer.")) return;

        setShifts(prev => {
            const newShifts = { ...prev };

            // Recorremos los 7 días de la semana actual
            weekDays.forEach(date => {
                const dateStr = toLocalISOString(date);

                // Recorremos todos los trabajadores para borrar sus turnos de estos días
                workers.forEach(w => {
                    const key = `${w.id}_${dateStr}`;
                    // Eliminamos la entrada del objeto (esto lo devuelve a "sin asignar")
                    delete newShifts[key];
                });
            });

            return newShifts;
        });

        // Opcional: Feedback visual simple
        // alert("Turnos eliminados correctamente."); 
    };

    return (
        <div className="flex flex-col h-full animate-enter bg-[var(--bg-body)]">
            <div className="px-6 py-8 flex flex-col gap-4 border-b border-[var(--glass-border)] bg-[var(--bg-body)] z-40 sticky top-0">
                <div className="relative flex items-center justify-center"><SectionHeader icon={Coffee}>Descansos & Relevos</SectionHeader><div className="absolute right-0 flex gap-2"><button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }} className="p-2 rounded-full bg-[var(--glass-dock)] border border-[var(--glass-border)]"><ChevronLeft size={16} /></button><button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }} className="p-2 rounded-full bg-[var(--glass-dock)] border border-[var(--glass-border)]"><ChevronRight size={16} /></button></div></div>
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--card-bg)] p-1.5 rounded-2xl border border-[var(--glass-border)]"><div className="flex bg-[var(--input-bg)] rounded-xl p-1"><button onClick={() => setViewDetail('simple')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewDetail === 'simple' ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Solo Descansos</button><button onClick={() => setViewDetail('expanded')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewDetail === 'expanded' ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Agenda Completa</button></div><div className="flex gap-2"><button onClick={handleClearWeek} className="p-2 rounded-xl border border-[var(--glass-border)] bg-transparent text-red-500 hover:bg-red-500 hover:text-white transition-colors" title="Borrar Semana"><Trash2 size={16} /></button><button onClick={() => setShowCovering(!showCovering)} className={`p-2 rounded-xl border transition-colors ${showCovering ? 'bg-[var(--text-primary)] text-[var(--bg-body)] border-transparent' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)]'}`} title={showCovering ? "Ocultar Relevos" : "Mostrar Relevos"}>{showCovering ? <Eye size={16} /> : <EyeOff size={16} />}</button><button onClick={handleShare} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${copied ? 'bg-green-500 text-white border-transparent' : 'bg-[var(--accent-solid)] text-[var(--accent-text)] border-transparent'}`}>{copied ? <CheckSquare size={14} /> : <Share2 size={14} />}{copied ? '¡Copiado!' : 'Copiar'}</button></div></div>
                <p className="text-xs text-[var(--text-secondary)] text-center">Semana del {startLabel} al {endLabel}</p>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-6">
                <div className="glass-panel rounded-2xl overflow-hidden mb-6 border border-[var(--glass-border)]">
                    {weekDays.map((date) => {
                        const dateStr = toLocalISOString(date);
                        const isTodayDay = isToday(date);

                        // Lógica para vista "Solo Descansos"
                        const restingWorkers = workers.filter(w => getShift(shifts, w.id, dateStr).type === 'off');
                        const activeRelievers = workers.filter(w => { const s = getShift(shifts, w.id, dateStr); return w.isReliever && s.type !== 'off' && s.coveringId; });

                        // Lógica para vista "Agenda Completa"
                        const allDailyShifts = workers.map(w => ({ ...w, shift: getShift(shifts, w.id, dateStr) }));
                        const sortOrder = { morning: 1, afternoon: 2, night: 3, off: 4, vacation: 5, sick: 6, permit: 7 };
                        allDailyShifts.sort((a, b) => (sortOrder[a.shift.type] || 99) - (sortOrder[b.shift.type] || 99));

                        return (
                            <div key={dateStr} className={`flex flex-col sm:flex-row border-b border-[var(--glass-border)] last:border-0 hover:bg-[var(--glass-border)] transition-colors ${isTodayDay ? 'bg-[var(--today-highlight)]' : ''} `}>
                                <div className="w-full sm:w-1/3 p-4 border-b sm:border-b-0 sm:border-r border-[var(--glass-border)] flex flex-row sm:flex-col justify-between items-center sm:items-start">
                                    <div>
                                        <div className={`text-sm font-bold capitalize ${isTodayDay ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'} `}>{date.toLocaleDateString('es-ES', { weekday: 'long' })}</div>
                                        <div className="text-xs text-[var(--text-tertiary)]">{date.getDate()} de {date.toLocaleDateString('es-ES', { month: 'short' })}</div>
                                    </div>
                                </div>
                                <div className="w-full sm:w-2/3 p-4 flex flex-col justify-center gap-3">
                                    {viewDetail === 'simple' ? (
                                        // VISTA SOLO DESCANSOS
                                        restingWorkers.length > 0 ? (
                                            restingWorkers.map(w => {
                                                const reliever = activeRelievers.find(r => getShift(shifts, r.id, dateStr).coveringId === w.id);
                                                return (
                                                    <div key={w.id} className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border" style={{ borderColor: w.color }}>
                                                                {w.avatar ? <img src={w.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-black">{w.name[0]}</div>}
                                                            </div>
                                                            <span className="text-sm font-medium text-[var(--text-primary)]">{w.name} <span className="text-[var(--text-secondary)] text-xs font-normal">está descansando</span></span>
                                                        </div>
                                                        {showCovering && reliever && (
                                                            <div className="ml-8 flex items-center gap-2 bg-[var(--glass-dock)] px-2 py-1 rounded-lg border border-dashed border-[var(--text-tertiary)] w-fit animate-enter">
                                                                <Shield size={10} className="text-[var(--text-secondary)]" />
                                                                <span className="text-xs font-bold text-[var(--text-primary)]">Cubierto por: {reliever.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : <span className="text-xs text-[var(--text-tertiary)] italic pl-2">Nadie descansa hoy</span>
                                    ) : (
                                        // VISTA AGENDA COMPLETA
                                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                                            {allDailyShifts.map(w => {
                                                const type = SHIFT_TYPES[w.shift.type || 'off'];
                                                return (
                                                    <div key={w.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--glass-dock)] border border-[var(--glass-border)]">
                                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: w.color }}></div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[11px] font-bold truncate text-[var(--text-primary)]">{w.name}</div>
                                                            <div className="text-[9px] text-[var(--text-secondary)] truncate flex items-center gap-1">
                                                                {type.label}
                                                                {w.shift.place && <span className="text-[8px] opacity-70">({w.shift.place})</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Checklist Semanal */}
                <div className="glass-panel rounded-2xl p-5 border border-[var(--glass-border)]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2"><CheckSquare size={14} /> Checklist Operativo</h3>
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)]">{Math.round(progress)}% Completado</span>
                    </div>

                    <div className="w-full h-1.5 bg-[var(--glass-dock)] rounded-full mb-4 overflow-hidden">
                        <div className="h-full bg-[var(--accent-solid)] transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="space-y-2">
                        {currentChecklist.map(item => (
                            <div key={item.id} className="flex items-center gap-3 group">
                                <button onClick={() => handleToggleItem(item.id)} className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${item.checked ? 'bg-green-500 border-green-500 text-white' : 'border-[var(--text-tertiary)] text-transparent hover:border-[var(--text-primary)]'}`}>
                                    <CheckSquare size={12} strokeWidth={3} />
                                </button>
                                <span className={`text-sm flex-1 transition-colors ${item.checked ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>{item.text}</span>
                                <button onClick={() => handleDeleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--glass-border)]">
                        <input
                            value={newItemText}
                            onChange={(e) => setNewItemText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                            placeholder="Nuevo item..."
                            className="glass-input flex-1 p-2 text-xs rounded-lg"
                        />
                        <button onClick={handleAddItem} className="p-2 rounded-lg bg-[var(--glass-dock)] hover:bg-[var(--glass-border)] text-[var(--text-primary)]"><Plus size={16} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RestDaysView;

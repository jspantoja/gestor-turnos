import React, { useState, useMemo } from 'react';
import { LayoutGrid, Cloud, CloudOff, Moon, Sun, ChevronLeft, ChevronRight, List, Info, Shield, Plus, Trash2, Calendar as CalendarIcon, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import SectionHeader from '../shared/SectionHeader';
import GridWorkerCard from '../shared/GridWorkerCard';
import { SHIFT_TYPES, SHIFT_COLORS } from '../../config/constants';
import { getQuincenaLabel, toLocalISOString, isToday, getShift, getWorkerDisplayName } from '../../utils/helpers';

const ScheduleView = ({ theme, toggleTheme, viewMode, setViewMode, currentDate, navigate, daysToShow, workers, shifts, setSelectedCell, setSelectedDayDetail, isSynced, settings, calendarEvents, setCalendarEvents }) => {
    const [displayMode, setDisplayMode] = useState('list'); // 'list' or 'grid'
    const [addingEventDate, setAddingEventDate] = useState(null); // Date string for adding event
    const [newEventText, setNewEventText] = useState('');

    const handleAddEvent = (dateStr) => {
        if (!newEventText.trim()) return;
        setCalendarEvents(prev => {
            const currentEvents = prev[dateStr] || [];
            return { ...prev, [dateStr]: [...currentEvents, { id: Date.now(), text: newEventText }] };
        });
        setNewEventText('');
        setAddingEventDate(null);
    };

    const handleDeleteEvent = (e, dateStr, eventId) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar evento?')) return;
        setCalendarEvents(prev => {
            const currentEvents = prev[dateStr] || [];
            const newEvents = currentEvents.filter(ev => ev.id !== eventId);
            if (newEvents.length === 0) {
                const { [dateStr]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [dateStr]: newEvents };
        });
    };

    const handleExportImage = async () => {
        const element = document.getElementById('calendar-grid');
        if (element) {
            try {
                const canvas = await html2canvas(element, {
                    scale: 2,
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', // Approximate theme bg
                    useCORS: true
                });
                const link = document.createElement('a');
                link.download = `Calendario_${currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (error) {
                console.error("Export failed", error);
            }
        }
    };

    // Filter workers: Show active workers OR inactive workers that have shifts in the current period
    const visibleWorkers = useMemo(() => {
        return workers.filter(w => {
            if (w.isActive !== false) return true;
            // For inactive workers, check if they have any assigned shift in the visible days
            return daysToShow.some(d => {
                const s = getShift(shifts, w.id, toLocalISOString(d.date));
                // Show if they have a shift type that is not 'unassigned'
                // We exclude 'unassigned'. 'off' is technically an assignment (Rest Day), so we include it?
                // User said "dias que fueron programados". 
                // If I explicitly mark a rest day, it counts. If it's just blank (unassigned), it doesn't.
                return s.type && s.type !== 'unassigned';
            });
        });
    }, [workers, shifts, daysToShow]);

    return (
        <div className="flex flex-col h-full animate-enter">
            <div className="px-6 py-8 flex flex-col gap-4 border-b border-[var(--glass-border)] bg-[var(--bg-body)] z-20 sticky top-0">
                <div className="relative flex flex-col md:flex-row items-center justify-center py-2 gap-2 md:gap-0">
                    <div className="md:absolute md:left-0 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--input-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)] order-2 md:order-1">
                        {isSynced ? <Cloud size={10} /> : <CloudOff size={10} />}
                        <span className="font-bold">{isSynced ? 'Nube' : 'Local'}</span>
                    </div>
                    <div className="order-1 md:order-2">
                        <div className="flex flex-col items-center">
                            <h1 className="text-3xl font-bold uppercase tracking-widest text-[var(--text-primary)] flex items-center justify-center gap-3">
                                <img src="/favicon.png" alt="Logo de Gestor de Turnos" className="h-[28px] w-[28px]" />
                                Gestor de Turnos
                            </h1>
                        </div>
                    </div>
                    <div className="absolute right-0 top-0 md:top-auto order-3">
                        <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--card-bg)] border border-[var(--glass-border)]">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
                    </div>
                </div>
                <div className="flex justify-between items-end"><div><span className="text-xs font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase">{viewMode === 'biweekly' ? getQuincenaLabel(currentDate) : viewMode === 'weekly' ? 'Semana' : 'Mes'}</span><h1 className="text-3xl font-light text-[var(--text-primary)] capitalize">{currentDate.toLocaleDateString('es-ES', { month: 'long' })}</h1></div><div className="flex gap-2"><button onClick={() => navigate(-1)} className="p-2 rounded-full border border-[var(--glass-border)]"><ChevronLeft /></button><button onClick={() => navigate(1)} className="p-2 rounded-full border border-[var(--glass-border)]"><ChevronRight /></button></div></div>
                <div className="flex justify-between items-center gap-4">
                    <div className="flex gap-4 overflow-x-auto no-scrollbar">{['weekly', 'biweekly', 'monthly'].map(m => (<button key={m} onClick={() => setViewMode(m)} className={`text-sm font-medium pb-2 relative whitespace-nowrap hover:text-[var(--text-primary)] transition-colors ${viewMode === m ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{m === 'weekly' ? 'Semana' : m === 'biweekly' ? 'Quincena' : 'Mes'}{viewMode === m && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--text-primary)]" />}</button>))}</div>
                    <div className="flex gap-2">
                        {viewMode === 'monthly' && (
                            <button onClick={handleExportImage} className="p-2 rounded-full border border-[var(--glass-border)] bg-[var(--card-bg)] flex-shrink-0" title="Exportar Imagen">
                                <Download size={18} />
                            </button>
                        )}
                        {viewMode !== 'monthly' && (
                            <button
                                onClick={() => setDisplayMode(prev => prev === 'list' ? 'grid' : 'list')}
                                className="p-2 rounded-full border border-[var(--glass-border)] bg-[var(--card-bg)] flex-shrink-0"
                                title={displayMode === 'list' ? 'Vista de cuadrícula' : 'Vista de lista'}
                            >
                                {displayMode === 'list' ? <LayoutGrid size={18} /> : <List size={18} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-32 pt-4">
                {viewMode === 'monthly' ? (
                    <div id="calendar-grid" className="grid grid-cols-7 gap-1 auto-rows-fr h-full p-2 bg-[var(--bg-body)]">
                        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => <div key={d} className="text-center text-[10px] font-bold text-[var(--text-secondary)] py-2">{d}</div>)}
                        {daysToShow.map((d, i) => {
                            const dateStr = toLocalISOString(d.date);
                            const events = calendarEvents?.[dateStr] || [];
                            const isAdding = addingEventDate === dateStr;

                            return (
                                <div key={i} onClick={() => !isAdding && setSelectedDayDetail(dateStr)} className={`min-h-[140px] p-2 rounded-xl border flex flex-col gap-1 cursor-pointer hover:bg-[var(--glass-border)] transition-colors relative group ${d.isCurrentMonth ? 'bg-[var(--card-bg)] border-[var(--glass-border)]' : 'opacity-30 border-[var(--glass-border)]'} ${isToday(d.date) ? 'ring-2 ring-[var(--text-primary)]' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="font-bold text-sm text-[var(--text-primary)]">{d.date.getDate()}</div>
                                        <button onClick={(e) => { e.stopPropagation(); setAddingEventDate(dateStr); }} className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-[var(--glass-dock)] text-[var(--accent-solid)] transition-opacity" title="Agregar evento">+</button>
                                    </div>

                                    {/* Events List */}
                                    <div className="flex flex-col gap-1 mb-1">
                                        {events.map((ev) => (
                                            <div key={ev.id} className="text-[10px] bg-[var(--accent-solid)]/10 text-[var(--text-primary)] px-1.5 py-0.5 rounded border border-[var(--accent-solid)]/20 truncate flex justify-between group/ev" title={ev.text}>
                                                <span>{ev.text}</span>
                                                <button onClick={(e) => handleDeleteEvent(e, dateStr, ev.id)} className="hidden group-hover/ev:block text-red-500 ml-1 hover:text-red-700">×</button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Event Input */}
                                    {isAdding && (
                                        <div className="absolute inset-0 bg-[var(--card-bg)] p-2 rounded-xl z-10 flex flex-col gap-2 border border-[var(--accent-solid)] shadow-lg" onClick={(e) => e.stopPropagation()}>
                                            <textarea
                                                autoFocus
                                                placeholder="Evento..."
                                                className="w-full h-full bg-transparent text-xs resize-none outline-none text-[var(--text-primary)]"
                                                value={newEventText}
                                                onChange={(e) => setNewEventText(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddEvent(dateStr); } }}
                                            />
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => setAddingEventDate(null)} className="px-2 py-1 text-[10px] bg-gray-500/20 rounded hover:bg-gray-500/40">Can</button>
                                                <button onClick={() => handleAddEvent(dateStr)} className="px-2 py-1 text-[10px] bg-[var(--accent-solid)] text-white rounded hover:opacity-90">OK</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-0.5 mt-auto">
                                        {visibleWorkers.filter(w => w.isActive !== false || getShift(shifts, w.id, dateStr).type).slice(0, 7).map(w => {
                                            const s = getShift(shifts, w.id, dateStr);
                                            if (s.type === 'off' || s.type === 'unassigned') return null;
                                            return <div key={w.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: w.color }} title={getWorkerDisplayName(w)} />
                                        })}
                                        {visibleWorkers.filter(w => w.isActive !== false || getShift(shifts, w.id, dateStr).type).length > 7 && <span className="text-[8px]">+</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
                        {daysToShow.map(d => {
                            const dateStr = toLocalISOString(d.date);
                            const dayWorkers = visibleWorkers.filter(w => {
                                if (w.isActive !== false) return true;
                                const s = getShift(shifts, w.id, dateStr);
                                return s.type && s.type !== 'unassigned';
                            });

                            return (
                                <div key={dateStr} className={`day-card rounded-2xl p-4 h-full flex flex-col ${isToday(d.date) ? 'today-highlight' : ''}`}>
                                    <div className="flex justify-between items-baseline mb-3">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-bold text-[var(--text-primary)]">{d.date.getDate()}</span>
                                            <span className="text-sm text-[var(--text-secondary)] uppercase">{d.date.toLocaleDateString('es-ES', { weekday: 'long' })}</span>
                                        </div>
                                        <button onClick={() => setSelectedDayDetail(dateStr)} className="p-1.5 rounded-lg bg-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="Ver detalle del día"><Info size={16} /></button>
                                    </div>
                                    {displayMode === 'list' ? (
                                        <div className="space-y-2 flex-1">
                                            {dayWorkers.map(w => {
                                                const s = getShift(shifts, w.id, dateStr);

                                                // Resolve Shift Label and Style
                                                let shiftLabel = '—';
                                                let labelStyle = '';
                                                let customColor = null;

                                                // 1. Check Custom Shift (Time-based) - PRIORITY
                                                if (s.type === 'custom') {
                                                    shiftLabel = s.customShiftName || 'Personalizado';

                                                    // Find color definition
                                                    if (settings?.customShifts) {
                                                        const def = settings.customShifts.find(cs => (s.customShiftId && cs.id === s.customShiftId) || (s.code && cs.code === s.code));
                                                        if (def) {
                                                            // Try to find if it's a preset color
                                                            customColor = SHIFT_COLORS.find(c => c.id === def.color);

                                                            // If not a preset (custom hex), construct custom color object
                                                            if (!customColor && def.colorHex) {
                                                                customColor = {
                                                                    bg: 'bg-white/10', // Generic background or assume dynamic style handles it
                                                                    text: 'text-white',
                                                                    border: '',
                                                                    hex: def.colorHex
                                                                };
                                                            }
                                                        }
                                                    }
                                                    if (!customColor && s.customShiftColor) {
                                                        customColor = SHIFT_COLORS.find(c => c.id === s.customShiftColor);
                                                    }

                                                    // Styles for Custom Shifts
                                                    const typeDef = SHIFT_TYPES['custom'];
                                                    labelStyle = typeDef ? typeDef.style.replace('bg-', 'bg-opacity-20 ') : 'bg-emerald-100 text-emerald-800';
                                                }
                                                // 2. Check Standard/Static Types
                                                else if (SHIFT_TYPES[s.type]) {
                                                    const typeDef = SHIFT_TYPES[s.type];

                                                    shiftLabel = typeDef.label;
                                                    labelStyle = typeDef.style.replace('bg-', 'bg-opacity-20 ');
                                                }
                                                // 3. Check Custom Statuses (Absence/Other) via ID
                                                else {
                                                    const statusDef = settings?.customStatuses?.find(st => st.id === s.type);
                                                    if (statusDef) {
                                                        shiftLabel = statusDef.name;
                                                        // Resolve style from status definition
                                                        if (statusDef.color) {
                                                            const colorObj = SHIFT_COLORS.find(c => c.hex === statusDef.color) || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
                                                            customColor = {
                                                                bg: `bg-[${statusDef.color}]/20`, // fallback
                                                                text: `text-[${statusDef.color}]`,
                                                                hex: statusDef.color
                                                            };
                                                        } else {
                                                            labelStyle = 'bg-gray-100 text-gray-800';
                                                        }
                                                    } else {
                                                        shiftLabel = 'Desconocido';
                                                        labelStyle = 'bg-gray-100 text-gray-500';
                                                    }
                                                }

                                                // Apply custom color if resolved
                                                if (customColor) {
                                                    // If it's a real custom shift object from constants or constructed
                                                    if (customColor.hex) {
                                                        labelStyle = `text-white`; // We will override via style prop
                                                    } else {
                                                        labelStyle = `${customColor.bg} ${customColor.text} ${customColor.border || ''}`;
                                                    }
                                                }

                                                const coveredPerson = s.coveringId ? workers.find(cw => cw.id === s.coveringId) : null;

                                                return (
                                                    <div key={w.id} onClick={() => setSelectedCell({ workerId: w.id, dateStr })} className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--glass-border)] cursor-pointer" style={{ borderLeft: `3px solid ${w.color}` }}>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium pl-2 text-[var(--text-primary)]">{getWorkerDisplayName(w)}</span>
                                                            {coveredPerson && <span className="text-[10px] text-[var(--text-secondary)] pl-2 flex items-center gap-1"><Shield size={10} /> Releva a: {getWorkerDisplayName(coveredPerson)}</span>}
                                                        </div>
                                                        <div
                                                            className={`text-[10px] font-bold px-2 py-1 rounded ${!customColor?.hex ? labelStyle : ''}`}
                                                            style={customColor?.hex ? { backgroundColor: `${customColor.hex}33`, color: customColor.hex, border: `1px solid ${customColor.hex}40` } : {}}
                                                        >
                                                            {shiftLabel}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-2 flex-1 content-start">
                                            {dayWorkers.map(w => {
                                                const s = getShift(shifts, w.id, dateStr);
                                                return <GridWorkerCard key={w.id} worker={w} shift={s} onClick={() => setSelectedCell({ workerId: w.id, dateStr })} settings={settings} />;
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduleView;

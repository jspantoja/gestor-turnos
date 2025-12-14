import React, { useState, useMemo } from 'react';
import { LayoutGrid, Cloud, CloudOff, Moon, Sun, ChevronLeft, ChevronRight, List, Info, Shield } from 'lucide-react';
import SectionHeader from '../shared/SectionHeader';
import GridWorkerCard from '../shared/GridWorkerCard';
import { SHIFT_TYPES, SHIFT_COLORS } from '../../config/constants';
import { getQuincenaLabel, toLocalISOString, isToday, getShift, getWorkerDisplayName } from '../../utils/helpers';

const ScheduleView = ({ theme, toggleTheme, viewMode, setViewMode, currentDate, navigate, daysToShow, workers, shifts, setSelectedCell, setSelectedDayDetail, isSynced, settings }) => {
    const [displayMode, setDisplayMode] = useState('list'); // 'list' or 'grid'

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
                        <SectionHeader icon={LayoutGrid}>Gestor de Turnos</SectionHeader>
                    </div>
                    <div className="absolute right-0 top-0 md:top-auto order-3">
                        <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--card-bg)] border border-[var(--glass-border)]">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
                    </div>
                </div>
                <div className="flex justify-between items-end"><div><span className="text-xs font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase">{viewMode === 'biweekly' ? getQuincenaLabel(currentDate) : viewMode === 'weekly' ? 'Semana' : 'Mes'}</span><h1 className="text-3xl font-light text-[var(--text-primary)] capitalize">{currentDate.toLocaleDateString('es-ES', { month: 'long' })}</h1></div><div className="flex gap-2"><button onClick={() => navigate(-1)} className="p-2 rounded-full border border-[var(--glass-border)]"><ChevronLeft /></button><button onClick={() => navigate(1)} className="p-2 rounded-full border border-[var(--glass-border)]"><ChevronRight /></button></div></div>
                <div className="flex justify-between items-center gap-4">
                    <div className="flex gap-4 overflow-x-auto no-scrollbar">{['weekly', 'biweekly', 'monthly'].map(m => (<button key={m} onClick={() => setViewMode(m)} className={`text-sm font-medium pb-2 relative whitespace-nowrap hover:text-[var(--text-primary)] transition-colors ${viewMode === m ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{m === 'weekly' ? 'Semana' : m === 'biweekly' ? 'Quincena' : 'Mes'}{viewMode === m && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--text-primary)]" />}</button>))}</div>
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
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-32 pt-4">
                {viewMode === 'monthly' ? (
                    <div className="grid grid-cols-7 gap-1">
                        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => <div key={d} className="text-center text-[10px] font-bold text-[var(--text-secondary)] py-2">{d}</div>)}
                        {daysToShow.map((d, i) => (<div key={i} onClick={() => setSelectedDayDetail(toLocalISOString(d.date))} className={`min-h-[80px] p-2 rounded-xl border cursor-pointer hover:bg-[var(--glass-border)] transition-colors ${d.isCurrentMonth ? 'bg-[var(--card-bg)] border-[var(--glass-border)]' : 'opacity-30 border-[var(--glass-border)]'} ${isToday(d.date) ? 'ring-2 ring-[var(--text-primary)]' : ''}`}><div className="font-bold text-sm mb-1 text-[var(--text-primary)]">{d.date.getDate()}</div><div className="flex flex-wrap gap-0.5">{visibleWorkers.filter(w => w.isActive !== false || getShift(shifts, w.id, toLocalISOString(d.date)).type).slice(0, 5).map(w => { const s = getShift(shifts, w.id, toLocalISOString(d.date)); if (s.type === 'off' || s.type === 'unassigned') return null; return <div key={w.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: w.color }} /> })}{visibleWorkers.filter(w => w.isActive !== false || getShift(shifts, w.id, toLocalISOString(d.date)).type).length > 5 && <span className="text-[8px]">+</span>}</div></div>))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                                                const type = SHIFT_TYPES[s.type || 'off'];
                                                const shiftLabel = s.type === 'custom' && s.customShiftName ? s.customShiftName : type.label;
                                                const coveredPerson = s.coveringId ? workers.find(cw => cw.id === s.coveringId) : null;
                                                let customColor = null;
                                                if (s.type === 'custom') {
                                                    if (s.customShiftColor) customColor = SHIFT_COLORS.find(c => c.id === s.customShiftColor);
                                                    else if (settings?.customShifts) {
                                                        const def = settings.customShifts.find(cs => (s.customShiftId && cs.id === s.customShiftId) || (s.code && cs.code === s.code));
                                                        if (def?.color) customColor = SHIFT_COLORS.find(c => c.id === def.color);
                                                    }
                                                }
                                                const labelStyle = customColor ? `${customColor.bg} ${customColor.text} ${customColor.border || ''}` : type.style.replace('bg-', 'bg-opacity-20 ');

                                                return (
                                                    <div key={w.id} onClick={() => setSelectedCell({ workerId: w.id, dateStr })} className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--glass-border)] cursor-pointer" style={{ borderLeft: `3px solid ${w.color}` }}>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium pl-2 text-[var(--text-primary)]">{getWorkerDisplayName(w)}</span>
                                                            {coveredPerson && <span className="text-[10px] text-[var(--text-secondary)] pl-2 flex items-center gap-1"><Shield size={10} /> Releva a: {getWorkerDisplayName(coveredPerson)}</span>}
                                                        </div>
                                                        <div className={`text-[10px] font-bold px-2 py-1 rounded ${labelStyle}`}>{shiftLabel}</div>
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

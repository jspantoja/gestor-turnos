import React from 'react';
import { X, Briefcase, Shield, Clock, MapPin, Coffee, AlertCircle } from 'lucide-react';
import { SHIFT_TYPES, SHIFT_COLORS } from '../../config/constants';
import { getShift } from '../../utils/helpers';

const DayDetailModal = ({ dateStr, onClose, workers, shifts, settings }) => {
    if (!dateStr) return null;
    const date = new Date(dateStr + 'T12:00:00');

    // Listas para clasificar empleados
    const working = [], resting = [], absent = [];

    // Clasificación segura
    workers.forEach(w => {
        const s = getShift(shifts, w.id, dateStr);
        // Protección: Si s no existe, creamos un objeto dummy
        const safeShift = s || { type: 'unassigned' };

        if (safeShift.type === 'off') {
            resting.push({ ...w, shift: safeShift });
        } else if (['sick', 'vacation', 'permit'].includes(safeShift.type)) {
            absent.push({ ...w, shift: safeShift });
        } else {
            working.push({ ...w, shift: safeShift });
        }
    });

    const sortOrder = { morning: 1, afternoon: 2, night: 3 };
    working.sort((a, b) => (sortOrder[a.shift.type] || 99) - (sortOrder[b.shift.type] || 99));

    return (
        <div className="modal-overlay z-[90] sm:items-center items-end animate-enter" onClick={onClose}>
            <div className="w-full sm:w-[500px] liquid-glass p-0 rounded-t-[32px] sm:rounded-3xl m-0 sm:m-4 max-h-[80dvh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Mobile Drag Handle */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-[var(--text-tertiary)] opacity-50" />
                </div>

                {/* Header */}
                <div className="p-6 border-b border-[var(--glass-border)] flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] capitalize">{date.toLocaleDateString('es-ES', { weekday: 'long' })}</h2>
                        <p className="text-[var(--text-secondary)] font-medium">{date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-[var(--card-bg)] hover:bg-[var(--glass-border)] transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6">
                    {/* WORKING SECTION */}
                    <div>
                        <h3 className="text-xs font-bold uppercase text-[var(--success-text)] mb-3 flex items-center gap-2 bg-[var(--card-bg)] backdrop-filter backdrop-blur-md w-fit px-2 py-1 rounded-lg border border-[var(--glass-border)]" style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}><Briefcase size={12} /> Personal Programado ({working.length})</h3>
                        <div className="space-y-2">
                            {working.length > 0 ? working.map(w => {
                                // --- CORRECCIÓN CLAVE: Fallback de seguridad ---
                                const typeConfig = SHIFT_TYPES[w.shift.type] || SHIFT_TYPES.unassigned || { label: 'Desconocido', style: 'bg-gray-500 text-white' };
                                const isCustom = w.shift.type === 'custom';
                                // Use custom shift name if available, otherwise type label
                                const displayLabel = isCustom && w.shift.customShiftName ? w.shift.customShiftName : typeConfig.label;

                                // Enhanced Color Logic: Try direct property first, then fallback to settings lookup
                                let customColor = isCustom && w.shift.customShiftColor
                                    ? SHIFT_COLORS.find(c => c.id === w.shift.customShiftColor)
                                    : null;

                                if (!customColor && isCustom && settings?.customShifts) {
                                    const def = settings.customShifts.find(cs =>
                                        (w.shift.customShiftId && cs.id === w.shift.customShiftId) ||
                                        (w.shift.code && cs.code === w.shift.code) ||
                                        (w.shift.customShiftName && cs.name === w.shift.customShiftName)
                                    );
                                    if (def && def.color) {
                                        customColor = SHIFT_COLORS.find(c => c.id === def.color);
                                    }
                                }

                                const pillClass = customColor ? `${customColor.bg} ${customColor.text}` : typeConfig.style;

                                return (
                                    <div key={w.id} className="glass-panel p-3 rounded-xl flex items-center justify-between border-l-4" style={{ borderLeftColor: w.color }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--glass-border)] flex items-center justify-center text-xs font-bold">{w.name[0]}</div>
                                            <div>
                                                <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1">
                                                    {w.name} {w.shift.coveringId && <Shield size={10} className="text-[var(--reliever-badge)]" />}
                                                </div>
                                                <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                                                    <Clock size={10} /> {w.shift.start || '--:--'} - {w.shift.end || '--:--'}
                                                    {w.shift.place && <span className="flex items-center gap-1 ml-1 bg-[var(--glass-border)] px-1 rounded"><MapPin size={8} /> {w.shift.place}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Usamos pillClass dinámica */}
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${pillClass} `}>{displayLabel}</div>
                                    </div>
                                )
                            }) : <p className="text-sm text-[var(--text-tertiary)] italic text-center py-2">No hay turnos programados.</p>}
                        </div>
                    </div>

                    {/* RESTING SECTION */}
                    <div>
                        <h3 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-3 flex items-center gap-2 bg-[var(--card-bg)] backdrop-filter backdrop-blur-md w-fit px-2 py-1 rounded-lg border border-[var(--glass-border)]" style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}><Coffee size={12} /> Descansos ({resting.length})</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {resting.length > 0 ? resting.map(w => {
                                const coveringReliever = workers.find(r => { const s = getShift(shifts, r.id, dateStr); return s && s.coveringId === w.id; });
                                return (
                                    <div key={w.id} className="glass-panel p-2 rounded-xl flex flex-col gap-1 opacity-80">
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color }}></div><span className="text-sm font-medium text-[var(--text-primary)]">{w.name}</span></div>
                                        {coveringReliever && (<div className="text-[9px] text-[var(--reliever-badge)] flex items-center gap-1 ml-4"><Shield size={8} /> Cubierto por {coveringReliever.name.split(' ')[0]}</div>)}
                                    </div>
                                )
                            }) : <p className="text-sm text-[var(--text-tertiary)] italic col-span-2 text-center py-2">Nadie descansa hoy.</p>}
                        </div>
                    </div>

                    {/* ABSENT SECTION */}
                    {absent.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold uppercase text-[var(--warning-text)] mb-3 flex items-center gap-2 bg-[var(--warning-soft)] w-fit px-2 py-1 rounded-lg"><AlertCircle size={12} /> Ausencias ({absent.length})</h3>
                            <div className="space-y-2">
                                {absent.map(w => {
                                    const typeConfig = SHIFT_TYPES[w.shift.type] || SHIFT_TYPES.sick || { label: 'Ausente', style: 'bg-red-500 text-white' };
                                    return (
                                        <div key={w.id} className="glass-panel p-2 rounded-xl flex items-center justify-between border border-[var(--warning-soft)]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-[var(--glass-border)] flex items-center justify-center text-[10px] font-bold">{w.name[0]}</div>
                                                <span className="text-sm font-medium text-[var(--text-primary)]">{w.name}</span>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${typeConfig.style} `}>{typeConfig.label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DayDetailModal;
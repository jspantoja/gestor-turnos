import React, { useState } from 'react';
import { X, MapPin, Shield, Repeat, AlertCircle } from 'lucide-react';
import { SHIFT_TYPES, SHIFT_ICONS } from '../../config/constants';
import Button from '../shared/Button';
import { useToast } from '../shared/Toast';
import { toLocalISOString, getShift } from '../../utils/helpers';
import { shiftSchema, validate } from '../../utils/validation';

const EditModal = ({ selectedCell, setSelectedCell, workers, shifts, setShifts, sedes, settings }) => {
    if (!selectedCell) return null;
    const [errors, setErrors] = useState(null);
    const toast = useToast();

    const date = new Date(selectedCell.dateStr + 'T12:00:00');
    const worker = workers.find(w => w.id === selectedCell.workerId);
    // Este 'shift' contiene el estado ACTUAL (antes de editar), lo cual es perfecto para saber qué turno tenía asignado
    const shift = getShift(shifts, selectedCell.workerId, selectedCell.dateStr);

    if (!worker) return null;

    const workerSedeName = worker.sede || worker.location || 'Homecenter';
    const workerSede = sedes.find(s => s.name === workerSedeName);
    const availablePlaces = workerSede ? workerSede.places : [];
    const currentShiftPlace = shift.place || worker.lugar || (availablePlaces.length > 0 ? availablePlaces[0] : '');

    const update = (s) => {
        // Validation
        const result = validate(shiftSchema, {
            workerId: worker.id,
            date: selectedCell.dateStr,
            type: s.type,
            sede: s.place
        });

        if (!result.success) {
            setErrors(result.errors);
        } else {
            setErrors(null);
        }

        if (worker.isReliever && s.type === 'off') {
            const anyoneElseResting = workers.some(w => { if (w.id === worker.id) return false; const otherShift = getShift(shifts, w.id, selectedCell.dateStr); return otherShift.type === 'off'; });
            if (anyoneElseResting) {
                toast.error('El supernumerario NO puede descansar este día');
                return;
            }
        }

        setShifts(prev => {
            const newShifts = { ...prev, [`${selectedCell.workerId}_${selectedCell.dateStr}`]: s };

            // --- LÓGICA INTELIGENTE DE RELEVO ---
            if (s.type === 'off' && !worker.isReliever) {
                const reliever = workers.find(w => w.isReliever && w.isActive !== false);

                if (reliever) {
                    const relieverKey = `${reliever.id}_${selectedCell.dateStr}`;

                    // 1. Definir valores por defecto (Mañana)
                    let targetType = 'morning';
                    let targetStart = '08:00';
                    let targetEnd = '16:00';

                    // 2. Estrategia A: Usar el turno que estamos reemplazando (si era laboral)
                    // Ej: Si cambiamos un turno de TARDE por un DESCANSO, el relevo cubre la TARDE.
                    const workingTypes = ['morning', 'afternoon', 'night'];

                    if (workingTypes.includes(shift.type)) {
                        targetType = shift.type;
                        targetStart = shift.start;
                        targetEnd = shift.end;
                    }
                    // 3. Estrategia B: Si estaba vacío, mirar vecinos (ayer o mañana) para mantener consistencia
                    else {
                        const checkNeighbor = (offset) => {
                            try {
                                const d = new Date(selectedCell.dateStr + 'T12:00:00');
                                d.setDate(d.getDate() + offset);
                                const dStr = toLocalISOString(d);
                                const neighbor = prev[`${worker.id}_${dStr}`]; // Miramos el turno del trabajador original
                                return neighbor && workingTypes.includes(neighbor.type) ? neighbor.type : null;
                            } catch (e) { return null; }
                        };

                        // Priorizamos mirar ayer, si no mañana
                        const neighborType = checkNeighbor(-1) || checkNeighbor(1);

                        if (neighborType) {
                            targetType = neighborType;
                            // Asignar horas estándar según el tipo detectado
                            if (targetType === 'morning') { targetStart = '08:00'; targetEnd = '16:00'; }
                            else if (targetType === 'afternoon') { targetStart = '14:00'; targetEnd = '22:00'; }
                            else if (targetType === 'night') { targetStart = '22:00'; targetEnd = '06:00'; }
                        }
                    }

                    // Asignar al relevante
                    newShifts[relieverKey] = {
                        type: targetType,
                        start: targetStart,
                        end: targetEnd,
                        coveringId: worker.id,
                        place: s.place || currentShiftPlace
                    };
                }
            }
            // --- FIN LÓGICA ---

            return newShifts;
        });
        toast.success('Turno actualizado');
    };

    const applyToWeek = () => {
        const current = new Date(selectedCell.dateStr + 'T12:00:00'); const day = current.getDay() || 7; const monday = new Date(current); monday.setDate(current.getDate() - (day - 1));
        setShifts(prev => {
            const next = { ...prev }; const reliever = workers.find(w => w.isReliever);
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday); d.setDate(monday.getDate() + i); const dStr = toLocalISOString(d);
                next[`${selectedCell.workerId}_${dStr}`] = { ...shift, place: currentShiftPlace };

                // Auto-schedule Reliever (Aquí mantenemos 'morning' por defecto ya que se reemplaza toda la semana)
                // Podríamos mejorarlo, pero generalmente al aplicar a toda la semana se busca un reinicio.
                if (shift.type === 'off' && reliever) {
                    next[`${reliever.id}_${dStr}`] = {
                        type: 'morning',
                        start: '08:00',
                        end: '16:00',
                        coveringId: worker.id,
                        place: currentShiftPlace
                    };
                }
            }
            return next;
        });
        toast.success('Turno aplicado a toda la semana');
        setSelectedCell(null);
    };

    return (
        <div
            className="modal-overlay z-[80] sm:items-center items-end animate-enter"
            onClick={() => setSelectedCell(null)}
        >
            <div className="w-full sm:w-[500px] liquid-glass p-8 rounded-t-[32px] sm:rounded-[32px] pb-safe m-0 sm:m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Mobile Drag Handle */}
                <div className="sm:hidden flex justify-center mb-4 -mt-2">
                    <div className="w-10 h-1 rounded-full bg-[var(--text-tertiary)] opacity-50" />
                </div>
                <div className="flex justify-between items-start mb-6"><div><h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">{worker?.name}{worker?.isReliever && <span className="reliever-tag">Relevo</span>}</h2><p className="text-[var(--text-secondary)] text-sm capitalize">{date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div><button onClick={() => setSelectedCell(null)} className="p-2 rounded-full hover:bg-[var(--glass-border)] transition-colors"><X size={24} /></button></div>

                {/* Default shift types (off, sick, permit, vacation) */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {Object.entries(SHIFT_TYPES).filter(([k]) => ['off', 'sick', 'permit', 'vacation', 'unassigned'].includes(k)).map(([k, cfg]) => (
                        <button
                            key={k}
                            onClick={() => update({ type: k, start: '', end: '', code: null, place: currentShiftPlace, displayLocation: shift.displayLocation })}
                            className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${shift.type === k ? 'shift-btn-active ring-2 ring-[var(--accent-solid)] ring-offset-1' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-border)]'}`}
                        >
                            <div className="scale-75"><cfg.icon /></div>
                            <span className="text-[9px] font-bold uppercase">{cfg.label}</span>
                        </button>
                    ))}
                </div>

                {/* Custom shifts from settings */}
                {settings.customShifts && settings.customShifts.length > 0 && (
                    <div className="mb-6">
                        <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2">Turnos Programados</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {settings.customShifts.map((cs) => {
                                const shiftIcon = SHIFT_ICONS.find(i => i.id === cs.icon);
                                const IconComp = shiftIcon ? shiftIcon.component : SHIFT_ICONS[0].component;
                                return (
                                    <button
                                        key={cs.id}
                                        title={`${cs.name} (${cs.start} - ${cs.end}) - Código: ${cs.code}`}
                                        onClick={() => update({
                                            type: 'custom',
                                            code: cs.code,
                                            start: cs.start,
                                            end: cs.end,
                                            customShiftId: cs.id,
                                            customShiftName: cs.name,
                                            customShiftIcon: cs.icon,
                                            customShiftColor: cs.color,
                                            place: currentShiftPlace,
                                            displayLocation: shift.displayLocation
                                        })}
                                        className={`p-3 rounded-xl flex items-center gap-2 border transition-all ${shift.type === 'custom' && shift.code === cs.code ? 'shift-btn-active ring-2 ring-[var(--accent-solid)] ring-offset-1' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-border)]'}`}
                                        style={{ borderLeftWidth: '4px', borderLeftColor: cs.colorHex || 'var(--glass-border)' }}
                                    >
                                        <div className="p-1.5 rounded-lg" style={{ backgroundColor: cs.colorHex ? `${cs.colorHex}20` : 'var(--accent-solid)/10', color: cs.colorHex || 'var(--accent-solid)' }}>
                                            <IconComp size={18} />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="text-xs font-bold truncate">{cs.name}</div>
                                            <div className="text-[9px] text-[var(--text-tertiary)]">{cs.start} - {cs.end}</div>
                                        </div>
                                        <span className="text-sm font-mono font-bold" style={{ color: cs.colorHex || 'var(--accent-solid)' }}>{cs.code}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Legacy shift types (for backwards compatibility if no custom shifts) */}
                {(!settings.customShifts || settings.customShifts.length === 0) && (
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        {Object.entries(SHIFT_TYPES).filter(([k]) => ['morning', 'afternoon', 'night'].includes(k)).map(([k, cfg]) => (
                            <button
                                key={k}
                                onClick={() => {
                                    const def = k === 'morning' ? { start: '08:00', end: '16:00' } : k === 'afternoon' ? { start: '14:00', end: '22:00' } : { start: '22:00', end: '06:00' };
                                    update({ type: k, ...def, code: null, place: currentShiftPlace, displayLocation: shift.displayLocation });
                                }}
                                className={`p-3 rounded-xl flex flex-col items-center gap-1 border transition-all ${shift.type === k ? 'shift-btn-active ring-2 ring-[var(--accent-solid)] ring-offset-1' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-border)]'}`}
                            >
                                <div className="scale-75"><cfg.icon /></div>
                                <span className="text-[10px] font-bold uppercase">{cfg.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {errors && (
                    <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                        <AlertCircle size={16} className="text-red-400 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs font-bold text-red-300 mb-1">Error de Validación</p>
                            <ul className="list-disc list-inside text-[10px] text-red-200/80">
                                {Object.values(errors).map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    </div>
                )}

                {shift.type === 'off' && (<div className="mb-6 p-3 rounded-xl border border-[var(--glass-border)] bg-white/10 flex items-center justify-between"><span className="text-xs font-bold text-[var(--text-secondary)]">👁️ Mostrar ubicación en reporte</span><div onClick={() => update({ ...shift, displayLocation: !shift.displayLocation })} className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${shift.displayLocation ? 'bg-[var(--text-primary)]' : 'bg-[var(--glass-border)]'}`}><div className={`w-4 h-4 bg-[var(--bg-body)] rounded-full shadow-md transform transition-transform ${shift.displayLocation ? 'translate-x-4' : ''}`} /></div></div>)}
                {(shift.type === 'morning' || shift.type === 'afternoon' || shift.type === 'night' || shift.type === 'custom') && (<div className="space-y-4 mb-6"><div className="flex gap-4"><div className="flex-1"><label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 block">Entrada</label><input type="time" value={shift.start || ''} onChange={e => update({ ...shift, start: e.target.value })} className="w-full glass-input p-3 rounded-lg font-mono" /></div><div className="flex-1"><label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1 block">Salida</label><input type="time" value={shift.end || ''} onChange={e => update({ ...shift, end: e.target.value })} className="w-full glass-input p-3 rounded-lg font-mono" /></div></div><div className="p-3 rounded-xl border border-[var(--glass-border)] bg-white/10"><label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-2 block flex items-center gap-2"><MapPin size={12} /> Lugar de Trabajo ({workerSedeName})</label><div className="flex gap-2 flex-wrap">{availablePlaces.length > 0 ? availablePlaces.map(place => (<button key={place} onClick={() => update({ ...shift, place: place })} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex-1 whitespace-nowrap ${currentShiftPlace === place ? 'shift-btn-active' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-border)]'}`}>{place}</button>)) : <span className="text-xs text-[var(--text-tertiary)] italic">No hay lugares configurados en esta sede.</span>}</div></div>{worker.isReliever && (<div className="p-3 rounded-xl border border-[var(--glass-border)] bg-white/10"><label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-2 block flex items-center gap-2"><Shield size={12} /> ¿A quién está cubriendo?</label><select value={shift.coveringId || ''} onChange={(e) => update({ ...shift, coveringId: e.target.value ? parseInt(e.target.value) : null })} className="w-full glass-input p-3 rounded-lg text-sm bg-transparent outline-none appearance-none"><option value="">-- Sin relevo --</option>{workers.filter(w => w.id !== worker.id).map(w => <option key={w.id} value={w.id}>{w.name} ({w.role})</option>)}</select></div>)}</div>)}
                <div className="pt-4 border-t border-[var(--glass-border)]"><Button onClick={applyToWeek} className="w-full bg-[var(--card-bg)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] border-transparent"><Repeat size={16} /> Repetir toda la semana</Button><p className="text-[10px] text-[var(--text-tertiary)] mt-2 text-center">Esto aplicará el turno "{SHIFT_TYPES[shift.type || 'off'].label}" y el lugar "{currentShiftPlace}" del Lunes al Domingo de esta semana.</p></div>
            </div>
        </div>
    );
};

export default EditModal;
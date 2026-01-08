import React, { useState } from 'react';
import { X, MapPin, Shield, Repeat, AlertCircle, Zap } from 'lucide-react';
import TimeSelector from '../shared/TimeSelector';

import { SHIFT_TYPES, SHIFT_ICONS } from '../../config/constants';
import Button from '../shared/Button';
import { useToast } from '../shared/Toast';
import { useEffect } from 'react';

import { toLocalISOString, getShift } from '../../utils/helpers';
import { shiftSchema, validate } from '../../utils/validation';
import { detectConflict } from '../../utils/validationLogic';

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



    // ... imports

    const [validationPreview, setValidationPreview] = useState(null); // State for showing the warning

    // ... inside component ...

    const handleConfirmConflict = () => {
        if (validationPreview && validationPreview.payload) {
            // Execute the update bypassing validation
            finalizeUpdate(validationPreview.payload);
            setValidationPreview(null);
        }
    };

    const finalizeUpdate = (s) => {
        // ... (Original logic: Reliever checks, state update)

        // Check for Reliever Conflict (Exceptional Case) - Moved here
        let skipAutoReliever = false;
        if (s.type === 'off' && !worker.isReliever) {
            const reliever = workers.find(w => w.isReliever && w.isActive !== false);
            if (reliever) {
                const relieverShift = getShift(shifts, reliever.id, selectedCell.dateStr);
                // If Reliever is OFF or RESTING
                if (relieverShift.type === 'off') {
                    if (window.confirm("El Relevo (Supernumerario) también está descansando este día.\n\n¿Deseas continuar? Esto dejará a AMBOS en descanso (sin cobertura).")) {
                        skipAutoReliever = true;
                    } else {
                        return; // Cancel action
                    }
                }
            }
        }

        setShifts(prev => {
            const newShifts = { ...prev, [`${selectedCell.workerId}_${selectedCell.dateStr}`]: s };

            // --- LÓGICA INTELIGENTE DE RELEVO ---
            // Solo activar si no estamos en un caso de conflicto aprobado (skipAutoReliever)
            if (s.type === 'off' && !worker.isReliever && !skipAutoReliever) {
                const reliever = workers.find(w => w.isReliever && w.isActive !== false);

                if (reliever) {
                    const relieverKey = `${reliever.id}_${selectedCell.dateStr}`;

                    // 1. Definir valores por defecto (Mañana)
                    let targetType = 'morning';
                    let targetStart = '08:00';
                    let targetEnd = '16:00';
                    let shiftProps = {};

                    // 2. Estrategia A: Usar el turno que estamos reemplazando (si era laboral)
                    const workingTypes = ['morning', 'afternoon', 'night', 'custom'];
                    if (workingTypes.includes(shift.type)) {
                        targetType = shift.type;
                        targetStart = shift.start;
                        targetEnd = shift.end;
                        if (shift.type === 'custom') {
                            shiftProps = {
                                code: shift.code,
                                customShiftId: shift.customShiftId,
                                customShiftName: shift.customShiftName,
                                customShiftIcon: shift.customShiftIcon,
                                customShiftColor: shift.customShiftColor
                            };
                        }
                    }
                    // 3. Estrategia B: Si estaba vacío, mirar vecinos
                    else {
                        const checkNeighbor = (offset) => {
                            try {
                                const d = new Date(selectedCell.dateStr + 'T12:00:00');
                                d.setDate(d.getDate() + offset);
                                const dStr = toLocalISOString(d);
                                const neighbor = prev[`${worker.id}_${dStr}`];
                                return neighbor && workingTypes.includes(neighbor.type) ? neighbor.type : null;
                            } catch (e) { return null; }
                        };
                        const neighborType = checkNeighbor(-1) || checkNeighbor(1);
                        if (neighborType) {
                            targetType = neighborType;
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
                        place: s.place || currentShiftPlace,
                        ...shiftProps
                    };
                }
            }
            // --- FIN LÓGICA ---

            return newShifts;
        });
        toast.success('Turno actualizado');
    };

    // NEW: Auto-lookup code when changing times in EditModal
    useEffect(() => {
        if (!shift || (shift.type !== 'custom' && !['morning', 'afternoon', 'night'].includes(shift.type))) return;
        if (!shift.start || !shift.end) return;

        const lookupCode = async () => {
            try {
                // Check in Custom Shifts (Settings)
                const localMatch = (settings.customShifts || []).find(s => s.start === shift.start && s.end === shift.end);
                if (localMatch) {
                    if (shift.code !== localMatch.code) {
                        finalizeUpdate({
                            ...shift,
                            type: 'custom',
                            code: localMatch.code,
                            customShiftId: localMatch.id,
                            customShiftName: localMatch.name,
                            customShiftIcon: localMatch.icon,
                            customShiftColor: localMatch.color
                        });
                    }
                    return;
                }

                // Check Master DB
                const response = await fetch('/data/turnos.json');
                const data = await response.json();
                const match = data.find(t => t["Hora Entrada"] === shift.start && t["Hora Salida"] === shift.end);

                if (match && shift.code !== match.ID.toString()) {
                    finalizeUpdate({
                        ...shift,
                        type: 'custom',
                        code: match.ID.toString(),
                        customShiftName: `Turno ${match.ID}`
                    });
                }
            } catch (e) {
                console.error("Error in EditModal lookup:", e);
            }
        };

        const timer = setTimeout(lookupCode, 400);
        return () => clearTimeout(timer);
    }, [shift?.start, shift?.end]);

    const update = (s) => {
        // Schema Validation
        const result = validate(shiftSchema, {
            workerId: worker.id,
            date: selectedCell.dateStr,
            type: s.type,
            sede: s.place
        });

        if (!result.success) {
            setErrors(result.errors);
            return; // Stop on schema error
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

        // Business Logic Validation (Conflicts)
        const conflict = detectConflict(worker.id, selectedCell.dateStr, s.type, shifts, settings);
        if (conflict) {
            setValidationPreview({ ...conflict, payload: s });
            return; // Stop and show warning UI
        }

        finalizeUpdate(s);
    };

    const applyToWeek = () => {
        const current = new Date(selectedCell.dateStr + 'T12:00:00');
        const day = current.getDay() || 7;
        const monday = new Date(current);
        monday.setDate(current.getDate() - (day - 1));

        setShifts(prev => {
            const next = { ...prev };
            const reliever = workers.find(w => w.isReliever);

            // Helper for comparisons
            const timeToMin = (t) => {
                if (!t) return 0;
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            };

            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                const dStr = toLocalISOString(d);
                const dayIndex = d.getDay(); // 0-6

                // --- SMART SHIFT SELECTION ---
                let targetShift = { ...shift, place: currentShiftPlace };

                // If applying a Custom Shift, validate restrictions
                if (shift.type === 'custom') {
                    const originalDef = settings.customShifts.find(cs => cs.code === shift.code);
                    // If original is restricted on this day
                    if (originalDef && originalDef.allowedDays && !originalDef.allowedDays.includes(dayIndex)) {

                        // SMART MATCHING: Find the closest allowed shift for this day
                        const sourceStart = timeToMin(shift.start);

                        // 1. Filter candidates allowed on this day
                        const candidates = settings.customShifts.filter(cs => {
                            // Must be allowed on this specific day (dayIndex)
                            if (cs.allowedDays && !cs.allowedDays.includes(dayIndex)) return false;
                            return true;
                        });

                        // 2. Sort by time difference
                        let bestMatch = null;
                        if (candidates.length > 0) {
                            // Find the one with min abs difference
                            candidates.sort((a, b) => {
                                const diffA = Math.abs(timeToMin(a.start) - sourceStart);
                                const diffB = Math.abs(timeToMin(b.start) - sourceStart);
                                return diffA - diffB;
                            });
                            bestMatch = candidates[0];
                        }

                        if (bestMatch) {
                            targetShift = {
                                type: 'custom',
                                code: bestMatch.code,
                                start: bestMatch.start,
                                end: bestMatch.end,
                                customShiftId: bestMatch.id,
                                customShiftName: bestMatch.name,
                                customShiftIcon: bestMatch.icon,
                                customShiftColor: bestMatch.color,
                                place: currentShiftPlace
                            };
                        } else {
                            // No valid shift found for this day? 
                            // Fallback to 'off' to respect strict rules (can't work if no shift allowed)
                            targetShift = { type: 'off' };
                        }
                    }
                }

                next[`${selectedCell.workerId}_${dStr}`] = targetShift;

                // Auto-schedule Reliever
                if (targetShift.type === 'off' && reliever) {
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
        toast.success('Turno aplicado a toda la semana (con validación inteligente)');
        setSelectedCell(null);
    };

    return (
        <div
            className="modal-overlay z-[80] sm:items-center items-end animate-enter"
            onClick={() => setSelectedCell(null)}
        >
            <div className="w-full sm:w-[500px] liquid-glass p-0 rounded-t-[32px] sm:rounded-[32px] m-0 sm:m-4 max-h-[80dvh] sm:max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Fixed Header */}
                <div className="p-5 sm:p-6 border-b border-[var(--glass-border)] flex-none bg-[var(--bg-body)]/50 backdrop-blur-xl z-20">
                    {/* Mobile Drag Handle */}
                    <div className="sm:hidden flex justify-center mb-4 -mt-2">
                        <div className="w-10 h-1 rounded-full bg-[var(--text-tertiary)] opacity-50" />
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">{worker?.name}{worker?.isReliever && <span className="reliever-tag">Relevo</span>}</h2>
                            <p className="text-[var(--text-secondary)] text-sm capitalize">{date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                        <button onClick={() => setSelectedCell(null)} className="p-2 rounded-full hover:bg-[var(--glass-border)] transition-colors"><X size={24} /></button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 pb-32">
                    {/* Dynamic Status Types from Settings - FULL WIDTH */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {(settings.customStatuses || []).map(status => {
                            const statusIcon = SHIFT_ICONS.find(i => i.id === status.icon);
                            const IconComp = statusIcon ? statusIcon.component : null;
                            return (
                                <button
                                    key={status.id}
                                    onClick={() => update({ type: status.id, statusCode: status.code, start: '', end: '', code: null, place: currentShiftPlace, displayLocation: shift.displayLocation })}
                                    className={`p-3 rounded-xl flex items-center justify-center gap-2 border transition-all ${shift.type === status.id ? 'ring-2 ring-[var(--accent-solid)] ring-offset-1' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-border)]'}`}
                                    style={shift.type === status.id ? { backgroundColor: `${status.color}20`, borderColor: status.color, color: status.color } : {}}
                                >
                                    {IconComp ? (
                                        <div className="w-5 h-5 flex items-center justify-center" style={{ color: status.color }}>
                                            <IconComp size={16} />
                                        </div>
                                    ) : (
                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }}></div>
                                    )}
                                    <span className="text-[10px] font-bold uppercase">{status.name}</span>
                                </button>
                            );
                        })}
                        {/* Fallback: Sin Asignar */}
                        <button
                            onClick={() => update({ type: 'unassigned', start: '', end: '', code: null, place: currentShiftPlace })}
                            className={`p-3 rounded-xl flex items-center justify-center gap-2 border transition-all ${shift.type === 'unassigned' ? 'shift-btn-active ring-2 ring-[var(--accent-solid)] ring-offset-1' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-border)]'}`}
                        >
                            <div className="scale-75"><SHIFT_TYPES.unassigned.icon /></div>
                            <span className="text-[10px] font-bold uppercase">Sin Asignar</span>
                        </button>
                    </div>


                    {/* Custom shifts from settings */}
                    {settings.customShifts && settings.customShifts.length > 0 && (
                        <div className="mb-6">
                            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2">Turnos Personalizados</p>
                            <div className="flex flex-col gap-2">
                                {settings.customShifts
                                    .filter(cs => {
                                        // Filter by allowed days if defined
                                        const dayOfWeek = date.getDay(); // 0 (Sun) to 6 (Sat)
                                        const isAllowedByDay = !cs.allowedDays || cs.allowedDays.includes(dayOfWeek);
                                        // Filter by worker permissions
                                        const isAllowedByWorker = !worker.allowedShifts || worker.allowedShifts.length === 0 || worker.allowedShifts.includes(cs.code);
                                        return isAllowedByDay && isAllowedByWorker;
                                    })
                                    .map((cs) => {
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
                                                className={`p-4 rounded-xl flex items-center gap-4 border transition-all w-full ${shift.type === 'custom' && shift.code === cs.code ? 'shift-btn-active ring-2 ring-[var(--accent-solid)] ring-offset-1' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-border)]'}`}
                                                style={{ borderLeftWidth: '6px', borderLeftColor: cs.colorHex || 'var(--glass-border)' }}
                                            >
                                                <div className="p-2 rounded-xl" style={{ backgroundColor: cs.colorHex ? `${cs.colorHex}20` : 'var(--accent-solid)/10', color: cs.colorHex || 'var(--accent-solid)' }}>
                                                    <IconComp size={20} />
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <div className="text-sm font-bold truncate">{cs.name}</div>
                                                    <div className="text-xs text-[var(--text-tertiary)]">{cs.start} - {cs.end}</div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-[var(--glass-border)]" style={{ color: cs.colorHex || 'var(--accent-solid)' }}>{cs.code}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>
                            {/* Mensaje si no hay turnos personalizados para este día */}
                            {settings.customShifts.filter(cs => (!cs.allowedDays || cs.allowedDays.includes(date.getDay())) && (!worker.allowedShifts || worker.allowedShifts.length === 0 || worker.allowedShifts.includes(cs.code))).length === 0 && (
                                <p className="text-[10px] text-[var(--text-tertiary)] italic">No hay turnos personalizados disponibles para este día.</p>
                            )}
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
                    {(shift.type === 'morning' || shift.type === 'afternoon' || shift.type === 'night' || shift.type === 'custom') && (
                        <div className="space-y-4 mb-6 relative z-10">
                            <TimeSelector label="Entrada" value={shift.start || ''} onChange={val => update({ ...shift, start: val })} />
                            <TimeSelector label="Salida" value={shift.end || ''} onChange={val => update({ ...shift, end: val })} />


                            <div className="p-3 rounded-xl border border-[var(--glass-border)] bg-white/10">
                                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-2 block flex items-center gap-2"><MapPin size={12} /> Lugar de Trabajo ({workerSedeName})</label>
                                <div className="flex gap-2 flex-wrap">{availablePlaces.length > 0 ? availablePlaces.map(place => (<button key={place} onClick={() => update({ ...shift, place: place })} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex-1 whitespace-nowrap ${currentShiftPlace === place ? 'shift-btn-active' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-border)]'}`}>{place}</button>)) : <span className="text-xs text-[var(--text-tertiary)] italic">No hay lugares configurados en esta sede.</span>}</div>
                            </div>

                            {/* TOGGLE DE RECARGOS (NUEVO) */}
                            <div className="p-3 rounded-xl border border-[var(--glass-border)] bg-white/10 flex items-center justify-between">
                                <div>
                                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block flex items-center gap-2"><Shield size={12} /> Recargos / Extras</label>
                                    <p className="text-[9px] text-[var(--text-tertiary)]">Festivos, Dominicales y Nocturnas</p>
                                </div>
                                <button
                                    onClick={() => update({ ...shift, excludeSurcharges: !shift.excludeSurcharges })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${!shift.excludeSurcharges ? 'bg-green-500/20 text-green-600 border border-green-500/30' : 'bg-red-500/20 text-red-600 border border-red-500/30'}`}
                                >
                                    {!shift.excludeSurcharges ? (
                                        <><span>Activos</span><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div></>
                                    ) : (
                                        <><span>Excluidos</span><div className="w-2 h-2 rounded-full bg-red-500"></div></>
                                    )}
                                </button>
                            </div>

                            {worker.isReliever && (<div className="p-3 rounded-xl border border-[var(--glass-border)] bg-white/10"><label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-2 block flex items-center gap-2"><Shield size={12} /> ¿A quién está cubriendo?</label><select value={shift.coveringId || ''} onChange={(e) => update({ ...shift, coveringId: e.target.value ? parseInt(e.target.value) : null })} className="w-full glass-input p-3 rounded-lg text-sm bg-transparent outline-none appearance-none"><option value="">-- Sin relevo --</option>{workers.filter(w => w.id !== worker.id).map(w => <option key={w.id} value={w.id}>{w.name} ({w.role})</option>)}</select></div>)}
                        </div>
                    )}
                    <div className="pt-4 border-t border-[var(--glass-border)]"><Button onClick={applyToWeek} className="w-full bg-[var(--card-bg)] hover:bg-[var(--glass-border)] text-[var(--text-primary)] border-transparent"><Repeat size={16} /> Repetir toda la semana</Button><p className="text-[10px] text-[var(--text-tertiary)] mt-2 text-center">Esto aplicará el turno "{SHIFT_TYPES[shift.type] ? SHIFT_TYPES[shift.type].label : (settings.customStatuses?.find(s => s.id === shift.type)?.name || 'Seleccionado')}" y el lugar "{currentShiftPlace}" del Lunes al Domingo de esta semana.</p></div>
                </div>
            </div>

            {/* Validation Warning Overlay */}
            {validationPreview && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-enter" onClick={(e) => e.stopPropagation()}>
                    <div className="w-[90%] max-w-sm bg-[var(--card-bg)] p-6 rounded-2xl shadow-xl border border-[var(--warning-soft)] flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-[var(--warning-text)]">
                            <AlertCircle size={32} />
                            <h3 className="text-lg font-bold">¡Atención!</h3>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{validationPreview.message}</p>
                            {validationPreview.details && <p className="text-xs text-[var(--text-secondary)]">{validationPreview.details}</p>}
                        </div>
                        <div className="flex gap-2 mt-2">
                            <Button onClick={() => setValidationPreview(null)} className="flex-1">Cancelar</Button>
                            <Button onClick={handleConfirmConflict} active className="flex-1 !bg-[var(--warning-text)] !text-white border-transparent">Confirmar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditModal;
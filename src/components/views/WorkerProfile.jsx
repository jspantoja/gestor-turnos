import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Camera, CheckSquare, Share2, Building, MapPin, Briefcase, Calendar, ChevronLeft, ChevronRight, FileText, Plus, X, Image, MessageSquare, Check, Trash2, StickyNote, RefreshCw, Layers, Eye } from 'lucide-react';
import { EMPLOYEE_COLORS, SHIFT_TYPES, SHIFT_ICONS, SHIFT_COLORS } from '../../config/constants';
import { toLocalISOString, addDays, isToday, getShift } from '../../utils/helpers';
import { workerSchema, validate } from '../../utils/validation';
import { generateFixedRotation, generateCyclicRotation, clearPeriod, generateRotationPreview } from '../../utils/rotationLogic';
import Button from '../shared/Button';
import { useToast } from '../shared/Toast';

const WorkerProfile = ({ worker: initialWorker, onBack, setWorkers, shifts, setShifts, autoScheduleReliever, sedes, settings, readOnly = false }) => {
    const [worker, setWorker] = useState(initialWorker);
    const [noteText, setNoteText] = useState('');
    const [noteType, setNoteType] = useState('text');
    const [linkCopied, setLinkCopied] = useState(false);
    const [currentProfileDate, setCurrentProfileDate] = useState(new Date());
    const [selectedImage, setSelectedImage] = useState(null);
    const [errors, setErrors] = useState(null);

    // NEW Simplified Rotation System State
    const [showRotationPanel, setShowRotationPanel] = useState(false);
    const [rotationMode, setRotationMode] = useState('fixed'); // 'fixed' or 'cyclic'
    const [rotationStartDate, setRotationStartDate] = useState(toLocalISOString(new Date()));
    const [rotationDuration, setRotationDuration] = useState(3); // months
    const [restDay, setRestDay] = useState(0); // 0=Sunday by default
    const [selectedShiftCode, setSelectedShiftCode] = useState(''); // For fixed mode
    const [cycleShifts, setCycleShifts] = useState([]); // For cyclic mode: array of shift codes
    const [showPreview, setShowPreview] = useState(false);

    const avatarInputRef = useRef(null);
    const noteImageInputRef = useRef(null);
    const toast = useToast();

    // ... (Existing worker update logic)
    const updateWorker = (updates) => {
        if (readOnly) return;
        const updatedWorker = { ...worker, ...updates };
        setWorker(updatedWorker);
        if (updates.name !== undefined) {
            const result = validate(workerSchema.pick({ name: true }), { name: updatedWorker.name });
            if (!result.success) {
                setErrors(result.errors);
                return;
            } else {
                setErrors(null);
            }
        }
        setWorkers(prev => prev.map(w => w.id === worker.id ? updatedWorker : w));
    };

    const updateSimpleField = (updates) => {
        const updatedWorker = { ...worker, ...updates };
        setWorker(updatedWorker);
        setWorkers(prev => prev.map(w => w.id === worker.id ? updatedWorker : w));
    };

    // --- CORRECCIÓN DE LÓGICA ---
    // undefined/null = todos permitidos (comportamiento por defecto)
    // [] = ninguno permitido
    // ['code1', 'code2'] = solo esos permitidos
    const handleAllowedShiftsChange = (shiftCode, isChecked) => {
        // Si es undefined (todos), inicializamos con la lista completa para poder deseleccionar.
        const currentAllowed = worker.allowedShifts === undefined || worker.allowedShifts === null
            ? settings.customShifts.map(cs => cs.code)
            : worker.allowedShifts;

        let newAllowed;

        if (isChecked) {
            // Add shift if not present
            newAllowed = [...new Set([...currentAllowed, shiftCode])];
        } else {
            // Remove shift
            newAllowed = currentAllowed.filter(code => code !== shiftCode);
        }

        // Si el resultado es que todos están marcados, volvemos al estado `undefined` para "todos permitidos".
        if (newAllowed.length === settings.customShifts.length) newAllowed = undefined;

        updateSimpleField({ allowedShifts: newAllowed });
    };

    // ... (Existing Note/Avatar logic remains unchanged)
    const handleAddNote = () => {
        if (readOnly) return;
        if (!noteText.trim() && !selectedImage) return;

        const newNote = {
            id: Date.now(),
            type: selectedImage ? 'image' : noteType,
            content: noteText,
            date: new Date().toISOString(),
            checked: false,
            image: selectedImage
        };

        updateSimpleField({ notes: [newNote, ...(worker.notes || [])] });
        setNoteText('');
        setSelectedImage(null);
        setNoteType('text');
    };

    const handleAvatarUpload = (e) => {
        if (readOnly) return;
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => updateSimpleField({ avatar: reader.result });
            reader.readAsDataURL(file);
        }
    };

    const handleNoteImageSelect = (e) => {
        if (readOnly) return;
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result);
                setNoteType('image');
            };
            reader.readAsDataURL(file);
        }
    };

    const deleteNote = (id) => { if (!readOnly) updateSimpleField({ notes: worker.notes.filter(n => n.id !== id) }); };
    const toggleCheck = (id) => { if (!readOnly) updateSimpleField({ notes: worker.notes.map(n => n.id === id ? { ...n, checked: !n.checked } : n) }); };

    const copyPublicLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?view=public&workerId=${worker.id}`;
        navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const weekDays = useMemo(() => {
        const now = new Date(currentProfileDate);
        const day = now.getDay() || 7;
        const start = new Date(now);
        start.setHours(-24 * (day - 1));
        const days = [];
        for (let i = 0; i < 7; i++) { days.push(addDays(start, i)); }
        return days;
    }, [currentProfileDate]);

    const cycleShift = (dateStr) => {
        if (readOnly) return;
        const currentShift = getShift(shifts, worker.id, dateStr); const types = Object.keys(SHIFT_TYPES); const currentIndex = types.indexOf(currentShift.type || 'off'); const nextType = types[(currentIndex + 1) % types.length]; const def = nextType === 'morning' ? { start: '08:00', end: '16:00' } : nextType === 'afternoon' ? { start: '14:00', end: '22:00' } : nextType === 'night' ? { start: '22:00', end: '06:00' } : { start: '', end: '' }; setShifts(prev => ({ ...prev, [`${worker.id}_${dateStr}`]: { type: nextType, ...def, coveringId: currentShift.coveringId } }));
    };

    // --- NEW SIMPLIFIED ROTATION SYSTEM HANDLERS ---

    // Build list of all available shifts (standard + custom)
    const allAvailableShifts = useMemo(() => {
        const standard = [
            { code: 'morning', name: 'Mañana', start: '08:00', end: '16:00', type: 'morning' },
            { code: 'afternoon', name: 'Tarde', start: '14:00', end: '22:00', type: 'afternoon' },
            { code: 'night', name: 'Noche', start: '22:00', end: '06:00', type: 'night' }
        ];
        const custom = (settings.customShifts || []).map(cs => ({
            code: cs.code,
            name: `${cs.name} (${cs.code})`,
            start: cs.start,
            end: cs.end,
            type: 'custom',
            customShiftId: cs.id,
            customShiftName: cs.name,
            customShiftIcon: cs.icon,
            customShiftColor: cs.color
        }));
        return [...standard, ...custom];
    }, [settings.customShifts]);

    // Get shift config from code
    const getShiftConfigByCode = (code) => {
        const found = allAvailableShifts.find(s => s.code === code);
        if (!found) return { type: 'morning', start: '08:00', end: '16:00' };
        return { ...found };
    };

    // Add shift to cycle (for cyclic mode)
    const addToCycle = (code) => {
        if (!code) return;
        setCycleShifts(prev => [...prev, code]);
    };

    // Remove shift from cycle
    const removeFromCycle = (index) => {
        setCycleShifts(prev => prev.filter((_, i) => i !== index));
    };

    // Generate preview data
    const previewData = useMemo(() => {
        if (!showPreview) return [];

        const shiftConfig = getShiftConfigByCode(selectedShiftCode);
        const cycleConfigs = cycleShifts.map(code => getShiftConfigByCode(code));

        return generateRotationPreview(
            rotationStartDate,
            4, // Show 4 weeks preview
            shiftConfig,
            restDay,
            rotationMode === 'fixed',
            cycleConfigs
        );
    }, [showPreview, rotationStartDate, selectedShiftCode, restDay, rotationMode, cycleShifts]);

    // Apply the rotation
    const applyRotation = () => {
        let updates = {};

        if (rotationMode === 'fixed') {
            if (!selectedShiftCode) {
                toast.show("Selecciona un turno base.", "error");
                return;
            }
            const shiftConfig = getShiftConfigByCode(selectedShiftCode);
            updates = generateFixedRotation(worker.id, rotationStartDate, rotationDuration, shiftConfig, restDay);
        } else {
            if (cycleShifts.length === 0) {
                toast.show("Agrega al menos un turno al ciclo.", "error");
                return;
            }
            const cycleConfigs = cycleShifts.map(code => getShiftConfigByCode(code));
            updates = generateCyclicRotation(worker.id, rotationStartDate, rotationDuration, cycleConfigs, restDay);
        }

        if (Object.keys(updates).length > 0) {
            setShifts(prev => ({ ...prev, ...updates }));
            toast.show(`Rotación aplicada: ${Object.keys(updates).length} días programados.`, "success");
            setShowRotationPanel(false);
            setShowPreview(false);
        } else {
            toast.show("No se generaron cambios. Revisa las fechas.", "warning");
        }
    };

    // Clear period handler
    const handleClearPeriod = () => {
        if (!window.confirm("¿Seguro que deseas borrar todos los turnos del periodo seleccionado?")) return;
        const startDate = new Date(rotationStartDate + 'T00:00:00');
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + rotationDuration);
        const updates = clearPeriod(worker.id, rotationStartDate, toLocalISOString(endDate));
        setShifts(prev => ({ ...prev, ...updates }));
        toast.show("Periodo limpiado correctamente.", "success");
    };


    const selectedSedeObj = sedes.find(s => s.name === (worker.sede || worker.location));
    const availablePlaces = selectedSedeObj ? selectedSedeObj.places : [];

    return (
        <div className="flex flex-col h-full animate-enter relative bg-[var(--bg-body)] z-50">
            {/* Header */}
            <div className="px-6 pt-10 pb-4 border-b border-[var(--glass-border)] sticky top-0 bg-[var(--bg-body)] z-40 shadow-sm">
                {!readOnly && (
                    <button onClick={onBack} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:translate-x-[-4px] transition-all mb-4 group">
                        <div className="p-1.5 rounded-full bg-[var(--glass-dock)] group-hover:bg-[var(--glass-border)]"><ArrowLeft size={20} /></div>
                        <span className="text-sm font-bold uppercase tracking-wider">Volver al equipo</span>
                    </button>
                )}
                {!readOnly && (<button onClick={onBack} className="absolute top-8 right-6 p-2 rounded-full bg-[var(--glass-dock)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all shadow-sm z-50" title="Cerrar ficha"><X size={20} /></button>)}

                <div className="flex flex-col sm:flex-row gap-6">
                    {/* AVATAR SECTION */}
                    <div className={`relative group self-center sm:self-start ${!readOnly ? 'cursor-pointer' : ''}`}>
                        <div className="w-24 h-24 rounded-full bg-[var(--glass-border)] overflow-hidden border-4" style={{ borderColor: worker.color || 'var(--text-primary)' }}>
                            {worker.avatar ? <img src={worker.avatar} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[var(--text-secondary)]">{worker.name?.[0] || '?'}</div>}
                        </div>
                        {!readOnly && (
                            <>
                                <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={() => avatarInputRef.current.click()}><Camera className="text-white" size={24} /></div>
                                <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
                            </>
                        )}
                    </div>

                    {/* FIELDS SECTION */}
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                            {readOnly ? <h2 className="text-2xl font-bold text-[var(--text-primary)]">{worker.name}</h2> : (
                                <div className="w-full">
                                    <input value={worker.name} onChange={(e) => updateWorker({ name: e.target.value })} className={`text-2xl font-bold text-[var(--text-primary)] bg-transparent outline-none w-full ${errors?.name ? 'border-b border-red-500' : ''}`} />
                                    {errors?.name && <span className="text-[10px] text-red-400 font-bold block">{errors.name}</span>}
                                </div>
                            )}
                            {!readOnly && (<button onClick={copyPublicLink} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${linkCopied ? 'bg-green-500 text-white' : 'bg-[var(--glass-dock)] text-[var(--text-primary)] border border-[var(--glass-border)]'}`}>{linkCopied ? <CheckSquare size={14} /> : <Share2 size={14} />}{linkCopied ? '¡Copiado!' : 'Link Público'}</button>)}
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                            <div><label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block mb-1">Nombre Corto (Opcional)</label>{readOnly ? <div className="text-sm text-[var(--text-primary)] font-medium">{worker.displayName || 'No asignado'}</div> : <input value={worker.displayName || ''} onChange={(e) => updateSimpleField({ displayName: e.target.value })} placeholder="Ej: Juan C." className="glass-input p-2 w-full text-sm" />}</div>
                            <div><label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block mb-1">Cédula (ID)</label>{readOnly ? <div className="text-sm text-[var(--text-primary)] font-medium font-mono">{worker.cedula || 'No asignada'}</div> : <input value={worker.cedula || ''} onChange={(e) => updateSimpleField({ cedula: e.target.value })} placeholder="Ej: 175222459" className="glass-input p-2 w-full text-sm font-mono" />}</div>
                            <div><label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block mb-1">Cargo</label>{readOnly ? <div className="text-sm text-[var(--text-primary)] font-medium">{worker.role || 'Sin cargo'}</div> : <input value={worker.role || ''} onChange={(e) => updateSimpleField({ role: e.target.value })} className="glass-input p-2 w-full text-sm" />}</div>
                            <div className="col-span-1"><label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block mb-1 flex items-center gap-1"><Building size={10} /> Sede Principal</label>{readOnly ? <div className="text-sm text-[var(--text-primary)] font-medium">{worker.sede || worker.location || 'Sin sede'}</div> : <select value={worker.sede || worker.location || ''} onChange={(e) => updateSimpleField({ sede: e.target.value, lugar: '' })} className="glass-input p-2 w-full text-sm outline-none"><option value="">Seleccionar Sede</option>{sedes.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}</select>}</div>
                            <div className="col-span-1"><label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block mb-1 flex items-center gap-1"><MapPin size={10} /> Lugar (Default)</label>{readOnly ? <div className="text-sm text-[var(--text-primary)] font-medium">{worker.lugar || 'Sin lugar asignado'}</div> : <select value={worker.lugar || ''} onChange={(e) => updateSimpleField({ lugar: e.target.value })} className="glass-input p-2 w-full text-sm outline-none" disabled={!worker.sede && !worker.location}><option value="">Seleccionar Lugar</option>{availablePlaces.map(p => <option key={p} value={p}>{p}</option>)}</select>}</div>
                            {!readOnly && (<div className="col-span-1 flex flex-col justify-end"><div className="glass-panel p-2 rounded-xl flex items-center justify-between h-[38px]"><span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] flex items-center gap-2"><Briefcase size={12} /> Relevante</span><div onClick={() => updateSimpleField({ isReliever: !worker.isReliever })} className={`w-8 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors ${worker.isReliever ? 'bg-[var(--text-primary)]' : 'bg-[var(--glass-border)]'}`}><div className={`w-4 h-4 bg-[var(--bg-body)] rounded-full shadow-md transform transition-transform ${worker.isReliever ? 'translate-x-3' : ''}`} /></div></div></div>)}
                        </div>

                        {!readOnly && (
                            <div className="flex items-center gap-2 pt-2 justify-between">
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)]">Color:</label>
                                    <div className="flex gap-1">{EMPLOYEE_COLORS.slice(0, 5).map(c => (<button key={c} onClick={() => updateSimpleField({ color: c })} className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${worker.color === c ? 'ring-2 ring-offset-1 ring-[var(--text-primary)]' : ''}`} style={{ backgroundColor: c }} />))}</div>
                                </div>
                                {worker.isReliever && (<button onClick={() => autoScheduleReliever && autoScheduleReliever(worker.id)} className="text-[10px] font-bold uppercase bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-1"><Briefcase size={12} /> Auto-Asignar</button>)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 space-y-8">

                {/* --- ROTATION SYSTEM SECTION (NEW) --- */}
                {!readOnly && (
                    <div className="glass-panel rounded-2xl p-5 border border-[var(--glass-border)]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                                <RefreshCw size={14} className={showRotationPanel ? "animate-spin-slow" : ""} />
                                Gestor de Rotación
                            </h3>
                            <button
                                onClick={() => setShowRotationPanel(!showRotationPanel)}
                                className={`text-[10px] font-bold uppercase px-3 py-1 rounded-lg transition-all border ${showRotationPanel ? 'bg-[var(--text-primary)] text-[var(--bg-body)] border-transparent' : 'bg-[var(--glass-dock)] text-[var(--text-secondary)] border-[var(--glass-border)]'}`}
                            >
                                {showRotationPanel ? 'Ocultar' : 'Configurar'}
                            </button>
                        </div>

                        {/* Collapsible Content */}
                        <div className={`overflow-hidden transition-all duration-300 ${showRotationPanel ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <p className="text-xs text-[var(--text-tertiary)] mb-4">Programa turnos automáticamente para este trabajador.</p>

                            {/* Mode Selector */}
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={() => setRotationMode('fixed')}
                                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all border ${rotationMode === 'fixed' ? 'bg-[var(--text-primary)] text-[var(--bg-body)] border-transparent' : 'bg-[var(--glass-dock)] text-[var(--text-secondary)] border-[var(--glass-border)]'}`}
                                >
                                    🔒 Turno Fijo
                                </button>
                                <button
                                    onClick={() => setRotationMode('cyclic')}
                                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all border ${rotationMode === 'cyclic' ? 'bg-[var(--text-primary)] text-[var(--bg-body)] border-transparent' : 'bg-[var(--glass-dock)] text-[var(--text-secondary)] border-[var(--glass-border)]'}`}
                                >
                                    🔄 Rotativo
                                </button>
                            </div>

                            {/* Fixed Mode Configuration */}
                            {rotationMode === 'fixed' && (
                                <div className="space-y-4 mb-6 p-4 rounded-xl bg-[var(--glass-dock)] border border-[var(--glass-border)]">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-2">Turno Base</label>
                                        <select
                                            value={selectedShiftCode}
                                            onChange={(e) => setSelectedShiftCode(e.target.value)}
                                            className="glass-input w-full p-3 text-sm outline-none rounded-lg"
                                        >
                                            <option value="">-- Seleccionar Turno --</option>
                                            <optgroup label="Turnos Estándar">
                                                <option value="morning">🌅 Mañana (08:00 - 16:00)</option>
                                                <option value="afternoon">🌆 Tarde (14:00 - 22:00)</option>
                                                <option value="night">🌙 Noche (22:00 - 06:00)</option>
                                            </optgroup>
                                            {settings.customShifts && settings.customShifts.length > 0 && (
                                                <optgroup label="Turnos Personalizados">
                                                    {settings.customShifts.map(cs => (
                                                        <option key={cs.id} value={cs.code}>
                                                            {cs.icon || '📋'} {cs.name} ({cs.start} - {cs.end})
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Cyclic Mode Configuration */}
                            {rotationMode === 'cyclic' && (
                                <div className="space-y-4 mb-6 p-4 rounded-xl bg-[var(--glass-dock)] border border-[var(--glass-border)]">
                                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-2">Secuencia de Turnos (Ciclo)</label>

                                    {/* Current cycle display */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {cycleShifts.length === 0 ? (
                                            <span className="text-xs text-[var(--text-tertiary)] italic">Agrega turnos al ciclo...</span>
                                        ) : (
                                            cycleShifts.map((code, idx) => {
                                                const shift = allAvailableShifts.find(s => s.code === code);
                                                return (
                                                    <div key={idx} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-body)] border border-[var(--glass-border)] text-xs font-bold">
                                                        <span className="text-[var(--text-secondary)]">S{idx + 1}:</span>
                                                        <span className="text-[var(--text-primary)]">{shift?.name || code}</span>
                                                        <button onClick={() => removeFromCycle(idx)} className="ml-1 text-red-500 hover:text-red-600"><X size={12} /></button>
                                                        {idx < cycleShifts.length - 1 && <span className="text-[var(--text-tertiary)] ml-1">→</span>}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Add to cycle */}
                                    <div className="flex gap-2">
                                        <select
                                            id="cycleShiftSelect"
                                            className="glass-input flex-1 p-2 text-sm outline-none rounded-lg"
                                            defaultValue=""
                                        >
                                            <option value="">-- Agregar Turno --</option>
                                            <optgroup label="Turnos Estándar">
                                                <option value="morning">🌅 Mañana</option>
                                                <option value="afternoon">🌆 Tarde</option>
                                                <option value="night">🌙 Noche</option>
                                            </optgroup>
                                            {settings.customShifts && settings.customShifts.length > 0 && (
                                                <optgroup label="Turnos Personalizados">
                                                    {settings.customShifts.map(cs => (
                                                        <option key={cs.id} value={cs.code}>{cs.icon || '📋'} {cs.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                        <button
                                            onClick={() => {
                                                const select = document.getElementById('cycleShiftSelect');
                                                if (select.value) {
                                                    addToCycle(select.value);
                                                    select.value = '';
                                                }
                                            }}
                                            className="px-4 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-body)] text-xs font-bold"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-tertiary)]">Cada semana usará el siguiente turno del ciclo.</p>
                                </div>
                            )}

                            {/* Common Settings: Rest Day */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-1">Día de Descanso</label>
                                    <select
                                        value={restDay}
                                        onChange={(e) => setRestDay(parseInt(e.target.value))}
                                        className="glass-input w-full p-2 text-sm outline-none rounded-lg"
                                    >
                                        <option value={0}>Domingo</option>
                                        <option value={1}>Lunes</option>
                                        <option value={2}>Martes</option>
                                        <option value={3}>Miércoles</option>
                                        <option value={4}>Jueves</option>
                                        <option value={5}>Viernes</option>
                                        <option value={6}>Sábado</option>
                                        <option value={-1}>Sin día fijo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-1">Fecha Inicio</label>
                                    <input type="date" value={rotationStartDate} onChange={(e) => setRotationStartDate(e.target.value)} className="glass-input w-full p-2 text-sm rounded-lg" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-1">Duración (Meses)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={rotationDuration}
                                        onChange={(e) => setRotationDuration(parseInt(e.target.value) || 1)}
                                        className="glass-input w-full p-2 text-sm text-center rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Preview Section */}
                            <div className="mb-6">
                                <button
                                    onClick={() => setShowPreview(!showPreview)}
                                    className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-2"
                                >
                                    <Eye size={14} /> {showPreview ? 'Ocultar' : 'Ver'} Previsualización
                                </button>

                                {showPreview && previewData.length > 0 && (
                                    <div className="p-3 rounded-xl bg-[var(--glass-dock)] border border-[var(--glass-border)] overflow-x-auto">
                                        <div className="flex gap-1 min-w-max">
                                            {previewData.slice(0, 28).map((item, idx) => {
                                                const isOff = item.shift?.type === 'off';
                                                const shiftStyle = SHIFT_TYPES[item.shift?.type]?.style || 'bg-gray-500/10 text-gray-400';
                                                const isNewWeek = idx > 0 && item.dayOfWeek === 1;
                                                return (
                                                    <div key={idx} className={`flex flex-col items-center ${isNewWeek ? 'ml-2 pl-2 border-l border-[var(--glass-border)]' : ''}`}>
                                                        <span className="text-[8px] text-[var(--text-tertiary)]">{['D', 'L', 'M', 'X', 'J', 'V', 'S'][item.dayOfWeek]}</span>
                                                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold ${shiftStyle}`}>
                                                            {isOff ? '-' : (item.shift?.code?.substring(0, 1) || SHIFT_TYPES[item.shift?.type]?.code || '?')}
                                                        </div>
                                                        <span className="text-[8px] text-[var(--text-tertiary)]">{item.date.getDate()}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[9px] text-[var(--text-tertiary)] mt-2 text-center">Primeras 4 semanas</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 pt-4 border-t border-[var(--glass-border)]">
                                <Button onClick={applyRotation} variant="primary" icon={RefreshCw} className="w-full justify-center">Aplicar Rotación</Button>

                                <button onClick={handleClearPeriod} className="w-full py-3 rounded-xl border border-red-500/30 text-red-500 text-xs font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
                                    <Trash2 size={14} /> Limpiar Periodo
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* Weekly Schedule Preview */}
                <div className="glass-panel rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2"><Calendar size={14} /> Turnos</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentProfileDate(prev => addDays(prev, -7))} className="p-1 rounded-full hover:bg-[var(--glass-border)] text-[var(--text-secondary)]"><ChevronLeft size={16} /></button>
                            <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                {currentProfileDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} - {addDays(currentProfileDate, 6).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                            </span>
                            <button onClick={() => setCurrentProfileDate(prev => addDays(prev, 7))} className="p-1 rounded-full hover:bg-[var(--glass-border)] text-[var(--text-secondary)]"><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    <div className="flex justify-center gap-1 overflow-x-auto pb-2 no-scrollbar">
                        {weekDays.map(date => {
                            const dateStr = toLocalISOString(date);
                            const shift = getShift(shifts, worker.id, dateStr);
                            const isTodayDay = isToday(date);
                            return (
                                <div key={dateStr} onClick={() => cycleShift(dateStr)} className={`flex flex-col items-center gap-1 w-[50px] p-2 rounded-xl border transition-all ${!readOnly ? 'cursor-pointer hover:bg-[var(--glass-dock)]' : ''} ${isTodayDay ? 'bg-[var(--today-highlight)] border-[var(--accent-solid)]' : 'border-[var(--glass-border)]'}`}>
                                    <span className="text-[9px] font-bold uppercase text-[var(--text-tertiary)]">{date.toLocaleDateString('es-ES', { weekday: 'short' }).substring(0, 2)}</span>
                                    <span className={`text-sm font-bold ${isTodayDay ? 'text-[var(--accent-solid)]' : 'text-[var(--text-primary)]'}`}>{date.getDate()}</span>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${SHIFT_TYPES[shift.type]?.style || SHIFT_TYPES.off.style}`}>
                                        {SHIFT_TYPES[shift.type]?.code || '-'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- SHIFT PERMISSIONS --- */}
                {!readOnly && settings.customShifts && settings.customShifts.length > 0 && (
                    <div className="glass-panel rounded-2xl p-5 border border-[var(--glass-border)]">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4 flex items-center gap-2"><Layers size={14} /> Permisos de Turnos</h3>
                        <p className="text-xs text-[var(--text-tertiary)] mb-4">Selecciona los turnos que este trabajador puede realizar. Si todos están marcados, tiene acceso a todos. Si ninguno está marcado, no podrá ser asignado a turnos personalizados.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {settings.customShifts.map(shift => {
                                // CORRECCIÓN: La casilla está marcada si el estado es "todos" (undefined) o si el código está en el array.
                                const isAllowed = worker.allowedShifts === undefined || worker.allowedShifts === null || worker.allowedShifts.includes(shift.code);
                                return (
                                    <label key={shift.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--glass-dock)] border border-[var(--glass-border)] cursor-pointer hover:bg-[var(--glass-border)] transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={isAllowed}
                                            onChange={(e) => handleAllowedShiftsChange(shift.code, e.target.checked)}
                                            className="w-4 h-4 rounded text-[var(--accent-solid)] bg-[var(--bg-body)] border-[var(--glass-border)] focus:ring-[var(--accent-solid)]"
                                        />
                                        <span className="text-sm font-medium text-[var(--text-primary)]">{shift.name} <span className="text-xs text-[var(--text-tertiary)]">({shift.code})</span></span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Bitácora / Notas */}
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4 flex items-center gap-2"><FileText size={14} /> Bitácora Personal</h3>

                    {!readOnly && (
                        <div className="glass-panel rounded-2xl p-4 mb-6">
                            <div className="flex gap-2 mb-3">
                                <button onClick={() => setNoteType('text')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${noteType === 'text' && !selectedImage ? 'bg-[var(--text-primary)] text-[var(--bg-body)]' : 'bg-[var(--glass-dock)] text-[var(--text-secondary)]'}`}>Texto</button>
                                <button onClick={() => setNoteType('task')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${noteType === 'task' ? 'bg-[var(--text-primary)] text-[var(--bg-body)]' : 'bg-[var(--glass-dock)] text-[var(--text-secondary)]'}`}>Tarea</button>
                                <button onClick={() => noteImageInputRef.current.click()} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${selectedImage ? 'bg-[var(--text-primary)] text-[var(--bg-body)]' : 'bg-[var(--glass-dock)] text-[var(--text-secondary)]'}`}>Imagen</button>
                            </div>

                            {selectedImage && (
                                <div className="mb-3 relative inline-block">
                                    <img src={selectedImage} alt="Preview" className="h-24 w-auto rounded-lg border border-[var(--glass-border)]" />
                                    <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"><X size={12} /></button>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <input
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                    placeholder={noteType === 'task' ? "Nueva tarea..." : "Escribe una nota..."}
                                    className="flex-1 glass-input p-2 text-sm rounded-xl"
                                />
                                <button onClick={handleAddNote} className="p-2 rounded-xl bg-[var(--accent-solid)] text-[var(--accent-text)]"><Plus size={20} /></button>
                                <input type="file" ref={noteImageInputRef} hidden accept="image/*" onChange={handleNoteImageSelect} />
                            </div>
                        </div>
                    )}

                    <div className="space-y-6 pb-20">
                        {(worker.notes || []).map(note => (
                            <div key={note.id} className="glass-panel rounded-2xl p-0 overflow-hidden animate-enter group relative">
                                <div className="bg-[var(--glass-dock)] px-4 py-2 flex justify-between items-center border-b border-[var(--glass-border)]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-[var(--bg-body)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--glass-border)]">
                                            {note.type === 'image' ? <Image size={12} /> : note.type === 'task' ? <CheckSquare size={12} /> : <MessageSquare size={12} />}
                                        </div>
                                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{new Date(note.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                    </div>
                                    <span className="text-[10px] text-[var(--text-tertiary)]">{new Date(note.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                <div className="p-4">
                                    {note.type === 'image' && note.image ? (
                                        <div className="mb-3 rounded-xl overflow-hidden border border-[var(--glass-border)] shadow-sm bg-black/5">
                                            <img src={note.image} alt="note attachment" className="w-auto max-w-full h-auto max-h-80 rounded-lg mx-auto block" />
                                        </div>
                                    ) : null}

                                    <div className="flex items-start gap-3">
                                        {note.type === 'task' && (
                                            <button onClick={() => toggleCheck(note.id)} className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${note.checked ? 'bg-green-500 border-green-500 text-white' : 'border-[var(--text-tertiary)] text-transparent'} ${readOnly ? 'cursor-default' : ''}`}>
                                                <Check size={12} strokeWidth={4} />
                                            </button>
                                        )}
                                        {note.content && <p className={`text-sm text-[var(--text-primary)] break-words leading-relaxed ${note.checked ? 'line-through text-[var(--text-tertiary)]' : ''}`}>{note.content}</p>}
                                    </div>
                                </div>

                                {!readOnly && (
                                    <button onClick={() => deleteNote(note.id)} className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {(!worker.notes || worker.notes.length === 0) && (
                            <div className="text-center py-12 opacity-50">
                                <div className="w-16 h-16 rounded-full bg-[var(--glass-dock)] flex items-center justify-center mx-auto mb-3 text-[var(--text-tertiary)]">
                                    <StickyNote size={32} />
                                </div>
                                <p className="text-sm text-[var(--text-secondary)]">La bitácora está vacía.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkerProfile;

import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Camera, CheckSquare, Share2, Building, MapPin, Briefcase, Calendar, ChevronLeft, ChevronRight, FileText, Plus, X, Image, MessageSquare, Check, Trash2, StickyNote, RefreshCw, Layers, Eye, AlertCircle, Coffee, Shield, Zap, UserCheck, Activity } from 'lucide-react';
import { EMPLOYEE_COLORS, SHIFT_TYPES, SHIFT_ICONS, SHIFT_COLORS } from '../../config/constants';
import { toLocalISOString, addDays, isToday, getShift } from '../../utils/helpers';
import { workerSchema, validate } from '../../utils/validation';
import { generateFixedRotation, generateCyclicRotation, clearPeriod, generateRotationPreview } from '../../utils/rotationLogic';
import Button from '../shared/Button';
import TimeSelector from '../shared/TimeSelector';
import { useToast } from '../shared/Toast';

const WorkerProfile = ({ worker: initialWorker, onBack, setWorkers, shifts, setShifts, autoScheduleReliever, sedes, settings, readOnly = false }) => {
    const [worker, setWorker] = useState(initialWorker);
    const [noteText, setNoteText] = useState('');
    const [noteType, setNoteType] = useState('text');
    const [linkCopied, setLinkCopied] = useState(false);
    const [currentProfileDate, setCurrentProfileDate] = useState(new Date());
    const [selectedImage, setSelectedImage] = useState(null);
    const [errors, setErrors] = useState(null);
    const [selectedDateStr, setSelectedDateStr] = useState(null);

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
        <div className="flex flex-col h-full animate-enter relative bg-[var(--bg-body)] z-50 overflow-hidden">
            {/* --- SLIM STICKY HEADER --- */}
            <div className="px-4 py-3 border-b border-[var(--glass-border)] sticky top-0 bg-[var(--bg-body)]/80 backdrop-blur-md z-[60] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {!readOnly && (
                        <button onClick={onBack} className="p-2 rounded-full bg-[var(--glass-dock)] text-[var(--text-secondary)] hover:bg-[var(--glass-border)] hover:text-[var(--text-primary)] transition-all group">
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--glass-border)] overflow-hidden border-2" style={{ borderColor: worker.color || 'var(--text-primary)' }}>
                            {worker.avatar ? <img src={worker.avatar} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">{worker.name?.[0] || '?'}</div>}
                        </div>
                        <h2 className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[150px] sm:max-w-[300px]">{worker.name}</h2>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!readOnly && (<button onClick={copyPublicLink} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${linkCopied ? 'bg-green-500 text-white' : 'bg-[var(--glass-dock)] text-[var(--text-primary)] border border-[var(--glass-border)]'}`}>{linkCopied ? <CheckSquare size={12} /> : <Share2 size={12} />}{linkCopied ? 'Copiado' : 'Link'}</button>)}
                    {!readOnly && (<button onClick={onBack} className="p-2 rounded-full bg-[var(--glass-dock)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:bg-red-500/10 hover:text-red-500 transition-all" title="Cerrar"><X size={18} /></button>)}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
                {/* --- INFORMACIÓN GENERAL (Scrollable) --- */}
                <div className="px-6 py-6 space-y-6">
                    <div className="glass-panel rounded-3xl p-6 border border-[var(--glass-border)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-solid)]/5 rounded-bl-[100px] -z-10"></div>

                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Avatar Section */}
                            <div className={`relative group self-center md:self-start ${!readOnly ? 'cursor-pointer' : ''}`}>
                                <div className="w-32 h-32 rounded-3xl bg-[var(--glass-border)] overflow-hidden border-4 shadow-xl transform transition-transform group-hover:scale-[1.02]" style={{ borderColor: worker.color || 'var(--text-primary)' }}>
                                    {worker.avatar ? <img src={worker.avatar} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[var(--text-secondary)]">{worker.name?.[0] || '?'}</div>}
                                </div>
                                {!readOnly && (
                                    <>
                                        <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-2" onClick={() => avatarInputRef.current.click()}>
                                            <Camera className="text-white" size={28} />
                                            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Cambiar Foto</span>
                                        </div>
                                        <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
                                    </>
                                )}
                            </div>

                            {/* Detailed Fields */}
                            <div className="flex-1 space-y-5">
                                <div>
                                    <label className="text-[11px] font-black uppercase text-[var(--text-tertiary)] tracking-widest pl-1 mb-1.5 block">Nombre Completo</label>
                                    {readOnly ? (
                                        <div className="text-2xl font-black text-[var(--text-primary)] pl-1">{worker.name}</div>
                                    ) : (
                                        <div className="relative group/input">
                                            <input
                                                value={worker.name}
                                                onChange={(e) => updateWorker({ name: e.target.value })}
                                                placeholder="Ej: Clara Elena Alegría"
                                                className={`text-2xl font-black text-[var(--text-primary)] bg-transparent outline-none w-full border-b-2 transition-colors ${errors?.name ? 'border-red-500' : 'border-[var(--glass-border)] focus:border-[var(--accent-solid)]'}`}
                                            />
                                            {errors?.name && <span className="text-[10px] text-red-500 font-bold mt-1 block">{errors.name}</span>}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider pl-1 flex items-center gap-1.5">
                                            <UserCheck size={12} className="text-[var(--accent-solid)]" /> Nombre Corto
                                        </label>
                                        {readOnly ? (
                                            <div className="glass-input p-3 text-sm font-bold text-[var(--text-primary)]">{worker.displayName || '-'}</div>
                                        ) : (
                                            <input
                                                value={worker.displayName || ''}
                                                onChange={(e) => updateSimpleField({ displayName: e.target.value })}
                                                placeholder="Para el calendario"
                                                className="glass-input p-3 w-full text-sm font-bold bg-white/5 border-[var(--glass-border)] focus:bg-white/10"
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider pl-1 flex items-center gap-1.5">
                                            <Zap size={12} className="text-[var(--accent-solid)]" /> Cédula (ID)
                                        </label>
                                        {readOnly ? (
                                            <div className="glass-input p-3 text-sm font-mono font-bold text-[var(--text-primary)]">{worker.cedula || '-'}</div>
                                        ) : (
                                            <input
                                                value={worker.cedula || ''}
                                                onChange={(e) => updateSimpleField({ cedula: e.target.value })}
                                                placeholder="Número de identificación"
                                                className="glass-input p-3 w-full text-sm font-mono font-bold bg-white/5 border-[var(--glass-border)] focus:bg-white/10"
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider pl-1 flex items-center gap-1.5">
                                            <Briefcase size={12} className="text-[var(--accent-solid)]" /> Cargo / Puesto
                                        </label>
                                        {readOnly ? (
                                            <div className="glass-input p-3 text-sm font-bold text-[var(--text-primary)]">{worker.role || '-'}</div>
                                        ) : (
                                            <input
                                                value={worker.role || ''}
                                                onChange={(e) => updateSimpleField({ role: e.target.value })}
                                                placeholder="Ej: Jefe de Turno"
                                                className="glass-input p-3 w-full text-sm font-bold bg-white/5 border-[var(--glass-border)] focus:bg-white/10"
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider pl-1 flex items-center gap-1.5">
                                            <Building size={12} className="text-[var(--accent-solid)]" /> Sede
                                        </label>
                                        {readOnly ? (
                                            <div className="glass-input p-3 text-sm font-bold text-[var(--text-primary)]">{worker.sede || worker.location || '-'}</div>
                                        ) : (
                                            <select
                                                value={worker.sede || worker.location || ''}
                                                onChange={(e) => updateSimpleField({ sede: e.target.value, lugar: '' })}
                                                className="glass-input p-3 w-full text-sm font-bold bg-white/5 border-[var(--glass-border)] outline-none appearance-none cursor-pointer hover:bg-white/10"
                                            >
                                                <option value="">Seleccionar Sede</option>
                                                {sedes.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                            </select>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider pl-1 flex items-center gap-1.5">
                                            <MapPin size={12} className="text-[var(--accent-solid)]" /> Lugar (Default)
                                        </label>
                                        {readOnly ? (
                                            <div className="glass-input p-3 text-sm font-bold text-[var(--text-primary)]">{worker.lugar || '-'}</div>
                                        ) : (
                                            <select
                                                value={worker.lugar || ''}
                                                onChange={(e) => updateSimpleField({ lugar: e.target.value })}
                                                className="glass-input p-3 w-full text-sm font-bold bg-white/5 border-[var(--glass-border)] outline-none appearance-none cursor-pointer hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!worker.sede && !worker.location}
                                            >
                                                <option value="">Seleccionar Lugar</option>
                                                {availablePlaces.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        )}
                                    </div>

                                    {!readOnly && (
                                        <div className="flex flex-col justify-end">
                                            <div className="glass-panel px-4 h-[46px] rounded-2xl flex items-center justify-between bg-white/5 border border-[var(--glass-border)] group/toggle hover:border-[var(--accent-solid)]/30 transition-all">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg transition-colors ${worker.isReliever ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-500/10 text-gray-500'}`}>
                                                        <Activity size={14} />
                                                    </div>
                                                    <span className="text-[11px] font-black uppercase text-[var(--text-secondary)] tracking-tight">Relevante</span>
                                                </div>
                                                <div
                                                    onClick={() => updateSimpleField({ isReliever: !worker.isReliever })}
                                                    className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-all duration-300 ${worker.isReliever ? 'bg-[var(--accent-solid)] shadow-[0_0_10px_rgba(var(--accent-solid-rgb),0.3)]' : 'bg-gray-400/20'}`}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${worker.isReliever ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {!readOnly && (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2 border-t border-[var(--glass-border)] mt-2">
                                        <div className="flex items-center gap-3">
                                            <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest pl-1">Acentuación:</label>
                                            <div className="flex gap-2">
                                                {EMPLOYEE_COLORS.slice(0, 5).map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => updateSimpleField({ color: c })}
                                                        className={`w-6 h-6 rounded-full transition-all hover:scale-125 shadow-sm ${worker.color === c ? 'ring-2 ring-offset-2 ring-[var(--accent-solid)] scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        {worker.isReliever && (
                                            <button
                                                onClick={() => autoScheduleReliever && autoScheduleReliever(worker.id)}
                                                className="text-[10px] font-black uppercase bg-[var(--accent-solid)] text-white px-4 py-2 rounded-xl shadow-lg shadow-[var(--accent-solid)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 ml-auto"
                                            >
                                                <Briefcase size={14} /> Auto-Asignar
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

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
                                    <div key={dateStr} onClick={() => !readOnly && setSelectedDateStr(prev => prev === dateStr ? null : dateStr)} className={`flex flex-col items-center gap-1 w-[50px] p-2 rounded-xl border transition-all ${!readOnly ? 'cursor-pointer hover:bg-[var(--glass-dock)]' : ''} ${isTodayDay ? 'bg-[var(--today-highlight)] border-[var(--accent-solid)]' : 'border-[var(--glass-border)]'} ${selectedDateStr === dateStr ? 'ring-2 ring-[var(--accent-solid)] ring-offset-2 scale-105 z-10' : ''}`}>
                                        <span className="text-[9px] font-bold uppercase text-[var(--text-tertiary)]">{date.toLocaleDateString('es-ES', { weekday: 'short' }).substring(0, 2)}</span>
                                        <span className={`text-sm font-bold ${isTodayDay ? 'text-[var(--accent-solid)]' : 'text-[var(--text-primary)]'}`}>{date.getDate()}</span>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${SHIFT_TYPES[shift.type]?.style || SHIFT_TYPES.off.style}`}>
                                            {SHIFT_TYPES[shift.type]?.code || '-'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* --- QUICK SHIFT SELECTOR --- */}
                        {selectedDateStr && !readOnly && (() => {
                            const shift = getShift(shifts, worker.id, selectedDateStr);
                            const date = new Date(selectedDateStr + 'T12:00:00');
                            const currentShiftPlace = shift.place || worker.lugar || (availablePlaces.length > 0 ? availablePlaces[0] : '');

                            const update = (s) => {
                                setShifts(prev => ({
                                    ...prev,
                                    [`${worker.id}_${selectedDateStr}`]: s
                                }));
                            };

                            return (
                                <div className="mt-6 p-6 rounded-[2rem] bg-[var(--glass-dock)] border-2 border-[var(--accent-solid)]/30 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden group/selector">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--accent-solid)] shadow-[4px_0_15px_rgba(var(--accent-solid-rgb),0.3)]"></div>
                                    <button
                                        onClick={() => setSelectedDateStr(null)}
                                        className="absolute top-5 right-5 p-2 rounded-full bg-[var(--glass-dock)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-500/30 transition-all hover:rotate-90 shadow-sm"
                                    >
                                        <X size={18} />
                                    </button>

                                    <div className="flex items-center gap-5 mb-8">
                                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[var(--accent-solid)] to-[var(--accent-solid)]/80 text-white shadow-xl shadow-[var(--accent-solid)]/20 animate-pulse-slow">
                                            <Zap size={22} fill="currentColor" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-[var(--text-primary)] leading-tight tracking-tight">Asignación de Turno</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Calendar size={12} className="text-[var(--accent-solid)]" />
                                                <p className="text-[11px] text-[var(--text-tertiary)] uppercase font-black tracking-[0.2em]">
                                                    {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status types from settings */}
                                    <div className="grid grid-cols-2 gap-3 mb-8">
                                        {(settings.customStatuses || []).map(status => {
                                            const statusIcon = SHIFT_ICONS.find(i => i.id === status.icon);
                                            const IconComp = statusIcon ? statusIcon.component : null;
                                            const isSelected = shift.type === status.id;
                                            return (
                                                <button
                                                    key={status.id}
                                                    onClick={() => update({
                                                        type: status.id,
                                                        statusCode: status.code,
                                                        start: '',
                                                        end: '',
                                                        code: null,
                                                        place: currentShiftPlace,
                                                        displayLocation: shift.displayLocation
                                                    })}
                                                    className={`p-4 rounded-2xl flex items-center justify-center gap-3 border-2 transition-all duration-300 ${isSelected ? 'scale-[1.03] shadow-lg z-10' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-border)] hover:border-[var(--text-tertiary)]/30'}`}
                                                    style={isSelected ? { backgroundColor: `${status.color}15`, borderColor: status.color, color: status.color, boxShadow: `0 10px 20px -5px ${status.color}30` } : {}}
                                                >
                                                    {IconComp ? (
                                                        <div className="w-6 h-6 flex items-center justify-center" style={{ color: isSelected ? status.color : 'inherit' }}>
                                                            <IconComp size={20} strokeWidth={isSelected ? 2.5 : 2} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full shadow-inner" style={{ backgroundColor: status.color }}></div>
                                                    )}
                                                    <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'opacity-100' : 'opacity-80'}`}>{status.name}</span>
                                                </button>
                                            );
                                        })}
                                        {/* Fallback: Sin Asignar */}
                                        <button
                                            onClick={() => update({ type: 'unassigned', start: '', end: '', code: null, place: currentShiftPlace })}
                                            className={`p-4 rounded-2xl flex items-center justify-center gap-3 border-2 transition-all duration-300 ${shift.type === 'unassigned' ? 'bg-[var(--text-primary)]/5 border-[var(--text-primary)] scale-[1.03] shadow-lg' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-border)]'}`}
                                        >
                                            <div className="opacity-70"><SHIFT_TYPES.unassigned.icon /></div>
                                            <span className="text-xs font-black uppercase tracking-wider">Sin Asignar</span>
                                        </button>
                                    </div>

                                    {/* Custom shifts from settings */}
                                    {settings.customShifts && settings.customShifts.length > 0 && (
                                        <div className="mb-8">
                                            <div className="flex items-center justify-between mb-4 px-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-[var(--glass-border)]/30">
                                                        <Layers size={14} className="text-[var(--text-secondary)]" />
                                                    </div>
                                                    <p className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em]">Turnos Disponibles</p>
                                                </div>
                                                <div className="h-[1px] flex-1 mx-4 bg-gradient-to-r from-[var(--glass-border)] to-transparent"></div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {settings.customShifts
                                                    .filter(cs => {
                                                        const dayOfWeek = date.getDay();
                                                        const isAllowedByDay = !cs.allowedDays || cs.allowedDays.includes(dayOfWeek);
                                                        const isAllowedByWorker = !worker.allowedShifts || worker.allowedShifts.length === 0 || worker.allowedShifts.includes(cs.code);
                                                        return isAllowedByDay && isAllowedByWorker;
                                                    })
                                                    .map((cs) => {
                                                        const shiftIcon = SHIFT_ICONS.find(i => i.id === cs.icon);
                                                        const IconComp = shiftIcon ? shiftIcon.component : SHIFT_ICONS[0].component;
                                                        const isActive = shift.type === 'custom' && shift.code === cs.code;
                                                        return (
                                                            <button
                                                                key={cs.id}
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
                                                                className={`group/shift p-4 rounded-2xl flex items-center gap-5 border-2 transition-all duration-300 w-full relative overflow-hidden ${isActive ? 'bg-[var(--bg-body)] border-[var(--accent-solid)] shadow-md translate-x-1' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)] hover:border-[var(--text-tertiary)]/30 hover:bg-[var(--glass-border)]/10'}`}
                                                                style={isActive ? { borderLeftWidth: '8px', borderLeftColor: cs.colorHex || 'var(--accent-solid)' } : { borderLeftColor: cs.colorHex || 'var(--glass-border)' }}
                                                            >
                                                                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[var(--accent-solid)]/5"></div>}

                                                                <div className={`p-2.5 rounded-xl flex-none transition-transform duration-500 ${isActive ? 'scale-110 rotate-3' : 'group-hover/shift:scale-105'}`}
                                                                    style={{ backgroundColor: cs.colorHex ? `${cs.colorHex}15` : 'var(--accent-solid)/10', color: cs.colorHex || 'var(--accent-solid)' }}>
                                                                    <IconComp size={22} strokeWidth={isActive ? 2.5 : 2} />
                                                                </div>

                                                                <div className="text-left flex-1 min-w-0 z-10">
                                                                    <div className={`text-sm font-black truncate ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{cs.name}</div>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] font-bold">
                                                                            <span>{cs.start}</span>
                                                                            <span className="opacity-30">—</span>
                                                                            <span>{cs.end}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex-none z-10">
                                                                    <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-xl shadow-sm transition-all ${isActive ? 'bg-[var(--accent-solid)] text-white' : 'bg-[var(--glass-border)] text-[var(--text-secondary)] group-hover/shift:bg-[var(--text-tertiary)] group-hover/shift:text-white'}`}
                                                                        style={isActive ? { backgroundColor: cs.colorHex } : {}}>
                                                                        {cs.code}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Manual time/place selectors */}
                                    {(shift.type === 'morning' || shift.type === 'afternoon' || shift.type === 'night' || shift.type === 'custom') && (
                                        <div className="space-y-6 mt-6 p-5 rounded-[1.5rem] border-2 border-[var(--glass-border)] bg-[var(--bg-body)]/60 shadow-inner block animate-in zoom-in-95 duration-300">
                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest pl-1">Entrada</label>
                                                    <TimeSelector value={shift.start || ''} onChange={val => update({ ...shift, start: val })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest pl-1">Salida</label>
                                                    <TimeSelector value={shift.end || ''} onChange={val => update({ ...shift, end: val })} />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between pl-1">
                                                    <label className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest flex items-center gap-2">
                                                        <MapPin size={12} className="text-[var(--accent-solid)]" /> Lugar de Trabajo
                                                    </label>
                                                    <span className="text-[9px] font-bold text-[var(--text-tertiary)]">Sede: {worker.sede || worker.location}</span>
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                    {availablePlaces.length > 0 ? availablePlaces.map(place => {
                                                        const isChecked = currentShiftPlace === place;
                                                        return (
                                                            <button
                                                                key={place}
                                                                onClick={() => update({ ...shift, place: place })}
                                                                className={`px-4 py-2.5 rounded-xl text-[11px] font-black border-2 transition-all duration-300 flex-1 min-w-[120px] shadow-sm ${isChecked ? 'bg-[var(--text-primary)] text-[var(--bg-body)] border-[var(--text-primary)] translate-y-[-2px] shadow-lg' : 'bg-white/5 text-[var(--text-secondary)] border-[var(--glass-border)] hover:border-[var(--text-tertiary)]'}`}
                                                            >
                                                                {place}
                                                            </button>
                                                        );
                                                    }) : <div className="w-full py-4 text-center rounded-xl bg-orange-500/5 border border-orange-500/20 text-orange-500 text-[10px] font-bold italic">No hay áreas configuradas en esta sede</div>}
                                                </div>
                                            </div>

                                            <div className="pt-4 flex flex-col gap-3">
                                                {/* Surcharges toggle */}
                                                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-body)] border border-[var(--glass-border)] shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2.5 rounded-xl transition-all duration-500 ${!shift.excludeSurcharges ? 'bg-green-500/10 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-red-500/10 text-red-500'}`}>
                                                            <Shield size={18} fill={!shift.excludeSurcharges ? "currentColor" : "none"} />
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-wide">Recargos y Suplementos</p>
                                                            <p className="text-[10px] text-[var(--text-tertiary)] font-bold mt-0.5">{!shift.excludeSurcharges ? 'Cálculo automático habilitado' : 'Excluido de cálculo de extras'}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => update({ ...shift, excludeSurcharges: !shift.excludeSurcharges })}
                                                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all duration-300 shadow-md ${!shift.excludeSurcharges ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
                                                    >
                                                        {!shift.excludeSurcharges ? 'Activos' : 'Desactivar'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
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
        </div>
    );
};

export default WorkerProfile;

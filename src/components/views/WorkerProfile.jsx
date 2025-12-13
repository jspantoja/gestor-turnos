import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Camera, CheckSquare, Share2, Building, MapPin, Briefcase, Calendar, ChevronLeft, ChevronRight, FileText, Plus, X, Image, MessageSquare, Check, Trash2, StickyNote, AlertCircle } from 'lucide-react';
import { EMPLOYEE_COLORS, SHIFT_TYPES } from '../../config/constants';
import { toLocalISOString, addDays, isToday, getShift } from '../../utils/helpers';
import { workerSchema, validate } from '../../utils/validation';

const WorkerProfile = ({ worker: initialWorker, onBack, setWorkers, shifts, setShifts, autoScheduleReliever, sedes, readOnly = false }) => {
    const [worker, setWorker] = useState(initialWorker);
    const [noteText, setNoteText] = useState('');
    const [noteType, setNoteType] = useState('text');
    const [linkCopied, setLinkCopied] = useState(false);
    const [currentProfileDate, setCurrentProfileDate] = useState(new Date());
    const [selectedImage, setSelectedImage] = useState(null);
    // El estado de error ahora se maneja localmente
    const [errors, setErrors] = useState(null);

    const avatarInputRef = useRef(null);
    const noteImageInputRef = useRef(null);

    const updateWorker = (updates) => {
        if (readOnly) return;

        // 1. Actualiza el estado local inmediatamente para que la UI sea responsiva.
        const updatedWorker = { ...worker, ...updates };
        setWorker(updatedWorker);

        // 2. Valida el estado actualizado.
        if (updates.name !== undefined) {
            const result = validate(workerSchema.pick({ name: true }), { name: updatedWorker.name });
            if (!result.success) {
                // Si la validación falla, muestra el error y NO actualices el estado global.
                setErrors(result.errors);
                return; // Detiene la ejecución aquí.
            } else {
                // Si la validación es exitosa, limpia los errores.
                setErrors(null);
            }
        }

        // 3. Si todo es válido, propaga el cambio al estado global (App).
        setWorkers(prev => prev.map(w => w.id === worker.id ? updatedWorker : w));
    };

    // Función para manejar cambios en inputs que no necesitan validación inmediata
    const updateSimpleField = (updates) => {
        const updatedWorker = { ...worker, ...updates };
        setWorker(updatedWorker); // Actualiza el estado local para la UI
        setWorkers(prev => prev.map(w => w.id === worker.id ? updatedWorker : w)); // Actualiza el estado global
    };

    const handleAddNote = () => {
        if (readOnly) return;
        if (!noteText.trim() && !selectedImage) return; // Allow text OR image OR both

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
        setNoteType('text'); // Reset type
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
                setNoteType('image'); // Switch to image type automatically
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

    const selectedSedeObj = sedes.find(s => s.name === (worker.sede || worker.location));
    const availablePlaces = selectedSedeObj ? selectedSedeObj.places : [];

    return (
        /*   <div className="flex flex-col h-full animate-enter relative bg-[var(--bg-body)] z-50">
              <div className="px-6 pt-10 pb-4 border-b border-[var(--glass-border)] sticky top-0 bg-[var(--bg-body)] z-40">
                  {!readOnly && (
                      <button onClick={onBack} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4">
                          <ArrowLeft size={20} /> <span className="text-sm font-bold uppercase tracking-wider">Volver</span>
                      </button>
                  )}
  
                  <div className="flex flex-col sm:flex-row gap-6">
                      <div className={`relative group self-center sm:self-start ${!readOnly ? 'cursor-pointer' : ''}`}>
                          <div className="w-24 h-24 rounded-full bg-[var(--glass-border)] overflow-hidden border-4" style={{ borderColor: worker.color || 'var(--text-primary)' }}>
                              {worker.avatar ? <img src={worker.avatar} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[var(--text-secondary)]">{worker.name[0]}</div>}
                          </div>
                          {!readOnly && (
                              <>
                                  <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={() => avatarInputRef.current.click()}>
                                      <Camera className="text-white" size={24} />
                                  </div>
                                  <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
                              </>
                          )}
                      </div> */
        // Busca el inicio del return (...)
        <div className="flex flex-col h-full animate-enter relative bg-[var(--bg-body)] z-50">
            {/* --- INICIO DEL ENCABEZADO CORREGIDO --- */}
            <div className="px-6 pt-10 pb-4 border-b border-[var(--glass-border)] sticky top-0 bg-[var(--bg-body)] z-40 shadow-sm">

                {/* 1. Botón VOLVER (Flecha izquierda) - Reforzado */}
                {!readOnly && (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:translate-x-[-4px] transition-all mb-4 group"
                    >
                        <div className="p-1.5 rounded-full bg-[var(--glass-dock)] group-hover:bg-[var(--glass-border)]">
                            <ArrowLeft size={20} />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-wider">Volver al equipo</span>
                    </button>
                )}

                {/* 2. NUEVO: Botón CERRAR (X) - Esquina Superior Derecha */}
                {!readOnly && (
                    <button
                        onClick={onBack}
                        className="absolute top-8 right-6 p-2 rounded-full bg-[var(--glass-dock)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all shadow-sm z-50"
                        title="Cerrar ficha"
                    >
                        <X size={20} />
                    </button>
                )}

                <div className="flex flex-col sm:flex-row gap-6">
                    {/* ... (El resto del contenido del perfil: Avatar, Inputs, etc. sigue igual) ... */}
                    <div className={`relative group self-center sm:self-start ${!readOnly ? 'cursor-pointer' : ''}`}>
                        <div className="w-24 h-24 rounded-full bg-[var(--glass-border)] overflow-hidden border-4" style={{ borderColor: worker.color || 'var(--text-primary)' }}>
                            {worker.avatar ? <img src={worker.avatar} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[var(--text-secondary)]">{worker.name?.[0] || '?'}</div>}
                        </div>
                        {!readOnly && (
                            <>
                                <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" onClick={() => avatarInputRef.current.click()}>
                                    <Camera className="text-white" size={24} />
                                </div>
                                <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
                            </>
                        )}
                    </div>
                    {/* ... Resto del código sigue igual ... */}



                    <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                            {readOnly ? (
                                <h2 className="text-2xl font-bold text-[var(--text-primary)]">{worker.name}</h2>
                            ) : (
                                <div className="w-full">
                                    <input value={worker.name} onChange={(e) => updateWorker({ name: e.target.value })} className={`text-2xl font-bold text-[var(--text-primary)] bg-transparent outline-none w-full ${errors?.name ? 'border-b border-red-500' : ''}`} />
                                    {errors?.name && <span className="text-[10px] text-red-400 font-bold block">{errors.name}</span>}
                                </div>
                            )}

                            {!readOnly && (
                                <button onClick={copyPublicLink} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${linkCopied ? 'bg-green-500 text-white' : 'bg-[var(--glass-dock)] text-[var(--text-primary)] border border-[var(--glass-border)]'}`}>
                                    {linkCopied ? <CheckSquare size={14} /> : <Share2 size={14} />}
                                    {linkCopied ? '¡Copiado!' : 'Link Público'}
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block mb-1">Nombre Corto (Opcional)</label>
                                {readOnly ? (
                                    <div className="text-sm text-[var(--text-primary)] font-medium">{worker.displayName || 'No asignado'}</div>
                                ) : (
                                    <input value={worker.displayName || ''} onChange={(e) => updateSimpleField({ displayName: e.target.value })} placeholder="Ej: Juan C." className="glass-input p-2 w-full text-sm" />
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block mb-1">Cédula (ID)</label>
                                {readOnly ? (
                                    <div className="text-sm text-[var(--text-primary)] font-medium font-mono">{worker.cedula || 'No asignada'}</div>
                                ) : (
                                    <input value={worker.cedula || ''} onChange={(e) => updateSimpleField({ cedula: e.target.value })} placeholder="Ej: 175222459" className="glass-input p-2 w-full text-sm font-mono" />
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block mb-1">Cargo</label>
                                {readOnly ? (
                                    <div className="text-sm text-[var(--text-primary)] font-medium">{worker.role || 'Sin cargo'}</div>
                                ) : (
                                    <input value={worker.role || ''} onChange={(e) => updateSimpleField({ role: e.target.value })} className="glass-input p-2 w-full text-sm" />
                                )}
                            </div>

                            <div className="col-span-1">
                                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block mb-1 flex items-center gap-1"><Building size={10} /> Sede Principal</label>
                                {readOnly ? (
                                    <div className="text-sm text-[var(--text-primary)] font-medium">{worker.sede || worker.location || 'Sin sede'}</div>
                                ) : (
                                    <select value={worker.sede || worker.location || ''} onChange={(e) => updateSimpleField({ sede: e.target.value, lugar: '' })} className="glass-input p-2 w-full text-sm outline-none">
                                        <option value="">Seleccionar Sede</option>
                                        {sedes.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                    </select>
                                )}
                            </div>

                            {/* Lugar de Trabajo (Half Width) */}
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block mb-1 flex items-center gap-1"><MapPin size={10} /> Lugar (Default)</label>
                                {readOnly ? (
                                    <div className="text-sm text-[var(--text-primary)] font-medium">{worker.lugar || 'Sin lugar asignado'}</div>
                                ) : (
                                    <select value={worker.lugar || ''} onChange={(e) => updateSimpleField({ lugar: e.target.value })} className="glass-input p-2 w-full text-sm outline-none" disabled={!worker.sede && !worker.location}>
                                        <option value="">Seleccionar Lugar</option>
                                        {availablePlaces.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                )}
                            </div>

                            {/* Relevante Toggle (Half Width) */}
                            {!readOnly && (
                                <div className="col-span-1 flex flex-col justify-end">
                                    <div className="glass-panel p-2 rounded-xl flex items-center justify-between h-[38px]">
                                        <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] flex items-center gap-2">
                                            <Briefcase size={12} /> Relevante
                                        </span>
                                        <div onClick={() => updateSimpleField({ isReliever: !worker.isReliever })} className={`w-8 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors ${worker.isReliever ? 'bg-[var(--text-primary)]' : 'bg-[var(--glass-border)]'}`}>
                                            <div className={`w-4 h-4 bg-[var(--bg-body)] rounded-full shadow-md transform transition-transform ${worker.isReliever ? 'translate-x-3' : ''}`} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!readOnly && (
                            <div className="flex items-center gap-2 pt-2 justify-between">
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold uppercase text-[var(--text-tertiary)]">Color:</label>
                                    <div className="flex gap-1">
                                        {EMPLOYEE_COLORS.slice(0, 5).map(c => (
                                            <button key={c} onClick={() => updateSimpleField({ color: c })} className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${worker.color === c ? 'ring-2 ring-offset-1 ring-[var(--text-primary)]' : ''}`} style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                </div>

                                {worker.isReliever && (
                                    <button
                                        onClick={() => autoScheduleReliever && autoScheduleReliever(worker.id)}
                                        className="text-[10px] font-bold uppercase bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        <Briefcase size={12} /> Auto-Asignar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 space-y-8">
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

                    {/* Tightened Spacing: justify-center gap-1 */}
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

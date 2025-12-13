import React, { useState } from 'react';
import { Settings, Clipboard, ToggleRight, ToggleLeft, Palette, Zap, Building, PlusCircle, Trash2, X, Repeat, DollarSign, Shield, LogOut, AlertCircle } from 'lucide-react';
import SectionHeader from '../shared/SectionHeader';
import { ACCENT_COLORS, BACKGROUND_COLORS, SHIFT_ICONS, SHIFT_COLORS } from '../../config/constants';
import { settingsSchema, validate } from '../../utils/validation';

const SettingsView = ({ settings, updateSettings, logout }) => {
    const [newSede, setNewSede] = useState('');
    const [newLugar, setNewLugar] = useState({});
    const [errors, setErrors] = useState(null);
    const [expandedColorPickerShiftId, setExpandedColorPickerShiftId] = useState(null);

    const validateAndUpdate = (updates) => {
        // Construct the potential new settings object for validation
        const potentialSettings = { ...settings, ...updates };

        // We only validate the parts we are updating to avoid issues with partial updates
        // But since our schema is nested, we might need to be careful.
        // For simplicity, we'll validate specific fields if they are present in updates.

        if (updates.payrollConfig) {
            const result = validate(settingsSchema.shape.payrollConfig, { ...settings.payrollConfig, ...updates.payrollConfig });
            if (!result.success) {
                setErrors(result.errors);
                // Allow update but show error
            } else {
                setErrors(null);
            }
        }

        updateSettings(updates);
    };

    const updateReportConfig = (key) => {
        const currentConfig = settings.reportConfig || { showHeader: true, showDays: true, showLocation: true, showReliever: false, showShiftSummary: true };
        updateSettings({
            reportConfig: {
                ...currentConfig,
                [key]: !currentConfig[key]
            }
        });
    };

    const handleAddSede = () => { if (newSede.trim() && !settings.sedes.find(s => s.name === newSede.trim())) { updateSettings({ sedes: [...settings.sedes, { name: newSede.trim(), places: [] }] }); setNewSede(''); } };
    const handleRemoveSede = (sedeName) => { if (confirm(`¿Eliminar la sede "${sedeName}"?`)) { updateSettings({ sedes: settings.sedes.filter(s => s.name !== sedeName) }); } };
    const handleAddPlace = (sedeName) => { const placeName = newLugar[sedeName]?.trim(); if (placeName) { updateSettings({ sedes: settings.sedes.map(s => s.name === sedeName && !s.places.includes(placeName) ? { ...s, places: [...s.places, placeName] } : s) }); setNewLugar({ ...newLugar, [sedeName]: '' }); } };
    const handleRemovePlace = (sedeName, placeName) => { updateSettings({ sedes: settings.sedes.map(s => s.name === sedeName ? { ...s, places: s.places.filter(p => p !== placeName) } : s) }); };

    const reportCfg = settings.reportConfig || { showHeader: true, showDays: true, showLocation: true, showReliever: false, showShiftSummary: true };

    return (
        <div className="flex flex-col h-full animate-enter bg-[var(--bg-body)]">
            <div className="px-6 py-8 flex flex-col gap-4 border-b border-[var(--glass-border)] bg-[var(--bg-body)] z-40 sticky top-0">
                <div className="relative flex items-center justify-center">
                    <SectionHeader icon={Settings}>Configuración</SectionHeader>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-6">




                <div className="mb-8">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2"><Clipboard size={14} /> Personalizar Reporte (Copiar)</h3>
                    <div className="glass-panel p-5 rounded-2xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[var(--text-primary)]">Encabezado</span>
                                <button onClick={() => updateReportConfig('showHeader')} className={`text-2xl transition-colors ${reportCfg.showHeader ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>
                                    {reportCfg.showHeader ? <ToggleRight /> : <ToggleLeft />}
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[var(--text-primary)]">Nombres de Días</span>
                                <button onClick={() => updateReportConfig('showDays')} className={`text-2xl transition-colors ${reportCfg.showDays ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>
                                    {reportCfg.showDays ? <ToggleRight /> : <ToggleLeft />}
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[var(--text-primary)]">Sede / Lugar</span>
                                <button onClick={() => updateReportConfig('showLocation')} className={`text-2xl transition-colors ${reportCfg.showLocation ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>
                                    {reportCfg.showLocation ? <ToggleRight /> : <ToggleLeft />}
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[var(--text-primary)]">Mostrar Relevos</span>
                                <button onClick={() => updateReportConfig('showReliever')} className={`text-2xl transition-colors ${reportCfg.showReliever ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>
                                    {reportCfg.showReliever ? <ToggleRight /> : <ToggleLeft />}
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[var(--text-primary)]">Solo Primer Nombre</span>
                                <button onClick={() => updateReportConfig('useShortName')} className={`text-2xl transition-colors ${reportCfg.useShortName ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>
                                    {reportCfg.useShortName ? <ToggleRight /> : <ToggleLeft />}
                                </button>
                            </div>
                            <div className="flex items-center justify-between col-span-1 sm:col-span-2 border-t border-[var(--glass-border)] pt-4 mt-2">
                                <span className="text-sm font-bold text-[var(--text-primary)]">Resumen Semanal de Turnos</span>
                                <button onClick={() => updateReportConfig('showShiftSummary')} className={`text-2xl transition-colors ${reportCfg.showShiftSummary ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>
                                    {reportCfg.showShiftSummary ? <ToggleRight /> : <ToggleLeft />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-8"><h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2"><Palette size={14} /> Apariencia</h3>
                    <div className="glass-panel p-5 rounded-2xl">
                        <label className="text-sm font-bold text-[var(--text-primary)] mb-3 block">Color de Énfasis</label>
                        <div className="flex gap-3 flex-wrap mb-6">{ACCENT_COLORS.map(c => (<button key={c.value} onClick={() => updateSettings({ accentColor: c.value })} className={`w-8 h-8 rounded-full border-2 transition-transform ${settings.accentColor === c.value ? 'scale-125 border-[var(--text-primary)] shadow-md' : 'border-transparent opacity-70'}`} style={{ backgroundColor: c.value }} title={c.name} />))}</div>

                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-[var(--text-primary)]">Intensidad del Efecto Vidrio</span>
                                <span className="text-xs font-bold text-[var(--text-tertiary)]">{typeof settings.glassIntensity === 'number' ? settings.glassIntensity : 50}%</span>
                            </div>
                            <details className="group">
                                <summary className="flex items-center gap-2 text-xs font-bold text-[var(--accent-solid)] cursor-pointer select-none mb-3">
                                    <Settings size={14} />
                                    <span>Ajustes Avanzados de Transparencia</span>
                                </summary>
                                <div className="pt-2 pl-2 border-l-2 border-[var(--glass-border)]">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={typeof settings.glassIntensity === 'number' ? settings.glassIntensity : 50}
                                        onChange={(e) => updateSettings({ glassIntensity: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-[var(--glass-border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-solid)]"
                                    />
                                    <div className="flex justify-between text-[10px] font-bold text-[var(--text-tertiary)] mt-2 uppercase tracking-wider">
                                        <span>Sólido</span>
                                        <span>Cristalino</span>
                                    </div>
                                </div>
                            </details>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-[var(--text-secondary)] mb-2 block flex items-center gap-2"><Zap size={12} /> Reducir Animaciones</label>
                                <button onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })} className={`w-full py-2 rounded-lg text-xs font-bold border transition-all ${settings.reducedMotion ? 'bg-[var(--text-primary)] text-[var(--bg-body)] border-transparent' : 'bg-transparent text-[var(--text-secondary)] border-[var(--glass-border)]'}`}>
                                    {settings.reducedMotion ? 'Activado (Más Rápido)' : 'Desactivado (Más Fluido)'}
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
                            <label className="text-sm font-bold text-[var(--text-primary)] mb-3 block">Color de Fondo</label>
                            <div className="grid grid-cols-4 gap-2">{BACKGROUND_COLORS.map(c => (<button key={c.value} onClick={() => updateSettings({ bgColor: c.value })} className={`h-12 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${settings.bgColor === c.value || (!settings.bgColor && c.value === '#f5f5f7') ? 'scale-105 border-[var(--text-primary)] shadow-md' : 'border-[var(--glass-border)] opacity-70'}`} style={{ backgroundColor: c.value }}><span className="text-[9px] font-bold text-gray-700">{c.name}</span></button>))}</div>
                        </div>
                    </div>

                    {/* Custom Shifts Section */}
                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2"><Repeat size={14} /> Tipos de Turno</h3>
                        <div className="glass-panel p-5 rounded-2xl">
                            <p className="text-xs text-[var(--text-tertiary)] mb-4">Define los turnos con sus horarios y códigos para asignarlos en el calendario.</p>

                            {/* List of existing shifts */}
                            <div className="space-y-2 mb-4">
                                {(settings.customShifts || []).map(shift => {
                                    const shiftIcon = SHIFT_ICONS.find(i => i.id === shift.icon);
                                    const IconComp = shiftIcon ? shiftIcon.component : SHIFT_ICONS[0].component;
                                    return (
                                        <div key={shift.id} className="flex flex-col p-3 rounded-xl bg-[var(--bg-body)] border border-[var(--glass-border)] gap-2">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-[var(--accent-solid)]/10 text-[var(--accent-solid)]">
                                                        <IconComp size={20} />
                                                    </div>
                                                    <span className="text-lg font-mono font-bold text-[var(--accent-solid)] bg-[var(--glass-dock)] px-2 py-1 rounded">{shift.code}</span>
                                                    <div>
                                                        <div className="text-sm font-bold text-[var(--text-primary)]">{shift.name}</div>
                                                        <div className="text-[10px] text-[var(--text-secondary)]">{shift.start} - {shift.end}</div>
                                                        {shift.payrollCode && <div className="text-[9px] text-[var(--text-tertiary)] opacity-70">Nómina: {shift.payrollCode}</div>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setExpandedColorPickerShiftId(expandedColorPickerShiftId === shift.id ? null : shift.id)}
                                                        className="w-8 h-8 rounded-full border-2 border-[var(--glass-border)] shadow-sm hover:scale-110 transition-transform flex items-center justify-center overflow-hidden"
                                                        style={{ backgroundColor: shift.colorHex || SHIFT_COLORS.find(c => c.id === shift.color)?.hex || '#ccc' }}
                                                        title="Cambiar Color"
                                                    >
                                                        {expandedColorPickerShiftId === shift.id && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const newCode = prompt('Código:', shift.code);
                                                            if (newCode === null) return;
                                                            const newPayrollCode = prompt('Código Nómina (Opcional, 1-2 letras):', shift.payrollCode || '');
                                                            if (newPayrollCode === null) return;
                                                            const newName = prompt('Nombre:', shift.name);
                                                            if (newName === null) return;
                                                            const newStart = prompt('Hora entrada (HH:MM):', shift.start);
                                                            if (newStart === null) return;
                                                            const newEnd = prompt('Hora salida (HH:MM):', shift.end);
                                                            if (newEnd === null) return;

                                                            updateSettings({
                                                                customShifts: settings.customShifts.map(s =>
                                                                    s.id === shift.id
                                                                        ? {
                                                                            ...s,
                                                                            code: newCode.trim() || s.code,
                                                                            payrollCode: newPayrollCode.trim(),
                                                                            name: newName.trim() || s.name,
                                                                            start: newStart || s.start,
                                                                            end: newEnd || s.end
                                                                        }
                                                                        : s
                                                                )
                                                            });
                                                        }}
                                                        className="p-2 text-blue-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                        title="Editar turno"
                                                    >
                                                        <Zap size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateSettings({ customShifts: settings.customShifts.filter(s => s.id !== shift.id) })}
                                                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Eliminar turno"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {expandedColorPickerShiftId === shift.id && (
                                                <div className="p-3 bg-[var(--glass-dock)] rounded-xl grid grid-cols-5 sm:grid-cols-10 gap-2 animate-in fade-in slide-in-from-top-2">
                                                    {SHIFT_COLORS.map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => {
                                                                updateSettings({
                                                                    customShifts: settings.customShifts.map(s => s.id === shift.id ? { ...s, color: c.id, colorHex: c.hex } : s)
                                                                });
                                                                setExpandedColorPickerShiftId(null);
                                                            }}
                                                            className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${shift.color === c.id ? 'border-[var(--text-primary)] scale-110 shadow-lg' : 'border- transparent hover:border-[var(--glass-border)]'}`}
                                                            style={{ backgroundColor: c.hex }}
                                                            title={c.name}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {(!settings.customShifts || settings.customShifts.length === 0) && (
                                    <p className="text-xs text-[var(--text-tertiary)] italic text-center py-4">No hay turnos configurados. Agrega uno abajo.</p>
                                )}
                            </div>

                            {/* Add new shift form */}
                            <div className="pt-4 border-t border-[var(--glass-border)]">
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase block mb-1">Código</label>
                                        <input
                                            type="text"
                                            id="newShiftCode"
                                            placeholder="Ej: 278"
                                            className="glass-input p-2 w-full text-center font-mono font-bold"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase block mb-1">Cód. Nómina</label>
                                        <input
                                            type="text"
                                            id="newShiftPayrollCode"
                                            placeholder="Ej: M1"
                                            className="glass-input p-2 w-full text-center font-mono"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase block mb-1">Nombre</label>
                                        <input
                                            type="text"
                                            id="newShiftName"
                                            placeholder="Ej: Mañana"
                                            className="glass-input p-2 w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase block mb-1">Entrada</label>
                                        <input
                                            type="time"
                                            id="newShiftStart"
                                            defaultValue="06:00"
                                            className="glass-input p-2 w-full font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase block mb-1">Salida</label>
                                        <input
                                            type="time"
                                            id="newShiftEnd"
                                            defaultValue="14:00"
                                            className="glass-input p-2 w-full font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Icon picker */}
                                <div className="mb-3">
                                    <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase block mb-2">Icono</label>
                                    <div className="flex flex-wrap gap-2">
                                        {SHIFT_ICONS.map(icon => {
                                            const IconComp = icon.component;
                                            return (
                                                <button
                                                    key={icon.id}
                                                    type="button"
                                                    id={`icon-${icon.id}`}
                                                    onClick={(e) => {
                                                        document.querySelectorAll('[id^="icon-"]').forEach(el => el.classList.remove('ring-2', 'ring-[var(--accent-solid)]', 'bg-[var(--accent-solid)]', 'text-white'));
                                                        e.currentTarget.classList.add('ring-2', 'ring-[var(--accent-solid)]', 'bg-[var(--accent-solid)]', 'text-white');
                                                        e.currentTarget.dataset.selected = 'true';
                                                    }}
                                                    className="p-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--glass-dock)] transition-all flex flex-col items-center gap-1"
                                                    title={icon.name}
                                                >
                                                    <IconComp size={18} />
                                                    <span className="text-[8px]">{icon.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        const code = document.getElementById('newShiftCode').value.trim();
                                        const payrollCode = document.getElementById('newShiftPayrollCode').value.trim();
                                        const name = document.getElementById('newShiftName').value.trim();
                                        const start = document.getElementById('newShiftStart').value;
                                        const end = document.getElementById('newShiftEnd').value;
                                        const selectedIcon = document.querySelector('[id^="icon-"][data-selected="true"]');
                                        const iconId = selectedIcon ? selectedIcon.id.replace('icon-', '') : 'sun';

                                        if (!code || !name) return;

                                        // Auto-assign color based on current shift count
                                        const existingShifts = settings.customShifts || [];
                                        const colorIndex = existingShifts.length % SHIFT_COLORS.length;
                                        const assignedColor = SHIFT_COLORS[colorIndex];

                                        const newShift = {
                                            id: Date.now().toString(),
                                            code,
                                            name,
                                            start,
                                            end,
                                            icon: iconId,
                                            color: assignedColor.id,
                                            colorHex: assignedColor.hex,
                                            payrollCode: payrollCode // Save payroll code
                                        };

                                        updateSettings({
                                            customShifts: [...existingShifts, newShift]
                                        });

                                        // Clear inputs
                                        document.getElementById('newShiftCode').value = '';
                                        document.getElementById('newShiftPayrollCode').value = '';
                                        document.getElementById('newShiftName').value = '';
                                        document.querySelectorAll('[id^="icon-"]').forEach(el => {
                                            el.classList.remove('ring-2', 'ring-[var(--accent-solid)]', 'bg-[var(--accent-solid)]', 'text-white');
                                            delete el.dataset.selected;
                                        });
                                    }}
                                    className="w-full py-2 rounded-xl bg-[var(--accent-solid)] text-[var(--accent-text)] font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                                >
                                    <PlusCircle size={16} />
                                    Agregar Turno
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8"><h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2"><Building size={14} /> Sedes & Lugares</h3><div className="glass-panel p-5 rounded-2xl"><div className="flex gap-2 mb-4 pb-4 border-b border-[var(--glass-border)]"><input value={newSede} onChange={(e) => setNewSede(e.target.value)} placeholder="Nueva Sede (Ej: Homecenter)" className="glass-input p-2 text-sm flex-1 font-bold" onKeyDown={(e) => e.key === 'Enter' && handleAddSede()} /><button onClick={handleAddSede} className="p-2 bg-[var(--accent-solid)] text-[var(--accent-text)] rounded-xl"><PlusCircle size={20} /></button></div><div className="space-y-4">{settings.sedes.map(sede => (<div key={sede.name} className="bg-[var(--bg-body)] rounded-xl border border-[var(--glass-border)] overflow-hidden"><div className="p-3 bg-[var(--glass-dock)] flex justify-between items-center"><span className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2"><Building size={14} /> {sede.name}</span><button onClick={() => handleRemoveSede(sede.name)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></div><div className="p-3"><div className="flex flex-wrap gap-2 mb-3">{sede.places.map(place => (<div key={place} className="flex items-center gap-1 text-[10px] bg-[var(--glass-panel)] px-2 py-1 rounded-lg border border-[var(--glass-border)]"><span>{place}</span><button onClick={() => handleRemovePlace(sede.name, place)} className="text-red-400"><X size={10} /></button></div>))}{sede.places.length === 0 && <span className="text-[10px] text-[var(--text-tertiary)] italic">Sin lugares asignados</span>}</div><div className="flex gap-2"><input value={newLugar[sede.name] || ''} onChange={(e) => setNewLugar({ ...newLugar, [sede.name]: e.target.value })} placeholder={`+ Lugar en ${sede.name}`} className="glass-input p-1.5 text-xs flex-1" onKeyDown={(e) => e.key === 'Enter' && handleAddPlace(sede.name)} /><button onClick={() => handleAddPlace(sede.name)} className="p-1.5 bg-[var(--glass-border)] rounded-lg text-[var(--text-secondary)]"><PlusCircle size={14} /></button></div></div></div>))}</div></div></div>

                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2"><Repeat size={14} /> Automatización</h3>
                        <div className="glass-panel p-5 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-bold text-[var(--text-primary)] block">Auto-Asignar Relevos</span>
                                    <span className="text-[10px] text-[var(--text-secondary)]">Al crear un descanso, asignar turno al supernumerario.</span>
                                </div>
                                <button onClick={() => updateSettings({ autoReliever: !settings.autoReliever })} className={`text-2xl transition-colors ${settings.autoReliever ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>
                                    {settings.autoReliever ? <ToggleRight /> : <ToggleLeft />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2"><DollarSign size={14} /> Configuración de Nómina</h3>
                        {/* AGREGAR ESTE BLOQUE NUEVO */}
                        <div className="space-y-2 pt-4 border-t border-[var(--glass-border)]">
                            <label className="text-sm font-bold text-[var(--text-secondary)] uppercase">Mensaje / Alerta en Nómina</label>
                            <input
                                type="text"
                                value={settings.payrollConfig.customMessage || ''}
                                onChange={(e) => updateSettings({
                                    payrollConfig: { ...settings.payrollConfig, customMessage: e.target.value }
                                })}
                                className="w-full glass-input p-3 rounded-xl"
                                placeholder="Ej: Bono de coordinación..."
                            />
                            <p className="text-[10px] text-[var(--text-tertiary)]">Este mensaje aparecerá en la parte inferior del reporte de nómina.</p>
                        </div>

                        <div className="glass-panel p-5 rounded-2xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2 block">Tarifa por Hora (COP$)</label>
                                    <input
                                        type="number"
                                        value={settings.payrollConfig?.hourlyRate || 6000}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            validateAndUpdate({ payrollConfig: { ...settings.payrollConfig, hourlyRate: val } });
                                        }}
                                        className={`glass-input p-3 w-full text-center font-mono text-lg ${errors?.hourlyRate ? 'border-red-500' : ''}`}
                                        placeholder="6000"
                                    />
                                    {errors?.hourlyRate && <span className="text-[10px] text-red-400 font-bold mt-1 block">{errors.hourlyRate}</span>}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3 block">⏰ Horas Laborales por Día</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { key: 'monday', label: 'Lunes', default: 7 },
                                        { key: 'tuesday', label: 'Martes', default: 7.5 },
                                        { key: 'wednesday', label: 'Miércoles', default: 7.5 },
                                        { key: 'thursday', label: 'Jueves', default: 7.5 },
                                        { key: 'friday', label: 'Viernes', default: 7.5 },
                                        { key: 'saturday', label: 'Sábado', default: 7 },
                                        { key: 'sunday', label: 'Domingo', default: 7.33 },
                                        { key: 'holiday', label: 'Festivo', default: 7.33 }
                                    ].map(day => (
                                        <div key={day.key}>
                                            <label className="text-[10px] text-[var(--text-tertiary)] mb-1 block">{day.label}</label>
                                            <input
                                                type="number"
                                                step="0.25"
                                                value={settings.payrollConfig?.hoursPerWeekday?.[day.key] || day.default}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    if (val >= 0 && val <= 24) {
                                                        updateSettings({
                                                            payrollConfig: {
                                                                ...settings.payrollConfig,
                                                                hoursPerWeekday: {
                                                                    ...settings.payrollConfig?.hoursPerWeekday,
                                                                    [day.key]: val
                                                                }
                                                            }
                                                        });
                                                    }
                                                }}
                                                className="glass-input p-2 w-full text-center text-sm"
                                                placeholder={day.default.toString()}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[9px] text-[var(--text-tertiary)] mt-2">💡 Valores actuales según reducción progresiva de jornada laboral en Colombia</p>
                            </div>

                            <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3 block">Porcentaje de Recargos (%)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] text-[var(--text-tertiary)] mb-1 block">Domingos</label>
                                        <input
                                            type="number"
                                            value={settings.payrollConfig?.sundaySurcharge || 75}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                if (val >= 0 && val <= 200) updateSettings({ payrollConfig: { ...settings.payrollConfig, sundaySurcharge: val } });
                                            }}
                                            className="glass-input p-2 w-full text-center"
                                            placeholder="75"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--text-tertiary)] mb-1 block">Festivos</label>
                                        <input
                                            type="number"
                                            value={settings.payrollConfig?.holidaySurcharge || 75}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                if (val >= 0 && val <= 200) updateSettings({ payrollConfig: { ...settings.payrollConfig, holidaySurcharge: val } });
                                            }}
                                            className="glass-input p-2 w-full text-center"
                                            placeholder="75"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[var(--text-tertiary)] mb-1 block">Recargo Nocturno</label>
                                        <input
                                            type="number"
                                            value={settings.payrollConfig?.nightSurcharge || 35}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                if (val >= 0 && val <= 100) updateSettings({ payrollConfig: { ...settings.payrollConfig, nightSurcharge: val } });
                                            }}
                                            className="glass-input p-2 w-full text-center"
                                            placeholder="35"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="text-sm font-bold text-[var(--text-primary)] block">Auxilio de Transporte</span>
                                        <span className="text-[10px] text-[var(--text-secondary)]">Aplicable para salario mínimo (proporcional a días trabajados)</span>
                                    </div>
                                    <button
                                        onClick={() => updateSettings({ payrollConfig: { ...settings.payrollConfig, includeTransportAllowance: !settings.payrollConfig?.includeTransportAllowance } })}
                                        className={`text-2xl transition-colors ${settings.payrollConfig?.includeTransportAllowance ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}
                                    >
                                        {settings.payrollConfig?.includeTransportAllowance ? <ToggleRight /> : <ToggleLeft />}
                                    </button>
                                </div>
                                {settings.payrollConfig?.includeTransportAllowance && (
                                    <div>
                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2 block">Monto Mensual (COP$)</label>
                                        <input
                                            type="number"
                                            value={settings.payrollConfig?.transportAllowance || 200000}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                if (val >= 0) updateSettings({ payrollConfig: { ...settings.payrollConfig, transportAllowance: val } });
                                            }}
                                            className="glass-input p-3 w-full text-center font-mono text-lg"
                                            placeholder="200000"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2 block">Horas Nocturnas en Turno Noche (10pm-6am)</label>
                                <input
                                    type="number"
                                    value={settings.payrollConfig?.nightShiftHours || 6}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (val >= 0 && val <= 24) updateSettings({ payrollConfig: { ...settings.payrollConfig, nightShiftHours: val } });
                                    }}
                                    className="glass-input p-2 w-32 text-center"
                                    placeholder="6"
                                />
                                <p className="text-[9px] text-[var(--text-tertiary)] mt-2">Si un turno noche va de 10pm a 6am, 6 horas tienen recargo nocturno del 35%</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8"><h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2"><Shield size={14} /> Seguridad</h3>
                        <div className="glass-panel p-5 rounded-2xl">
                            <div className="flex items-center justify-between mb-4"><span className="text-sm font-bold text-[var(--text-primary)]">Pedir PIN al acceder</span><button onClick={() => updateSettings({ enablePin: !settings.enablePin })} className={`text-2xl transition-colors ${settings.enablePin ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>{settings.enablePin ? <ToggleRight /> : <ToggleLeft />}</button></div>{settings.enablePin && (<div><label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-1 block">Nuevo PIN (4 dígitos)</label><input type="number" value={settings.pin} onChange={(e) => { if (e.target.value.length <= 4) updateSettings({ pin: e.target.value }); }} className="glass-input p-2 w-full text-center tracking-[1em] font-mono text-lg" placeholder="0000" /></div>)}

                            <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
                                <button
                                    onClick={logout}
                                    className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-bold text-sm border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <LogOut size={16} />
                                    Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;

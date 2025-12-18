import React, { useState, useEffect } from 'react';
import { Settings, Clipboard, ToggleRight, ToggleLeft, Palette, Zap, Building, PlusCircle, Trash2, X, Repeat, DollarSign, Shield, LogOut, Cloud, Database, Download, Upload, ShieldCheck } from 'lucide-react';
import SectionHeader from '../shared/SectionHeader';
import { APP_THEMES, SHIFT_ICONS, SHIFT_COLORS } from '../../config/constants';
import { settingsSchema, validate } from '../../utils/validation';
import { useToast } from '../shared/Toast';

const SettingsView = ({ user, settings, updateSettings, logout, onToggleCloud, exportData, importData }) => {
    const { success, error } = useToast();
    const [newSede, setNewSede] = useState('');
    const [newLugar, setNewLugar] = useState({});
    const [errors, setErrors] = useState(null);
    const [expandedColorPickerShiftId, setExpandedColorPickerShiftId] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('sync');
    const [selectedIconId, setSelectedIconId] = useState('sun');
    const [newShift, setNewShift] = useState({ code: '', payrollCode: '', name: '', start: '06:00', end: '14:00', icon: 'sun' });

    const validateAndUpdate = (updates) => {
        if (updates.payrollConfig) {
            const result = validate(settingsSchema.shape.payrollConfig, { ...settings.payrollConfig, ...updates.payrollConfig });
            if (!result.success) setErrors(result.errors);
            else setErrors(null);
        }
        updateSettings(updates);
    };

    const updateReportConfig = (key) => {
        const currentConfig = settings.reportConfig || { showHeader: true, showDays: true, showLocation: true, showReliever: false, showShiftSummary: true };
        updateSettings({ reportConfig: { ...currentConfig, [key]: !currentConfig[key] } });
    };

    const handleAddSede = () => { if (newSede.trim() && !settings.sedes.find(s => s.name === newSede.trim())) { updateSettings({ sedes: [...settings.sedes, { name: newSede.trim(), places: [] }] }); setNewSede(''); } };
    const handleRemoveSede = (sedeName) => { if (confirm(`¿Eliminar la sede "${sedeName}"?`)) { updateSettings({ sedes: settings.sedes.filter(s => s.name !== sedeName) }); } };
    const handleAddPlace = (sedeName) => { const placeName = newLugar[sedeName]?.trim(); if (placeName) { updateSettings({ sedes: settings.sedes.map(s => s.name === sedeName && !s.places.includes(placeName) ? { ...s, places: [...s.places, placeName] } : s) }); setNewLugar({ ...newLugar, [sedeName]: '' }); } };
    const handleRemovePlace = (sedeName, placeName) => { updateSettings({ sedes: settings.sedes.map(s => s.name === sedeName ? { ...s, places: s.places.filter(p => p !== placeName) } : s) }); };

    const handleAddShift = () => {
        if (!newShift.code || !newShift.name) return;
        updateSettings({
            customShifts: [
                ...(settings.customShifts || []),
                { id: Date.now().toString(), ...newShift, icon: selectedIconId, color: 'blue', colorHex: '#3b82f6' }
            ]
        });
        setNewShift({ code: '', payrollCode: '', name: '', start: '06:00', end: '14:00', icon: 'sun' });
        setSelectedIconId('sun');
        success("¡Turno agregado con éxito!");
    };

    useEffect(() => {
        if (activeSubTab !== 'management') return;
        const lookup = async () => {
            try {
                const response = await fetch('/src/data/turnos.json');
                const data = await response.json();
                const match = data.find(t => t["Hora Entrada"] === newShift.start && t["Hora Salida"] === newShift.end);
                if (match) {
                    setNewShift(prev => ({
                        ...prev,
                        code: match.ID.toString(),
                        name: prev.name === '' || prev.name.includes('Turno') ? `Turno ${match.ID}` : prev.name
                    }));
                }
            } catch (e) {
                console.error("Error loading turnos.json:", e);
            }
        };
        lookup();
    }, [newShift.start, newShift.end, activeSubTab]);

    const reportCfg = settings.reportConfig || { showHeader: true, showDays: true, showLocation: true, showReliever: false, showShiftSummary: true };

    return (
        <div className="flex flex-col h-full animate-enter bg-[var(--bg-body)]">
            <div className="px-6 py-4 flex flex-col gap-4 border-b border-[var(--glass-border)] bg-[var(--bg-body)] z-40 sticky top-0">
                <div className="relative flex items-center justify-center mb-2">
                    <SectionHeader icon={Settings}>Configuración</SectionHeader>
                </div>
                <div className="flex gap-2 p-1 bg-[var(--glass-dock)] rounded-2xl border border-[var(--glass-border)] overflow-x-auto no-scrollbar">
                    {[{ id: 'sync', label: 'Nube', icon: Cloud }, { id: 'management', label: 'Gestión', icon: Clipboard }, { id: 'payroll', label: 'Nómina', icon: DollarSign }, { id: 'app', label: 'App', icon: Palette }].map(tab => (
                        <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeSubTab === tab.id ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] shadow-lg scale-105' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-border)]'}`}>
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-6">
                {activeSubTab === 'sync' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-4 flex items-center gap-2"><Database size={14} /> Datos y Sincronización</h3>
                        <div className="glass-panel p-5 rounded-2xl">
                            <div className="mb-6 pb-6 border-b border-[var(--glass-border)] flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[var(--accent-solid)]/10 text-[var(--accent-solid)] flex items-center justify-center border border-[var(--glass-border)] shadow-sm">
                                    {user?.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-0.5">Cuenta Activa</div>
                                    <div className="text-sm font-bold truncate">{user?.email || 'Usuario Local'}</div>
                                </div>
                                <div className="px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-[10px] font-bold">ACTIVA</div>
                            </div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${settings.cloudMode ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>{settings.cloudMode ? <Cloud size={20} /> : <Database size={20} />}</div>
                                    <div>
                                        <div className="text-sm font-bold">Modo {settings.cloudMode ? 'Nube' : 'Local'}</div>
                                        <div className="text-[10px] text-[var(--text-secondary)]">{settings.cloudMode ? 'Tus datos se guardan en tiempo real en la nube.' : 'Tus datos se guardan solo en este dispositivo.'}</div>
                                    </div>
                                </div>
                                <button onClick={() => onToggleCloud(!settings.cloudMode)} className={`text-2xl transition-all ${settings.cloudMode ? 'text-blue-500' : 'text-[var(--text-tertiary)]'}`}>{settings.cloudMode ? <ToggleRight /> : <ToggleLeft />}</button>
                            </div>
                            {settings.cloudMode && settings.lastSync && (
                                <div className="mb-6 p-3 bg-[var(--glass-dock)] rounded-xl flex items-center gap-2 border border-blue-500/10">
                                    <ShieldCheck size={14} className="text-blue-500" />
                                    <span className="text-[10px] text-[var(--text-secondary)]">Última sincronización: <span className="font-bold text-[var(--text-primary)]">{new Date(settings.lastSync).toLocaleString()}</span></span>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--glass-border)]">
                                <button onClick={exportData} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--glass-border)] hover:bg-[var(--glass-dock)] transition-all"><Download size={18} /><span className="text-[10px] font-bold">EXPORTAR</span></button>
                                <label className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--glass-border)] cursor-pointer hover:bg-[var(--glass-dock)]"><Upload size={18} /><span className="text-[10px] font-bold">IMPORTAR</span><input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { try { const d = JSON.parse(ev.target.result); if (confirm("¿Importar datos? Se sobrescribirá tu estado actual.")) { importData(d); success("¡Datos importados!"); } } catch (err) { error("JSON inválido"); } }; r.readAsText(f); }} /></label>
                            </div>
                        </div>
                    </div>
                )}

                {activeSubTab === 'management' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8">
                        <div>
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-4 flex items-center gap-2"><Repeat size={14} /> Gestor de Turnos</h3>
                            <div className="glass-panel p-5 rounded-2xl">
                                <div className="space-y-4 mb-6">
                                    {(settings.customShifts || []).map(shift => {
                                        const IconComp = (SHIFT_ICONS.find(i => i.id === shift.icon) || SHIFT_ICONS[0]).component;
                                        return (
                                            <div key={shift.id} className="flex flex-col p-3 rounded-xl bg-[var(--bg-body)] border border-[var(--glass-border)] gap-3 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-[var(--accent-solid)]/10 text-[var(--accent-solid)]"><IconComp size={18} /></div>
                                                        <div>
                                                            <div className="text-sm font-bold flex items-center gap-2">{shift.name} <span className="font-mono text-[10px] bg-[var(--glass-dock)] px-1.5 py-0.5 rounded opacity-70">[{shift.code}]</span></div>
                                                            <div className="text-[10px] text-[var(--text-secondary)]">{shift.start} - {shift.end} {shift.payrollCode && `• Nómina: ${shift.payrollCode}`}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => setExpandedColorPickerShiftId(expandedColorPickerShiftId === shift.id ? null : shift.id)} className="w-6 h-6 rounded-full border border-[var(--glass-border)]" style={{ backgroundColor: shift.colorHex || '#ccc' }} />
                                                        <button onClick={() => {
                                                            const nC = prompt('Código:', shift.code); if (nC === null) return;
                                                            const nPC = prompt('Código Nómina:', shift.payrollCode || ''); if (nPC === null) return;
                                                            const nN = prompt('Nombre:', shift.name); if (nN === null) return;
                                                            const nS = prompt('Entrada:', shift.start); if (nS === null) return;
                                                            const nE = prompt('Salida:', shift.end); if (nE === null) return;
                                                            updateSettings({ customShifts: settings.customShifts.map(s => s.id === shift.id ? { ...s, code: nC.trim() || s.code, payrollCode: nPC.trim(), name: nN.trim() || s.name, start: nS || s.start, end: nE || s.end } : s) });
                                                        }} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg"><Zap size={14} /></button>
                                                        <button onClick={() => updateSettings({ customShifts: settings.customShifts.filter(s => s.id !== shift.id) })} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 pt-2 border-t border-[var(--glass-border)] border-dashed">
                                                    {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d, i) => {
                                                        const isAllowed = !shift.allowedDays || shift.allowedDays.includes(i);
                                                        return (
                                                            <button key={i} onClick={() => {
                                                                const cur = shift.allowedDays || [0, 1, 2, 3, 4, 5, 6];
                                                                const next = cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i];
                                                                updateSettings({ customShifts: settings.customShifts.map(s => s.id === shift.id ? { ...s, allowedDays: next } : s) });
                                                            }} className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold ${isAllowed ? 'bg-[var(--accent-solid)] text-white' : 'bg-gray-100/50 text-gray-400'}`}>{d}</button>
                                                        );
                                                    })}
                                                </div>
                                                {expandedColorPickerShiftId === shift.id && (
                                                    <div className="pt-2 grid grid-cols-5 gap-2 animate-in fade-in zoom-in-95">
                                                        {SHIFT_COLORS.map(c => (<button key={c.id} onClick={() => { updateSettings({ customShifts: settings.customShifts.map(s => s.id === shift.id ? { ...s, color: c.id, colorHex: c.hex } : s) }); setExpandedColorPickerShiftId(null); }} className="w-full aspect-square rounded-lg border-2 border-transparent" style={{ backgroundColor: c.hex }} />))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="pt-4 border-t border-[var(--glass-border)] space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input placeholder="Código (Auto)" value={newShift.code} onChange={e => setNewShift({ ...newShift, code: e.target.value })} className="glass-input p-2.5 text-xs font-mono" />
                                        <input placeholder="Cód. Nómina" value={newShift.payrollCode} onChange={e => setNewShift({ ...newShift, payrollCode: e.target.value })} className="glass-input p-2.5 text-xs font-mono" />
                                        <input placeholder="Nombre (Ej: Mañana)" value={newShift.name} onChange={e => setNewShift({ ...newShift, name: e.target.value })} className="glass-input p-2.5 text-xs col-span-2" />
                                        <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase px-1">Entrada</label><input type="time" value={newShift.start} onChange={e => setNewShift({ ...newShift, start: e.target.value })} className="glass-input p-2.5 text-xs" /></div>
                                        <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase px-1">Salida</label><input type="time" value={newShift.end} onChange={e => setNewShift({ ...newShift, end: e.target.value })} className="glass-input p-2.5 text-xs" /></div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {SHIFT_ICONS.map(icon => {
                                            const IconComp = icon.component;
                                            return (<button key={icon.id} onClick={() => setSelectedIconId(icon.id)} className={`p-2 rounded-lg border transition-all flex items-center gap-1 ${selectedIconId === icon.id ? 'bg-[var(--accent-solid)] text-white border-transparent' : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-dock)]'}`}><IconComp size={14} /><span className="text-[8px] font-bold uppercase">{icon.name}</span></button>);
                                        })}
                                    </div>
                                    <button onClick={handleAddShift} className="w-full bg-[var(--accent-solid)] text-white py-2.5 rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2"><PlusCircle size={14} /> AGREGAR TURNO</button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-4 flex items-center gap-2"><Building size={14} /> Sedes y Lugares</h3>
                            <div className="glass-panel p-5 rounded-2xl">
                                <div className="flex gap-2 mb-4"><input value={newSede} onChange={e => setNewSede(e.target.value)} placeholder="Nueva Sede..." className="glass-input p-2.5 text-sm flex-1" onKeyDown={e => e.key === 'Enter' && handleAddSede()} /><button onClick={handleAddSede} className="p-2.5 bg-[var(--accent-solid)] text-white rounded-xl"><PlusCircle size={20} /></button></div>
                                <div className="space-y-4">
                                    {settings.sedes.map(s => (
                                        <div key={s.name} className="bg-[var(--bg-body)] rounded-xl border border-[var(--glass-border)] overflow-hidden shadow-sm">
                                            <div className="p-3 bg-[var(--glass-dock)] flex justify-between items-center"><span className="font-bold text-sm">{s.name}</span><button onClick={() => handleRemoveSede(s.name)} className="text-red-400 p-1"><Trash2 size={16} /></button></div>
                                            <div className="p-3 space-y-3">
                                                <div className="flex flex-wrap gap-2">{s.places.map(p => (<div key={p} className="flex items-center gap-1 text-[10px] bg-white/50 px-2 py-1 rounded-lg border border-[var(--glass-border)]"><span>{p}</span><button onClick={() => handleRemovePlace(s.name, p)} className="text-red-400 ml-1"><X size={10} /></button></div>))}</div>
                                                <div className="flex gap-2"><input value={newLugar[s.name] || ''} onChange={e => setNewLugar({ ...newLugar, [s.name]: e.target.value })} placeholder="+ Lugar" className="glass-input p-2 text-xs flex-1" onKeyDown={e => e.key === 'Enter' && handleAddPlace(s.name)} /><button onClick={() => handleAddPlace(s.name)} className="p-1.5 bg-[var(--glass-border)] rounded-lg text-[var(--text-secondary)]"><PlusCircle size={14} /></button></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-4 flex items-center gap-2"><Zap size={14} /> Automatización</h3>
                            <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
                                <div><div className="text-sm font-bold">Auto-Asignar Relevos</div><div className="text-[10px] text-[var(--text-secondary)]">Asignar turno al supernumerario en descansos</div></div>
                                <button onClick={() => updateSettings({ autoReliever: !settings.autoReliever })} className={`text-2xl transition-colors ${settings.autoReliever ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>{settings.autoReliever ? <ToggleRight /> : <ToggleLeft />}</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeSubTab === 'payroll' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8">
                        <div>
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-4 flex items-center gap-2"><DollarSign size={14} /> Configuración de Nómina</h3>
                            <div className="glass-panel p-5 rounded-2xl space-y-6">
                                <div><label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase block mb-1">Tarifa por Hora (COP)</label><input type="number" value={settings.payrollConfig?.hourlyRate || 6000} onChange={e => validateAndUpdate({ payrollConfig: { ...settings.payrollConfig, hourlyRate: parseInt(e.target.value) || 0 } })} className="glass-input p-3 w-full text-center font-mono text-lg shadow-inner" /></div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-[var(--glass-border)]">
                                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'holiday'].map(k => (
                                        <div key={k}><label className="text-[9px] text-[var(--text-tertiary)] uppercase block mb-1 font-bold">{k.substring(0, 3)}</label>
                                            <input type="number" step="0.25" value={settings.payrollConfig?.hoursPerWeekday?.[k] || 7} onChange={e => updateSettings({ payrollConfig: { ...settings.payrollConfig, hoursPerWeekday: { ...settings.payrollConfig.hoursPerWeekday, [k]: parseFloat(e.target.value) || 0 } } })} className="glass-input p-2 w-full text-center text-xs font-mono" /></div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--glass-border)]">
                                    {[{ id: 'sundaySurcharge', l: 'Dom (%)', d: 75 }, { id: 'holidaySurcharge', l: 'Fest (%)', d: 75 }, { id: 'nightSurcharge', l: 'Noct (%)', d: 35 }].map(s => (
                                        <div key={s.id}><label className="text-[9px] text-[var(--text-tertiary)] uppercase block mb-1">{s.l}</label>
                                            <input type="number" value={settings.payrollConfig?.[s.id] || s.d} onChange={e => updateSettings({ payrollConfig: { ...settings.payrollConfig, [s.id]: parseInt(e.target.value) || 0 } })} className="glass-input p-2 w-full text-center text-xs" /></div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border(--glass-border) space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div><div className="text-sm font-bold">Auxilio de Transporte</div><div className="text-[10px] text-[var(--text-secondary)]">Proporcional a días trabajados</div></div>
                                        <button onClick={() => updateSettings({ payrollConfig: { ...settings.payrollConfig, includeTransportAllowance: !settings.payrollConfig?.includeTransportAllowance } })} className={`text-2xl transition-colors ${settings.payrollConfig?.includeTransportAllowance ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>{settings.payrollConfig?.includeTransportAllowance ? <ToggleRight /> : <ToggleLeft />}</button>
                                    </div>
                                    {settings.payrollConfig?.includeTransportAllowance && (
                                        <input type="number" value={settings.payrollConfig?.transportAllowance || 200000} onChange={e => updateSettings({ payrollConfig: { ...settings.payrollConfig, transportAllowance: parseInt(e.target.value) || 0 } })} className="glass-input p-2.5 w-full text-center font-mono text-sm" placeholder="Monto Mensual" />
                                    )}
                                </div>
                                <div className="pt-4 border-t border-[var(--glass-border)] grid grid-cols-2 gap-4">
                                    <div><label className="text-[9px] text-[var(--text-tertiary)] uppercase block mb-1">Horas Nocturnas</label><input type="number" value={settings.payrollConfig?.nightShiftHours || 6} onChange={e => updateSettings({ payrollConfig: { ...settings.payrollConfig, nightShiftHours: parseInt(e.target.value) || 0 } })} className="glass-input p-2 w-full text-center text-xs" /></div>
                                    <div><label className="text-[9px] text-[var(--text-tertiary)] uppercase block mb-1">Mensaje en Nómina</label><input type="text" value={settings.payrollConfig?.customMessage || ''} onChange={e => updateSettings({ payrollConfig: { ...settings.payrollConfig, customMessage: e.target.value } })} className="glass-input p-2 w-full text-xs" placeholder="Ej: Bono..." /></div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-4 flex items-center gap-2"><Clipboard size={14} /> Personalizar Reporte</h3>
                            <div className="glass-panel p-5 rounded-2xl space-y-4">
                                {[{ k: 'showHeader', l: 'Mostrar Encabezado' }, { k: 'showDays', l: 'Mostrar Días Laborados' }, { k: 'showLocation', l: 'Mostrar Sedes/Lugares' }, { k: 'showReliever', l: 'Mostrar Relevos' }, { k: 'showShiftSummary', l: 'Resumen de Turnos' }].map(i => (
                                    <div key={i.k} className="flex items-center justify-between"><span className="text-sm font-medium">{i.l}</span><button onClick={() => updateReportConfig(i.k)} className={`text-2xl transition-colors ${reportCfg[i.k] ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>{reportCfg[i.k] ? <ToggleRight /> : <ToggleLeft />}</button></div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: APP --- */}
                {activeSubTab === 'app' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8">
                        <div>
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-4 flex items-center gap-2"><Palette size={14} /> Apariencia</h3>
                            <div className="glass-panel p-5 rounded-2xl space-y-6">
                                <div>
                                    <label className="text-xs font-bold block mb-4 flex items-center justify-between">
                                        <span>Tema Cromático</span>
                                        <span className="text-[10px] bg-[var(--accent-solid)]/10 text-[var(--accent-solid)] px-2 py-0.5 rounded-full uppercase">Fondo & Acento</span>
                                    </label>
                                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                        {APP_THEMES.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => updateSettings({ bgColor: t.bg, accentColor: t.accent })}
                                                className={`group relative aspect-square rounded-2xl border-2 transition-all flex items-center justify-center ${settings.bgColor === t.bg ? 'border-[var(--accent-solid)] scale-110 shadow-lg ring-4 ring-[var(--accent-solid)]/10' : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'}`}
                                                style={{ backgroundColor: t.bg }}
                                                title={t.name}
                                            >
                                                <div className="w-4 h-4 rounded-full shadow-sm transform transition-transform group-hover:scale-110" style={{ backgroundColor: t.accent }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-[var(--glass-border)]">
                                    <label className="text-[10px] font-bold block mb-4 uppercase text-[var(--text-tertiary)] tracking-widest">Personalización Avanzada</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-[var(--glass-dock)] p-3 rounded-2xl border border-[var(--glass-border)] flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Fondo</span>
                                                <span className="text-xs font-mono font-bold">{settings.bgColor}</span>
                                            </div>
                                            <input type="color" value={settings.bgColor || '#f5f5f7'} onChange={e => updateSettings({ bgColor: e.target.value })} className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border-none" />
                                        </div>
                                        <div className="bg-[var(--glass-dock)] p-3 rounded-2xl border border-[var(--glass-border)] flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Acento</span>
                                                <span className="text-xs font-mono font-bold">{settings.accentColor}</span>
                                            </div>
                                            <input type="color" value={settings.accentColor || '#007aff'} onChange={e => updateSettings({ accentColor: e.target.value })} className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border-none" />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-[var(--glass-border)]">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Transparencia</label>
                                        <span className="text-sm font-mono font-bold text-[var(--accent-solid)] bg-[var(--accent-solid)]/10 px-2 py-1 rounded-lg">{(settings.glassIntensity || 50)}%</span>
                                    </div>
                                    <div className="relative group px-1">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={settings.glassIntensity || 50}
                                            onChange={e => updateSettings({ glassIntensity: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-[var(--glass-border)] rounded-full appearance-none cursor-pointer accent-[var(--accent-solid)] transition-all hover:h-3"
                                        />
                                        <div className="flex justify-between mt-2 px-1">
                                            <span className="text-[9px] font-bold text-[var(--text-tertiary)]">SÓLIDO</span>
                                            <span className="text-[9px] font-bold text-[var(--text-tertiary)]">CRISTAL</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-[var(--glass-border)] flex items-center justify-between">
                                    <div><div className="text-sm font-bold">Movimiento Reducido</div><div className="text-[10px] text-[var(--text-secondary)]">Optimizar para dispositivos lentos</div></div>
                                    <button onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })} className={`text-2xl transition-colors ${settings.reducedMotion ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>{settings.reducedMotion ? <ToggleRight /> : <ToggleLeft />}</button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-4 flex items-center gap-2"><Shield size={14} /> Seguridad</h3>
                            <div className="glass-panel p-5 rounded-2xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-[var(--text-primary)]">PIN de Acceso</span>
                                    <button onClick={() => updateSettings({ enablePin: !settings.enablePin })} className={`text-2xl transition-colors ${settings.enablePin ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>{settings.enablePin ? <ToggleRight /> : <ToggleLeft />}</button>
                                </div>
                                {settings.enablePin && (
                                    <input type="number" value={settings.pin} onChange={e => e.target.value.length <= 4 && updateSettings({ pin: e.target.value })} className="glass-input p-3 w-full text-center font-mono text-xl tracking-widest bg-[var(--glass-dock)] border-dashed" placeholder="0000" />
                                )}
                                <button onClick={logout} className="w-full py-3.5 rounded-xl bg-red-500/10 text-red-500 font-bold text-sm border border-red-500/20 flex items-center justify-center gap-2 mt-4 transition-all hover:bg-red-500/20 active:scale-95"><LogOut size={16} /> Cerrar Sesión</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsView;

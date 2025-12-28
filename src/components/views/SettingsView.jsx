import React, { useState, useEffect } from 'react';
import { Settings, Clipboard, ToggleRight, ToggleLeft, Palette, Zap, Building, PlusCircle, Trash2, X, Repeat, DollarSign, Shield, LogOut, Cloud, Database, Download, Upload, ShieldCheck, Info, Coffee, Check, HardDrive, AlertTriangle, ChevronUp, ChevronDown, Move } from 'lucide-react';
import SectionHeader from '../shared/SectionHeader';
import { APP_THEMES, SHIFT_ICONS, SHIFT_COLORS, APP_VERSION, LAST_UPDATE } from '../../config/constants';
import { settingsSchema, validate } from '../../utils/validation';
import { useToast } from '../shared/Toast';

const SettingsView = ({
    user,
    settings,
    updateSettings,
    logout,
    onToggleCloud,
    exportData,
    importData,
    // Backup reminder props
    showBackupReminder,
    onDismissBackupReminder,
    daysSinceLastBackup,
    onRecordBackup
}) => {
    const { success, error } = useToast();
    const [newSede, setNewSede] = useState('');
    const [newLugar, setNewLugar] = useState({});
    const [errors, setErrors] = useState(null);
    const [expandedColorPickerShiftId, setExpandedColorPickerShiftId] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('sync');
    const [selectedIconId, setSelectedIconId] = useState('sun');
    const [newShift, setNewShift] = useState({ code: '', payrollCode: '', matrixCode: '', name: '', start: '06:00', end: '14:00', icon: 'sun' });
    const [isMissingCode, setIsMissingCode] = useState(false);
    const [hasBreak, setHasBreak] = useState(false);
    const [editingStatusId, setEditingStatusId] = useState(null);
    const [editedStatus, setEditedStatus] = useState(null);
    const [editingShiftId, setEditingShiftId] = useState(null);
    const [editedShift, setEditedShift] = useState(null);

    const startEditingStatus = (status) => {
        setEditingStatusId(status.id);
        setEditedStatus(status);
    };

    const cancelEditingStatus = () => {
        setEditingStatusId(null);
        setEditedStatus(null);
    };

    const saveEditingStatus = () => {
        if (!editedStatus || !editedStatus.name || !editedStatus.code || !editedStatus.matrixCode) {
            error("Nombre, código y código de matriz son requeridos.");
            return;
        }
        updateSettings({
            customStatuses: settings.customStatuses.map(s =>
                s.id === editingStatusId ? { ...editedStatus, code: editedStatus.code.toUpperCase(), matrixCode: editedStatus.matrixCode } : s
            )
        });
        setEditingStatusId(null);
        setEditedStatus(null);
        success('Estado actualizado');
    };

    const handleStatusEditChange = (e) => {
        const { name, value } = e.target;
        setEditedStatus(prev => ({ ...prev, [name]: value }));
    };

    const startEditingShift = (shift) => {
        setEditingShiftId(shift.id);
        setEditedShift(shift);
    };

    const cancelEditingShift = () => {
        setEditingShiftId(null);
        setEditedShift(null);
    };

    const saveEditingShift = () => {
        if (!editedShift || !editedShift.name || !editedShift.code) {
            error("Nombre y código son requeridos.");
            return;
        }
        updateSettings({
            customShifts: settings.customShifts.map(s =>
                s.id === editingShiftId ? {
                    ...editedShift,
                    code: editedShift.code.toUpperCase(),
                    matrixCode: editedShift.matrixCode || editedShift.code
                } : s
            )
        });
        setEditingShiftId(null);
        setEditedShift(null);
        success('Turno actualizado');
    };

    const handleShiftEditChange = (e) => {
        const { name, value } = e.target;
        setEditedShift(prev => ({ ...prev, [name]: value }));
    };

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
                {
                    id: Date.now().toString(),
                    ...newShift,
                    matrixCode: newShift.matrixCode || newShift.code, // Fallback
                    icon: selectedIconId,
                    color: 'blue',
                    colorHex: '#3b82f6',
                    allowedDays: [0, 1, 2, 3, 4, 5, 6]
                }
            ]
        });
        setNewShift({ code: '', payrollCode: '', matrixCode: '', name: '', start: '06:00', end: '14:00', icon: 'sun', allowedDays: [0, 1, 2, 3, 4, 5, 6] });
        setSelectedIconId('sun');
        success("¡Turno agregado con éxito!");
    };

    const moveShift = (index, direction) => {
        const shifts = [...(settings.customShifts || [])];
        if (direction === 'up' && index > 0) {
            [shifts[index], shifts[index - 1]] = [shifts[index - 1], shifts[index]];
        } else if (direction === 'down' && index < shifts.length - 1) {
            [shifts[index], shifts[index + 1]] = [shifts[index + 1], shifts[index]];
        }
        updateSettings({ customShifts: shifts });
    };

    useEffect(() => {
        if (activeSubTab !== 'management' || editingShiftId !== null) return;
        const lookup = async () => {
            try {
                // 1. Check local registrations first
                const localMatch = (settings.customShifts || []).find(s => s.start === newShift.start && s.end === newShift.end);

                if (localMatch) {
                    setNewShift(prev => ({ ...prev, code: localMatch.code, name: localMatch.name }));
                    setIsMissingCode(false);
                    return;
                }

                // 2. Check master database
                const response = await fetch('/data/turnos.json');
                const data = await response.json();

                // FILTER: Only match shifts that agree with our "hasBreak" setting
                const validShifts = data.filter(t => {
                    if (hasBreak) {
                        return t["Tipo descanso"] !== "Sin descanso";
                    } else {
                        return t["Tipo descanso"] === "Sin descanso";
                    }
                });

                const match = validShifts.find(t => t["Hora Entrada"] === newShift.start && t["Hora Salida"] === newShift.end);

                if (match) {
                    setNewShift(prev => ({
                        ...prev,
                        code: match.ID.toString(),
                        name: prev.name === '' || prev.name.includes('Turno') ? `Turno ${match.ID}` : prev.name
                    }));
                    setIsMissingCode(false);
                } else {
                    setIsMissingCode(true);
                }
            } catch (e) {
                console.error("Error loading turnos.json:", e);
            }
        };
        lookup();
    }, [newShift.start, newShift.end, activeSubTab, settings.customShifts, hasBreak]);

    // REVERSE LOOKUP: When user types a code, auto-fill hours
    useEffect(() => {
        if (activeSubTab !== 'management' || editingShiftId !== null) return;
        if (!newShift.code || isNaN(parseInt(newShift.code))) return;

        const reverseLookup = async () => {
            // 1. Check in Custom Shifts (User created)
            if (settings.customShifts) {
                const customMatch = settings.customShifts.find(s => s.code === newShift.code);
                if (customMatch) {
                    setNewShift(prev => ({
                        ...prev,
                        start: customMatch.start,
                        end: customMatch.end,
                        name: prev.name || customMatch.name,
                        payrollCode: customMatch.payrollCode || prev.payrollCode,
                        matrixCode: customMatch.matrixCode || prev.matrixCode
                    }));
                    // Custom shifts don't explicit store break type in the same way, but we can infer or default
                    setHasBreak(true);
                    setIsMissingCode(false);
                    return; // Found locally, skip fetch
                }
            }

            // 2. Check in Static File (turnos.json)
            try {
                const response = await fetch('/data/turnos.json');
                const data = await response.json();
                const match = data.find(t => t.ID === parseInt(newShift.code));

                if (match) {
                    setNewShift(prev => ({
                        ...prev,
                        start: match["Hora Entrada"] || prev.start,
                        end: match["Hora Salida"] || prev.end,
                        name: prev.name || `Turno ${match.ID}`
                    }));
                    // Set break toggle based on match
                    setHasBreak(match["Tipo descanso"] !== "Sin descanso");
                    setIsMissingCode(false);
                }
            } catch (e) {
                console.error("Error in reverse lookup:", e);
            }
        };

        // Debounce to avoid excessive lookups
        const timer = setTimeout(reverseLookup, 300);
        return () => clearTimeout(timer);
    }, [newShift.code, activeSubTab]);

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
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                        {/* Backup Reminder Banner */}
                        {showBackupReminder && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-amber-600 mb-1">¡Recuerda hacer backup!</h4>
                                        <p className="text-xs text-amber-700/80">
                                            {daysSinceLastBackup !== null
                                                ? `Han pasado ${daysSinceLastBackup} días desde tu último backup.`
                                                : 'Nunca has realizado un backup de tus datos.'}
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => { exportData(); onRecordBackup?.(); }}
                                                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors"
                                            >
                                                Hacer Backup Ahora
                                            </button>
                                            <button
                                                onClick={onDismissBackupReminder}
                                                className="px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-colors"
                                            >
                                                Recordar Después
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Account Info */}
                        <div>
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-4 flex items-center gap-2"><Database size={14} /> Cuenta y Sincronización</h3>
                            <div className="glass-panel p-5 rounded-2xl">
                                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[var(--glass-border)]">
                                    <div className="w-12 h-12 rounded-full bg-[var(--accent-solid)]/10 text-[var(--accent-solid)] flex items-center justify-center border border-[var(--glass-border)] shadow-sm">
                                        {user?.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-0.5">Cuenta Activa</div>
                                        <div className="text-sm font-bold truncate">{user?.email || 'Usuario Local'}</div>
                                    </div>
                                    <div className="px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-[10px] font-bold">ACTIVA</div>
                                </div>

                                {/* Cloud Mode Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${settings.cloudMode ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                            {settings.cloudMode ? <Cloud size={20} /> : <HardDrive size={20} />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold">Modo {settings.cloudMode ? 'Nube' : 'Local'}</div>
                                            <div className="text-[10px] text-[var(--text-secondary)]">
                                                {settings.cloudMode
                                                    ? 'Sincronización automática con Firebase'
                                                    : 'Solo en este dispositivo. Haz backup regularmente.'}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onToggleCloud(!settings.cloudMode)}
                                        className={`text-2xl transition-all ${settings.cloudMode ? 'text-blue-500' : 'text-[var(--text-tertiary)]'}`}
                                    >
                                        {settings.cloudMode ? <ToggleRight /> : <ToggleLeft />}
                                    </button>
                                </div>

                                {/* Sync Status */}
                                {settings.cloudMode && settings.lastSync && (
                                    <div className="mt-4 p-3 bg-[var(--glass-dock)] rounded-xl flex items-center gap-2 border border-blue-500/10">
                                        <ShieldCheck size={14} className="text-blue-500" />
                                        <span className="text-[10px] text-[var(--text-secondary)]">
                                            Última sincronización: <span className="font-bold text-[var(--text-primary)]">{new Date(settings.lastSync).toLocaleString()}</span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* System Info */}
                        <div className="glass-panel p-4 rounded-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Info size={14} className="text-[var(--accent-solid)]" />
                                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Información de Sistema</span>
                                </div>
                                <span className="text-[10px] font-mono bg-[var(--accent-solid)]/10 text-[var(--accent-solid)] px-2 py-0.5 rounded-full font-bold">v{APP_VERSION}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-[var(--text-tertiary)]">Compilación actual</span>
                                <span className="text-[var(--text-primary)] font-bold">{LAST_UPDATE}</span>
                            </div>
                        </div>

                        {/* Export/Import - Enhanced */}
                        <div className="glass-panel p-5 rounded-2xl">
                            <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2">Copia de Seguridad</h4>
                            <p className="text-[9px] text-[var(--text-secondary)] mb-4">
                                Exporta tus datos y guárdalos en Google Drive, Dropbox o donde prefieras.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => { exportData(); onRecordBackup?.(); success("¡Backup descargado! Guárdalo en un lugar seguro."); }}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--accent-solid)]/10 border border-[var(--accent-solid)]/20 hover:bg-[var(--accent-solid)]/20 transition-all"
                                >
                                    <Download size={22} className="text-[var(--accent-solid)]" />
                                    <span className="text-[10px] font-bold">DESCARGAR BACKUP</span>
                                </button>
                                <label className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--glass-border)] cursor-pointer hover:bg-[var(--glass-dock)] transition-all">
                                    <Upload size={22} />
                                    <span className="text-[10px] font-bold">RESTAURAR</span>
                                    <input type="file" accept=".json" className="hidden" onChange={(e) => {
                                        const f = e.target.files[0];
                                        if (!f) return;
                                        const r = new FileReader();
                                        r.onload = (ev) => {
                                            try {
                                                const d = JSON.parse(ev.target.result);
                                                if (confirm("¿Restaurar datos desde backup? Se sobrescribirá tu estado actual.")) {
                                                    importData(d);
                                                    success("¡Datos restaurados correctamente!");
                                                }
                                            } catch (err) {
                                                error("Archivo de backup inválido");
                                            }
                                        };
                                        r.readAsText(f);
                                    }} />
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {activeSubTab === 'management' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2"><Repeat size={14} /> Gestor de Turnos</h3>
                                <div className="flex gap-2">
                                    <label className="text-[10px] font-bold text-[var(--text-secondary)] hover:bg-[var(--glass-dock)] border border-[var(--glass-border)] px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
                                        <Upload size={12} /> Importar JSON
                                        <input type="file" accept=".json" className="hidden" onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;

                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                try {
                                                    const importedData = JSON.parse(ev.target.result);
                                                    if (!Array.isArray(importedData)) throw new Error("Formato inválido: debe ser un array");

                                                    // Convert to internal schema
                                                    const newShifts = importedData.map(t => {
                                                        const code = t.ID?.toString() || t.code;
                                                        if (!code) return null;

                                                        return {
                                                            id: `imp_${Date.now()}_${code}_${Math.random().toString(36).substr(2, 5)}`,
                                                            name: t.name || `Turno ${code}`,
                                                            code: code,
                                                            start: t["Hora Entrada"] || t.start || "06:00",
                                                            end: t["Hora Salida"] || t.end || "14:00",
                                                            icon: 'clock',
                                                            color: 'custom',
                                                            colorHex: '#3b82f6',
                                                            matchDefault: false,
                                                            payrollCode: t.payrollCode || "",
                                                            matrixCode: t.matrixCode || "",
                                                            allowedDays: [0, 1, 2, 3, 4, 5, 6]
                                                        };
                                                    }).filter(s => s !== null);

                                                    const existingCodes = new Set((settings.customShifts || []).map(s => s.code));
                                                    const uniqueNewShifts = newShifts.filter(s => !existingCodes.has(s.code));

                                                    if (uniqueNewShifts.length === 0) {
                                                        alert("No se encontraron turnos nuevos. Todos los códigos ya existen.");
                                                        return;
                                                    }

                                                    if (confirm(`Se encontraron ${uniqueNewShifts.length} turnos nuevos. ¿Deseas importarlos?`)) {
                                                        updateSettings({
                                                            customShifts: [...(settings.customShifts || []), ...uniqueNewShifts]
                                                        });
                                                        success(`¡${uniqueNewShifts.length} turnos importados con éxito!`);
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                    error("Error al leer el archivo JSON. Verifica el formato.");
                                                }
                                                e.target.value = '';
                                            };
                                            reader.readAsText(file);
                                        }} />
                                    </label>
                                    <button
                                        onClick={async () => {
                                            if (!confirm("¿Generar archivo maestro actualizado con tus turnos personalizados?")) return;
                                            try {
                                                const response = await fetch('/data/turnos.json');
                                                const originalData = await response.json();
                                                const existingIds = new Set(originalData.map(t => t.ID));

                                                // Convert custom shifts to Schema format
                                                const newEntries = (settings.customShifts || [])
                                                    .filter(s => s.code && !isNaN(parseInt(s.code)) && !existingIds.has(parseInt(s.code)))
                                                    .map(s => ({
                                                        "ID": parseInt(s.code),
                                                        "Hora Entrada": s.start,
                                                        "Hora Entrada Máx.": "", // Placeholder
                                                        "Hora Salida": s.end,
                                                        "Horas Trabajo": "", // Placeholder
                                                        "Tipo descanso": "Horario Fijo", // Default assumption
                                                        "Minutos descanso": "",
                                                        "Inicio descanso": "",
                                                        "Fin descanso": "",
                                                        "Estado": "Activado"
                                                    }));

                                                const mergedData = [...originalData, ...newEntries].sort((a, b) => a.ID - b.ID);

                                                // Trigger Download
                                                const blob = new Blob([JSON.stringify(mergedData, null, 2)], { type: 'application/json' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = 'turnos_actualizados.json';
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                                URL.revokeObjectURL(url);

                                                success("Archivo generado. Reemplaza 'turnos.json' en tu carpeta de datos si deseas hacerlo permanente para todos.");
                                            } catch (e) {
                                                error("Error al generar archivo");
                                                console.error(e);
                                            }
                                        }}
                                        className="text-[10px] font-bold text-[var(--accent-solid)] hover:bg-[var(--accent-solid)]/10 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                        title="Descargar base de datos combinada (Original + Custom)"
                                    >
                                        <Download size={12} /> Exprotar JSON
                                    </button>
                                </div>
                            </div>
                            <div className="glass-panel p-5 rounded-2xl">
                                <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4 mb-6">
                                    {(settings.customShifts || []).map((shift, index) => {
                                        const IconComp = (SHIFT_ICONS.find(i => i.id === shift.icon) || SHIFT_ICONS[0]).component;
                                        return (
                                            <div key={shift.id} className="flex flex-col p-3 rounded-xl bg-[var(--bg-body)] border border-[var(--glass-border)] gap-3 shadow-sm group">
                                                {editingShiftId === shift.id ? (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input name="name" value={editedShift?.name || ''} onChange={handleShiftEditChange} placeholder="Nombre" className="glass-input p-2 text-xs col-span-2" />
                                                        <input name="code" value={editedShift?.code || ''} onChange={handleShiftEditChange} placeholder="Cód. Turno" className="glass-input p-2 text-xs font-mono" maxLength={3} />
                                                        <input name="payrollCode" value={editedShift?.payrollCode || ''} onChange={handleShiftEditChange} placeholder="Cód. Nómina" className="glass-input p-2 text-xs font-mono" maxLength={3} />
                                                        <input name="matrixCode" value={editedShift?.matrixCode || ''} onChange={handleShiftEditChange} placeholder="Cód. Matriz" className="glass-input p-2 text-xs font-mono col-span-2" />
                                                        <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase px-1">Entrada</label><input type="time" name="start" value={editedShift?.start || '06:00'} onChange={handleShiftEditChange} className="glass-input p-2 text-xs" /></div>
                                                        <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase px-1">Salida</label><input type="time" name="end" value={editedShift?.end || '14:00'} onChange={handleShiftEditChange} className="glass-input p-2 text-xs" /></div>
                                                        <div className="flex justify-end items-center gap-2 col-span-2 pt-2 border-t border-[var(--glass-border)]">
                                                            <button onClick={cancelEditingShift} className="px-3 py-1.5 hover:bg-[var(--glass-border)] rounded-lg text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2"><X size={14} /> Cancelar</button>
                                                            <button onClick={saveEditingShift} className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 rounded-lg text-xs font-bold text-green-500 flex items-center gap-2"><Check size={14} /> Guardar</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex flex-col gap-0.5 mr-1">
                                                                <button
                                                                    onClick={() => moveShift(index, 'up')}
                                                                    disabled={index === 0}
                                                                    className="p-0.5 rounded hover:bg-[var(--glass-dock)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed"
                                                                >
                                                                    <ChevronUp size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={() => moveShift(index, 'down')}
                                                                    disabled={index === (settings.customShifts || []).length - 1}
                                                                    className="p-0.5 rounded hover:bg-[var(--glass-dock)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed"
                                                                >
                                                                    <ChevronDown size={12} />
                                                                </button>
                                                            </div>
                                                            <div className="p-2 rounded-lg bg-[var(--accent-solid)]/10 text-[var(--accent-solid)]"><IconComp size={18} /></div>
                                                            <div>
                                                                <div className="text-sm font-bold flex items-center gap-2">{shift.name} <span className="font-mono text-[10px] bg-[var(--glass-dock)] px-1.5 py-0.5 rounded opacity-70" title="Código de Matriz">[{shift.matrixCode || shift.code}]</span></div>
                                                                <div className="text-[10px] text-[var(--text-secondary)]">{shift.start} - {shift.end} {shift.payrollCode && `• Nómina: ${shift.payrollCode}`}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <label
                                                                className="w-6 h-6 rounded-full border border-[var(--glass-border)] cursor-pointer relative overflow-hidden transition-transform hover:scale-110 active:scale-95"
                                                                style={{ backgroundColor: shift.colorHex || '#ccc' }}
                                                                title="Cambiar color del turno"
                                                            >
                                                                <input
                                                                    type="color"
                                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                                                    value={shift.colorHex || '#3b82f6'}
                                                                    onChange={(e) => {
                                                                        const hex = e.target.value;
                                                                        // Update immediately without opening a grid
                                                                        updateSettings({
                                                                            customShifts: settings.customShifts.map(s => s.id === shift.id ? { ...s, color: 'custom', colorHex: hex } : s)
                                                                        });
                                                                    }}
                                                                />
                                                            </label>
                                                            <button onClick={() => startEditingShift(shift)} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg"><Zap size={14} /></button>
                                                            <button onClick={() => updateSettings({ customShifts: settings.customShifts.filter(s => s.id !== shift.id) })} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex gap-1 pt-2 border-t border-[var(--glass-border)] border-dashed">
                                                    {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d, i) => {
                                                        const currentDays = (editingShiftId === shift.id ? editedShift?.allowedDays : shift.allowedDays);
                                                        const isAllowed = currentDays ? currentDays.includes(i) : true; // Default to true (all enabled)
                                                        return (
                                                            <button key={i} onClick={() => {
                                                                const currentAllowedDays = (editingShiftId === shift.id ? editedShift?.allowedDays : shift.allowedDays) || [0, 1, 2, 3, 4, 5, 6];
                                                                const nextAllowedDays = currentAllowedDays.includes(i) ? currentAllowedDays.filter(x => x !== i) : [...currentAllowedDays, i];

                                                                if (editingShiftId === shift.id) {
                                                                    setEditedShift(prev => ({ ...prev, allowedDays: nextAllowedDays }));
                                                                } else {
                                                                    updateSettings({ customShifts: settings.customShifts.map(s => s.id === shift.id ? { ...s, allowedDays: nextAllowedDays } : s) });
                                                                }
                                                            }} className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold ${isAllowed ? 'bg-[var(--accent-solid)] text-white' : 'bg-gray-100/50 text-gray-400'}`}>{d}</button>
                                                        );
                                                    })}
                                                </div>

                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="pt-4 border-t border-[var(--glass-border)] space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input placeholder="Nombre (Ej: Mañana)" value={newShift.name} onChange={e => setNewShift({ ...newShift, name: e.target.value })} className="glass-input p-2.5 text-xs col-span-2" />
                                        <input placeholder="Código (Auto)" value={newShift.code} onChange={e => setNewShift({ ...newShift, code: e.target.value })} className={`glass-input p-2.5 text-xs font-mono transition-colors ${isMissingCode ? 'border-amber-500/50 bg-amber-500/5' : ''}`} />
                                        <input placeholder="Cód. Nómina" value={newShift.payrollCode} onChange={e => setNewShift({ ...newShift, payrollCode: e.target.value })} className="glass-input p-2.5 text-xs font-mono" />
                                        <input placeholder="Cód. Matriz" value={newShift.matrixCode} onChange={e => setNewShift({ ...newShift, matrixCode: e.target.value })} className="glass-input p-2.5 text-xs font-mono col-span-2" />
                                        <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase px-1">Entrada</label><input type="time" value={newShift.start} onChange={e => setNewShift({ ...newShift, start: e.target.value })} className="glass-input p-2.5 text-xs" /></div>
                                        <div className="flex flex-col gap-1"><label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase px-1">Salida</label><input type="time" value={newShift.end} onChange={e => setNewShift({ ...newShift, end: e.target.value })} className="glass-input p-2.5 text-xs" /></div>
                                    </div>

                                    <div className="bg-[var(--glass-dock)] p-2 rounded-xl border border-[var(--glass-border)] flex items-center justify-between mt-3 mb-1">
                                        <div className="flex items-center gap-2">
                                            <Coffee size={14} className={hasBreak ? "text-[var(--accent-solid)]" : "text-[var(--text-tertiary)]"} />
                                            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Incluye Descanso</span>
                                        </div>
                                        <button onClick={() => setHasBreak(!hasBreak)} className={`text-xl transition-colors ${hasBreak ? 'text-[var(--accent-solid)]' : 'text-[var(--text-tertiary)]'}`}>
                                            {hasBreak ? <ToggleRight /> : <ToggleLeft />}
                                        </button>
                                    </div>

                                    {isMissingCode && (
                                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Zap size={14} className="text-amber-500" />
                                                <span className="text-[10px] font-bold text-amber-600 uppercase">Horario no registrado</span>
                                            </div>
                                            <p className="text-[10px] text-amber-700/80 mb-3 leading-relaxed">Este horario no existe en la base de datos principal. Al agregarlo, se registrará en tu sistema para futuras búsquedas.</p>
                                        </div>
                                    )}

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

                        {/* CUSTOM STATUSES SECTION */}
                        <div>
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-4 flex items-center gap-2"><Shield size={14} /> Estados de Ausencia</h3>
                            <div className="glass-panel p-5 rounded-2xl">
                                <p className="text-xs text-[var(--text-tertiary)] mb-4">Personaliza los estados que aparecen en el modal de edición de turnos. El código se reflejará en nómina.</p>
                                <div className="space-y-3 mb-4">
                                    {(settings.customStatuses || []).map(status => {
                                        const statusIcon = SHIFT_ICONS.find(i => i.id === status.icon);
                                        const IconComp = statusIcon ? statusIcon.component : null;

                                        if (editingStatusId === status.id) {
                                            // EDITING MODE
                                            return (
                                                <div key={status.id} className="p-3 rounded-xl bg-[var(--glass-dock)] border border-[var(--accent-solid)] shadow-lg ring-4 ring-[var(--accent-solid)]/10 animate-in fade-in">
                                                    <div className="grid grid-cols-[auto,1fr] items-center gap-3 mb-3">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${editedStatus.color}20`, color: editedStatus.color }}>
                                                            {IconComp ? <IconComp size={16} /> : <span className="text-sm">{editedStatus.icon || '●'}</span>}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input name="name" value={editedStatus.name} onChange={handleStatusEditChange} placeholder="Nombre" className="glass-input p-2 text-xs col-span-2" />
                                                            <input name="code" value={editedStatus.code} onChange={handleStatusEditChange} placeholder="Cód. Nómina" className="glass-input p-2 text-xs font-mono" maxLength={3} />
                                                            <input name="matrixCode" value={editedStatus.matrixCode || ''} onChange={handleStatusEditChange} placeholder="Cód. Matriz" className="glass-input p-2 text-xs font-mono" />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end items-center gap-2 pt-2 border-t border-[var(--glass-border)]">
                                                        <span className="text-[10px] text-[var(--text-tertiary)] mr-auto">Editando estado...</span>
                                                        <button onClick={cancelEditingStatus} className="px-3 py-1.5 hover:bg-[var(--glass-border)] rounded-lg text-xs font-bold text-[var(--text-secondary)] flex items-center gap-2"><X size={14} /> Cancelar</button>
                                                        <button onClick={saveEditingStatus} className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 rounded-lg text-xs font-bold text-green-500 flex items-center gap-2"><Check size={14} /> Guardar</button>
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            // DISPLAY MODE
                                            return (
                                                <div key={status.id} className="p-3 rounded-xl bg-[var(--bg-body)] border border-[var(--glass-border)]">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${status.color}20`, color: status.color }}>
                                                            {IconComp ? <IconComp size={16} /> : <span className="text-sm">{status.icon || '●'}</span>}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-xs font-bold text-[var(--text-primary)]">{status.name}</span>
                                                                <span className="text-[9px] font-mono bg-[var(--glass-dock)] px-1.5 py-0.5 rounded" title="Código en Nómina">{status.code}</span>
                                                                <span className="text-[9px] font-mono bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded" title="Código para Matriz">Matriz: {status.matrixCode}</span>
                                                            </div>
                                                            <span className="text-[9px] text-[var(--text-tertiary)]">
                                                                {status.payrollBehavior === 'paid' ? '💰 Pagado' : status.payrollBehavior === 'halfPay' ? '½ Medio' : '⏸️ Sin pago'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => startEditingStatus(status)}
                                                            className="p-1.5 hover:bg-[var(--glass-border)] rounded-lg text-[var(--text-secondary)]"
                                                            title="Editar estado"
                                                        >
                                                            <Zap size={14} />
                                                        </button>
                                                        {!status.isDefault && (
                                                            <button onClick={() => { if (confirm(`¿Eliminar estado "${status.name}"?`)) { updateSettings({ customStatuses: settings.customStatuses.filter(s => s.id !== status.id) }) } }} className="text-red-400 p-1 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button>
                                                        )}
                                                    </div>
                                                    {/* Icon and Color Picker Row */}
                                                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--glass-border)]">
                                                        <span className="text-[9px] text-[var(--text-tertiary)]">Icono:</span>
                                                        <div className="flex gap-1 flex-wrap flex-1">
                                                            {SHIFT_ICONS.slice(0, 8).map(icon => {
                                                                const IC = icon.component;
                                                                return (
                                                                    <button
                                                                        key={icon.id}
                                                                        onClick={() => updateSettings({
                                                                            customStatuses: settings.customStatuses.map(s =>
                                                                                s.id === status.id ? { ...s, icon: icon.id } : s
                                                                            )
                                                                        })}
                                                                        className={`p-1 rounded transition-all ${status.icon === icon.id ? 'bg-[var(--accent-solid)] text-white' : 'hover:bg-[var(--glass-border)] text-[var(--text-secondary)]'}`}
                                                                        title={icon.name}
                                                                    >
                                                                        <IC size={12} />
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <input
                                                            type="color"
                                                            value={status.color}
                                                            onChange={(e) => updateSettings({
                                                                customStatuses: settings.customStatuses.map(s =>
                                                                    s.id === status.id ? { ...s, color: e.target.value } : s
                                                                )
                                                            })}
                                                            className="w-6 h-6 rounded cursor-pointer border-0"
                                                            title="Cambiar color"
                                                        />
                                                        <select
                                                            value={status.payrollBehavior}
                                                            onChange={(e) => updateSettings({
                                                                customStatuses: settings.customStatuses.map(s =>
                                                                    s.id === status.id ? { ...s, payrollBehavior: e.target.value } : s
                                                                )
                                                            })}
                                                            className="text-[9px] bg-transparent border border-[var(--glass-border)] rounded px-1 py-0.5 outline-none"
                                                        >
                                                            <option value="unpaid">Sin pago</option>
                                                            <option value="paid">Con pago</option>
                                                            <option value="halfPay">Medio</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                                <div className="pt-4 border-t border-[var(--glass-border)]">
                                    <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2">Agregar Nuevo Estado</p>
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <input id="newStatusName" placeholder="Nombre" className="glass-input p-2 text-xs col-span-2" />
                                        <input id="newStatusCode" placeholder="Código Nómina" className="glass-input p-2 text-xs font-mono" maxLength={3} />
                                        <input id="newStatusMatrixCode" placeholder="Código Matriz" className="glass-input p-2 text-xs font-mono" />
                                        <select id="newStatusPayroll" className="glass-input p-2 text-xs outline-none col-span-2">
                                            <option value="unpaid">Sin pago</option>
                                            <option value="paid">Con pago</option>
                                            <option value="halfPay">Medio pago</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 mb-3">
                                        <input type="color" id="newStatusColor" defaultValue="#6366f1" className="w-10 h-10 rounded-lg cursor-pointer" />
                                        <button onClick={() => {
                                            const name = document.getElementById('newStatusName').value.trim();
                                            const code = document.getElementById('newStatusCode').value.trim().toUpperCase();
                                            const matrixCode = document.getElementById('newStatusMatrixCode').value.trim();
                                            const payroll = document.getElementById('newStatusPayroll').value;
                                            const color = document.getElementById('newStatusColor').value;
                                            if (!name || !code || !matrixCode) return;
                                            updateSettings({
                                                customStatuses: [
                                                    ...(settings.customStatuses || []),
                                                    { id: `custom_${Date.now()}`, name, code, matrixCode, color, payrollBehavior: payroll, isDefault: false, icon: 'sun' }
                                                ]
                                            });
                                            document.getElementById('newStatusName').value = '';
                                            document.getElementById('newStatusCode').value = '';
                                            document.getElementById('newStatusMatrixCode').value = '';
                                            success('Estado agregado');
                                        }} className="flex-1 bg-[var(--accent-solid)] text-white py-2 rounded-xl text-xs font-bold">
                                            + Agregar Estado
                                        </button>
                                    </div>
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
                                    <div><label className="text-[9px] text-[var(--text-tertiary)] uppercase block mb-1">Inicio Recargo Noct.</label><input type="time" value={settings.payrollConfig?.nightSurchargeStart || '21:00'} onChange={e => updateSettings({ payrollConfig: { ...settings.payrollConfig, nightSurchargeStart: e.target.value } })} className="glass-input p-2 w-full text-center text-xs" /></div>
                                    <div><label className="text-[9px] text-[var(--text-tertiary)] uppercase block mb-1">Fin Recargo Noct.</label><input type="time" value={settings.payrollConfig?.nightSurchargeEnd || '06:00'} onChange={e => updateSettings({ payrollConfig: { ...settings.payrollConfig, nightSurchargeEnd: e.target.value } })} className="glass-input p-2 w-full text-center text-xs" /></div>
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

                        <button onClick={logout} className="w-full py-3.5 rounded-xl bg-red-500/10 text-red-500 font-bold text-sm border border-red-500/20 flex items-center justify-center gap-2 mt-4 transition-all hover:bg-red-500/20 active:scale-95"><LogOut size={16} /> Cerrar Sesión</button>
                    </div>
                )}
            </div>
        </div >
    );
};

export default SettingsView;

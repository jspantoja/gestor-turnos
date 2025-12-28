import React, { useState, useEffect, useMemo } from 'react';
import { X, Copy, Save, FileText, Check, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { toLocalISOString, getShift, getWorkerDisplayName } from '../../utils/helpers'; // Asegúrate que la ruta de imports sea correcta

const MessageTemplateModal = ({ isOpen, onClose, initialTemplate, initialConfig, contextData, onSave }) => {
    const [template, setTemplate] = useState(initialTemplate);
    const [preview, setPreview] = useState('');
    const [copied, setCopied] = useState(false);
    const [config, setConfig] = useState(initialConfig || {
        showHeader: true,
        showDays: true,
        showLocation: true,
        showReliever: true,
        useShortName: false,
        showShiftSummary: true,
        includeNoPlaceInSummary: true // Nueva opción para el resumen
    });
    const [showConfigPanel, setShowConfigPanel] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTemplate(initialTemplate);
            if (initialConfig) setConfig(prev => ({ ...prev, ...initialConfig }));
        }
    }, [isOpen, initialTemplate, initialConfig]);

    // --- Lógica de Generación Dinámica ---
    const generatedData = useMemo(() => {
        if (!contextData) return {};
        const { weekDays, workers, shifts, progress, defaultSede } = contextData;
        const startDay = weekDays[0].getDate();
        const endDay = weekDays[6].getDate();
        const monthName = weekDays[0].toLocaleDateString('es-ES', { month: 'long' });

        // 1. {{titulo}}
        const titulo = `del ${startDay} al ${endDay} de ${monthName}`;

        // 2. {{lista_descansos}}
        let listaTexto = '';
        weekDays.forEach(date => {
            const dateStr = toLocalISOString(date);
            const rests = workers.filter(w => getShift(shifts, w.id, dateStr).type === 'off');

            if (rests.length > 0) {
                rests.forEach(w => {
                    let line = '';
                    if (config.showDays) {
                        const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
                        const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                        line += `${capitalizedDay} `;
                    } else {
                        line += `• `;
                    }

                    line += config.useShortName ? getWorkerDisplayName(w) : w.name;

                    if (config.showLocation) {
                        // Mostrar sede si es diferente a la default O si no existe defaultSede cargada (defensive)
                        if (w.sede && w.sede !== defaultSede) {
                            line += ` (${w.sede})`;
                        }
                    }

                    if (config.showReliever) {
                        const reliever = workers.find(r => {
                            const s = getShift(shifts, r.id, dateStr);
                            return s.coveringId === w.id;
                        });
                        if (reliever) {
                            line += ` [Cubre: ${config.useShortName ? reliever.name.split(' ')[0] : reliever.name}]`;
                        }
                    }
                    listaTexto += `${line}\n`;
                });
            }
        });

        // 3. {{resumen_turnos}}
        let resumenTexto = '';
        const summary = { morning: {}, afternoon: {}, night: {} };

        weekDays.forEach(date => {
            const dateStr = toLocalISOString(date);
            workers.forEach(w => {
                const shift = getShift(shifts, w.id, dateStr);
                if (shift.type === 'morning' || shift.type === 'afternoon' || shift.type === 'night') {
                    if (!summary[shift.type][w.id]) {
                        summary[shift.type][w.id] = { name: config.useShortName ? getWorkerDisplayName(w) : w.name, places: [] };
                    }
                    if (shift.place) {
                        summary[shift.type][w.id].places.push(shift.place);
                    }
                }
            });
        });

        ['morning', 'afternoon', 'night'].forEach(shiftType => {
            const label = shiftType === 'morning' ? 'Mañana' : shiftType === 'afternoon' ? 'Tarde' : 'Noche';
            const people = Object.values(summary[shiftType]);

            // Filtrar si la opción includeNoPlaceInSummary es false
            const filteredPeople = config.includeNoPlaceInSummary
                ? people
                : people.filter(p => p.places.length > 0);

            if (filteredPeople.length > 0) {
                resumenTexto += `${label}:\n`;
                filteredPeople.forEach(p => {
                    const uniquePlaces = [...new Set(p.places)];
                    if (uniquePlaces.length > 0) {
                        resumenTexto += `  ${p.name}: ${uniquePlaces.join(', ')}\n`;
                    } else {
                        // Si se permite mostrar sin lugar, solo mostrar nombre
                        resumenTexto += `  ${p.name}\n`;
                    }
                });
                resumenTexto += '\n'; // Espacio entre grupos
            }
        });

        // 4. {{checklist}}
        const checklistTexto = progress !== undefined ? `${Math.round(progress)}% Completado` : '';

        return {
            titulo,
            lista_descansos: listaTexto,
            resumen_turnos: resumenTexto,
            checklist: checklistTexto
        };
    }, [contextData, config]);


    // Generar vista previa
    useEffect(() => {
        let text = template;
        Object.entries(generatedData).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'gi');
            text = text.replace(regex, value || '');
        });
        setPreview(text);
    }, [template, generatedData]);

    if (!isOpen) return null;

    const handleInsert = (variable) => {
        const textarea = document.getElementById('template-textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText = template.substring(0, start) + `{{${variable}}}` + template.substring(end);
        setTemplate(newText);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
        }, 0);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(preview).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleSave = () => {
        onSave(template, config);
    };

    const configOptions = [
        { key: 'showDays', label: 'Mostrar Días de la Semana' },
        { key: 'showLocation', label: 'Mostrar Sede/Lugar' },
        { key: 'showReliever', label: 'Mostrar Quién Releva' },
        { key: 'useShortName', label: 'Usar Nombres Cortos' },
        { key: 'includeNoPlaceInSummary', label: 'Incluir sin Sede en Resumen' },
    ];

    const variables = [
        { key: 'titulo', label: 'Título', desc: 'Fechas y mes' },
        { key: 'lista_descansos', label: 'Lista Descansos', desc: 'Detalle día a día' },
        { key: 'resumen_turnos', label: 'Resumen Turnos', desc: 'Agrupado M/T/N' },
        { key: 'checklist', label: 'Checklist', desc: '% Avance' }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center modal-overlay animate-enter">
            <div className="w-full max-w-5xl liquid-glass bg-[var(--card-bg)]/90 p-0 rounded-3xl m-4 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-5 border-b border-[var(--glass-border)] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-[var(--accent-solid)] text-[var(--accent-text)]">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Personalizar Mensaje</h2>
                            <p className="text-xs text-[var(--text-secondary)]">Configura variables y edita la plantilla</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--glass-border)] transition-colors text-[var(--text-secondary)]">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Panel Izquierdo: Configuración y Editor */}
                    <div className="flex-1 p-6 flex flex-col border-r border-[var(--glass-border)] overflow-y-auto min-w-[350px]">

                        {/* Configuración Toggleable */}
                        <div className="mb-6 bg-[var(--glass-panel)] rounded-xl border border-[var(--glass-border)] overflow-hidden">
                            <button
                                onClick={() => setShowConfigPanel(!showConfigPanel)}
                                className="w-full p-3 flex justify-between items-center bg-[var(--glass-dock)] hover:bg-[var(--glass-border)] transition-colors text-left"
                            >
                                <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                                    <Settings size={16} /> Opciones de Variables
                                </span>
                                {showConfigPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {showConfigPanel && (
                                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-enter">
                                    {configOptions.map(opt => (
                                        <label key={opt.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--glass-border)] cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={config[opt.key] || false}
                                                onChange={(e) => setConfig(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                                                className="w-4 h-4 rounded border-gray-300 text-[var(--accent-solid)] focus:ring-[var(--accent-solid)]"
                                            />
                                            <span className="text-xs font-medium text-[var(--text-primary)]">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Variables Buttons */}
                        <div className="mb-4">
                            <label className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                                Variables Dinámicas
                                <span className="text-[10px] font-normal text-[var(--text-secondary)] bg-[var(--glass-dock)] px-2 py-0.5 rounded-full">Clic para insertar</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {variables.map(v => (
                                    <button
                                        key={v.key}
                                        onClick={() => handleInsert(v.key)}
                                        className="flex flex-col items-start p-2 rounded-xl bg-[var(--glass-dock)] border border-[var(--glass-border)] hover:bg-[var(--glass-border)] hover:border-[var(--accent-solid)] transition-all group text-left min-w-0"
                                        title={generatedData[v.key] || v.desc} // Tooltip nativo con el valor real
                                    >
                                        <span className="text-xs font-bold text-[var(--accent-solid)] font-mono truncate w-full">{`{{${v.key}}}`}</span>
                                        <span className="text-[10px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate w-full">{v.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Textarea */}
                        <div className="flex-1 flex flex-col min-h-[200px]">
                            <label className="text-sm font-bold text-[var(--text-primary)] mb-2">Plantilla de Edición</label>
                            <textarea
                                id="template-textarea"
                                value={template}
                                onChange={(e) => setTemplate(e.target.value)}
                                className="flex-1 w-full glass-input rounded-xl p-4 font-mono text-sm resize-none focus:ring-2 focus:ring-[var(--accent-solid)] focus:border-transparent"
                                placeholder="Escribe tu mensaje aquí..."
                            />
                        </div>
                    </div>

                    {/* Panel Derecho: Previsualización */}
                    <div className="flex-1 p-6 flex flex-col bg-[var(--bg-body)]/50">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-[var(--text-primary)]">Vista Previa</label>
                            <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--glass-border)] px-2 py-1 rounded-lg">Se actualiza en tiempo real</span>
                        </div>
                        <div className="flex-1 rounded-xl bg-[var(--card-bg)] border border-[var(--glass-border)] p-4 overflow-y-auto relative custom-scrollbar">
                            <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--text-primary)] leading-relaxed">
                                {preview || <span className="text-[var(--text-tertiary)] italic">La vista previa aparecerá aquí...</span>}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-[var(--glass-border)] bg-[var(--card-bg)] flex justify-between items-center gap-4">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-border)] transition-colors"
                    >
                        <Save size={18} />
                        Guardar Configuración
                    </button>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl text-sm font-bold border border-[var(--glass-border)] hover:bg-[var(--glass-border)] transition-colors text-[var(--text-primary)]"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold shadow-lg transition-all transform active:scale-95 ${copied
                                ? 'bg-green-500 text-white'
                                : 'bg-[var(--accent-solid)] text-[var(--accent-text)] hover:brightness-110'
                                }`}
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            {copied ? '¡Copiado!' : 'Copiar Mensaje'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageTemplateModal;

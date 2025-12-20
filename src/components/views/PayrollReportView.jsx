import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FileText, List, ChevronLeft, ChevronRight, AlertCircle, DollarSign, TrendingUp, Download, Printer, X, GripVertical, ListPlus, Upload } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SectionHeader from '../shared/SectionHeader';
import { toLocalISOString, getShift } from '../../utils/helpers';
import { calculateWorkerPay } from '../../utils/payrollUtils';
import PayrollDetailModal from '../modals/PayrollDetailModal';
import { SHIFT_TYPES, SHIFT_COLORS } from '../../config/constants';

const PayrollHistoryModal = ({ onClose, onSelect }) => {
    const periods = useMemo(() => {
        const list = [];
        let d = new Date();
        d.setDate(1); // Start at 1st
        if (new Date().getDate() > 15) d.setDate(16); // Or 16th if in 2nd half

        for (let i = 0; i < 24; i++) {
            list.push(new Date(d));
            if (d.getDate() === 16) d.setDate(1);
            else { d.setMonth(d.getMonth() - 1); d.setDate(16); }
        }
        return list;
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/45 dark:bg-black/35 backdrop-blur-md animate-enter">
            <div className="w-full max-w-md liquid-glass p-6 rounded-3xl m-4 max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-[var(--text-primary)]">Historial de Nóminas</h2><button onClick={onClose}><X size={24} /></button></div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {periods.map((date, i) => {
                        const isFirst = date.getDate() <= 15;
                        const label = isFirst ? '1ª Quincena' : '2ª Quincena';
                        const month = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                        return (
                            <button key={i} onClick={() => onSelect(date)} className="w-full p-4 rounded-xl glass-panel border border-[var(--glass-border)] hover:bg-[var(--glass-border)] transition-all text-left flex items-center justify-between group">
                                <div><div className="font-bold text-[var(--text-primary)] capitalize">{month}</div><div className="text-xs text-[var(--text-secondary)]">{label}</div></div>
                                <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-tertiary)]" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const PayrollCostCalculator = ({ workers, shifts, daysToShow, settings, holidays, weeklyNotes, setWeeklyNotes, currentDate, onOpenDetail, payrollExclusions = {} }) => {
    const cfg = settings.payrollConfig || {};

    const stats = useMemo(() => {
        let total = {
            programmedHours: 0,
            absenceHours: 0,
            realHours: 0,
            sundaysCount: 0,
            holidaysCount: 0,
            nightHours: 0,
            baseSalary: 0,
            totalSurcharges: 0,
            totalTransport: 0,
            totalCost: 0
        };

        const periodId = daysToShow.length > 0 ? toLocalISOString(daysToShow[0].date) : '';

        workers.forEach(w => {
            const isExcluded = payrollExclusions[`${w.id}_${periodId}`] || false;
            const pay = calculateWorkerPay(w, shifts, daysToShow, holidays, settings, { excludeSurcharges: isExcluded });
            total.programmedHours += pay.programmedHours;
            total.absenceHours += pay.absenceHours;
            total.realHours += pay.realHours;
            total.sundaysCount += pay.stats.sundays;
            total.holidaysCount += pay.stats.holidays;
            total.nightHours += pay.stats.nightHours;
            total.baseSalary += pay.costs.baseSalary;
            total.totalSurcharges += pay.costs.totalSurcharges;
            total.totalTransport += pay.costs.transportAllowance;
            total.totalCost += pay.costs.total;
        });

        return total;
    }, [workers, shifts, daysToShow, holidays, settings]);

    const noteKey = `payroll_note_${toLocalISOString(currentDate).substring(0, 10)}`;
    const currentNote = weeklyNotes[noteKey] || '';

    return (
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500"><DollarSign size={20} /></div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Costo Estimado</h3>
                        <p className="text-[10px] text-[var(--text-secondary)]">Cálculo aproximado de nómina</p>
                    </div>
                </div>
                <button
                    onClick={onOpenDetail}
                    className="p-1.5 rounded-lg bg-[var(--glass-dock)] border border-[var(--glass-border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-border)] transition-colors"
                    title="Ver detalle por trabajador"
                >
                    <ListPlus size={16} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                    <div className="flex justify-between text-[var(--text-secondary)]"><span>Horas Prog.</span><span>{Math.round(stats.programmedHours)}h</span></div>
                    <div className="flex justify-between text-red-400"><span>Ausencias</span><span>-{Math.round(stats.absenceHours)}h</span></div>
                    <div className="flex justify-between font-bold text-[var(--text-primary)] border-t border-[var(--glass-border)] pt-1"><span>Horas Reales</span><span>{Math.round(stats.realHours)}h</span></div>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between text-[var(--text-secondary)]"><span>Domingos</span><span>{stats.sundaysCount}</span></div>
                    <div className="flex justify-between text-[var(--text-secondary)]"><span>Festivos</span><span>{stats.holidaysCount}</span></div>
                    <div className="flex justify-between text-[var(--text-secondary)]"><span>H. Nocturnas</span><span>{Math.round(stats.nightHours)}</span></div>
                </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-[var(--glass-border)]">
                <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Salario Base</span><span>${stats.baseSalary.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Recargos</span><span>${stats.totalSurcharges.toLocaleString()}</span></div>
                {cfg.includeTransportAllowance && <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Aux. Transporte</span><span>${stats.totalTransport.toLocaleString()}</span></div>}
                <div className="flex justify-between text-lg font-bold text-[var(--text-primary)] pt-1"><span>Total</span><span>${stats.totalCost.toLocaleString()}</span></div>
            </div>

            <div className="mt-2">
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-1 block">Notas de la Quincena</label>
                <textarea
                    value={currentNote}
                    onChange={(e) => setWeeklyNotes(prev => ({ ...prev, [noteKey]: e.target.value }))}
                    className="glass-input w-full p-2 text-xs rounded-xl min-h-[60px]"
                    placeholder="Escribe observaciones aquí..."
                />
            </div>
        </div>
    );
};

const PayrollTrendsChart = ({ payrollSnapshots, currentDate }) => {
    const history = useMemo(() => {
        const result = [];
        let curr = new Date(currentDate);
        if (curr.getDate() > 15) curr.setDate(16); else curr.setDate(1);

        for (let i = 0; i < 3; i++) {
            const key = toLocalISOString(curr).substring(0, 10);
            const snap = payrollSnapshots[key];
            if (snap) {
                result.push({ label: `${curr.getDate() === 1 ? '1ª' : '2ª'} ${curr.toLocaleDateString('es-ES', { month: 'short' })} `, value: snap.summary?.totalCost || 0 });
            } else {
                result.push({ label: `${curr.getDate() === 1 ? '1ª' : '2ª'} ${curr.toLocaleDateString('es-ES', { month: 'short' })} `, value: 0 });
            }
            if (curr.getDate() === 16) curr.setDate(1);
            else { curr.setMonth(curr.getMonth() - 1); curr.setDate(16); }
        }
        return result.reverse();
    }, [payrollSnapshots, currentDate]);

    const maxVal = Math.max(...history.map(h => h.value), 1);

    return (
        <div className="glass-panel p-5 rounded-2xl flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><TrendingUp size={20} /></div>
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Tendencias</h3>
                    <p className="text-[10px] text-[var(--text-secondary)]">Últimas 3 quincenas</p>
                </div>
            </div>
            <div className="flex-1 flex items-end justify-between gap-2">
                {history.map((h, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        <div className="w-full bg-[var(--glass-dock)] rounded-t-lg relative group" style={{ height: '100px' }}>
                            <div
                                className="absolute bottom-0 left-0 w-full bg-[var(--accent-solid)] rounded-t-lg transition-all duration-500 opacity-80 group-hover:opacity-100"
                                style={{ height: `${(h.value / maxVal) * 100}% ` }}
                            ></div>
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                ${h.value.toLocaleString()}
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">{h.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PayrollQuickActions = ({ workers, shifts, daysToShow, settings, currentDate, setShifts }) => {
    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const lines = text.split('\n').filter(line => line.trim() !== '');
                if (lines.length < 2) return;

                // header: CC;1;2;3...
                const header = lines[0].split(';');
                if (header[0].trim().toUpperCase() !== 'CC') {
                    alert('Formato inválido. La primera columna debe ser "CC".');
                    return;
                }

                const headerDays = [];
                for (let i = 1; i < header.length; i++) {
                    const d = parseInt(header[i].trim());
                    if (!isNaN(d)) headerDays.push({ index: i, dayNum: d });
                }

                const updates = {};
                let count = 0;

                for (let i = 1; i < lines.length; i++) {
                    const row = lines[i].split(';');
                    if (row.length < 2) continue;

                    const cedula = row[0].trim();
                    const workedIdStr = cedula;
                    const worker = workers.find(w => (w.cedula && w.cedula === workedIdStr) || (String(w.id) === workedIdStr));

                    if (!worker) continue;

                    headerDays.forEach(({ index, dayNum }) => {
                        if (index >= row.length) return;

                        const code = row[index].trim();
                        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                        const dateStr = toLocalISOString(targetDate);
                        const key = `${worker.id}_${dateStr}`;

                        let newShift = null;

                        if (code === 'M') newShift = { type: 'morning', start: '08:00', end: '16:00' };
                        else if (code === 'T') newShift = { type: 'afternoon', start: '14:00', end: '22:00' };
                        else if (code === 'N') newShift = { type: 'night', start: '22:00', end: '06:00' };
                        else if (code === '-1' || code === '') {
                            newShift = { type: 'off' };
                        } else {
                            const customDef = settings.customShifts?.find(cs => cs.code === code);
                            if (customDef) {
                                newShift = {
                                    type: 'custom',
                                    code: code,
                                    start: customDef.start,
                                    end: customDef.end,
                                    customShiftId: customDef.id,
                                    customShiftName: customDef.name,
                                    customShiftIcon: customDef.icon,
                                    customShiftColor: customDef.color
                                };
                            } else {
                                newShift = { type: 'custom', code: code, start: '00:00', end: '00:00', customShiftName: `Código ${code}` };
                            }
                        }

                        if (newShift) {
                            updates[key] = newShift;
                            count++;
                        }
                    });
                }

                if (count > 0) {
                    if (typeof setShifts === 'function') {
                        setShifts(prev => ({ ...prev, ...updates }));
                        alert(`Se importaron ${count} turnos correctamente.`);
                    } else {
                        console.error("setShifts no disponible en PayrollReportView");
                        alert("Error interno: No se puede actualizar la base de datos desde esta vista.");
                    }
                } else {
                    alert('No se encontraron datos válidos para importar.');
                }

            } catch (err) {
                console.error("Import error", err);
                alert('Error al leer el archivo.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };
    const handleExport = () => {
        // Using semicolon separator for Excel Spanish locale
        let csv = 'Nombre;Sede;';
        daysToShow.forEach(d => csv += `${d.date.getDate()}/${d.date.getMonth() + 1};`);
        csv += '\n';

        workers.forEach(w => {
            csv += `${w.name};${w.sede};`;
            daysToShow.forEach(d => {
                const s = getShift(shifts, w.id, toLocalISOString(d.date));
                csv += `${s.type || '-'};`;
            });
            csv += '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `nomina_${toLocalISOString(currentDate).substring(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCodes = () => {
        // Build CSV with CC (cédula) and shift codes
        // Header: CC; 1; 2; 3; ... (days) - Using semicolon for Excel Spanish locale
        let csv = 'CC';
        daysToShow.forEach(d => csv += `;${d.date.getDate()}`);
        csv += '\n';

        // Rows: worker cédula, then code for each day
        workers.forEach(w => {
            const cedula = w.cedula || w.id; // Fallback to ID if no cédula
            csv += cedula;
            daysToShow.forEach(d => {
                const dateStr = toLocalISOString(d.date);
                const s = getShift(shifts, w.id, dateStr);
                let code = '-1'; // Default fallback

                if (s.type === 'custom' && s.customShiftId) {
                    const customShiftDef = (settings.customShifts || []).find(cs => cs.id === s.customShiftId);
                    if (customShiftDef) {
                        code = customShiftDef.matrixCode || customShiftDef.code;
                    } else {
                        code = s.code; // fallback to code on shift instance
                    }
                } else if (s.type === 'morning') {
                    code = 'M';
                } else if (s.type === 'afternoon') {
                    code = 'T';
                } else if (s.type === 'night') {
                    code = 'N';
                } else {
                    // Look up matrixCode from customStatuses for absences
                    const statusDef = (settings.customStatuses || []).find(st => st.id === s.type);
                    if (statusDef && statusDef.matrixCode) {
                        code = statusDef.matrixCode;
                    }
                }
                csv += `;${code}`;
            });
            csv += '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `codigos_${toLocalISOString(currentDate).substring(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 h-full">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Acciones</h3>
            <button onClick={handleExport} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--glass-dock)] hover:bg-[var(--glass-border)] transition-colors text-left group">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors"><Download size={18} /></div>
                <div><div className="text-sm font-bold text-[var(--text-primary)]">Exportar CSV</div><div className="text-[10px] text-[var(--text-secondary)]">Descargar tabla</div></div>
            </button>
            <button onClick={handleExportCodes} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--glass-dock)] hover:bg-[var(--glass-border)] transition-colors text-left group">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Download size={18} /></div>
                <div><div className="text-sm font-bold text-[var(--text-primary)]">Exportar Códigos</div><div className="text-[10px] text-[var(--text-secondary)]">Matriz CC + códigos</div></div>
            </button>
            <button onClick={handlePrint} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--glass-dock)] hover:bg-[var(--glass-border)] transition-colors text-left group">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors"><Printer size={18} /></div>
                <div><div className="text-sm font-bold text-[var(--text-primary)]">Imprimir</div><div className="text-[10px] text-[var(--text-secondary)]">Vista de impresión</div></div>
            </button>

            {/* Import Button */}
            <div className="pt-2 border-t border-[var(--glass-border)]">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-[var(--glass-dock)] hover:bg-[var(--glass-border)] transition-colors text-left group cursor-pointer">
                    <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Upload size={18} /></div>
                    <div><div className="text-sm font-bold text-[var(--text-primary)]">Restaurar / Importar</div><div className="text-[10px] text-[var(--text-secondary)]">Cargar archivo CSV</div></div>
                </label>
                ```
            </div>
        </div>
    );
};

// --- CORRECCIÓN VISUAL (Componente PayrollRow completo, Línea ~230) ---
const PayrollRow = ({ worker, daysToShow, shifts, holidays, setSelectedCell, stats, settings }) => {
    const hoursCfg = settings.payrollConfig?.hoursPerWeekday || {};
    const sunHours = hoursCfg.sunday || 7.33;
    const holHours = hoursCfg.holiday || 7.33;

    const totalSun = (stats.sundays || 0) * sunHours;
    const totalHol = (stats.holidays || 0) * holHours;
    const totalNight = stats.nightHours || 0;

    return (
        <tr className="group transition-colors hover:bg-gray-50/50">
            {/* Columna Nombre Sticky */}
            <td className="report-sticky-col p-3 border-b border-[var(--glass-border)] text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px] bg-[var(--bg-body)] z-10">
                <div className="flex items-center gap-2 truncate">
                    <span>{worker.name}</span>
                    {worker.isReliever && <span className="reliever-tag px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-bold">Relevo</span>}
                </div>
            </td>

            {/* Celdas de Días */}
            {daysToShow.map(d => {
                const dateStr = toLocalISOString(d.date);
                const s = getShift(shifts, worker.id, dateStr);
                const type = SHIFT_TYPES[s.type || 'off'];
                const isSun = d.date.getDay() === 0;
                const isHol = holidays.has(dateStr);

                // Determine the display code: use custom shift code if available
                const customShiftDef = s.type === 'custom' && settings.customShifts
                    ? settings.customShifts.find(cs => cs.id === s.customShiftId || cs.code === s.code)
                    : null;
                const displayCode = customShiftDef?.payrollCode || (s.type === 'custom' && s.code ? s.code : type.code);

                // Get custom shift color if available
                const customColor = s.type === 'custom' && s.customShiftColor
                    ? SHIFT_COLORS.find(c => c.id === s.customShiftColor)
                    : null;

                // LÓGICA DE COLOR ROJO:
                // Si es domingo o festivo, forzamos fondo rojo suave y texto rojo
                const cellClasses = (isSun || isHol)
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100' // Clase "Festivo"
                    : 'border-[var(--glass-border)]'; // Clase Normal

                // Text color for custom shifts
                const textColorStyle = customColor ? { color: customColor.hex } : {};

                return (
                    <td
                        key={dateStr}
                        className={`text-center p-1 border-b cursor-pointer transition-all hover:brightness-95 ${cellClasses}`}
                        onClick={() => setSelectedCell({ workerId: worker.id, dateStr })}
                    >
                        {/* Solo mostramos el código si hay turno real */}
                        <div
                            className={`text-xs font-bold ${s.type && s.type !== 'unassigned' ? 'opacity-100' : 'opacity-20'}`}
                            style={textColorStyle}
                        >
                            {displayCode}
                        </div>
                    </td>
                );
            })}

            {/* Totales (Solo muestra número si es > 0) */}
            <td className="text-center font-bold text-sm text-[var(--text-primary)] bg-[var(--glass-dock)] border-b border-[var(--glass-border)]">
                {totalSun > 0 ? Number(totalSun.toFixed(2)) : '-'}
            </td>
            <td className="text-center font-bold text-sm text-[var(--text-primary)] bg-[var(--glass-dock)] border-b border-[var(--glass-border)]">
                {totalHol > 0 ? Number(totalHol.toFixed(2)) : '-'}
            </td>
            <td className="text-center font-bold text-sm text-[var(--text-primary)] bg-[var(--glass-dock)] border-b border-[var(--glass-border)]">
                {totalNight > 0 ? Number(totalNight.toFixed(2)) : '-'}
            </td>
            <td className="text-center font-bold text-sm text-[var(--text-primary)] bg-[var(--glass-dock)] border-b border-[var(--glass-border)]">
                {stats.surchargeDays > 0 ? stats.surchargeDays : '-'}
            </td>
        </tr>
    );
};

const PayrollReportView = ({ workers, setWorkers, shifts, setShifts, currentDate, holidays, setHolidays, navigate, setViewMode, daysToShow, setSelectedCell, setCurrentDate, settings, weeklyNotes, setWeeklyNotes, payrollSnapshots }) => {
    const [showHistory, setShowHistory] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [scrollState, setScrollState] = useState({ atStart: true, atEnd: false });
    const scrollContainerRef = useRef(null);

    // Filter workers: Show active workers OR inactive workers that have shifts in the current period


    // Filter workers: Show active workers OR inactive workers that have shifts in the current period
    const activeWorkers = useMemo(() => {
        return workers.filter(w => {
            if (w.isActive !== false) return true;
            // For inactive workers, check if they have any assigned shift in the visible days
            // For Payroll, we might want to be stricter (only if Worked?) 
            // Or consistent with Schedule (if assigned).
            // But visibility suggests showing the row.
            // Let's stick to consistent logic: Show if not 'unassigned'.
            return daysToShow.some(d => {
                const s = getShift(shifts, w.id, toLocalISOString(d.date));
                // Show if they have a shift type that is not 'unassigned' and not 'off' (unless we want to show Rest Days for archived people?)
                // Usually for payroll, if they have 'off' it doesn't affect pay unless paid rest?
                return s.type && s.type !== 'unassigned';
            });
        });
    }, [workers, shifts, daysToShow]);

    useEffect(() => { setViewMode('biweekly'); }, []);

    const handleScroll = (e) => {
        const { scrollLeft, scrollWidth, clientWidth } = e.target;
        setScrollState({
            atStart: scrollLeft === 0,
            atEnd: scrollLeft + clientWidth >= scrollWidth - 1
        });
    };


    const groupedWorkers = useMemo(() => {
        const groups = {};
        activeWorkers.forEach(w => {
            const sede = w.sede || w.location || 'Sin Sede';
            if (!groups[sede]) groups[sede] = [];
            groups[sede].push(w);
        });
        return groups;
    }, [activeWorkers]);

    const toggleHoliday = (dateStr) => { setHolidays(prev => { const next = new Set(prev); if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr); return next; }); };

    const allWorkerStats = useMemo(() => {
        const statsMap = new Map();
        activeWorkers.forEach(w => {
            statsMap.set(w.id, calculateWorkerPay(w, shifts, daysToShow, holidays, settings).stats);
        });
        return statsMap;
    }, [activeWorkers, shifts, daysToShow, holidays, settings]);

    const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
    const yearNum = currentDate.getFullYear();
    const isFirstQ = currentDate.getDate() <= 15;
    const startDayNum = isFirstQ ? 1 : 16;
    const endDayNum = isFirstQ ? 15 : new Date(yearNum, currentDate.getMonth() + 1, 0).getDate();

    return (
        <div className="flex flex-col h-full animate-enter bg-[var(--bg-body)]">
            {/* AGREGA LA INSTRUCCIÓN AQUÍ, justo antes de la tabla o en el encabezado */}
            <div className="px-6 pb-2">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--card-bg)] p-2 rounded-lg border border-[var(--glass-border)] w-fit no-print">
                    <span className="text-amber-500">💡 Tip:</span>
                    <span>Haz <strong>clic en el número del día</strong> (encabezado de la columna) para marcarlo como <strong>Festivo</strong>.</span>
                </div>
            </div>
            <div className="px-6 py-8 flex flex-col gap-4 border-b border-[var(--glass-border)] bg-[var(--bg-body)] z-40 sticky top-0">
                <div className="relative flex items-center justify-center">
                    <SectionHeader icon={FileText}>Nómina</SectionHeader>
                    <div className="absolute right-0 flex gap-2 no-print">
                        <button onClick={() => setShowHistory(true)} className="p-2 rounded-full bg-[var(--glass-dock)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="Historial"><List size={16} /></button>
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-[var(--glass-dock)] border border-[var(--glass-border)]"><ChevronLeft size={16} /></button>
                        <button onClick={() => navigate(1)} className="p-2 rounded-full bg-[var(--glass-dock)] border border-[var(--glass-border)]"><ChevronRight size={16} /></button>
                    </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)] text-center font-medium">Nómina del {startDayNum} al {endDayNum} de {monthName}</p>
            </div>
            <div className="flex-1 overflow-auto px-6 pb-32">
                {/* Scroll Shadow Container */}
                <div className={`relative payroll-scroll-container ${!scrollState.atStart ? 'show-left-shadow' : ''} ${!scrollState.atEnd ? 'show-right-shadow' : ''}`}>
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="overflow-x-auto payroll-table-scroll"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--glass-border) transparent' }}
                    >
                        <div className="glass-panel rounded-xl overflow-hidden shadow-sm border border-[var(--glass-border)] min-w-max">
                            <table className="report-table w-full"><thead><tr><th className="report-header-cell report-sticky-col p-3 min-w-[200px] text-left text-xs font-bold text-[var(--text-secondary)] uppercase">Nombres</th>{daysToShow.map(d => { const isSun = d.date.getDay() === 0; const dateStr = toLocalISOString(d.date); const isHol = holidays.has(dateStr); return (<th key={dateStr} className={`report-header-cell text-center p-1 min-w-[40px] cursor-pointer hover:bg-[var(--glass-border)] transition-colors ${(isSun || isHol) ? 'holiday-bg' : ''}`} onClick={() => toggleHoliday(dateStr)}><div className={`text-[10px] font-bold ${(isSun || isHol) ? 'holiday-text' : 'text-[var(--text-secondary)]'}`}>{d.date.toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase()}</div><div className={`text-sm font-bold ${(isSun || isHol) ? 'holiday-text' : 'text-[var(--text-primary)]'}`}>{d.date.getDate()}</div></th>) })}<th className="report-header-cell text-center p-2 min-w-[80px] text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--glass-dock)]">DOM<br />LAB.</th><th className="report-header-cell text-center p-2 min-w-[80px] text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--glass-dock)]">FEST<br />LAB.</th><th className="report-header-cell text-center p-2 min-w-[80px] text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--glass-dock)]">H.<br />NOCT</th><th className="report-header-cell text-center p-2 min-w-[80px] text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--glass-dock)]">DÍAS<br />REC</th></tr></thead>
                                <tbody>
                                    {Object.entries(groupedWorkers).map(([sedeName, group]) => (
                                        <React.Fragment key={sedeName}>
                                            <tr><td colSpan={daysToShow.length + 5} className="bg-[var(--glass-border)] p-2 font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)] pl-4">{sedeName}</td></tr>
                                            {group.map(w => (
                                                <PayrollRow
                                                    key={w.id}
                                                    worker={w}
                                                    daysToShow={daysToShow}
                                                    shifts={shifts}
                                                    settings={settings}
                                                    holidays={holidays}
                                                    setSelectedCell={setSelectedCell}
                                                    stats={allWorkerStats.get(w.id)}
                                                />
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Scroll Indicator */}
                    {!scrollState.atEnd && (
                        <div className="scroll-hint">
                            <ChevronRight size={16} className="animate-pulse" />
                            <span className="text-[10px]">Desliza</span>
                        </div>
                    )}
                </div>
                {/* BUSCA DONDE ESTABA EL TEXTO FIJO Y REEMPLÁZALO CON ESTO: */}
                {settings.payrollConfig.customMessage && (
                    <div className="mt-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center print-visible">
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            {settings.payrollConfig.customMessage}
                        </p>
                    </div>
                )}
                {/* --- PAYROLL ANALYTICS PANEL --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 no-print">
                    <PayrollCostCalculator
                        workers={activeWorkers}
                        shifts={shifts}
                        daysToShow={daysToShow}
                        settings={settings}
                        holidays={holidays}
                        weeklyNotes={weeklyNotes}
                        setWeeklyNotes={setWeeklyNotes}
                        currentDate={currentDate}
                        onOpenDetail={() => setShowDetailModal(true)}
                    />
                    <PayrollTrendsChart
                        payrollSnapshots={payrollSnapshots}
                        currentDate={currentDate}
                    />
                    <PayrollQuickActions
                        workers={activeWorkers}
                        shifts={shifts}
                        daysToShow={daysToShow}
                        settings={settings}
                        currentDate={currentDate}
                        setShifts={setShifts} // Pass setShifts here
                    />
                </div>
            </div>
            {showHistory && <PayrollHistoryModal onClose={() => setShowHistory(false)} onSelect={(d) => { setCurrentDate(d); setShowHistory(false); }} />}
            {showDetailModal && (
                <PayrollDetailModal
                    workers={activeWorkers}
                    shifts={shifts}
                    daysToShow={daysToShow}
                    holidays={holidays}
                    settings={settings}
                    onClose={() => setShowDetailModal(false)}
                    calculateWorkerPay={calculateWorkerPay}
                />
            )}
        </div>
    );
};

export default PayrollReportView;

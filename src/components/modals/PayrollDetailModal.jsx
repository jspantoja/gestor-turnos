import React, { useMemo, useState } from 'react';
import { X, DollarSign, TrendingUp, User, LayoutGrid, List as ListIcon } from 'lucide-react';

import { toLocalISOString } from '../../utils/helpers';

const PayrollDetailModal = ({ workers, shifts, daysToShow, holidays, settings, onClose, calculateWorkerPay, payrollExclusions = {} }) => {
    const [sortBy, setSortBy] = useState('total'); // 'total', 'name', 'sede'

    const periodId = daysToShow.length > 0 ? toLocalISOString(daysToShow[0].date) : '';

    const data = useMemo(() => {
        return workers.map((w) => {
            const isExcluded = payrollExclusions[`${w.id}_${periodId}`] || false;
            return calculateWorkerPay(w, shifts, daysToShow, holidays, settings, { excludeSurcharges: isExcluded });
        }).sort((a, b) => {
            if (sortBy === 'total') return b.costs.total - a.costs.total;
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'sede') return (a.sede || '').localeCompare(b.sede || '');
            return 0;
        });
    }, [workers, shifts, daysToShow, holidays, settings, calculateWorkerPay, sortBy, payrollExclusions, periodId]);

    const totalGrand = data.reduce((acc, curr) => acc + curr.costs.total, 0);

    return (
        <div className="modal-overlay z-[100] animate-enter p-4">
            <div className="w-full max-w-2xl bg-[var(--glass-panel)] border border-[var(--glass-border)] shadow-2xl rounded-3xl flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-[var(--glass-border)] flex items-center justify-between shrink-0 bg-[var(--glass-dock)]/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Detalle de Costos</h2>
                            <p className="text-sm text-[var(--text-secondary)]">Desglose estimado por trabajador</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--glass-border)] transition-colors text-[var(--text-secondary)]">
                        <X size={24} />
                    </button>
                </div>

                {/* Controls & Summary */}
                <div className="px-6 py-4 flex items-center justify-between shrink-0 gap-4">
                    <div className="flex gap-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-[var(--glass-dock)] border border-[var(--glass-border)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 ring-[var(--accent-solid)]"
                        >
                            <option value="total">Mayor Costo</option>
                            <option value="name">Nombre</option>
                            <option value="sede">Sede</option>
                        </select>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Total Estimado</div>
                        <div className="text-xl font-bold text-[var(--text-primary)]">${totalGrand.toLocaleString()}</div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3 custom-scrollbar">
                    {data.map((item) => (
                        <div key={item.id} className="p-4 rounded-xl bg-[var(--glass-dock)] border border-[var(--glass-border)] hover:border-[var(--accent-solid)] transition-colors flex flex-col gap-3 group">
                            {/* Top Row: Name & Total */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-[var(--text-primary)] font-bold text-sm border border-[var(--glass-border)]">
                                        {item.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-[var(--text-primary)]">{item.name}</div>
                                        <div className="text-xs text-[var(--text-secondary)] flex gap-2">
                                            <span>{item.sede || 'Sin Sede'}</span>
                                            {item.role && <span className="opacity-50">• {item.role}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-[var(--text-primary)]">${item.costs.total.toLocaleString()}</div>
                                    <div className="text-[10px] text-[var(--text-secondary)]">{Math.round(item.realHours)}h reales</div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-[var(--glass-border)] w-full"></div>

                            {/* Breakdown Grid */}
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="space-y-1">
                                    <span className="text-[var(--text-tertiary)] block">Salario Base</span>
                                    <span className="font-medium text-[var(--text-primary)]">${item.costs.baseSalary.toLocaleString()}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[var(--text-tertiary)] block">Recargos</span>
                                    <span className={`font-medium ${item.costs.totalSurcharges > 0 ? 'text-amber-500' : 'text-[var(--text-primary)]'}`}>
                                        ${item.costs.totalSurcharges.toLocaleString()}
                                    </span>
                                </div>
                                <div className="space-y-1 text-right">
                                    <span className="text-[var(--text-tertiary)] block">Aux. Transporte</span>
                                    <span className="font-medium text-[var(--text-primary)]">${item.costs.transportAllowance.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PayrollDetailModal;

import React from 'react';
import { SHIFT_TYPES, SHIFT_COLORS } from '../../config/constants';
import { getWorkerDisplayName } from '../../utils/helpers';

const GridWorkerCard = ({ worker, shift, onClick, settings }) => {
    const type = SHIFT_TYPES[shift.type || 'off'];
    const firstName = getWorkerDisplayName(worker);
    // For custom shifts, use the stored code; otherwise use type.code
    const displayCode = shift.type === 'custom' && shift.code ? shift.code : type.code;

    // Get custom shift color if available
    let customColor = shift.type === 'custom' && shift.customShiftColor
        ? SHIFT_COLORS.find(c => c.id === shift.customShiftColor)
        : null;

    // Enhanced Color Logic Fallback
    if (!customColor && shift.type === 'custom' && settings?.customShifts) {
        const def = settings.customShifts.find(cs =>
            (shift.customShiftId && cs.id === shift.customShiftId) ||
            (shift.code && cs.code === shift.code) ||
            (shift.customShiftName && cs.name === shift.customShiftName)
        );
        if (def && def.color) {
            customColor = SHIFT_COLORS.find(c => c.id === def.color);
        }
    }
    const shiftStyle = customColor
        ? `${customColor.bg} ${customColor.text} ${customColor.border}`
        : type.style;

    return (
        <div
            onClick={onClick}
            className="flex flex-col items-center justify-between p-2 rounded-xl glass-panel cursor-pointer transition-all aspect-square hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]"
            style={{ borderBottomWidth: '3px', borderBottomColor: shift.type === 'custom' && customColor ? customColor.hex : worker.color }}
        >
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 flex-shrink-0 flex items-center justify-center bg-[var(--glass-border)]" style={{ borderColor: worker.color }}>
                {worker.avatar ? (
                    <img src={worker.avatar} className="w-full h-full object-cover" alt={worker.name} />
                ) : (
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                        {worker.name[0]}
                    </span>
                )}
            </div>
            <span className="text-[10px] font-bold text-[var(--text-primary)] text-center truncate w-full px-1 leading-tight">
                {firstName}
            </span>
            <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${shiftStyle} flex-shrink-0`}>
                {displayCode}
            </div>
        </div>
    );
};

export default GridWorkerCard;

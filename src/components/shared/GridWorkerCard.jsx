import React from 'react';
import { SHIFT_TYPES, SHIFT_COLORS } from '../../config/constants';
import { getWorkerDisplayName } from '../../utils/helpers';
import { getShiftStyle } from '../../utils/styleEngine';

const GridWorkerCard = ({ worker, shift, onClick, settings }) => {
    const type = SHIFT_TYPES[shift.type || 'off'];
    const firstName = getWorkerDisplayName(worker);

    // --- Visual System Integration ---
    let displayCode = SHIFT_TYPES[shift.type || 'off'].code;
    // Default color data
    let colorData = { bg: 'bg-gray-100', text: 'text-gray-500', hex: null };
    let resolvedHex = null; // For card border

    // 1. Check Custom Shift
    if (shift.type === 'custom') {
        displayCode = shift.code; // Default to stored code
        let customColorObj = null;
        let customHex = null;

        // A. Try Settings (Dynamic Lookup)
        if (settings?.customShifts) {
            const def = settings.customShifts.find(cs =>
                (shift.customShiftId && cs.id === shift.customShiftId) ||
                (shift.code && cs.code === shift.code)
            );

            if (def) {
                // SYNC DATA: Use fresh code from settings
                if (def.code) displayCode = def.code;

                if (def.color) customColorObj = SHIFT_COLORS.find(c => c.id === def.color);
                if (!customColorObj && def.colorHex) customHex = def.colorHex;
            }
        }

        // B. Fallback to Stored
        if (!customColorObj && !customHex && shift.customShiftColor) {
            customColorObj = SHIFT_COLORS.find(c => c.id === shift.customShiftColor);
            if (!customColorObj && shift.customShiftColor.startsWith('#')) customHex = shift.customShiftColor;
        }

        // Populate Color Data for Engine
        if (customColorObj) {
            colorData = { bg: customColorObj.bg, text: customColorObj.text, hex: customColorObj.hex };
            resolvedHex = customColorObj.hex;
        } else if (customHex) {
            colorData = { hex: customHex };
            resolvedHex = customHex;
        } else {
            const typeDef = SHIFT_TYPES['custom'];
            // Manual fallback or default emerald
            const fallbackBg = typeDef?.style ? typeDef.style.split(' ')[0] : 'bg-emerald-100';
            const fallbackText = typeDef?.style ? typeDef.style.split(' ')[1] : 'text-emerald-800';
            colorData = { bg: fallbackBg, text: fallbackText };
        }
    }
    // 2. Standard Types
    else if (SHIFT_TYPES[shift.type]) {
        const typeDef = SHIFT_TYPES[shift.type];
        // Parse the style string roughly to extract bg/text if possible
        const parts = typeDef.style.split(' ');
        const bg = parts.find(p => p.startsWith('bg-')) || 'bg-gray-100';
        const text = parts.find(p => p.startsWith('text-')) || 'text-gray-800';
        colorData = { bg, text };
    }
    // 3. Custom Statuses (Absence/Other) via ID
    else {
        const statusDef = settings?.customStatuses?.find(st => st.id === shift.type);
        if (statusDef) {
            if (statusDef.color) { // Hex
                colorData = { hex: statusDef.color };
                resolvedHex = statusDef.color;
            } else {
                colorData = { bg: 'bg-gray-100', text: 'text-gray-800' };
            }
        }
    }

    // Engine resolves final class and style based on Global Settings (Solid/Soft/Outline)
    const { className, style } = getShiftStyle(colorData, settings);

    // Card border color: If custom shift/status has specific color, use it. Otherwise worker color.
    const cardBorderColor = resolvedHex || worker.color;

    return (
        <div
            onClick={onClick}
            className="flex flex-col items-center justify-between p-2 rounded-xl glass-panel cursor-pointer transition-all aspect-square hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]"
            style={{ borderBottomWidth: '3px', borderBottomColor: cardBorderColor }}
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
            {/* Unified Shift Tag */}
            <div className={`${className} text-[8px] flex-shrink-0 w-full text-center`} style={style}>
                {displayCode}
            </div>
        </div>
    );
};

export default GridWorkerCard;

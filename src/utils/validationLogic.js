
import { toLocalISOString } from './helpers';

// Restricted statuses that shouldn't be overwritten without confirmation
const RESTRICTED_STATUSES = ['vacation', 'sick', 'permit'];

export const detectConflict = (workerId, dateStr, proposedShiftType, currentShifts, settings) => {
    // 1. Check for Overwriting Restricted Status
    const currentShift = currentShifts[`${workerId}_${dateStr}`];

    // If the proposed shift is "off" or "unassigned", usually it's fine to clear restricted status, 
    // BUT user said "programar a alguien de vacaciones", implying *assigning work*.
    // So if proposed is NOT removing/resting, and current IS restricted...
    const isProposedWork = proposedShiftType !== 'off' && proposedShiftType !== 'unassigned';

    if (currentShift && isProposedWork) {
        // Check hardcoded restricted types
        if (RESTRICTED_STATUSES.includes(currentShift.type)) {
            // Map IDs to readable names if possible
            const statusName = settings.customStatuses.find(s => s.id === currentShift.type)?.name || currentShift.type;
            return {
                conflict: true,
                type: 'critical',
                title: 'Conflicto de Estado',
                message: `Este trabajador actualmente está en "${statusName}". Asignar un turno sobrescribirá este estado.`
            };
        }

        // Check custom statuses that might be impactful (optional, based on settings?)
        // For now, let's stick to the ones that are clearly "absences" in the default setup.
        // If the user added custom statuses that are "paid absences", they might want protection too.
        const customStatusDef = settings.customStatuses.find(s => s.id === currentShift.type);
        if (customStatusDef && ['sick', 'vacation', 'license', 'permit'].some(k => customStatusDef.id.toLowerCase().includes(k))) {
            return {
                conflict: true,
                type: 'critical',
                title: 'Conflicto de Ausencia',
                message: `El trabajador tiene "${customStatusDef.name}". ¿Deseas reemplazarlo por un turno de trabajo?`
            };
        }
    }

    // 2. Fatigue Check (Consecutive Days)
    // Only check if we are assigning a work shift
    if (isProposedWork) {
        let consecutiveDays = 0;
        const targetDate = new Date(dateStr + 'T12:00:00');

        // Scan backwards 6 days
        for (let i = 1; i <= 6; i++) {
            const d = new Date(targetDate);
            d.setDate(d.getDate() - i);
            const dStr = toLocalISOString(d);
            const s = currentShifts[`${workerId}_${dStr}`];

            // If it's a working shift, increment. If it's OFF/Unassigned/Absence, break.
            // Assuming 'off', 'unassigned', 'vacation', 'sick', 'permit' are breaks.
            // Custom shifts, morning, afternoon, night, or custom statuses that are NOT breaks count as work?
            // Simplified: If type is NOT in ['off', 'unassigned', 'vacation', 'sick', 'permit'], it is work.
            const isWork = s && !['off', 'unassigned', 'vacation', 'sick', 'permit'].includes(s.type);

            if (isWork) consecutiveDays++;
            else break;
        }

        if (consecutiveDays >= 6) {
            return {
                conflict: true,
                type: 'warning',
                title: 'Fatiga Laboral',
                message: `Este trabajador lleva ${consecutiveDays} días consecutivos trabajando. Asignar otro turno excede el límite recomendado de 6 días.`
            };
        }
    }

    return null;
};

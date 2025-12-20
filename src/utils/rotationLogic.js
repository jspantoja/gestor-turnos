import { toLocalISOString } from './helpers';

/**
 * Generates a simple fixed rotation: same shift every working day, with a fixed rest day.
 * 
 * @param {string|number} workerId - The ID of the worker.
 * @param {string} startDateStr - Start date in 'YYYY-MM-DD' format.
 * @param {number} durationMonths - Duration of the projection in months.
 * @param {Object} shiftConfig - The shift configuration object (type, start, end, code, etc.)
 * @param {number} restDay - Day of the week for rest (0=Sunday, 1=Monday... 6=Saturday).
 * @returns {Object} An object containing the new shifts updates keyed by composite ID.
 */
export const generateFixedRotation = (workerId, startDateStr, durationMonths, shiftConfig, restDay) => {
    const updates = {};
    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const iterator = new Date(startDate);

    while (iterator <= endDate) {
        const dayOfWeek = iterator.getDay();
        const dateKey = toLocalISOString(iterator);
        const key = `${workerId}_${dateKey}`;

        if (dayOfWeek === restDay) {
            updates[key] = { type: 'off' };
        } else {
            updates[key] = { ...shiftConfig };
        }

        iterator.setDate(iterator.getDate() + 1);
    }

    return updates;
};

/**
 * Generates a cyclic rotation: different shift each week, cycling through a sequence.
 * 
 * @param {string|number} workerId - The ID of the worker.
 * @param {string} startDateStr - Start date in 'YYYY-MM-DD' format.
 * @param {number} durationMonths - Duration of the projection in months.
 * @param {Array} cycleShifts - Array of shift configurations to cycle through weekly.
 * @param {number} restDay - Day of the week for rest (0=Sunday... 6=Saturday). Use -1 for no fixed rest.
 * @returns {Object} An object containing the new shifts updates keyed by composite ID.
 */
export const generateCyclicRotation = (workerId, startDateStr, durationMonths, cycleShifts, restDay) => {
    if (!cycleShifts || cycleShifts.length === 0) return {};

    const updates = {};
    const startDate = new Date(startDateStr + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    // Find the Monday of the week containing the startDate (for week alignment)
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    const cycleStartMonday = new Date(startDate);
    cycleStartMonday.setDate(diff);
    cycleStartMonday.setHours(0, 0, 0, 0);

    const iterator = new Date(startDate);

    while (iterator <= endDate) {
        const dayOfWeek = iterator.getDay();
        const dateKey = toLocalISOString(iterator);
        const key = `${workerId}_${dateKey}`;

        // Calculate which week of the cycle we're in
        const timeDiff = iterator.getTime() - cycleStartMonday.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        const weekIndex = Math.floor(daysDiff / 7);
        const cycleIndex = weekIndex % cycleShifts.length;

        const shiftConfig = cycleShifts[cycleIndex];

        if (restDay >= 0 && dayOfWeek === restDay) {
            updates[key] = { type: 'off' };
        } else if (shiftConfig) {
            updates[key] = { ...shiftConfig };
        }

        iterator.setDate(iterator.getDate() + 1);
    }

    return updates;
};

/**
 * Clears all shifts for a worker within a date range.
 */
export const clearPeriod = (workerId, startDateStr, endDateStr) => {
    const updates = {};
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    const iterator = new Date(start);

    while (iterator <= end) {
        const dateKey = toLocalISOString(iterator);
        updates[`${workerId}_${dateKey}`] = { type: 'unassigned' };
        iterator.setDate(iterator.getDate() + 1);
    }
    return updates;
};

/**
 * Generates a preview of the rotation for display purposes.
 * Returns an array of { date, shift } objects for the next N weeks.
 */
export const generateRotationPreview = (startDateStr, durationWeeks, shiftConfig, restDay, isFixedMode = true, cycleShifts = []) => {
    const preview = [];
    const startDate = new Date(startDateStr + 'T00:00:00');

    // Find Monday of start week
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    const cycleStartMonday = new Date(startDate);
    cycleStartMonday.setDate(diff);
    cycleStartMonday.setHours(0, 0, 0, 0);

    const totalDays = durationWeeks * 7;
    const iterator = new Date(startDate);

    for (let i = 0; i < totalDays; i++) {
        const dayOfWeek = iterator.getDay();
        const dateKey = toLocalISOString(iterator);

        let shift;

        if (isFixedMode) {
            shift = (dayOfWeek === restDay) ? { type: 'off' } : shiftConfig;
        } else {
            // Cyclic mode
            const timeDiff = iterator.getTime() - cycleStartMonday.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
            const weekIndex = Math.floor(daysDiff / 7);
            const cycleIndex = weekIndex % (cycleShifts.length || 1);

            if (restDay >= 0 && dayOfWeek === restDay) {
                shift = { type: 'off' };
            } else {
                shift = cycleShifts[cycleIndex] || shiftConfig;
            }
        }

        preview.push({
            date: new Date(iterator),
            dateStr: dateKey,
            dayOfWeek,
            shift
        });

        iterator.setDate(iterator.getDate() + 1);
    }

    return preview;
};

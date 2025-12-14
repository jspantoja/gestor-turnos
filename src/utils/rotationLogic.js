import { toLocalISOString } from './helpers';

/**
 * Calculates shift updates for a rotation sequence.
 * 
 * @param {string|number} workerId - The ID of the worker.
 * @param {string} startDateStr - Start date in 'YYYY-MM-DD' format.
 * @param {number} durationMonths - Duration of the projection in months.
 * @param {Array} rotationSequence - Array of steps, e.g., [{ shiftType: 'morning', ... }, { shiftType: 'afternoon', ... }]
 * @param {Array} daysToApply - Array of day indices to apply (0=Sunday, 1=Monday... 6=Saturday).
 * @param {Object} currentShifts - The current shifts object (optional, for merging/checking).
 * @returns {Object} An object containing the new shifts updates keyed by composite ID.
 */
export const calculateRotation = (workerId, startDateStr, durationMonths, rotationSequence, daysToApply) => {
    if (!rotationSequence || rotationSequence.length === 0) return {};

    const updates = {};
    const startDate = new Date(startDateStr + 'T00:00:00');
    // Calculate end date based on duration
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    // Normalize start date to the beginning of the week (Monday) to align rotation cycles correctly?
    // User Requirement: "Week 1: Morning, Week 2: Afternoon". 
    // Usually this means calendar weeks. Check implementation plan: "Assume rotation changes every Monday".

    // Find the Monday of the week containing the startDate
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const rotationStartMonday = new Date(startDate);
    rotationStartMonday.setDate(diff);
    rotationStartMonday.setHours(0, 0, 0, 0);

    const iterator = new Date(startDate);

    while (iterator <= endDate) {
        // 1. Check if current day of week is in daysToApply
        const dayOfWeek = iterator.getDay(); // 0-6
        if (daysToApply.includes(dayOfWeek)) {

            // 2. Determine which week of the cycle we are in
            // Calculate difference in weeks from the rotation "anchor" (rotationStartMonday)
            const timeDiff = iterator.getTime() - rotationStartMonday.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
            const weekIndex = Math.floor(daysDiff / 7);

            // 3. Map week index to rotation sequence index
            // Cycle through the sequence length
            const sequenceIndex = weekIndex % rotationSequence.length;

            // Get the week template for this index
            const weekTemplate = rotationSequence[sequenceIndex];

            if (weekTemplate && weekTemplate.days) {
                // Get the specific shift for this day of the week (0-6)
                // Adjusting for the fact that Sunday is 0 in JS Date but might be handled differently in UI
                // Standard JS: 0=Sun, 1=Mon... 6=Sat
                const dayConfig = weekTemplate.days[dayOfWeek];

                if (dayConfig) {
                    // If type is 'off' or undefined, we might still want to explicitly set it to 'unassigned' 
                    // if we are "overwriting" existing shifts. 
                    // But usually 'off' implies we want to clear it or set it to Rest.
                    // The UI usually creates { type: 'morning' }, { type: 'off' } etc.

                    const dateKey = toLocalISOString(iterator);

                    if (dayConfig.type === 'off' || dayConfig.type === 'unassigned') {
                        // User explicitly wanted this day OFF/CLEARED in the rotation
                        updates[`${workerId}_${dateKey}`] = { type: 'unassigned' };
                    } else {
                        updates[`${workerId}_${dateKey}`] = {
                            ...dayConfig
                        };
                    }
                }
            }
        }

        // Next day
        iterator.setDate(iterator.getDate() + 1);
    }

    return updates;
};

/**
 * Generates an object of "off" shifts (or nulls to delete) for a range.
 * Used for the "Clear Period" feature.
 */
export const clearPeriod = (workerId, startDateStr, endDateStr) => {
    const updates = {};
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    const iterator = new Date(start);

    while (iterator <= end) {
        const dateKey = toLocalISOString(iterator);
        // Setting to 'unassigned' effectively clears it in this app's logic, 
        // or we could set it to null if the app supports hard deletion.
        // Based on app logic, creating an 'unassigned' or 'off' (if meant to be rest) is common.
        // But usually "Clear" means "Removing the assigned shift".
        // In the context of `useDataSync` logic:
        updates[`${workerId}_${dateKey}`] = { type: 'unassigned' };

        iterator.setDate(iterator.getDate() + 1);
    }
    return updates;
};

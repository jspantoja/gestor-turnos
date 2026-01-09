import { toLocalISOString, getShift } from './helpers';

// Helper to calculate overlap between two time ranges
// All times are in minutes from 00:00
const calculateSimpleNightHours = (shiftStartStr, shiftEndStr, nightStartStr, nightEndStr) => {
    if (!shiftStartStr || !shiftEndStr) return 0;

    const toMinutes = (str) => {
        const [h, m] = str.split(':').map(Number);
        return h * 60 + m;
    };

    const nightStart = toMinutes(nightStartStr || '21:00');
    const nightEnd = toMinutes(nightEndStr || '06:00');

    let shiftStart = toMinutes(shiftStartStr);
    let shiftEnd = toMinutes(shiftEndStr);

    // Handle crossing midnight for shift
    if (shiftEnd < shiftStart) shiftEnd += 24 * 60;

    // We need to check overlap against night window.
    // Night window usually crosses midnight (e.g. 21:00 to 06:00 next day)
    // Let's normalize to a 48h timeline to handle overlaps easily

    let nightWindows = [];

    // Window 1: Previous day night end (00:00 to nightEnd)
    if (nightEnd > 0) nightWindows.push({ start: 0, end: nightEnd });

    // Window 2: Today's night start (nightStart to 24:00)
    if (nightStart < 24 * 60) nightWindows.push({ start: nightStart, end: 24 * 60 });

    // Window 3: Next day (24:00 + 00:00 to 24:00 + nightEnd)
    if (nightEnd > 0) nightWindows.push({ start: 24 * 60, end: 24 * 60 + nightEnd });

    let totalOverlap = 0;

    nightWindows.forEach(win => {
        const start = Math.max(shiftStart, win.start);
        const end = Math.min(shiftEnd, win.end);
        if (end > start) {
            totalOverlap += (end - start);
        }
    });

    // Convert back to hours
    return totalOverlap / 60;
};

// Helper to calculate total shift duration in hours
const calculateShiftDuration = (startStr, endStr) => {
    if (!startStr || !endStr) return 0;
    const toMin = (s) => {
        const [h, m] = s.split(':').map(Number);
        return h * 60 + m;
    };
    let s = toMin(startStr);
    let e = toMin(endStr);
    if (e < s) e += 24 * 60;
    return (e - s) / 60;
};

export const calculateWorkerPay = (worker, shifts, daysToShow, holidays, settings, options = {}) => {
    const cfg = settings.payrollConfig || {};
    const hourlyRate = cfg.hourlyRate || 6000;
    const hoursPerWeekday = cfg.hoursPerWeekday || { monday: 7, tuesday: 7.5, wednesday: 7.5, thursday: 7.5, friday: 7.5, saturday: 7, sunday: 7.33 };

    const getHoursForDate = (date) => {
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
        return hoursPerWeekday[dayName] || 8;
    };

    let programmedHours = 0;
    let absenceHours = 0;
    let sundaysCount = 0; // Will become weighted: 1.0 for full day, actualHours/standard if < 7h
    let holidaysCount = 0; // Same as above

    // New metrics
    let totalNightHours = 0;
    let surchargeDaysCount = 0;

    let daysWorkedCount = 0;
    let wDaysForTransport = 0;

    daysToShow.forEach(d => {
        const dateStr = toLocalISOString(d.date);
        const s = getShift(shifts, worker.id, dateStr);
        const isOff = s.type === 'off' || !s.type;
        const isAbsence = ['sick', 'vacation', 'permit'].includes(s.type);
        const isSunday = d.date.getDay() === 0;
        const isHoliday = holidays.has(dateStr);
        const hours = getHoursForDate(d.date);

        if (!isOff) {
            programmedHours += hours;
            if (isAbsence) {
                absenceHours += hours;
            } else {
                daysWorkedCount++;

                // Exclude Surcharges Check (Per Shift)
                // Determine actual hours worked in this shift to check for the "7h rule"
                let sStart = s.start;
                let sEnd = s.end;

                // Fallback for standard types if no specific time set
                if (!sStart || !sEnd) {
                    if (s.type === 'morning') { sStart = '06:00'; sEnd = '14:00'; }
                    else if (s.type === 'afternoon') { sStart = '14:00'; sEnd = '22:00'; }
                    else if (s.type === 'night') { sStart = '22:00'; sEnd = '06:00'; }
                }

                const actualShiftHours = calculateShiftDuration(sStart, sEnd);
                const standardDayHours = hours; // The value from hoursPerWeekday for this day

                // Exclude Surcharges Check (Per Shift)
                const isExcluded = s.excludeSurcharges === true;

                if (!isExcluded) {
                    // Logic: If worked < 7 hours, pay exactly those hours of surcharge.
                    // If worked >= 7 hours, pay the "Full Day" standard value (e.g. 7.33).
                    // We achieve this by weighting the count: 
                    // weightedCount = worked < 7 ? (actualHours / standardForThisDay) : 1.0

                    if (isSunday || isHoliday) {
                        const weight = actualShiftHours < 7 ? (actualShiftHours / standardDayHours) : 1.0;

                        if (isSunday) {
                            sundaysCount += weight;
                        } else {
                            holidaysCount += weight;
                        }
                    }
                }

                // Calculate Night Hours for this specific shift
                // Use already calculated sStart/sEnd

                if (sStart && sEnd && !isExcluded) {
                    const nHours = calculateSimpleNightHours(sStart, sEnd, cfg.nightSurchargeStart, cfg.nightSurchargeEnd);
                    if (nHours > 0) {
                        totalNightHours += nHours;
                        surchargeDaysCount++;
                    }
                }
            }
        }

        // Transport: Count days worked (excluding absences)
        if (s.type && s.type !== 'off' && !['sick', 'vacation', 'permit'].includes(s.type)) {
            wDaysForTransport++;
        }
    });

    const realHours = programmedHours - absenceHours;

    // Cost Calculations
    const baseSalary = Math.round(realHours * hourlyRate);

    // Surcharges
    const avgSundayHours = hoursPerWeekday.sunday;
    const sundayCost = Math.round(sundaysCount * avgSundayHours * hourlyRate * ((cfg.sundaySurcharge || 75) / 100));

    // Holiday
    const avgDailyHours = 7.5; // From original logic
    const holidayCost = Math.round(holidaysCount * avgDailyHours * hourlyRate * ((cfg.holidaySurcharge || 75) / 100));

    const nightCost = Math.round(totalNightHours * hourlyRate * ((cfg.nightSurcharge || 35) / 100));
    const totalSurcharges = sundayCost + holidayCost + nightCost;

    // Transport Allowance
    let transportAllowance = 0;
    if (cfg.includeTransportAllowance) {
        const halfAllowance = (cfg.transportAllowance || 200000) / 2;
        // Cap at 15 days
        const proportion = Math.min(wDaysForTransport, 15) / 15;
        transportAllowance = Math.round(halfAllowance * proportion);
    }

    return {
        id: worker.id,
        name: worker.name,
        sede: worker.sede,
        role: worker.role,
        programmedHours,
        absenceHours,
        realHours,
        stats: {
            sundays: sundaysCount,
            holidays: holidaysCount,
            nightHours: totalNightHours,
            surchargeDays: surchargeDaysCount
        },
        costs: {
            baseSalary,
            sundayCost,
            holidayCost,
            nightCost,
            totalSurcharges,
            transportAllowance,
            total: baseSalary + totalSurcharges + transportAllowance
        }
    };
};

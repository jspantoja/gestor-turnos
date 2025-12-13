import { toLocalISOString, getShift } from './helpers';

export const calculateWorkerPay = (worker, shifts, daysToShow, holidays, settings) => {
    const cfg = settings.payrollConfig || {};
    const hourlyRate = cfg.hourlyRate || 6000;
    const hoursPerWeekday = cfg.hoursPerWeekday || { monday: 7, tuesday: 7.5, wednesday: 7.5, thursday: 7.5, friday: 7.5, saturday: 7, sunday: 7.33 };

    const getHoursForDate = (date) => {
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
        return hoursPerWeekday[dayName] || 8;
    };

    let programmedHours = 0;
    let absenceHours = 0;
    let sundaysCount = 0;
    let holidaysCount = 0;
    let nightShiftsCount = 0;
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
                if (isSunday) sundaysCount++;
                if (isHoliday && !isSunday) holidaysCount++;
                if (s.type === 'night') nightShiftsCount++;
            }
        }

        // Transport: Count days worked (excluding absences)
        if (s.type && s.type !== 'off' && !['sick', 'vacation', 'permit'].includes(s.type)) {
            wDaysForTransport++;
        }
    });

    const realHours = programmedHours - absenceHours;
    const nightHours = nightShiftsCount * (cfg.nightShiftHours || 6);

    // Cost Calculations
    const baseSalary = Math.round(realHours * hourlyRate);

    // Surcharges
    const avgSundayHours = hoursPerWeekday.sunday;
    const sundayCost = Math.round(sundaysCount * avgSundayHours * hourlyRate * ((cfg.sundaySurcharge || 75) / 100));

    // Holiday
    const avgDailyHours = 7.5; // From original logic
    const holidayCost = Math.round(holidaysCount * avgDailyHours * hourlyRate * ((cfg.holidaySurcharge || 75) / 100));

    const nightCost = Math.round(nightHours * hourlyRate * ((cfg.nightSurcharge || 35) / 100));
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
            nightHours: nightHours
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

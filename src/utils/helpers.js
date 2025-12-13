export const toLocalISOString = (date) => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
};

export const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

export const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};



export const getQuincenaLabel = (date) => {
    const day = date.getDate();
    return day <= 15 ? '1ª Quincena' : '2ª Quincena';
};

export const getShift = (shifts, workerId, dateStr) => {
    const key = `${workerId}_${dateStr}`;
    return shifts[key] || { type: 'unassigned' };
};

export const getWorkerDisplayName = (worker, full = false) => {
    if (!worker || !worker.name) return 'Sin Nombre';
    if (full) return worker.name;
    // Return preferred display name if set, otherwise first word of name
    return worker.displayName || worker.name.split(' ')[0];
};

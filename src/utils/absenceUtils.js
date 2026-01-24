import { SHIFT_TYPES } from '../config/constants';

/**
 * Determina si un tipo de turno es una ausencia (no genera horas trabajadas).
 * Considera tanto los tipos por defecto como los customStatuses definidos por el usuario.
 * 
 * @param {string} shiftType - El tipo de turno (ej: 'sick', 'vacation', 'custom_1234')
 * @param {Array} customStatuses - Array de estados de ausencia personalizados desde settings
 * @returns {boolean}
 */
export const isAbsenceType = (shiftType, customStatuses = []) => {
    // IDs de ausencia por defecto (los que vienen predefinidos en la app)
    const defaultAbsenceIds = ['sick', 'vacation', 'permit', 'off'];

    if (defaultAbsenceIds.includes(shiftType)) return true;

    // Verificar si existe en customStatuses (cualquier customStatus es considerado ausencia)
    const customStatus = customStatuses.find(s => s.id === shiftType);
    return !!customStatus;
};

/**
 * Determina si un turno es una ausencia PAGADA (para cálculos de nómina).
 * 
 * @param {string} shiftType - El tipo de turno
 * @param {Array} customStatuses - Array de estados personalizados
 * @returns {boolean}
 */
export const isPaidAbsence = (shiftType, customStatuses = []) => {
    // Ausencias pagadas por defecto
    const defaultPaidAbsences = ['sick', 'vacation'];

    if (defaultPaidAbsences.includes(shiftType)) return true;

    // Verificar en customStatuses si tiene payrollBehavior === 'paid'
    const customStatus = customStatuses.find(s => s.id === shiftType);
    return customStatus?.payrollBehavior === 'paid';
};

/**
 * Resuelve la definición de un tipo de turno, buscando primero en SHIFT_TYPES
 * y luego en customStatuses. Retorna un fallback seguro si no se encuentra.
 * 
 * @param {string} shiftType - El tipo de turno
 * @param {Array} customStatuses - Array de estados personalizados
 * @returns {Object} - Objeto con {label, code, style, ...}
 */
export const resolveShiftType = (shiftType, customStatuses = []) => {
    // Primero buscar en SHIFT_TYPES predeterminados
    if (SHIFT_TYPES[shiftType]) return SHIFT_TYPES[shiftType];

    // Luego en customStatuses
    const customStatus = customStatuses.find(s => s.id === shiftType);
    if (customStatus) {
        return {
            label: customStatus.name,
            code: customStatus.code,
            style: `bg-[${customStatus.color}]/10 text-[${customStatus.color}] border-[${customStatus.color}]/20`,
            isCustomStatus: true
        };
    }

    // Fallback seguro a 'off'
    return SHIFT_TYPES['off'];
};

import { z } from 'zod';

// --- Worker Schema ---
export const workerSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(50, "El nombre es muy largo"),
    role: z.enum(['Vendedor', 'Supernumerario', 'Administrador'], {
        errorMap: () => ({ message: "Rol inválido" })
    }),
    contractType: z.enum(['Full-time', 'Part-time'], {
        errorMap: () => ({ message: "Tipo de contrato inválido" })
    }).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").optional(),
    sede: z.string().min(1, "La sede es requerida").optional(),
});

// --- Shift Schema ---
export const shiftSchema = z.object({
    workerId: z.number({ required_error: "Trabajador requerido" }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    type: z.string().min(1, "Tipo de turno requerido"),
    sede: z.string().optional(),
});

// --- Settings Schema ---
export const settingsSchema = z.object({
    accentColor: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Color inválido"),
    glassIntensity: z.number().min(0).max(100),
    pin: z.string().length(4, "El PIN debe tener 4 dígitos").regex(/^\d+$/, "El PIN solo puede contener números").optional(),
    payrollConfig: z.object({
        hourlyRate: z.number().min(0, "La tarifa no puede ser negativa"),
        transportAllowance: z.number().min(0).optional(),
        sundaySurcharge: z.number().min(0).max(200),
        holidaySurcharge: z.number().min(0).max(200),
        nightSurcharge: z.number().min(0).max(100),
    }).optional(),
});

export const validate = (schema, data) => {
    try {
        schema.parse(data);
        return { success: true, errors: null };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const formattedErrors = {};
            error.errors.forEach((err) => {
                const path = err.path.join('.');
                formattedErrors[path] = err.message;
            });
            return { success: false, errors: formattedErrors };
        }
        return { success: false, errors: { _global: "Error de validación desconocido" } };
    }
};

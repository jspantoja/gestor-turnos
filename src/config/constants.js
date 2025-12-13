import { Sun, Moon, Coffee, AlertCircle, FileText, Minus, Sunrise, Sunset, Clock, Star, Zap, CloudSun, CloudMoon, Timer, Watch, CalendarCheck } from 'lucide-react';

// Tipos de turnos - VERSIÓN VIBRANTE (Alta Visibilidad)
export const SHIFT_TYPES = {
    morning: { label: 'Mañana', code: 'M', style: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500 dark:text-white dark:border-blue-600', icon: Sun },
    afternoon: { label: 'Tarde', code: 'T', style: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500 dark:text-white dark:border-orange-600', icon: Sun },
    night: { label: 'Noche', code: 'N', style: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-600 dark:text-white dark:border-indigo-700', icon: Moon },
    off: { label: 'Descanso', code: 'D', style: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-600 dark:text-white dark:border-slate-700', icon: Coffee },
    sick: { label: 'Incapacidad', code: 'I', style: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-600 dark:text-white dark:border-rose-700', icon: AlertCircle },
    permit: { label: 'Permiso', code: 'P', style: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-600 dark:text-white dark:border-purple-700', icon: FileText },
    vacation: { label: 'Vacaciones', code: 'V', style: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-600 dark:text-white dark:border-sky-700', icon: Sun },
    unassigned: { label: 'Sin Programar', code: '-', style: 'bg-transparent text-gray-400 border-gray-200 dark:text-gray-600 dark:border-gray-800', icon: Minus },
    custom: { label: 'Personalizado', code: 'C', style: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-600 dark:text-white dark:border-emerald-700', icon: Star },
};

// Icons available for custom shifts
export const SHIFT_ICONS = [
    // Mañana / Día
    { id: 'sun', name: 'Sol', component: Sun },
    { id: 'sunrise', name: 'Amanecer', component: Sunrise },
    { id: 'cloudsun', name: 'Sol y Nubes', component: CloudSun },
    // Tarde
    { id: 'sunset', name: 'Atardecer', component: Sunset },
    { id: 'clock', name: 'Reloj', component: Clock },
    { id: 'watch', name: 'Reloj Pulsera', component: Watch },
    // Noche
    { id: 'moon', name: 'Luna', component: Moon },
    { id: 'cloudmoon', name: 'Luna y Nubes', component: CloudMoon },
    { id: 'star', name: 'Estrella', component: Star },
    // General
    { id: 'zap', name: 'Rayo', component: Zap },
    { id: 'timer', name: 'Temporizador', component: Timer },
    { id: 'coffee', name: 'Café', component: Coffee },
    { id: 'calendar', name: 'Calendario', component: CalendarCheck },
];

// Colors for custom shifts (auto-assigned)
export const SHIFT_COLORS = [
    { id: 'blue', name: 'Azul', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', hex: '#3B82F6' },
    { id: 'orange', name: 'Naranja', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', hex: '#F97316' },
    { id: 'emerald', name: 'Esmeralda', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', hex: '#10B981' },
    { id: 'violet', name: 'Violeta', bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200', hex: '#8B5CF6' },
    { id: 'rose', name: 'Rosa', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', hex: '#F43F5E' },
    { id: 'amber', name: 'Ámbar', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', hex: '#F59E0B' },
    { id: 'cyan', name: 'Cian', bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', hex: '#06B6D4' },
    { id: 'lime', name: 'Lima', bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-200', hex: '#84CC16' },
    { id: 'fuchsia', name: 'Fucsia', bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-200', hex: '#D946EF' },
    { id: 'teal', name: 'Turquesa', bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', hex: '#14B8A6' },
];

// ... resto del archivo igual ...
export const EMPLOYEE_COLORS = ['#8E8E93', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#A2845E'];
// ...
export const ACCENT_COLORS = [
    { name: 'Clásico', value: '#000000' },
    { name: 'Azul', value: '#007AFF' },
    { name: 'Violeta', value: '#5856D6' },
    { name: 'Menta', value: '#00C7BE' },
    { name: 'Naranja', value: '#FF9500' },
    { name: 'Rosa', value: '#FF2D55' },
    { name: 'Verde', value: '#34C759' }
];

export const BACKGROUND_COLORS = [
    { name: 'Predeterminado', value: '#f5f5f7' },
    { name: 'Lavanda', value: '#E6E6FA' },
    { name: 'Menta', value: '#E0F2F1' },
    { name: 'Durazno', value: '#FFE5D9' },
    { name: 'Rosa', value: '#FFE4E1' },
    { name: 'Cielo', value: '#E3F2FD' },
    { name: 'Limón', value: '#FFFACD' },
    { name: 'Coral', value: '#FFE7E0' }
];
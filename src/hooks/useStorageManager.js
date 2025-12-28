/**
 * useStorageManager Hook - Simplified
 * Gestiona dos modos de almacenamiento simples:
 * - 'firebase': Sincronización con Firebase (principal)
 * - 'local': Solo almacenamiento local
 * 
 * + Sistema de backup manual mejorado con recordatorios
 */
import { useState, useEffect, useCallback } from 'react';

// Solo dos modos: Firebase y Local
export const STORAGE_MODES = {
    FIREBASE: 'firebase',
    LOCAL: 'local'
};

export const STORAGE_MODE_INFO = {
    [STORAGE_MODES.FIREBASE]: {
        id: 'firebase',
        name: 'Nube (Firebase)',
        icon: '🔥',
        description: 'Sincronización automática en tiempo real',
        color: 'blue'
    },
    [STORAGE_MODES.LOCAL]: {
        id: 'local',
        name: 'Solo Local',
        icon: '💾',
        description: 'Solo en este dispositivo. Haz backup regularmente.',
        color: 'amber'
    }
};

// Intervalo de recordatorio de backup (7 días en ms)
const BACKUP_REMINDER_INTERVAL = 7 * 24 * 60 * 60 * 1000;

export const useStorageManager = () => {
    const [lastBackupDate, setLastBackupDate] = useState(() => {
        const saved = localStorage.getItem('app_last_backup');
        return saved ? new Date(saved) : null;
    });

    const [showBackupReminder, setShowBackupReminder] = useState(false);

    // Verificar si necesita recordatorio de backup
    useEffect(() => {
        const now = Date.now();
        const lastBackup = lastBackupDate ? lastBackupDate.getTime() : 0;

        if (now - lastBackup > BACKUP_REMINDER_INTERVAL) {
            setShowBackupReminder(true);
        }
    }, [lastBackupDate]);

    // Registrar backup realizado
    const recordBackup = useCallback(() => {
        const now = new Date();
        setLastBackupDate(now);
        localStorage.setItem('app_last_backup', now.toISOString());
        setShowBackupReminder(false);
    }, []);

    // Descartar recordatorio de backup
    const dismissBackupReminder = useCallback(() => {
        setShowBackupReminder(false);
    }, []);

    // Días desde último backup
    const daysSinceLastBackup = lastBackupDate
        ? Math.floor((Date.now() - lastBackupDate.getTime()) / (24 * 60 * 60 * 1000))
        : null;

    return {
        // Estado
        lastBackupDate,
        daysSinceLastBackup,
        showBackupReminder,
        allModes: STORAGE_MODE_INFO,

        // Constantes
        STORAGE_MODES,

        // Acciones
        recordBackup,
        dismissBackupReminder
    };
};

export default useStorageManager;

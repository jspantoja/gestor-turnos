import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { SHIFT_COLORS } from '../config/constants';

export const useDataSync = ({ user, auth, db, appId, firebaseReady }) => {
    // --- Estados de Datos ---
    const [settings, setSettings] = useState({
        sedes: [{ name: 'Homecenter', places: ['Tienda', 'Patio Constructor', 'Funcionarios'] }, { name: 'Falabella', places: ['Piso 1', 'Bodega', 'Cajas'] }],
        accentColor: '#000000', autoReliever: true, glassIntensity: 70, modalGlassIntensity: 70, reducedMotion: false,
        reportConfig: { showHeader: true, showDays: true, showLocation: true, showReliever: false, showShiftSummary: true },
        payrollConfig: {
            hourlyRate: 6000, sundaySurcharge: 75, holidaySurcharge: 75, nightSurcharge: 35, nightShiftHours: 6,
            includeTransportAllowance: true, transportAllowance: 200000,
            hoursPerWeekday: { monday: 7, tuesday: 7.5, wednesday: 7.5, thursday: 7.5, friday: 7.5, saturday: 7, sunday: 7.33 },
            customMessage: "JUAN SEBASTIAN PANTOJA 50.000 DE COORDINACION"
        },
        cloudMode: true,
        lastSync: null,
        // Estados de ausencia personalizables
        customStatuses: [
            { id: 'off', code: 'D', matrixCode: '-1', name: 'Descanso', color: '#64748b', payrollBehavior: 'unpaid', isDefault: true },
            { id: 'sick', code: 'I', matrixCode: '-2', name: 'Incapacidad', color: '#f43f5e', payrollBehavior: 'paid', isDefault: true },
            { id: 'permit', code: 'P', matrixCode: '-3', name: 'Permiso', color: '#8b5cf6', payrollBehavior: 'unpaid', isDefault: true },
            { id: 'vacation', code: 'V', matrixCode: '-4', name: 'Vacaciones', color: '#0ea5e9', payrollBehavior: 'paid', isDefault: true }
        ],
        messageTemplate: "Descansos: {{titulo}}\n\n{{lista_descansos}}\n\n{{checklist}}"
    });


    const [holidays, setHolidays] = useState(new Set());
    const [workers, setWorkers] = useState([]);
    const [shifts, setShifts] = useState({});
    const [weeklyNotes, setWeeklyNotes] = useState({});
    const [weeklyChecklists, setWeeklyChecklists] = useState({});
    const [payrollSnapshots, setPayrollSnapshots] = useState({});
    const [payrollExclusions, setPayrollExclusions] = useState({}); // NUEVO: Exclusiones de recargos
    const [calendarEvents, setCalendarEvents] = useState({}); // NUEVO: Eventos calendario


    const [isSynced, setIsSynced] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const isRemoteUpdate = useRef(false);
    const hasCloudSynced = useRef(false);
    const [hasInitialLoad, setHasInitialLoad] = useState(false);

    // --- EFECTO PRINCIPAL: Cargar Datos y Sincronizar ---
    useEffect(() => {
        if (!firebaseReady || !auth || !user || !appId) {
            setIsLoading(false);
            return;
        }

        const prefix = `app_${appId}_`;

        const loadLocalData = () => {
            try {
                const savedWorkers = localStorage.getItem(`${prefix}workers`);
                const savedShifts = localStorage.getItem(`${prefix}shifts`);
                const savedSettings = localStorage.getItem(`${prefix}settings`);
                const savedHolidays = localStorage.getItem(`${prefix}holidays`);
                const savedNotes = localStorage.getItem(`${prefix}weeklyNotes`);
                const savedChecklists = localStorage.getItem(`${prefix}weeklyChecklists`);
                const savedSnapshots = localStorage.getItem(`${prefix}payrollSnapshots`);
                const savedExclusions = localStorage.getItem(`${prefix}payrollExclusions`);
                const savedEvents = localStorage.getItem(`${prefix}calendarEvents`);


                if (savedWorkers) setWorkers(JSON.parse(savedWorkers));
                else setWorkers([]);

                if (savedShifts) setShifts(JSON.parse(savedShifts));
                else setShifts({});

                if (savedSettings) {
                    const parsed = JSON.parse(savedSettings);
                    setSettings(prev => ({ ...prev, ...parsed }));
                }

                if (savedHolidays) setHolidays(new Set(JSON.parse(savedHolidays)));
                if (savedNotes) setWeeklyNotes(JSON.parse(savedNotes));
                if (savedChecklists) setWeeklyChecklists(JSON.parse(savedChecklists));

                if (savedSnapshots) setPayrollSnapshots(JSON.parse(savedSnapshots));
                if (savedEvents) setCalendarEvents(JSON.parse(savedEvents));

                setIsLoading(false);


                setHasInitialLoad(true);
            } catch (e) {
                console.error('Error loading local data:', e);
                setIsLoading(false);
                setHasInitialLoad(true);
            }
        };

        loadLocalData();

        // Si el modo nube está desactivado en la carga inicial, no ponemos listeners
        // Pero necesitamos saber qué dice el LocalStorage sobre cloudMode primero.
        const localSettingsRaw = localStorage.getItem(`${prefix}settings`);
        const localCloudMode = localSettingsRaw ? JSON.parse(localSettingsRaw).cloudMode : true;

        if (localCloudMode === false) {
            setIsSynced(false);
            hasCloudSynced.current = true; // No bloqueamos el guardado local
            return;
        }

        setIsSynced(true);

        const workersRef = doc(db, 'artifacts', appId, 'public', 'data', 'workers_doc', 'main');
        const shiftsRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts_doc', 'main');
        const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings_doc', 'main');
        const miscRef = doc(db, 'artifacts', appId, 'public', 'data', 'misc_doc', 'main');

        const handleRemoteUpdate = (updateFn) => {
            isRemoteUpdate.current = true;
            hasCloudSynced.current = true;
            updateFn();
        };

        const unsubWorkers = onSnapshot(workersRef, (snap) => {
            if (snap.exists()) {
                const newData = snap.data().list || [];
                handleRemoteUpdate(() => setWorkers(newData));
            } else {
                if (!localStorage.getItem(`${prefix}workers`)) {
                    hasCloudSynced.current = true;
                    const defaultWorkers = [{ id: 1, name: 'Ejemplo Empleado', role: 'Cargo', sede: 'Sede Principal', lugar: 'Lugar', color: '#007AFF', avatar: null, isReliever: false, notes: [] }];
                    setWorkers(defaultWorkers);
                }
            }
        });

        const unsubShifts = onSnapshot(shiftsRef, (snap) => {
            if (snap.exists()) {
                handleRemoteUpdate(() => setShifts(snap.data().data || {}));
            }
        });

        const unsubSettings = onSnapshot(settingsRef, (snap) => {
            if (snap.exists()) {
                const newData = snap.data();
                if (Object.keys(newData).length > 0) {
                    handleRemoteUpdate(() => setSettings(prev => ({ ...prev, ...newData })));
                }
            }
        });

        const unsubMisc = onSnapshot(miscRef, (snap) => {
            if (snap.exists()) {
                handleRemoteUpdate(() => {
                    const d = snap.data();
                    if (d.holidays && d.holidays.length > 0) setHolidays(new Set(d.holidays));
                    if (d.weeklyNotes) setWeeklyNotes(d.weeklyNotes);

                    if (d.payrollSnapshots) setPayrollSnapshots(d.payrollSnapshots);
                    if (d.calendarEvents) setCalendarEvents(d.calendarEvents);
                });
            }
        });

        return () => {
            unsubWorkers();
            unsubShifts();
            unsubSettings();
            unsubMisc();
        };
    }, [user, firebaseReady, appId, auth, db]);

    // --- HELPER: Limpiar datos para Firestore (evitar undefined) ---
    const cleanForFirestore = (obj) => {
        if (Array.isArray(obj)) return obj.map(cleanForFirestore);
        if (obj !== null && typeof obj === 'object') {
            return Object.entries(obj).reduce((acc, [key, value]) => {
                if (value !== undefined) acc[key] = cleanForFirestore(value);
                return acc;
            }, {});
        }
        return obj;
    };

    // --- SAVE TO FIRESTORE (Helper) ---
    const saveToCloud = async (collection, data) => {
        if (!auth.currentUser || !appId || !settings.cloudMode) return;
        if (collection === 'workers_doc' && (!data.list || data.list.length === 0)) return;
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', collection, 'main'), data, { merge: true });
            // Actualizar lastSync opcionalmente aquí o tras todas las llamadas
        } catch (e) { console.error("Save error", e); }
    };

    // --- EFECTO DE GUARDADO (Refactorizado) ---
    const useDebouncedSave = (data, saveAction) => {
        useEffect(() => {
            // No guardar si los datos iniciales aún no se han cargado
            if (isLoading || !hasInitialLoad || !appId) return;

            // No guardar si esta actualización vino de la nube (evita bucles)
            if (isRemoteUpdate.current) {
                isRemoteUpdate.current = false;
                return;
            }

            // No guardar si el modo nube está activo pero la sincronización inicial no ha ocurrido
            if (settings.cloudMode && !hasCloudSynced.current) return;

            const saveData = setTimeout(() => {
                saveAction(data);
            }, 1000); // Retraso para agrupar cambios rápidos

            return () => clearTimeout(saveData);
        }, [data, isLoading, hasInitialLoad, appId, settings.cloudMode]); // Depende solo de los datos que guarda y el estado de carga/sincronización
    };

    const prefix = `app_${appId}_`;

    // Guardar Workers
    useDebouncedSave(workers, (data) => {
        localStorage.setItem(`${prefix}workers`, JSON.stringify(data));
        if (settings.cloudMode && data.length > 0) saveToCloud('workers_doc', { list: data });
    });

    // Guardar Shifts
    useDebouncedSave(shifts, (data) => {
        localStorage.setItem(`${prefix}shifts`, JSON.stringify(data));
        if (settings.cloudMode) saveToCloud('shifts_doc', { data });
    });

    // Guardar Settings
    useDebouncedSave(settings, (data) => {
        localStorage.setItem(`${prefix}settings`, JSON.stringify(data));
        if (settings.cloudMode) saveToCloud('settings_doc', data);
    });

    // Guardar datos misceláneos (holidays, notes, etc. en un solo doc)
    const miscData = { holidays: Array.from(holidays), weeklyNotes, weeklyChecklists, payrollSnapshots, payrollExclusions, calendarEvents };

    useDebouncedSave(miscData, (data) => {
        localStorage.setItem(`${prefix}holidays`, JSON.stringify(data.holidays));
        localStorage.setItem(`${prefix}weeklyNotes`, JSON.stringify(data.weeklyNotes));
        localStorage.setItem(`${prefix}weeklyChecklists`, JSON.stringify(data.weeklyChecklists));
        localStorage.setItem(`${prefix}payrollSnapshots`, JSON.stringify(data.payrollSnapshots));
        localStorage.setItem(`${prefix}payrollSnapshots`, JSON.stringify(data.payrollSnapshots));
        localStorage.setItem(`${prefix}payrollExclusions`, JSON.stringify(data.payrollExclusions));
        localStorage.setItem(`${prefix}calendarEvents`, JSON.stringify(data.calendarEvents));
        if (settings.cloudMode) saveToCloud('misc_doc', data);

    });


    // --- HELPERS PARA RESOLUCIÓN DE CONFLICTOS ---

    const forceCloudUpload = async () => {
        if (!appId) {
            console.error("Upload aborted: No appId found.");
            return false;
        }
        try {
            console.log("Starting full cloud upload for appId:", appId);
            const now = new Date().toISOString();
            const updatedSettings = { ...settings, lastSync: now };

            // 1. Limpiar y preparar documentos
            const cleanWorkers = cleanForFirestore({ list: workers });
            const cleanShifts = cleanForFirestore({ data: shifts });
            const cleanSettings = cleanForFirestore(updatedSettings);
            const cleanMisc = cleanForFirestore({
                holidays: Array.from(holidays),
                weeklyNotes,
                weeklyChecklists,
                weeklyNotes,
                weeklyChecklists,
                payrollSnapshots,
                calendarEvents
            });


            // 2. Ejecutar envíos
            console.log("Writing workers...");
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workers_doc', 'main'), cleanWorkers);

            console.log("Writing shifts...");
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts_doc', 'main'), cleanShifts);

            console.log("Writing settings...");
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings_doc', 'main'), cleanSettings);

            console.log("Writing misc data...");
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'misc_doc', 'main'), cleanMisc);

            // 3. Actualizar estado local solo tras éxito total
            setSettings(updatedSettings);
            console.log("Cloud upload successful!");
            return true;
        } catch (e) {
            console.error("Cloud upload FAILED:", e);
            // Si el error es de permisos, avisamos algo específico?
            if (e.code === 'permission-denied') {
                console.warn("Permission denied. Check Firestore security rules.");
            }
            return false;
        }
    };

    const forceCloudDownload = async () => {
        if (!appId) return;
        try {
            const wSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workers_doc', 'main'));
            const sSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts_doc', 'main'));
            const setSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings_doc', 'main'));
            const mSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'misc_doc', 'main'));

            if (wSnap.exists()) setWorkers(wSnap.data().list || []);
            if (sSnap.exists()) setShifts(sSnap.data().data || {});
            if (setSnap.exists()) setSettings(prev => ({ ...prev, ...setSnap.data(), cloudMode: true }));
            if (mSnap.exists()) {
                const d = mSnap.data();
                if (d.holidays) setHolidays(new Set(d.holidays));
                if (d.weeklyNotes) setWeeklyNotes(d.weeklyNotes);
                if (d.weeklyChecklists) setWeeklyChecklists(d.weeklyChecklists);

                if (d.payrollSnapshots) setPayrollSnapshots(d.payrollSnapshots);
                if (d.calendarEvents) setCalendarEvents(d.calendarEvents);
            }

            hasCloudSynced.current = true;
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const exportData = useCallback(() => {
        const fullData = {
            workers, shifts, settings,
            holidays: Array.from(holidays),

            weeklyNotes, weeklyChecklists, payrollSnapshots, calendarEvents,
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `respaldo_turnos_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [workers, shifts, settings, holidays, weeklyNotes, weeklyChecklists, payrollSnapshots]);

    const importData = (data) => {
        try {
            if (data.workers) setWorkers(data.workers);
            if (data.shifts) setShifts(data.shifts);
            if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
            if (data.holidays) setHolidays(new Set(data.holidays));
            if (data.weeklyNotes) setWeeklyNotes(data.weeklyNotes);
            if (data.weeklyChecklists) setWeeklyChecklists(data.weeklyChecklists);
            if (data.weeklyChecklists) setWeeklyChecklists(data.weeklyChecklists);
            if (data.payrollSnapshots) setPayrollSnapshots(data.payrollSnapshots);
            if (data.calendarEvents) setCalendarEvents(data.calendarEvents);
            return true;

        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const updateSettings = (updates) => { setSettings(prev => ({ ...prev, ...updates })); };

    return {
        settings, updateSettings, holidays, setHolidays, workers, setWorkers, shifts, setShifts,
        weeklyNotes, setWeeklyNotes, weeklyChecklists, setWeeklyChecklists,
        payrollSnapshots, setPayrollSnapshots,
        calendarEvents, setCalendarEvents,
        isSynced, isLoading, forceCloudUpload, forceCloudDownload, exportData, importData
    };
};

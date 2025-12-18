import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { SHIFT_COLORS } from '../config/constants';

export const useDataSync = ({ user, auth, db, appId, firebaseReady }) => {
    // --- Estados de Datos ---
    const [settings, setSettings] = useState({
        sedes: [{ name: 'Homecenter', places: ['Tienda', 'Patio Constructor', 'Funcionarios'] }, { name: 'Falabella', places: ['Piso 1', 'Bodega', 'Cajas'] }],
        enablePin: true, pin: '1234', accentColor: '#000000', autoReliever: true, glassIntensity: 70, modalGlassIntensity: 70, reducedMotion: false,
        reportConfig: { showHeader: true, showDays: true, showLocation: true, showReliever: false, showShiftSummary: true },
        payrollConfig: {
            hourlyRate: 6000, sundaySurcharge: 75, holidaySurcharge: 75, nightSurcharge: 35, nightShiftHours: 6,
            includeTransportAllowance: true, transportAllowance: 200000,
            hoursPerWeekday: { monday: 7, tuesday: 7.5, wednesday: 7.5, thursday: 7.5, friday: 7.5, saturday: 7, sunday: 7.33 },
            customMessage: "JUAN SEBASTIAN PANTOJA 50.000 DE COORDINACION"
        },
        cloudMode: true, // NUEVO: Alternar entre Nube y Local
        lastSync: null   // NUEVO: Timestamp de última sincronización
    });
    const [holidays, setHolidays] = useState(new Set());
    const [workers, setWorkers] = useState([]);
    const [shifts, setShifts] = useState({});
    const [weeklyNotes, setWeeklyNotes] = useState({});
    const [weeklyChecklists, setWeeklyChecklists] = useState({});
    const [payrollSnapshots, setPayrollSnapshots] = useState({});

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
                    if (d.weeklyChecklists) setWeeklyChecklists(d.weeklyChecklists);
                    if (d.payrollSnapshots) setPayrollSnapshots(d.payrollSnapshots);
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

    // --- EFECTO DE GUARDADO ---
    useEffect(() => {
        if (isLoading || !hasInitialLoad || !appId) return;

        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }

        // Bloqueo si esperamos nube y no ha llegado
        if (settings.cloudMode && !hasCloudSynced.current) return;

        const saveData = setTimeout(() => {
            const prefix = `app_${appId}_`;

            // Siempre LocalStorage
            localStorage.setItem(`${prefix}workers`, JSON.stringify(workers));
            localStorage.setItem(`${prefix}shifts`, JSON.stringify(shifts));
            localStorage.setItem(`${prefix}settings`, JSON.stringify(settings));
            localStorage.setItem(`${prefix}holidays`, JSON.stringify(Array.from(holidays)));
            localStorage.setItem(`${prefix}weeklyNotes`, JSON.stringify(weeklyNotes));
            localStorage.setItem(`${prefix}weeklyChecklists`, JSON.stringify(weeklyChecklists));
            localStorage.setItem(`${prefix}payrollSnapshots`, JSON.stringify(payrollSnapshots));

            // Solo Cloud si está activo
            if (settings.cloudMode) {
                if (workers.length > 0) saveToCloud('workers_doc', { list: workers });
                saveToCloud('shifts_doc', { data: shifts });
                saveToCloud('settings_doc', settings);
                saveToCloud('misc_doc', { holidays: Array.from(holidays), weeklyNotes, weeklyChecklists, payrollSnapshots });

                // Actualizar timestamp localmente (para que no guarde infinito, lo hacemos con cuidado)
                // Usamos una pequeña optimización: si solo cambió lastSync, no volvemos a guardar en nube.
            }
        }, 1000);
        return () => clearTimeout(saveData);
    }, [workers, shifts, weeklyNotes, weeklyChecklists, payrollSnapshots, settings, holidays, isLoading, hasInitialLoad, appId]);


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
                payrollSnapshots
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
            weeklyNotes, weeklyChecklists, payrollSnapshots,
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
            if (data.payrollSnapshots) setPayrollSnapshots(data.payrollSnapshots);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const updateSettings = (updates) => { setSettings(prev => ({ ...prev, ...updates })); };

    return {
        settings, updateSettings, holidays, setHolidays, workers, setWorkers, shifts, setShifts,
        weeklyNotes, setWeeklyNotes, weeklyChecklists, setWeeklyChecklists, payrollSnapshots, setPayrollSnapshots,
        isSynced, isLoading, forceCloudUpload, forceCloudDownload, exportData, importData
    };
};

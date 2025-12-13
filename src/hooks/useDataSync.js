import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, onSnapshot } from "firebase/firestore";
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
        }
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
    const [hasInitialLoad, setHasInitialLoad] = useState(false);

    // --- EFECTO PRINCIPAL: Cargar Datos y Sincronizar ---
    useEffect(() => {
        // Si no hay usuario o appId, reseteamos/limpiamos y esperamos
        if (!firebaseReady || !auth || !user || !appId) {
            setIsLoading(false);
            return;
        }

        const prefix = `app_${appId}_`; // Prefijo único por usuario para localStorage

        // 1. Cargar datos locales específicos de este usuario
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
                else setWorkers([]); // Reset si no hay local

                if (savedShifts) setShifts(JSON.parse(savedShifts));
                else setShifts({});

                if (savedSettings) setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
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
        setIsSynced(true);

        // 2. Conectar Listeners de Firebase
        const workersRef = doc(db, 'artifacts', appId, 'public', 'data', 'workers_doc', 'main');
        const shiftsRef = doc(db, 'artifacts', appId, 'public', 'data', 'shifts_doc', 'main');
        const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings_doc', 'main');
        const miscRef = doc(db, 'artifacts', appId, 'public', 'data', 'misc_doc', 'main');

        const unsubWorkers = onSnapshot(workersRef, (snap) => {
            if (snap.exists()) {
                const newData = snap.data().list || [];
                if (newData.length > 0) {
                    isRemoteUpdate.current = true;
                    setWorkers(newData);
                    setTimeout(() => isRemoteUpdate.current = false, 100);
                }
            } else {
                // Si es un usuario nuevo (DB vacía) y no tiene local, iniciamos plantilla
                if (!localStorage.getItem(`${prefix}workers`)) {
                    const defaultWorkers = [{ id: 1, name: 'Ejemplo Empleado', role: 'Cargo', sede: 'Sede Principal', lugar: 'Lugar', color: '#007AFF', avatar: null, isReliever: false, notes: [] }];
                    setWorkers(defaultWorkers);
                }
            }
        });

        const unsubShifts = onSnapshot(shiftsRef, (snap) => {
            if (snap.exists()) {
                const newData = snap.data().data || {};
                if (Object.keys(newData).length > 0) {
                    isRemoteUpdate.current = true;
                    setShifts(newData);
                    setTimeout(() => isRemoteUpdate.current = false, 100);
                }
            }
        });

        const unsubSettings = onSnapshot(settingsRef, (snap) => {
            if (snap.exists()) {
                const newData = snap.data();
                if (Object.keys(newData).length > 0) {
                    isRemoteUpdate.current = true;
                    setSettings(prev => ({ ...prev, ...newData }));
                    setTimeout(() => isRemoteUpdate.current = false, 100);
                }
            }
        });

        const unsubMisc = onSnapshot(miscRef, (snap) => {
            if (snap.exists()) {
                isRemoteUpdate.current = true;
                const d = snap.data();
                if (d.holidays && d.holidays.length > 0) setHolidays(new Set(d.holidays));
                if (d.weeklyNotes) setWeeklyNotes(d.weeklyNotes);
                if (d.weeklyChecklists) setWeeklyChecklists(d.weeklyChecklists);
                if (d.payrollSnapshots) setPayrollSnapshots(d.payrollSnapshots);
                setTimeout(() => isRemoteUpdate.current = false, 100);
            }
        });

        return () => {
            unsubWorkers();
            unsubShifts();
            unsubSettings();
            unsubMisc();
        };
    }, [user, firebaseReady, appId]); // IMPORTANTE: appId en dependencias

    // --- AUTOMATIC MIGRATION: Assign colors to legacy custom shifts ---
    useEffect(() => {
        if (!settings.customShifts || settings.customShifts.length === 0) return;

        // 1. Migrate Definitions
        let settingsChanged = false;
        const newCustomShifts = settings.customShifts.map((shift, index) => {
            if (!shift.color || !shift.colorHex) {
                settingsChanged = true;
                const assignedColor = SHIFT_COLORS[index % SHIFT_COLORS.length];
                return {
                    ...shift,
                    color: shift.color || assignedColor.id,
                    colorHex: shift.colorHex || assignedColor.hex
                };
            }
            return shift;
        });

        // 2. Migrate Assigned Shifts
        let shiftsChanged = false;
        const newShifts = { ...shifts };

        // Build lookup
        const colorMap = {};
        newCustomShifts.forEach(cs => {
            if (cs.code) colorMap[cs.code] = cs;
        });

        Object.keys(newShifts).forEach(key => {
            const s = newShifts[key];
            if (s.type === 'custom' && !s.customShiftColor && s.code) {
                const def = colorMap[s.code];
                if (def) {
                    newShifts[key] = {
                        ...s,
                        customShiftColor: def.color,
                        // customShiftId: def.id 
                    };
                    shiftsChanged = true;
                }
            }
        });

        if (settingsChanged) {
            setSettings(prev => ({ ...prev, customShifts: newCustomShifts }));
        }
        if (shiftsChanged) {
            setShifts(newShifts);
        }

    }, [settings.customShifts, shifts]);

    // --- SAVE TO FIRESTORE (Debounced) ---
    const saveToCloud = async (collection, data) => {
        // Validación extra: appId debe existir
        if (!auth.currentUser || isRemoteUpdate.current || !appId) return;

        if (collection === 'workers_doc' && (!data.list || data.list.length === 0)) {
            console.warn('Prevented saving empty worker list to cloud.');
            return;
        }

        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', collection, 'main'), data, { merge: true });
        } catch (e) { console.error("Save error", e); }
    };

    // --- Guardar Datos (Debounce) ---
    useEffect(() => {
        if (isLoading || !hasInitialLoad || !appId) return;

        // Validamos que no estemos guardando sobre un usuario vacío
        if (workers.length === 0 && !localStorage.getItem(`app_${appId}_workers`)) return;

        const saveData = setTimeout(() => {
            const prefix = `app_${appId}_`;

            // Guardar en LocalStorage (Con prefijo)
            if (workers.length > 0) localStorage.setItem(`${prefix}workers`, JSON.stringify(workers));
            localStorage.setItem(`${prefix}shifts`, JSON.stringify(shifts));
            localStorage.setItem(`${prefix}settings`, JSON.stringify(settings));
            localStorage.setItem(`${prefix}holidays`, JSON.stringify(Array.from(holidays)));
            localStorage.setItem(`${prefix}weeklyNotes`, JSON.stringify(weeklyNotes));
            localStorage.setItem(`${prefix}weeklyChecklists`, JSON.stringify(weeklyChecklists));
            localStorage.setItem(`${prefix}payrollSnapshots`, JSON.stringify(payrollSnapshots));

            // Guardar en Firestore
            if (workers.length > 0) saveToCloud('workers_doc', { list: workers });
            saveToCloud('shifts_doc', { data: shifts });
            saveToCloud('settings_doc', settings);
            saveToCloud('misc_doc', { holidays: Array.from(holidays), weeklyNotes, weeklyChecklists, payrollSnapshots });
        }, 1000);
        return () => clearTimeout(saveData);
    }, [workers, shifts, weeklyNotes, weeklyChecklists, payrollSnapshots, settings, holidays, isLoading, hasInitialLoad, appId]);

    const updateSettings = (updates) => { setSettings(prev => ({ ...prev, ...updates })); };

    return {
        settings, updateSettings, holidays, setHolidays, workers, setWorkers, shifts, setShifts,
        weeklyNotes, setWeeklyNotes, weeklyChecklists, setWeeklyChecklists, payrollSnapshots, setPayrollSnapshots,
        isSynced, isLoading
    };
};
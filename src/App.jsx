import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Calendar, Users, FileText, Coffee, Settings, UserCheck, Loader, LogOut } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import GlobalStyles from './styles/GlobalStyles';
import EditModal from './components/modals/EditModal';
import DayDetailModal from './components/modals/DayDetailModal';
import ScheduleView from './components/views/ScheduleView';
import WorkersList from './components/views/WorkersList';
import LockScreen from './components/views/LockScreen';
import WorkerProfile from './components/views/WorkerProfile';
import LoginView from './components/views/LoginView';
import { SkeletonPage } from './components/shared/Skeleton';
import { ToastProvider } from './components/shared/Toast';

// --- CUSTOM HOOKS ---
import { useAuth } from './hooks/useAuth';
import { useDataSync } from './hooks/useDataSync';
import { useSchedule } from './hooks/useSchedule';
import ErrorBoundary from './components/shared/ErrorBoundary';

// --- LAZY LOADED COMPONENTS (Less frequently accessed views) ---
const RestDaysView = lazy(() => import('./components/views/RestDaysView'));
const PayrollReportView = lazy(() => import('./components/views/PayrollReportView'));
const SettingsView = lazy(() => import('./components/views/SettingsView'));

// --- App Principal ---
const App = () => {
    const [theme, setTheme] = useState('light');
    const [activeTab, setActiveTab] = useState('schedule');
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedWorkerId, setSelectedWorkerId] = useState(null);
    const [selectedDayDetail, setSelectedDayDetail] = useState(null);

    // --- Auth & Data Hooks ---
    // 1. Extraemos todo MENOS appId, para evitar confusiones
    const { user, auth, db, firebaseReady, login, register, logout, authError, isLoading: authLoading } = useAuth();

    // 2. Definimos el appId dinámico basado en el usuario logueado
    // Si no hay usuario, el appId es null y el hook de datos se pausará
    const dynamicAppId = user ? user.uid : null;

    // Only sync data if user is logged in
    const {
        settings, updateSettings,
        holidays, setHolidays,
        workers, setWorkers,
        shifts, setShifts,
        weeklyNotes, setWeeklyNotes,
        weeklyChecklists, setWeeklyChecklists,
        payrollSnapshots, setPayrollSnapshots,
        isSynced, isLoading: dataLoading
    } = useDataSync({ user, auth, db, appId: dynamicAppId, firebaseReady }); // <--- USAMOS dynamicAppId
    // --- Schedule Hook ---
    const {
        viewMode, setViewMode,
        currentDate, setCurrentDate,
        daysToShow, navigate
    } = useSchedule();

    const [isLocked, setIsLocked] = useState(settings.enablePin);

    // --- Public View State ---
    const [publicWorkerId, setPublicWorkerId] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const vid = params.get('view') === 'public' ? params.get('workerId') : null;
        return vid ? parseInt(vid, 10) : null;
    });
    const isPublicView = !!publicWorkerId;

    // Clear modals when switching tabs
    useEffect(() => {
        if (isPublicView) return;
        setSelectedCell(null);
        setSelectedDayDetail(null);
    }, [activeTab, isPublicView]);

    // Sync lock state with PIN settings
    useEffect(() => {
        setIsLocked(settings.enablePin);
    }, [settings.enablePin]);

    // Theme Effect
    useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const autoScheduleReliever = (relieverId) => {
        const reliever = workers.find(w => w.id === relieverId);
        if (!reliever) return;

        const newShifts = { ...shifts };
        let updatesCount = 0;

        // Iterate through days currently in view
        daysToShow.forEach(dayObj => {
            const dateStr = dayObj.date.toISOString().split('T')[0];

            // Check if reliever is already busy this day
            const relieverShift = newShifts[`${relieverId}_${dateStr}`];
            if (relieverShift && relieverShift.type !== 'off' && relieverShift.type !== 'unassigned') {
                return; // Reliever is busy, skip
            }

            // Look for absences to cover
            const absentWorker = workers.find(w => {
                if (w.id === relieverId) return false; // Skip self
                const s = newShifts[`${w.id}_${dateStr}`] || {};
                // Cover: Sick, Permit, Vacation, Off
                return ['sick', 'permit', 'vacation', 'off'].includes(s.type);
            });

            if (absentWorker) {
                // Found an absence! Assign reliever.
                // We default to a standard shift based on the absence, or just a generic 'Morning' if unknown, 
                // but usually the reliever takes the *place* of the worker. 
                // However, the absent worker's shift *type* is now 'sick', so we don't know what they *would* have worked.
                // We'll assume a standard Morning shift for coverage or try to infer from pattern if we had it.
                // For now: Assign 'morning' or 'afternoon' depending on the absent worker's usual preference? 
                // Let's standardise to Match the Site's need or default to Morning (M).

                // Better: Check what the absent worker *usually* does? No data.
                // Defaulting to "Morning" (M) for coverage.

                newShifts[`${relieverId}_${dateStr}`] = {
                    type: 'morning',
                    start: '08:00',
                    end: '16:00',
                    coveringId: absentWorker.id, // Track who they are covering
                    location: absentWorker.sede // Go to the absent worker's site
                };
                updatesCount++;
            }
        });

        if (updatesCount > 0) {
            setShifts(newShifts);
            // Optional: Notify user
            alert(`Se asignaron ${updatesCount} turnos automáticos al relevo.`);
        } else {
            alert("No se encontraron ausencias sin cubrir para los días visibles.");
        }
    };

    // --- RENDER ---

    // 1. Loading State (Global)
    if (authLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
                <Loader className="animate-spin" size={48} />
            </div>
        );
    }

    // 2. Public View (No Login Required)
    if (isPublicView) {
        return (
            <>
                <GlobalStyles accentColor={settings.accentColor} glassIntensity={settings.glassIntensity} reducedMotion={settings.reducedMotion} settings={settings} />
                <div className="flex flex-col h-screen w-screen overflow-hidden" data-theme={theme}>
                    <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto relative">
                        <div className="blob-cont"><div className="blob" style={{ top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'rgba(120,120,120,0.1)' }} /></div>
                        <div className="flex flex-col h-full">
                            <div className="bg-blue-500 text-white text-center text-xs font-bold py-1 px-4 shadow-md z-50">
                                VISTA DE SOLO LECTURA
                            </div>
                            {dataLoading ? (
                                <div className="flex-1 flex items-center justify-center flex-col gap-4">
                                    <Loader className="animate-spin text-[var(--accent-solid)]" size={48} />
                                    <p className="text-[var(--text-secondary)] text-sm font-bold animate-pulse">Cargando bitácora...</p>
                                </div>
                            ) : workers.find(w => w.id === publicWorkerId) ? (
                                <WorkerProfile
                                    worker={workers.find(w => w.id === publicWorkerId)}
                                    onBack={() => { }}
                                    setWorkers={() => { }}
                                    shifts={shifts}
                                    setShifts={() => { }}
                                    autoScheduleReliever={() => { }}
                                    sedes={settings.sedes}
                                    readOnly={true}
                                />
                            ) : (
                                <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center px-6">
                                    <div className="w-20 h-20 rounded-full bg-[var(--glass-dock)] flex items-center justify-center text-[var(--text-tertiary)] mb-2">
                                        <UserCheck size={40} />
                                    </div>
                                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Trabajador no encontrado</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">El enlace podría ser incorrecto o el trabajador ya no existe.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // 3. Login View (If not authenticated)
    if (!user) {
        return (
            <>
                <GlobalStyles accentColor={settings.accentColor} glassIntensity={settings.glassIntensity} reducedMotion={settings.reducedMotion} settings={settings} />
                <LoginView
                    onLogin={login}
                    onRegister={register}
                    isLoading={authLoading}
                    error={authError}
                />
            </>
        );
    }

    // Derived State: Active Workers
    const activeWorkers = workers.filter(w => w.isActive !== false);

    // Check if any modal that should hide the dock is open
    const isModalOpen = !!(selectedCell || selectedDayDetail);

    // 4. Main App (Authenticated)
    return (
        <ToastProvider>
            <GlobalStyles accentColor={settings.accentColor} glassIntensity={settings.glassIntensity} reducedMotion={settings.reducedMotion} settings={settings} />
            {isLocked ? (
                <LockScreen onUnlock={() => setIsLocked(false)} correctPin={settings.pin} />
            ) : (
                <div className="flex flex-col h-screen w-screen overflow-hidden" data-theme={theme}>
                    {/* Max-width container for large screens */}
                    <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto relative">
                        <div className="blob-cont"><div className="blob" style={{ top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'rgba(120,120,120,0.1)' }} /></div>

                        {/* Logout Button (Temporary placement or integrated into UI) */}
                        {/* We can add a logout button to the Settings view, but for now let's keep it simple */}

                        {selectedWorkerId ? (
                            <ErrorBoundary>
                                <WorkerProfile
                                    worker={workers.find(w => w.id === selectedWorkerId)}
                                    onBack={() => setSelectedWorkerId(null)}
                                    setWorkers={setWorkers}
                                    shifts={shifts}
                                    setShifts={setShifts}
                                    autoScheduleReliever={autoScheduleReliever}
                                    sedes={settings.sedes}
                                />
                            </ErrorBoundary>
                        ) : (
                            <ErrorBoundary>
                                {activeTab === 'schedule' && <ScheduleView theme={theme} toggleTheme={toggleTheme} viewMode={viewMode} setViewMode={setViewMode} currentDate={currentDate} navigate={navigate} daysToShow={daysToShow} workers={activeWorkers} shifts={shifts} setSelectedCell={setSelectedCell} setSelectedDayDetail={setSelectedDayDetail} isSynced={isSynced} settings={settings} />}
                                {activeTab === 'rest_days' && (
                                    <Suspense fallback={<SkeletonPage />}>
                                        <RestDaysView currentDate={currentDate} setCurrentDate={setCurrentDate} workers={activeWorkers} shifts={shifts} setShifts={setShifts} weeklyNotes={weeklyNotes} setWeeklyNotes={setWeeklyNotes} weeklyChecklists={weeklyChecklists} setWeeklyChecklists={setWeeklyChecklists} settings={settings} />
                                    </Suspense>
                                )}
                                {activeTab === 'report' && (
                                    <Suspense fallback={<SkeletonPage />}>
                                        <PayrollReportView workers={workers} shifts={shifts} currentDate={currentDate} holidays={holidays} setHolidays={setHolidays} navigate={navigate} setViewMode={setViewMode} daysToShow={daysToShow} setSelectedCell={setSelectedCell} setCurrentDate={setCurrentDate} settings={settings} weeklyNotes={weeklyNotes} setWeeklyNotes={setWeeklyNotes} payrollSnapshots={payrollSnapshots} />
                                    </Suspense>
                                )}
                                {activeTab === 'workers' && <WorkersList workers={workers} setWorkers={setWorkers} setSelectedWorkerId={setSelectedWorkerId} sedes={settings.sedes} />}
                                {activeTab === 'settings' && (
                                    <Suspense fallback={<SkeletonPage />}>
                                        <SettingsView settings={settings} updateSettings={updateSettings} logout={logout} />
                                    </Suspense>
                                )}
                                <DayDetailModal dateStr={selectedDayDetail} onClose={() => setSelectedDayDetail(null)} workers={workers} shifts={shifts} settings={settings} />
                                <EditModal selectedCell={selectedCell} setSelectedCell={setSelectedCell} workers={workers} shifts={shifts} setShifts={setShifts} sedes={settings.sedes} settings={settings} />
                                <div className={`dock-container ${isModalOpen ? 'dock-hidden' : ''}`}>
                                    <div className="dock-menu">
                                        {[{ id: 'schedule', label: 'Calendario', icon: Calendar }, { id: 'rest_days', label: 'Descansos', icon: Coffee }, { id: 'report', label: 'Nómina', icon: FileText }, { id: 'workers', label: 'Equipo', icon: Users }, { id: 'settings', label: 'Config', icon: Settings }].map(item => (
                                            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`dock-button ${activeTab === item.id ? 'active' : ''}`} title={item.label}>
                                                <item.icon size={24} strokeWidth={2.5} className="dock-icon" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </ErrorBoundary>
                        )}
                    </div>
                </div>
            )}
        </ToastProvider>
    );
}


export default App;
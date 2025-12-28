import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Calendar, Users, FileText, Coffee, Settings, UserCheck, Loader, LogOut } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import GlobalStyles from './styles/GlobalStyles';
import EditModal from './components/modals/EditModal';
import DayDetailModal from './components/modals/DayDetailModal';
import ScheduleView from './components/views/ScheduleView';
import WorkersList from './components/views/WorkersList';
import WorkerProfile from './components/views/WorkerProfile';
import LoginView from './components/views/LoginView';
import { SkeletonPage } from './components/shared/Skeleton';
import { ToastProvider, useToast } from './components/shared/Toast';

// --- CUSTOM HOOKS ---
import { useAuth } from './hooks/useAuth';
import { useDataSync } from './hooks/useDataSync';
import { useSchedule } from './hooks/useSchedule';
import { useStorageManager } from './hooks/useStorageManager';
import ErrorBoundary from './components/shared/ErrorBoundary';

// --- LAZY LOADED COMPONENTS (Less frequently accessed views) ---
const RestDaysView = lazy(() => import('./components/views/RestDaysView'));
const PayrollReportView = lazy(() => import('./components/views/PayrollReportView'));
const SettingsView = lazy(() => import('./components/views/SettingsView'));
const CloudConflictModal = lazy(() => import('./components/modals/CloudConflictModal'));

// --- App Principal ---
const App = () => {
    const { success, error, warning, info } = useToast();
    const [theme, setTheme] = useState('light');
    const [activeTab, setActiveTab] = useState('schedule');
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedWorkerId, setSelectedWorkerId] = useState(null);
    const [selectedDayDetail, setSelectedDayDetail] = useState(null);

    // --- NUEVO: Estado para Resolución de Conflictos ---
    const [showConflictModal, setShowConflictModal] = useState(false);

    // --- Auth & Data Hooks ---
    const { user, auth, db, firebaseReady, login, register, logout, authError, isLoading: authLoading } = useAuth();
    const dynamicAppId = user ? user.uid : null;

    const {
        settings, updateSettings,
        holidays, setHolidays,
        workers, setWorkers,
        shifts, setShifts,
        weeklyNotes, setWeeklyNotes,
        weeklyChecklists, setWeeklyChecklists,
        payrollSnapshots, setPayrollSnapshots,
        calendarEvents, setCalendarEvents,
        isSynced, isLoading: dataLoading,
        forceCloudUpload, forceCloudDownload, exportData, importData
    } = useDataSync({ user, auth, db, appId: dynamicAppId, firebaseReady });

    // --- Schedule Hook ---
    const {
        viewMode, setViewMode,
        currentDate, setCurrentDate,
        daysToShow, navigate
    } = useSchedule();

    // --- Backup Reminder Hook ---
    const storageManager = useStorageManager();

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

    // Theme Effect
    useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    // --- HANDLERS PARA SINCRONIZACIÓN ---
    const handleToggleCloud = async (enabled) => {
        if (enabled) {
            setShowConflictModal(true);
        } else {
            updateSettings({ cloudMode: false });
        }
    };

    const handleUploadLocal = async () => {
        const ok = await forceCloudUpload();
        if (ok) {
            updateSettings({ cloudMode: true });
            setShowConflictModal(false);
            success("¡Datos locales subidos a la nube con éxito!");
        } else {
            error("Error al intentar subir datos. Revisa tu conexión.");
        }
    };

    const handleDownloadCloud = async () => {
        if (!confirm("Esto BORRARÁ tus datos locales actuales y usará los de la nube. ¿Estás seguro?")) return;
        const ok = await forceCloudDownload();
        if (ok) {
            updateSettings({ cloudMode: true });
            setShowConflictModal(false);
            success("¡Datos de la nube descargados con éxito!");
        } else {
            error("Error al intentar descargar datos.");
        }
    };

    const autoScheduleReliever = (relieverId) => {
        const reliever = workers.find(w => w.id === relieverId);
        if (!reliever) return;

        const newShifts = { ...shifts };
        let updatesCount = 0;

        daysToShow.forEach(dayObj => {
            const dateStr = dayObj.date.toISOString().split('T')[0];
            const relieverShift = newShifts[`${relieverId}_${dateStr}`];
            if (relieverShift && relieverShift.type !== 'off' && relieverShift.type !== 'unassigned') return;

            const absentWorker = workers.find(w => {
                if (w.id === relieverId) return false;
                const s = newShifts[`${w.id}_${dateStr}`] || {};
                return ['sick', 'permit', 'vacation', 'off'].includes(s.type);
            });

            if (absentWorker) {
                newShifts[`${relieverId}_${dateStr}`] = {
                    type: 'morning',
                    start: '08:00',
                    end: '16:00',
                    coveringId: absentWorker.id,
                    location: absentWorker.sede
                };
                updatesCount++;
            }
        });

        if (updatesCount > 0) {
            setShifts(newShifts);
            alert(`Se asignaron ${updatesCount} turnos automáticos al relevo.`);
        } else {
            alert("No se encontraron ausencias sin cubrir para los días visibles.");
        }
    };


    // --- RENDER ---

    if (authLoading) {
        return <div className="flex h-screen w-screen items-center justify-center bg-black text-white"><Loader className="animate-spin" size={48} /></div>;
    }

    if (isPublicView) {
        return (
            <>
                <GlobalStyles accentColor={settings.accentColor} glassIntensity={settings.glassIntensity} reducedMotion={settings.reducedMotion} settings={settings} />
                <div className="flex flex-col h-screen w-screen overflow-hidden" data-theme={theme}>
                    <div className="flex flex-col h-full w-full max-w-[1400px] mx-auto relative">
                        <div className="blob-cont"><div className="blob" style={{ top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'rgba(120,120,120,0.1)' }} /></div>
                        <div className="flex flex-col h-full">
                            <div className="bg-blue-500 text-white text-center text-xs font-bold py-1 px-4 shadow-md z-50">VISTA DE SOLO LECTURA</div>
                            {dataLoading ? (
                                <div className="flex-1 flex items-center justify-center flex-col gap-4">
                                    <Loader className="animate-spin text-[var(--accent-solid)]" size={48} /><p className="text-[var(--text-secondary)] text-sm font-bold animate-pulse">Cargando...</p>
                                </div>
                            ) : workers.find(w => w.id === publicWorkerId) ? (
                                <WorkerProfile worker={workers.find(w => w.id === publicWorkerId)} onBack={() => { }} setWorkers={() => { }} shifts={shifts} setShifts={() => { }} autoScheduleReliever={() => { }} sedes={settings.sedes} readOnly={true} />
                            ) : (
                                <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center px-6">
                                    <div className="w-20 h-20 rounded-full bg-[var(--glass-dock)] flex items-center justify-center text-[var(--text-tertiary)] mb-2"><UserCheck size={40} /></div>
                                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Trabajador no encontrado</h2>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (!user) {
        return (
            <>
                <GlobalStyles accentColor={settings.accentColor} glassIntensity={settings.glassIntensity} reducedMotion={settings.reducedMotion} settings={settings} />
                <LoginView onLogin={login} onRegister={register} isLoading={authLoading} error={authError} />
            </>
        );
    }

    const activeWorkers = workers.filter(w => w.isActive !== false);
    const isModalOpen = !!(selectedCell || selectedDayDetail);

    return (
        <ToastProvider>
            <GlobalStyles accentColor={settings.accentColor} glassIntensity={settings.glassIntensity} reducedMotion={settings.reducedMotion} settings={settings} />
            <div className="flex flex-col h-screen w-screen overflow-hidden" data-theme={theme}>
                <div className="flex flex-col h-full w-full mx-auto relative">
                    <div className="blob-cont"><div className="blob" style={{ top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'rgba(120,120,120,0.1)' }} /></div>

                    {selectedWorkerId ? (
                        <ErrorBoundary>
                            <WorkerProfile worker={workers.find(w => w.id === selectedWorkerId)} onBack={() => setSelectedWorkerId(null)} setWorkers={setWorkers} shifts={shifts} setShifts={setShifts} autoScheduleReliever={autoScheduleReliever} sedes={settings.sedes} settings={settings} />
                        </ErrorBoundary>
                    ) : (
                        <ErrorBoundary>
                            {activeTab === 'schedule' && <ScheduleView theme={theme} toggleTheme={toggleTheme} viewMode={viewMode} setViewMode={setViewMode} currentDate={currentDate} navigate={navigate} daysToShow={daysToShow} workers={workers} shifts={shifts} setSelectedCell={setSelectedCell} setSelectedDayDetail={setSelectedDayDetail} isSynced={isSynced && settings.cloudMode} settings={settings} calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents} />}
                            {activeTab === 'rest_days' && (
                                <Suspense fallback={<SkeletonPage />}>
                                    <RestDaysView currentDate={currentDate} setCurrentDate={setCurrentDate} workers={activeWorkers} shifts={shifts} setShifts={setShifts} weeklyNotes={weeklyNotes} setWeeklyNotes={setWeeklyNotes} weeklyChecklists={weeklyChecklists} setWeeklyChecklists={setWeeklyChecklists} settings={settings} updateSettings={updateSettings} />
                                </Suspense>
                            )}
                            {activeTab === 'report' && (
                                <Suspense fallback={<SkeletonPage />}>
                                    <PayrollReportView workers={workers} shifts={shifts} setShifts={setShifts} currentDate={currentDate} holidays={holidays} setHolidays={setHolidays} navigate={navigate} setViewMode={setViewMode} daysToShow={daysToShow} setSelectedCell={setSelectedCell} setCurrentDate={setCurrentDate} settings={settings} weeklyNotes={weeklyNotes} setWeeklyNotes={weeklyNotes} payrollSnapshots={payrollSnapshots} />
                                </Suspense>
                            )}
                            {activeTab === 'workers' && <WorkersList workers={workers} setWorkers={setWorkers} setSelectedWorkerId={setSelectedWorkerId} sedes={settings.sedes} />}
                            {activeTab === 'settings' && (
                                <Suspense fallback={<SkeletonPage />}>
                                    <SettingsView
                                        user={user}
                                        settings={settings}
                                        updateSettings={updateSettings}
                                        logout={logout}
                                        onToggleCloud={handleToggleCloud}
                                        exportData={exportData}
                                        importData={importData}
                                        // Backup reminder props
                                        showBackupReminder={storageManager.showBackupReminder}
                                        onDismissBackupReminder={storageManager.dismissBackupReminder}
                                        daysSinceLastBackup={storageManager.daysSinceLastBackup}
                                        onRecordBackup={storageManager.recordBackup}
                                    />
                                </Suspense>
                            )}
                            <DayDetailModal dateStr={selectedDayDetail} onClose={() => setSelectedDayDetail(null)} workers={workers} shifts={shifts} settings={settings} />
                            <EditModal selectedCell={selectedCell} setSelectedCell={setSelectedCell} workers={workers} shifts={shifts} setShifts={setShifts} sedes={settings.sedes} settings={settings} />

                            <Suspense fallback={null}>
                                <CloudConflictModal
                                    isOpen={showConflictModal}
                                    onClose={() => setShowConflictModal(false)}
                                    onUpload={handleUploadLocal}
                                    onDownload={handleDownloadCloud}
                                    lastSync={settings.lastSync}
                                />
                            </Suspense>

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
        </ToastProvider>
    );
};


export default App;
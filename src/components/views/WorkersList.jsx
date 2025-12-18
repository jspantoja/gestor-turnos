import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Users, PlusCircle, Briefcase, Trash2, ChevronRight, LogOut, UserCheck } from 'lucide-react';
import Button from '../shared/Button';
import SectionHeader from '../shared/SectionHeader';
import EmptyState from '../shared/EmptyState';
import { useToast } from '../shared/Toast';
import { EMPLOYEE_COLORS } from '../../config/constants';

// Sortable Item Component
const SortableWorkerItem = ({ worker, setSelectedWorkerId, deleteMember, toggleArchive }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: worker.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : (worker.isActive === false ? 0.6 : 1),
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative',
        filter: worker.isActive === false ? 'grayscale(100%)' : 'none'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`glass-panel p-4 rounded-xl flex items-center justify-between group hover:bg-[var(--glass-border)] transition-colors ${isDragging ? 'ring-2 ring-blue-500 shadow-xl' : ''} ${worker.isActive === false ? 'border-dashed border-gray-500/30' : ''}`}
        >
            {/* Drag Handle - Only for active workers */}
            {worker.isActive !== false && (
                <div {...attributes} {...listeners} className="mr-3 cursor-grab active:cursor-grabbing text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                    <GripVertical size={20} />
                </div>
            )}
            {worker.isActive === false && (
                <div className="mr-3 text-[var(--text-tertiary)] opacity-50">
                    <LogOut size={20} />
                </div>
            )}

            <div onClick={() => setSelectedWorkerId(worker.id)} className="flex items-center gap-3 flex-1 cursor-pointer">
                <div className="w-10 h-10 rounded-full border-2 overflow-hidden flex items-center justify-center text-sm font-bold bg-[var(--glass-border)]" style={{ borderColor: worker.color }}>
                    {worker.avatar ? <img src={worker.avatar} className="w-full h-full object-cover" alt={worker.name} /> : worker.name[0]}
                </div>
                <div>
                    <div className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                        {worker.name}
                        {worker.isActive === false && <span className="text-[10px] bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded">Archivado</span>}
                        {worker.isReliever && <Briefcase size={12} className="text-[var(--text-secondary)]" />}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">{worker.role}</div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="text-right">
                    <div className="text-xs text-[var(--text-primary)] font-bold">{worker.sede || worker.location}</div>
                    {worker.lugar && <div className="text-[10px] text-[var(--text-secondary)]">{worker.lugar}</div>}
                </div>

                {/* Archive/Restore Button */}
                <button
                    onClick={(e) => toggleArchive(e, worker.id)}
                    className={`opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all ${worker.isActive === false ? 'text-green-500 hover:bg-green-500/10' : 'text-orange-500 hover:bg-orange-500/10'}`}
                    title={worker.isActive === false ? "Restaurar miembro" : "Archivar miembro"}
                >
                    {worker.isActive === false ? <UserCheck size={16} /> : <LogOut size={16} />}
                </button>

                <button onClick={(e) => deleteMember(e, worker.id, worker.name)} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-all" title="Eliminar permanentemente">
                    <Trash2 size={16} />
                </button>

                <div onClick={() => setSelectedWorkerId(worker.id)} className="cursor-pointer">
                    <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
                </div>
            </div>
        </div>
    );
};

const WorkersList = ({ workers, setWorkers, setSelectedWorkerId, sedes }) => {
    const [name, setName] = useState('');
    const [displayName, setDisplayName] = useState(''); // Short name (optional)
    const [cedula, setCedula] = useState(''); // ID number
    const [role, setRole] = useState('');
    const [sede, setSede] = useState(sedes.length > 0 ? sedes[0].name : '');
    const [lugar, setLugar] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [activeId, setActiveId] = useState(null); // For DragOverlay
    const [isFormOpen, setIsFormOpen] = useState(false); // Collapsible form state
    const toast = useToast();

    useEffect(() => { if (sedes.length > 0 && !sede) { setSede(sedes[0].name); } }, [sedes, sede]);
    const availablePlaces = sedes.find(s => s.name === sede)?.places || [];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event) => setActiveId(event.active.id);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;
        if (active.id !== over.id) {
            setWorkers((items) => {
                // Robust ID matching (String conversion to handle number/string mix)
                const oldIndex = items.findIndex((item) => String(item.id) === String(active.id));
                const newIndex = items.findIndex((item) => String(item.id) === String(over.id));
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addMember = (e) => {
        e.preventDefault();
        if (!name || !role) return;

        const newWorker = {
            id: Date.now(),
            name,
            displayName: displayName.trim() || null,
            cedula: cedula.trim() || null, // Save if present
            role,
            sede,
            lugar,
            color: EMPLOYEE_COLORS[workers.length % EMPLOYEE_COLORS.length],
            avatar: null,
            isActive: true,
            notes: []
        };

        setWorkers([...workers, newWorker]);
        setName('');
        setDisplayName('');
        setCedula('');
        setRole('');
        toast.show('Miembro añadido exitosamente', 'success');
    };

    const deleteMember = (e, id, memberName) => {
        e.stopPropagation();
        if (window.confirm(`¿Estás seguro de eliminar a ${memberName}?`)) {
            setWorkers(workers.filter(w => w.id !== id));
            toast.show('Miembro eliminado', 'success');
        }
    };
    //Codigo Viejo de Antigravity-----------------------------------------------------------------
    //const toggleArchive = (e, id) => {
    // e.stopPropagation();
    //setWorkers(workers.map(w => {
    // if (w.id === id) {
    //const newState = w.isActive === false ? true : false;
    // toast.show(newState ? 'Miembro restaurado' : 'Miembro archivado', 'success');
    // return { ...w, isActive: newState };
    //  }
    //return w;
    // }));
    //  };
    //Codigo Viejo de Antigravity-----------------------------------------------------------------


    //Codigo Nuevo de Gemini-----------------------------------------------------------------
    const toggleArchive = (e, id) => {
        e.stopPropagation(); // Detener propagación del click

        // 1. Encontrar al trabajador primero
        const worker = workers.find(w => w.id === id);
        if (!worker) return;

        // 2. Calcular el nuevo estado (Invertir isActive)
        // Usamos !worker.isActive === false para manejar undefined como true implícito
        const isCurrentlyArchived = worker.isActive === false;
        const newState = isCurrentlyArchived; // Si estaba archivado (false), pasa a true. Si era true, pasa a false?
        // Espera, corrijamos la lógica booleana para ser explícitos:
        // Si isActive es false -> Queremos activarlo (true)
        // Si isActive es true/undefined -> Queremos archivarlo (false)
        const nextStatus = worker.isActive === false;

        // 3. Ejecutar el efecto secundario (Toast) FUERA del setWorkers
        if (toast && toast.show) {
            toast.show(nextStatus ? 'Miembro restaurado' : 'Miembro archivado', 'success');
        }

        // 4. Actualizar el estado limpiamente
        setWorkers(prevWorkers => prevWorkers.map(w => {
            if (w.id === id) {
                return { ...w, isActive: nextStatus };
            }
            return w;
        }));
    };
    //Codigo Nuevo de Gemini-----------------------------------------------------------------


    // Filter workers based on archived state
    const displayWorkers = workers.filter(w => showArchived ? w.isActive === false : w.isActive !== false);

    return (
        <div className="flex flex-col h-full animate-enter">
            <div className="px-6 py-8 border-b border-[var(--glass-border)] bg-[var(--bg-body)] z-10 sticky top-0 backdrop-blur-md">
                <div className="flex items-center justify-between mb-2">
                    <SectionHeader icon={Users}>Equipo</SectionHeader>
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${showArchived ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 'bg-[var(--glass-dock)] text-[var(--text-secondary)] border-[var(--glass-border)]'}`}
                    >
                        {showArchived ? <LogOut size={14} /> : <LogOut size={14} />}
                        {showArchived ? 'Ver Activos' : 'Ver Archivados'}
                    </button>
                </div>

                {/* Mobile: Toggle Form Button */}
                {!isFormOpen && (
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="w-full mt-4 md:hidden py-3 rounded-xl border border-dashed border-[var(--glass-border)] text-[var(--text-secondary)] font-bold flex items-center justify-center gap-2 hover:bg-[var(--glass-dock)] transition-all"
                    >
                        <PlusCircle size={18} />
                        Añadir Nuevo Miembro
                    </button>
                )}

                {/* Form Container - Collapsible on Mobile */}
                <div className={`mt-4 overflow-hidden transition-all duration-300 ease-in-out ${isFormOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 md:max-h-[1000px] md:opacity-100'}`}>
                    <form onSubmit={(e) => { addMember(e); setIsFormOpen(false); }} className="glass-panel p-4 rounded-xl flex flex-col md:flex-row gap-3 items-end shadow-sm">
                        <div className="flex-1 w-full space-y-1">
                            <label className="text-xs font-bold text-[var(--text-secondary)] ml-1">Nombre</label>
                            <input
                                type="text"
                                placeholder="Nombre Completo"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[var(--bg-input)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                            />
                        </div>
                        <div className="flex-1 w-full md:w-48 space-y-1">
                            <label className="text-xs font-bold text-[var(--text-secondary)] ml-1">Nombre Corto</label>
                            <input
                                type="text"
                                placeholder="Ej: Juan C."
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full bg-[var(--bg-input)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                            />
                        </div>
                        <div className="w-full md:w-36 space-y-1">
                            <label className="text-xs font-bold text-[var(--text-secondary)] ml-1">Cédula</label>
                            <input
                                type="text"
                                placeholder="ID"
                                value={cedula}
                                onChange={(e) => setCedula(e.target.value)}
                                className="w-full bg-[var(--bg-input)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono placeholder:text-[var(--text-tertiary)]"
                            />
                        </div>
                        <div className="w-full md:w-32 space-y-1">
                            <label className="text-xs font-bold text-[var(--text-secondary)] ml-1">Rol</label>
                            <input
                                type="text"
                                placeholder="Cargo"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full bg-[var(--bg-input)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div className="w-full md:w-40 space-y-1">
                            <label className="text-xs font-bold text-[var(--text-secondary)] ml-1">Sede</label>
                            <select
                                value={sede}
                                onChange={(e) => { setSede(e.target.value); setLugar(''); }}
                                className="w-full bg-[var(--bg-input)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                                {sedes.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            <Button type="submit" variant="primary" icon={PlusCircle} className="flex-1 md:flex-none">
                                Añadir
                            </Button>
                            {isFormOpen && (
                                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] md:hidden">
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-24">
                {displayWorkers.length === 0 ? (
                    <EmptyState
                        icon={showArchived ? LogOut : Users}
                        title={showArchived ? "No hay miembros archivados" : "No hay miembros en el equipo"}
                        description={showArchived ? "Los miembros archivados aparecerán aquí." : "Añade nuevos miembros utilizando el formulario de arriba."}
                    />
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={displayWorkers.map(w => w.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                                {displayWorkers.map(worker => (
                                    <SortableWorkerItem
                                        key={worker.id}
                                        worker={worker}
                                        setSelectedWorkerId={setSelectedWorkerId}
                                        deleteMember={deleteMember}
                                        toggleArchive={toggleArchive}
                                    />
                                ))}
                            </div>
                        </SortableContext>

                        <DragOverlay>
                            {activeId ? (
                                <SortableWorkerItem
                                    worker={workers.find(w => w.id === activeId)}
                                    setSelectedWorkerId={() => { }}
                                    deleteMember={() => { }}
                                    toggleArchive={() => { }}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>
        </div >
    );
};

export default WorkersList;

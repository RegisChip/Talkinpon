import { useState, useEffect } from "react";
import "./styles/AdminP.css";
import { useNavigate } from "react-router-dom";

const PROCESOS_API_URL = "http://localhost:8000/api/procesos/";
const PASOS_API_URL = "http://localhost:8000/api/procesos/pasos/";

function AdminP({ processes, user, onBack, onViewInfo, onLogout}) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false); 
  const [editingProcess, setEditingProcess] = useState(null);
  const [processesList, setProcessesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const [selectedProcessId, setSelectedProcessId] = useState(null);
  const [currentPasos, setCurrentPasos] = useState([]);
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingPaso, setEditingPaso] = useState(null);
  
  // Estados para toggle de tablas
  const [showProcesses, setShowProcesses] = useState(true);
  const [showStepsModal, setShowStepsModal] = useState(false);

  // Estados para filtros y búsqueda
  const [processSearchAttr, setProcessSearchAttr] = useState('');
  const [processSearchTerm, setProcessSearchTerm] = useState('');
  const [filteredProcesses, setFilteredProcesses] = useState([]);

  const getRoleDisplayName = (roleCode) => {
    switch (roleCode) {
      case 'SUPER':
        return 'Super Administrador';
      case 'PROCESOS':
        return 'Administrador de Procesos';
      case 'UBICACIONES':
        return 'Administrador de Ubicaciones';
      default:
        return 'Usuario';
    }
  };

  const handleLogoutAndGoBack = () => {
    if (onLogout) onLogout();
    navigate("/adminB");
    setShowUserMenu(false);
  };

  // ====== NUEVAS FUNCIONES AGREGADAS ======
  
  // Toggle para mostrar/ocultar tabla
  const toggleTableVisibility = (table) => {
    if (table === 'processes') {
      setShowProcesses(!showProcesses);
    }
  };

  // Función para manejar cambio de atributo de búsqueda
  const toggleAttr = (currentAttr, setAttr, newAttr) => {
    setAttr(currentAttr === newAttr ? '' : newAttr);
  };

  // Función para manejar cambios en el input de búsqueda
  const handleProcessSearchChange = (e) => {
    setProcessSearchTerm(e.target.value);
  };

  // Función para cerrar modal de pasos
  const closeStepsModal = () => {
    setShowStepsModal(false);
    setSelectedProcessId(null);
  };

  // ====== FIN NUEVAS FUNCIONES ======

  // FUNCIÓN PARA CARGAR PROCESOS 
  const fetchProcesses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(PROCESOS_API_URL);
      if (response.ok) {
        const data = await response.json();

        const mappedProcesses = data.map(p => ({
          id: p.id,
          name: p.nombre,
          description: p.descripcion,
          requirements: p.requisitos_nombres ? p.requisitos_nombres.join(', ') : 'N/A', 
          time: p.pasos && p.pasos.length > 0 ? p.pasos[0].tiempo_estimado : "N/A",
          responsable: p.responsable || 'N/A', // Asegúrate que tu API devuelva este campo
          num_pasos: p.pasos ? p.pasos.length : 0
        }));

        setProcessesList(mappedProcesses);
      } else {
        console.error("Error al obtener procesos:", response.status);
      }
    } catch (error) {
      console.error("Error de red al obtener procesos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPasos = async (procesoId) => {
    if (!procesoId) {
      setCurrentPasos([]);
      return;
    }
    try {
      const response = await fetch(`${PASOS_API_URL}?proceso_id=${procesoId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentPasos(data);
      } else {
        console.error("Error al cargar pasos:", response.status);
        setCurrentPasos([]);
      }
    } catch (error) {
      console.error("Error de red:", error);
      setCurrentPasos([]);
    }
  };

  // Cargar procesos al inicio
  useEffect(() => {
    fetchProcesses();
  }, []);

  useEffect(() => {
    fetchPasos(selectedProcessId);
  }, [selectedProcessId]);

  // MODIFICACIÓN: Ahora abre el modal de pasos
  const handleViewSteps = (procesoId) => {
    if (selectedProcessId === procesoId) {
      // Si ya está seleccionado, cerrar
      setSelectedProcessId(null);
      setShowStepsModal(false);
    } else {
      // Abrir nuevo
      setSelectedProcessId(procesoId);
      setShowStepsModal(true);
    }
  };

  // useEffect para filtrar procesos
  useEffect(() => {
    if (!processSearchAttr || !processSearchTerm) {
      setFilteredProcesses(processesList);
      return;
    }

    const filtered = processesList.filter((process) => {
      const value = process[processSearchAttr];
      if (!value) return false;
      return value.toString().toLowerCase().includes(processSearchTerm.toLowerCase());
    });

    setFilteredProcesses(filtered);
  }, [processSearchTerm, processSearchAttr, processesList]);

  const handleAddEditPaso = (paso = null) => {
    if (!selectedProcessId) {
      alert("Primero selecciona un proceso para agregar pasos.");
      return;
    }
    const newPaso = paso ? { ...paso, proceso_id: paso.proceso } : {
      id: null,
      iden: '',
      actividad: '',
      tiempo_estimado: '',
      proceso_id: selectedProcessId,
    };
    setEditingPaso(newPaso);
    setShowStepModal(true);
  };

  const handleSavePaso = async (e) => {
    e.preventDefault();
    
    const isNew = !editingPaso.id;
    
    if (!editingPaso.iden || !editingPaso.actividad || !editingPaso.tiempo_estimado) {
      alert("Todos los campos del paso son obligatorios.");
      return;
    }

    const url = isNew ? PASOS_API_URL : `${PASOS_API_URL}${editingPaso.id}/`;
    const method = isNew ? 'POST' : 'PUT';
    
    const dataToSend = {
      proceso: editingPaso.proceso_id,
      iden: editingPaso.iden,
      actividad: editingPaso.actividad,
      tiempo_estimado: editingPaso.tiempo_estimado,
    };

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        alert(`Paso ${isNew ? 'creado' : 'actualizado'} con éxito.`);
        await fetchPasos(selectedProcessId);
      } else {
        const errorData = await response.json();
        console.error("Error al guardar paso:", errorData);
        alert("Error al guardar paso: " + JSON.stringify(errorData));
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("Error de red al guardar paso.");
    } finally {
      setShowStepModal(false);
      setEditingPaso(null);
    }
  };

  const handleDeletePaso = async (pasoId) => {
    if (!window.confirm("¿Estás seguro de eliminar este paso?")) return;
    
    const DELETE_URL = `${PASOS_API_URL}${pasoId}/`;
    
    try {
      const response = await fetch(DELETE_URL, { method: 'DELETE' });
      if (response.status === 204) {
        await fetchPasos(selectedProcessId);
      } else {
        alert("Error al eliminar paso.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditClick = (processData) => {
    setEditingProcess({ ...processData });
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingProcess(null);
  };

  const handleSaveProcess = async (e) => {
    e.preventDefault();
    const isNew = !editingProcess.id;
    
    if (!editingProcess.name || !editingProcess.description || 
        !editingProcess.requirements || !editingProcess.time || !editingProcess.responsable) {
      alert("Todos los campos (Nombre, Descripción, Requisitos, Tiempo y Responsable) son obligatorios.");
      return;
    }
    
    const processData = {
      nombre: editingProcess.name,
      descripcion: editingProcess.description,
      requisitos_data: [
        { descripcion: editingProcess.requirements } 
      ],
      pasos_data: [
        { 
          iden: "Paso 1", 
          actividad: editingProcess.description,
          tiempo_estimado: editingProcess.time 
        }
      ],
      responsable: editingProcess.responsable
    };
    
    let url = PROCESOS_API_URL;
    let method = 'POST';
    
    if (!isNew) {
      url = `${PROCESOS_API_URL}${editingProcess.id}/`;
      method = 'PUT';
    } 

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processData),
      });

      if (response.ok) {
        alert(`Proceso ${isNew ? 'registrado' : 'actualizado'} con éxito.`);
        await fetchProcesses();
      } else {
        const errorData = await response.json();
        console.error("Error al guardar:", errorData);
        alert("Error al guardar: " + JSON.stringify(errorData));
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("No se pudo conectar con el servidor.");
    }
    
    handleCloseModal();
  };

  const handleDeleteProcess = async (id) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar este proceso? Esta acción es irreversible.`)) {
      return;
    }

    const DELETE_URL = `${PROCESOS_API_URL}${id}/`;

    try {
      const response = await fetch(DELETE_URL, {
        method: 'DELETE',
      });

      if (response.status === 204) { 
        setProcessesList(processesList.filter((p) => p.id !== id));
      } else {
        console.error("Error al eliminar proceso:", response.status);
        alert("Error al eliminar el proceso. El servidor rechazó la petición.");
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("Error de red al intentar eliminar el proceso.");
    }
  };

  const handleAddProcess = () => {
    const newProcess = {
      id: null,
      name: "",
      description: "",
      requirements: "",
      time: "",
      responsable: ""
    };
    setEditingProcess(newProcess);
    setShowEditModal(true);
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="adminP-container">
        <main className="adminP-main">
          <h2 style={{ textAlign: 'center', marginTop: '50px' }}>
            Cargando procesos...
          </h2>
        </main>
      </div>
    );
  }

  return (
    <div className="adminP-container">
      {/* Header */}
      <header className="adminP-header">
        <div className="adminP-header-left">
          {user?.rol === 'SUPER' && (
            <button className="admin-user-back-btn" onClick={handleBack} title="Volver">
              <i className="bi bi-chevron-double-left"></i>
            </button>
          )}
          <h1 className="adminP-title">TalkinPon</h1>
        </div>

        <div className="superadmin-user-menu-wrapper">
          <button className="superadmin-user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
            <i className="bi bi-person-circle"></i> {getRoleDisplayName(user?.rol)}
          </button>
          {showUserMenu && (
            <div className="superadmin-user-dropdown">
              <button
                className="superadmin-dropdown-item"
                onClick={() => {
                  onViewInfo();
                  setShowUserMenu(false);
                }}
              >
                <i className="bi bi-info-circle"></i> Ver información
              </button>
              <button
                className="superadmin-dropdown-item logout"
                onClick={handleLogoutAndGoBack}
              >
                <i className="bi bi-box-arrow-right"></i> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="adminP-main">
        <div className="adminP-section">
          <h2 className="adminP-section-header">Gestión de Procesos</h2>

          {/* Tabla de Procesos */}
          <div className="adminU-table-container">
            <div className="adminU-table-header-toggle">
              <h3><i className="bi bi-diagram-3"></i> Procesos ({processesList.length})</h3>
              <button
                className="adminU-add-user-btn"
                onClick={handleAddProcess}
              >
                <i className="bi bi-plus-circle"></i> Agregar nuevo Proceso
              </button>
              <button onClick={() => toggleTableVisibility('processes')} className="adminU-toggle-button">
                <i className={`bi bi-chevron-down adminU-toggle-icon ${showProcesses ? 'open' : ''}`}></i>
              </button>
            </div>

            {/* FILTROS Y BUSCADOR para Procesos */}
            {showProcesses && (
              <>
                <div className="adminU-filter-section">
                  <div className="adminU-search-top">
                    <span className="adminU-search-label">Buscar por atributo: </span>
                  </div>

                  <div className="adminU-attr-checkboxes">
                    <label className={`adminU-attr-checkbox ${processSearchAttr === 'name' ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={processSearchAttr === 'name'}
                        onChange={() => toggleAttr(processSearchAttr, setProcessSearchAttr, "name")}
                      />
                      Nombre
                    </label>

                    <label className={`adminU-attr-checkbox ${processSearchAttr === 'description' ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={processSearchAttr === 'description'}
                        onChange={() => toggleAttr(processSearchAttr, setProcessSearchAttr, "description")}
                      />
                      Descripción
                    </label>

                    <label className={`adminU-attr-checkbox ${processSearchAttr === 'responsable' ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={processSearchAttr === 'responsable'}
                        onChange={() => toggleAttr(processSearchAttr, setProcessSearchAttr, "responsable")}
                      />
                      Responsable
                    </label>
                  </div>

                  <div className="adminU-search-row">
                    <div className="adminU-search-input-wrap">
                      <i className="bi bi-search"></i>
                      <input
                        type="text"
                        className="adminU-search-input"
                        placeholder={
                          processSearchAttr
                            ? `Buscar por ${processSearchAttr.replace("_", " ")}...`
                            : "Selecciona un atributo…"
                        }
                        value={processSearchTerm}
                        onChange={handleProcessSearchChange}
                        disabled={!processSearchAttr}
                        aria-label="Buscar procesos"
                      />
                    </div>
                  </div>
                </div>

                {/* Tabla */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="adminU-table">
                    <thead>
                      <tr>
                        <th>Nombre del Proceso</th>
                        <th>Descripción</th>
                        <th>Requisitos</th>
                        <th>Responsable</th>
                        <th>Tiempo Estimado</th>
                        <th>Pasos</th>
                        <th>Opciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProcesses.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                            No hay procesos que coincidan
                          </td>
                        </tr>
                      ) : (
                        filteredProcesses.map((p) => (
                          <tr key={p.id}>
                            <td><strong>{p.name}</strong></td>
                            <td>{p.description || '-'}</td>
                            <td>{p.requirements || '-'}</td>
                            <td>
                              <span style={{
                                background: '#e3f2fd',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                {p.responsable || '-'}
                              </span>
                            </td>
                            <td>{p.time || '-'}</td>
                            <td>
                              {p.num_pasos || 0}
                              <button
                                className="adminU-btn-view"
                                onClick={() => handleViewSteps(p.id)}
                                style={{
                                  marginLeft: "10px",
                                  background: "none",
                                  color: "#1d3557",
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "1rem",
                                  fontWeight: "900px",
                                }}
                                title={selectedProcessId === p.id ? "Ocultar Pasos" : "Ver Pasos"}
                              >
                                <i className="bi bi-eye-fill"></i>
                              </button>
                            </td>
                            <td>
                              <button
                                className="adminU-option-btn edit"
                                onClick={() => handleEditClick(p)}
                                title="Editar"
                              >
                                <i className="bi bi-pencil-fill"></i>
                              </button>
                              <button
                                className="adminU-option-btn delete"
                                onClick={() => handleDeleteProcess(p.id)}
                                title="Eliminar"
                              >
                                <i className="bi bi-trash-fill"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* TABLA DE PASOS - Modal estilo grande */}
        {selectedProcessId && showStepsModal && (
          <div className="adminU-modal-overlay salones-list">
            <div className="adminU-modal-large">
              <button className="adminU-salones-close" onClick={closeStepsModal}>
                <i className="bi bi-x-lg"></i>
              </button>

              <h2 style={{ marginBottom: "10px" }}>
                <i className="bi bi-list-ol"></i> Pasos del Proceso:{" "}
                <strong>{processesList.find(p => p.id === selectedProcessId)?.name}</strong>
              </h2>

              <button
                className="adminU-add-user-btn"
                style={{ marginBottom: "15px" }}
                onClick={() => handleAddEditPaso()}
              >
                <i className="bi bi-plus-circle"></i> Agregar nuevo Paso
              </button>

              <div className="adminU-table-container" style={{ marginTop: "15px" }}>
                <table className="adminU-table">
                  <thead>
                    <tr>
                      <th>Identificador</th>
                      <th>Actividad</th>
                      <th>Tiempo Estimado</th>
                      <th style={{ width: "120px" }}>Opciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {currentPasos.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center", padding: "20px" }}>
                          Este proceso no tiene pasos registrados.
                        </td>
                      </tr>
                    ) : (
                      currentPasos.map((paso) => (
                        <tr key={paso.id}>
                          <td><strong>{paso.iden}</strong></td>
                          <td>{paso.actividad}</td>
                          <td>
                            <span
                              style={{
                                background: "#d1ecf1",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "12px"
                              }}
                            >
                              {paso.tiempo_estimado}
                            </span>
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <button
                              className="adminU-option-btn edit"
                              title="Editar"
                              onClick={() => handleAddEditPaso(paso)}
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </button>

                            <button
                              className="adminU-option-btn delete"
                              title="Eliminar"
                              onClick={() => handleDeletePaso(paso.id)}
                            >
                              <i className="bi bi-trash-fill"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Edición de Proceso */}
      {showEditModal && editingProcess && (
        <div className="adminU-modal-overlay form-salon" onClick={handleCloseModal}>
          <div className="adminU-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adminU-modal-header">
              <h2>
                {editingProcess.id ? "Editar Proceso" : "Agregar Proceso"}
              </h2>
              <button className="adminU-modal-close" onClick={handleCloseModal}>✕</button>
            </div>

            <form className="adminU-edit-form" onSubmit={handleSaveProcess}>
              <div className="adminU-form-group">
                <label><i className="bi bi-diagram-3"></i> Nombre del Proceso:</label>
                <input
                  type="text"
                  value={editingProcess.name || ''}
                  onChange={(e) => setEditingProcess({ ...editingProcess, name: e.target.value })}
                  placeholder="Ej: Inscripción, Titulación..."
                  required
                />
              </div>

              <div className="adminU-form-group">
                <label><i className="bi bi-card-text"></i> Descripción:</label>
                <input
                  type="text"
                  value={editingProcess.description || ''}
                  onChange={(e) => setEditingProcess({ ...editingProcess, description: e.target.value })}
                  placeholder="Descripción del proceso"
                  required
                />
              </div>

              <div className="adminU-form-group">
                <label><i className="bi bi-clipboard-check"></i> Requisitos:</label>
                <input
                  type="text"
                  value={editingProcess.requirements || ''}
                  onChange={(e) => setEditingProcess({ ...editingProcess, requirements: e.target.value })}
                  placeholder="Requisitos necesarios"
                  required
                />
              </div>

              <div className="adminU-form-group">
                <label><i className="bi bi-person-badge"></i> Responsable:</label>
                <input
                  type="text"
                  value={editingProcess.responsable || ''}
                  onChange={(e) => setEditingProcess({ ...editingProcess, responsable: e.target.value })}
                  placeholder="Entidad responsable (ej: Depto. Servicios Escolares)"
                  required
                />
              </div>

              <div className="adminU-form-group">
                <label><i className="bi bi-clock"></i> Tiempo Estimado:</label>
                <input
                  type="text"
                  value={editingProcess.time || ''}
                  onChange={(e) => setEditingProcess({ ...editingProcess, time: e.target.value })}
                  placeholder="Ej: 2-3 días hábiles"
                  required
                />
              </div>

              <div className="adminU-form-actions">
                <button type="button" className="adminU-btn-cancel" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="adminU-btn-save">
                  <i className="bi bi-check-circle"></i> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE GESTIÓN DE PASOS */}
      {showStepModal && editingPaso && (
        <div className="adminU-modal-overlay form-salon" onClick={() => setShowStepModal(false)}>
          <div className="adminU-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adminU-modal-header">
              <h2>{editingPaso.id ? "Editar Paso" : "Agregar Paso"}</h2>
              <button className="adminU-modal-close" onClick={() => setShowStepModal(false)}>✕</button>
            </div>

            <form className="adminU-edit-form" onSubmit={handleSavePaso}>
              <div className="adminU-form-group">
                <label><i className="bi bi-hash"></i> Identificador:</label>
                <input
                  type="text"
                  value={editingPaso.iden || ''}
                  onChange={(e) => setEditingPaso({ ...editingPaso, iden: e.target.value })}
                  placeholder="Ej: P1, P2, P3..."
                  required
                />
              </div>

              <div className="adminU-form-group">
                <label><i className="bi bi-card-list"></i> Actividad:</label>
                <input
                  type="text"
                  value={editingPaso.actividad || ''}
                  onChange={(e) => setEditingPaso({ ...editingPaso, actividad: e.target.value })}
                  placeholder="Descripción de la actividad"
                  required
                />
              </div>

              <div className="adminU-form-group">
                <label><i className="bi bi-clock-history"></i> Tiempo Estimado:</label>
                <input
                  type="text"
                  value={editingPaso.tiempo_estimado || ''}
                  onChange={(e) => setEditingPaso({ ...editingPaso, tiempo_estimado: e.target.value })}
                  placeholder="Ej: 30 minutos, 1 hora..."
                  required
                />
              </div>

              <div className="adminU-form-actions">
                <button type="button" className="adminU-btn-cancel" onClick={() => setShowStepModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="adminU-btn-save">
                  <i className="bi bi-check-circle"></i> Guardar Paso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminP;
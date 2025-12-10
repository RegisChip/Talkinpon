import { useState, useEffect } from "react";
import "./styles/AdminP.css";
import { useNavigate } from "react-router-dom";

const PROCESOS_API_URL = "http://localhost:8000/api/procesos/";
const PASOS_API_URL = "http://localhost:8000/api/procesos/pasos/";
const REQUISITOS_PASO_API_URL = "http://localhost:8000/api/procesos/requisitos-paso/";
const ENTIDADES_API_URL = "http://localhost:8000/api/procesos/entidades/";
const PASO_RESPONSABLE_API_URL = "http://localhost:8000/api/procesos/paso-responsable/";

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
  const [showProcesses, setShowProcesses] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(false);

  // Estados para requisitos de paso y entidades responsables
  const [showRequisitoModal, setShowRequisitoModal] = useState(false);
  const [editingRequisito, setEditingRequisito] = useState(null);
  const [currentRequisitos, setCurrentRequisitos] = useState([]);
  const [selectedPasoId, setSelectedPasoId] = useState(null);

  const [entidades, setEntidades] = useState([]);
  const [showEntidadModal, setShowEntidadModal] = useState(false);
  const [editingEntidad, setEditingEntidad] = useState(null);
  const [showAsignarResponsableModal, setShowAsignarResponsableModal] = useState(false);
  const [selectedPasoForResponsable, setSelectedPasoForResponsable] = useState(null);

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

  // ====== FUNCIONES BÁSICAS ======
  
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

  // ====== FUNCIONES PARA ENTIDADES RESPONSABLES ======

  const fetchEntidades = async () => {
    try {
      const response = await fetch(ENTIDADES_API_URL);
      if (response.ok) {
        const data = await response.json();
        setEntidades(data);
      }
    } catch (error) {
      console.error("Error al cargar entidades:", error);
    }
  };

  const handleAddEditEntidad = (entidad = null) => {
    setEditingEntidad(entidad || { id: null, nombre: '' });
    setShowEntidadModal(true);
  };

  const handleSaveEntidad = async (e) => {
    e.preventDefault();
    const isNew = !editingEntidad.id;
    const url = isNew ? ENTIDADES_API_URL : `${ENTIDADES_API_URL}${editingEntidad.id}/`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editingEntidad.nombre }),
      });

      if (response.ok) {
        alert(`Entidad ${isNew ? 'creada' : 'actualizada'} con éxito.`);
        await fetchEntidades();
      } else {
        alert("Error al guardar entidad.");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setShowEntidadModal(false);
      setEditingEntidad(null);
    }
  };

  const handleDeleteEntidad = async (id) => {
    if (!window.confirm("¿Eliminar esta entidad?")) return;
    try {
      const response = await fetch(`${ENTIDADES_API_URL}${id}/`, { method: 'DELETE' });
      if (response.status === 204) {
        await fetchEntidades();
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // ====== FUNCIONES PARA REQUISITOS DE PASO ======

  const fetchRequisitosPaso = async (pasoId) => {
    if (!pasoId) return;
    try {
      const response = await fetch(`${REQUISITOS_PASO_API_URL}?paso_id=${pasoId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentRequisitos(data);
      }
    } catch (error) {
      console.error("Error al cargar requisitos:", error);
    }
  };

  const handleAddEditRequisitoPaso = (requisito = null) => {
    if (!selectedPasoId) {
      alert("Selecciona un paso primero.");
      return;
    }
    setEditingRequisito(requisito || { id: null, descripcion: '', paso_id: selectedPasoId });
    setShowRequisitoModal(false);
    setTimeout(() => {
      setEditingRequisito(requisito || { id: null, descripcion: '', paso_id: selectedPasoId });
    }, 50);
  };

  const handleSaveRequisitoPaso = async (e) => {
    e.preventDefault();
    const isNew = !editingRequisito.id;
    const url = isNew ? REQUISITOS_PASO_API_URL : `${REQUISITOS_PASO_API_URL}${editingRequisito.id}/`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: editingRequisito.descripcion,
          paso: editingRequisito.paso_id
        }),
      });

      if (response.ok) {
        alert(`Requisito ${isNew ? 'creado' : 'actualizado'} con éxito.`);
        await fetchRequisitosPaso(selectedPasoId);
      } else {
        alert("Error al guardar requisito.");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setEditingRequisito(null);
    }
  };

  const handleDeleteRequisitoPaso = async (id) => {
    if (!window.confirm("¿Eliminar este requisito?")) return;
    try {
      const response = await fetch(`${REQUISITOS_PASO_API_URL}${id}/`, { method: 'DELETE' });
      if (response.status === 204) {
        await fetchRequisitosPaso(selectedPasoId);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // ====== FUNCIONES PARA ASIGNAR RESPONSABLES A PASOS ======

  const handleAsignarResponsable = (paso) => {
    setSelectedPasoForResponsable(paso);
    setShowAsignarResponsableModal(true);
  };

  const handleSaveAsignacion = async (e) => {
    e.preventDefault();
    const entidadId = e.target.entidad.value;
    
    if (!entidadId) {
      alert("Selecciona una entidad.");
      return;
    }

    try {
      const response = await fetch(PASO_RESPONSABLE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paso: selectedPasoForResponsable.id,
          entidad: entidadId
        }),
      });

      if (response.ok) {
        alert("Responsable asignado con éxito.");
        await fetchPasos(selectedProcessId);
      } else {
        alert("Error al asignar responsable.");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setShowAsignarResponsableModal(false);
      setSelectedPasoForResponsable(null);
    }
  };

  const handleDeletePasoResponsable = async (pasoResponsableId) => {
    if (!window.confirm("¿Eliminar esta asignación?")) return;
    try {
      const response = await fetch(`${PASO_RESPONSABLE_API_URL}${pasoResponsableId}/`, { method: 'DELETE' });
      if (response.status === 204) {
        await fetchPasos(selectedProcessId);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

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
    fetchEntidades();
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
    
    console.log("selectedProcessId:", selectedProcessId); // ✅ DEBUG
    
    const newPaso = paso ? { 
      ...paso, 
      proceso_id: paso.proceso // ✅ Aseguramos que proceso_id esté presente
    } : {
      id: null,
      iden: '',
      actividad: '',
      tiempo_estimado: '',
      proceso_id: selectedProcessId, // ✅ Debe tener valor aquí
    };
    
    console.log("editingPaso inicial:", newPaso); // ✅ DEBUG
    
    setEditingPaso(newPaso);
    setShowStepModal(true);
  };

const handleSavePaso = async (e) => {
  e.preventDefault();
  
  console.log("=== DEBUG INICIO ===");
  console.log("1. editingPaso completo:", editingPaso);
  console.log("2. editingPaso.proceso_id:", editingPaso.proceso_id);
  console.log("3. selectedProcessId:", selectedProcessId);
  
  const isNew = !editingPaso.id;
  
  if (!editingPaso.iden || !editingPaso.actividad || !editingPaso.tiempo_estimado) {
    alert("Todos los campos del paso son obligatorios.");
    return;
  }
  
  // ✅ VALIDACIÓN EXTRA
  if (!editingPaso.proceso_id) {
    console.error("ERROR: proceso_id es null o undefined");
    alert("Error: No se ha seleccionado un proceso. Cierra y vuelve a abrir el modal.");
    return;
  }

  const url = isNew ? PASOS_API_URL : `${PASOS_API_URL}${editingPaso.id}/`;
  const method = isNew ? 'POST' : 'PUT';
  
  const dataToSend = {
    proceso: parseInt(editingPaso.proceso_id), // ✅ Convertir a número entero
    iden: editingPaso.iden,
    actividad: editingPaso.actividad,
    tiempo_estimado: editingPaso.tiempo_estimado,
  };

  console.log("4. Datos a enviar:", dataToSend);
  console.log("5. URL:", url);
  console.log("6. Method:", method);
  console.log("=== DEBUG FIN ===");

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
      console.error("Error del servidor:", errorData);
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
  
  console.log("\n" + "=".repeat(80));
  console.log("📤 ENVIANDO PROCESO AL BACKEND");
  console.log("=".repeat(80));
  
  const isNew = !editingProcess.id;
  console.log(`Modo: ${isNew ? 'CREAR NUEVO' : 'ACTUALIZAR'}`);
  console.log(`ID del proceso: ${editingProcess.id || 'N/A'}`);

  // ✅ Validar campos obligatorios
  if (!editingProcess.name || !editingProcess.description) {
    alert("El nombre y la descripción son obligatorios.");
    return;
  }

  // ✅ Procesar requisitos correctamente
  const requirementsText = editingProcess.requirements || '';
  console.log(`\n📋 Requisitos (texto original): "${requirementsText}"`);
  
  const requisitos = requirementsText
    .split(',')
    .map(r => r.trim())
    .filter(r => r !== "" && r.length > 0)
    .map(r => ({ descripcion: r }));

  console.log(`📋 Requisitos procesados (${requisitos.length}):`, requisitos);

  // ✅ Construir el payload
  const processData = {
    nombre: editingProcess.name,
    descripcion: editingProcess.description,
    requisitos_data: requisitos
  };

  console.log("\n📦 Payload completo a enviar:");
  console.log(JSON.stringify(processData, null, 2));

  // ✅ Configurar URL y método
  let url = PROCESOS_API_URL;
  let method = 'POST';

  if (!isNew) {
    url = `${PROCESOS_API_URL}${editingProcess.id}/`;
    method = 'PUT';
  }

  console.log(`\n🌐 URL: ${url}`);
  console.log(`🔧 Método: ${method}`);

  try {
    console.log("\n⏳ Enviando petición...");
    
    const response = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(processData),
    });

    console.log(`\n📡 Respuesta recibida: Status ${response.status} ${response.statusText}`);

    if (response.ok) {
      const responseData = await response.json();
      console.log("✅ Respuesta exitosa del servidor:");
      console.log(JSON.stringify(responseData, null, 2));
      
      alert(`✅ Proceso ${isNew ? 'creado' : 'actualizado'} con éxito.`);
      
      // Recargar la lista de procesos
      await fetchProcesses();
      
      // Cerrar el modal
      handleCloseModal();
      
      console.log("=".repeat(80));
      console.log("✅ PROCESO COMPLETADO CON ÉXITO");
      console.log("=".repeat(80) + "\n");
      
    } else {
      // Intentar obtener el error del servidor
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        console.error("❌ Error del servidor (JSON):", errorData);
        errorMessage = JSON.stringify(errorData, null, 2);
      } catch (jsonError) {
        // Si no es JSON, intentar obtener como texto
        try {
          const errorText = await response.text();
          console.error("❌ Error del servidor (texto):", errorText);
          errorMessage = errorText;
        } catch (textError) {
          console.error("❌ No se pudo leer el error del servidor");
        }
      }
      
      alert(`❌ Error del servidor:\n${errorMessage}`);
      
      console.log("=".repeat(80));
      console.log("❌ PROCESO FALLIDO");
      console.log("=".repeat(80) + "\n");
    }
    
  } catch (error) {
    console.error("\n💥 Error de red o excepción:");
    console.error(error);
    alert("❌ No se pudo conectar con el servidor. Verifica tu conexión y que el backend esté corriendo.");
    
    console.log("=".repeat(80));
    console.log("💥 ERROR DE RED");
    console.log("=".repeat(80) + "\n");
  }
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

              <div className="adminU-header-buttons">
                <button
                  className="adminU-add-user-btn"
                  // style={{ background: '#28a745', marginRight:'20px' }}
                  onClick={() => handleAddEditEntidad()}
                >
                  <i className="bi bi-building"></i> Gestionar Entidades
                </button>

                <button
                  className="adminU-add-user-btn"
                  onClick={handleAddProcess}
                >
                  <i className="bi bi-plus-circle"></i> Agregar nuevo Proceso
                </button>

                <button
                  onClick={() => toggleTableVisibility('processes')}
                  className="adminU-toggle-button"
                >
                  <i className={`bi bi-chevron-down adminU-toggle-icon ${showProcesses ? 'open' : ''}`}></i>
                </button>
              </div>
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
                        <th>Pasos</th>
                        <th>Opciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProcesses.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
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
                              {p.num_pasos || 0}
                              <button
                                className="adminU-btn-view"
                                onClick={() => handleViewSteps(p.id)}
                                style={{
                                  marginLeft: "10px",
                                  background: "none",
                                  color: "#1d3557",
                                  padding: "4px 5px",
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

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <button
                  className="adminU-add-user-btn"
                  onClick={() => handleAddEditPaso()}
                >
                  <i className="bi bi-plus-circle"></i> Agregar Paso
                </button>

              </div>

              <div className="adminU-table-container" style={{ marginTop: "15px" }}>
                <table className="adminU-table">
                  <thead>
                    <tr>
                      <th>Identificador</th>
                      <th>Actividad</th>
                      <th>Tiempo Estimado</th>
                      <th>Responsables</th>
                      <th>Requisitos</th>
                      <th style={{ width: "120px" }}>Opciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {currentPasos.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
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

<td>
  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
    {paso.responsables_nombres && paso.responsables_nombres.length > 0 ? (
      paso.responsables_nombres.map((resp, idx) => (
        <span
          key={idx}
          style={{
            background: "#e3f2fd",
            padding: "2px 4px",
            borderRadius: "3px",
            fontSize: "11px",
          }}
        >
          {resp}
        </span>
      ))
    ) : (
      <span style={{ color: '#999', fontSize: '12px' }}>Sin asignar</span>
    )}

    <button
      className="adminU-btn-view"
      onClick={() => handleAsignarResponsable(paso)}
      style={{
        marginLeft: "8px",
        background: "none",
        color: "#28a745",
        padding: "2px 4px",
        border: "none",
        cursor: "pointer",
        fontSize: "0.9rem"
      }}
      title="Asignar Responsable"
    >
      <i className="bi bi-person-plus-fill"></i>
    </button>
  </div>
</td>


                          <td>
                            {paso.requisitos_count || 0}
                            <button
                              className="adminU-btn-view"
                              onClick={() => {
                                setSelectedPasoId(paso.id);
                                fetchRequisitosPaso(paso.id);
                                setShowRequisitoModal(true);
                              }}
                              style={{
                                marginLeft: "8px",
                                background: "none",
                                color: "#1d3557",
                                padding: "2px 4px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.9rem"
                              }}
                              title="Ver Requisitos"
                            >
                              <i className="bi bi-clipboard-check"></i>
                            </button>
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

      {/* MODAL DE GESTIÓN DE ENTIDADES RESPONSABLES */}
      {showEntidadModal && (
        <div className="adminU-modal-overlay form-salon" onClick={() => setShowEntidadModal(false)}>
          <div className="adminU-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adminU-modal-header">
              <h2><i className="bi bi-building"></i> Gestión de Entidades Responsables</h2>
              <button className="adminU-modal-close" onClick={() => setShowEntidadModal(false)}>✕</button>
            </div>

            {editingEntidad && (
              <form className="adminU-edit-form" onSubmit={handleSaveEntidad} style={{ marginBottom: '20px' }}>
                <div className="adminU-form-group">
                  <label><i className="bi bi-building"></i> Nombre de la Entidad:</label>
                  <input
                    type="text"
                    value={editingEntidad.nombre || ''}
                    onChange={(e) => setEditingEntidad({ ...editingEntidad, nombre: e.target.value })}
                    placeholder="Ej: Departamento de Servicios Escolares"
                    required
                  />
                </div>

                <div className="adminU-form-actions">
                  <button type="button" className="adminU-btn-cancel" onClick={() => setEditingEntidad(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="adminU-btn-save">
                    <i className="bi bi-check-circle"></i> Guardar
                  </button>
                </div>
              </form>
            )}

            <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Entidades Existentes:</h3>
            <div className="adminU-table-container">
              <table className="adminU-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th style={{ width: '120px' }}>Opciones</th>
                  </tr>
                </thead>
                <tbody>
                  {entidades.length === 0 ? (
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center', padding: '20px' }}>
                        No hay entidades registradas
                      </td>
                    </tr>
                  ) : (
                    entidades.map((ent) => (
                      <tr key={ent.id}>
                        <td><strong>{ent.nombre}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="adminU-option-btn edit"
                            onClick={() => handleAddEditEntidad(ent)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          <button
                            className="adminU-option-btn delete"
                            onClick={() => handleDeleteEntidad(ent.id)}
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
          </div>
        </div>
      )}

      {/* MODAL DE REQUISITOS DEL PASO */}
      {showRequisitoModal && selectedPasoId && (
        <div className="adminU-modal-overlay form-salon" onClick={() => setShowRequisitoModal(false)}>
          <div className="adminU-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adminU-modal-header">
              <h2><i className="bi bi-clipboard-check"></i> Requisitos del Paso</h2>
              <button className="adminU-modal-close" onClick={() => setShowRequisitoModal(false)}>✕</button>
            </div>

            <button
              className="adminU-add-user-btn"
              style={{ marginBottom: '15px' }}
              onClick={() => handleAddEditRequisitoPaso()}
            >
              <i className="bi bi-plus-circle"></i> Agregar Requisito
            </button>

            <div className="adminU-table-container">
              <table className="adminU-table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th style={{ width: '120px' }}>Opciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRequisitos.length === 0 ? (
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center', padding: '20px' }}>
                        Este paso no tiene requisitos
                      </td>
                    </tr>
                  ) : (
                    currentRequisitos.map((req) => (
                      <tr key={req.id}>
                        <td>{req.descripcion}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="adminU-option-btn edit"
                            onClick={() => {
                              setShowRequisitoModal(false);
                              setEditingRequisito({ ...req, paso_id: req.paso });
                            }}
                            title="Editar"
                          >
                            <i className="bi bi-pencil-fill"></i>
                          </button>
                          <button
                            className="adminU-option-btn delete"
                            onClick={() => handleDeleteRequisitoPaso(req.id)}
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
          </div>
        </div>
      )}

      {/* MODAL PARA AGREGAR/EDITAR REQUISITO */}
      {editingRequisito && !showRequisitoModal && (
        <div className="adminU-modal-overlay form-salon" onClick={() => setEditingRequisito(null)}>
          <div className="adminU-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adminU-modal-header">
              <h2>{editingRequisito.id ? "Editar Requisito" : "Agregar Requisito"}</h2>
              <button className="adminU-modal-close" onClick={() => setEditingRequisito(null)}>✕</button>
            </div>

            <form className="adminU-edit-form" onSubmit={handleSaveRequisitoPaso}>
              <div className="adminU-form-group">
                <label><i className="bi bi-card-text"></i> Descripción:</label>
                <textarea
                  value={editingRequisito.descripcion || ''}
                  onChange={(e) => setEditingRequisito({ ...editingRequisito, descripcion: e.target.value })}
                  placeholder="Descripción del requisito"
                  rows="3"
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>

              <div className="adminU-form-actions">
                <button type="button" className="adminU-btn-cancel" onClick={() => setEditingRequisito(null)}>
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

      {/* MODAL PARA ASIGNAR RESPONSABLE A PASO */}
      {showAsignarResponsableModal && selectedPasoForResponsable && (
        <div className="adminU-modal-overlay form-salon" onClick={() => setShowAsignarResponsableModal(false)}>
          <div className="adminU-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adminU-modal-header">
              <h2><i className="bi bi-person-plus"></i> Asignar Responsable</h2>
              <button className="adminU-modal-close" onClick={() => setShowAsignarResponsableModal(false)}>✕</button>
            </div>

            <p style={{ marginBottom: '15px' }}>
              <strong>Paso:</strong> {selectedPasoForResponsable.iden} - {selectedPasoForResponsable.actividad}
            </p>

            <form className="adminU-edit-form" onSubmit={handleSaveAsignacion}>
              <div className="adminU-form-group">
                <label><i className="bi bi-building"></i> Seleccionar Entidad:</label>
                <select
                  name="entidad"
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                >
                  <option value="">-- Selecciona una entidad --</option>
                  {entidades.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="adminU-form-actions">
                <button type="button" className="adminU-btn-cancel" onClick={() => setShowAsignarResponsableModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="adminU-btn-save">
                  <i className="bi bi-check-circle"></i> Asignar
                </button>
              </div>
            </form>

            {/* Mostrar responsables actuales */}
            {selectedPasoForResponsable.responsables_data && selectedPasoForResponsable.responsables_data.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ marginBottom: '10px' }}>Responsables Actuales:</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedPasoForResponsable.responsables_data.map((resp) => (
                    <div
                      key={resp.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px',
                        background: '#f8f9fa',
                        borderRadius: '4px'
                      }}
                    >
                      <span>{resp.nombre}</span>
                      <button
                        className="adminU-option-btn delete"
                        onClick={() => handleDeletePasoResponsable(resp.id)}
                        title="Eliminar"
                      >
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminP;
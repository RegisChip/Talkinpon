import { useState, useEffect } from "react";
import "./styles/AdminU.css";
import { useNavigate } from "react-router-dom";
import MapaModal from './MapaModal';

// URLs de la API - Ajustadas para Django REST Framework
const EDIFICIOS_API_URL = "http://localhost:8000/api/rest/edificios/";
const SALONES_API_URL = "http://localhost:8000/api/rest/salones/";
const AREAS_API_URL = "http://localhost:8000/api/rest/areas/";
const TIPOS_AREA_API_URL = "http://localhost:8000/api/rest/tipos-area/";


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

function AdminU({ locations, user, onLogout, onViewInfo }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [dataList, setDataList] = useState({ 
    buildings: [], 
    salones: [], 
    areas: [],
    tiposArea: []
  });
  const [modalType, setModalType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showBuildings, setShowBuildings] = useState(false);
  const [showSalones, setShowSalones] = useState(false);
  const [showAreas, setShowAreas] = useState(false);
  const navigate = useNavigate();

  const isEdificio = modalType === 'edificio';
  const isSalon = modalType === 'salon';
  const isArea = modalType === 'area';

  // --- Buscador / filtros para Edificios (poner dentro de AdminU, junto a otros useState)
  // ---- Edificios ----
  const [buildingSearchAttr, setBuildingSearchAttr] = useState(""); 
  const [buildingSearchTerm, setBuildingSearchTerm] = useState("");

  // ---- Salones ----
  const [showSalonesModal, setShowSalonesModal] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // ---- Áreas ----
  const [areaSearchAttr, setAreaSearchAttr] = useState("");
  const [areaSearchTerm, setAreaSearchTerm] = useState("");

  const [posicionSeleccionada, setPosicionSeleccionada] = useState(null);

  const handleSelectPosition = (position) => {
    // Actualizar los datos del formulario con las coordenadas seleccionadas
    setEditingData(prev => ({
      ...prev,
      pos_x: parseFloat(position.x),
      pos_y: parseFloat(position.y)
    }));
    
    // Cerrar el modal del mapa
    setShowMapModal(false);
    
    console.log('Posición seleccionada:', position);
  };

  const [showMapModal, setShowMapModal] = useState(false);
  const [editingData, setEditingData] = useState({
    pos_x: null,
    pos_y: null
  });
  const [ubicaciones, setUbicaciones] = useState([]);
  const [relaciones, setRelaciones] = useState([]);


  // Para contar resultados filtrados (se recalcula en render)
  //edificios
  const filteredBuildings = Array.isArray(dataList.buildings)
    ? dataList.buildings.filter((b) => {
        if (!buildingSearchTerm) return true;
        // Normalizamos el campo según el atributo seleccionado
        let fieldVal = '';
        if (buildingSearchAttr === 'nombre') fieldVal = b.nombre || '';
        else if (buildingSearchAttr === 'nombre_especial') fieldVal = b.nombre_especial || '';
        return fieldVal.toString().toLowerCase().includes(buildingSearchTerm.toLowerCase());
      })
  : [];

  // Cargar ubicaciones y relaciones desde Django
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ajusta la URL según tu configuración de Django
        const ubicacionesRes = await fetch('/api/ubicaciones/');
        const ubicacionesData = await ubicacionesRes.json();
        setUbicaciones(ubicacionesData);

        const relacionesRes = await fetch('/api/relaciones/');
        const relacionesData = await relacionesRes.json();
        setRelaciones(relacionesData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    fetchData();
  }, []);

  // areas
  const filteredAreas = Array.isArray(dataList.areas)
    ? dataList.areas.filter((a) => {
        if (!areaSearchTerm) return true;

        let fieldVal = '';

        if (areaSearchAttr === 'nombre') fieldVal = a.nombre || '';
        else if (areaSearchAttr === 'tipo') fieldVal = a.tipo_nombre || '';
        else if (areaSearchAttr === 'edificio') fieldVal = a.edificio_nombre || '';

        return fieldVal.toString().toLowerCase().includes(areaSearchTerm.toLowerCase());
      })
    : [];

    const openSalonesModal = (building) => {
      setSelectedBuilding(building);
      setShowSalonesModal(true);
    };

    const closeSalonesModal = () => {
      setShowSalonesModal(false);
      setSelectedBuilding(null);
    };

  const handleAreaSearchChange = (e) => {
    setAreaSearchTerm(e.target.value);
  };


  // input handler
  const handleBuildingSearchChange = (e) => {
    setBuildingSearchTerm(e.target.value);
  };

  // Manejo de checkbox tipo “toggle único”, permite desmarcar
  const toggleAttr = (current, setter, value) => {
    if (current === value) setter(""); // desmarcar si ya estaba seleccionado
    else setter(value);                // seleccionar si era diferente
  };


  const toggleTableVisibility = (table) => {
    if (table === 'buildings') setShowBuildings(!showBuildings);
    if (table === 'salones') setShowSalones(!showSalones);
    if (table === 'areas') setShowAreas(!showAreas);
  };

  const handleLogoutAndGoBack = () => {
    if (onLogout) onLogout();
    navigate("/adminB");
    setShowUserMenu(false);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [edRes, salRes, areasRes, tiposRes] = await Promise.all([
        fetch(EDIFICIOS_API_URL),
        fetch(SALONES_API_URL),
        fetch(AREAS_API_URL),
        fetch(TIPOS_AREA_API_URL)
      ]);

      const buildings = edRes.ok ? await edRes.json() : [];
      const salones = salRes.ok ? await salRes.json() : [];
      const areas = areasRes.ok ? await areasRes.json() : [];
      const tiposArea = tiposRes.ok ? await tiposRes.json() : [];

      setDataList({ 
        buildings, 
        salones, 
        areas,
        tiposArea 
      });
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setError("Error al cargar datos del servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const handleEditClick = (data, type) => {
    // Normalizar datos según el tipo
    let initialData = { ...data };
    
    if (type === 'edificio') {
      initialData = {
        id_edificio: data.id_edificio || null,
        nombre: data.nombre || '',
        nombre_especial: data.nombre_especial || '',
        uso: data.uso || '',
        num_salones: data.num_salones || 0,
        pos_x: data.pos_x || 0,
        pos_y: data.pos_y || 0
      };
    } else if (type === 'salon') {
      initialData = {
        id_salon: data.id_salon || null,
        numero: data.numero || '',
        tipo: data.tipo || 'Aula',          // <-- Preseleccionamos 'Aula'
        capacidad: data.capacidad || 0,
        edificio: data.edificio || (selectedBuilding ? selectedBuilding.id_edificio : '') // <-- preseleccionado
      };
    } else if (type === 'area') {
      initialData = {
        id_area: data.id_area || null,
        nombre: data.nombre || '',
        tipo: data.tipo || '',
        edificio: data.edificio || ''
      };
    }
    
    setEditingData(initialData);
    setModalType(type);
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingData(null);
    setModalType(null);
  };

  const handleSaveData = async (e) => {
    e.preventDefault();

    let url, method, dataToSend;

    if (modalType === 'edificio') {
      const isNew = !editingData.id_edificio;
      url = isNew ? EDIFICIOS_API_URL : `${EDIFICIOS_API_URL}${editingData.id_edificio}/`;
      method = isNew ? 'POST' : 'PATCH';
      
      dataToSend = {
        nombre: editingData.nombre,
        nombre_especial: editingData.nombre_especial || null,
        uso: editingData.uso || '',
        num_salones: parseInt(editingData.num_salones) || 0,
        pos_x: parseFloat(editingData.pos_x) || 0,
        pos_y: parseFloat(editingData.pos_y) || 0,
      };
    } else if (modalType === 'salon') {
      const isNew = !editingData.id_salon;
      const edificioId = parseInt(editingData.edificio);
      
      if (isNaN(edificioId)) {
        alert("Por favor, selecciona un Edificio válido.");
        return;
      }

      url = isNew ? SALONES_API_URL : `${SALONES_API_URL}${editingData.id_salon}/`;
      method = isNew ? 'POST' : 'PATCH';
      
      dataToSend = {
        numero: editingData.numero,
        capacidad: parseInt(editingData.capacidad) || 0,
        tipo: editingData.tipo || '',
        edificio: edificioId,
      };
    } else if (modalType === 'area') {
      const isNew = !editingData.id_area;
      const edificioId = parseInt(editingData.edificio);
      const tipoId = parseInt(editingData.tipo);
      
      if (isNaN(edificioId) || isNaN(tipoId)) {
        alert("Por favor, selecciona Edificio y Tipo válidos.");
        return;
      }

      url = isNew ? AREAS_API_URL : `${AREAS_API_URL}${editingData.id_area}/`;
      method = isNew ? 'POST' : 'PATCH';
      
      dataToSend = {
        nombre: editingData.nombre,
        tipo: tipoId,
        edificio: edificioId,
      };
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        alert(`${modalType} ${!editingData.id_edificio && !editingData.id_salon && !editingData.id_area ? 'agregado' : 'actualizado'} con éxito.`);
        await fetchData();
        handleCloseModal();
      } else {
        const errorData = await response.json();
        console.error('Error del servidor:', errorData);
        alert(`Error al guardar ${modalType}: ${JSON.stringify(errorData)}`);
      }
    } catch (e) {
      console.error('Error de red:', e);
      alert("Error de red al guardar datos.");
    }
  };

  const handleDeleteData = async (id, type) => {
    if (!window.confirm(`¿Estás seguro de eliminar este ${type}?`)) return;

    let url;
    if (type === 'edificio') url = `${EDIFICIOS_API_URL}${id}/`;
    else if (type === 'salon') url = `${SALONES_API_URL}${id}/`;
    else if (type === 'area') url = `${AREAS_API_URL}${id}/`;

    try {
      const response = await fetch(url, { method: 'DELETE' });
      
      if (response.status === 204) {
        alert(`${type} eliminado con éxito.`);
        await fetchData();
      } else {
        const errorData = await response.json();
        alert(`Error al eliminar ${type}: ${JSON.stringify(errorData)}`);
      }
    } catch (e) {
      console.error('Error:', e);
      alert("Error de red al eliminar.");
    }
  };

  if (loading && dataList.buildings.length === 0) {
    return (
      <div className="adminU-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="adminU-container">
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
      <main className="adminU-main">
        {error && (
          <div style={{ 
            padding: '10px', 
            background: '#f8d7da', 
            color: '#721c24', 
            borderRadius: '5px',

          }}>
            {error}
          </div>
        )}

        <div className="adminU-section">
          <h2 className="adminU-section-header">Gestión de Ubicaciones</h2>

          {/* Tabla de Edificios */}
          <div className="adminU-table-container">
            <div className="adminU-table-header-toggle">
              <h3><i className="bi bi-building"></i> Edificios ({dataList.buildings.length})</h3>

              <div className="adminU-header-buttons">
                <button
                  className="adminU-add-user-btn"
                  onClick={() => handleEditClick({}, 'edificio')}
                >
                  <i className="bi bi-plus-circle"></i> Agregar nuevo Edificio
                </button>

                <button
                  onClick={() => toggleTableVisibility('buildings')}
                  className="adminU-toggle-button"
                >
                  <i className={`bi bi-chevron-down adminU-toggle-icon ${showBuildings ? 'open' : ''}`}></i>
                </button>
              </div>
            </div>


            {/* FILTROS Y BUSCADOR (solo para Edificios) */}
            {showBuildings && (
              <>
                <div className="adminU-filter-section">
                  {/* Linea superior: etiqueta + selector integrado */}
                  <div className="adminU-search-top">
                    <span className="adminU-search-label">Buscar por atributo: </span>
                  </div>

                    <div className="adminU-attr-checkboxes">
                      <label className={`adminU-attr-checkbox ${buildingSearchAttr === 'nombre' ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={buildingSearchAttr === 'nombre'}
                          onChange={() => toggleAttr(buildingSearchAttr, setBuildingSearchAttr, "nombre")}
                        />
                        Nombre
                      </label>

                      <label className={`adminU-attr-checkbox ${buildingSearchAttr === 'nombre_especial' ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={buildingSearchAttr === 'nombre_especial'}
                          onChange={() => toggleAttr(buildingSearchAttr, setBuildingSearchAttr, "nombre_especial")}
                        />
                        Nombre especial
                      </label>
                    </div>


                  {/* Barra de búsqueda */}
                  <div className="adminU-search-row">
                    <div className="adminU-search-input-wrap">
                      <i className="bi bi-search"></i>
                        <input
                          type="text"
                          className="adminU-search-input"
                          placeholder={
                            buildingSearchAttr
                              ? `Buscar por ${buildingSearchAttr.replace("_", " ")}...`
                              : "Selecciona un atributo…"
                          }
                          value={buildingSearchTerm}
                          onChange={handleBuildingSearchChange}
                          disabled={!buildingSearchAttr}   // <── ESTA ES LA LÍNEA IMPORTANTE
                          aria-label="Buscar edificios"
                        />
                    </div>
                  </div>
                </div>

                {/* Tabla (usa filteredBuildings en lugar de dataList.buildings) */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="adminU-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Nombre Especial</th>
                        <th>Uso</th>
                        <th>Ubicación (X, Y)</th>
                        <th>Nodo</th>
                        <th>Salones</th>
                        <th>Opciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBuildings.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                            No hay edificios que coincidan
                          </td>
                        </tr>
                      ) : (
                        filteredBuildings.map((b) => (
                          <tr key={b.id_edificio}>
                            <td><strong>{b.nombre}</strong></td>
                            <td>{b.nombre_especial || '-'}</td>
                            <td>{b.uso || '-'}</td>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                ({b.pos_x?.toFixed(1)}, {b.pos_y?.toFixed(1)})
                              </span>
                            </td>
                            <td>
                              <span style={{
                                background: '#e3f2fd',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                {b.nom_nodo || '-'}
                              </span>
                            </td>
                            <td>
                              {b.num_salones || 0}

                              <button
                                className="adminU-btn-view"
                                onClick={() => openSalonesModal(b)}
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
                              >
                                <i className="bi bi-eye-fill"></i>
                              </button>
                            </td>
                            <td>
                              <button
                                className="adminU-option-btn edit"
                                onClick={() => handleEditClick(b, 'edificio')}
                                title="Editar"
                              >
                                <i className="bi bi-pencil-fill"></i>
                              </button>
                              <button
                                className="adminU-option-btn delete"
                                onClick={() => handleDeleteData(b.id_edificio, 'edificio')}
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

          {/* Tabla de Áreas */}
          <div className="adminU-table-container">
            <div className="adminU-table-header-toggle">
              <h3><i className="bi bi-diagram-3"></i> Áreas y Departamentos ({dataList.areas.length})</h3>
              <button 
                className="adminU-add-user-btn" 
                onClick={() => handleEditClick({}, 'area')}
              >
                <i className="bi bi-plus-circle"></i> Agregar nueva Área
              </button>
              <button onClick={() => toggleTableVisibility('areas')} className="adminU-toggle-button">
                <i className={`bi bi-chevron-down adminU-toggle-icon ${showAreas ? 'open' : ''}`}></i>
              </button>
            </div>
            {showAreas && (
            <>

            {/* FILTRO Y BUSCADOR PARA ÁREAS */}
                <div className="adminU-filter-section">

                  <div className="adminU-search-top">
                    <span className="adminU-search-label">Buscar por atributo:</span>
                  </div>

                  <div className="adminU-attr-checkboxes">
                    <label className={`adminU-attr-checkbox ${areaSearchAttr === 'nombre' ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={areaSearchAttr === 'nombre'}
                        onChange={() => toggleAttr(areaSearchAttr, setAreaSearchAttr, "nombre")}
                      />
                      Nombre
                    </label>

                    <label className={`adminU-attr-checkbox ${areaSearchAttr === 'tipo' ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={areaSearchAttr === 'tipo'}
                        onChange={() => toggleAttr(areaSearchAttr, setAreaSearchAttr, "tipo")}
                      />
                      Tipo
                    </label>

                    <label className={`adminU-attr-checkbox ${areaSearchAttr === 'edificio' ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={areaSearchAttr === 'edificio'}
                        onChange={() => toggleAttr(areaSearchAttr, setAreaSearchAttr, "edificio")}
                      />
                      Edificio
                    </label>
                  </div>

                  {/* Search bar */}
                  <div className="adminU-search-row">
                    <div className="adminU-search-input-wrap">
                      <i className="bi bi-search"></i>
                      <input
                        type="text"
                        className="adminU-search-input"
                        placeholder={
                          areaSearchAttr
                            ? `Buscar por ${areaSearchAttr.replace("_", " ")}...`
                            : "Selecciona un atributo…"
                        }
                        value={areaSearchTerm}
                        onChange={handleAreaSearchChange}
                        disabled={!areaSearchAttr}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="adminU-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Edificio</th>
                        <th>Opciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAreas.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                            No hay áreas registradas
                          </td>
                        </tr>
                      ) : (
                        filteredAreas.map((a) => (
                          <tr key={a.id_area}>
                            <td><strong>{a.nombre}</strong></td>
                            <td>
                              <span style={{ 
                                background: '#e7f3e7', 
                                padding: '2px 8px', 
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                {a.tipo_nombre}
                              </span>
                            </td>
                            <td>{a.edificio_nombre}</td>
                            <td>
                              <button 
                                className="adminU-option-btn edit" 
                                onClick={() => handleEditClick(a, 'area')} 
                                title="Editar"
                              >
                                <i className="bi bi-pencil-fill"></i>
                              </button>
                              <button 
                                className="adminU-option-btn delete" 
                                onClick={() => handleDeleteData(a.id_area, 'area')} 
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
      </main>

      {/* Modal de Edición */}
      {showEditModal && editingData && (
        <div className="adminU-modal-overlay form-salon" onClick={handleCloseModal}>
          <div className="adminU-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adminU-modal-header">
              <h2>
                {modalType === 'edificio' && (editingData.id_edificio ? "Editar Edificio" : "Agregar Edificio")}
                {modalType === 'salon' && (editingData.id_salon ? "Editar Salón" : "Agregar Salón")}
                {modalType === 'area' && (editingData.id_area ? "Editar Área" : "Agregar Área")}
              </h2>
              <button className="adminU-modal-close" onClick={handleCloseModal}>✕</button>
            </div>

            <form className="adminU-edit-form" onSubmit={handleSaveData}>
              
          {/* CAMPOS PARA EDIFICIO */}
              {isEdificio && (
                <>
                  <div className="adminU-form-group">
                    <label><i className="bi bi-building"></i> Nombre del Edificio:</label>
                    <input 
                      type="text" 
                      value={editingData.nombre || ''} 
                      onChange={(e) => setEditingData({ ...editingData, nombre: e.target.value })} 
                      placeholder="Ej: A, B, C..." 
                      required
                    />
                  </div>
                  
                  <div className="adminU-form-group">
                    <label><i className="bi bi-tag"></i> Nombre Especial (Opcional):</label>
                    <input 
                      type="text" 
                      value={editingData.nombre_especial || ''} 
                      onChange={(e) => setEditingData({ ...editingData, nombre_especial: e.target.value })} 
                      placeholder="Ej: Centro de Innovación, Biblioteca Central..."
                    />
                  </div>

                  <div className="adminU-form-group">
                    <label><i className="bi bi-info-circle"></i> Uso del Edificio:</label>
                    <input 
                      type="text" 
                      value={editingData.uso || ''} 
                      onChange={(e) => setEditingData({ ...editingData, uso: e.target.value })} 
                      placeholder="Ej: Aulas, Laboratorios, Administrativo..."
                    />
                  </div>

                  <div className="adminU-form-row">
                    <div className="adminU-form-group">
                      <label><i className="bi bi-geo-alt"></i> Posición X:</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={editingData.pos_x || 0} 
                        readOnly
                        style={{
                          backgroundColor: '#f5f5f5',
                          cursor: 'not-allowed',
                          color: '#666'
                        }}
                        placeholder="Usa el mapa" 
                        required
                      />
                    </div>

                    <div className="adminU-form-group">
                      <label><i className="bi bi-geo-alt-fill"></i> Posición Y:</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={editingData.pos_y || 0} 
                        readOnly
                        style={{
                          backgroundColor: '#f5f5f5',
                          cursor: 'not-allowed',
                          color: '#666'
                        }}
                        placeholder="Usa el mapa" 
                        required
                      />
                    </div>
                  </div>

                  {/* BOTÓN PARA ABRIR EL MAPA */}
                  <div className="adminU-form-group">
<button 
        type="button"
        style={{
          width: '100%',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #ea6666ff 0%, #a24b4bff 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(234, 102, 102, 0.4)'
        }}
        onClick={() => setShowMapModal(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(234, 102, 102, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(234, 102, 102, 0.4)';
        }}
      >
        {editingData.pos_x && editingData.pos_y
          ? 'Modificar Posición en el Mapa' 
          : 'Seleccionar Posición en el Mapa'}
      </button>

      <MapaModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        onSelectPosition={handleSelectPosition}
        initialPosition={
          editingData.pos_x && editingData.pos_y 
            ? { x: editingData.pos_x, y: editingData.pos_y }
            : null
        }
      />
                    {editingData.pos_x && editingData.pos_y && (
                      <div style={{
                        padding: '10px',
                        background: '#e8f5e9',
                        color: '#2e7d32',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        textAlign: 'center',
                        marginTop: '10px'
                      }}>
                         Posición seleccionada: ({parseFloat(editingData.pos_x).toFixed(1)}, {parseFloat(editingData.pos_y).toFixed(1)})
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* CAMPOS PARA SALÓN */}
              {isSalon && (
                <>
                  <div className="adminU-form-group">
                    <label><i className="bi bi-hash"></i> Número de Salón:</label>
                    <input 
                      type="text" 
                      value={editingData.numero || ''} 
                      onChange={(e) => setEditingData({ ...editingData, numero: e.target.value })} 
                      placeholder="Ej: A-101, B-205..." 
                      required
                    />
                  </div>

                  {/* Edificio (solo label) */}
                  <div className="adminU-form-group">
                    <label><i className="bi bi-building"></i> Edificio:</label>
                    <span>
                      {editingData.edificioNombre || selectedBuilding?.nombre || '-'}
                    </span>
                  </div>


                  {/* Tipo (solo label) */}
                  <div className="adminU-form-group">
                    <label><i className="bi bi-tag"></i> Tipo de Salón:</label>
                    <span>
                      {editingData.tipo || 'Aula'}
                    </span>
                  </div>


                  <div className="adminU-form-group">
                    <label><i className="bi bi-people-fill"></i> Capacidad:</label>
                    <input 
                      type="number" 
                      min="0"
                      value={editingData.capacidad || 0} 
                      onChange={(e) => setEditingData({ ...editingData, capacidad: e.target.value })} 
                      placeholder="Número de personas" 
                      required
                    />
                  </div>
                </>
              )}

              {/* CAMPOS PARA ÁREA */}
              {isArea && (
                <>
                  <div className="adminU-form-group">
                    <label><i className="bi bi-tag"></i> Nombre del Área:</label>
                    <input 
                      type="text" 
                      value={editingData.nombre || ''} 
                      onChange={(e) => setEditingData({ ...editingData, nombre: e.target.value })} 
                      placeholder="Ej: Departamento de Sistemas, Cubículo 1..." 
                      required
                    />
                  </div>

                  <div className="adminU-form-group">
                    <label><i className="bi bi-building"></i> Edificio:</label>
                    <select
                      value={editingData.edificio || ''} 
                      onChange={(e) => setEditingData({ ...editingData, edificio: e.target.value })} 
                      required
                    >
                      <option value="">Selecciona un edificio</option>
                      {dataList.buildings.map((b) => (
                        <option key={b.id_edificio} value={b.id_edificio}>
                          {b.nombre} - {b.uso || 'Sin descripción'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="adminU-form-group">
                    <label><i className="bi bi-diagram-3"></i> Tipo de Área:</label>
                    <select
                      value={editingData.tipo || ''} 
                      onChange={(e) => setEditingData({ ...editingData, tipo: e.target.value })} 
                      required
                    >
                      <option value="">Selecciona un tipo</option>
                      {dataList.tiposArea.map((t) => (
                        <option key={t.id_tipo} value={t.id_tipo}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

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

    {/* ===== Modal de salones del edificio ===== */}
    {showSalonesModal && selectedBuilding && (
      <div className="adminU-modal-overlay salones-list">
        <div className="adminU-modal-large">

          {/* Botón cerrar */}
          <button className="adminU-salones-close" onClick={closeSalonesModal}>
            <i className="bi bi-x-lg"></i>
          </button>

          {/* Título */}
          <h2 style={{ marginBottom: "10px" }}>
            <i className="bi bi-building"></i> Salones del edificio:{" "}
            <strong>{selectedBuilding.nombre}</strong>
          </h2>

          {/* BOTÓN AGREGAR */}
          <button
            className="adminU-add-user-btn"
            style={{ marginBottom: "15px" }}
            onClick={() => handleEditClick(
              { edificio: selectedBuilding.id_edificio }, // pre-seleccionado
              "salon"
            )}
          >
            <i className="bi bi-plus-circle"></i> Agregar salón
          </button>

          <div className="adminU-table-container" style={{ marginTop: "15px" }}>
            <table className="adminU-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Tipo</th>
                  <th>Capacidad</th>
                  <th style={{ width: "120px" }}>Opciones</th>
                </tr>
              </thead>

              <tbody>
                {dataList.salones.filter(
                  (s) =>
                    s.id_edificio === selectedBuilding.id_edificio ||
                    s.edificio === selectedBuilding.id_edificio
                ).length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: "20px" }}>
                      Este edificio no tiene salones registrados.
                    </td>
                  </tr>
                ) : (
                  dataList.salones
                    .filter(
                      (s) =>
                        s.id_edificio === selectedBuilding.id_edificio ||
                        s.edificio === selectedBuilding.id_edificio
                    )
                    .map((s) => (
                      <tr key={s.id_salon}>
                        <td><strong>{s.numero}</strong></td>

                        <td>
                          <span
                            style={{
                              background: "#d1ecf1",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              textTransform: "capitalize"
                            }}
                          >
                            {s.tipo}
                          </span>
                        </td>

                        <td>
                          <i className="bi bi-people-fill"></i> {s.capacidad}
                        </td>

                        {/* === OPCIONES === */}
                        <td style={{ textAlign: "center" }}>
                          {/* Editar */}
                          <button
                            className="adminU-option-btn edit"
                            title="Editar"
                            onClick={() => handleEditClick(s, "salon")}
                          >
                            <i className="bi bi-pencil-fill"></i>
                          </button>

                          {/* Eliminar */}
                          <button
                            className="adminU-option-btn delete"
                            title="Eliminar"
                            onClick={() => handleDeleteData(s.id_salon, "salon")}
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
    
    </div>
  );
}

export default AdminU;
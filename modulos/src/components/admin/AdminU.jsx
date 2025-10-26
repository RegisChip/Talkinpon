import { useState } from "react";
import "./styles/AdminU.css"; // Asegúrate de que el archivo CSS esté en esta ruta
import { useNavigate } from "react-router-dom";

function AdminU({ locations, user, onLogout, onViewInfo }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const navigate = useNavigate();

  // Función para navegar hacia atrás
  const handleBack = () => {
    navigate(-1);
  };

  // Función para abrir el modal de edición
  const handleEditClick = (data) => {
    setEditingProcess(data);
    setShowEditModal(true);
  };

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingProcess(null);
  };

  // Guardar los cambios del proceso
  const handleSaveProcess = (e) => {
    e.preventDefault();
    // Aquí agregas el código necesario para guardar cambios si los hubiera
    handleCloseModal();
  };

  return (
    <div className="adminU-container">
      {/* Header */}
      <header className="adminU-header">
        <div className="adminU-header-left">
          <button className="adminU-back-btn" onClick={handleBack} title="Volver">
            <i className="bi bi-chevron-double-left"></i>
             {/* debe de quitarse este boton cunuado se ingrese como administrador de procesos */}
          </button>
          <h1 className="adminU-title">TalkinPon</h1>
        </div>

        {/* Icono de usuario */}
        <div className="adminU-user-icon-container">
          <i className="bi bi-person-circle user-icon"></i>
          {/* agregr opciones de cerracr cesion cunado se entre con alcnete sea administrador ubicaciones */}
          <h5>{user.role}</h5>
           {/* ocupa camvbiar la froma en como se muetra el tiepo de usuario, debe cambia a administrador procesos cunado se inicie con la cuenta de proceso */}
        </div>
      </header>

      {/* Main */}
      <main className="adminU-main">
        <div className="adminU-section">
          <h2 className="adminU-section-header">Gestión de Ubicaciones</h2>

          {/* Tabla de Edificios */}
          <div className="adminU-table-container">
            <h3>Edificios</h3>
            <table className="adminU-table">
              <thead>
                <tr>
                  <th>Nombre del Edificio</th>
                  <th>Descripcion</th>
                  <th>Ubicación</th>
                  <th>Capacidad</th>
                  <th>Imagen</th>
                  <th>Opciones</th>
                </tr>
              </thead>
              <tbody>
                {locations.buildings.map((building) => (
                  <tr key={building.id}>
                    <td>{building.name}</td>
                    <td></td>
                    <td>{building.location}</td>
                    <td></td>
                    <td>{building.capacity}</td>
                    <td>
                      <button className="adminU-option-btn edit" onClick={() => handleEditClick(building)} title="Editar">
                        <i className="bi bi-pencil-fill"></i>
                      </button>
                      <button className="adminU-option-btn delete" title="Eliminar">
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="adminU-add-user-btn" onClick={() => handleEditClick({})}>
              Agregar nuevo Edificio
            </button>
          </div>

          {/* Tabla de Salones */}
          <div className="adminU-table-container">
            <h3>Salones</h3>
            <table className="adminU-table">
              <thead>
                <tr>
                  <th>Nombre del Salón</th>
                  <th>Numero de salon</th>
                  <th>Piso</th>
                  <th>Imagen</th>
                  <th>Capacidad</th>
                  <th>Opciones</th>
                </tr>
              </thead>
              <tbody>
                {locations.buildings.map((building) => (
                  <tr key={building.id}>
                    <td>{building.name}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>{building.capacity}</td>
                    <td>
                      <button className="adminU-option-btn edit" onClick={() => handleEditClick(building)} title="Editar">
                        <i className="bi bi-pencil-fill"></i>
                      </button>
                      <button className="adminU-option-btn delete" title="Eliminar">
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="adminU-add-user-btn" onClick={() => handleEditClick({})}>
              Agregar nuevo Salón
            </button>
          </div>

          {/* Tabla de Laboratorios */}
          <div className="adminU-table-container">
            <h3>Laboratorios</h3>
            <table className="adminU-table">
              <thead>
                <tr>
                  <th>Nombre del Laboratorio</th>
                  <th>Ubicación</th>
                  <th>Capacidad</th>
                  <th>Opciones</th>
                </tr>
              </thead>
              <tbody>
                {locations.buildings.map((building) => (
                  <tr key={building.id}>
                    <td>{building.name}</td>
                    <td>{building.location}</td>
                    <td>{building.capacity}</td>
                    <td>
                      <button className="adminU-option-btn edit" onClick={() => handleEditClick(building)} title="Editar">
                        <i className="bi bi-pencil-fill"></i>
                      </button>
                      <button className="adminU-option-btn delete" title="Eliminar">
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="adminU-add-user-btn" onClick={() => handleEditClick({})}>
              Agregar nuevo Laboratorio
            </button>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showEditModal && editingProcess && (
        <div className="adminU-modal-overlay" onClick={handleCloseModal}>
          <div className="adminU-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adminU-modal-header">
              <h2>
                {editingProcess.name ? "Editar Ubicación" : "Agregar Ubicación"}
              </h2>
              <button className="adminU-modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            <form className="adminU-edit-form" onSubmit={handleSaveProcess}>
              <div className="adminU-form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  value={editingProcess.name}
                  onChange={(e) => setEditingProcess({ ...editingProcess, name: e.target.value })}
                  placeholder="Nombre de la ubicación"
                  required
                />
              </div>
              <div className="adminU-form-group">
                <label>Descripción:</label>
                <input
                  type="text"
                  value={editingProcess.description}
                  onChange={(e) => setEditingProcess({ ...editingProcess, description: e.target.value })}
                  placeholder="Descripción de la ubicación"
                  required
                />
              </div>
              <div className="adminU-form-group">
                <label>Requisitos:</label>
                <input
                  type="text"
                  value={editingProcess.requirements}
                  onChange={(e) => setEditingProcess({ ...editingProcess, requirements: e.target.value })}
                  placeholder="Requisitos"
                  required
                />
              </div>
              <div className="adminU-form-group">
                <label>Tiempo estimado:</label>
                <input
                  type="text"
                  value={editingProcess.time}
                  onChange={(e) => setEditingProcess({ ...editingProcess, time: e.target.value })}
                  placeholder="Tiempo estimado"
                  required
                />
              </div>
              <div className="adminU-form-actions">
                <button type="button" className="adminU-btn-cancel" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="adminU-btn-save">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminU;

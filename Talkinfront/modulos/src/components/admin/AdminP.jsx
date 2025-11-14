import { useState } from "react";
import "./styles/AdminP.css"; // Cambio en el nombre del archivo CSS
import { useNavigate } from "react-router-dom";

function AdminP({ processes, user, onBack }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [processesList, setProcessesList] = useState(processes || []);
  const navigate = useNavigate();

  const handleEditClick = (processData) => {
    setEditingProcess({ ...processData });
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingProcess(null);
  };

  const handleSaveProcess = (e) => {
    e.preventDefault();
    setProcessesList(
      processesList.map((p) =>
        p.id === editingProcess.id ? editingProcess : p
      )
    );
    handleCloseModal();
  };

  const handleDeleteProcess = (id) => {
    setProcessesList(processesList.filter((p) => p.id !== id));
  };

  const handleAddProcess = () => {
    const newProcess = {
      id: processesList.length + 1,
      name: "",
      description: "",
      requirements: "",
      time: "",
    };
    setEditingProcess(newProcess);
    setShowEditModal(true);
  };

  const handleBack = () => {
    navigate(-1); // Regresa a la página anterior
  };

  return (
    <div className="adminP-container">
      {/* Header */}
      <header className="adminP-header">
        <div className="adminP-header-left">
          {/* Botón de regresar */}
          <button className="adminP-back-btn" onClick={handleBack} title="Volver">
            <i className="bi bi-chevron-double-left"></i> 
            {/* debe de quitarse este boton cunuado se ingrese como administrador de procesos */}
          </button>
          <h1 className="adminP-title">TalkinPon</h1>
        </div>

        {/* Icono de usuario */}
        <div className="adminP-user-icon-container">
          <i className="bi bi-person-circle user-icon"></i>
          {/* agregr opciones de cerracr cesion cunado se entre con alcnete sea administrador ubicaciones */}
          <h5>Super Administrador</h5> 
          {/* ocupa camvbiar la froma en como se muetra el tiepo de usuario, debe cambia a administrador procesos cunado se inicie con la cuenta de proceso */}
        </div>
      </header>

      {/* Main */}
      <main className="adminP-main">
        <div className="adminP-section">
          <h2 className="adminP-section-header">Gestión de </h2>

          <table className="adminP-table">
            <thead>
              <tr>
                <th>Nombre del procesos</th>
                <th>Descripcion</th>
                <th>Requisitos</th>
                <th>Dependecia</th>
                <th>Opciones</th>
              </tr>
            </thead>
            <tbody>
                {processesList.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.description}</td>
                  <td>{p.requirements}</td>
                  <td>{p.time}</td>
                  <td>
                    <button className="adminP-option-btn edit" onClick={() => handleEditClick(p)} title="Editar">
                      <i className="bi bi-pencil-fill"></i>
                    </button>
                    <button className="adminP-option-btn delete" onClick={() => handleDeleteProcess(p.id)} title="Eliminar">
                      <i className="bi bi-trash-fill"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>


          <div className="adminP-add-user-container">
            <button className="adminP-add-user-btn" onClick={handleAddProcess}>
              Agregar nuevo proceso
            </button>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showEditModal && editingProcess && (
        <div className="adminP-modal-overlay" onClick={handleCloseModal}>
          <div className="adminP-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adminP-modal-header">
              <h2>
                {editingProcess.name ? "Editar Proceso" : "Agregar Proceso"}
              </h2>
              <button className="adminP-modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            <form className="adminP-edit-form" onSubmit={handleSaveProcess}>
              <div className="adminP-form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  value={editingProcess.name}
                  onChange={(e) => setEditingProcess({ ...editingProcess, name: e.target.value })}
                  placeholder="Nombre del proceso"
                  required
                />
              </div>
              <div className="adminP-form-group">
                <label>Descripción:</label>
                <input
                  type="text"
                  value={editingProcess.description}
                  onChange={(e) => setEditingProcess({ ...editingProcess, description: e.target.value })}
                  placeholder="Descripción del proceso"
                  required
                />
              </div>
              <div className="adminP-form-group">
                <label>Requisitos:</label>
                <input
                  type="text"
                  value={editingProcess.requirements}
                  onChange={(e) => setEditingProcess({ ...editingProcess, requirements: e.target.value })}
                  placeholder="Requisitos"
                  required
                />
              </div>
              <div className="adminP-form-group">
                <label>Tiempo estimado:</label>
                <input
                  type="text"
                  value={editingProcess.time}
                  onChange={(e) => setEditingProcess({ ...editingProcess, time: e.target.value })}
                  placeholder="Tiempo estimado"
                  required
                />
              </div>
              <div className="adminP-form-actions">
                <button type="button" className="adminP-btn-cancel" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="adminP-btn-save">
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

export default AdminP;

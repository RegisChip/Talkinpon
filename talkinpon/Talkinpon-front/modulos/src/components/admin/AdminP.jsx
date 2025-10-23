import React, { useState } from "react";
import "./styles/AdminP.css";

const AdminProcesos = ({ onBack }) => {
  const [procesos, setProcesos] = useState([
    {
      id: 1,
      nombre: "Proceso de registro",
      descripcion: "Registro de nuevos usuarios en la plataforma",
      requisitos: "Formulario completo y validación de correo",
    },
    {
      id: 2,
      nombre: "Revisión de contenido",
      descripcion: "Validación y aprobación de publicaciones",
      requisitos: "Acceso de moderador",
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingProceso, setEditingProceso] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleEdit = (proceso) => {
    setEditingProceso(proceso);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingProceso({ id: null, nombre: "", descripcion: "", requisitos: "" });
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingProceso.id) {
      setProcesos(
        procesos.map((p) =>
          p.id === editingProceso.id ? editingProceso : p
        )
      );
    } else {
      setProcesos([
        ...procesos,
        { ...editingProceso, id: Date.now() },
      ]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Eliminar este proceso?")) {
      setProcesos(procesos.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="adminprocesos-container">
      {/* Header */}
      <header className="adminprocesos-header">
        <div className="adminprocesos-header-left">
          {onBack && (
            <button className="adminprocesos-back-btn" onClick={onBack} title="Volver">
              <i className="bi bi-arrow-left"></i>
            </button>
          )}
          <h1 className="adminprocesos-title">TalkinPon</h1>
        </div>

        <div
          className="adminprocesos-user-area"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <i className="bi bi-person-circle adminprocesos-user-icon"></i>
          {showUserMenu && (
            <div className="adminprocesos-user-menu">
              <button className="user-menu-btn">
                <i className="bi bi-info-circle"></i> Ver información
              </button>
              <button className="user-menu-btn logout">
                <i className="bi bi-box-arrow-right"></i> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Contenido principal */}
      <main className="adminprocesos-main">
        <section className="adminprocesos-section">
          <h2 className="adminprocesos-section-title">Gestión de Procesos</h2>

          <table className="adminprocesos-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Requisitos</th>
                <th>Opciones</th>
              </tr>
            </thead>
            <tbody>
              {procesos.map((proceso) => (
                <tr key={proceso.id}>
                  <td>{proceso.nombre}</td>
                  <td>{proceso.descripcion}</td>
                  <td>{proceso.requisitos}</td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="adminprocesos-btn adminprocesos-edit"
                      onClick={() => handleEdit(proceso)}
                      title="Editar"
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                    <button
                      className="adminprocesos-btn adminprocesos-delete"
                      onClick={() => handleDelete(proceso.id)}
                      title="Eliminar"
                    >
                      <i className="bi bi-trash-fill"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="adminprocesos-add-container">
            <button className="adminprocesos-add-btn" onClick={handleAdd}>
              + Agregar Proceso
            </button>
          </div>
        </section>
      </main>

      {/* Modal */}
      {showModal && (
        <div
          className="adminprocesos-modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="adminprocesos-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="adminprocesos-modal-header">
              <h2>{editingProceso.id ? "Editar Proceso" : "Agregar Proceso"}</h2>
              <button
                className="adminprocesos-modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="adminprocesos-form">
              <div className="adminprocesos-form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  value={editingProceso.nombre}
                  onChange={(e) =>
                    setEditingProceso({
                      ...editingProceso,
                      nombre: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="adminprocesos-form-group">
                <label>Descripción:</label>
                <textarea
                  value={editingProceso.descripcion}
                  onChange={(e) =>
                    setEditingProceso({
                      ...editingProceso,
                      descripcion: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="adminprocesos-form-group">
                <label>Requisitos:</label>
                <input
                  type="text"
                  value={editingProceso.requisitos}
                  onChange={(e) =>
                    setEditingProceso({
                      ...editingProceso,
                      requisitos: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="adminprocesos-form-actions">
                <button
                  type="button"
                  className="adminprocesos-btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="adminprocesos-btn-save">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProcesos;

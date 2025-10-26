import { useState } from "react";
import "./styles/AdminUsers.css";
import { useNavigate } from "react-router-dom";

function AdminUsers({ users, user, onBack }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [usersList, setUsersList] = useState(users || []);
  const navigate = useNavigate();

  const handleEditClick = (userData) => {
    setEditingUser({ ...userData });
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    setUsersList(
      usersList.map((u) =>
        u.username === editingUser.username ? editingUser : u
      )
    );
    handleCloseModal();
  };

  const handleDeleteUser = (username) => {
    setUsersList(usersList.filter((u) => u.username !== username));
  };

  const handleAddUser = () => {
    const newUser = {
      name: "",
      username: `user${usersList.length + 1}`,
      role: "",
      email: "",
    };
    setEditingUser(newUser);
    setShowEditModal(true);
  };

  const handleBack = () => {
    navigate(-1); // Regresa a la página anterior
  };

  return (
    <div className="admin-user-container">
      {/* Header */}
      <header className="admin-user-header">
        <div className="admin-user-header-left">
          {/* Botón de regresar */}
          <button className="admin-user-back-btn" onClick={handleBack} title="Volver">
            <i className="bi bi-chevron-double-left"></i>
          </button>
          <h1 className="admin-user-title">TalkinPon</h1>
        </div>

        {/* Icono de usuario */}
        <div className="admin-user-user-icon-container">
          <i className="bi bi-person-circle user-icon"></i>
          <h5>Super Administrador</h5>
        </div>
      </header>

      {/* Main */}
      <main className="admin-user-main">
        <div className="admin-user-section">
          <h2 className="admin-user-section-header">Gestión de Usuarios</h2>

          <table className="admin-user-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Email</th>
                <th>Opciones</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.username}>
                  <td>{u.name}</td>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                  <td>{u.email}</td>
                  <td>
                    <button className="admin-user-option-btn edit" onClick={() => handleEditClick(u)} title="Editar">
                      <i className="bi bi-pencil-fill"></i>
                    </button>
                    <button className="admin-user-option-btn delete" onClick={() => handleDeleteUser(u.username)} title="Eliminar">
                      <i className="bi bi-trash-fill"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="admin-user-add-user-container">
            <button className="admin-user-add-user-btn" onClick={handleAddUser}>
              Agregar nuevo usuario
            </button>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showEditModal && editingUser && (
        <div className="admin-user-modal-overlay" onClick={handleCloseModal}>
          <div className="admin-user-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-user-modal-header">
              <h2>
                {editingUser.username.startsWith("user")
                  ? "Agregar Usuario"
                  : "Editar Usuario"}
              </h2>
              <button className="admin-user-modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            <form className="admin-user-edit-form" onSubmit={handleSaveUser}>
              <div className="form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="admin-user-form-group">
                <label>Usuario:</label>
                <input
                  type="text"
                  value={editingUser.username} // corregido la variable
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  placeholder="Nombre de usuario"
                  required
                />
              </div>
              <div className="admin-user-form-group">
                <label>Rol:</label>
                <input
                  type="text"
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  placeholder="Rol del usuario"
                  required
                />
              </div>
              <div className="admin-user-form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  placeholder="Email"
                  required
                />
              </div>
              <div className="admin-user-form-actions">
                <button type="button" className="admin-user-btn-cancel" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="admin-user-btn-save">
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

export default AdminUsers;

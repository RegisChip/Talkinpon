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
    <div className="admin-container">
      {/* Header */}
    <header className="userinfo-header">
      <div className="userinfo-header-left">
        {/* Botón de regresar */}
        <button className="back-btn" onClick={handleBack} title="Volver">
          <i className="bi bi-arrow-left"></i>
        </button>
        <h1 className="userinfo-title">TalkinPon</h1>
      </div>

      {/* Icono de usuario */}
      <i className="bi bi-person-circle user-icon"></i>
    </header>


      {/* Main */}
      <main className="admin-main">
        <div className="users-section">
          <h2 className="section-header">Gestión de Usuarios</h2>

          <table className="users-table">
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
                    <button className="option-btn edit" onClick={() => handleEditClick(u)} title="Editar">
                      <i className="bi bi-pencil-fill"></i>
                    </button>
                    <button className="option-btn delete" onClick={() => handleDeleteUser(u.username)} title="Eliminar">
                      <i className="bi bi-trash-fill"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="add-user-container">
            <button className="add-user-btn" onClick={handleAddUser}>
              + Agregar nuevo usuario
            </button>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {editingUser.username.startsWith("user")
                  ? "Agregar Usuario"
                  : "Editar Usuario"}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            <form className="edit-form" onSubmit={handleSaveUser}>
              <div className="form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="form-group">
                <label>Usuario:</label>
                <input
                  type="text"
                  value={editingUser.usernam} // checar despues esta variable
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, username: e.target.value })
                  }
                  placeholder="Nombre de usuario"
                  // disabled={!editingUser.username.startsWith("user")} // sólo editable si es nuevo
                  required
                />
              </div>
              <div className="form-group">
                <label>Rol:</label>
                <input
                  type="text"
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value })
                  }
                  placeholder="Rol del usuario"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  placeholder="Email"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
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

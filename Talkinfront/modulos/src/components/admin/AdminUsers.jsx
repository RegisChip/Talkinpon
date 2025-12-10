import { useState, useEffect } from "react";
import "./styles/AdminUsers.css";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:8000/api/administradores/";
const REGISTRO_URL = API_BASE_URL + "registro/";

function AdminUsers({ users, user, onBack, onViewInfo, onLogout }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableVisible, setIsTableVisible] = useState(false);  // Default to show the table
  const navigate = useNavigate();

  const handleLogoutAndGoBack = () => {
    if (onLogout) onLogout();   // Close session
    navigate("/adminB");         // Redirect to AdminB
    setShowUserMenu(false);
  };

  // Fetch users from Django
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_BASE_URL);
      if (response.ok) {
        const data = await response.json();
        const mappedUsers = data.map(admin => ({
          id: admin.id,
          name: admin.nombre,
          email: admin.correo,
          role: admin.rol,
          username: admin.correo,
        }));
        setUsersList(mappedUsers);
      } else {
        console.error("Error getting users:", response.status);
      }
    } catch (error) {
      console.error("Network error getting users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditClick = (userData) => {
    setEditingUser({ ...userData });
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();

    const isNewUser = !editingUser.id;

    if (!editingUser.name || !editingUser.email || !editingUser.role) {
      alert("Por favor, completa todos los campos requeridos.");
      return;
    }

    if (isNewUser && !editingUser.password) {
      alert("La contraseña es obligatoria para los nuevos usuarios.");
      return;
    }

const userData = {
  nombre: editingUser.name,
  correo: editingUser.email,
  rol: editingUser.role, // Aquí se pasa el valor del rol
};


    let url = isNewUser ? REGISTRO_URL : `${API_BASE_URL}${editingUser.id}/`;
    let method = isNewUser ? 'POST' : 'PUT';

    if (isNewUser && editingUser.password) {
      userData.contrasena = editingUser.password;
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        alert(`Usuario ${isNewUser ? 'registrado' : 'actualizado'} exitosamente.`);
        await fetchUsers();
      } else {
        const errorData = await response.json();
        console.error("Error al guardar el usuario:", errorData);

        const errorMessage = Object.entries(errorData)
          .map(([key, value]) => {
            const fieldName = key === 'contrasena' ? 'Contraseña' : key;
            return `${fieldName}: ${Array.isArray(value) ? value.join(', ') : value}`;
          })
          .join('\n');

        alert(`Error de validación o del servidor:\n${errorMessage}`);
      }
    } catch (error) {
      console.error("Error en la red:", error);
      alert("Error de conexión mientras se intentaba guardar el usuario.");
    } finally {
      handleCloseModal();
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a ${name}? Esta acción no se puede deshacer.`)) {
      return;
    }

    const DELETE_URL = `${API_BASE_URL}${id}/`;

    try {
      const response = await fetch(DELETE_URL, {
        method: 'DELETE',
      });

      if (response.status === 204) {
        setUsersList(usersList.filter((u) => u.id !== id));
      } else {
        console.error("Error al eliminar el usuario:", response.status);
        alert("Error al eliminar el usuario. El servidor rechazó la solicitud.");
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("Error de red al intentar eliminar el usuario.");
    }
  };

  const handleAddUser = () => {
    const newUser = {
      id: null,
      name: "",
      role: "",
      email: "",
      password: "",
    };
    setEditingUser(newUser);
    setShowEditModal(true);
  };

  const handleBack = () => {
    navigate(-1); // Regresar a la página anterior
  };

  const toggleTableVisibility = () => {
    setIsTableVisible(!isTableVisible);  // Alternar visibilidad de la tabla
  };

  if (isLoading) {
    return (
      <div className="adminUsers-container">
        <main className="adminUsers-main">
          <h2 style={{ textAlign: 'center', marginTop: '50px' }}>
            Cargando usuarios...
          </h2>
        </main>
      </div>
    );
  }

  return (
    <div className="adminUsers-container">
      {/* HEADER */}
      <header className="adminUsers-header">
        <div className="adminUsers-header-left">
          <h1 className="adminUsers-title">TalkinPon</h1>
        </div>

        {/* Menú de usuario */}
        <div className="superadmin-user-menu-wrapper">
          {showUserMenu && (
            <div className="superadmin-user-dropdown">
              <button
                className="superadmin-dropdown-item"
                onClick={() => {
                  onViewInfo();
                  setShowUserMenu(false);
                }}
              >
                <i className="bi bi-info-circle"></i> Ver Información
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

      {/* MAIN */}
      <main className="adminUsers-main">
        <div className="adminUsers-section">
          <div className="adminUsers-table-container">
            <div className="adminUsers-table-header-toggle">
              <h3>
                <i className="bi bi-person-circle"></i> Gestión de Usuarios ({usersList.length})
              </h3>

              <div className="adminUsers-header-buttons">
                {/* Botón para agregar un nuevo usuario */}
                <button
                  className="adminUsers-add-user-btn"
                  onClick={handleAddUser}
                >
                  <i className="bi bi-person-plus"></i> Agregar Usuario
                </button>

                {/* Botón para alternar visibilidad de la tabla */}
                <button
                  onClick={toggleTableVisibility}
                  className="adminUsers-toggle-btn"
                >
                  <i className={`bi bi-chevron-${isTableVisible ? 'up' : 'down'} adminUsers-toggle-icon`}></i>
                </button>
              </div>
            </div>

            {/* Mostrar tabla si la visibilidad está activada */}
            {isTableVisible && (
              <table className="adminUsers-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Correo</th>
                    <th>Opciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.role}</td>
                      <td>{u.email}</td>
                      <td>
                        <button className="adminUsers-option-btn edit" onClick={() => handleEditClick(u)} title="Editar">
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                        <button className="adminUsers-option-btn delete" onClick={() => handleDeleteUser(u.id, u.name)} title="Eliminar">
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      {showEditModal && editingUser && (
        <div className="adminUsers-modal-overlay" onClick={handleCloseModal}>
          <div className="adminUsers-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="adminUsers-modal-header">
              <h2>{!editingUser.id ? "Agregar Usuario" : "Editar Usuario"}</h2>
              <button className="adminUsers-modal-close" onClick={handleCloseModal}>✕</button>
            </div>
            <form className="adminUsers-edit-form" onSubmit={handleSaveUser}>
              <div className="adminUsers-form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="Nombre completo"
                  required
                />
              </div>
<div className="adminUsers-form-group">
  <label>Rol:</label>
<select
  value={editingUser.role}
  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
  required
>
  <option value="">Selecciona un rol</option>
  <option value="SUPER">Super Administrador</option>
  <option value="PROCESOS">Administrador de Procesos</option>
  <option value="UBICACIONES">Administrador de Ubicaciones</option>
</select>

</div>


              <div className="adminUsers-form-group">
                <label>Correo:</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  placeholder="Correo"
                  required
                />
              </div>
              {/* Password field (only for new users) */}
              {!editingUser.id && (
                <div className="adminUsers-form-group">
                  <label>Contraseña:</label>
                  <input
                    type="password"
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder="Contraseña"
                    required
                  />
                </div>
              )}

              <div className="adminUsers-form-actions">
                <button type="button" className="adminUsers-btn-cancel" onClick={handleCloseModal}>Cancelar</button>
                <button type="submit" className="adminUsers-btn-save">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;

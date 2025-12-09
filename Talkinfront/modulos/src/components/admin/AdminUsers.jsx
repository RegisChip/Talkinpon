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
  const navigate = useNavigate();

  const handleLogoutAndGoBack = () => {
    if (onLogout) onLogout();   // cierra sesión
    navigate("/adminB");         // redirige a AdminB
    setShowUserMenu(false);
  };
  
  // FUNCIÓN PARA CARGAR USUARIOS DESDE DJANGO
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
        console.error("Error al obtener usuarios:", response.status);
      }
    } catch (error) {
      console.error("Error de red al obtener usuarios:", error);
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

  // FUNCIÓN PARA GUARDAR/REGISTRAR USUARIO
  const handleSaveUser = async (e) => {
    e.preventDefault();

    const isNewUser = !editingUser.id;

    // Validación general de campos no vacío
    if (!editingUser.name || !editingUser.email || !editingUser.role) {
      alert("Por favor, completa todos los campos requeridos.");
      return;
    }

    // Validación de contraseña solo si es NUEVO USUARIO
    if (isNewUser && !editingUser.password) {
      alert("La contraseña es obligatoria para nuevos usuarios.");
      return;
    }

    // Mapear datos a Serializer de Django
    const userData = {
      nombre: editingUser.name,
      correo: editingUser.email,
      rol: editingUser.role,
    };

    // Determinar URL y Método
    let url = isNewUser ? REGISTRO_URL : `${API_BASE_URL}${editingUser.id}/`;
    let method = isNewUser ? 'POST' : 'PUT'; // Usamos PUT para edición
    
    if (isNewUser && editingUser.password) {
        // Añadir el campo contrasena al objeto solo si estamos registrando
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
        // Éxito: Recargar la lista de usuarios para reflejar la BD
        alert(`Usuario ${isNewUser ? 'registrado' : 'actualizado'} con éxito.`);
        await fetchUsers(); 
      } else {
        // Manejo de errores de Django
        const errorData = await response.json();
        console.error("Error al guardar usuario:", errorData);
        
        const errorMessage = Object.entries(errorData)
          .map(([key, value]) => {
            const fieldName = key === 'contrasena' ? 'Contraseña' : key;
            return `${fieldName}: ${Array.isArray(value) ? value.join(', ') : value}`;
          })
          .join('\n');
        
        alert(`Error de validación o del servidor:\n${errorMessage}`);
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("Error de red al intentar conectar con la API.");
    } finally {
      handleCloseModal();
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a ${name}? Esta acción es irreversible.`)) {
        return;
    }

    const DELETE_URL = `${API_BASE_URL}${id}/`;

    try {
        const response = await fetch(DELETE_URL, {
            method: 'DELETE',
        });

        if (response.status === 204) { // Eliminación exitosa
            // Actualizar el estado del frontend
            setUsersList(usersList.filter((u) => u.id !== id));
        } else {
            console.error("Error al eliminar usuario:", response.status);
            alert("Error al eliminar el usuario. El servidor rechazó la petición.");
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
      username: `user${usersList.length + 1}`,
      role: "PROCESOS",
      email: "",
      password: "",
    };
    setEditingUser(newUser);
    setShowEditModal(true);
  };

  const handleBack = () => {
    navigate(-1); // Regresa a la página anterior
  };

  if (isLoading) {
    return (
        <div className="admin-user-container">
            <main className="admin-user-main">
                <h2 style={{ textAlign: 'center', marginTop: '50px' }}>
                    Cargando usuarios...
                </h2>
            </main>
        </div>
    );
  }

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
        <div className="superadmin-user-menu-wrapper">
          <button className="superadmin-user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
            <i className="bi bi-person-circle"></i>{getRoleDisplayName(user?.rol)} 
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
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                  <td>{u.email}</td>
                  <td>
                    <button className="admin-user-option-btn edit" onClick={() => handleEditClick(u)} title="Editar">
                      <i className="bi bi-pencil-fill"></i>
                    </button>
                    <button className="admin-user-option-btn delete" onClick={() => handleDeleteUser(u.id, u.name)} title="Eliminar">
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
                {/* Verifica si es nuevo (sin id) o edición */}
                {!editingUser.id ? "Agregar Usuario" : "Editar Usuario"}
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
                  value={editingUser.username} 
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

              {/* CAMPO DE CONTRASEÑA (Solo para nuevos registros) */}
              {(!editingUser.id) && (
                <div className="admin-user-form-group">
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

import { useState } from "react";
import { useNavigate } from "react-router-dom"; // para navegar
import 'bootstrap-icons/font/bootstrap-icons.css';
import "./styles/AdminS.css";

function SuperAdminDashboard({ user, onViewInfo, onLogout, onManageProcesses, onManageLocations, onManageUsers }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogoutAndGoBack = () => {
    if (onLogout) onLogout();   // cierra sesión
    navigate("/adminB");         // redirige a AdminB
    setShowUserMenu(false);
  };

  return (
    <div className="superadmin-container">
<header className="superadmin-header">
  <h1 className="superadmin-title">TalkinPon</h1>

<div className="superadmin-user-menu-wrapper">
  <button className="superadmin-user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
    <i className="bi bi-person-circle"></i>
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


      <main className="superadmin-main">
        <div className="superadmin-dashboard-container">
          <div className="superadmin-welcome-section">
            <h2>Bienvenido Super Administrador, {user.username}</h2>
            <p>Desde aquí puedes gestionar todos los módulos del sistema.</p>
          </div>

          <div className="superadmin-modules-grid">
            <div className="superadmin-module-card superadmin-transparent superadmin-processes">
              <div className="superadmin-card-header">
                <i className="bi bi-clipboard"></i>
                <h3>Procesos Administrativos</h3>
              </div>
              <p>Gestionar kardex, constancias, titulación, créditos y otros procesos</p>
              <button className="superadmin-card-btn" onClick={onManageProcesses}>
                <i className="bi bi-gear-fill"></i> Gestionar
              </button>
            </div>

            <div className="superadmin-module-card superadmin-transparent superadmin-locations">
              <div className="superadmin-card-header">
                <i className="bi bi-geo-alt"></i>
                <h3>Ubicaciones</h3>
              </div>
              <p>Administrar edificios, salones, mapas y ubicaciones del campus</p>
              <button className="superadmin-card-btn" onClick={onManageLocations}>
                <i className="bi bi-gear-fill"></i> Gestionar
              </button>
            </div>

            <div className="superadmin-module-card">
              <div className="superadmin-card-header">
                <i className="bi bi-people"></i>
                <h3>Usuarios</h3>
              </div>
              <p>Gestionar usuarios, permisos y roles del sistema</p>
              <button className="superadmin-card-btn" onClick={onManageUsers}>
                <i className="bi bi-gear-fill"></i> Gestionar
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SuperAdminDashboard;

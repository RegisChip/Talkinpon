import "./styles/UserInfo.css";
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useNavigate } from "react-router-dom"; // para navegación

function UserInfo({ user, onBack, onLogout }) {
  const navigate = useNavigate();

  const handleLogoutAndGoBack = () => {
    if (onLogout) onLogout();      // cierra sesión
    navigate("/adminB");            // redirige a AdminB
  };

  return (
    <div className="userinfo-container">
      <header className="userinfo-header">
        <div className="userinfo-header-left">
          {onBack && (
            <button className="back-btn" onClick={onBack} title="Volver">
              <i className="bi bi-chevron-double-left"></i>
            </button>
          )}
          <h1 className="userinfo-title">TalkinPon</h1>
        </div>

        {/* Icono y texto alineados a la derecha */}
        <div className="userinfo-header-right">
          <i className="bi bi-person-circle user-icon"></i>
          <h5>Super Administrador</h5>
        </div>
      </header>

      <main className="userinfo-main">
        <div className="info-card">
          <h2>Información del Usuario</h2>

          <div className="info-section">
            <label className="info-label">Usuario:</label>
            <p className="info-value">{user.name}</p>
          </div>

          <div className="info-section">
            <label className="info-label">Rol:</label>
            <p className="info-value">{user.role}</p>
          </div>

          <hr className="divider" />

          <div className="info-section">
            <label className="info-label">Correo electrónico:</label>
            <p className="info-value">{user.email}</p>
          </div>

          <hr className="divider" />

          <div className="info-section">
            <label className="info-label">Contraseña:</label>
            <p className="info-value">
              <i className="bi bi-key-fill"></i> ********
            </p>
          </div>

          <div className="button-group">
            <button className="btn btn-logout" onClick={handleLogoutAndGoBack}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UserInfo;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/AdminB.css";

export default function AdminB() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("Por favor, completa todos los campos.");
      return;
    }

    setError("");
    const lowerUsername = username.toLowerCase();

    if (lowerUsername === "super") {
      navigate("/admin/adminS"); // entra al módulo admin interno
    } else if (lowerUsername.includes("proceso")) {
      navigate("/admin/adminP"); // dentro del módulo admin se mostrará AdminP
    } else if (lowerUsername.includes("ubicacion")) {
      navigate("/admin/adminS"); // dentro del módulo admin se mostrará AdminU
    } else {
      setError("Usuario no reconocido. Verifica tus credenciales.");
    }
  };

  return (
    <div className="adminB-container">
      <header className="adminB-header">
        <div className="adminB-header-content">
          <h1 className="adminB-header-title">TalkinPon</h1>
          <div className="adminB-header-center-text">
            <span>Inicio de sesión.</span>
          </div>
        </div>
      </header>

      <main className="adminB-login-main">
        <div className="adminB-login-card">
          <h2 className="adminB-login-title">Bienvenido Administrador</h2>
          <form onSubmit={handleLogin} className="adminB-login-form">
            <div className="adminB-form-group">
              <label htmlFor="username">Usuario:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="Ingresa tu usuario..."
                required
              />
            </div>

            <div className="adminB-form-group">
              <label htmlFor="password">Contraseña:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Ingresa tu contraseña..."
                required
              />
            </div>

            {error && <div className="adminB-error-message">{error}</div>}

            <button type="submit" className="adminB-login-button">
              Iniciar sesión
            </button>
          </form>

          <div className="adminB-hint">
            <p>
              Usuarios de prueba: <strong>super</strong>, <strong>proceso</strong>, <strong>ubicacion</strong>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

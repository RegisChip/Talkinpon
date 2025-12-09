import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/AdminB.css";

const LOGIN_URL = "http://localhost:8000/api/administradores/login/";

export default function AdminB({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("Por favor, completa todos los campos.");
      return;
    }

    setError("");
    // Preparar datos para la API (Mapeamos username a correo)
    const credentials = {
      correo: username,
      contrasena: password,
    };

    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        //Login exitoso: Obtener el rol del usuario
        const userRole = data.rol;
        
        // 
        if (onLoginSuccess) {
            onLoginSuccess(data); // Pasa todo el objeto del usuario a la app principal
        }

        // Redirección basada en el rol de la BD
        switch (userRole) {
          case 'SUPER':
            navigate("/adminB/adminS"); 
            break;
          case 'PROCESOS':
            navigate("/adminB/adminP"); 
            break;
          case 'UBICACIONES':
            navigate("/adminB/adminU"); 
            break;
          default:
            setError("Rol de usuario no reconocido. Contacte a soporte.");
            break;
        }

      } else {
        // Error de Django (generalmente por credenciales incorrectas)
        setError(data.non_field_errors ? data.non_field_errors[0] : "Correo o contraseña incorrectos.");
      }

    } catch (apiError) {
      console.error("Error de conexión:", apiError);
      setError("No se pudo conectar con el servidor. Inténtalo más tarde.");
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

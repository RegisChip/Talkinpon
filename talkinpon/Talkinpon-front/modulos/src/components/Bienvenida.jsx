import React from "react";
import { useNavigate } from "react-router-dom";
import './Bienvenida.css';

export default function Bienvenida() {
  const navigate = useNavigate();

  return (
    <div className="bienvenida-container">
      <header className="bienvenida-header">
        <h1>Bienvenido</h1>
        <div className="header-logo">
          <img src="/logo-app.png" alt="Logo" />
        </div>
      </header>

      <div className="bienvenida-buttons">
        <button className="bienvenida-button" onClick={() => navigate("/procesos")}>
          <img src="\Escuela_tec.jpg" alt="Procesos-Administrativos" />
          <div className="button-overlay" />
          <div className="button-text">PROCESOS<br/>ADMINISTRATIVOS</div>
        </button>

        <div className="divider" />

        <button className="bienvenida-button" onClick={() => navigate("/ubicaciones")}>
          <img src="/mapa_tec.png" alt="Ubicaciones" />
          <div className="button-overlay" />
          <div className="button-text">UBICACIONES</div>
        </button>
      </div>
    </div>
  );
}

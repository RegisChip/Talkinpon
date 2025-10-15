import React from "react";
import { useNavigate } from "react-router-dom"; // para navegación
import './Ubicaciones.css';


export default function Ubicaciones() {
  const navigate = useNavigate();

  return (
    <div className="ubicaciones-container">
      <div className="ubicaciones-content">
        <h1>Ubicaciones</h1>
        <p>Esta página está en construcción</p>
        <button className="ubicaciones-button" onClick={() => navigate("/")}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

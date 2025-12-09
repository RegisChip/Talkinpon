// Talkinpon\Talkinfront\modulos\src\components\Bienvenida.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import './Bienvenida.css';

export default function Bienvenida() {
  const navigate = useNavigate();


  const images = [
    "/Escuela_tec.jpg",
    "/mapa_tec.png",
    "/Escuela-noche.jpg",
    "/peluche-pony.jpg",
    "/Pony.jpg"
  ];

  // Estado para la imagen actual
  const [current, setCurrent] = useState(0);

  // Cambiar imagen cada 3 segundos
useEffect(() => {
  const interval = setInterval(() => {
    setCurrent(prev => (prev + 1) % images.length);
  }, 8000); // Cambia cada 15 segundos
  return () => clearInterval(interval);
}, []);


  return (
    <div className="bienvenida-container">
      <header className="bienvenida-header">
        <h1>Bienvenido</h1>
        <div className="header-logo">
          <img src="/logo-app.png" alt="Logo" />
        </div>
      </header>

      <div className="bienvenida-buttons">
        {/* <button className="bienvenida-button" onClick={() => navigate("/procesos")}>
          <img src="\Escuela_tec.jpg" alt="Procesos-Administrativos" />
          <div className="button-overlay" />
          <div className="button-text">PROCESOS<br/>ADMINISTRATIVOS</div>
        </button>

        <div className="divider" />

        <button className="bienvenida-button" onClick={() => navigate("/ubicaciones")}>
          <img src="/mapa_tec.png" alt="Ubicaciones" />
          <div className="button-overlay" />
          <div className="button-text">UBICACIONES</div>
        </button> */}

        <button className="bienvenida-button" onClick={() => navigate("/fusion")}>
          {images.map((img, index) => (
            <img
              key={index}
              src={img}
              alt="Chat-Institucional"
              className={`bienvenida-img ${index === current ? "visible" : "hidden"}`}
            />
          ))}
          <div className="button-overlay" />
          <div className="button-text">
            <h1>
              PROCESOS<br />
              ADMINISTRATIVOS<br />
              Y<br />
              UBICACIONES
            </h1>
          </div>
        </button>


      </div>

    </div>
  );
}

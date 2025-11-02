import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Bienvenida from "./components/Bienvenida";
import Ubicaciones from "./components/ubicac/Ubicaciones";
import Procesos from "./components/procesos/Procesos";
import AdminB from "./components/admin/AdminB";
import AppAdmin from "./components/admin/AppAdmin";
import Fusion from "./components/New/Nfusion";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Sitio público */}
        <Route path="/" element={<Bienvenida />} />
        <Route path="/procesos" element={<Procesos />} />
        <Route path="/ubicaciones" element={<Ubicaciones />} />
        {/* Login de administración */}
        <Route path="/adminB" element={<AdminB />} />
        {/* Módulo administrativo completo */}
        <Route path="/adminB/*" element={<AppAdmin />} />

        <Route path="/fusion" element={<Fusion />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

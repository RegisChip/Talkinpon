// Talkinpon\Talkinfront\modulos\src\index.js

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Bienvenida from "./components/Bienvenida";
import AdminB from "./components/admin/AdminB";
import AppAdmin from "./components/admin/AppAdmin";
import Fusion from "./components/Fusion/Nfusion";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Sitio público */}
        <Route path="/" element={<Bienvenida />} />
        
        {/* Login de administración */}
        <Route path="/adminB" element={<AdminB />} />
        {/* Módulo administrativo completo */}
        <Route path="/adminB/*" element={<AppAdmin />} />

        <Route path="/fusion" element={<Fusion />} />
        
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

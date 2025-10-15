import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Bienvenida from './components/Bienvenida';
import Ubicaciones from "./components/ubicac/Ubicaciones";
import Administrativas from "./components/admin/Administrativas";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Bienvenida />} />
        <Route path="/administrativas" element={<Administrativas />} />
        <Route path="/ubicaciones" element={<Ubicaciones />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

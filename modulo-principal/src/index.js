import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Bienvenida from './components/Bienvenida';
import Administrativas from "./components/Administrativas";
import Ubicaciones from "./components/Ubicaciones";
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

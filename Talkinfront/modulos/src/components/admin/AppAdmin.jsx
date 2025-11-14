import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import AdminS from "./AdminS";
import AdminP from "./AdminP";
import AdminU from "./AdminU";
import AdminUsers from "./AdminUsers";
import UserInfo from "./UserInfo";

export default function AppAdmin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [previousPage, setPreviousPage] = useState(null);

  const usersData = {
    proceso: {
      name: "Jesús Alejandro Espinosa",
      role: "Administrador de procesos",
      email: "edef@gmail.com",
      username: "proceso",
    },
    ubicacion: {
      name: "María García López",
      role: "Administrador de ubicaciones",
      email: "maria.garcia@gmail.com",
      username: "ubicacion",
    },
    super: {
      name: "Carlos Rodríguez Martínez",
      role: "Super Administrador",
      email: "carlos.rodriguez@gmail.com",
      username: "super",
    },
  };

  const [processes, setProcesses] = useState([
    {
      id: 1,
      name: "Kardex",
      description: "Consulta de cómo sacar el kardex",
      requirements: "Credencial, Pago",
      time: "15 minutos",
    },
  ]);

  const [locations, setLocations] = useState({
    buildings: [
      { id: 1, name: "Edificio A", location: "Campus Principal", capacity: "500" },
      { id: 2, name: "Edificio B", location: "Campus Principal", capacity: "300" },
    ],
  });

  // Funciones principales
  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleAddProcess = (newProcess) => {
    setProcesses([...processes, { ...newProcess, id: processes.length + 1 }]);
  };

  const handleDeleteProcess = (id) => {
    setProcesses(processes.filter((p) => p.id !== id));
  };

  const handleEditProcess = (id, updated) => {
    setProcesses(processes.map((p) => (p.id === id ? updated : p)));
  };

  return (
    <Routes>
      <Route
        path="/adminS"
        element={
          <AdminS
            user={usersData.super}
            onLogout={handleLogout}
            onManageProcesses={() => (window.location.href = "/admin/adminP")}
            onManageLocations={() => (window.location.href = "/admin/adminU")}
            onManageUsers={() => (window.location.href = "/admin/adminUsers")}
            onViewInfo={() => (window.location.href = "/admin/userInfo")}
          />
        }
      />

      <Route
        path="/adminP"
        element={
          <AdminP
            processes={processes}
            user={usersData.proceso}
            onLogout={handleLogout}
            onAddProcess={handleAddProcess}
            onDeleteProcess={handleDeleteProcess}
            onEditProcess={handleEditProcess}
            onViewInfo={() => (window.location.href = "/admin/userInfo")}
          />
        }
      />

      <Route
        path="/adminU"
        element={
          <AdminU
            locations={locations}
            user={usersData.ubicacion}
            onLogout={handleLogout}
            onViewInfo={() => (window.location.href = "/admin/userInfo")}
          />
        }
      />

      <Route
        path="/adminUsers"
        element={
          <AdminUsers
            users={Object.values(usersData)}
            user={usersData.super}
            onLogout={handleLogout}
            onViewInfo={() => (window.location.href = "/admin/userInfo")}
          />
        }
      />

      <Route
        path="/userInfo"
        element={
          <UserInfo
            user={currentUser || usersData.super}
            onLogout={handleLogout}
            onBack={() => window.history.back()}
          />
        }
      />
    </Routes>
  );
}

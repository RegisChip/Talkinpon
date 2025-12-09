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

  const handleLoginSuccess = (userData) => {
      setCurrentUser(userData);
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
            user={currentUser}
            onLogout={handleLogout}
            onManageProcesses={() => (window.location.href = "/adminB/adminP")}
            onManageLocations={() => (window.location.href = "/adminB/adminU")}
            onManageUsers={() => (window.location.href = "/adminB/adminUsers")}
            onViewInfo={() => (window.location.href = "/adminB/userInfo")}
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
            onViewInfo={() => (window.location.href = "/adminB/userInfo")}
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
            onViewInfo={() => (window.location.href = "/adminB/userInfo")}
          />
        }
      />

      <Route
        path="/adminUsers"
        element={
          <AdminUsers
            //users={Object.values(usersData)}
            user={currentUser}
            onLogout={handleLogout}
            onViewInfo={() => (window.location.href = "/adminB/userInfo")}
          />
        }
      />

      <Route
        path="/userInfo"
        element={
          <UserInfo
            user={currentUser}
            onLogout={handleLogout}
            onBack={() => window.history.back()}
          />
        }
      />
    </Routes>
  );
}

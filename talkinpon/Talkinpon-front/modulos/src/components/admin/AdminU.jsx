import { useState } from "react"
import "./styles/AdminU.css"

function AdminU({ locations, user, onViewInfo, onLogout, onBack, showBackButton }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [editingType, setEditingType] = useState(null)

  const handleEditClick = (location, type) => {
    setEditingLocation(location)
    setEditingType(type)
    setShowEditModal(true)
  }

  const handleCloseModal = () => {
    setShowEditModal(false)
    setEditingLocation(null)
    setEditingType(null)
  }

  const handleSaveLocation = (e) => {
    e.preventDefault()
    console.log("Guardando ubicación:", editingLocation, "Tipo:", editingType)
    handleCloseModal()
  }

  const handleDeleteLocation = (id, type) => {
    console.log("Eliminando", type, "con id:", id)
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="header-left">
          {showBackButton && (
            <button className="back-btn" onClick={onBack} title="Volver">
              ←
            </button>
          )}
          <h1 className="header-title">Ubicaciones.</h1>
        </div>
        <div className="header-right">
          <div className="user-menu-wrapper">
            <button className="user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
              <span className="user-icon">👤</span>
              <span className="user-name">{user.username}</span>
            </button>
            {showUserMenu && (
              <div className="user-dropdown">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    onViewInfo()
                    setShowUserMenu(false)
                  }}
                >
                  👁️ Ver información
                </button>
                <button
                  className="dropdown-item logout"
                  onClick={() => {
                    onLogout()
                    setShowUserMenu(false)
                  }}
                >
                  🚪 Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="locations-section">
          <div className="section-header">
            <h2>Edificios</h2>
            <button className="add-icon-btn">➕</button>
          </div>

          <table className="locations-table">
            <thead>
              <tr>
                <th>Nombre del edificio</th>
                <th>Ubicación</th>
                <th>Capacidad</th>
                <th>Opciones</th>
              </tr>
            </thead>
            <tbody>
              {locations.buildings.map((building) => (
                <tr key={building.id}>
                  <td>{building.name}</td>
                  <td>{building.location}</td>
                  <td>{building.capacity}</td>
                  <td className="options-cell">
                    <button
                      className="option-btn edit"
                      onClick={() => handleEditClick(building, "building")}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="option-btn delete"
                      onClick={() => handleDeleteLocation(building.id, "building")}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="add-location-btn">+ Agregar nuevo edificio</button>
        </div>

        <div className="locations-section">
          <div className="section-header">
            <h2>Salones</h2>
            <button className="add-icon-btn">➕</button>
          </div>

          <table className="locations-table">
            <thead>
              <tr>
                <th>Nombre del salón</th>
                <th>Edificio</th>
                <th>Capacidad</th>
                <th>Opciones</th>
              </tr>
            </thead>
            <tbody>
              {locations.classrooms.map((classroom) => (
                <tr key={classroom.id}>
                  <td>{classroom.name}</td>
                  <td>{classroom.building}</td>
                  <td>{classroom.capacity}</td>
                  <td className="options-cell">
                    <button
                      className="option-btn edit"
                      onClick={() => handleEditClick(classroom, "classroom")}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="option-btn delete"
                      onClick={() => handleDeleteLocation(classroom.id, "classroom")}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="add-location-btn">+ Agregar nuevo salón</button>
        </div>

        <div className="locations-section">
          <div className="section-header">
            <h2>Laboratorios</h2>
            <button className="add-icon-btn">➕</button>
          </div>

          <table className="locations-table">
            <thead>
              <tr>
                <th>Nombre del laboratorio</th>
                <th>Edificio</th>
                <th>Equipamiento</th>
                <th>Opciones</th>
              </tr>
            </thead>
            <tbody>
              {locations.laboratories.map((lab) => (
                <tr key={lab.id}>
                  <td>{lab.name}</td>
                  <td>{lab.building}</td>
                  <td>{lab.equipment}</td>
                  <td className="options-cell">
                    <button
                      className="option-btn edit"
                      onClick={() => handleEditClick(lab, "laboratory")}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="option-btn delete"
                      onClick={() => handleDeleteLocation(lab.id, "laboratory")}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="add-location-btn">+ Agregar nuevo laboratorio</button>
        </div>
      </main>

      {showEditModal && editingLocation && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                Editar {editingType === "building" ? "Edificio" : editingType === "classroom" ? "Salón" : "Laboratorio"}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form className="edit-form" onSubmit={handleSaveLocation}>
                <div className="form-group">
                  <label>
                    Nombre del{" "}
                    {editingType === "building" ? "edificio" : editingType === "classroom" ? "salón" : "laboratorio"}:
                  </label>
                  <input
                    type="text"
                    value={editingLocation.name}
                    onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                    placeholder="Nombre"
                  />
                </div>

                {editingType === "building" && (
                  <>
                    <div className="form-group">
                      <label>Ubicación:</label>
                      <input
                        type="text"
                        value={editingLocation.location}
                        onChange={(e) => setEditingLocation({ ...editingLocation, location: e.target.value })}
                        placeholder="Ubicación"
                      />
                    </div>
                    <div className="form-group">
                      <label>Capacidad:</label>
                      <input
                        type="number"
                        value={editingLocation.capacity}
                        onChange={(e) => setEditingLocation({ ...editingLocation, capacity: e.target.value })}
                        placeholder="Capacidad"
                      />
                    </div>
                  </>
                )}

                {editingType === "classroom" && (
                  <>
                    <div className="form-group">
                      <label>Edificio:</label>
                      <input
                        type="text"
                        value={editingLocation.building}
                        onChange={(e) => setEditingLocation({ ...editingLocation, building: e.target.value })}
                        placeholder="Edificio"
                      />
                    </div>
                    <div className="form-group">
                      <label>Capacidad:</label>
                      <input
                        type="number"
                        value={editingLocation.capacity}
                        onChange={(e) => setEditingLocation({ ...editingLocation, capacity: e.target.value })}
                        placeholder="Capacidad"
                      />
                    </div>
                  </>
                )}

                {editingType === "laboratory" && (
                  <>
                    <div className="form-group">
                      <label>Edificio:</label>
                      <input
                        type="text"
                        value={editingLocation.building}
                        onChange={(e) => setEditingLocation({ ...editingLocation, building: e.target.value })}
                        placeholder="Edificio"
                      />
                    </div>
                    <div className="form-group">
                      <label>Equipamiento:</label>
                      <textarea
                        value={editingLocation.equipment}
                        onChange={(e) => setEditingLocation({ ...editingLocation, equipment: e.target.value })}
                        placeholder="Equipamiento disponible"
                      ></textarea>
                    </div>
                  </>
                )}

                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-save">
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminU

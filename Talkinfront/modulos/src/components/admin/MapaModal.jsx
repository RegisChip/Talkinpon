import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Asegúrate de que estas funciones de servicio estén definidas y disponibles
import {
  crearNodo,
  crearRelacion,
  eliminarNodo,
  eliminarRelacion,
} from "../../services/mapaService";

const MapaModal = ({ isOpen, onClose, onSelectPosition, initialPosition }) => {
  // ========================
  // ESTADOS PRINCIPALES
  // ========================
  const [dataList, setDataList] = useState({
    nodes: [], // Puntos intermedios
    relations: [],
    buildings: [], // Edificios existentes del backend
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [clickX, setClickX] = useState(0);
  const [clickY, setClickY] = useState(0);

  const [selectedNode, setSelectedNode] = useState(null);
  const [relationMode, setRelationMode] = useState(false);

  const [contextMenu, setContextMenu] = useState(null);

  // EDIFICIO TEMPORAL (solo para visualización, NO se guarda en la DB)
  const [tempBuilding, setTempBuilding] = useState(null);

  // Modal de selección de tipo de nodo
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [pendingPosition, setPendingPosition] = useState(null);

  const mapRef = useRef(null);

  // ========================
  // HELPERS
  // ========================
  const fetchJson = async (url) => {
    const res = await fetch(url);
    const text = await res.text();

    // Validación básica para asegurar que la respuesta es JSON y no HTML de error
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      throw new Error("El servidor devolvió HTML, no JSON");
    }
    return JSON.parse(text);
  };


  // ========================
  // CARGA DE DATOS (CORREGIDA PARA EDIFICIOS Y PUNTOS INTERMEDIOS)
  // ========================
const fetchData = async () => {
  setLoading(true);
  setError(null);

  try {
    // 1. Cargar Nodos Intermedios y Relaciones
    const dataMapa = await fetchJson("http://localhost:8000/api/ubicaciones/datos-mapa/");

    if (dataMapa.error) {
      throw new Error(dataMapa.error);
    }
    
    // 2. Cargar Edificios desde su propio endpoint
    let buildings = [];
    try {
        const edificiosRes = await fetch("http://localhost:8000/api/rest/edificios/");
        const edificiosData = await edificiosRes.json();
        
        if (Array.isArray(edificiosData)) {
            buildings = edificiosData
                // Solo incluir edificios con coordenadas definidas
                .filter(b => b.pos_x != null && b.pos_y != null) 
                .map(building => ({
                    // Usar un ID consistente para edificios existentes
                    id: String(building.id_edificio || building.id), 
                    pos_x: parseFloat(building.pos_x) || 0,
                    pos_y: parseFloat(building.pos_y) || 0,
                    tipo: 'edificio',
                    nom_nodo: building.nombre || building.nom_nodo || `Edificio ${building.id}`,
                    nombre_especial: building.nombre_especial,
                    isExisting: true, // CLAVE: Identificador para handleNodeClick
                }));
            console.log("🟢 Edificios cargados:", buildings.length);
        } else {
             console.warn("La respuesta de edificios no es un array:", edificiosData);
        }
    } catch (err) {
        console.error("❌ Error cargando edificios desde /api/rest/edificios/", err);
        // Continuamos incluso si falla la carga de edificios
    }


    // Asignar ubicaciones como nodos intermedios (del endpoint datos-mapa)
    const nodes = (dataMapa.ubicaciones || []).map((ubicacion) => ({
      id: String(ubicacion.id),
      id_ubicacion: String(ubicacion.id), // Mantener id_ubicacion para deleteNode
      pos_x: parseFloat(ubicacion.pos_x) || 0, // Asegurar que sea número
      pos_y: parseFloat(ubicacion.pos_y) || 0, // Asegurar que sea número
      tipo: ubicacion.tipo,
      nom_nodo: ubicacion.nom_nodo || `Punto ${ubicacion.id}`,
    }));

    // Asignar relaciones
    const relations = (dataMapa.relaciones || []).map((relacion) => ({
      id: relacion.id,
      origen_id: String(relacion.origen_id),
      destino_id: String(relacion.destino_id),
    }));


    // Actualizar el estado con nodos, relaciones y edificios
    setDataList({
      nodes,
      relations,
      buildings, // <--- Lista de edificios cargados
    });

  } catch (err) {
    setError("Error al cargar datos del servidor");
    console.error("💥 Error al cargar mapa:", err);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    if (isOpen) {
      console.log("🚀 Modal abierto, iniciando carga...");
      fetchData();
      
      // Si hay posición inicial, crear edificio temporal
      if (initialPosition) {
        console.log("📍 Creando edificio temporal con posición inicial:", initialPosition);
        setTempBuilding({
          id: 'temp-building',
          pos_x: initialPosition.x,
          pos_y: initialPosition.y,
          tipo: 'edificio',
          nom_nodo: 'Edificio'
        });
      }
    } else {
      // Limpiar al cerrar
      setTempBuilding(null);
      setRelationMode(false);
      setSelectedNode(null);
      setContextMenu(null);
    }
  }, [isOpen, initialPosition]);


// ========================
// OBTENER NODO (CONSOLIDADO para relaciones)
// ========================
const getNode = (id) => {
  const searchId = String(id); 

  // 1. Buscar en Nodos Intermedios
  let foundNode = dataList.nodes.find((n) => String(n.id) === searchId || String(n.id_ubicacion) === searchId);

  // 2. Si no se encuentra, buscar en Edificios existentes
  if (!foundNode) {
    foundNode = dataList.buildings.find((n) => String(n.id) === searchId);
  }
  
  // 3. Si no se encuentra, buscar en Edificio Temporal
  if (!foundNode && tempBuilding && String(tempBuilding.id) === searchId) {
    foundNode = tempBuilding;
  }

  if (!foundNode) {
    return null;
  }

  return foundNode;
};


  // ========================
  // CLICK EN MAPA (Manejo de creación de nodos)
  // ========================
const handleMapClick = (e) => {
  if (relationMode || !mapRef.current) return;
  setContextMenu(null); // Ocultar cualquier menú

  const rect = mapRef.current.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Si ya hay un edificio temporal, el click solo debe ser para crear un punto intermedio
  if (tempBuilding) {
    const confirm = window.confirm("¿Crear Punto Intermedio aquí? Este nodo se guardará en la base de datos.");
    if (confirm) {
        setPendingPosition({ x, y });
        createIntermediateNode(x, y);
    }
  } else {
    // Si NO hay edificio temporal, preguntamos qué quiere crear (Edificio Temporal o Punto Intermedio)
    setPendingPosition({ x, y });
    setShowTypeModal(true);
  }
};


  // ========================
  // CREAR EDIFICIO TEMPORAL
  // ========================
  const createTempBuilding = () => {
    if (!pendingPosition) return;
    
    // Evita crear un edificio si ya existe uno (sólo debería haber uno temporal)
    if (tempBuilding) {
        alert("Ya existe un edificio temporal. Muévelo o elimínalo primero.");
        setShowTypeModal(false);
        setPendingPosition(null);
        return;
    }

    const newBuilding = {
      id: 'temp-building',
      pos_x: pendingPosition.x,
      pos_y: pendingPosition.y,
      tipo: 'edificio',
      nom_nodo: 'Edificio'
    };
    
    setTempBuilding(newBuilding);
    
    // Notificar al padre las coordenadas
    if (onSelectPosition) {
      onSelectPosition({ x: pendingPosition.x, y: pendingPosition.y });
    }
    
    setShowTypeModal(false);
    setPendingPosition(null);
    alert("Edificio temporal posicionado. Las coordenadas se han guardado en el formulario.");
  };

  // ========================
  // CREAR PUNTO INTERMEDIO
  // ========================
  const createIntermediateNode = async (x, y) => {
    try {
        const result = await crearNodo(x, y, "intermedio");
    
        if (result?.ok && result.nodo) {
            // El backend debe devolver el nodo creado con su ID (ubicacion.id)
            const newNode = {
                ...result.nodo, 
                id: String(result.nodo.id),
                id_ubicacion: String(result.nodo.id), 
                x: x, 
                y: y, 
                tipo: "intermedio"
            };

            setDataList((prev) => ({
                ...prev,
                nodes: [...prev.nodes, newNode],
            }));
            
            alert("Punto intermedio creado correctamente");
        } else {
            alert("Error al crear punto intermedio: " + (result?.message || "Error desconocido."));
            await fetchData(); // Fallback por si la respuesta es incompleta
        }
    } catch (e) {
        console.error("Error en createIntermediateNode:", e);
        alert("Error de conexión al intentar crear el punto intermedio.");
    } finally {
        setShowTypeModal(false);
        setPendingPosition(null);
    }
  };

  const handleCreateIntermediate = () => {
    if (!pendingPosition) return;
    createIntermediateNode(pendingPosition.x, pendingPosition.y);
  };


    // ========================
    // CLICK EN NODO
    // ========================
    const handleNodeClick = (e, node) => {
        e.stopPropagation();

        // 1. Si estamos en modo relación, siempre intentamos conectar
        if (relationMode) {
            handleRelationNodeClick(node);
            return;
        }

        // 2. Edificio Existente (solo permite crear relación)
        if (node.isExisting) {
            setContextMenu({
                type: "existing-building",
                node,
                x: parseFloat(node.pos_x),
                y: parseFloat(node.pos_y),
            });
            return;
        }

        // 3. Edificio Temporal
        if (node.id === 'temp-building') {
            setContextMenu({
                type: "temp-building",
                node,
                x: parseFloat(node.pos_x),
                y: parseFloat(node.pos_y),
            });
            return;
        }

        // 4. Punto Intermedio (nodo)
        setContextMenu({
            type: "node",
            node,
            x: parseFloat(node.pos_x),
            y: parseFloat(node.pos_y),
        });
    };

    // ========================
    // ELIMINAR NODO
    // ========================
    const deleteNode = async (node) => {
        // Usamos el ID de la ubicación si existe, de lo contrario el ID principal
        const idToDelete = node.id_ubicacion || node.id;
        if (!idToDelete) return; 
        
        if (!window.confirm(`¿Eliminar el nodo "${node.nom_nodo}"? Esto también eliminará sus relaciones.`)) return;

        try {
            await eliminarNodo(idToDelete);
            await fetchData(); // Recargar todos los datos
            setContextMenu(null);
            alert("Nodo eliminado correctamente");
        } catch (err) {
            console.error("Error al eliminar nodo:", err);
            alert("Error al eliminar el nodo");
        }
    };


    // ========================
    // RELACIONES (Inicio, Manejo y Creación)
    // ========================
  const startRelationMode = (node) => {
      // Usar id_ubicacion si es un punto intermedio, si no, usar id
      const idToUse = node.id_ubicacion || node.id;

      setSelectedNode({ ...node, id: String(idToUse) }); 
      setRelationMode(true);
      setContextMenu(null);
      alert(`Modo relación activado. Selecciona otro nodo para conectar con "${node.nom_nodo}"`);
  };

const handleRelationNodeClick = (node) => {
    const node1Id = selectedNode.id_ubicacion || selectedNode.id;
    const node2Id = node.id_ubicacion || node.id;

    if (node1Id === node2Id) {
        alert("No puedes conectar un nodo consigo mismo");
        return;
    }

    // Verificar si la relación ya existe (ignorando el orden)
    const relationExists = dataList.relations.some(rel => 
        (String(rel.origen_id) === node1Id && String(rel.destino_id) === node2Id) ||
        (String(rel.origen_id) === node2Id && String(rel.destino_id) === node1Id)
    );

    if (relationExists) {
        alert("Esta relación ya existe.");
        return;
    }

    setContextMenu({
        type: "confirm-relation",
        node1: selectedNode,
        node2: node,
        x: (parseFloat(selectedNode.pos_x) + parseFloat(node.pos_x)) / 2,
        y: (parseFloat(selectedNode.pos_y) + parseFloat(node.pos_y)) / 2,
    });
};


const createRelation = async (node1, node2) => {
    const origenId = node1.id_ubicacion || node1.id;
    const destinoId = node2.id_ubicacion || node2.id;

    if (!origenId || !destinoId) {
        alert("Error: Uno o ambos IDs de nodo están faltando.");
        return;
    }

    const relationData = {
        origen: origenId,
        destino: destinoId,
    };

    try {
        const response = await fetch("http://localhost:8000/api/ubicaciones/crear-relacion/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(relationData),
        });
        const result = await response.json();
        if (result.ok && result.relacion) {
            const newRel = { 
                ...result.relacion, 
                origen_id: String(result.relacion.origen_id), 
                destino_id: String(result.relacion.destino_id) 
            };

            setDataList((prev) => ({
                ...prev,
                relations: [...prev.relations, newRel],
            }));
            alert("Relación creada correctamente");
        } else {
            alert("Error al crear relación: " + (result.message || JSON.stringify(result)));
        }
    } catch (e) {
        alert("Error de conexión al crear la relación.");
        console.error("Error creando relación:", e);
    } finally {
        setRelationMode(false);
        setSelectedNode(null);
        setContextMenu(null);
    }
};

    const cancelRelationMode = () => {
        setRelationMode(false);
        setSelectedNode(null);
        setContextMenu(null);
        alert("Modo relación cancelado");
    };

    // ========================
    // MOVER Y ELIMINAR EDIFICIO TEMPORAL
    // ========================
    const moveTempBuilding = () => {
        alert("Haz clic en el mapa para reposicionar el edificio");
        setContextMenu(null);
        
        const handleReposition = (e) => {
            if (!mapRef.current) return;
            e.stopPropagation();
            
            const rect = mapRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setTempBuilding({
                id: 'temp-building',
                pos_x: x,
                pos_y: y,
                tipo: 'edificio',
                nom_nodo: 'Edificio'
            });

            if (onSelectPosition) {
                onSelectPosition({ x, y });
            }

            mapRef.current.removeEventListener('click', handleReposition);
            
            alert("Edificio reposicionado. Coordenadas actualizadas.");
        };

        if (mapRef.current) {
            const listener = (e) => {
                if (e.target.id === 'mapa' || e.target.tagName === 'svg') {
                    handleReposition(e);
                    mapRef.current.removeEventListener('click', listener);
                }
            };
            mapRef.current.addEventListener('click', listener);
        }
    };

    const deleteTempBuilding = () => {
        const confirm = window.confirm("¿Eliminar el edificio temporal? Esto borrará sus coordenadas del formulario.");
        if (confirm) {
            setTempBuilding(null);
            setContextMenu(null);
            if (onSelectPosition) {
                onSelectPosition(null);
            }
            alert("Edificio temporal eliminado.");
        }
    };

    // ========================
    // ELIMINAR RELACIÓN
    // ========================
    const deleteRelation = async () => {
        if (!contextMenu || contextMenu.type !== "line") return;

        if (!window.confirm("¿Eliminar esta conexión?")) return;

        try {
            await eliminarRelacion(contextMenu.relation.id);

            setDataList((prev) => ({
                ...prev,
                relations: prev.relations.filter(
                    (r) => r.id !== contextMenu.relation.id
                ),
            }));

            setContextMenu(null);
            alert("Conexión eliminada correctamente");
        } catch (err) {
            console.error("Error al eliminar relación:", err);
            alert("Error al eliminar la conexión");
        }
    };
    
    // ========================
    // CERRAR MODAL
    // ========================
    const handleClose = () => {
        if (relationMode) {
            const confirm = window.confirm("Estás en modo relación. ¿Deseas cancelar y cerrar?");
            if (!confirm) return;
        }
        
        onClose();
    };


  if (!isOpen) return null;

  // ========================
  // RENDER CON PORTAL Y LAYOUT HORIZONTAL
  // ========================
  const modalContent = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '15px',
        maxWidth: '1400px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        {/* Botón cerrar */}
        <button 
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '35px',
            height: '35px',
            fontSize: '24px',
            cursor: 'pointer',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            fontWeight: 'bold'
          }}
        >×</button>

        {/* COLUMNA IZQUIERDA - MAPA */}
        <div style={{
          flex: '0 0 770px',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          borderRight: '2px solid #e0e0e0'
        }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '24px', color: '#333' }}>Mapa Interactivo</h2>
          
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <h3>Cargando mapa...</h3>
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h3 style={{ color: "red" }}>{error}</h3>
              <button onClick={fetchData}>Reintentar</button>
            </div>
          ) : (
            <div id="mapa" ref={mapRef} onClick={handleMapClick} style={{
              position: 'relative',
              width: '770px',
              height: '680px',
              border: '2px solid #ccc',
              borderRadius: '8px',
              backgroundImage: `url('/mapa-tec.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              cursor: relationMode ? 'crosshair' : 'default'
            }}>
              <svg width="770" height="680" style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
                {dataList.relations && dataList.relations.length > 0 && dataList.relations.map((rel) => {
                  const n1 = getNode(rel.origen_id);
                  const n2 = getNode(rel.destino_id);

                  if (!n1 || !n2) return null;

                  return (
                    <line
                      key={rel.id}
                      x1={n1.pos_x}
                      y1={n1.pos_y}
                      x2={n2.pos_x}
                      y2={n2.pos_y}
                      stroke="#ff0000"
                      strokeWidth="2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu({
                          type: "line",
                          relation: rel,
                          x: (parseFloat(n1.pos_x) + parseFloat(n2.pos_x)) / 2,
                          y: (parseFloat(n1.pos_y) + parseFloat(n2.pos_y)) / 2,
                        });
                      }}
                    />
                  );
                })}
              </svg>

              {/* EDIFICIO TEMPORAL */}
              {tempBuilding && (
                <div
                  onClick={(e) => handleNodeClick(e, tempBuilding)}
                  style={{
                    position: "absolute",
                    left: `${tempBuilding.pos_x}px`,
                    top: `${tempBuilding.pos_y}px`,
                    width: "15px",
                    height: "15px",
                    backgroundColor: "#ffc107",
                    borderRadius: "50%",
                    cursor: "pointer",
                    border: "4px solid #e0aa07ff",
                    animation: "pulse 2s infinite",
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20,
                  }}
                  title="Edificio (temporal)"
                />
              )}

              {/* PUNTOS INTERMEDIOS */}
              {dataList.nodes.map((node) => {
                const isNodeAtBuildingPosition = dataList.buildings.some(
                  (building) => building.pos_x === node.pos_x && building.pos_y === node.pos_y
                );

                if (isNodeAtBuildingPosition) {
                  return (
                    <div
                      key={node.id}
                      onClick={(e) => handleNodeClick(e, node)}
                      style={{
                        position: "absolute",
                        left: `${node.pos_x}px`,
                        top: `${node.pos_y}px`,
                        width: "15px",
                        height: "15px",
                        backgroundColor: "#1e56a0",
                        borderRadius: "4px",
                        cursor: "pointer",
                        border: "3px solid #003d82",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                        transform: 'translate(-50%, -50%)',
                        zIndex: 999,
                      }}
                      title={`${node.nom_nodo} (edificio existente)`}
                    />
                  );
                }

                return (
                  <div
                    key={node.id}
                    onClick={(e) => handleNodeClick(e, node)}
                    style={{
                      position: "absolute",
                      left: `${node.pos_x}px`,
                      top: `${node.pos_y}px`,
                      width: "10px",
                      height: "10px",
                      backgroundColor: "#00cc44",
                      borderRadius: "50%",
                      cursor: "pointer",
                      transform: 'translate(-50%, -50%)',
                      zIndex: 20,
                    }}
                    title={`${node.nom_nodo} (punto intermedio)`}
                  />
                );
              })}

              {/* MENÚ CONTEXTUAL */}
              {contextMenu && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${contextMenu.x}px`,
                    top: `${contextMenu.y}px`,
                    zIndex: 999999,
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    padding: '5px 0',
                    transform: 'translate(10px, -50%)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {contextMenu.type === "temp-building" && (
                    <>
                      <div onClick={() => startRelationMode(contextMenu.node)} style={{padding: '8px 15px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ccc'}}>
                        🔗 Crear conexión
                      </div>
                      <div onClick={moveTempBuilding} style={{padding: '8px 15px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ccc'}}>
                        📍 Mover edificio
                      </div>
                      <div onClick={deleteTempBuilding} style={{padding: '8px 15px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap', color: 'red', backgroundColor: '#f8f9fa', borderTop: '1px solid #ccc'}}>
                        🗑️ Eliminar edificio
                      </div>
                    </>
                  )}
                  
                  {contextMenu.type === "existing-building" && (
                    <>
                      <div onClick={() => startRelationMode(contextMenu.node)} style={{padding: '8px 15px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ccc'}}>
                        🔗 Crear conexión
                      </div>
                      <div style={{padding: '8px 15px', color: '#999', fontSize: '12px', backgroundColor: '#f8f9fa', borderTop: '1px solid #ccc'}}>
                        (Edificio de la base de datos)
                      </div>
                    </>
                  )}

                  {contextMenu.type === "node" && (
                    <>
                      <div onClick={() => startRelationMode(contextMenu.node)} style={{padding: '8px 15px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ccc'}}>
                        🔗 Crear conexión
                      </div>
                      <div onClick={() => deleteNode(contextMenu.node)} style={{padding: '8px 15px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap', color: 'red', backgroundColor: '#f8f9fa', borderTop: '1px solid #ccc'}}>
                        🗑️ Eliminar nodo
                      </div>
                    </>
                  )}

                  {contextMenu.type === "confirm-relation" && (
                    <div onClick={() => createRelation(contextMenu.node1, contextMenu.node2)} style={{padding: '8px 15px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#28a745', backgroundColor: '#f8f9fa', borderTop: '1px solid #ccc'}}>
                      ✅ Conectar {contextMenu.node1.nom_nodo} con {contextMenu.node2.nom_nodo}
                    </div>
                  )}
                  
                  <div onClick={() => setContextMenu(null)} style={{borderTop: '1px solid #eee', marginTop: '5px', paddingTop: '5px', fontSize: '12px', color: '#666', textAlign: 'center', cursor: 'pointer', backgroundColor: '#f8f9fa'}}>
                    Cerrar menú
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA - INFORMACIÓN */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          overflowY: 'auto',
          background: '#f8f9fa'
        }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', color: '#333' }}>Información del Mapa</h2>

          {/* Indicador de modo relación */}
          {relationMode && (
            <div style={{
              background: '#fff3cd',
              border: '2px solid #ffc107',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '15px',
              fontWeight: '600',
              color: '#856404',
              fontSize: '14px'
            }}>
              🔗 Modo Relación Activo
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', fontWeight: 'normal' }}>
                Conectando: <strong>{selectedNode?.nom_nodo}</strong><br/>
                Selecciona otro nodo en el mapa
              </p>
              <button
                onClick={cancelRelationMode}
                style={{
                  marginTop: '10px',
                  padding: '6px 15px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  width: '100%'
                }}
              >
                Cancelar Modo Relación
              </button>
            </div>
          )}

          {/* Estado del edificio temporal */}
          <div style={{
            background: tempBuilding ? '#d4edda' : '#f8d7da',
            border: `2px solid ${tempBuilding ? '#28a745' : '#dc3545'}`,
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '15px',
            fontSize: '14px',
            fontWeight: '600',
            color: tempBuilding ? '#155724' : '#721c24'
          }}>
            {tempBuilding 
              ? <>
                  ✅ Edificio Temporal Posicionado
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', fontWeight: 'normal' }}>
                    Coordenadas: ({tempBuilding.pos_x.toFixed(1)}, {tempBuilding.pos_y.toFixed(1)})
                  </p>
                </>
              : <>
                  ⚠️ Sin Edificio Temporal
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', fontWeight: 'normal' }}>
                    Haz clic en el mapa para crear uno
                  </p>
                </>
            }
          </div>

          {/* Estadísticas */}
          <div style={{
            background: 'white',
            border: '1px solid #dee2e6',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '15px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#495057' }}>📊 Estadísticas</h3>
            <div style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>🏢 Edificios existentes:</span>
                <strong>{dataList.buildings.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>🟢 Puntos intermedios:</span>
                <strong>{dataList.nodes.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🔗 Conexiones:</span>
                <strong>{dataList.relations.length}</strong>
              </div>
            </div>
          </div>

          {/* Instrucciones */}
          <div style={{
            background: 'white',
            border: '1px solid #dee2e6',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '15px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#495057' }}>📌 Instrucciones</h3>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px', 
              fontSize: '13px', 
              color: '#6c757d',
              lineHeight: '1.8'
            }}>
              <li><strong>Click en el mapa:</strong> Crear edificio o punto intermedio</li>
              <li><strong>Click en nodo:</strong> Ver opciones (conectar/eliminar)</li>
              <li><strong>Cuadrado azul:</strong> Edificio existente (DB)</li>
              <li><strong>Círculo dorado:</strong> Edificio temporal</li>
              <li><strong>Círculo verde:</strong> Punto intermedio</li>
              <li><strong>Líneas rojas:</strong> Conexiones entre nodos</li>
            </ul>
          </div>

          {/* Leyenda */}
          <div style={{
            background: 'white',
            border: '1px solid #dee2e6',
            padding: '15px',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#495057' }}>🎨 Leyenda</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#1e56a0',
                  borderRadius: '4px',
                  border: '3px solid #003d82',
                  flexShrink: 0
                }}></div>
                <span>Edificio existente (base de datos)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#ffc107',
                  borderRadius: '50%',
                  border: '3px solid #e0aa07',
                  flexShrink: 0
                }}></div>
                <span>Edificio temporal (solo coordenadas)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  backgroundColor: '#00cc44',
                  borderRadius: '50%',
                  flexShrink: 0
                }}></div>
                <span>Punto intermedio (se guarda en DB)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '30px',
                  height: '3px',
                  backgroundColor: '#ff0000',
                  flexShrink: 0
                }}></div>
                <span>Conexión entre nodos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE SELECCIÓN DE TIPO */}
      {showTypeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20000
        }} onClick={() => {setShowTypeModal(false); setPendingPosition(null);}}>
          <div 
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '15px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              maxWidth: '400px',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '20px', color: '#333' }}>¿Qué deseas crear?</h2>
            <p style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
              Posición: ({pendingPosition?.x.toFixed(1)}, {pendingPosition?.y.toFixed(1)})
            </p>
            
            <button
              onClick={createTempBuilding}
              style={{
                width: '100%',
                padding: '15px 20px',
                marginBottom: '15px',
                background: 'linear-gradient(135deg, #ffc107 0%, #e0aa07 100%)',
                color: '#333',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              disabled={!!tempBuilding}
            >
              🏢 Edificio (temporal)
            </button>

            <button
              onClick={handleCreateIntermediate}
              style={{
                width: '100%',
                padding: '15px 20px',
                marginBottom: '15px',
                background: 'linear-gradient(135deg, #00cc44 0%, #009933 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              🟢 Punto intermedio
            </button>

            <button
              onClick={() => {
                setShowTypeModal(false);
                setPendingPosition(null);
              }}
              style={{
                width: '100%',
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Cancelar
            </button>

            <p style={{
              marginTop: '20px',
              fontSize: '13px',
              color: '#666',
              lineHeight: '1.5',
              textAlign: 'left'
            }}>
              <strong>Edificio:</strong> Solo para obtener coordenadas (no se guarda en la DB)<br/>
              <strong>Punto intermedio:</strong> Se guarda en la base de datos (Editable)
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default MapaModal;
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./styles/MapaModal.css";

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


  // ... [Resto de las funciones: handleNodeClick, moveTempBuilding, deleteTempBuilding, 
  // startRelationMode, handleRelationNodeClick, createRelation, cancelRelationMode, 
  // deleteNode, deleteRelation, handleClose] ...
  // Mantener estas funciones como se encuentran en la versión previa que te envié.

    // ==================================================================================
    // Para no duplicar todo el código, incluyo las funciones clave de manejo de eventos 
    // y utilidades que deben estar en el componente. Son las mismas que en la respuesta 
    // anterior, pero asegúrate de que existen para que el código sea completo.
    // ==================================================================================


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
    const node1Id = selectedNode.id_ubicacion || selectedNode.id;  // Asegúrate de usar id_ubicacion si está disponible
    const node2Id = node.id_ubicacion || node.id;  // Igualmente aquí

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
    const origenId = node1.id_ubicacion || node1.id;  // Usamos id_ubicacion si está disponible
    const destinoId = node2.id_ubicacion || node2.id; // Igualmente para el destino

    // Verifica que ambos IDs existan antes de hacer la solicitud
    if (!origenId || !destinoId) {
        alert("Error: Uno o ambos IDs de nodo están faltando.");
        return;
    }

    const relationData = {
        origen: origenId,     // <--- ¡CORREGIDO!
        destino: destinoId,   // <--- ¡CORREGIDO!
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
            // Asegura que los IDs estén bien formateados
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

    // ... [Otras funciones (moveTempBuilding, deleteTempBuilding, deleteRelation, handleClose)] ...

    // ========================
    // MOVER Y ELIMINAR EDIFICIO TEMPORAL
    // ========================
    const moveTempBuilding = () => {
        alert("Haz clic en el mapa para reposicionar el edificio");
        setContextMenu(null);
        
        const handleReposition = (e) => {
            if (!mapRef.current) return;
            e.stopPropagation(); // Evita el click del mapa general
            
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

            // Notificar al padre
            if (onSelectPosition) {
                onSelectPosition({ x, y });
            }

            // Remover listener (Importante: esto es un listener temporal)
            mapRef.current.removeEventListener('click', handleReposition);
            
            alert("Edificio reposicionado. Coordenadas actualizadas.");
        };

        // Agregar listener temporal
        if (mapRef.current) {
            // Se debe usar un listener en el mapa para capturar la nueva posición
            const listener = (e) => {
                 // Solo si el click es en el mapa y no en otro nodo
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
                onSelectPosition(null); // Borrar coordenadas del padre
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



	// ========================
	// COMPONENTE PRINCIPAL (Render)
	// ========================

  if (!isOpen) return null;

  // ========================
  // RENDER CON PORTAL
  // ========================
  const modalContent = (
    <div className="mapa-modal-overlay">
      <div className="mapa-modal-container">
        <button className="close-btn" onClick={handleClose}>×</button>
        <h1>Mapa Interactivo</h1>

        {/* Indicador de modo relación */}
        {relationMode && (
          <div style={{
            background: '#fff3cd',
            border: '2px solid #ffc107',
            padding: '10px 15px',
            borderRadius: '8px',
            marginBottom: '10px',
            textAlign: 'center',
            fontWeight: '600',
            color: '#856404'
          }}>
            🔗 Modo Relación: Selecciona otro nodo para conectar con **{selectedNode?.nom_nodo}**
            <button
              onClick={cancelRelationMode}
              style={{
                marginLeft: '15px',
                padding: '5px 15px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Estado del edificio */}
        <div style={{
          background: tempBuilding ? '#d4edda' : '#f8d7da',
          border: `2px solid ${tempBuilding ? '#28a745' : '#dc3545'}`,
          padding: '8px 12px',
          borderRadius: '8px',
          marginBottom: '10px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '600',
          color: tempBuilding ? '#155724' : '#721c24'
        }}>
          {tempBuilding 
            ? `✅ Edificio temporal en (${tempBuilding.pos_x.toFixed(1)}, ${tempBuilding.pos_y.toFixed(1)})`
            : '⚠️ Sin edificio temporal. Crea uno para guardar coordenadas'
          }
        </div>

        {/* Info de elementos cargados */}
        <div style={{
          background: '#d1ecf1',
          border: '1px solid #0c5460',
          padding: '8px 12px',
          borderRadius: '8px',
          marginBottom: '10px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#0c5460'
        }}>
          📊 Edificios existentes: <strong>{dataList.buildings.length}</strong> | 
          Puntos intermedios: <strong>{dataList.nodes.length}</strong> | 
          Conexiones: <strong>{dataList.relations.length}</strong>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2>Cargando mapa...</h2>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2 style={{ color: "red" }}>{error}</h2>
            <button onClick={fetchData}>Reintentar</button>
          </div>
        ) : (
          <div id="mapa" ref={mapRef} onClick={handleMapClick}>
            <svg width="770" height="680" style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
              {/* LÍNEAS DE RELACIÓN */}
              {dataList.relations && dataList.relations.length > 0 && dataList.relations.map((rel) => {
                const n1 = getNode(rel.origen_id);
                const n2 = getNode(rel.destino_id);

                // Si alguno de los nodos no se encuentra, no renderizamos la relación
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


{/* 1. EDIFICIOS EXISTENTES (Cuadrados Azules) */}
{/* {dataList.buildings.map((building) => (
  <div
    key={building.id}
    onClick={(e) => handleNodeClick(e, building)}
    className="nodo edificio existing"
    style={{
      position: "absolute",
      left: `${building.pos_x}px`,
      top: `${building.pos_y}px`,
      width: "22px",  // Tamaño definido como en tu código original
      height: "22px",
      backgroundColor: "#1e56a0",  // Azul oscuro como en tu código
      borderRadius: "4px",
      cursor: "pointer",
      border: "3px solid #003d82",  // Borde oscuro
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      transform: 'translate(-50%, -50%)',  // Centra el nodo
      zIndex: 20,
    }}
    title={`${building.nom_nodo}${building.nombre_especial ? ' - ' + building.nombre_especial : ''} (existente)`}
  />
))} */}

{/* 2. EDIFICIO TEMPORAL (Círculo Dorado con Efecto Pulso) */}
{tempBuilding && (
  <div
    onClick={(e) => handleNodeClick(e, tempBuilding)}
    className="nodo edificio temporal"
    style={{
      position: "absolute",
      left: `${tempBuilding.pos_x}px`,
      top: `${tempBuilding.pos_y}px`,
      width: "15px",  // Tamaño del nodo temporal
      height: "15px",
      backgroundColor: "#ffc107",  // Color azul claro
      borderRadius: "50%",  // Círculo
      cursor: "pointer",
      border: "4px solid #e0aa07ff",  // Borde dorado
      animation: "pulse 2s infinite",  // Efecto de pulso
      transform: 'translate(-50%, -50%)',  // Centra el nodo
      zIndex: 20,
    }}
    title="Edificio (temporal)"
  />
)}

{/* 3. PUNTOS INTERMEDIOS (Círculos Verdes) */}
{dataList.nodes.map((node) => {
  // Verificamos si el nodo tiene la misma posición que algún edificio
  const isNodeAtBuildingPosition = dataList.buildings.some(
    (building) => building.pos_x === node.pos_x && building.pos_y === node.pos_y
  );

  // Si el nodo está en la misma posición que un edificio, usamos el estilo del edificio
  if (isNodeAtBuildingPosition) {
    return (
      <div
        key={node.id}
        onClick={(e) => handleNodeClick(e, node)}
        className="nodo edificio existing"
        style={{
          position: "absolute",
          left: `${node.pos_x}px`,
          top: `${node.pos_y}px`,
          width: "15px",  // Tamaño del edificio
          height: "15px",
          backgroundColor: "#1e56a0",  // Azul oscuro para edificios existentes
          borderRadius: "4px",
          cursor: "pointer",
          border: "3px solid #003d82",  // Borde azul oscuro
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",  // Sombra para el efecto de profundidad
          transform: 'translate(-50%, -50%)',  // Centrado del nodo
          zIndex: 999,
        }}
        title={`${node.nom_nodo} (edificio existente)`}
      />
    );
  }

  // Si no coincide con un edificio, lo mostramos como un nodo normal
  return (
    <div
      key={node.id}
      onClick={(e) => handleNodeClick(e, node)}
      className="nodo intermedio"
      style={{
        position: "absolute",
        left: `${node.pos_x}px`,
        top: `${node.pos_y}px`,
        width: "10px",  // Tamaño de los nodos
        height: "10px",
        backgroundColor: "#00cc44",  // Verde para nodos intermedios
        borderRadius: "50%",  // Círculo para los nodos
        cursor: "pointer",
        transform: 'translate(-50%, -50%)',  // Centrado del nodo
        zIndex: 20,
      }}
      title={`${node.nom_nodo} (punto intermedio)`}
    />
  );
})}



            {/* MENÚ CONTEXTUAL */}
            {contextMenu && (
              <div
    className="menu-opciones"
    style={{
      left: `${contextMenu.x}px`,
      top: `${contextMenu.y}px`,
      zIndex: 999999,
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      padding: '5px 0',
      transform: 'translate(10px, -50%)', // Ajuste para el cursor
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Menu para edificio temporal */}
    {contextMenu.type === "temp-building" && (
      <>
        <div
          onClick={() => startRelationMode(contextMenu.node)}
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #ccc',
          }}
        >
          🔗 Crear conexión
        </div>
        <div
          onClick={moveTempBuilding}
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #ccc',
          }}
        >
          📍 Mover edificio
        </div>
        <div
          onClick={deleteTempBuilding}
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            color: 'red',
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #ccc',
          }}
        >
          🗑️ Eliminar edificio
        </div>
      </>
    )}
                
                {/* Menu para edificio existente */}
{contextMenu.type === "existing-building" && (
      <>
        <div
          onClick={() => startRelationMode(contextMenu.node)}
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #ccc',
          }}
        >
          🔗 Crear conexión
        </div>
        <div
          style={{
            padding: '8px 15px',
            color: '#999',
            fontSize: '12px',
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #ccc',
          }}
        >
          (Edificio de la base de datos)
        </div>
      </>
    )}



                {/* Menu para nodos intermedios */}
{contextMenu.type === "node" && (
      <>
        <div
          onClick={() => startRelationMode(contextMenu.node)}
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #ccc',
          }}
        >
          🔗 Crear conexión
        </div>
        <div
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            color: 'red',
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #ccc',
          }}
          onClick={() => deleteNode(contextMenu.node)}
        >
          🗑️ Eliminar nodo
        </div>
      </>
    )}

                {/* Confirmar relación */}
    {contextMenu.type === "confirm-relation" && (
      <div
        onClick={() => createRelation(contextMenu.node1, contextMenu.node2)}
        style={{
          padding: '8px 15px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#28a745',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #ccc',
        }}
      >
        ✅ Conectar {contextMenu.node1.nom_nodo} con {contextMenu.node2.nom_nodo}
      </div>
    )}
                
                {/* Botón de cerrar para todos los menús */}
    {/* Botón de cerrar para todos los menús */}
    <div
      onClick={() => setContextMenu(null)}
      style={{
        borderTop: '1px solid #eee',
        marginTop: '5px',
        paddingTop: '5px',
        fontSize: '12px',
        color: '#666',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: '#f8f9fa',
      }}
    >
      Cerrar menú
    </div>
              </div>
            )}
          </div>
        )}

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
              onClick={(e) => e.stopPropagation()} // Evita que el clic cierre el modal
            >
              <h2 style={{ marginBottom: '20px', color: '#333' }}>¿Qué deseas crear en ({pendingPosition?.x.toFixed(1)}, {pendingPosition?.y.toFixed(1)})?</h2>
              
              <button
                onClick={createTempBuilding}
                style={{
                  width: '100%',
                  padding: '15px 20px',
                  marginBottom: '15px',
                  background: 'linear-gradient(135deg, #0d51b6 0%, #003d82 100%)',
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
                lineHeight: '1.5'
              }}>
                <strong>Edificio:</strong> Solo para obtener coordenadas (no se guarda en la DB)<br/>
                <strong>Punto intermedio:</strong> Se guarda en la base de datos (Editable)
              </p>
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: '#e9ecef',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#495057'
        }}>
          <strong>📌 Instrucciones:</strong>
          <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
            <li><strong>Click en el mapa:</strong> Muestra el menú de creación (Edificio/Punto Intermedio).</li>
            <li><strong>Click en un nodo:</strong> Muestra el menú contextual (Crear conexión/Eliminar).</li>
            <li>**Edificios existentes (Cuadrado Azul):** Se cargan de la DB, solo pueden conectarse.</li>
            <li>**Edificio temporal (Círculo Dorado):** Es el edificio que estás posicionando actualmente.</li>
          </ul>
        </div>
      </div>

      <style>{`
        .mapa-modal-overlay {
            /* estilos de overlay */
        }
        .mapa-modal-container {
          position: relative;
        }
        
        #mapa {
          position: relative; 
          width: 770px; /* Tamaño definido del mapa */
          height: 680px; /* Tamaño definido del mapa */
          border: 1px solid #ccc;
          background-image: url('tu-imagen-de-mapa.png'); /* Reemplaza con la ruta de tu imagen de fondo */
          background-size: cover;
          background-position: center;
        }

        .menu-opciones {
          position: absolute;
          background: white;
          border: 1px solid #ccc;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 5px 0;
          border-radius: 8px;
          transform: translate(10px, -50%); /* Ajuste para el cursor */
        }
        .menu-opciones > div {
          padding: 8px 15px;
          cursor: pointer;
          font-size: 14px;
          white-space: nowrap;
        }
        .menu-opciones > div:hover {
          background-color: #f0f0f0;
        }

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

  // Usar createPortal para renderizar en document.body
  return createPortal(modalContent, document.body);
};

export default MapaModal;
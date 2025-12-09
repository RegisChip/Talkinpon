import React, { useState, useEffect, useRef } from "react";
import "./styles/MapaModal.css";

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
    nodes: [],
    relations: [],
    buildings: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [clickX, setClickX] = useState(0);
  const [clickY, setClickY] = useState(0);

  const [selectedNode, setSelectedNode] = useState(null);
  const [relationMode, setRelationMode] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [contextMenu, setContextMenu] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [newNodeType, setNewNodeType] = useState("intermedio");

  const mapRef = useRef(null);

  // ========================
  // HELPERS NUEVOS
  // ========================
  const existeEdificio = () => dataList.nodes.some((n) => n.tipo === "edificio");

  const esEdificioUsuario = (node) => {
    if (node.tipo !== "edificio") return false;
    return !dataList.buildings.some((b) => b.id === node.id); // si no viene del backend
  };

  const edificioExistente = () => dataList.nodes.find((n) => n.tipo === "edificio");

  const fetchJson = async (url) => {
    const res = await fetch(url);
    const text = await res.text();

    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      throw new Error("El servidor devolvió HTML, no JSON");
    }
    return JSON.parse(text);
  };

  // OPCIÓN DE CREACIÓN AL HACER CLIC EN MAPA
const preguntarTipoCreacion = () => {
  if (!existeEdificio()) {
    // PRIMERA VEZ → ofrecer edificio o punto
    const choice = window.prompt(
      "¿Qué desea crear?\n1. Edificio\n2. Punto intermedio"
    );

    if (choice === "1") return "edificio";
    if (choice === "2") return "intermedio";
    return null;
  }

  // YA EXISTE edificio → solo puntos
  const confirm = window.confirm("¿Crear punto intermedio aquí?");
  return confirm ? "intermedio" : null;
};


  // ========================
  // CARGA DE DATOS
  // ========================
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchJson("http://localhost:8000/api/ubicaciones/datos-mapa/");

      setDataList({
        nodes: data.ubicaciones || [],
        relations: data.relaciones || [],
        buildings: data.edificios || [],
      });
    } catch (err) {
      setError("Error al cargar datos del servidor");
      console.error("Error al cargar mapa:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  // ========================
  // POSICIÓN INICIAL DESDE PADRE
  // ========================
  useEffect(() => {
    if (initialPosition) {
      setClickX(initialPosition.x);
      setClickY(initialPosition.y);
    }
  }, [initialPosition]);

  // ========================
  // CLICK EN MAPA → NUEVO NODO
  // ========================
const handleMapClick = (e) => {
  if (relationMode || !mapRef.current) return;

  setContextMenu(null);

  const rect = mapRef.current.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  setClickX(x);
  setClickY(y);

  // --- NUEVA LÓGICA CENTRAL ---
  const tipo = preguntarTipoCreacion();

  if (!tipo) return; // Usuario canceló

  // Verificación final del edificio único
  if (tipo === "edificio" && existeEdificio()) {
    alert("Ya existe un edificio. Debes eliminarlo antes de crear otro.");
    return;
  }

  setNewNodeType(tipo);
  setShowModal(true);
};


  // ========================
  // CLICK EN NODO
  // ========================
  const handleNodeClick = (e, node) => {
    e.stopPropagation();

    // NO PERMITIR MODIFICAR edificio que venía desde el backend
    if (node.tipo === "edificio" && !esEdificioUsuario(node)) {
      alert("No puedes modificar edificios existentes del sistema.");
      return;
    }

    if (relationMode) {
      handleRelationNodeClick(node);
      return;
    }

    setContextMenu({
      type: "node",
      node,
      x: parseFloat(node.pos_x),
      y: parseFloat(node.pos_y),
    });
  };

  // ========================
  // RELACIONES
  // ========================
  const startRelationMode = (node) => {
    setSelectedNode(node);
    setRelationMode(true);
    setContextMenu(null);
  };

  const handleRelationNodeClick = (node) => {
    if (selectedNode.id === node.id) return;

    setContextMenu({
      type: "confirm-relation",
      node1: selectedNode,
      node2: node,
      x: (parseFloat(selectedNode.pos_x) + parseFloat(node.pos_x)) / 2,
      y: (parseFloat(selectedNode.pos_y) + parseFloat(node.pos_y)) / 2,
    });
  };

  const createRelation = async () => {
    if (!contextMenu) return;

    const { node1, node2 } = contextMenu;

    const result = await crearRelacion(node1.id, node2.id);
    if (result?.ok) {
      setDataList((prev) => ({
        ...prev,
        relations: [...prev.relations, result.relacion],
      }));
    }

    setRelationMode(false);
    setContextMenu(null);
  };

  // ========================
  // CREAR NUEVO NODO
  // ========================
const saveNode = async () => {
  const esEdif = newNodeType === "edificio";

  const ok = window.confirm(
    `¿Seguro que deseas crear ${esEdif ? "el edificio" : "el punto intermedio"}?`
  );

  if (!ok) {
    setShowModal(false);
    return;
  }

  if (esEdif && existeEdificio()) {
    alert("Ya existe un edificio. Elimínalo antes de crear otro.");
    return;
  }

  const result = await crearNodo(clickX, clickY, newNodeType);

  if (result?.ok) {
    setDataList((prev) => ({
      ...prev,
      nodes: [...prev.nodes, result.nodo],
    }));
  }

  setShowModal(false);
};


  // ========================
  // ELIMINAR NODO
  // ========================
  const deleteNode = async (node) => {
    if (!window.confirm("¿Eliminar nodo?")) return;

    try {
      await eliminarNodo(node.id_ubicacion || node.id);
      fetchData();
      setContextMenu(null);
    } catch (err) {
      console.error("Error al eliminar nodo:", err);
      alert("Hubo un error eliminando el nodo.");
    }
  };

  // ========================
  // ELIMINAR RELACIÓN
  // ========================
  const deleteRelation = async () => {
    if (!contextMenu) return;

    await eliminarRelacion(contextMenu.relation.id);

    setDataList((prev) => ({
      ...prev,
      relations: prev.relations.filter(
        (r) => r.id !== contextMenu.relation.id
      ),
    }));

    setContextMenu(null);
  };

  const getNode = (id) => dataList.nodes.find((n) => n.id === id);

  if (!isOpen) return null;

  if (loading)
    return (
      <div className="mapa-modal-overlay">
        <div className="mapa-modal-container">
          <h2>Cargando mapa...</h2>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="mapa-modal-overlay">
        <div className="mapa-modal-container">
          <h2 style={{ color: "red" }}>{error}</h2>
          <button onClick={fetchData}>Reintentar</button>
        </div>
      </div>
    );

  // ========================
  // RENDER PRINCIPAL
  // ========================
  return (
    <div className="mapa-modal-overlay">
      <div className="mapa-modal-container">
        <button className="close-btn" onClick={onClose}>×</button>
        <h1>Mapa Interactivo</h1>

        <div id="mapa" ref={mapRef} onClick={handleMapClick}>
          <svg width="770" height="680">
            {dataList.relations.map((rel) => {
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
                  style={{ cursor: "pointer" }}
                />
              );
            })}
          </svg>

          {dataList.nodes.map((node) => (
            <div
              key={node.id}
              onClick={(e) => handleNodeClick(e, node)}
              className={`nodo ${node.tipo}`}
              style={{
                position: "absolute",
                left: `${node.pos_x}px`,
                top: `${node.pos_y}px`,
                width: node.tipo === "edificio" ? "20px" : "14px",
                height: node.tipo === "edificio" ? "20px" : "14px",
                backgroundColor:
                  node.tipo === "edificio" ? "#0d51b6ff" : "#00cc44",
                borderRadius: node.tipo === "edificio" ? "30px" : "50%",
                cursor: "pointer",
              }}
              title={`${node.nom_nodo} (${node.tipo})`}
            />
          ))}

          {contextMenu && (
            <div
              className="menu-opciones"
              style={{
                left: `${contextMenu.x}px`,
                top: `${contextMenu.y}px`,
              }}
            >
              {contextMenu.type === "node" && (
                <>
                  <div onClick={() => startRelationMode(contextMenu.node)}>
                    Crear relación
                  </div>

                  {/* NO PERMITIR ELIMINAR edificio preexistente */}
                  {(contextMenu.node.tipo !== "edificio" || esEdificioUsuario(contextMenu.node)) && (
                    <div
                      style={{ color: "red" }}
                      onClick={() => deleteNode(contextMenu.node)}
                    >
                      Eliminar nodo
                    </div>
                  )}
                </>
              )}

              {contextMenu.type === "confirm-relation" && (
                <div onClick={createRelation}>Confirmar relación</div>
              )}

              {contextMenu.type === "line" && (
                <div onClick={deleteRelation}>Eliminar relación</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapaModal;

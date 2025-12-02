import React, { useState, useEffect, useRef } from "react";

const MAP_W = 770;
const MAP_H = 680;

export default function MapaInteractivoDijkstra({ 
  ubicacionesData, 
  onClose,
  apiEndpoint = '/ruta/dijkstra/',
  onRouteCalculationSuccess,
  onRouteCalculationError,
  rutaData, // Cambiar de rutaDescripcionIA a rutaData
  onClearRoute, // Recibir función para limpiar desde el padre
}) {
  const canvasRef = useRef(null);
  const debugLogRef = useRef(null);
  const animationFrameId = useRef(null);

  // Estados del mapa interactivo
  const [modo, setModo] = useState('uno');
  const [origenFijoId, setOrigenFijoId] = useState(null);
  const [seleccionOrigenId, setSeleccionOrigenId] = useState(null);
  const [seleccionDestinoId, setSeleccionDestinoId] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);
  const [mostrarSoloOrigenDestino, setMostrarSoloOrigenDestino] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Inicializar origen fijo
  useEffect(() => {
    if (!ubicacionesData || ubicacionesData.length === 0) return;
    
    const edificioA = ubicacionesData.find(e => 
      e.nombre_edificio?.trim().toUpperCase() === 'A'
    );
    const idInicial = edificioA ? Number(edificioA.id) : Number(ubicacionesData[0]?.id);
    setOrigenFijoId(idInicial);
    addDebugLog(`Sistema iniciado. Edificios cargados: ${ubicacionesData.length}`);
  }, [ubicacionesData]);

  // Debug logger
  const addDebugLog = (msg, tipo = 'info') => {
    const icon = tipo === 'error' ? '❌' : tipo === 'success' ? '✅' : tipo === 'warning' ? '⚠️' : 'ℹ️';
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, { time, icon, msg }]);
  };

  // Auto-scroll debug
  useEffect(() => {
    if (debugLogRef.current) {
      debugLogRef.current.scrollTop = debugLogRef.current.scrollHeight;
    }
  }, [debugLogs]);

  // Limpiar cuando cambia el modo o se inicia nueva búsqueda
  const limpiarTodo = () => {
    // Limpiar estados locales
    setSeleccionOrigenId(null);
    setSeleccionDestinoId(null);
    setMostrarSoloOrigenDestino(false);
    setIsCalculating(false);
    
    // Limpiar canvas
    limpiarCanvas();
    
    // Cancelar animación si existe
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    
    // Notificar al componente padre que limpie la ruta
    if (onClearRoute) {
      onClearRoute();
    }
  };

  const cambiarModo = (nuevoModo) => {
    limpiarTodo(); // Usar la función de limpieza completa
    setModo(nuevoModo);
    addDebugLog(`Modo cambiado a: ${nuevoModo === 'uno' ? 'Una ubicación' : 'Dos ubicaciones'}`);
  };

  const manejarClickEdificio = (id) => {
    id = Number(id);
    const ed = ubicacionesData.find(x => Number(x.id) === id);
    const nombre = ed ? ed.nombre_edificio : 'Desconocido';

    // Si ya hay una ruta calculada, limpiarla primero
    if (rutaData) {
      limpiarTodo();
    }

    if (modo === 'uno') {
      if (id === origenFijoId) {
        addDebugLog('Este es el origen fijo', 'warning');
        return;
      }
      setSeleccionDestinoId(id);
      addDebugLog(`Destino seleccionado: ${nombre}`);
    } else {
      if (!seleccionOrigenId) {
        setSeleccionOrigenId(id);
        addDebugLog(`Origen seleccionado: ${nombre}`);
      } else if (!seleccionDestinoId) {
        if (id === seleccionOrigenId) {
          addDebugLog('Elige otro edificio', 'warning');
          return;
        }
        setSeleccionDestinoId(id);
        addDebugLog(`Destino seleccionado: ${nombre}`);
      } else {
        setSeleccionOrigenId(seleccionDestinoId);
        setSeleccionDestinoId(id);
        const eo = ubicacionesData.find(x => Number(x.id) === seleccionDestinoId);
        addDebugLog(`Ruta actualizada: Origen ${eo?.nombre_edificio} → Destino ${nombre}`);
      }
    }
  };

  const calcularRuta = async () => {
    let origenId, destinoId;
    
    if (modo === 'uno') {
      origenId = origenFijoId;
      destinoId = seleccionDestinoId;
    } else {
      origenId = seleccionOrigenId;
      destinoId = seleccionDestinoId;
    }

    if (!destinoId || !origenId) {
      addDebugLog('Selecciona origen y destino', 'warning');
      return;
    }

    // Limpiar ruta anterior si existe
    if (rutaData && onClearRoute) {
      onClearRoute();
    }

    setIsCalculating(true);
    limpiarCanvas();

    const url = `${apiEndpoint}?origen=${origenId}&destino=${destinoId}`;
    
    try {
      addDebugLog('Calculando ruta...', 'info');
      const res = await fetch(url);
      
      if (!res.ok) throw new Error('Error servidor');
      
      const data = await res.json();
      
      console.log('📦 Datos completos del servidor:', data);
      
      if (data.camino_coordenadas && data.camino_coordenadas.length > 0) {
        const caminoConCoordenadas = data.camino_coordenadas.map(nodo => ({
          nom_nodo: nodo.nom_nodo,
          tipo: nodo.tipo,
          pos_x: Number(nodo.pos_x),
          pos_y: Number(nodo.pos_y)
        }));
        
        dibujarRuta(caminoConCoordenadas);
        setMostrarSoloOrigenDestino(true);
        addDebugLog(` Ruta calculada: ${caminoConCoordenadas.length} nodos`, 'success');

        // Notificar al componente padre
        onRouteCalculationSuccess(data);
        
      } else {
        throw new Error('El servidor no devolvió una ruta válida.');
      }
    } catch (e) {
      addDebugLog(`Error: ${e.message}`, 'error');
      console.error('Error completo:', e);
      onRouteCalculationError(e.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const dibujarRuta = (camino) => {
    // (Mantener la misma función de dibujar ruta)
    const canvas = canvasRef.current;
    if (!canvas || !camino || camino.length === 0) return;

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, MAP_W, MAP_H);
    
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(98, 5, 5, 0.75)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    let segmentos = [];
    for (let i = 0; i < camino.length - 1; i++) {
      const x1 = Number(camino[i].pos_x);
      const y1 = Number(camino[i].pos_y);
      const x2 = Number(camino[i + 1].pos_x);
      const y2 = Number(camino[i + 1].pos_y);
      const distancia = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      segmentos.push({ x1, y1, x2, y2, distancia });
    }
    
    const duracionTotal = 7000;
    const tiempoInicio = Date.now();
    
    const animar = () => {
      const tiempoTranscurrido = Date.now() - tiempoInicio;
      const progreso = Math.min(tiempoTranscurrido / duracionTotal, 1);
      
      ctx.clearRect(0, 0, MAP_W, MAP_H);
      ctx.beginPath();
      ctx.moveTo(Number(camino[0].pos_x), Number(camino[0].pos_y));
      
      let distanciaTotal = 0;
      segmentos.forEach(seg => distanciaTotal += seg.distancia);
      
      let distanciaObjetivo = distanciaTotal * progreso;
      let distanciaAcumulada = 0;
      
      for (let seg of segmentos) {
        if (distanciaAcumulada + seg.distancia <= distanciaObjetivo) {
          ctx.lineTo(seg.x2, seg.y2);
          distanciaAcumulada += seg.distancia;
        } else {
          const distanciaRestante = distanciaObjetivo - distanciaAcumulada;
          if (seg.distancia > 0) {
            const porcentaje = distanciaRestante / seg.distancia;
            const x = seg.x1 + (seg.x2 - seg.x1) * porcentaje;
            const y = seg.y1 + (seg.y2 - seg.y1) * porcentaje;
            ctx.lineTo(x, y);
          }
          break;
        }
      }
      
      ctx.stroke();
      
      if (progreso < 1) {
        animationFrameId.current = requestAnimationFrame(animar);
      } else {
        console.log('✅ Ruta completamente dibujada con', camino.length, 'puntos');
        animationFrameId.current = null;
      }
    };
    
    animar();
  };

  const limpiarCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, MAP_W, MAP_H);
    }
  };

  const buscarNuevaRuta = () => {
    limpiarTodo(); // Usar función de limpieza completa
    addDebugLog('Nueva búsqueda iniciada');
  };

  const getOrigenFijoNombre = () => {
    const ed = ubicacionesData.find(e => Number(e.id) === origenFijoId);
    return ed ? ed.nombre_edificio : 'Cargando...';
  };

  const getOrigenNombre = () => {
    if (!seleccionOrigenId) return 'No seleccionado';
    const ed = ubicacionesData.find(e => Number(e.id) === seleccionOrigenId);
    return ed ? ed.nombre_edificio : 'N/A';
  };

  const getDestinoNombre = () => {
    if (!seleccionDestinoId) return 'No seleccionado';
    const ed = ubicacionesData.find(e => Number(e.id) === seleccionDestinoId);
    return ed ? ed.nombre_edificio : 'N/A';
  };

  // Lógica para mostrar botones
  const shouldShowButton = (id) => {
    if (mostrarSoloOrigenDestino) {
      const origenId = modo === 'uno' ? origenFijoId : seleccionOrigenId;
      return Number(id) === Number(origenId) || Number(id) === Number(seleccionDestinoId);
    }
    return true;
  };

  return (
    <>
      {/* HEADER SUPERIOR */}
      <div className="fusionApp-map-header">
        <h3>Mapa Interactivo del Campus</h3>
        <button onClick={onClose} className="fusionApp-map-close-btn">✕</button>
      </div>

      <div className="map-main-layout">
        {/* COLUMNA IZQUIERDA: MAPA */}
        <div className="map-left">
          <div className="map-mapa-container" style={{ position: 'relative', width: MAP_W, height: MAP_H }}>
            <img 
              src="/mapa_tec.png" 
              alt="Mapa Campus" 
              style={{ 
                width: MAP_W, 
                height: MAP_H, 
                display: 'block',
                borderRadius: '8px'
              }} 
            />

            <canvas
              ref={canvasRef}
              width={MAP_W}
              height={MAP_H}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 1
              }}
            />

            {ubicacionesData && ubicacionesData.map((u) => {
              const isVisible = shouldShowButton(u.id);
              const isOrigenFijo = modo === 'uno' && Number(u.id) === origenFijoId;
              const isOrigen = Number(u.id) === seleccionOrigenId;
              const isDestino = Number(u.id) === seleccionDestinoId;
              
              return (
                <button
                  key={u.id}
                  className={`map-ubicacion-btn ${isOrigenFijo ? 'origen-fijo' : ''} ${isOrigen ? 'seleccionado-origen' : ''} ${isDestino ? 'seleccionado-destino' : ''}`}
                  style={{ 
                    top: u.pos_y, 
                    left: u.pos_x,
                    display: isVisible ? 'inline-block' : 'none',
                    zIndex: 2
                  }}
                  onClick={() => manejarClickEdificio(u.id)}
                  onMouseEnter={(e) => e.currentTarget.style.zIndex = '999'}
                  onMouseLeave={(e) => e.currentTarget.style.zIndex = '2'}
                  onMouseDown={(e) => e.currentTarget.style.zIndex = '999'}
                >
                  {u.nombre_edificio}
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="map-right-panel">
          {/* Instrucciones / descripción de la ruta */}
          <div className="map-help-panel">
            {rutaData?.descripcion_ia ? (
              <div className="map-info-ruta-container">
                <div className="map-ia-description">
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.9rem' }}>
                    {rutaData.descripcion_ia}
                  </p>
                </div>
                {rutaData.destino?.imagen && (
                  <div className="map-ia-image-container">
                    <img 
                      src={rutaData.destino.imagen} 
                      alt={`Edificio ${rutaData.destino.nombre}`}
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                    <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '5px' }}>
                      Edificio {rutaData.destino.nombre} 
                    </span>
                  </div>
                )}
              </div>
            ) : isCalculating ? (
              <div style={{padding: '20px', textAlign: 'center'}}>
                <h4> <i className="bi bi-compass"></i> Calculando ruta</h4>
                <div style={{fontSize: '2rem', marginBottom: '10px'}}>⏳</div>
                <p style={{fontSize: '1rem', color: '#750f0f'}}>
                  Estamos generando la mejor ruta para ti... Esto puede tardar un momento.
                </p>
              </div>
            ) : (
              <div className="map-info-instrucciones">
                <h4> <i className="bi bi-compass"></i> Instrucciones de uso del mapa</h4>
                <ul>
                  <li>
                    <b>Una ubicación:</b> Se precarga automáticamente el edificio A como origen. 
                    Solo elige el edificio al que quieres ir.
                  </li>
                  <li>
                    <b>Dos ubicaciones:</b> Permite seleccionar manualmente tu origen y destino.
                  </li>
                  <li>
                    La información seleccionada aparece en el panel informativo.
                  </li>
                  <li>
                    Cuando tengas origen y destino, presiona <b>Calcular Ruta</b> para ver el recorrido.
                  </li>
                  <li>
                    En el chat aparecerán instrucciones detalladas e imagen de referencia.
                  </li>
                  <li>
                    Para iniciar otra búsqueda, usa el botón <b>Nueva búsqueda</b>.
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Info de selección */}
          <div className="map-info-seleccion">
            {!rutaData ? (
              <>
                {modo === 'uno' && (
                  <div className="map-info-item">
                    <span className="map-info-label">🔴 Ubicación actual:</span>
                    <span className={`map-info-value ${getOrigenFijoNombre() !== 'No seleccionado' ? 'seleccionado' : ''}`}>
                      {getOrigenFijoNombre()}
                    </span>
                  </div>
                )}

                {modo === 'dos' && (
                  <div className="map-info-item">
                    <span className="map-info-label">🔵 Origen:</span>
                    <span className={`map-info-value ${getOrigenNombre() !== 'No seleccionado' ? 'seleccionado' : ''}`}>
                      {getOrigenNombre()}
                    </span>
                  </div>
                )}

                <div className="map-info-item">
                  <span className="map-info-label">🟢 Destino:</span>
                  <span className={`map-info-value ${getDestinoNombre() !== 'No seleccionado' ? 'seleccionado' : ''}`}>
                    {getDestinoNombre()}
                  </span>
                </div>

                <div className="map-info-item">
                  <span className="map-info-label">Modo actual:</span>
                  <span className="map-info-value seleccionado">
                    {modo === 'uno' ? 'Una ubicación' : 'Dos ubicaciones'}
                  </span>
                </div>
              </>
            ) : (
              <div className="map-info-item">
                <span className="map-info-label">📍 Ruta activa:</span>
                <span className="map-info-value seleccionado">
                  {rutaData.origen?.nombre} → {rutaData.destino?.nombre}
                </span>
              </div>
            )}
          </div>

          {/* Panel de control */}
          <div className="map-panel-control">
            <button 
              className={`map-modo-btn ${modo === 'uno' ? 'active' : ''}`}
              onClick={() => cambiarModo('uno')}
            >
              Una Ubicacion
            </button>

            <button 
              className={`map-modo-btn ${modo === 'dos' ? 'active' : ''}`}
              onClick={() => cambiarModo('dos')}
            >
              Dos Ubicaciones
            </button>

            <button 
              className="map-btn-calcular"
              onClick={calcularRuta}
              disabled={!seleccionDestinoId || (modo === 'dos' && !seleccionOrigenId) || isCalculating}
              style={{ display: rutaData ? 'none' : 'inline-block' }}
            >
              {isCalculating ? 'Calculando...' : 'Calcular Ruta'}
            </button>

            {rutaData && (
              <button 
                className="map-btn-nueva" 
                onClick={buscarNuevaRuta}
              >
                Nueva búsqueda
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
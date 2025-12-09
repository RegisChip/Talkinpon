// Talkinpon\Talkinfront\modulos\src\components\Fusion\MapaInteractivoDijkstra.jsx
import React, { useState, useEffect, useRef } from "react";

const MAP_W = 770;
const MAP_H = 680;

// VERSIÓN FUSIONADA MÍNIMA: Solo modifica el panel de instrucciones
export default function MapaInteractivoDijkstra({ 
  ubicacionesData, 
  onClose,
  apiEndpoint = '/ruta/dijkstra/',
  rutaAutomatica = null  // NUEVO prop
}) {
  
  const canvasRef = useRef(null);
  const debugLogRef = useRef(null);
  
  // Estados del mapa interactivo
  const [modo, setModo] = useState('uno');
  const [origenFijoId, setOrigenFijoId] = useState(null);
  const [seleccionOrigenId, setSeleccionOrigenId] = useState(null);
  const [seleccionDestinoId, setSeleccionDestinoId] = useState(null);
  const [debugLogs, setDebugLogs] = useState([]);
  const [mostrarSoloOrigenDestino, setMostrarSoloOrigenDestino] = useState(false);
  const [rutaInfo, setRutaInfo] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // ========== NUEVO: ESTADOS PARA TEXT-TO-SPEECH ==========
  const [voicesReady, setVoicesReady] = useState(false);

  // ========== NUEVO: FUNCIÓN PARA HABLAR ==========
  const speak = (text) => {
    // Si las voces aún no están listas, reintentamos
    if (!voicesReady) {
      console.log("⏳ Voces no listas, reintentando...");
      setTimeout(() => speak(text), 200);
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);

      const voices = window.speechSynthesis.getVoices();
      const spanish = voices.find(v =>
        v.lang.toLowerCase().includes("es")
      );

      if (spanish) {
        utter.voice = spanish;
        console.log("🔊 Usando voz:", spanish.name);
      }

      utter.lang = "es-MX";
      utter.rate = 1;
      utter.pitch = 1;

      window.speechSynthesis.speak(utter);

    } catch (err) {
      console.error("❌ Error al hablar:", err);
    }
  };

  // ========== NUEVO: CARGAR VOCES PARA TTS ==========
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log("🎤 Voces disponibles en mapa:", voices.length);

      if (voices.length > 0) {
        setVoicesReady(true);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      // Cancelar cualquier síntesis de voz al desmontar
      window.speechSynthesis.cancel();
    };
  }, []);

  // ========== EFECTO PARA RUTA AUTOMÁTICA ==========
  useEffect(() => {
    if (!rutaAutomatica || !ubicacionesData || ubicacionesData.length === 0) return;
    
    console.log("🗺️ CONFIGURANDO RUTA AUTOMÁTICA:", rutaAutomatica);
    
    // Configurar modo según si viene origen
    if (rutaAutomatica.origen_nombre && rutaAutomatica.origen_nombre !== 'A') {
      setModo('dos');
      setSeleccionOrigenId(rutaAutomatica.origen_id);
    } else {
      setModo('uno');
      // El origen fijo ya está configurado (Edificio A)
    }
    
    setSeleccionDestinoId(rutaAutomatica.destino_id);
    
    addDebugLog(`🗺️ Ruta automática: ${rutaAutomatica.origen_nombre} → ${rutaAutomatica.destino_nombre}`, 'info');
    
    // Calcular ruta automáticamente después de un momento
    setTimeout(() => {
      calcularRuta();
    }, 500);
    
  }, [rutaAutomatica]); // Se ejecuta cuando cambia rutaAutomatica

  // Inicializar origen fijo (Edificio A)
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
  
  // Funciones del mapa interactivo
  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setSeleccionOrigenId(null);
    setSeleccionDestinoId(null);
    setMostrarSoloOrigenDestino(false);
    setRutaInfo(null);
    setIsCalculating(false);
    limpiarCanvas();
    
    const mensaje = `Modo cambiado a: ${nuevoModo === 'uno' ? 'Una ubicación' : 'Dos ubicaciones'}`;
    addDebugLog(mensaje);
    
    // 🔊 HABLAR el cambio de modo
    speak(mensaje);
  };
  
  const manejarClickEdificio = (id) => {
    id = Number(id);
    const ed = ubicacionesData.find(x => Number(x.id) === id);
    const nombre = ed ? ed.nombre_edificio : 'Desconocido';
    
    if (modo === 'uno') {
      if (id === origenFijoId) {
        const mensaje = 'Este es el origen fijo';
        addDebugLog(mensaje, 'warning');
        speak(mensaje); // 🔊 HABLAR
        return;
      }
      setSeleccionDestinoId(id);
      const mensaje = `Destino seleccionado: ${nombre}`;
      addDebugLog(mensaje);
      speak(mensaje); // 🔊 HABLAR
    } else {
      if (!seleccionOrigenId) {
        setSeleccionOrigenId(id);
        const mensaje = `Origen seleccionado: ${nombre}`;
        addDebugLog(mensaje);
        speak(mensaje); // 🔊 HABLAR
      } else if (!seleccionDestinoId) {
        if (id === seleccionOrigenId) {
          const mensaje = 'Elige otro edificio';
          addDebugLog(mensaje, 'warning');
          speak(mensaje); // 🔊 HABLAR
          return;
        }
        setSeleccionDestinoId(id);
        const mensaje = `Destino seleccionado: ${nombre}`;
        addDebugLog(mensaje);
        speak(mensaje); // 🔊 HABLAR
      } else {
        setSeleccionOrigenId(seleccionDestinoId);
        setSeleccionDestinoId(id);
        const eo = ubicacionesData.find(x => Number(x.id) === seleccionDestinoId);
        const mensaje = `Ruta actualizada: Origen ${eo?.nombre_edificio} hacia Destino ${nombre}`;
        addDebugLog(mensaje);
        speak(mensaje); // 🔊 HABLAR
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
      const mensaje = 'Selecciona origen y destino';
      addDebugLog(mensaje, 'warning');
      speak(mensaje); // 🔊 HABLAR
      return;
    }
    
    setIsCalculating(true);
    const url = `${apiEndpoint}?origen=${origenId}&destino=${destinoId}`;
    
    // 🔊 HABLAR inicio del cálculo
    speak('Calculando ruta, espera un momento');
    
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
        
        console.log('✅ Camino con coordenadas:', caminoConCoordenadas);
        
        dibujarRuta(caminoConCoordenadas);
        
        // Guardar información completa incluyendo descripción de IA
        setRutaInfo({
          origen: data.origen,
          destino: data.destino,
          distancia: data.distancia_total,
          nodos: data.nodos_visitados,
          descripcion_ia: data.descripcion_ia,
          imagen_url: data.destino?.imagen_url
        });
        
        setMostrarSoloOrigenDestino(true);
        
        addDebugLog(`✅ Ruta calculada: ${caminoConCoordenadas.length} nodos`, 'success');
        
        // 🔊 HABLAR resultado exitoso
        const mensajeExito = `Ruta calculada con éxito. ${data.distancia_total ? `Distancia total: ${data.distancia_total.toFixed(0)} metros.` : ''}`;
        speak(mensajeExito);
        
        // 🔊 HABLAR la descripción de IA si existe
        if (data.descripcion_ia) {
          // Esperar un momento antes de leer las instrucciones
          setTimeout(() => {
            speak(data.descripcion_ia);
          }, 2000);
        }
        
        if (data.distancia_total) {
          addDebugLog(`📏 Distancia total: ${data.distancia_total.toFixed(2)}m`, 'info');
        }
        
      } else {
        console.error('❌ El servidor no envió camino_coordenadas');
        console.log('📦 Datos recibidos:', data);
        throw new Error('El servidor no envió las coordenadas de la ruta');
      }
    } catch (e) {
      const errorMsg = `Error: ${e.message}`;
      addDebugLog(errorMsg, 'error');
      speak('Error al calcular la ruta. Por favor intenta de nuevo.'); // 🔊 HABLAR error
      console.error('Error completo:', e);
    } finally {
      setIsCalculating(false);
    }
  };

  const dibujarRuta = (camino) => {
    const canvas = canvasRef.current;
    if (!canvas || !camino || camino.length === 0) return;
    
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
    
    const duracionTotal = 2000;
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
          const porcentaje = distanciaRestante / seg.distancia;
          const x = seg.x1 + (seg.x2 - seg.x1) * porcentaje;
          const y = seg.y1 + (seg.y2 - seg.y1) * porcentaje;
          ctx.lineTo(x, y);
          break;
        }
      }
      
      ctx.stroke();
      
      if (progreso < 1) {
        requestAnimationFrame(animar);
      } else {
        console.log('✅ Ruta completamente dibujada con', camino.length, 'puntos');
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
    setSeleccionOrigenId(null);
    setSeleccionDestinoId(null);
    setMostrarSoloOrigenDestino(false);
    setRutaInfo(null);
    setIsCalculating(false);
    limpiarCanvas();
    
    const mensaje = 'Nueva búsqueda iniciada';
    addDebugLog(mensaje);
    speak(mensaje); // 🔊 HABLAR
    
    // Cancelar cualquier síntesis de voz en curso
    window.speechSynthesis.cancel();
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
  
  const shouldShowButton = (id) => {
    if (mostrarSoloOrigenDestino) {
      const origenId = modo === 'uno' ? origenFijoId : seleccionOrigenId;
      return Number(id) === Number(origenId) || Number(id) === Number(seleccionDestinoId);
    }
    return true;
  };

  return (
    <>
      <div className="fusionApp-map-header">
        <h3>Mapa Interactivo del Campus</h3>
        <button onClick={onClose} className="fusionApp-map-close-btn">✕</button>
      </div>
      
      <div className="map-main-layout">
        {/* ======= COLUMNA IZQUIERDA: MAPA ======= */}
        <div className="map-left">
          <div 
            className="map-mapa-container"
            style={{ position: 'relative', width: MAP_W, height: MAP_H }}
          >
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
            
            {/* CONTENEDOR DE INFORMACIÓN DENTRO DEL MAPA */}
            <div 
              className="map-info-overlay"
              style={{
                position: 'absolute',
                top: '90px',
                right: '-35px',
                width: '170px',
                maxHeight: '400px',
                background: 'rgba(255, 255, 255, 0.95)',
                border: '3px solid #750f0f',
                borderRadius: '12px',
                padding: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: 100,
                overflowY: 'auto'
              }}
            >
              <h4 style={{ 
                margin: '0 0 12px 0', 
                fontSize: '12px', 
                color: '#750f0f',
                borderBottom: '2px solid #750f0f',
                paddingBottom: '8px',
                textAlign: 'center'
              }}>
                <strong>Información Edificios</strong>
              </h4>
              <div>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#2c3e50' }}>
                  U <i className="bi bi-arrow-right" style={{ color: '#750f0f' }}></i> Auditorio
                  <span style={{ display: 'block', borderBottom: '1px dotted #bdc3c7', margin: '4px 0' }}></span>
                  
                  R <i className="bi bi-arrow-right" style={{ color: '#750f0f' }}></i> Cafetería
                  <span style={{ display: 'block', borderBottom: '1px dotted #bdc3c7', margin: '4px 0' }}></span>
                  
                  X <i className="bi bi-arrow-right" style={{ color: '#750f0f' }}></i> Cafetería Roja
                  <span style={{ display: 'block', borderBottom: '1px dotted #bdc3c7', margin: '4px 0' }}></span>
                  
                  AF <i className="bi bi-arrow-right" style={{ color: '#750f0f' }}></i> Centro de Información
                  <span style={{ display: 'block', borderBottom: '1px dotted #bdc3c7', margin: '4px 0' }}></span>
                  
                  LL <i className="bi bi-arrow-right" style={{ color: '#750f0f' }}></i> Centro de Negocios
                  <span style={{ display: 'block', borderBottom: '1px dotted #bdc3c7', margin: '4px 0' }}></span>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* ======= COLUMNA DERECHA ======= */}
        <div className="map-right-panel">
          {/* Panel de instrucciones con 3 estados */}
          <div className="map-help-panel">
            {isCalculating ? (
              // Estado 1: Calculando ruta
              <div style={{padding: '20px', textAlign: 'center'}}>
                <h4><i className="bi bi-compass"></i> Calculando ruta</h4>
                <div style={{fontSize: '2rem', marginBottom: '10px'}}>⏳</div>
                <p style={{fontSize: '1rem', color: '#750f0f'}}>
                  Estamos generando la mejor ruta para ti... Esto puede tardar un momento.
                </p>
              </div>
            ) : rutaInfo?.descripcion_ia ? (
              // Estado 2: Mostrar descripción de IA
              <div className="map-info-ruta-container">
                <h4><i className="bi bi-compass"></i> Tu Ruta</h4>
                <div className="map-ia-description">
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {rutaInfo.descripcion_ia}
                  </p>
                </div>
              </div>
            ) : (
              // Estado 3: Instrucciones iniciales
              <>
                <h4><i className="bi bi-compass"></i> Instrucciones de uso del mapa</h4>
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
              </>
            )}
          </div>
          
          {/* Info de selección */}
          <div className="map-info-seleccion">
            {modo === 'uno' && (
              <div className="map-info-item">
                <span className="map-info-label">🔴 Ubicación actual:</span>
                <span
                  className={`map-info-value ${
                    getOrigenFijoNombre() !== 'No seleccionado' ? 'seleccionado' : ''
                  }`}
                >
                  {getOrigenFijoNombre()}
                </span>
              </div>
            )}
            {modo === 'dos' && (
              <div className="map-info-item">
                <span className="map-info-label">🔵 Origen:</span>
                <span
                  className={`map-info-value ${
                    getOrigenNombre() !== 'No seleccionado' ? 'seleccionado' : ''
                  }`}
                >
                  {getOrigenNombre()}
                </span>
              </div>
            )}
            <div className="map-info-item">
              <span className="map-info-label">🟢 Destino:</span>
              <span
                className={`map-info-value ${
                  getDestinoNombre() !== 'No seleccionado' ? 'seleccionado' : ''
                }`}
              >
                {getDestinoNombre()}
              </span>
            </div>
            <div className="map-info-item">
              <span className="map-info-label">Modo actual:</span>
              <span className="map-info-value seleccionado">
                {modo === 'uno' ? 'Una ubicación' : 'Dos ubicaciones'}
              </span>
            </div>
            {rutaInfo && (
            <div className="map-ruta-info-panel">
              <h4 style={{ 
                margin: '0 0 12px 0', 
                fontSize: '16px', 
                color: '#750f0f',
                borderBottom: '2px solid #750f0f',
                paddingBottom: '8px',
                textAlign: 'center'
              }}>
                <i className="bi bi-geo-alt-fill"></i> Tu Destino
              </h4>

              {/* Imagen del edificio destino */}
              {rutaInfo.destino.imagen_url && (
                <div className="map-destino-imagen">
                  <img 
                    src={`http://localhost:8000${rutaInfo.destino.imagen_url}`}
                    alt={`Edificio ${rutaInfo.destino.nombre}`}
                    onError={(e) => {
                      console.error('Error cargando imagen:', e);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
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
              style={{ display: mostrarSoloOrigenDestino ? 'none' : 'inline-block' }}
            >
              {isCalculating ? 'Calculando...' : 'Calcular Ruta'}
            </button>
            {mostrarSoloOrigenDestino && (
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
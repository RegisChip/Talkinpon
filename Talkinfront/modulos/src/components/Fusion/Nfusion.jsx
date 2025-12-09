// Talkinpon\Talkinfront\modulos\src\components\New\Fusion.jsx

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MapaInteractivoDijkstra from "./MapaInteractivoDijkstra";
import "./Fusion.css";

// llamada a la Api
import { sendUsuarioMensaje, borrarContexto } from "../Api";

export default function Fusion() {

  const [isLoading, setLoading] = useState(false);
  const [ubicacionesData, setUbicacionesData] = useState([]);
  const [edificiosCargados, setEdificiosCargados] = useState(false);

  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  const predefinedOptions = [
    { img: "/item-chat.png", text: "Kardex" },
    { img: "/item-chat.png", text: "Constancia de Estudios" },
    { img: "/item-chat.png", text: "Creditos Complementarios" },
    { img: "/item-chat.png", text: "Servicio Social" },
    { img: "/item-chat.png", text: "Mas opciones..." },
  ];

  const additionalOptions = [
    { img: "/item-chat.png", text: "Resellar Credencial" },
    { img: "/item-chat.png", text: "Tramitar Credencial" },
    { img: "/item-chat.png", text: "Baja Temporal" },
  ];

  const [messages, setMessages] = useState([
    { type: "bot", content: "options", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [animateMap, setAnimateMap] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);


  // ======== FUNCIÓN PARA HABLAR =========
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




  // Cargar edificios directamente desde Django al montar el componente
  useEffect(() => {
    const loadEdificios = async () => {
      try {
        // IMPORTANTE: Ajusta esta URL según tu configuración
        // Si Django corre en otro puerto: http://localhost:8000/api/edificios/
        const response = await fetch('http://localhost:8000/api/edificios/');
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        setUbicacionesData(data.edificios);
        setEdificiosCargados(true);
        console.log(`✅ Edificios cargados: ${data.edificios.length}`);
        
      } catch (error) {
        console.error("❌ Error cargando edificios:", error);
        setEdificiosCargados(true); // Para que muestre el mensaje de error
      }
    };
    
    loadEdificios();
  }, []);

  // --- FUNCIONES PARA EL REGISTRO DE LA CONVERSACION ---

  // GENERAR SESSION_ID AL MONTAR EL COMPONENTE
  useEffect(() => {
    // Verificar si ya existe un session_id
    let sessionId = localStorage.getItem("session_id");
    
    if (!sessionId) {
      // Generar nuevo UUID
      sessionId = crypto.randomUUID();
      localStorage.setItem("session_id", sessionId);
      console.log("Nueva sesión creada:", sessionId);
    } else {
      console.log("Sesión recuperada:", sessionId);
    }
  }, []); // Solo se ejecuta una vez al montar

  // LIMPIAR CONTEXTO AL DESMONTAR EL COMPONENTE (navegar a otra ruta)
  useEffect(() => {
    // Función de limpieza que se ejecuta al salir
    return () => {
      const sessionId = localStorage.getItem("session_id");
      if (sessionId) {
        console.log("🔀 Limpiando contexto al cambiar de ruta...");
        borrarContexto(sessionId);
        localStorage.removeItem("session_id");
      }
    };
  }, []);

  // DETECTAR RECARGA DE PÁGINA O CIERRE DE PESTAÑA/NAVEGADOR
  // OPCIÓN 2: Borrar TODO siempre (recarga o cierre)
  useEffect(() => {
      const handleBeforeUnload = (e) => {
        const sessionId = localStorage.getItem("session_id");
        
        console.log("🚨 beforeunload disparado");
        console.log("   Session ID:", sessionId);
        
        if (sessionId) {
          console.log("🔄/🚪 Recarga o cierre detectado - Borrando contexto");
          
          const data = new Blob(
            [JSON.stringify({ session_id: sessionId })],
            { type: 'application/json' }
          );
          
          console.log("   Enviando sendBeacon...");
          const result = navigator.sendBeacon('http://localhost:8000/api/borrar-contexto/', data);
          console.log("   sendBeacon result:", result);
          
          localStorage.removeItem("session_id");
          console.log("   localStorage limpiado");
        } else {
          console.log("   No hay session_id para borrar");
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
  }, []);

  // Autoajustar textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    const maxHeight = parseInt(getComputedStyle(textarea).maxHeight);
    if (textarea.scrollHeight > maxHeight) textarea.classList.add("fusionApp-scrollable");
    else textarea.classList.remove("fusionApp-scrollable");
  }, [inputValue]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (showMap) document.body.classList.add("fusionApp-map-open");
    else document.body.classList.remove("fusionApp-map-open");
  }, [showMap]);

  // Funciones
  const handleOptionClick = (option) => {
    const userMessage = { type: "user", content: option, timestamp: new Date() };
    
    if (option === "Mas opciones...") {

      setMessages((prev) => [
        ...prev,
        userMessage,
        { type: "bot", content: "moreOptions", timestamp: new Date() },
        { type: "bot", content: "Si no encuentra la opción, escríbala en el chat.", timestamp: new Date() },
      ]);
      return;
    }
    
    
    // Enviar opción al backend con flag de que viene de botón
    handleSendMessage(option, true); // true = saltarDialog
  };

  // CARGAR VOCES PARA TTS
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log("🎤 Voces disponibles:", voices.length);
      console.log("🎤 Lista de voces:", voices);

      if (voices.length > 0) {
        setVoicesReady(true);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  
  const handleSendMessage = async (messageToSend = null, saltarDialog = false) => {
    // ========== FIX: ASEGURAR QUE MENSAJE ES STRING ==========
    let mensaje = messageToSend || inputValue;
    
    // Convertir a string si no lo es
    if (typeof mensaje !== 'string') {
      mensaje = String(mensaje);
    }
    
    // Validar que no esté vacío
    if (!mensaje.trim() || isLoading) return;
    
    const userMessage = { type: "user", content: mensaje, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    
    if (!messageToSend) setInputValue("");
    
    setLoading(true);
    
    // Agregar indicador de "escribiendo..."
    const tempId = Date.now();
    setMessages((prev) => [
      ...prev,
      { type: "bot", content: "typing", timestamp: new Date(), id: tempId }
    ]);
    
    try {
      const sessionId = localStorage.getItem("session_id");
      
      // Llamada a Django con flag saltarDialog
      const data = await sendUsuarioMensaje(mensaje, sessionId, saltarDialog);

      console.log("📦 RESPUESTA DEL BACKEND:", data);
      
      // Remover indicador
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
      
      if (!data.error) {
        // Guardar session_id si es nuevo
        if (data.session_id && data.session_id !== sessionId) {
          localStorage.setItem("session_id", data.session_id);
          console.log("Session ID guardado:", data.session_id);
        }

        // ========== DETECTAR SI ES RESPUESTA DE RUTA ==========
        let respuestaParseada = data.reply;
        
        // Si reply es un objeto (ya parseado por Api.js), usarlo directamente
        if (typeof data.reply === 'object' && data.reply !== null) {
          respuestaParseada = data.reply;
        }
        // Si es string que parece JSON, intentar parsear
        else if (typeof data.reply === 'string' && data.reply.trim().startsWith('{')) {
          try {
            respuestaParseada = JSON.parse(data.reply);
          } catch (e) {
            // No es JSON válido, es texto normal
            console.log("Reply no es JSON válido:", e);
          }
        }
        
        // Verificar si es comando para abrir mapa con ruta
        if (respuestaParseada && respuestaParseada.tipo === 'abrir_mapa_con_ruta') {
          console.log("🗺️ ABRIENDO MAPA CON RUTA:", respuestaParseada);
          
          // Mostrar mensaje al usuario
          const mensajeRuta = respuestaParseada.mensaje;
          setMessages((prev) => [
            ...prev,
            { type: "bot", content: mensajeRuta, timestamp: new Date() }
          ]);
          
          // 🔊 HABLAR LA RESPUESTA DE RUTA
          speak(mensajeRuta);
          
          // Esperar un momento para que vea el mensaje
          setTimeout(() => {
            // Abrir el mapa
            setShowMap(true);
            setTimeout(() => setAnimateMap(true), 10);
            
            // Configurar la ruta automáticamente
            setRutaAutomatica({
              origen_id: respuestaParseada.origen_id,
              destino_id: respuestaParseada.destino_id,
              origen_nombre: respuestaParseada.origen_nombre,
              destino_nombre: respuestaParseada.destino_nombre
            });
          }, 800);
          
        } else {
          // Respuesta normal de texto
          let contenido;
          
          if (typeof respuestaParseada === 'string') {
            contenido = respuestaParseada;
          } else if (respuestaParseada && respuestaParseada.mensaje) {
            contenido = respuestaParseada.mensaje;
          } else {
            contenido = JSON.stringify(respuestaParseada);
          }
          
          setMessages((prev) => [
            ...prev,
            { type: "bot", content: contenido, timestamp: new Date() }
          ]);
          
          // 🔊 HABLAR LA RESPUESTA NORMAL
          console.log("🔊 Intentando hablar:", contenido);
          console.log("✅ Voces listas:", voicesReady);
          speak(contenido);
        }
        
      } else {
        const errorMsg = "Hubo un problema procesando tu consulta.";
        setMessages((prev) => [
          ...prev,
          { type: "bot", content: errorMsg, timestamp: new Date() }
        ]);
        speak(errorMsg);
      }
    } catch (err) {
      console.error("❌ Error en handleSendMessage:", err);
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
      const errorMsg = "No se pudo conectar con el servidor.";
      setMessages((prev) => [
        ...prev,
        { type: "bot", content: errorMsg, timestamp: new Date() }
      ]);
      speak(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ========== ESTADO PARA RUTA AUTOMÁTICA ==========
  const [rutaAutomatica, setRutaAutomatica] = useState(null);

  const handleProcessChange = () => {
    setMessages((prev) => [...prev, { type: "bot", content: "options", timestamp: new Date() }]);
  };

  const toggleMap = () => {
    if (showMap) {
      setAnimateMap(false);
      setTimeout(() => setShowMap(false), 300);
    } else {
      setShowMap(true);
      setTimeout(() => setAnimateMap(true), 10);
    }
  };
  
  const salirDelChat = () => {
      const session_id = localStorage.getItem("session_id");

      if (session_id) {
          // Llamar al endpoint de borrado de forma síncrona con fetch
          fetch("http://localhost:8000/api/borrar-contexto/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session_id: session_id }),
              keepalive: true  // IMPORTANTE: mantiene la petición aunque se cierre la página
          }).then(response => {
              console.log("Contexto borrado, status:", response.status);
          }).catch(err => {
              console.error("Error borrando contexto:", err);
          });
          
          // Limpiar localStorage
          localStorage.removeItem("session_id");
      }

      // Navegar después de iniciar el borrado
      navigate("/");
  };

  return (
    <div className="fusionApp-container">
      <header className="fusionApp-header">
        <div className="fusionApp-header-left">
          <button className="fusionApp-back-btn" onClick={salirDelChat}>
            <i className="bi bi-chevron-double-left"></i>
          </button>
          <h1 className="fusionApp-title-main">TalkinPon</h1>
        </div>
        <div className="fusionApp-title-container">
          <h2 className="fusionApp-title">Procesos y Ubicaciones</h2>
        </div>
        <div className="fusionApp-logo-container">
          <button onClick={toggleMap} className="fusionApp-toggle-map">
            <i className="bi bi-map-fill"></i>
          </button>
          <img src="/logo-app.png" alt="Logo" className="fusionApp-logo" />
        </div>
      </header>
      
      <div className="fusionApp-chat-area">
        {messages.map((message, idx) => (
          <div key={idx} className={`fusionApp-chat-message ${message.type}`}>
            <div className="fusionApp-avatar">
              <img
                src={message.type === "bot" ? "/logo-app.png" : "/img-user.png"}
                alt={message.type === "bot" ? "Bot" : "Usuario"}
              />
            </div>
            <div className="fusionApp-message-content">
              {message.content === "typing" ? (
                <div className="fusionApp-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : message.content === "options" || message.content === "moreOptions" ? (
                <div className="fusionApp-options-box">
                  <h3>{message.content === "options" ? "Elige una opción:" : "Más opciones:"}</h3>
                  {(message.content === "options" ? predefinedOptions : additionalOptions).map((option, i) => (
                    <button key={i} className="fusionApp-option-btn" onClick={() => handleOptionClick(option.text)}>
                      <img src={option.img} alt={option.text} />
                      <span>{option.text}</span>
                    </button>
                  ))}
                </div>
              ) : message.content === "building_image" ? (
                <img src={message.buildingImage} alt="Edificio" className="fusionApp-building-image" />
              ) : (
                <p className="fusionApp-message-text">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef}></div>
      </div>
      
      <div className="fusionApp-input-area">
        <div className="fusionApp-input-group">
          <textarea
            ref={textareaRef}
            placeholder="¿Qué te gustaría saber ...?"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            rows={1}
            className="fusionApp-textarea"
          />
          <button className="fusionApp-process-btn" onClick={handleProcessChange}>
            <i className="bi bi-menu-up"></i>
          </button>
        </div>
        <button className="fusionApp-send-btn" onClick={handleSendMessage}>
          <i className="bi bi-send-fill"></i>
        </button>
      </div>

      {showMap && (
        <>
          <div className="fusionApp-map-overlay"></div>
          <div className={`fusionApp-map-area ${animateMap ? "fusionApp-map-open" : "fusionApp-map-close"}`}>
            {edificiosCargados ? (
              <MapaInteractivoDijkstra 
                ubicacionesData={ubicacionesData}
                onClose={() => {
                  setAnimateMap(false);
                  setTimeout(() => {
                    setShowMap(false);
                    // Limpiar ruta automática al cerrar
                    setRutaAutomatica(null);
                  }, 300);
                }}
                apiEndpoint="http://localhost:8000/ruta/dijkstra/"
                rutaAutomatica={rutaAutomatica}
                />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
                  <p style={{ fontSize: '1.2rem', color: '#750f0f' }}>Cargando mapa del campus...</p>
                </div>
              )
            }
          </div>
        </>
      )}
    </div>
  );
}
// Talkinfront/modulos/src/components/New/Nfusion.jsx

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ubicacionesData } from "../data/ubicacionesData";
import "./Fusion.css";
// llamada a la Api
import { sendUsuarioMensaje, borrarContexto } from "../Api";

export default function Fusion() {

  const [isLoading, setLoading] = useState(false);
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  const predefinedOptions = [
    { img: "/item-chat.png", text: "Kardex" },
    { img: "/item-chat.png", text: "Constancia" },
    { img: "/item-chat.png", text: "Titulacion" },
    { img: "/item-chat.png", text: "Creditos" },
    { img: "/item-chat.png", text: "Mas opciones..." },
  ];

  const additionalOptions = [
    { img: "/item-chat.png", text: "Historial Academico" },
    { img: "/item-chat.png", text: "Pagos y Finanzas" },
    { img: "/item-chat.png", text: "Horarios" },
  ];

  const [messages, setMessages] = useState([
    { type: "bot", content: "options", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [animateMap, setAnimateMap] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

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

  // LIMPIAR CONTEXTO AL DESMONTAR EL COMPONENTE
  useEffect(() => {
    // Función de limpieza que se ejecuta al salir
    return () => {
      const sessionId = localStorage.getItem("session_id");
      if (sessionId) {
        console.log("Limpiando contexto al salir...");
        borrarContexto(sessionId);
        localStorage.removeItem("session_id");
      }
    };
  }, []);

  // DETECTAR CIERRE DE PESTAÑA/NAVEGADOR
  useEffect(() => {
    const handleBeforeUnload = async (e) => {
      const sessionId = localStorage.getItem("session_id");
      if (sessionId) {
        // Navigator.sendBeacon es mejor para beforeunload
        const data = new Blob(
          [JSON.stringify({ session_id: sessionId })],
          { type: 'application/json' }
        );
        navigator.sendBeacon('http://localhost:8000/api/borrar-contexto/', data);
        localStorage.removeItem("session_id");
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // -----------------------------------------------------

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

  // ---------------------------------
  // --- FUNCIONES -------------------

  const handleOptionClick = (option) => {
    const userMessage = { type: "user", content: option, timestamp: new Date() };
    if (option === "Mas opciones...") {
      setShowMoreOptions(true);
      setMessages((prev) => [
        ...prev,
        userMessage,
        { type: "bot", content: "moreOptions", timestamp: new Date() },
        { type: "bot", content: "Si no encuentra la opción, escríbala en el chat.", timestamp: new Date() },
      ]);
      return;
    }
    // Enviar opción al backend
    handleSendMessage(option);
  };

  const handleSendMessage = async (messageToSend = null) => {
    const mensaje = messageToSend || inputValue;

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
      // Obtener session_id de localStorage
      const sessionId = localStorage.getItem("session_id");
      
      // Llamada a Django
      const data = await sendUsuarioMensaje(mensaje, sessionId);

      // Ver qué llegó del backend
        console.log("- RESPUESTA DEL BACKEND:", data);
        console.log("   - Tipo de data:", typeof data);
        console.log("   - Keys:", Object.keys(data));
        console.log("   - data.reply:", data.reply);
        console.log("   - data.error:", data.error);
      
      // Remover indicador
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
      
      if (!data.error) {
        // Guardar session_id si es nuevo
        if (data.session_id && data.session_id !== sessionId) {
          localStorage.setItem("session_id", data.session_id);
          console.log("Session ID guardado:", data.session_id);
        }

        // Verificar antes de agregar mensaje
        console.log("Agregando mensaje del bot:", data.reply);
        
        setMessages((prev) => [
          ...prev,
          { type: "bot", content: data.reply, timestamp: new Date() }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { type: "bot", content: "Hubo un problema procesando tu consulta.", timestamp: new Date() }
        ]);
      }
    } catch (err) {
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
      setMessages((prev) => [
        ...prev,
        { type: "bot", content: "No se pudo conectar con el servidor.", timestamp: new Date() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------

  const handleProcessChange = () => {
    setShowMoreOptions(true);
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

  const handleMapButtonClick = (id) => {
    const ubicacion = ubicacionesData.find((u) => u.id === id);
    if (!ubicacion) return;
    const userMessage = { type: "user", content: id, timestamp: new Date() };
    const botResponses = [
      { type: "bot", content: ubicacion.texto, timestamp: new Date() },
      { type: "bot", content: "building_image", buildingImage: ubicacion.imagen, timestamp: new Date() },
    ];
    setMessages((prev) => [...prev, userMessage, ...botResponses]);
  };

  const salirDelChat = async () => {
    const session_id = localStorage.getItem("session_id");

    if (session_id) {
        await borrarContexto(session_id);
        localStorage.removeItem("session_id");
    }

    navigate("/"); // o donde regreses
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
            disabled={isLoading}
          />
          <button className="fusionApp-process-btn" onClick={handleProcessChange}>
            <i className="bi bi-menu-up"></i>
          </button>
        </div>
        <button 
          className="fusionApp-send-btn" 
          onClick={() => handleSendMessage()}
          disabled={isLoading}
        >
          <i className="bi bi-send-fill"></i>
        </button>
      </div>
      
      {showMap && (
        <>
          <div className="fusionApp-map-overlay"></div>
          <div className={`fusionApp-map-area ${animateMap ? "fusionApp-map-open" : "fusionApp-map-close"}`}>
            <div className="fusionApp-map-header">
              <h3>Mapa del Campus</h3>
              <button
                onClick={() => {
                  setAnimateMap(false);
                  setTimeout(() => setShowMap(false), 300);
                }}
                className="fusionApp-map-close-btn"
              >
                ✕
              </button>
            </div>
            <div className="fusionApp-map-container">
              <img src="/mapa_tec.png" alt="Mapa Campus" className="fusionApp-campus-map" />
              {ubicacionesData.map((u) => (
                <button
                  key={u.id}
                  className="fusionApp-map-button"
                  style={{ top: u.posicionMapa.top, left: u.posicionMapa.left }}
                  onClick={() => handleMapButtonClick(u.id)}
                >
                  {u.id}
                </button>
              ))}
            </div>
            <p className="fusionApp-map-caption">Mapa interactivo del campus universitario</p>
          </div>
        </>
      )}
    </div>
  );
}
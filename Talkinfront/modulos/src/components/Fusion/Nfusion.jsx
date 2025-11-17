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
      setShowMoreOptions(true);
      setMessages((prev) => [
        ...prev,
        userMessage,
        { type: "bot", content: "moreOptions", timestamp: new Date() },
        { type: "bot", content: "Si no encuentra la opción, escríbala en el chat.", timestamp: new Date() },
      ]);
      return;
    }

    const botInfo = {
      type: "bot",
      content: `Para el proceso de ${option.toLowerCase()} se tiene que hacer lo siguiente:

1.- Ingresa al SIM con tu número de control y contraseña.
2.- Dirígete al módulo correspondiente.
3.- Ahí te aparecerá una tabla con las opciones relacionadas, selecciona la que necesites.
4.- Por último, sigue las instrucciones mostradas.`,
      timestamp: new Date(),
    };

    const botActions = {
      type: "bot",
      content: 'Si quiere cambiar de proceso, presione el botón de opciones en el área de texto.',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, botInfo, botActions]);
  };


  const handleSendMessage = async () => {

    if(!inputValue.trim() || isLoading) return;

    const userMessage = {type: "user", content: inputValue, timestamp: new Date()};
    setMessages((prev) => [...prev, userMessage]);

    const mensajeParaEnviar = inputValue;
    setInputValue("");
    setLoading(true);

    const tempId = Date.now();
    setMessages((prev) => [
      ...prev,
      { type: "bot", content: "typing", timestamp: new Date(), id: tempId }
    ]);

    try {
      const data = await sendUsuarioMensaje(mensajeParaEnviar);
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
      
      if (!data.error) {
        setMessages((prev) => [
          ...prev,
          {type: "bot", content: data.reply, timestamp: new Date()}
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {type: "bot", content: "Hubo un problema procesando tu consulta. Por favor intenta de nuevo.", timestamp: new Date() }
        ]);
      }
    } catch (err) {
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
      setMessages((prev) => [
        ...prev,
        {type: "bot", content: "No se pudo conectar con el servidor. Verifica tu conexión.", timestamp: new Date()}
      ]);
    } finally {
      setLoading(false);
    }
  };

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
                  setTimeout(() => setShowMap(false), 300);
                }}
                apiEndpoint="http://localhost:8000/ruta/dijkstra/"
              />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
                <p style={{ fontSize: '1.2rem', color: '#750f0f' }}>Cargando mapa del campus...</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
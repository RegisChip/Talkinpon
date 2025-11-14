// Talkinpon\Talkinfront\modulos\src\components\New\Nfusion.jsx

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ubicacionesData } from "../data/ubicacionesData";
import "./Fusion.css";

// llamada a la Api
import { sendUsuarioMensaje } from "../Api";

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

  /*const simulateBotResponse = (userInput) => {
    const input = userInput.toLowerCase();
    const botResponse = { type: "bot", content: "", timestamp: new Date() };
    const extraResponses = [];

    if (input.includes("evaluacion") || input.includes("profesor")) {
      botResponse.content = `Para el proceso de evaluación de docentes se tiene que hacer lo siguiente:

1.- Ingresa al SIM con tu número de control y contraseña.
2.- Dirígete al módulo de evaluaciones y encuestas.
3.- Ahí te aparecerá una tabla con todas las evaluaciones posibles, selecciona la que necesites.
4.- Por último, contesta todas las preguntas.`;
      setMessages((prev) => [
        ...prev,
        botResponse,
        { type: "bot", content: 'Si quiere cambiar de proceso, presione el botón de opciones en el área de texto.', timestamp: new Date() },
      ]);
      return;
    } else if (input.includes("kardex")) botResponse.content = `El Kardex es un documento que muestra tu historial académico completo.`;
    else if (input.includes("constancia")) botResponse.content = `La constancia de estudios se solicita en el departamento de servicios escolares.`;
    else if (input.includes("titulacion")) botResponse.content = `El proceso de titulación implica completar todos los créditos y cumplir los requisitos académicos.`;
    else if (input.includes("credito")) botResponse.content = `Los créditos complementarios se registran al participar en actividades culturales o académicas.`;
    else if (input.includes("historial")) botResponse.content = `El historial académico se descarga desde el portal del SIM.`;
    else if (input.includes("pago")) botResponse.content = `Los pagos se realizan en caja o mediante transferencia.`;
    else if (input.includes("horario")) botResponse.content = `Tu horario actual se encuentra en el portal del SIM, sección “Mi horario”.`;
    else {
      const ubicacion = ubicacionesData.find((u) => u.id === inputValue.toUpperCase());
      if (ubicacion) {
        botResponse.content = ubicacion.texto;
        extraResponses.push({ type: "bot", content: "building_image", buildingImage: ubicacion.imagen, timestamp: new Date() });
        extraResponses.push({ type: "bot", content: "Si desea otra ubicación, escríbala o use el mapa.", timestamp: new Date() });
      } else {
        botResponse.content = `Has escrito: "${userInput}". Por favor proporciona más detalles o selecciona una opción.`;
      }
    }

    setMessages((prev) => [...prev, botResponse, ...extraResponses]);
  };*/

  const handleSendMessage = async () => {
    /*
    if (!inputValue.trim()) return;
    const userMessage = { type: "user", content: inputValue, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    const input = inputValue;
    setInputValue("");
    setTimeout(() => simulateBotResponse(input), 500);
    */

    if(!inputValue.trim() || isLoading) return; // No enviar si está cargando

    const userMessage = {type: "user", content: inputValue, timestamp: new Date()};
    setMessages((prev) => [...prev, userMessage]);

    const mensajeParaEnviar = inputValue; // Guarda el input 
    setInputValue(""); // limpia el text area
    setLoading(true); // Activar indicador de carga

     // Agregar mensaje temporal de "escribiendo..."
    const tempId = Date.now();
    setMessages((prev) => [
      ...prev,
      { type: "bot", content: "typing", timestamp: new Date(), id: tempId }
    ]);

    try {

      // Llamada a Django para obtener respuesta del modelo
      const data = await sendUsuarioMensaje(mensajeParaEnviar);

      // Remover mensaje temporal
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
      
      if (!data.error) {
        setMessages((prev) => [
          ...prev,
          {type: "bot",
          content: data.reply, timestamp: new Date()}
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {type: "bot", content: "Hubo un problema procesando tu consulta. Por favor intenta de nuevo.", timestamp: new Date() }
        ]);
      }
    } catch (err) {
      // Remover mensaje temporal
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
      
      setMessages((prev) => [
        ...prev,
        {type: "bot", content: "No se pudo conectar con el servidor. Verifica tu conexión.", timestamp: new Date()}
      ]);
    } finally {
      setLoading(false); // Desactivar indicador
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

  return (
    <div className="fusionApp-container">
      <header className="fusionApp-header">
        <div className="fusionApp-header-left">
          <button className="fusionApp-back-btn" onClick={() => navigate("/")}>
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
                // 1. Indicador de "escribiendo..."
                <div className="fusionApp-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : message.content === "options" || message.content === "moreOptions" ? (
                // 2. Opciones predefinidas
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

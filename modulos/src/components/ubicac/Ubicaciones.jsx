import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Ubicaciones.css";

export default function Ubicaciones() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { type: "bot", content: "Que edificio o salón te gustaría saber su ubicación..." },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showMap, setShowMap] = useState(false);
  const chatEndRef = useRef(null);

  // Scroll automático
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = { type: "user", content: inputValue };
    const botResponse = generateBotResponse(inputValue);

    setMessages((prev) => [...prev, userMessage, ...botResponse]);
    setInputValue("");
  };

  const generateBotResponse = (userInput) => {
    const input = userInput.toLowerCase();

    if (input.includes("edificio a")) {
      return [
        { type: "bot", content: "Sigue estas indicaciones para llegar al Edificio A, además te dejo una foto del edificio." },
        { type: "bot", content: "map_only", mapImage: "/mapa_tec.png" },
        { type: "bot", content: "building_image", buildingImage: "/Escuela_tec.jpg" },
        {
          type: "bot",
          content: "Si quieres saber otra ubicación, escríbela en el chat. Para salir al menú principal, presiona 'Salir'.",
          actions: [{ label: "Salir", action: "exit" }],
        },
      ];
    }

    return [
      { type: "bot", content: "Lo siento, no tengo información sobre esa ubicación. Intenta con otro edificio o salón." },
    ];
  };

  const handleActionClick = (action) => {
    if (action === "exit") {
      window.location.href = "/";
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSendMessage();
  };

  return (
    <div className="ubicaciones-container">
      {/* Header */}
      <header className="ubicaciones-header">
        <button className="name-button" onClick={() => navigate("/")}>
          TalkinPon
        </button>
        <div className="ubicaciones-header-right">
          <h1>Administrativas</h1>
          <button onClick={() => setShowMap(!showMap)} className="ubicaciones-map-toggle-btn">
            {showMap ? "Ocultar Mapa" : "Mostrar Mapa"}
          </button>
          <img src="/logo-app.png" alt="Logo" className="ubicaciones-logo" />
        </div>
      </header>

      {/* Main */}
      <div className="ubicaciones-main-content">
        <div className={`ubicaciones-chat-area ${showMap ? "ubicaciones-half-width" : "ubicaciones-full-width"}`}>
          {messages.map((message, idx) => (
            <div key={idx} className={`ubicaciones-message-row ${message.type}`}>
              {message.type === "bot" && <img src="logo-app.png" alt="Bot" className="ubicaciones-avatar" />}
              <div className={`ubicaciones-message-box ${message.type}`}>
                {message.content === "map_only" ? (
                  <img src={message.mapImage} alt="Mapa" className="ubicaciones-map-image" />
                ) : message.content === "building_image" ? (
                  <img src={message.buildingImage} alt="Edificio" className="ubicaciones-building-image" />
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
              {message.type === "user" && <img src="/img-user.png" alt="User" className="ubicaciones-avatar" />}
              {message.actions && (
                <div className="ubicaciones-actions-row">
                  {message.actions.map((action, i) => (
                    <button key={i} onClick={() => handleActionClick(action.action)} className="ubicaciones-action-btn">
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        {/* Vista del mapa */}
        {showMap && (
          <div className="ubicaciones-map-area">
            <div className="ubicaciones-map-header">
              <h3>Mapa del Campus</h3>
              <button onClick={() => setShowMap(false)}>✕</button>
            </div>
            <img src="/mapa_tec.png" alt="Mapa Campus" className="ubicaciones-campus-map" />
            <p className="ubicaciones-map-caption">Mapa interactivo del campus universitario</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="ubicaciones-input-area">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Pregunta lo que quieres..."
        />
        <button onClick={handleSendMessage}>Enviar</button>
      </div>
    </div>
  );
}

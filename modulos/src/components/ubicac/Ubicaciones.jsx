import React, { useState, useEffect, useRef } from "react";
import { ubicacionesData } from "../data/ubicacionesData";
import "./Ubicaciones.css";

export default function Ubicaciones() {
  const [messages, setMessages] = useState([
    { type: "bot", content: "¿Qué edificio o salón te gustaría saber su ubicación?" },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [animateMap, setAnimateMap] = useState(false);
  const chatEndRef = useRef(null);

  // Scroll al final del chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Bloquear scroll cuando el mapa está abierto
  useEffect(() => {
    if (showMap) {
      document.body.classList.add("map-open");
    } else {
      document.body.classList.remove("map-open");
    }
  }, [showMap]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = { type: "user-ub", content: inputValue };
    const botResponse = generateBotResponse(inputValue);

    setMessages((prev) => [...prev, userMessage, ...botResponse]);
    setInputValue("");
  };

  const generateBotResponse = (userInput) => {
    const input = userInput.toUpperCase();
    const ubicacion = ubicacionesData.find((u) => u.id === input);

    if (ubicacion) {
      return [
        { type: "bot", content: ubicacion.texto },
        { type: "bot", content: "building_image", buildingImage: ubicacion.imagen },
        {
          type: "bot",
          content:
            "Si ocupa saber otra ubicacion favor de escribirla en el chat, si quiere salir al menu principal, favor de presionar el botón “Salir”.",
          actions: [{ label: "Salir", action: "exit" }],
        },
      ];
    }

    return [
      { type: "bot", content: "Lo siento, no tengo información sobre esa ubicación. Intenta con otra." },
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
    const botResponse = generateBotResponse(id);
    const userMessage = { type: "user-ub", content: id };
    setMessages((prev) => [...prev, userMessage, ...botResponse]);
  };

  return (
    <div className="ubicaciones-container">
      {/* Header */}
      <header className="ubicaciones-header">
        <button className="name-button-ub" onClick={() => (window.location.href = "/")}>
          TalkinPon
        </button>

        <div className="title-logo-ub">
          <h1>Ubicaciones</h1>
          <div className="header-right">
            <button onClick={toggleMap} className="map-toggle-btn" title="Mostrar mapa">
              <i className="bi bi-map-fill"></i>
            </button>
          </div>
        </div>

        <div className="heade-logo-ub">
          <img src="/logo-app.png" alt="Logo" />
        </div>
      </header>

      {/* Main chat */}
      <div className="main-content">
        <div className="chat-area-ub">
          {messages.map((message, idx) => (
            <div key={idx} className={`message-row-ub ${message.type}`}>
              <img
                src={message.type === "bot" ? "/logo-app.png" : "/img-user.png"}
                alt={message.type === "bot" ? "Bot" : "Usuario"}
                className="avatar-ub"
              />
              <div className="message-with-actions">
                <div className={`message-box-ub ${message.type}`}>
                  {message.content === "building_image" ? (
                    <img src={message.buildingImage} alt="Edificio" className="building-image" />
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>

                {message.actions && (
                  <div className="actions-row-ub">
                    {message.actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleActionClick(action.action)}
                        className="action-btn"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>
      </div>

      {/* Input Area */}
      <div className="input-area p-3 border-top">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="¿A dónde te gustaría ir...?"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            autoComplete="new-password"
            name="no_autocomplete_field"
          />
          <button className="btn btn-dark" onClick={handleSendMessage}>
            <i className="bi bi-send-fill"></i>
          </button>
        </div>
      </div>

      {/* Vista del mapa */}
      {showMap && (
        <>
          <div className={`map-overlay`}></div>
          <div className={`map-area ${animateMap ? "map-open" : "map-close"}`}>
            <div className="map-header">
              <h3>Mapa del Campus</h3>
              <button
                onClick={() => {
                  setAnimateMap(false);
                  setTimeout(() => setShowMap(false), 300);
                }}
                className="close-map-btn"
              >
                ✕
              </button>
            </div>

            <div className="map-container">
              <img src="/mapa_tec.png" alt="Mapa Campus" className="campus-map" />
              {ubicacionesData.map((u) => (
                <button
                  key={u.id}
                  className="map-button"
                  style={{ top: u.posicionMapa.top, left: u.posicionMapa.left }}
                  onClick={() => handleMapButtonClick(u.id)}
                >
                  {u.id}
                </button>
              ))}
            </div>

            <p className="map-caption">Mapa interactivo del campus universitario</p>
          </div>
        </>
      )}
    </div>
  );
}

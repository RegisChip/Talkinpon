import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Procesos.css";

export default function Administrativas() {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  const [messages, setMessages] = useState([
    { type: "bot", content: "options", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showMoreOptions, setShowMoreOptions] = useState(false);

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

  // Scroll automático
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clic en botón de opción
  const handleOptionClick = (option) => {
    const userMessage = { type: "user", content: option, timestamp: new Date() };

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
      content:
        'Si quiere cambiar de proceso, presione el botón de opciones en el área de texto.',
      timestamp: new Date(),
    };

    if (option === "Mas opciones...") {
      setShowMoreOptions(true);
      setMessages((prevMessages) => [
        ...prevMessages,
        userMessage,
        { type: "bot", content: "moreOptions", timestamp: new Date() },
        {
          type: "bot",
          content:
            "Si no se encuentra la opción que usted busca, favor de escribirla en el chat.",
          timestamp: new Date(),
        },
      ]);
    } else {
      setMessages((prevMessages) => [...prevMessages, userMessage, botInfo, botActions]);
    }
  };

  // Detección de texto y respuestas automáticas
  const simulateBotResponse = (userInput, currentMessages) => {
    const input = userInput.toLowerCase();
    const botResponse = { type: "bot", content: "", timestamp: new Date() };

    if (input.includes("evaluacion") || input.includes("profesor")) {
      botResponse.content = `Para el proceso de evaluación de docentes se tiene que hacer lo siguiente:

1.- Ingresa al SIM con tu número de control y contraseña.
2.- Dirígete al módulo de evaluaciones y encuestas.
3.- Ahí te aparecerá una tabla con todas las evaluaciones posibles, selecciona la que necesites.
4.- Por último, contesta todas las preguntas.`;

      setMessages((prevMessages) => [
        ...prevMessages,
        botResponse,
        {
          type: "bot",
          content:
            'Si quiere cambiar de proceso, presione el botón de opciones en el área de texto.',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    // Procesos similares
    if (input.includes("kardex")) {
      botResponse.content = `El Kardex es un documento que muestra tu historial académico completo. Puedes obtenerlo desde el portal del SIM o en el área administrativa de tu institución.`;
    } else if (input.includes("constancia")) {
      botResponse.content = `La constancia de estudios se solicita en el departamento de servicios escolares. Normalmente se entrega en un plazo de 3 a 5 días hábiles.`;
    } else if (input.includes("titulacion")) {
      botResponse.content = `El proceso de titulación implica completar todos los créditos y cumplir los requisitos académicos y administrativos. Puedes consultar más en la coordinación académica.`;
    } else if (input.includes("credito")) {
      botResponse.content = `Los créditos complementarios se registran al participar en actividades culturales, deportivas o académicas adicionales.`;
    } else if (input.includes("historial")) {
      botResponse.content = `El historial académico se descarga desde el portal del SIM en la sección de servicios estudiantiles.`;
    } else if (input.includes("pago")) {
      botResponse.content = `Los pagos se realizan en caja o mediante transferencia. Guarda tu comprobante y entrégalo en el departamento correspondiente.`;
    } else if (input.includes("horario")) {
      botResponse.content = `Tu horario actual se encuentra en el portal del SIM, sección “Mi horario”.`;
    } else {
      botResponse.content = `Has seleccionado o escrito: "${userInput}". ¿Podrías darme más detalles para ayudarte mejor?`;
    }

    setMessages((prevMessages) => [...prevMessages, botResponse]);
  };

  // Enviar mensaje de texto
  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const newMessages = [
        ...messages,
        { type: "user", content: inputValue, timestamp: new Date() },
      ];
      setMessages(newMessages);
      setInputValue("");
      setTimeout(() => simulateBotResponse(inputValue, newMessages), 500);
    }
  };

  // Botones de acciones del bot
  const handleActionClick = (action) => {
    if (action === "change") {
      setMessages([{ type: "bot", content: "options", timestamp: new Date() }]);
      setShowMoreOptions(false);
    } else if (action === "exit") {
      navigate("/");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSendMessage();
  };

  // Lógica para el botón 'procesos-btn-cambio'
  const handleProcessChange = () => {
    setShowMoreOptions(true);
    setMessages((prevMessages) => [
      ...prevMessages,
      { type: "bot", content: "options", timestamp: new Date() },
    ]);
  };

  return (
    <div className="procesos-container">
    <header className="procesos-header">
      <div className="procesos-header-left">
        <button className="procesos-name-button" onClick={() => navigate("/")}>
          <i className="bi bi-chevron-double-left"></i>
        </button>
        <h1>TalkinPon</h1>
      </div>
      <div className="procesos-title-logo">
        <h2>Procesos Administrativos</h2>
      </div>
      <div className="procesos-heade-logo">
        <img src="/logo-app.png" alt="Logo" />
      </div>
    </header>


      <div className="procesos-chat-area">
        {messages.map((message, index) => (
          <div key={index} className={`procesos-chat-message ${message.type}`}>
            <div className="procesos-avatar">
              <img
                src={message.type === "bot" ? "/logo-app.png" : "/img-user.png"}
                alt={message.type === "bot" ? "Bot" : "User"}
              />
            </div>

            <div className="procesos-message-with-actions">
              {message.content === "options" ? (
                <div className="procesos-options-box">
                  <h3>Elige una opción:</h3>
                  {predefinedOptions.map((option, idx) => (
                    <button key={idx} onClick={() => handleOptionClick(option.text)}>
                      <img src={option.img} alt={option.text} className="procesos-option-img" />
                      <span>{option.text}</span>
                    </button>
                  ))}
                </div>
              ) : message.content === "moreOptions" ? (
                <div className="procesos-options-box">
                  <h3>Más opciones disponibles:</h3>
                  {additionalOptions.map((option, idx) => (
                    <button key={idx} onClick={() => handleOptionClick(option.text)}>
                      <img src={option.img} alt={option.text} className="procesos-option-img" />
                      <span>{option.text}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`procesos-message-box ${message.type}`}>
                  <p>{message.content}</p>
                </div>
              )}

              {message.actions && message.actions.length > 0 && (
                <div className="procesos-actions-row">
                  {message.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleActionClick(action.action)}
                      className="procesos-action-button"
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

      {/* Input Area */}
      <div className="procesos-input-area border-top">
        <div className="procesos-input-group">
          <input
            type="text"
            className="procesos-form-control"
            placeholder="¿Qué te gustaría saber ...?"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            autoComplete="new-password"
            name="no_autocomplete_field"
          />

          <button className="procesos-btn" onClick={handleSendMessage}>
            <i className="bi bi-send-fill"></i>
          </button>
        </div>
        <div className="procesos-div-cambio">
          <button className="procesos-btn-cambio" onClick={handleProcessChange}>
            <i className="bi bi-menu-up"></i>
          </button>
        </div>
      </div>
      
    </div>
  );
}

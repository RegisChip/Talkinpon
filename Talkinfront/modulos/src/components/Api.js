// Talkinpon\Talkinfront\modulos\src\components\Api.js

// API.js establece a qye localhost queremos acceder para el trafico de informacion
// API.js
const BASE_URL = "http://localhost:8000";

// Manda los mensajes del usuario a Django - Chatbot
export async function sendUsuarioMensaje(mensaje, session_id = null) {
    try {
        const response = await fetch(`${BASE_URL}/api/chat/`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ mensaje, session_id }),
        });

        if (!response.ok) throw new Error("Error al enviar el mensaje");

        const data = await response.json();
        return data; // { reply: "...", session_id: "..." }

    } catch (error) {
        console.error("Error en sendUsuarioMensaje:", error);
        return { error: true, reply: "Hubo un problema al contactar el servidor" };
    }
}
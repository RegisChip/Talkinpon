// API.js establece a qye localhost queremos acceder para el trafico de informacion

const BASE_URL = "http://localhost:8000"; // localhost default de Django

// Manda los mensajes del usuario a Django - Chatbot
export async function sendUsuarioMensaje(mensaje, modulo) {
    try {
        const response = await fetch(`${BASE_URL}/api/chat/${modulo}/`,
            {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({mensaje}),
            }
        );

        if (!response.ok) throw new Error("Error al enviar el mensaje");

        const data = await response.json();
        return data;
        // Django devolvera {reply: "mensaje del chatbot"}
    }
    catch (error) {
        console.error("Error en sendUsuarioMensaje:", error);
        return { error: true, mensaje: "Hubo un problema al contactar el servidor"};
    }
}
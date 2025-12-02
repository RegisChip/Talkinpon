// Talkinfront/modulos/src/components/Api.js

// API.js establece a qué localhost queremos acceder para el tráfico de información
const BASE_URL = "http://localhost:8000";

// Manda los mensajes del usuario a Django - Chatbot
export async function sendUsuarioMensaje(mensaje, session_id = null, saltarDialog = false) {
    try {

        console.log("API: Enviando request...");
        console.log("URL:", `${BASE_URL}/api/chat/`);
        console.log("Body:", { mensaje, session_id, saltar_dialog: saltarDialog });

        const response = await fetch(`${BASE_URL}/api/chat/`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ 
                mensaje, 
                session_id,
                saltar_dialog: saltarDialog  // NUEVO campo
            }),
        });

        console.log("API: Response status:", response.status);
        console.log("API: Response ok:", response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("API: Error response:", errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log("API: Data parseada:", data);
        return data; // { reply: "...", session_id: "..." }

    } catch (error) {
        console.error("API: Error en sendUsuarioMensaje:", error);
        return { 
            error: true, 
            reply: "Hubo un problema al contactar el servidor",
            details: error.message 
        };
    }
}

export async function borrarContexto(session_id) {
    try {
        const response = await fetch(`${BASE_URL}/api/borrar-contexto/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id }),
        });

        return await response.json();

    } catch (error) {
        console.error("Error en borrarContexto:", error);
        return { error: true };
    }
}
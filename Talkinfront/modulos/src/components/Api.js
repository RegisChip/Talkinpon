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

        // ========== NUEVO: DETECTAR Y PARSEAR RESPUESTAS DE RUTA ==========
        
        // Si 'reply' viene como string y parece JSON, intentar parsearlo
        if (data.reply && typeof data.reply === 'string') {
            const trimmedReply = data.reply.trim();
            
            // Detectar si es un objeto JSON (empieza con '{')
            if (trimmedReply.startsWith('{')) {
                try {
                    const parsedReply = JSON.parse(trimmedReply);
                    
                    // Si es un comando de apertura de mapa, devolver como objeto
                    if (parsedReply.tipo === 'abrir_mapa_con_ruta') {
                        console.log("🗺️ API: Detectado comando de ruta automática");
                        return {
                            ...data,
                            reply: parsedReply  // Reemplazar string por objeto
                        };
                    }
                } catch (parseError) {
                    // Si falla el parsing, es texto normal que coincide con '{'
                    console.log("API: Reply parece JSON pero no se pudo parsear, es texto normal");
                }
            }
        }

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
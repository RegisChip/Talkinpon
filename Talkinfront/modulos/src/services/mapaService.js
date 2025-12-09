// src/services/mapaService.js

// const BASE_URL = "http://127.0.0.1:8000";


/* ============================================================================
   📌 2. Crear un nodo
=========================================================================== */
export const crearNodo = async (x, y, tipo) => {
  const res = await fetch("/api/ubicaciones/crear_nodo/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify({
      pos_x: x,
      pos_y: y,
      tipo: tipo,
    }),
  });

  const data = await res.json();

  if (!data.ok) throw new Error("Error al crear nodo");

  return data;
};

/* ============================================================================
   📌 3. Crear relación entre dos nodos
=========================================================================== */
export const crearRelacion = async (origen, destino) => {
  const res = await fetch("/api/ubicaciones/crear_relacion/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify({
      origen,
      destino,
    }),
  });

  const data = await res.json();

  if (!data.ok) throw new Error("Error al crear relación");

  return data;
};

/* ============================================================================
   📌 4. Eliminar nodo
=========================================================================== */
export const eliminarNodo = async (idNodo) => {
  const res = await fetch("http://localhost:8000/api/ubicaciones/eliminar-nodo/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id_nodo: idNodo })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error("Backend error: " + errorText);
  }

  const data = await res.json();

  if (!data.ok) throw new Error("Error al eliminar nodo");

  return data;
};

/* ============================================================================
   📌 5. Eliminar relación
=========================================================================== */
export const eliminarRelacion = async (idRelacion) => {
  const res = await fetch("/guardar_ubicacion/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify({
      accion: "eliminar_relacion",
      id_relacion: idRelacion,
    }),
  });

  const data = await res.json();

  if (!data.ok) throw new Error("Error al eliminar relación");

  return data;
};


function getCookie(name) {
  let cookieValue = null;
  document.cookie
    ?.split(";")
    .map((c) => c.trim())
    .forEach((cookie) => {
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(
          cookie.substring(name.length + 1)
        );
      }
    });
  return cookieValue;
}
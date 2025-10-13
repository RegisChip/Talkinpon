# Guía para conectarse a un repositorio privado en GitHub (HTTPS + Token)

Esta guía explica cómo conectarse correctamente a un repositorio privado, clonar su contenido, hacer un **pull** (para sincronizar cambios) y luego un **push** (para subir tus modificaciones), sin errores de autenticación.

---

## 1. Crear un Token de Acceso Personal (PAT)

1. Entra a [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Haz clic en “Fine-grained personal access tokens” → “Generate new token”.
3. Configura:
   - Name: `TokenGitLaptop`
   - Expiration: “No expiration” o el tiempo que prefieras.
   - Repository access: selecciona “Only select repositories” → marca el repositorio privado.
4. En Permissions, activa:
   - ✅ `Contents → Read and Write`
   - (Opcional) `Metadata → Read-only`
5. Haz clic en “Generate token”.
6. Copia el token inmediatamente — solo se muestra una vez.

---

## 2. Configurar tu identidad en Git (si aún no esta hecho)

Abre la terminal o Git Bash y escribe:

```bash
git config --global user.name "TuNombre"
git config --global user.email "tucorreo@ejemplo.com"
```

Verifica que los datos se guardaron:

```bash
git config --list
```

---

## 3. Clonar el repositorio privado

Ejecuta el siguiente comando (reemplaza el enlace con el tuyo):

```bash
git clone https://github.com/RegisChip/Talkinpon.git
```

Git te pedirá autenticación:

```bash
Username for 'https://github.com': tu_usuario
Password for 'https://github.com': (pega aquí tu token)
```

Después de esto, el repositorio se descargará por completo.

---

## 4. Guardar tu token localmente (recomendado)

Para no tener que pegar tu token cada vez, guarda las credenciales:

```bash
git config --global credential.helper store
```

Así, la primera vez que ingreses tu token, Git lo recordará.

---

## 5. Hacer un Pull (traer actualizaciones)

Una vez dentro de la carpeta del proyecto:

```bash
cd Talkinpon
git fetch origin
git pull origin principal
````

Puedes verificarl las ramas con con:
git branch -a

Si el repositorio está actualizado, verás el mensaje:
Already up to date.

---

## 6. Subir tus cambios (Push)

Después de modificar o agregar archivos:

```bash
git add .
git commit -m "Descripción breve de los cambios"
git push origin main
```

Nuevamente, si no has guardado el token, Git te pedirá:

```bash
Username for 'https://github.com': tu_usuario
Password for 'https://github.com': (tu token)
```
---

## 7. Flujo completo resumido

```bash
# Configuración inicial
git config --global user.name "TuNombre"
git config --global user.email "tucorreo@ejemplo.com"
git config --global credential.helper store

# Clonar el repo privado
git clone https://github.com/RegisChip/Talkinpon.git
cd Talkinpon

# Descargar actualizaciones
git fetch origin
git pull origin main

# Subir cambios
git add .
git commit -m "mensaje descriptivo"
git push origin main
```
---
### Notas importantes

* Si cambias de equipo o borras las credenciales guardadas, Git volverá a pedirte el token.

* No compartas tu token. Si alguien lo obtiene, puede acceder a tus repositorios privados.

* Puedes revocar el token en cualquier momento desde
https://github.com/settings/tokens

---

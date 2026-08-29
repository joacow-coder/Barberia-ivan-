# Iván Beccaria — Barbería

Sitio web de una sola página para la barbería de Iván Beccaria: sección principal (hero) con estética *street graffiti* + minimalismo moderno, y un sistema de agenda de turnos online.

## Stack

HTML5, CSS3 (variables nativas, sin frameworks) y JavaScript vanilla. Sin dependencias ni pasos de build: se clona y funciona.

> Nota: se optó por CSS puro en lugar de Tailwind para que el proyecto corra sin `npm install` ni configuración adicional. Si más adelante se necesita un design system más grande, se puede migrar a Tailwind o React/Vite sin perder la estructura actual.

## Estructura

```
Barberia-Ivan/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── script.js
├── assets/
│   └── img/
│       └── barbero-principal.png   ← colocar aquí la foto del barbero
└── README.md
```

## Cómo correrlo localmente

No requiere instalación. Alcanza con abrir `index.html` en el navegador, o levantar un servidor estático simple (recomendado para que las rutas relativas y las fuentes carguen igual que en producción):

```bash
# Opción 1: Python (ya viene instalado en la mayoría de los sistemas)
python3 -m http.server 5500

# Opción 2: Node (si tenés npx disponible)
npx serve .
```

Luego abrí `http://localhost:5500` en el navegador.

## Imagen del hero

Colocá el archivo `barbero-principal.png` (horizontal, barbero a la izquierda, fondo oscuro extendido) dentro de `assets/img/`. Si el archivo no está presente, el hero muestra automáticamente el fondo degradado con los tags decorativos, sin romperse.

## Sistema de turnos

- Días habilitados: **martes a viernes**.
- Horario: **14:00 a 20:00 hs**, en bloques de **30 minutos**.
- Al elegir una fecha válida se generan los horarios disponibles; los turnos ya reservados aparecen deshabilitados y tachados, y los horarios pasados del día actual también se bloquean.
- El formulario valida nombre, apellido, teléfono y horario seleccionado antes de confirmar, mostrando errores inline y una animación de estado (éxito o error).
- **Persistencia:** en esta versión los turnos se guardan en `localStorage` del navegador (no hay backend). Esto permite una demo totalmente funcional sin servidor, pero significa que los turnos no se comparten entre dispositivos ni se ven desde un panel de administración.

### Próximos pasos sugeridos para producción

Para que los turnos queden centralizados (visibles desde cualquier dispositivo, con notificación a Iván), se recomienda conectar el formulario a un backend real, por ejemplo:
- Un endpoint propio (Node/Express, o funciones serverless) con una base de datos (PostgreSQL, SQLite, Firebase, Supabase).
- Un servicio de formularios (Netlify Forms, Formspree) combinado con una integración de calendario (Google Calendar API) si no se necesita lógica custom.

El JavaScript actual (`js/script.js`) está aislado en funciones puras (`buildTimeSlots`, `getAppointments`, `saveAppointment`, `isSlotTaken`) para que reemplazar `localStorage` por llamadas `fetch` a una API sea un cambio acotado.

## Despliegue

El sitio es 100% estático, por lo que se puede publicar directamente en:
- **GitHub Pages**: activar Pages en la configuración del repositorio, apuntando a la rama `main` y carpeta raíz.
- **Netlify / Vercel**: importar el repositorio, sin build command (o `echo "static site"`), publish directory `/`.

## Repositorio

```bash
git init
git add .
git commit -m "Sitio inicial: hero + sistema de turnos"
git branch -M main
git remote add origin https://github.com/joacow-coder/Barberia-ivan-.git
git push -u origin main
```

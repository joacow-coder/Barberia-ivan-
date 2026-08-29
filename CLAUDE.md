# Instrucciones del proyecto

## Automatización de git (regla permanente del usuario)

Cada vez que se escriba o modifique código en este repositorio, ejecutar automáticamente,
sin pedir confirmación:

```bash
git add .
git commit -m "Actualización: <breve descripción del cambio>"
git push
```

- No preguntar antes de hacer el push; el usuario ya autorizó este flujo de forma explícita.
- Antes del `add`, sigue siendo obligatorio revisar que no se estén incluyendo archivos con
  secretos o credenciales (por ejemplo, tokens pegados por error en archivos de configuración).
- El mensaje de commit debe describir brevemente el cambio real hecho en esa iteración
  (no un mensaje genérico repetido).
- Remoto: `https://github.com/joacow-coder/Barberia-ivan-.git`, rama `main`.

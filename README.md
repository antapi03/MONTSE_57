# MONTSE_57 🎉

Tarjeta familiar interactiva, protegida por contraseña en Netlify Functions.

## Publicación
1. Subir `netlify.toml`, `public/` y `netlify/` al repositorio privado.
2. En Netlify, configurar variables de entorno **FAMILY_PASSWORD** (contraseña familiar) y **SESSION_SECRET** (secreto aleatorio de al menos 32 caracteres, diferente de la contraseña).
3. Desplegar desde rama `main`. El directorio de publicación es `public`.
4. Verificar en ventana privada: antes de iniciar sesión solo aparece la pantalla de acceso; tras entrar aparece la tarjeta; al salir vuelve el acceso.

No guardar contraseñas ni fotografías privadas en `public/`. Las fotos futuras deberán servirse exclusivamente después de validar la sesión desde una función del servidor, nunca mediante rutas estáticas públicas. No compartir la contraseña en el repositorio.

Nota: el sistema usa una contraseña común y una cookie firmada de 7 días. No dispone de limitación de intentos; antes de compartirlo ampliamente conviene añadir rate limiting en el borde o usar un servicio de autenticación administrado. Los planes y límites gratuitos de Netlify pueden cambiar.

# DO IT UNAM

Editor multimedia con Python y Django, configuración en español y SQLite.
Cada usuario puede crear proyectos de animación, agregar cuadros de texto y
usar imágenes de las galerías de **Elementos** y **Fondos**.

## Ejecutar en Windows (PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

Si el entorno ya existe y las dependencias están instaladas, basta con el último
comando. No es necesario activar el entorno virtual.

Abrir http://127.0.0.1:8000/ y crear una cuenta o iniciar sesión para ver los
proyectos propios.
Para detener el servidor, vuelve a la misma ventana de PowerShell donde está
ejecutándose y presiona **Ctrl+C**.

## Crear el administrador

Una vez aplicadas las migraciones, ejecutar en una terminal interactiva:

```powershell
.\.venv\Scripts\python.exe manage.py createsuperuser
```

Introducir usuario, correo y contraseña cuando se soliciten. La contraseña no se
muestra al escribir y no debe añadirse al código ni a este archivo.

Quienes usarán el editor pueden crear su propia cuenta desde **Regístrate aquí**
en la pantalla de inicio de sesión, o abrir `/cuentas/registro/`. Se pide un
nombre de usuario y una contraseña confirmada; Django valida y guarda la
contraseña de forma segura. Después del registro, la sesión inicia
automáticamente. También se pueden administrar cuentas desde el panel de Django.

## Uso

1. Crear una cuenta en `/cuentas/registro/` o iniciar sesión en `/cuentas/entrar/`.
2. En **Mis proyectos**, escribir un nombre y pulsar **Crear proyecto**.
3. Pulsar **Agregar texto** o **Texto** en la barra lateral. Escribir directamente
   en el cuadro; pulsar Escape para terminar. Doble clic o **Editar** vuelve a abrirlo.
4. Arrastrar el cuadro para moverlo y la esquina azul para redimensionarlo.
   La barra superior cambia fuente, tamaño, color, negrita, cursiva, subrayado y
   alineación del cuadro seleccionado. **Eliminar** borra ese cuadro.
5. Los cambios se guardan automáticamente mientras editas. También puedes pulsar
   **Guardar** para guardar inmediatamente.
6. Volver a **Mis proyectos** o pulsar **Cerrar sesión**.

Los nombres admiten hasta 150 caracteres, pueden repetirse y no pueden estar
vacíos. Se eliminan los espacios exteriores. Los proyectos se ordenan por última
modificación y solo su propietario puede abrirlos o cambiarles el nombre en el editor.

Cada escena admite hasta 100 objetos. Los cuadros de texto aceptan hasta 5000
caracteres, incluidos saltos de línea; los elementos gráficos se pueden mover,
redimensionar y animar igual que los cuadros.
Enter edita el cuadro seleccionado, Escape termina la edición, las flechas lo
mueven (Shift mueve 10 píxeles) y Supr lo elimina cuando no estás escribiendo.
Los cuadros mantienen su posición sobre un lienzo de 800 × 450 que se escala para
ajustarse al espacio disponible. El texto que excede el cuadro queda recortado:
amplía el cuadro o reduce la fuente para verlo completo. Cada objeto tiene un ID
estable, texto plano, posición, dimensiones y formato. Abre **Animar**, selecciona
un objeto y aplica con un clic uno de los efectos predefinidos; **Vista previa**
reproduce los efectos elegidos. La animación es opcional y se configura por objeto.
Se necesita JavaScript para editar. Se avisa al salir mientras hay cambios sin guardar.

## Archivos principales

- `config/settings.py`: configuración de Django y SQLite.
- `config/urls.py`: rutas del proyecto.
- `editor/urls.py` y `editor/views.py`: ruta y vista del editor.
- `editor/templates/editor/index.html`: plantilla activa; editar aquí la interfaz.
- `editor/models.py`, `editor/forms.py` y `editor/scene.py`: proyecto y validación de la escena.
- `editor/static/editor/js/editor.js`: selección, edición, arrastre y formato.
- `editor/static/editor/images/logo.png`: logo PNG usado en los encabezados y el acceso a **Mis proyectos**.
- `editor/static/editor/images/favicon.png`: versión recortada del emblema para la pestaña del navegador.
- `editor/static/editor/images/elementos/`: imágenes PNG, JPG, JPEG o WebP disponibles en la sección **Elementos**.
- `editor/static/editor/images/fondos/`: imágenes PNG, JPG, JPEG o WebP disponibles en la sección **Fondos**.
- `editor/templates/editor/proyectos.html`: listado y creación de proyectos.
- `editor/templates/registration/login.html`: inicio de sesión.
- `editor/static/editor/css/editor.css`: estilos propios.
- `index.html`: referencia original, conservada sin cambios.

## Estado actual

Se guardan el nombre, propietario, fechas, cuadros de texto, elementos gráficos y fondo de cada proyecto.
Los proyectos nuevos empiezan sin texto. Ya no existe el panel de título/subtítulo.
En **Elementos**, elegir una imagen la agrega al lienzo; se puede seleccionar,
mover, redimensionar y animar como los cuadros de texto. En **Fondos**, elegir
una imagen la aplica al lienzo completo; **Quitar fondo** vuelve al lienzo blanco.
Los cambios se guardan automáticamente. Para agregar más recursos, copia
archivos PNG, JPG, JPEG o WebP en la carpeta de la sección y recarga el editor.
La reproducción, varias escenas, compartir y exportación siguen pendientes.
Para el logo, copia el archivo PNG a `editor/static/editor/images/logo.png`.
Ese archivo se muestra en el encabezado como botón para regresar a **Mis proyectos**
y también como icono PNG de la pestaña del navegador.

Si vienes de la primera etapa, ejecutar `manage.py migrate` con el Python del
entorno virtual crea o actualiza la tabla de proyectos sin eliminar los datos
existentes. La migración 0003 convierte los títulos y subtítulos anteriores en
cuadros independientes antes de retirar esos campos.

Tailwind, Font Awesome, Poppins y las imágenes se cargan desde servicios externos,
por lo que se necesita conexión para mostrar el diseño completo.

## Verificación

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test editor
```

Las pruebas usan una base de datos temporal: verifican registro, sesiones,
aislamiento entre usuarios, validación, persistencia, escape de HTML, métodos HTTP
y protección CSRF.

Prueba opcional de interacción real en Chromium:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m playwright install chromium
.\.venv\Scripts\python.exe manage.py test editor.browser_tests
```

Comprueba agregar elementos e imágenes de fondo, editar, mover, redimensionar,
dar formato, guardar, recargar y eliminar usando una base temporal y Chromium sin
ventana visible.

Configuración destinada a desarrollo local. Para un despliegue se deben configurar
`DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0` y `DJANGO_ALLOWED_HOSTS` (separados por comas),
además del servidor y los archivos estáticos.

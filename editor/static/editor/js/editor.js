(() => {
    const $ = id => document.getElementById(id);
    const form = $("project-form");
    const stage = $("stage");
    if (!form || !stage) return;

    const objects = JSON.parse($("scene-data").textContent);
    const assetBase = stage.dataset.assetBase;
    const initialBackground = form.elements.fondo.value;
    let savedName = form.elements.nombre.value;
    let savedScene = JSON.stringify(objects);
    let savedBackground = initialBackground;
    let selected = null;
    let editing = null;
    let scale = 1;
    let gesture = null;
    let saveTimer = null;
    let saving = false;
    let saveAgain = false;
    let submitting = false;
    let playing = false;
    let previewAnimations = [];
    const hasErrors = Boolean(document.querySelector(".errorlist"));
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const current = () => objects.find(obj => obj.id === selected);
    const node = id => [...stage.children].find(el => el.dataset.id === id);
    const objectLabel = obj => obj.tipo === "imagen"
        ? obj.imagen.split("/").at(-1)
        : obj.texto.slice(0, 60) || "Texto vacío";
    const dirty = () => hasErrors
        || form.elements.nombre.value !== savedName
        || form.elements.fondo.value !== savedBackground
        || JSON.stringify(objects) !== savedScene;

    function sync() {
        form.elements.objetos.value = JSON.stringify(objects);
        $("object-count").textContent = `${objects.length} objetos`;
        $("save-status").textContent = saving
            ? "Guardando automáticamente…"
            : dirty() ? "Cambios sin guardar" : "Guardado automáticamente";
        $("add-text").disabled = $("text-tool").disabled = objects.length >= 100;
        $("elements-tool").disabled = objects.length >= 100;
        $("animation-tool").disabled = !current();
        if (dirty() && !submitting) scheduleSave();
        else if (!dirty() && saveTimer) {
            clearTimeout(saveTimer);
            saveTimer = null;
        }
    }

    function scheduleSave() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => save(), 900);
    }

    async function save() {
        clearTimeout(saveTimer);
        saveTimer = null;
        if (saving) {
            saveAgain = true;
            return;
        }
        if (!dirty()) return;

        saving = true;
        sync();
        const data = new FormData(form);
        const snapshot = {
            name: data.get("nombre"),
            scene: data.get("objetos"),
            background: data.get("fondo"),
        };
        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: data,
                headers: {"X-Requested-With": "XMLHttpRequest"},
                credentials: "same-origin",
            });
            const result = await response.json();
            if (!response.ok) {
                const messages = Object.values(result.errors || {}).flat().map(error => error.message);
                throw new Error(messages.join(" ") || "No se pudieron guardar los cambios.");
            }
            savedName = snapshot.name;
            savedScene = snapshot.scene;
            savedBackground = snapshot.background;
            $("save-status").textContent = "Guardado automáticamente";
        } catch (error) {
            $("save-status").textContent = `No se pudo guardar automáticamente: ${error.message}`;
        } finally {
            saving = false;
            const changedDuringSave = dirty();
            sync();
            if ((saveAgain || changedDuringSave) && !submitting) {
                saveAgain = false;
                scheduleSave();
            }
        }
    }

    function stopEditing() {
        if (!editing) return;
        const el = node(editing);
        el.classList.remove("editing");
        el.querySelector("textarea").readOnly = true;
        editing = null;
    }

    function setBackground(path) {
        form.elements.fondo.value = path;
        stage.style.backgroundImage = path ? `url("${assetBase}${encodeURI(path)}")` : "none";
        sync();
    }

    function updateAnimationPanel() {
        const obj = current();
        $("animation-selection").textContent = obj
            ? `Animación para: ${objectLabel(obj)}`
            : "Selecciona un texto o elemento para aplicarle una animación.";
        for (const button of document.querySelectorAll(".animation-choice")) {
            button.setAttribute("aria-pressed", String(Boolean(obj) && (obj.animacion || "ninguna") === button.dataset.animation));
            button.disabled = !obj;
        }
        $("preview-animation").disabled = !objects.some(obj => (obj.animacion || "ninguna") !== "ninguna");
    }

    function select(id) {
        if (selected !== id) stopEditing();
        selected = id;
        for (const el of stage.children) {
            el.classList.toggle("selected", el.dataset.id === id);
        }
        const obj = current();
        const textSelected = obj && obj.tipo !== "imagen";
        $("object-tools").disabled = !textSelected;
        for (const id of ["font-family", "font-size", "font-color", "bold", "italic", "underline", "text-align", "edit-text"]) {
            $(id).disabled = !textSelected;
        }
        $("delete-text").disabled = !obj;
        if (textSelected) {
            $("font-family").value = obj.fuente;
            $("font-size").value = obj.tamano;
            $("font-color").value = obj.color;
            $("text-align").value = obj.alineacion;
            for (const [id, key] of [["bold", "negrita"], ["italic", "cursiva"], ["underline", "subrayado"]]) {
                $(id).setAttribute("aria-pressed", String(obj[key]));
            }
        }
        updateAnimationPanel();
    }

    function edit() {
        const obj = current();
        if (!obj || obj.tipo === "imagen") return;
        editing = obj.id;
        const el = node(obj.id);
        el.classList.add("editing");
        const input = el.querySelector("textarea");
        input.readOnly = false;
        input.focus();
    }

    function mount(obj) {
        const el = document.createElement("div");
        const isImage = obj.tipo === "imagen";
        el.className = isImage ? "text-object image-object" : "text-object";
        el.dataset.id = obj.id;
        el.tabIndex = 0;
        el.setAttribute("role", "group");
        el.setAttribute("aria-label", isImage
            ? `Elemento ${objectLabel(obj)}; selecciónalo para moverlo`
            : "Cuadro de texto; Enter para editar, flechas para mover");

        let content;
        if (isImage) {
            content = document.createElement("img");
            content.className = "element-image";
            content.src = `${assetBase}${encodeURI(obj.imagen)}`;
            content.alt = "";
            content.draggable = false;
        } else {
            content = document.createElement("textarea");
            content.className = "object-content";
            content.value = obj.texto;
            content.maxLength = 5000;
            content.readOnly = true;
            content.tabIndex = -1;
            content.setAttribute("aria-label", "Contenido del cuadro de texto");
            content.addEventListener("input", () => {
                obj.texto = content.value;
                updateAnimationPanel();
                sync();
            });
            content.addEventListener("blur", () => {
                if (editing === obj.id) stopEditing();
            });
        }

        const handle = document.createElement("span");
        handle.className = "resize-handle";
        handle.setAttribute("aria-hidden", "true");
        el.append(content, handle);
        el.addEventListener("focus", () => select(obj.id));
        el.addEventListener("dblclick", () => {
            select(obj.id);
            edit();
        });
        el.addEventListener("pointerdown", event => {
            if (event.button !== 0) return;
            select(obj.id);
            if (editing === obj.id && event.target === content) return;
            event.preventDefault();
            el.focus();
            gesture = {
                id: obj.id,
                pointer: event.pointerId,
                resize: event.target === handle,
                sx: event.clientX,
                sy: event.clientY,
                x: obj.x,
                y: obj.y,
                width: obj.ancho,
                height: obj.alto,
            };
            el.setPointerCapture(event.pointerId);
        });
        el.addEventListener("pointermove", event => {
            if (!gesture || gesture.id !== obj.id || gesture.pointer !== event.pointerId) return;
            const dx = (event.clientX - gesture.sx) / scale;
            const dy = (event.clientY - gesture.sy) / scale;
            if (gesture.resize) {
                obj.ancho = clamp(gesture.width + dx, 60, 800 - obj.x);
                obj.alto = clamp(gesture.height + dy, 30, 450 - obj.y);
            } else {
                obj.x = clamp(gesture.x + dx, 0, 800 - obj.ancho);
                obj.y = clamp(gesture.y + dy, 0, 450 - obj.alto);
                const firstFrame = obj.fotogramas?.[0];
                if (firstFrame?.frame === 0) {
                    firstFrame.x = obj.x;
                    firstFrame.y = obj.y;
                }
            }
            el.style.left = `${obj.x}px`;
            el.style.top = `${obj.y}px`;
            el.style.width = `${obj.ancho}px`;
            el.style.height = `${obj.alto}px`;
            for (const key of ["x", "y"]) {
                const firstFrame = obj.fotogramas?.[0];
                if (firstFrame?.frame === 0) firstFrame[key] = obj[key];
            }
            sync();
        });
        for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
            el.addEventListener(eventName, () => {
                gesture = null;
            });
        }
        stage.append(el);
        el.style.left = `${obj.x}px`;
        el.style.top = `${obj.y}px`;
        el.style.width = `${obj.ancho}px`;
        el.style.height = `${obj.alto}px`;
        if (!isImage) {
            Object.assign(content.style, {
                fontFamily: `${obj.fuente}, sans-serif`,
                fontSize: `${obj.tamano}px`,
                color: obj.color,
                fontWeight: obj.negrita ? "700" : "400",
                fontStyle: obj.cursiva ? "italic" : "normal",
                textDecoration: obj.subrayado ? "underline" : "none",
                textAlign: obj.alineacion,
            });
        }
    }

    function addText() {
        if (objects.length >= 100) return;
        stopEditing();
        const offset = (objects.length % 8) * 16;
        const obj = {
            id: crypto.randomUUID(),
            texto: "Escribe tu texto",
            x: 200 + offset,
            y: 140 + offset,
            ancho: 360,
            alto: 110,
            fuente: "Poppins",
            tamano: 36,
            color: "#ffffff",
            negrita: false,
            cursiva: false,
            subrayado: false,
            alineacion: "center",
            animacion: "ninguna",
            fotogramas: [{frame: 0, x: 200 + offset, y: 140 + offset, giro: 0, opacidad: 1, interpolacion: "lineal"}],
        };
        objects.push(obj);
        mount(obj);
        select(obj.id);
        edit();
        node(obj.id).querySelector("textarea").select();
        sync();
    }

    function addElement(path) {
        if (objects.length >= 100) return;
        stopEditing();
        const offset = (objects.length % 8) * 16;
        const obj = {
            id: crypto.randomUUID(),
            tipo: "imagen",
            imagen: path,
            texto: "",
            x: 300 + offset,
            y: 150 + offset,
            ancho: 200,
            alto: 150,
            fuente: "Poppins",
            tamano: 36,
            color: "#ffffff",
            negrita: false,
            cursiva: false,
            subrayado: false,
            alineacion: "center",
            animacion: "ninguna",
            fotogramas: [{frame: 0, x: 300 + offset, y: 150 + offset, giro: 0, opacidad: 1, interpolacion: "lineal"}],
        };
        objects.push(obj);
        mount(obj);
        select(obj.id);
        sync();
    }

    function remove() {
        const obj = current();
        if (!obj) return;
        stopEditing();
        node(obj.id).remove();
        objects.splice(objects.findIndex(item => item.id === obj.id), 1);
        select(null);
        sync();
        stage.focus();
    }

    function showGallery(section, button) {
        const panel = $("asset-panel");
        const isOpen = !panel.hidden && panel.dataset.section === section;
        panel.hidden = isOpen;
        panel.dataset.section = isOpen ? "" : section;
        for (const gallery of document.querySelectorAll(".asset-gallery")) {
            gallery.hidden = isOpen || gallery.dataset.gallery !== section;
        }
        $("asset-panel-title").textContent = {
            elementos: "Elementos",
            fondos: "Fondos",
            animaciones: "Animar",
        }[section];
        for (const tool of [$("images-tool"), $("elements-tool"), $("background-tool"), $("animation-tool")]) {
            tool.setAttribute("aria-expanded", String(!isOpen && tool === button));
            tool.classList.toggle("tool-active", !isOpen && tool === button);
        }
    }

    function preview() {
        previewAnimations.forEach(animation => animation.cancel());
        previewAnimations = [];
        const effects = {
            aparecer: [{opacity: 0}, {opacity: 1}],
            subir: [{opacity: 0, transform: "translateY(28px)"}, {opacity: 1, transform: "translateY(0)"}],
            zoom: [{opacity: 0, transform: "scale(.65)"}, {opacity: 1, transform: "scale(1)"}],
            girar: [{opacity: 0, transform: "rotate(-18deg) scale(.75)"}, {opacity: 1, transform: "rotate(0) scale(1)"}],
            rebote: [{opacity: 0, transform: "translateY(-24px) scale(.8)"}, {opacity: 1, transform: "translateY(0) scale(1)"}],
        };
        objects.forEach((obj, index) => {
            const frames = effects[obj.animacion];
            if (!frames) return;
            const animation = node(obj.id).animate(frames, {
                duration: obj.animacion === "rebote" ? 900 : 650,
                delay: index * 90,
                easing: obj.animacion === "rebote" ? "cubic-bezier(.34,1.56,.64,1)" : "ease-out",
                fill: "both",
            });
            animation.onfinish = () => animation.cancel();
            previewAnimations.push(animation);
        });
        $("animation-status").textContent = previewAnimations.length
            ? "Reproduciendo la vista previa de la escena."
            : "Elige un efecto para al menos un objeto.";
    }

    $("text-tool").addEventListener("click", addText);
    $("add-text").addEventListener("click", addText);
    $("delete-text").addEventListener("click", remove);
    $("edit-text").addEventListener("click", edit);
    $("images-tool").addEventListener("click", event => showGallery("elementos", event.currentTarget));
    $("elements-tool").addEventListener("click", event => showGallery("elementos", event.currentTarget));
    $("background-tool").addEventListener("click", event => showGallery("fondos", event.currentTarget));
    $("animation-tool").addEventListener("click", event => showGallery("animaciones", event.currentTarget));
    $("close-asset-panel").addEventListener("click", () => {
        $("asset-panel").hidden = true;
        for (const tool of [$("images-tool"), $("elements-tool"), $("background-tool"), $("animation-tool")]) {
            tool.setAttribute("aria-expanded", "false");
            tool.classList.remove("tool-active");
        }
    });
    document.querySelectorAll(".asset-choice").forEach(button => {
        button.addEventListener("click", () => {
            const path = button.dataset.assetPath;
            if (button.closest(".asset-gallery").dataset.gallery === "fondos") {
                setBackground(path);
            } else {
                addElement(path);
            }
        });
    });
    $("clear-background").addEventListener("click", () => setBackground(""));
    document.querySelectorAll(".animation-choice").forEach(button => {
        button.addEventListener("click", () => {
            const obj = current();
            if (!obj) {
                $("animation-status").textContent = "Primero selecciona un texto o elemento del lienzo.";
                return;
            }
            obj.animacion = button.dataset.animation;
            updateAnimationPanel();
            $("animation-status").textContent = button.dataset.animation === "ninguna"
                ? "Animación quitada del objeto seleccionado."
                : "Animación aplicada. Se guardará automáticamente.";
            sync();
        });
    });
    $("preview-animation").addEventListener("click", preview);
    stage.addEventListener("pointerdown", event => {
        if (event.target === stage) select(null);
    });
    stage.addEventListener("keydown", event => {
        const obj = current();
        if (!obj) return;
        if (editing) {
            if (event.key === "Escape") {
                event.preventDefault();
                stopEditing();
                node(selected).focus();
            }
            return;
        }
        if (event.key === "Enter" && obj.tipo !== "imagen") {
            event.preventDefault();
            edit();
        }
        if (["Delete", "Backspace"].includes(event.key)) {
            event.preventDefault();
            remove();
        }
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            const step = event.shiftKey ? 10 : 1;
            obj.x = clamp(obj.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), 0, 800 - obj.ancho);
            obj.y = clamp(obj.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0), 0, 450 - obj.alto);
            node(obj.id).style.left = `${obj.x}px`;
            node(obj.id).style.top = `${obj.y}px`;
            sync();
        }
    });

    for (const [id, key] of [["font-family", "fuente"], ["font-size", "tamano"], ["font-color", "color"], ["text-align", "alineacion"]]) {
        $(id).addEventListener("input", () => {
            const obj = current();
            const input = $(id);
            if (!obj || obj.tipo === "imagen" || !input.checkValidity() || input.value === "") return;
            obj[key] = key === "tamano" ? Number(input.value) : input.value;
            mountStyle(obj);
            sync();
        });
    }

    function mountStyle(obj) {
        const input = node(obj.id).querySelector("textarea");
        if (!input) return;
        Object.assign(input.style, {
            fontFamily: `${obj.fuente}, sans-serif`,
            fontSize: `${obj.tamano}px`,
            color: obj.color,
            fontWeight: obj.negrita ? "700" : "400",
            fontStyle: obj.cursiva ? "italic" : "normal",
            textDecoration: obj.subrayado ? "underline" : "none",
            textAlign: obj.alineacion,
        });
    }

    for (const [id, key] of [["bold", "negrita"], ["italic", "cursiva"], ["underline", "subrayado"]]) {
        $(id).addEventListener("click", () => {
            const obj = current();
            if (!obj || obj.tipo === "imagen") return;
            obj[key] = !obj[key];
            $(id).setAttribute("aria-pressed", String(obj[key]));
            mountStyle(obj);
            sync();
        });
    }

    form.elements.nombre.addEventListener("input", sync);
    form.addEventListener("submit", event => {
        event.preventDefault();
        submitting = true;
        save();
        submitting = false;
    });
    window.addEventListener("beforeunload", event => {
        if (dirty() || saving) {
            event.preventDefault();
            event.returnValue = "";
        }
    });
    window.addEventListener("pageshow", () => {
        submitting = false;
    });

    const area = stage.parentElement.parentElement;
    new ResizeObserver(() => {
        scale = Math.min(1, Math.max(100, area.clientWidth - 48) / 800, Math.max(100, area.clientHeight - 48) / 450);
        $("stage-viewport").style.width = `${800 * scale}px`;
        $("stage-viewport").style.height = `${450 * scale}px`;
        stage.style.transform = `scale(${scale})`;
    }).observe(area);

    setBackground(initialBackground);
    objects.forEach(mount);
    select(null);
    updateAnimationPanel();
    sync();
})();

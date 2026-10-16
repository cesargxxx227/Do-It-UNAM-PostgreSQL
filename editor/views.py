import json
from pathlib import Path

from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .forms import EditorForm, ProyectoForm, RegistroForm
from .models import Proyecto
from .scene import imagenes_disponibles


def _galeria(seccion):
    return [
        {
            "ruta": f"{seccion}/{nombre}",
            "nombre": Path(nombre).stem,
        }
        for nombre in imagenes_disponibles(seccion)
    ]


def _contexto_galerias():
    return {
        "elementos": _galeria("elementos"),
        "fondos": _galeria("fondos"),
    }


@require_http_methods(["GET", "POST"])
def registro(request):
    if request.user.is_authenticated:
        return redirect("editor:index")

    form = RegistroForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        usuario = form.save()
        login(request, usuario)
        return redirect("editor:index")
    return render(request, "registration/registro.html", {"form": form})


@login_required
@require_GET
def index(request):
    return render(request, "editor/proyectos.html", {
        "proyectos": Proyecto.objects.filter(propietario=request.user),
        "form": ProyectoForm(),
    })


@login_required
@require_POST
def crear(request):
    form = ProyectoForm(request.POST)
    if form.is_valid():
        proyecto = form.save(commit=False)
        proyecto.propietario = request.user
        proyecto.save()
        return redirect("editor:detalle", pk=proyecto.pk)
    return render(request, "editor/proyectos.html", {
        "proyectos": Proyecto.objects.filter(propietario=request.user),
        "form": form,
    })


@login_required
@require_GET
def detalle(request, pk):
    proyecto = get_object_or_404(Proyecto, pk=pk, propietario=request.user)
    return render(request, "editor/index.html", {
        "proyecto": proyecto, "form": EditorForm(instance=proyecto), "objetos": proyecto.objetos,
        **_contexto_galerias(),
    })


@login_required
@require_POST
def guardar(request, pk):
    proyecto = get_object_or_404(Proyecto, pk=pk, propietario=request.user)
    data = request.POST.copy()
    # Un formulario anterior que envía solo nombre no borra la escena.
    if "objetos" not in data:
        data["objetos"] = json.dumps(proyecto.objetos)
    if "duracion_frames" not in data:
        data["duracion_frames"] = proyecto.duracion_frames
    if "fondo" not in data:
        data["fondo"] = proyecto.fondo
    objetos_guardados = proyecto.objetos
    form = EditorForm(data, instance=proyecto)
    if request.headers.get("x-requested-with") == "XMLHttpRequest":
        if form.is_valid():
            form.save()
            return JsonResponse({"saved": True})
        return JsonResponse({"errors": form.errors.get_json_data()}, status=400)
    if form.is_valid():
        form.save()
        messages.success(request, "Proyecto guardado")
        return redirect("editor:detalle", pk=proyecto.pk)
    return render(request, "editor/index.html", {
        "proyecto": proyecto, "form": form,
        "objetos": form.cleaned_data.get("objetos", objetos_guardados),
        **_contexto_galerias(),
    })

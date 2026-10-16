from django.urls import path

from . import views

app_name = "editor"
urlpatterns = [
    path("cuentas/registro/", views.registro, name="registro"),
    path("", views.index, name="index"),
    path("proyectos/nuevo/", views.crear, name="crear"),
    path("proyectos/<int:pk>/", views.detalle, name="detalle"),
    path("proyectos/<int:pk>/guardar/", views.guardar, name="guardar"),
]

from django.contrib import admin

from .models import Proyecto


@admin.register(Proyecto)
class ProyectoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "propietario", "creado", "modificado"]
    list_filter = ["propietario"]
    search_fields = ["nombre", "propietario__username"]
    readonly_fields = ["creado", "modificado"]

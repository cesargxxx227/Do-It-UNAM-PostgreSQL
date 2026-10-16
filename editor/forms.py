from django import forms
from django.contrib.auth.forms import UserCreationForm

from .models import Proyecto


class RegistroForm(UserCreationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].label = "Nombre de usuario"
        self.fields["username"].widget.attrs.update({"autocomplete": "username"})
        self.fields["password1"].label = "Contraseña"
        self.fields["password1"].widget.attrs.update({"autocomplete": "new-password"})
        self.fields["password2"].label = "Confirmar contraseña"
        self.fields["password2"].widget.attrs.update({"autocomplete": "new-password"})


class ProyectoForm(forms.ModelForm):
    class Meta:
        model = Proyecto
        fields = ["nombre"]
        labels = {"nombre": "Nombre del proyecto"}
        widgets = {
            "nombre": forms.TextInput(attrs={"class": "project-name", "placeholder": "Nombre del proyecto"})
        }
        error_messages = {
            "nombre": {
                "required": "Escribe un nombre para el proyecto.",
                "max_length": "El nombre no puede superar los 150 caracteres.",
            }
        }


class EditorForm(ProyectoForm):
    objetos = forms.JSONField(required=False, widget=forms.HiddenInput())
    fondo = forms.CharField(required=False, widget=forms.HiddenInput())

    def clean_objetos(self):
        from .scene import completar_animacion, validar_objetos

        objetos = completar_animacion(self.cleaned_data["objetos"], self.instance.objetos or [])
        validar_objetos(objetos)
        return objetos

    def clean_fondo(self):
        from .scene import validar_fondo

        fondo = self.cleaned_data["fondo"]
        validar_fondo(fondo)
        return fondo

    class Meta(ProyectoForm.Meta):
        fields = ["nombre", "objetos", "fondo", "duracion_frames"]
        widgets = {**ProyectoForm.Meta.widgets, "duracion_frames": forms.HiddenInput()}

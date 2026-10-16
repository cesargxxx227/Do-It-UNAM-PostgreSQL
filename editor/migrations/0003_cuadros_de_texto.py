from django.db import migrations, models
import editor.scene


def convertir(apps, schema_editor):
    Proyecto = apps.get_model("editor", "Proyecto")
    for proyecto in Proyecto.objects.using(schema_editor.connection.alias).all().iterator():
        objetos = []
        for nombre, texto, y, alto, tamano, color in [
            ("titulo", proyecto.titulo, 120, 170, 60, "#ffffff"),
            ("subtitulo", proyecto.subtitulo, 300, 80, 16, "#eab308"),
        ]:
            if texto:
                objetos.append(dict(id=nombre, texto=texto, x=80, y=y, ancho=640,
                    alto=alto, fuente="Poppins", tamano=tamano, color=color,
                    negrita=True, cursiva=False, subrayado=False, alineacion="center"))
        proyecto.objetos = objetos
        proyecto.save(update_fields=["objetos"])


def restaurar(apps, schema_editor):
    Proyecto = apps.get_model("editor", "Proyecto")
    for proyecto in Proyecto.objects.using(schema_editor.connection.alias).all().iterator():
        proyecto.titulo = next((obj["texto"] for obj in proyecto.objetos if obj["id"] == "titulo"), "")[:300]
        proyecto.subtitulo = next((obj["texto"] for obj in proyecto.objetos if obj["id"] == "subtitulo"), "")[:500]
        proyecto.save(update_fields=["titulo", "subtitulo"])


class Migration(migrations.Migration):
    dependencies = [("editor", "0002_proyecto_subtitulo_proyecto_titulo")]
    operations = [
        migrations.AddField(model_name="proyecto", name="objetos", field=models.JSONField(blank=True, default=list, validators=[editor.scene.validar_objetos])),
        migrations.RunPython(convertir, restaurar),
        migrations.RemoveField(model_name="proyecto", name="titulo"),
        migrations.RemoveField(model_name="proyecto", name="subtitulo"),
    ]

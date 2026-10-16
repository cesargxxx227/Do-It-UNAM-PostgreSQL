from django.db import migrations, models
import django.core.validators


def inicializar(apps, schema_editor):
    Proyecto = apps.get_model("editor", "Proyecto")
    for proyecto in Proyecto.objects.using(schema_editor.connection.alias).all().iterator():
        for obj in proyecto.objetos:
            obj["fotogramas"] = [dict(frame=0, x=obj["x"], y=obj["y"], giro=0, opacidad=1, interpolacion="lineal")]
        proyecto.save(update_fields=["objetos"])


def revertir(apps, schema_editor):
    Proyecto = apps.get_model("editor", "Proyecto")
    for proyecto in Proyecto.objects.using(schema_editor.connection.alias).all().iterator():
        for obj in proyecto.objetos:
            obj.pop("fotogramas", None)
        proyecto.save(update_fields=["objetos"])


class Migration(migrations.Migration):
    dependencies = [("editor", "0003_cuadros_de_texto")]
    operations = [
        migrations.AddField(model_name="proyecto", name="duracion_frames", field=models.PositiveIntegerField(default=300, validators=[django.core.validators.MinValueValidator(30), django.core.validators.MaxValueValidator(3600)])),
        migrations.RunPython(inicializar, revertir),
    ]

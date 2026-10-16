"""Prueba opcional: manage.py test editor.browser_tests (requiere Chromium y Playwright)."""
import json
import tempfile
import unittest
from pathlib import Path

from django.contrib.auth import get_user_model
from django.contrib.staticfiles.testing import StaticLiveServerTestCase

from .models import Proyecto

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None


@unittest.skipUnless(sync_playwright, "Instala requirements-dev.txt para probar Chromium")
class EditorBrowserTests(StaticLiveServerTestCase):
    def test_elementos_y_fondos_en_chromium(self):
        user = get_user_model().objects.create_user("assets-test", password="Browser-test-123!")
        proyecto = Proyecto.objects.create(nombre="Recursos", propietario=user)
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 1000})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(self.live_server_url + f"/proyectos/{proyecto.pk}/")
            page.locator('[name="username"]').fill("assets-test")
            page.locator('[name="password"]').fill("Browser-test-123!")
            page.get_by_role("button", name="Entrar", exact=True).click()
            page.wait_for_selector("#add-text")

            page.locator("#elements-tool").click()
            element_choice = page.locator('[data-gallery="elementos"] .asset-choice').first
            element_path = element_choice.get_attribute("data-asset-path")
            element_choice.click()
            image = page.locator("#stage .image-object img")
            image.wait_for()
            self.assertGreater(image.evaluate("img => img.naturalWidth"), 0)
            saved_objects = json.loads(page.locator("#id_objetos").input_value())
            self.assertEqual(saved_objects[0]["tipo"], "imagen")
            self.assertEqual(saved_objects[0]["imagen"], element_path)

            page.locator("#background-tool").click()
            background_choice = page.locator('[data-gallery="fondos"] .asset-choice').first
            background_path = background_choice.get_attribute("data-asset-path")
            background_choice.click()
            self.assertEqual(page.locator("#id_fondo").input_value(), background_path)
            self.assertIn(background_path, page.locator("#stage").evaluate("el => el.style.backgroundImage"))

            page.locator("#save-status").get_by_text("Guardado automáticamente").wait_for()
            self.assertEqual(page.locator("#id_fondo").input_value(), background_path)
            self.assertEqual(json.loads(page.locator("#id_objetos").input_value())[0]["imagen"], element_path)
            self.assertGreater(page.locator("#stage .image-object img").evaluate("img => img.naturalWidth"), 0)

            page.locator("#clear-background").click()
            self.assertEqual(page.locator("#id_fondo").input_value(), "")
            self.assertEqual(page.locator("#stage").evaluate("el => el.style.backgroundImage"), "none")
            page.locator("#save-status").get_by_text("Guardado automáticamente").wait_for()
            self.assertEqual(page.locator("#id_fondo").input_value(), "")
            self.assertEqual(errors, [])
            browser.close()
        proyecto.refresh_from_db()
        self.assertEqual(proyecto.fondo, "")
        self.assertEqual(proyecto.objetos[0]["imagen"], element_path)

    def test_texto_arrastre_autoguardado_y_animacion_predefinida(self):
        user = get_user_model().objects.create_user("browser-test", password="Browser-test-123!")
        proyecto = Proyecto.objects.create(nombre="Animación", propietario=user)
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 1000})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(self.live_server_url + f"/proyectos/{proyecto.pk}/")
            page.locator('[name="username"]').fill("browser-test")
            page.locator('[name="password"]').fill("Browser-test-123!")
            page.get_by_role("button", name="Entrar", exact=True).click()
            page.wait_for_selector("#add-text")
            self.assertEqual(page.locator(".text-object").count(), 0)
            page.locator("#add-text").click()
            text = page.locator(".text-object textarea").first
            text.fill("Mi primera animación\nTexto independiente")
            text.press("Escape")
            page.locator("#font-size").fill("28")
            page.locator("#font-family").select_option("Arial")
            page.locator("#bold").click()
            page.locator("#font-color").fill("#ffff00")
            scene = lambda: json.loads(page.locator("#id_objetos").input_value())
            first_id = scene()[0]["id"]
            box = page.locator(".text-object").first
            rect = box.bounding_box()
            before = scene()[0]
            scale = page.locator("#stage").bounding_box()["width"] / 800
            page.mouse.move(rect["x"] + 20, rect["y"] + 20)
            page.mouse.down()
            page.mouse.move(rect["x"] + 20 - 100 * scale, rect["y"] + 20 - 60 * scale, steps=8)
            page.mouse.up()
            self.assertAlmostEqual(scene()[0]["x"], before["x"] - 100, delta=2)
            self.assertAlmostEqual(scene()[0]["y"], before["y"] - 60, delta=2)
            handle = box.locator(".resize-handle").bounding_box()
            page.mouse.move(handle["x"] + 7 * scale, handle["y"] + 7 * scale)
            page.mouse.down()
            page.mouse.move(handle["x"] + 67 * scale, handle["y"] + 47 * scale, steps=8)
            page.mouse.up()
            self.assertAlmostEqual(scene()[0]["ancho"], before["ancho"] + 60, delta=2)
            self.assertAlmostEqual(scene()[0]["alto"], before["alto"] + 40, delta=2)
            page.locator("#animation-tool").click()
            page.locator('[data-animation="subir"]').click()
            self.assertEqual(scene()[0]["animacion"], "subir")
            page.locator("#preview-animation").click()
            self.assertGreater(page.locator(".text-object").first.evaluate("el => el.getAnimations().length"), 0)
            page.locator("#text-tool").click()
            second = page.locator(".text-object textarea").last
            second.fill("Segundo cuadro")
            second.press("Escape")
            second_id = scene()[1]["id"]
            self.assertNotEqual(first_id, second_id)
            self.assertEqual(scene()[0]["tamano"], 28)
            self.assertEqual(scene()[1]["tamano"], 36)
            self.assertEqual(scene()[1]["animacion"], "ninguna")
            self.assertEqual(page.locator("#timeline-scroll").count(), 0)
            screenshot = Path(tempfile.gettempdir()) / "doit-cuadros.png"
            page.screenshot(path=str(screenshot))
            print(f"Captura: {screenshot}")
            expected = scene()
            page.locator("#save-status").get_by_text("Guardado automáticamente").wait_for()
            page.reload()
            page.wait_for_selector(".text-object")
            self.assertEqual(scene(), expected)
            # Doble clic, texto plano y salto de línea; sin ejecutar HTML.
            box = page.locator(f'.text-object[data-id="{second_id}"]')
            box.dblclick()
            self.assertFalse(box.locator("textarea").evaluate("el => el.readOnly"))
            box.locator("textarea").fill('<img src=x onerror=alert(1)>')
            self.assertEqual(page.locator("#stage img").count(), 0)
            box.locator("textarea").press("Escape")
            page.locator("#delete-text").click()
            self.assertEqual(len(scene()), 1)
            page.locator("#save-status").get_by_text("Guardado automáticamente").wait_for()
            self.assertEqual(len(scene()), 1)
            self.assertEqual(scene()[0]["id"], first_id)
            self.assertEqual(errors, [])
            browser.close()
        proyecto.refresh_from_db()
        self.assertEqual(proyecto.objetos, [expected[0]])

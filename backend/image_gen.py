from PIL import Image, ImageDraw
import uuid
import os

OUTPUT_DIR = "generated/images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_image(prompt: str) -> str:
    img = Image.new("RGB", (512, 512), "#020617")
    draw = ImageDraw.Draw(img)
    draw.text((20, 240), prompt[:60], fill="white")

    filename = f"{uuid.uuid4()}.png"
    path = os.path.join(OUTPUT_DIR, filename)
    img.save(path)

    return f"/images/{filename}"

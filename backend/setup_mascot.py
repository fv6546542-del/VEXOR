"""Generate the VEXOR mascot via Gemini Nano Banana (one-shot).

Run: `python setup_mascot.py`.
Saves to /app/frontend/public/mascot/vexor-mascot.png (used in Landing hero + empty states).
"""
import asyncio
import base64
import os
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv(Path(__file__).parent / ".env")

OUT_DIR = Path("/app/frontend/public/mascot")
OUT_DIR.mkdir(parents=True, exist_ok=True)

PROMPT = (
    "PNG with fully TRANSPARENT background, no scene, no floor, no ground shadow. "
    "Full-body digital mascot illustration of a stylized angular humanoid robot named VEXOR, "
    "sleek matte graphite armor, sharp geometric plating with clean bevels, glowing red visor (single horizontal slit, hot red #ff2b3a), "
    "small pulsing red core light on chest shaped like a stylized V, subtle red rim lighting on shoulders and knees, "
    "confident heroic stance, feet planted, one hand slightly forward like offering a fist bump, "
    "friendly readable silhouette (not scary), no weapons, no gore, no text, no logos, no watermark, "
    "cinematic soft key light from top-right, gaming/esports vibe, high-contrast dark tech aesthetic, "
    "ultra clean vector-inspired shading with soft glow, character centered with generous transparent margin, 1:1 aspect ratio. "
    "OUTPUT: PNG with alpha channel, character isolated on transparent, no black backdrop, no bounding box."
)


async def main():
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(api_key=api_key, session_id="vexor-mascot-v1", system_message="You are an expert product-mascot illustrator.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    text, images = await chat.send_message_multimodal_response(UserMessage(text=PROMPT))
    print(f"gemini text: {text[:80] if text else 'no text'}")
    if not images:
        raise SystemExit("no image returned")
    for idx, img in enumerate(images):
        target = OUT_DIR / ("vexor-mascot.png" if idx == 0 else f"vexor-mascot-alt-{idx}.png")
        raw_bytes = base64.b64decode(img["data"])
        target.write_bytes(raw_bytes)
        try:
            _post_process_transparent(target)
        except Exception as exc:  # noqa: BLE001
            print(f"warn: alpha post-process failed for {target}: {exc}")
        print(f"saved {target}")


def _post_process_transparent(path: Path, tolerance: int = 55) -> None:
    """Chroma-key the near-uniform corner background of a Gemini mascot to alpha."""
    from PIL import Image  # local import so the base script has no hard dep

    with Image.open(path) as im:
        rgba = im.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    corners = [pixels[0, 0], pixels[w - 1, 0], pixels[0, h - 1], pixels[w - 1, h - 1]]
    bg = tuple(sum(c[i] for c in corners) // len(corners) for i in range(3))

    def close(px, bg_rgb):
        return all(abs(px[i] - bg_rgb[i]) <= tolerance for i in range(3))

    # flood-fill from the four edges only so interior colors that happen to match are preserved
    stack = []
    visited = bytearray(w * h)
    for x in range(w):
        for y in (0, h - 1):
            stack.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            stack.append((x, y))
    while stack:
        x, y = stack.pop()
        idx = y * w + x
        if visited[idx]:
            continue
        visited[idx] = 1
        px = pixels[x, y]
        if not close(px, bg):
            continue
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx]:
                stack.append((nx, ny))
    rgba.save(path, "PNG")


if __name__ == "__main__":
    asyncio.run(main())

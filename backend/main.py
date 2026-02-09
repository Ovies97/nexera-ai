import os
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from schemas import AssetResponse, CommandRequest, CommandIntent
from ollama_client import query_ollama

app = FastAPI(title="NexEra AI")

# CORS: allow your frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.path.join("assets", "models")


def pick_model(description: str) -> str:
    q = (description or "").lower()
    if any(k in q for k in ["hard hat", "helmet", "hat"]):
        # use your actual filename here
        return "gold_rush_hard_hat_only_no_animation.glb"
    return "generic_object.glb"


@app.get("/model/{name}")
def get_model(name: str):
    """Serve GLB with explicit headers to prevent caching."""
    path = os.path.join(MODELS_DIR, name)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Model not found")

    return FileResponse(
        path,
        media_type="model/gltf-binary",
        headers={
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
        },
    )


@app.post("/generate-3D", response_model=AssetResponse)
async def generate_3d(
    prompt: str = Form(None),
    file: UploadFile = File(None),  # reserved for image pipeline later
):
    description = prompt or "training object"

    # Always use AI (your ollama_client retries forever)
    explanation = query_ollama(
        "Explain in simple training terms what this object is used for. "
        "Return 2-4 sentences max.\n\n"
        f"Object: {description}"
    )

    model_file = pick_model(description)

    return {
        "model_url": f"/model/{model_file}",
        "explanation": explanation,
    }


@app.post("/interpret-command", response_model=CommandIntent)
async def interpret_command(payload: CommandRequest):
    cmd = (payload.command or "").strip()
    if not cmd:
        raise HTTPException(status_code=400, detail="Command is required")

    prompt = f"""
You convert user commands into avatar behavior.

Return ONLY valid JSON with this exact shape:
{{
  "action": "walk|wave|point|pose|idle",
  "target": null,
  "steps": [],
  "explanation": "1-2 sentences for a learner",
  "meta": {{}}
}}

Rules:
- If user says walk/move/go -> action "walk" and target if present (e.g. "table")
- If user says wave/hello -> action "wave"
- If user says point -> action "point" and target if present
- If user says posture/stance -> action "pose"
- If unclear -> action "idle" and ask learner to clarify in explanation

User command: {cmd}
"""

    # Always use AI
    raw = query_ollama(prompt)

    # Parse JSON safely even if AI adds extra text
    try:
        data = json.loads(raw)
    except Exception:
        start = raw.find("{")
        end = raw.rfind("}")
        if start == -1 or end == -1:
            raise HTTPException(status_code=500, detail=f"AI did not return JSON: {raw[:200]}")
        data = json.loads(raw[start:end + 1])

    # Normalize required fields
    action = str(data.get("action", "idle")).lower()
    if action not in {"walk", "wave", "point", "pose", "idle"}:
        action = "idle"

    target = data.get("target", None)
    if target is not None:
        target = str(target)

    steps = data.get("steps", [])
    if not isinstance(steps, list):
        steps = []
    steps = [str(s).lower() for s in steps]

    explanation = str(data.get("explanation", "The avatar will perform the requested action."))
    meta = data.get("meta", {})
    if not isinstance(meta, dict):
        meta = {}

    return {
        "action": action,
        "target": target,
        "steps": steps,
        "explanation": explanation,
        "meta": meta,
    }

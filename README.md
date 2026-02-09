# nexera-aiai-3D-Avatar-training-project
What’s Included ✅ Prototype 1 — AI → 3D Learning Asset

User enters a text description (e.g. “yellow hard hat”)

AI generates an educational explanation

A relevant 3D model (GLB) is selected and displayed

Model is auto-scaled, positioned, and interactive

Suitable for training and learning modules

✅ Prototype 2 — Natural Language → Avatar Animation

User types commands like:

“Wave hello to the learner”

“Show the correct safety posture”

AI interprets the command into structured intent

Avatar plays the corresponding animation

AI provides a short explanation of the action

Tech Stack Frontend

Babylon.js

Vanilla JavaScript

HTML / CSS

Backend

Python

FastAPI

Uvicorn

AI

Ollama (local LLM)

Project Structure nexera-ai/ ├── backend/ │ ├── main.py │ ├── ollama_client.py │ ├── schemas.py │ ├── assets/ │ │ └── models/ │ │ ├── hard_hat.glb │ │ └── generic_object.glb │ └── requirements.txt │ ├── frontend/ │ ├── index.html │ ├── app.js │ ├── style.css │ └── assets/ │ └── avatar.glb │ └── README.md

Prerequisites Required

Python 3.10+

Node.js (for local frontend serving)

Ollama

Install Ollama

Download and install Ollama from: 👉 https://ollama.com

Pull a model (example):

ollama pull phi3:mini

Ensure Ollama is running:

ollama serve

Backend Setup

Navigate to the backend directory:

cd backend

Create a virtual environment (recommended):

python -m venv venv source venv/bin/activate # macOS/Linux venv\Scripts\activate # Windows

Install dependencies:

pip install -r requirements.txt

Start the backend server:

uvicorn main:app --reload --port 8000

Backend will be available at:

http://localhost:8000

Frontend Setup

Navigate to the frontend directory:

cd frontend

Serve the frontend (any simple server works):

Using Python:

python -m http.server 5173

Or using Node:

npx serve .

Open your browser:

http://localhost:5173

How to Use 3D Asset Pipeline

Type a description (e.g. “hard hat”)

Click Generate

View the 3D model

Read the AI-generated educational explanation

Rotate and inspect the model

Avatar Commands

Switch to the Avatar tab (or section)

Type a command such as:

“Wave hello”

“Show correct safety posture”

Watch the avatar animate

Read the AI explanation of the action

AI Logic (Ollama)

Ollama is used for:

Educational explanations

Natural language command interpretation

Prompts are intentionally constrained to:

Produce short, training-focused output

Return structured JSON for commands

This ensures deterministic and safe execution

Next Steps

Replace asset mapping with embedding-based search

Add text-to-3D or image-to-3D generation

Introduce spatial navigation for avatars

Build scenario-based simulations

Add analytics and learner feedback loops

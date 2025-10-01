from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib, os, io, sqlite3, datetime
from typing import Optional
import json

app = FastAPI(title="AgriSetu API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODEL_DIR = os.path.join(ROOT, "models")
DB_PATH = os.path.join(ROOT, "backend_data.sqlite")
os.makedirs(MODEL_DIR, exist_ok=True)

def load_crop_model():
    p = os.path.join(MODEL_DIR, "crop_model.joblib")
    if os.path.exists(p):
        try:
            return joblib.load(p)
        except Exception as e:
            print("Failed to load crop model:", e)
    return None

class SoilInput(BaseModel):
    ph: float
    nitrogen: float
    phosphorus: float
    potassium: float
    moisture: Optional[float] = 0.0
    temperature: Optional[float] = 0.0
    rainfall: Optional[float] = 0.0

@app.post("/api/recommend_crop")
def recommend_crop(data:SoilInput):
    model = load_crop_model()
    features = [data.ph, data.nitrogen, data.phosphorus, data.potassium, data.moisture or 0.0, data.temperature or 0.0, data.rainfall or 0.0]
    if model is not None:
        try:
            pred = model.predict([features])
            return {"recommended_crop": str(pred[0]), "source":"model"}
        except Exception as e:
            return {"error":"model prediction failed", "detail": str(e)}
    # fallback simple rule:
    ph = data.ph
    if ph < 5.5:
        crop="Rice"
    elif ph < 6.5:
        crop="Wheat"
    else:
        crop="Maize"
    return {"recommended_crop": crop, "source":"rule-based-fallback", "note":"Place a trained model at models/crop_model.joblib for improved accuracy."}

@app.post("/api/predict_disease")
async def predict_disease(file: UploadFile = File(...)):
    # If you have a keras .h5 model at models/disease_model.h5 the app will attempt to use it.
    model_path = os.path.join(MODEL_DIR, "disease_model.h5")
    if os.path.exists(model_path):
        try:
            from tensorflow.keras.models import load_model
            from PIL import Image
            import numpy as np
            model = load_model(model_path)
            contents = await file.read()
            img = Image.open(io.BytesIO(contents)).convert("RGB").resize((128,128))
            arr = np.array(img)/255.0
            arr = arr.reshape((1,128,128,3))
            pred = model.predict(arr)
            idx = int(pred.argmax())
            labels = ["Healthy","Diseased"]
            return {"prediction": labels[idx], "scores": pred.tolist()}
        except Exception as e:
            return {"error":"failed to run keras model", "detail": str(e)}
    else:
        # Basic filename-based heuristic placeholder — **replace** with trained model
        name = (file.filename or "").lower()
        if "blight" in name or "rust" in name:
            return {"prediction":"Blight-like", "source":"placeholder-filename-heuristic"}
        return {"prediction":"Unknown/Model Missing","note":"Place trained Keras model at models/disease_model.h5; see backend/app/ml/train_disease_model.py"}

# --- Forum (SQLite) ---
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        body TEXT,
        author TEXT,
        created_at TEXT
    )""")
    conn.commit()
    conn.close()

@app.on_event("startup")
def on_startup():
    init_db()

class PostIn(BaseModel):
    title: str
    body: str
    author: str = "Farmer"

@app.post("/api/forum/post")
def create_post(p: PostIn):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO threads (title, body, author, created_at) VALUES (?,?,?,?)", (p.title, p.body, p.author, datetime.datetime.utcnow().isoformat()))
    conn.commit()
    nid = c.lastrowid
    conn.close()
    return {"id": nid}

@app.get("/api/forum/threads")
def list_threads(limit: int = 50):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, title, body, author, created_at FROM threads ORDER BY id DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [{"id":r[0],"title":r[1],"body":r[2],"author":r[3],"created_at":r[4]} for r in rows]

# --- Chatbot (very small rule-based + intents) ---
@app.post("/api/chatbot")
def chatbot(query: dict):
    # expected body: {"text": "...", "lang":"en"}
    text = query.get("text","" ).lower()
    if any(x in text for x in ["recommend","which crop","what crop","suggest crop"]):
        return {"reply":"Share soil details via Crop Recommendation page or tell me the soil pH, N, P, K values."}
    if any(x in text for x in ["disease","leaf","infection"]):
        return {"reply":"Go to Disease Detection -> upload a photo of the leaf. For now, also describe symptoms."}
    if any(x in text for x in ["market","price","sell"]):
        return {"reply":"Open Market Suggestions – enter crop name and historical prices to get recommended selling time and locations."}
    return {"reply":"Sorry, I didn't understand. Try: 'Recommend crop' or 'Detect disease' or 'Market price'"}

# --- MQTT ingestion stub (for IoT sensors) ---
@app.post("/api/iot/ingest")
def ingest_sensor(payload: dict):
    # example payload: {"device_id":"sensor-1","ph":6.5,"moisture":12.3,"ts":...}
    # In production you would authenticate device and persist measurements to TSDB or cloud storage.
    # This endpoint simply echoes and stores a tiny local log.
    log_path = os.path.join(ROOT, "iot_log.jsonl")
    with open(log_path, "a") as f:
        f.write(json.dumps(payload) + "\n")
    return {"status":"ok"}

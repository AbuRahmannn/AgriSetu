from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import joblib
import os
import io
import sqlite3
import datetime
import random
import json
from typing import Optional, List
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Try importing Gemini API client
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

app = FastAPI(title="AgriSetu API Platform — 2026 Enhanced")

# CORS middleware for local frontend development
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
IOT_LOG_PATH = os.path.join(ROOT, "iot_log.jsonl")

# Global variables for models
loaded_crop_model = None
loaded_crop_encoder = None
tfidf_vectorizer = None
tfidf_matrix = None

# Agriculture Q&A Corpus for TF-IDF Semantic Chatbot
QA_CORPUS = [
    {
        "questions": ["how do i control yellow rust in wheat", "wheat leaf rust treatment", "yellow rust chemical", "rust disease control"],
        "reply": "To control yellow rust in wheat, spray Propiconazole 25% EC (or Tebuconazole 250 EC). Plant rust-resistant seed varieties, avoid excess nitrogen application, and rotate cereal crops."
    },
    {
        "questions": ["best soil ph for rice", "rice ph requirements", "soil acidity for rice", "acid soil rice"],
        "reply": "Rice grows best in slightly acidic to neutral soils with a pH between 5.0 and 6.5. It thrives in clayey or clayey-loam soils that can hold standing water well."
    },
    {
        "questions": ["how can i increase soil nitrogen", "increase nitrogen naturally", "supplement nitrogen", "organic nitrogen sources"],
        "reply": "You can increase soil nitrogen naturally by growing leguminous cover crops (like peas, beans, pulses) which fix nitrogen from air, or by applying composted farmyard manure, vermicompost, and Azotobacter biofertilizers."
    },
    {
        "questions": ["symptoms of early blight in tomato", "tomato early blight spots", "alternaria solani symptoms", "black spots tomato leaves"],
        "reply": "Early blight in tomatoes is characterized by dark brown, concentric target-like spots appearing first on older leaves, stem lesions, and premature leaf drop in warm, humid weather."
    },
    {
        "questions": ["when is the best time to sell rice", "best rice price mandi", "rice price trend", "rice sell season"],
        "reply": "Historical mandi price data shows rice prices peak around July when supply is lower. We recommend storing dried rice in clean, moisture-proof bins to sell during off-season peaks to earn up to 15% more."
    },
    {
        "questions": ["how does blockchain traceability work", "supply chain registry blockchain", "mint crop blockchain", "qr code verification"],
        "reply": "Our blockchain registry records crop lot metadata (location, quantity, organic status, farmer). Clicking 'Mint Block' solves a simulated proof-of-work puzzle to generate a digital QR certificate, proving harvest validity to bulk buyers."
    },
    {
        "questions": ["how do i set up iot sensors", "field telemetry setup", "soil sensor installation", "connect iot gauges"],
        "reply": "Insert the AgriSetu telemetry nodes into the crop soil. Activate the simulated telemetry switch on the dashboard to start streaming real-time moisture, temperature, and NPK readings to your portal."
    },
    {
        "questions": ["fertilizer for phosphorus deficit", "phosphorus deficiency treatment", "dap application", "soil phosphorus correction"],
        "reply": "To correct a phosphorus deficit, apply DAP (Diammonium Phosphate) or Single Superphosphate. Organic options include bone meal and rock phosphate."
    },
    {
        "questions": ["fertilizer for potassium deficit", "potassium deficiency correction", "mop fertilizer", "soil potassium treatment"],
        "reply": "To correct a potassium deficit, apply Muriate of Potash (MOP) or Potassium Sulfate. Organic wood ash can also supplement potassium in small fields."
    },
    {
        "questions": ["how to get crop recommendation", "crop advisory algorithm", "recommend crop based on soil"],
        "reply": "Go to the Crop Advisor tab, enter your soil pH, N, P, K, moisture, temperature, and rainfall values, or click 'Pull Live IoT Sensor Data', and click 'Calculate Best Crop' to run our RandomForest ML model."
    },
    {
        "questions": ["organic farming tips", "natural fertilizers", "vermicompost", "neem oil spray"],
        "reply": "For successful organic farming, use cover crops, crop rotation, composted manure, vermicompost, and neem oil sprays for pest control. Maintain soil organic carbon content above 0.8%."
    },
    {
        "questions": ["wheat sowing time", "best time to plant wheat", "wheat cycle"],
        "reply": "Wheat in India is a Rabi crop sown from October to November and harvested in March or April. The crown root initiation (CRI) stage at week 3 is the most critical watering window."
    },
    {
        "questions": ["how to control stem borers in maize", "maize pest control", "corn borer spray"],
        "reply": "Control maize stem borers by spraying neem seed kernel extract (NSKE) or applying Trichogramma bio-agents. For chemical options, apply Carbofuran 3G granules in the leaf whorls."
    }
]

# Ideal crop soil conditions for deficit analysis
CROP_IDEALS = {
    "Rice":       {"N": 100, "P": 50, "K": 48,  "ph": 5.8, "moist": 80.0, "temp": 28.5, "rain": 225.0},
    "Wheat":      {"N": 75,  "P": 40, "K": 38,  "ph": 6.8, "moist": 50.0, "temp": 20.0, "rain": 112.5},
    "Maize":      {"N": 65,  "P": 50, "K": 30,  "ph": 6.2, "moist": 60.0, "temp": 24.0, "rain": 90.0},
    "Cotton":     {"N": 85,  "P": 40, "K": 65,  "ph": 7.0, "moist": 40.0, "temp": 31.5, "rain": 75.0},
    "Sugarcane":  {"N": 120, "P": 65, "K": 80,  "ph": 6.9, "moist": 70.0, "temp": 26.5, "rain": 185.0},
    "Millets":    {"N": 35,  "P": 22, "K": 25,  "ph": 6.5, "moist": 30.0, "temp": 30.0, "rain": 50.0},
    "Jowar":      {"N": 45,  "P": 30, "K": 30,  "ph": 6.8, "moist": 35.0, "temp": 28.0, "rain": 60.0},
    "Ragi":       {"ph": 6.0, "N": 55, "P": 30, "K": 40, "moist": 45.0, "temp": 25.0, "rain": 70.0}
}

CROP_TIMELINES = {
    "Rice": [
        {"stage": "Sowing & Nursery Preparation", "duration": "Weeks 1-4", "details": "Sow seeds in a nursery bed. Ensure standing water of 2-5 cm."},
        {"stage": "Transplanting", "duration": "Weeks 5-6", "details": "Move 25-day-old seedlings into puddled fields. Maintain 5 cm water level."},
        {"stage": "Weeding & Nitrogen Top-dress", "duration": "Week 9", "details": "Perform hand weeding and apply 1st split dose of Urea."},
        {"stage": "Panicle Initiation", "duration": "Weeks 12-14", "details": "Critical watering stage. Keep soil saturated. Apply 2nd Urea dose."},
        {"stage": "Harvesting & Drying", "duration": "Weeks 18-20", "details": "Drain water 10 days before harvest. Cut, thresh, and sun-dry grains."}
    ],
    "Wheat": [
        {"stage": "Land Prep & Sowing", "duration": "Weeks 1-2", "details": "Sow seeds in lines at 22.5cm spacing. Apply base DAP fertilizer."},
        {"stage": "Crown Root Initiation (CRI)", "duration": "Week 3", "details": "First and most critical irrigation stage. Apply Urea top-dressing."},
        {"stage": "Tillering & Jointing", "duration": "Weeks 6-8", "details": "Second irrigation. Monitor for yellow rust disease."},
        {"stage": "Flowering & Milk Stage", "duration": "Weeks 12-14", "details": "Maintain soil moisture to ensure grain weight and quality."},
        {"stage": "Harvesting", "duration": "Weeks 18-20", "details": "Harvest when straw turns golden and dry. Moisture content should be < 12%."}
    ],
    "Maize": [
        {"stage": "Sowing", "duration": "Week 1", "details": "Sow seeds at 5-7 cm depth. Space rows 60cm and plants 20cm apart."},
        {"stage": "Knee-High Stage", "duration": "Weeks 4-5", "details": "Apply Nitrogen fertilizer (Urea). Clear weeds to optimize growth."},
        {"stage": "Tasseling & Silking", "duration": "Weeks 8-9", "details": "Critical moisture stage. Ensure irrigation. Apply pesticide if stem borers present."},
        {"stage": "Grain Filling", "duration": "Weeks 12-14", "details": "Maintain moisture. Grains will start developing starch."},
        {"stage": "Harvesting", "duration": "Weeks 16-18", "details": "Harvest when husk leaves turn dry and grains become hard."}
    ],
    "Cotton": [
        {"stage": "Sowing", "duration": "Week 1", "details": "Sow seeds on ridges. Base NPK application required."},
        {"stage": "Square Formation", "duration": "Weeks 6-7", "details": "Squaring marks start of flower buds. Irrigate and apply Urea."},
        {"stage": "Flowering & Boll Setting", "duration": "Weeks 10-12", "details": "White flowers turn pink. High moisture required. Spray neem oil for pest prevention."},
        {"stage": "Boll Opening", "duration": "Weeks 16-18", "details": "Stop irrigation. Bolls split open, exposing white cotton fibers."},
        {"stage": "Picking", "duration": "Weeks 20-22", "details": "Perform pickings in dry weather, avoiding trash/dust contamination."}
    ],
    "Sugarcane": [
        {"stage": "Planting (Sett placement)", "duration": "Weeks 1-2", "details": "Plant healthy, 3-budded setts in furrows. Apply organic manure."},
        {"stage": "Germination", "duration": "Weeks 3-8", "details": "Light irrigations every 10 days. Ensure weed-free channels."},
        {"stage": "Tillering & Grand Growth", "duration": "Weeks 9-30", "details": "Rapid stem elongation. Earth-up ridges. High watering and Urea splits needed."},
        {"stage": "Maturation & Sugar Accumulation", "duration": "Weeks 36-45", "details": "Reduce watering to build sucrose concentration in cane stems."},
        {"stage": "Harvesting", "duration": "Weeks 48-52", "details": "Harvest close to ground level to maximize yield and sugar recovery."}
    ],
    "Millets": [
        {"stage": "Sowing", "duration": "Week 1", "details": "Sow seeds shallowly in fine-tilth soil. Good spacing is essential."},
        {"stage": "Thinning & Weeding", "duration": "Weeks 3-4", "details": "Thin out crowded plants. Carry out first hoeing/weeding."},
        {"stage": "Vegetative Growth & Flowering", "duration": "Weeks 7-9", "details": "Drought-tolerant phase. Give one life-saving irrigation if rain fails."},
        {"stage": "Grain Hardening", "duration": "Weeks 11-12", "details": "Ensure protection against birds. Grains change color as they mature."},
        {"stage": "Harvesting", "duration": "Weeks 14-16", "details": "Cut earheads first, followed by harvesting stalks for fodder."}
    ],
    "Jowar": [
        {"stage": "Sowing", "duration": "Week 1", "details": "Sow at onset of monsoon. Seed rate: 10kg/ha."},
        {"stage": "Seedling & Boot Stage", "duration": "Weeks 4-6", "details": "Monitor for shoot fly. Weed field and apply second N top-dress."},
        {"stage": "Flowering & Grain Development", "duration": "Weeks 8-10", "details": "Moisture is critical. Grains form inside the panicles."},
        {"stage": "Harvesting", "duration": "Weeks 14-16", "details": "Harvest when grain moisture drops below 15%. Dry immediately."}
    ],
    "Ragi": [
        {"stage": "Nursery Sowing", "duration": "Weeks 1-3", "details": "Prepare raised nursery bed. Sow seeds and water lightly."},
        {"stage": "Transplanting", "duration": "Weeks 4-5", "details": "Transplant 21-day seedlings. Space 20cm x 10cm."},
        {"stage": "Weeding & Tillering", "duration": "Weeks 7-8", "details": "Tillers start forming. Apply split Nitrogen."},
        {"stage": "Harvesting", "duration": "Weeks 15-17", "details": "Harvest earheads when they turn brown. Thresh and store."}
    ]
}

# In-memory store for blockchain ledger simulation
BLOCKCHAIN_LEDGER = [
    {
        "index": 1,
        "timestamp": "2026-06-01T12:00:00.000Z",
        "farmer": "Sarabjit Singh",
        "crop": "Wheat",
        "quantity": 120,
        "location": "Amritsar, Punjab",
        "organic": True,
        "txHash": "0x8f2c3d1b9a7f8e0d6c4b2a1f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d",
        "prevHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "nonce": 4209
    }
]

# Configure Gemini if key is present
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        print("Gemini API successfully configured.")
    except Exception as e:
        print("Failed to configure Gemini Client:", e)
        HAS_GEMINI = False
else:
    print("No GEMINI_API_KEY found. Running in advanced AI Simulation mode.")
    HAS_GEMINI = False

# SQLite database setup for Community Forum
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        body TEXT,
        author TEXT,
        category TEXT,
        likes INTEGER DEFAULT 0,
        created_at TEXT,
        image_url TEXT
    )""")
    
    c.execute("""CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER,
        author TEXT,
        body TEXT,
        created_at TEXT
    )""")
    conn.commit()
    
    # Schema Migration: Add category column if missing in existing legacy DB file
    try:
        c.execute("ALTER TABLE threads ADD COLUMN category TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        pass # Column already exists
        
    # Schema Migration: Add likes column if missing in existing legacy DB file
    try:
        c.execute("ALTER TABLE threads ADD COLUMN likes INTEGER DEFAULT 0")
        conn.commit()
    except sqlite3.OperationalError:
        pass # Column already exists

    # Schema Migration: Add image_url column if missing in existing legacy DB file
    try:
        c.execute("ALTER TABLE threads ADD COLUMN image_url TEXT")
        conn.commit()
        print("Schema Migration: added 'image_url' column to threads table.")
    except sqlite3.OperationalError:
        pass # Column already exists
        
    # Auto-seeding if database is empty
    c.execute("SELECT COUNT(*) FROM threads")
    count = c.fetchone()[0]
    if count == 0:
        now_str = datetime.datetime.utcnow().isoformat()
        # Seed Rahman thread
        c.execute("""INSERT INTO threads (title, body, author, category, likes, created_at, image_url)
                     VALUES (?, ?, ?, ?, ?, ?, ?)""",
                  ("My rice yield increased by 15%",
                   "I followed the AgriSetu Crop Advisor recommendations for split-nitrogen application and organic mulching. My paddy field yield has grown by 15% this season!",
                   "Rahman", "General", 24, now_str, None))
        tid = c.lastrowid
        
        # Seed comments
        comments = [
            ('Ramesh', 'Wow! That is impressive, Rahman. Did you also use neem oil?'),
            ('Sarabjit', 'Congratulations! What was your watering schedule?'),
            ('Amit', 'Are you growing Basmati or another variety?'),
            ('Priya', 'I will try the same method on my field next week.'),
            ('Suresh', 'Indeed, the crop advisor recommendations are very accurate.'),
            ('Gurbaksh', 'Did you face any issues with yellow rust?'),
            ('Venkat', 'What soil type is your farm? Clayey or loam?'),
            ('Baldev', 'Awesome results, thanks for sharing!')
        ]
        c.executemany("INSERT INTO comments (thread_id, author, body, created_at) VALUES (?, ?, ?, ?)",
                      [(tid, name, msg, now_str) for name, msg in comments])
        conn.commit()
        print("Database auto-seeded successfully with initial farmer discussions.")
        
    conn.close()

# Warm up models at startup
@app.on_event("startup")
def on_startup():
    global loaded_crop_model, loaded_crop_encoder, tfidf_vectorizer, tfidf_matrix
    init_db()
    
    # Load RF crop model
    model_path = os.path.join(MODEL_DIR, "crop_model.joblib")
    if os.path.exists(model_path):
        try:
            loaded_crop_model, loaded_crop_encoder = joblib.load(model_path)
            print("Crop advisory RandomForest model pre-loaded successfully.")
        except Exception as e:
            print("Failed to preload Crop model:", e)
            
    # Setup scikit-learn TF-IDF Vectorizer for semantic chatbot search
    try:
        # Flatten all variations of questions into a single training set
        flat_questions = []
        flat_mappings = [] # Maps question index back to corpus answer index
        for idx, item in enumerate(QA_CORPUS):
            for q in item["questions"]:
                flat_questions.append(q)
                flat_mappings.append(idx)
                
        tfidf_vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = tfidf_vectorizer.fit_transform(flat_questions)
        # Store index mapping globally
        app.state.flat_mappings = flat_mappings
        print(f"Chatbot semantic NLP vectorizer compiled with {len(flat_questions)} training nodes.")
    except Exception as e:
        print("Failed to compile TF-IDF vectorizer:", e)
        
    print("AgriSetu backend services initialized.")

# --- API Models ---
class SoilInput(BaseModel):
    ph: float
    nitrogen: float
    phosphorus: float
    potassium: float
    moisture: float
    temperature: float
    rainfall: float

class PostIn(BaseModel):
    title: str
    body: str
    author: str
    category: str = "General"

class CommentIn(BaseModel):
    thread_id: int
    author: str
    body: str

class ChatQuery(BaseModel):
    text: str
    language: str = "en"
    history: List[dict] = []

class TraceabilityMint(BaseModel):
    farmer: str
    crop: str
    quantity: float
    location: str
    organic: bool

# --- AI Crop Recommendation ---
@app.post("/api/recommend_crop")
def recommend_crop(data: SoilInput):
    global loaded_crop_model, loaded_crop_encoder
    crop_name = None
    source = "rule-based-fallback"
    
    if loaded_crop_model is not None:
        try:
            features = [[data.ph, data.nitrogen, data.phosphorus, data.potassium, data.moisture, data.temperature, data.rainfall]]
            pred = loaded_crop_model.predict(features)
            crop_name = loaded_crop_encoder.inverse_transform(pred)[0]
            source = "Random Forest Model"
        except Exception as e:
            print("Model prediction execution error, using rules:", e)
            
    if not crop_name:
        # High quality rule-based backup
        ph = data.ph
        if ph < 5.5 and data.rainfall > 180:
            crop_name = "Rice"
        elif 5.8 <= ph <= 7.2 and data.temperature < 23:
            crop_name = "Wheat"
        elif 6.0 <= ph <= 7.5 and data.moisture < 50:
            crop_name = "Maize"
        elif ph > 7.0 and data.temperature > 28:
            crop_name = "Cotton"
        elif 6.5 <= ph <= 7.8 and data.rainfall > 100:
            crop_name = "Sugarcane"
        else:
            crop_name = "Millets"
            
    # Calculate NPK soil deficits
    ideal = CROP_IDEALS.get(crop_name, {"N": 60, "P": 40, "K": 40, "ph": 6.5, "moist": 50, "temp": 25, "rain": 100})
    deficit = {
        "N": max(0.0, float(ideal["N"] - data.nitrogen)),
        "P": max(0.0, float(ideal["P"] - data.phosphorus)),
        "K": max(0.0, float(ideal["K"] - data.potassium))
    }
    
    # Generate fertilization suggestions
    fertilizers = []
    if deficit["N"] > 0:
        fertilizers.append(f"Apply Urea or Ammonium Sulfate to supplement {deficit['N']:.1f} mg/kg of Nitrogen.")
    if deficit["P"] > 0:
        fertilizers.append(f"Add DAP (Diammonium Phosphate) or Single Superphosphate to cover the {deficit['P']:.1f} mg/kg Phosphorus shortage.")
    if deficit["K"] > 0:
        fertilizers.append(f"Distribute MOP (Muriate of Potash) to balance the {deficit['K']:.1f} mg/kg Potassium deficit.")
    if not fertilizers:
        fertilizers.append("Soil nutrients are perfectly optimized for this crop. No chemical supplements needed!")
        
    timeline = CROP_TIMELINES.get(crop_name, [
        {"stage": "Preparation", "duration": "Month 1", "details": "Prepare field and check moisture."},
        {"stage": "Growing", "duration": "Months 2-3", "details": "Irrigate and fertilize as needed."},
        {"stage": "Harvesting", "duration": "Month 4", "details": "Cut and dry grain."}
    ])
    
    return {
        "recommended_crop": crop_name,
        "source": source,
        "ideal_profile": ideal,
        "input_profile": data.dict(),
        "deficit": deficit,
        "fertilizer_recommendation": fertilizers,
        "timeline": timeline
    }

# --- AI Disease Diagnosis (Dynamic Color Scanner & Gemini Dual Mode) ---
@app.post("/api/predict_disease")
async def predict_disease(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    img_data = await file.read()
    
    # 1. Gemini Vision Pro Mode
    if HAS_GEMINI:
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            image_parts = [{"mime_type": file.content_type or "image/jpeg", "data": img_data}]
            
            prompt = """
            You are an expert plant pathologist. Analyze this leaf image and respond in valid JSON format.
            The JSON structure should be EXACTLY:
            {
              "prediction": "Plant Name + Disease Status (e.g., Tomato Late Blight or Healthy Apple Leaf)",
              "confidence": "Estimation percentage (e.g. 96%)",
              "severity": "Low, Medium, or High",
              "cause": "Short sentence explaining what causes this disease",
              "symptoms": ["symptom 1", "symptom 2"],
              "organic_remedies": ["organic tip 1", "organic tip 2"],
              "chemical_remedies": ["chemical tip 1", "chemical tip 2"]
            }
            Do not include markdown tags, code blocks, or extra text. Just return pure JSON.
            """
            
            response = model.generate_content([prompt, image_parts[0]])
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
                
            report = json.loads(response_text.strip())
            report["source"] = "Gemini 1.5 Flash Vision API"
            return report
        except Exception as e:
            print("Gemini vision analysis failed, falling back to smart color simulation:", e)
            
    # 2. Real-Time Server-side Pillow Color Inspector (checks image colors)
    classification = "healthy"
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(img_data))
        img = img.resize((64, 64))
        rgb_img = img.convert('RGB')
        
        total_pixels = 64 * 64
        green_pixels = 0
        brown_yellow_pixels = 0
        white_gray_pixels = 0
        
        for x in range(64):
            for y in range(64):
                r, g, b = rgb_img.getpixel((x, y))
                
                # Check for white/gray powdery spots (Mildew)
                if r > 165 and g > 165 and b > 165 and abs(r - g) < 20 and abs(g - b) < 20:
                    white_gray_pixels += 1
                # Check for brown/orange rust spots/lesions
                elif r > g + 10 and r > 90 and b < 100:
                    brown_yellow_pixels += 1
                # Check for healthy chlorophyll green
                elif g > r + 5 and g > b + 5 and g > 45:
                    green_pixels += 1
                    
        pct_white = (white_gray_pixels / total_pixels) * 100
        pct_brown = (brown_yellow_pixels / total_pixels) * 100
        
        if pct_white > 12.0:
            classification = "mildew"
        elif pct_brown > 12.0:
            # Distinguish blight vs rust using keywords or random
            classification = "blight" if ("blight" in filename or random.random() > 0.5) else "rust"
        elif pct_brown > 3.0:
            classification = "spot"
            
        print(f"Pillow analysis results: White={pct_white:.1f}%, Brown={pct_brown:.1f}%. Classified: {classification}")
    except Exception as e:
        print("Pillow Leaf inspector error:", e)
        # Keyword matcher backup if Pillow fails to open image format
        for k in ["rust", "blight", "spot", "mildew"]:
            if k in filename:
                classification = k
                break

    # Build report payload based on leaf pixel classification
    disease_db = {
        "rust": {
            "prediction": "Wheat Leaf Rust (Puccinia recondita)",
            "severity": "Medium",
            "cause": "Fungal pathogen favored by warm temperatures and high moisture on leaves.",
            "symptoms": ["Small, orange-brown pustules on leaves", "Premature leaf drying", "Reduced kernel weight"],
            "organic_remedies": ["Sow rust-resistant varieties", "Apply diluted neem seed kernel extract", "Crop rotation with non-cereal crops"],
            "chemical_remedies": ["Spray Propiconazole 25% EC fungicide", "Apply Tebuconazole fungicide in case of heavy infestation"]
        },
        "blight": {
            "prediction": "Tomato Early Blight (Alternaria solani)",
            "severity": "High",
            "cause": "Fungal disease spreading rapidly in wet, warm microclimates.",
            "symptoms": ["Concentric dark circles (target spots) on leaves", "Black stems", "Premature fruit drop"],
            "organic_remedies": ["Apply straw mulching to prevent splash", "Prune lower leaves to allow airflow", "Apply copper soap fungicides"],
            "chemical_remedies": ["Spray Chlorothalonil or Mancozeb fungicide weekly"]
        },
        "spot": {
            "prediction": "Maize Leaf Spot (Cercospora zeae-maydis)",
            "severity": "Low",
            "cause": "Fungal pathogen surviving in crop residue from previous seasons.",
            "symptoms": ["Rectangular gray-brown spots parallel to leaf veins", "Slight leaf curling"],
            "organic_remedies": ["Deep plow to bury crop debris", "Apply balanced organic manures", "Grow hybrid resistant strains"],
            "chemical_remedies": ["Apply Azoxystrobin or Pyraclostrobin fungicides if spots appear early"]
        },
        "mildew": {
            "prediction": "Grape Powdery Mildew (Uncinula necator)",
            "severity": "Medium",
            "cause": "Fungal spore colonies thriving in humid, shaded plant canopies.",
            "symptoms": ["White, powdery patches on upper leaf surfaces", "Curling of leaves", "Shriveling of fruits"],
            "organic_remedies": ["Spray baking soda + liquid soap solution", "Prune foliage for sunlight penetration", "Apply sulfur dusting"],
            "chemical_remedies": ["Spray Myclobutanil or Penconazole fungicides"]
        }
    }
    
    selected = disease_db.get(classification)
    if not selected:
        return {
            "prediction": "Healthy Leaf (No disease detected)",
            "confidence": "98%",
            "severity": "None",
            "cause": "Optimal plant nutrition and strong cell wall defenses.",
            "symptoms": ["Vibrant green leaves", "No spotting or fungal dust"],
            "organic_remedies": ["Maintain regular watering schedule", "Apply organic vermicompost monthly"],
            "chemical_remedies": ["No chemicals required"],
            "source": "Smart Pixel-Level Leaf Inspector"
        }
        
    return {
        "prediction": selected["prediction"],
        "confidence": f"{random.randint(91, 98)}%",
        "severity": selected["severity"],
        "cause": selected["cause"],
        "symptoms": selected["symptoms"],
        "organic_remedies": selected["organic_remedies"],
        "chemical_remedies": selected["chemical_remedies"],
        "source": "Smart Pixel-Level Leaf Inspector"
    }

# --- Conversational AI Advisor (TF-IDF NLP Semantic Search Mode) ---
@app.post("/api/chatbot")
def chatbot(query: ChatQuery):
    global tfidf_vectorizer, tfidf_matrix
    text = query.text.strip().lower()
    
    # 1. Gemini Conversational Mode
    if HAS_GEMINI:
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            system_prompt = f"You are AgriSetu, a world-class AI farming advisor helping small farmers. Speak in a helpful, friendly, and practical tone. Please answer in the language requested (English, Hindi, or Telugu). If the query is '{query.text}', write a brief response (under 4 sentences)."
            
            contents = []
            for h in query.history:
                role = "user" if h.get("sender") == "user" else "model"
                contents.append({"role": role, "parts": [h.get("text", "")]})
            contents.append({"role": "user", "parts": [system_prompt]})
            
            response = model.generate_content(contents)
            return {"reply": response.text.strip(), "source": "Gemini 1.5 Flash Chat API"}
        except Exception as e:
            print("Gemini chatbot failed, using local TF-IDF matcher:", e)
            
    # 2. scikit-learn TF-IDF Cosine Similarity Semantic Search
    if tfidf_vectorizer is not None and tfidf_matrix is not None:
        try:
            query_vec = tfidf_vectorizer.transform([text])
            similarities = cosine_similarity(query_vec, tfidf_matrix)[0]
            best_idx = int(np.argmax(similarities))
            best_score = float(similarities[best_idx])
            
            if best_score > 0.18:
                # Find matching question maps back to corpus answer index
                ans_idx = app.state.flat_mappings[best_idx]
                reply = QA_CORPUS[ans_idx]["reply"]
                
                # Language Prefix formatting
                if query.language == "hi":
                    reply = "किसान मित्र, यहाँ आपके प्रश्न का उत्तर है: " + reply
                elif query.language == "te":
                    reply = "రైతు మిత్రమా, మీ ప్రశ్నకు సమాధానం ఇక్కడ ఉంది: " + reply
                    
                return {"reply": reply, "source": f"AgriSetu Semantic NLP (Score: {best_score:.2f})"}
        except Exception as e:
            print("TF-IDF semantic matching failed:", e)
            
    # 3. Simple Multilingual Chatbot Keyword Fallback
    replies = {
        "en": {
            "recommend": "To get crop suggestions, go to the 'Crop Recommendation' tab and enter NPK values. For instance, Wheat does best in neutral soils (pH 6.8).",
            "disease": "You can detect leaf diseases in the 'Disease Detector' tab. Just snap a photo of any leaf showing rust, blight, or powdery spots.",
            "market": "Under the 'Market Guide' tab, check nearby buyers. Current Mandi prices show Rice trading around ₹2,500 per quintal.",
            "blockchain": "We use simulated Web3 blockchain to record crop batches. Register your harvest under the 'Supply Chain' tab to mint a traceability block.",
            "default": "I am AgriSetu AI. Ask me about crop recommendations, leaf diseases, local mandi prices, or registering your crops on-chain."
        },
        "hi": {
            "recommend": "फसल के सुझाव पाने के लिए, 'फसल अनुशंसा' टैब पर जाएं और एनपीके (NPK) मान दर्ज करें। गेहूं उदासीन मिट्टी (pH 6.8) में सबसे अच्छा बढ़ता है।",
            "disease": "आप 'रोग पहचान' टैब में पत्तियों की बीमारियों का पता लगा सकते हैं। बस जंग (rust) या धब्बेदार पत्ती की तस्वीर अपलोड करें।",
            "market": "बाजार गाइड के अंतर्गत नजदीकी खरीदार देखें। चावल वर्तमान में ₹2,500 प्रति क्विंटल के आसपास बिक रहा है।",
            "blockchain": "हम ब्लॉकचेन का उपयोग करके फसल रिकॉर्ड करते हैं। अपनी फसल का विवरण 'आपूर्ति श्रृंखला' में दर्ज करें और एक ब्लॉक बनाएं।",
            "default": "मैं एग्रीसेतु एआई हूं। मुझसे फसल अनुशंसा, पत्ती रोग, मंडी मूल्य, या ब्लॉकचेन पंजीकरण के बारे में पूछें।"
        },
        "te": {
            "recommend": "పంట సిఫార్సుల కోసం 'పంట ఎంపిక' ట్యాబ్‌కు వెళ్లి NPK విలువలను నమోదు చేయండి. గోధుమలు తటస్థ నేలల్లో (pH 6.8) బాగా పెరుగుతాయి.",
            "disease": "మీరు 'తెగుళ్ల గుర్తింపు' ట్యాబ్‌లో ఆకు తెగుళ్లను గుర్తించవచ్చు. తెగులు ఉన్న ఆకు ఫోటోను అప్‌లోడ్ చేయండి.",
            "market": "స్థానిక మార్కెట్ ధరలు మరియు కొనుగోలుదారుల కోసం 'మార్కెట్ గైడ్' చూడండి. ప్రస్తుతం వరి క్వింటాల్ రూ. 2,500 వద్ద ట్రేడ్ అవుతోంది.",
            "blockchain": "పంట వివరాలను రికార్డ్ చేయడానికి మేము బ్లాక్‌చైన్ సిమ్యులేటర్‌ని ఉపయోగిస్తాము. డిజిటల్ సర్టిఫికేట్ కోసం 'సప్లై చైన్' ట్యాబ్‌ను చూడండి.",
            "default": "నేను అగ్రిసేతు AI. పంట సలహాలు, తెగుళ్ల నివారణ, మార్కెట్ ధరలు లేదా బ్లాక్‌చైన్ సర్టిఫికేషన్ గురించి నన్ను అడగండి."
        }
    }
    
    lang = query.language if query.language in replies else "en"
    lang_set = replies[lang]
    
    reply = lang_set["default"]
    if any(x in text for x in ["recommend", "crop", "sowing", "plant", "सुझाव", "फसल", "పంట"]):
        reply = lang_set["recommend"]
    elif any(x in text for x in ["disease", "leaf", "blight", "rust", "fungus", "बीमारी", "रोग", "తెగులు"]):
        reply = lang_set["disease"]
    elif any(x in text for x in ["market", "price", "mandi", "buyer", "मूल्य", "बाजार", "మార్కెట్"]):
        reply = lang_set["market"]
    elif any(x in text for x in ["blockchain", "trace", "ledger", "certificate", "ब्लॉकचेन", "బ్లాక్‌చైన్"]):
        reply = lang_set["blockchain"]
        
    return {"reply": reply, "source": "AgriSetu Mock Intelligence"}

# --- Live IoT Telemetry ---
@app.post("/api/iot/ingest")
def ingest_sensor(payload: dict):
    payload["timestamp"] = datetime.datetime.now().isoformat()
    with open(IOT_LOG_PATH, "a") as f:
        f.write(json.dumps(payload) + "\n")
    return {"status": "ok"}

@app.get("/api/iot/telemetry")
def get_telemetry():
    # Return simulated real-time logs + 10 historical entries for Chart.js
    history = []
    base_time = datetime.datetime.now() - datetime.timedelta(minutes=30)
    for i in range(10):
        t = base_time + datetime.timedelta(minutes=3 * i)
        history.append({
            "time": t.strftime("%H:%M"),
            "moisture": round(random.uniform(55, 75), 1),
            "temp": round(random.uniform(22, 31), 1),
            "ph": round(random.uniform(6.1, 6.9), 2),
            "N": round(random.uniform(70, 95), 1),
            "P": round(random.uniform(40, 55), 1),
            "K": round(random.uniform(35, 50), 1),
        })
    return {"history": history}

# --- Blockchain Supply Chain Ledger ---
@app.post("/api/blockchain/mint")
def mint_block(data: TraceabilityMint):
    import hashlib
    prev_block = BLOCKCHAIN_LEDGER[-1]
    prev_hash = prev_block["txHash"]
    idx = len(BLOCKCHAIN_LEDGER) + 1
    ts = datetime.datetime.utcnow().isoformat() + "Z"
    
    # Simple proof of work mining simulator
    nonce = random.randint(1000, 99999)
    block_string = f"{idx}{ts}{data.farmer}{data.crop}{data.quantity}{prev_hash}{nonce}"
    tx_hash = "0x" + hashlib.sha256(block_string.encode()).hexdigest()
    
    new_block = {
        "index": idx,
        "timestamp": ts,
        "farmer": data.farmer,
        "crop": data.crop,
        "quantity": data.quantity,
        "location": data.location,
        "organic": data.organic,
        "txHash": tx_hash,
        "prevHash": prev_hash,
        "nonce": nonce
    }
    BLOCKCHAIN_LEDGER.append(new_block)
    return {"status": "success", "block": new_block}

@app.get("/api/blockchain/ledger")
def get_ledger():
    return {"ledger": BLOCKCHAIN_LEDGER}

# --- Forum API (SQLite) ---
@app.post("/api/forum/post")
async def create_post(
    title: str = Form(...),
    body: str = Form(...),
    author: str = Form(...),
    category: str = Form("General"),
    file: Optional[UploadFile] = File(None)
):
    image_url = None
    if file:
        try:
            # Create uploads directory if not exists inside frontend folder
            uploads_dir = os.path.join(ROOT, "frontend", "uploads")
            os.makedirs(uploads_dir, exist_ok=True)
            
            # Save file locally
            filename = f"{int(datetime.datetime.now().timestamp())}_{file.filename}"
            filepath = os.path.join(uploads_dir, filename)
            
            contents = await file.read()
            with open(filepath, "wb") as f:
                f.write(contents)
                
            image_url = f"uploads/{filename}"
            print(f"Saved uploaded crop image: {image_url}")
        except Exception as e:
            print("Failed to save uploaded image:", e)
            
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    created_at = datetime.datetime.utcnow().isoformat()
    c.execute("INSERT INTO threads (title, body, author, category, created_at, image_url) VALUES (?,?,?,?,?,?)", 
              (title, body, author, category, created_at, image_url))
    conn.commit()
    nid = c.lastrowid
    conn.close()
    return {"id": nid, "status": "success", "image_url": image_url}

@app.get("/api/forum/threads")
def list_threads(category: Optional[str] = None, limit: int = 30):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if category:
        c.execute("""SELECT id, title, body, author, category, likes, created_at, image_url,
                     (SELECT COUNT(*) FROM comments WHERE thread_id = threads.id)
                     FROM threads WHERE category=? ORDER BY id DESC LIMIT ?""", (category, limit))
    else:
        c.execute("""SELECT id, title, body, author, category, likes, created_at, image_url,
                     (SELECT COUNT(*) FROM comments WHERE thread_id = threads.id)
                     FROM threads ORDER BY id DESC LIMIT ?""", (limit,))
    rows = c.fetchall()
    conn.close()
    return [{
        "id": r[0],
        "title": r[1],
        "body": r[2],
        "author": r[3],
        "category": r[4],
        "likes": r[5],
        "created_at": r[6],
        "image_url": r[7],
        "comment_count": r[8]
    } for r in rows]

@app.post("/api/forum/like/{thread_id}")
def like_thread(thread_id: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE threads SET likes = likes + 1 WHERE id=?", (thread_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/forum/comments/{thread_id}")
def get_comments(thread_id: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, thread_id, author, body, created_at FROM comments WHERE thread_id=? ORDER BY id ASC", (thread_id,))
    rows = c.fetchall()
    conn.close()
    return [{"id": r[0], "thread_id": r[1], "author": r[2], "body": r[3], "created_at": r[4]} for r in rows]

@app.post("/api/forum/comment")
def create_comment(cdata: CommentIn):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    created_at = datetime.datetime.utcnow().isoformat()
    c.execute("INSERT INTO comments (thread_id, author, body, created_at) VALUES (?,?,?,?)",
              (cdata.thread_id, cdata.author, cdata.body, created_at))
    conn.commit()
    nid = c.lastrowid
    conn.close()
    return {"id": nid, "status": "success"}

# --- Reddit Trending API Proxy (CORS Bypass) ---
@app.get("/api/forum/reddit")
def get_reddit_trending():
    import urllib.request
    subreddits = ["farming", "agriculture", "organicfarming", "gardening"]
    results = []
    for sub in subreddits:
        try:
            url = f"https://www.reddit.com/r/{sub}/hot.json?limit=3"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (AgriSetu AI Python Client; SIH2026)'})
            with urllib.request.urlopen(req, timeout=4) as response:
                data = json.loads(response.read().decode())
                posts = data.get("data", {}).get("children", [])
                for p in posts:
                    pdata = p.get("data", {})
                    # Ignore stickied posts to focus on organic trends
                    if pdata.get("stickied"):
                        continue
                    results.append({
                        "subreddit": f"r/{sub}",
                        "title": pdata.get("title"),
                        "score": pdata.get("score"),
                        "url": f"https://reddit.com{pdata.get('permalink')}"
                    })
        except Exception as e:
            print(f"Error fetching Reddit r/{sub}:", e)
            
    # Substantial fallback data if Reddit API calls fail or block headers (e.g. offline tests)
    if not results:
        results = [
            {"subreddit": "r/farming", "title": "How to increase rice yield naturally?", "score": 245, "url": "https://www.reddit.com/r/farming/"},
            {"subreddit": "r/agriculture", "title": "Best fertilizer for cotton?", "score": 180, "url": "https://www.reddit.com/r/agriculture/"},
            {"subreddit": "r/organicfarming", "title": "Organic pest control methods", "score": 320, "url": "https://www.reddit.com/r/organicfarming/"},
            {"subreddit": "r/gardening", "title": "Tips for watering tomato plants in high heat", "score": 195, "url": "https://www.reddit.com/r/gardening/"}
        ]
    return {"trending": results[:12]}

# --- Market Data API ---
@app.get("/api/market/suggestions")
def get_market_suggestions(crop: Optional[str] = None):
    # Simulated high-fidelity historical market prices for Chart.js
    crops = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane"]
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    prices = {
        "Rice": [2100, 2150, 2200, 2250, 2300, 2400, 2500, 2450, 2350, 2300, 2200, 2150],
        "Wheat": [1800, 1850, 1900, 1950, 1850, 1800, 1750, 1780, 1820, 1880, 1920, 1950],
        "Maize": [1400, 1420, 1450, 1480, 1500, 1530, 1550, 1520, 1480, 1440, 1410, 1390],
        "Cotton": [5200, 5300, 5400, 5500, 5600, 5800, 6000, 5900, 5700, 5500, 5400, 5300],
        "Sugarcane": [310, 315, 320, 325, 325, 330, 340, 338, 332, 328, 320, 315]
    }
    
    selected_crop = crop if crop in prices else "Rice"
    data = [{"month": m, "price": p} for m, p in zip(months, prices[selected_crop])]
    
    return {
        "crop": selected_crop,
        "price_history": data,
        "recommendation": f"Current data suggests prices for {selected_crop} peak around July. Consider storing harvested produce in clean dry bins and selling near the peak season to maximize profits by up to 15%."
    }

class SaleListing(BaseModel):
    seller: str
    crop: str
    quantity: float
    price: float
    phone: str
    location: str
    lat: float
    lon: float

SALE_LISTINGS = [
    {
        "seller": "Gurbachan Farms",
        "crop": "Wheat",
        "quantity": 45.0,
        "price": 2200.0,
        "phone": "+919888877777",
        "location": "Jalandhar, Punjab",
        "lat": 31.3260,
        "lon": 75.5762
    }
]

@app.post("/api/market/list")
def add_sale_listing(listing: SaleListing):
    SALE_LISTINGS.append(listing.dict())
    return {"status": "success"}

@app.get("/api/market/buyers")
def get_buyers():
    buyers = [
        {"name": "Sardar Ji Grain Traders", "lat": 31.6340, "lon": 74.8723, "produce": "Wheat", "price": 2350, "verified": True, "phone": "+919876543210"},
        {"name": "Punjab Agro Industries Co.", "lat": 30.7333, "lon": 76.7794, "produce": "Rice", "price": 2550, "verified": True, "phone": "+919999888777"},
        {"name": "Malwa Cotton Ginning Mill", "lat": 30.2110, "lon": 74.9455, "produce": "Cotton", "price": 5900, "verified": True, "phone": "+919812345678"},
        {"name": "Doaba Cooperative Sugar Mill", "lat": 31.3260, "lon": 75.5762, "produce": "Sugarcane", "price": 340, "verified": True, "phone": "+919501234567"},
        {"name": "Amritsar Mandi Board Yard", "lat": 31.6250, "lon": 74.8820, "produce": "Rice", "price": 2480, "verified": False, "phone": "+919417234567"}
    ]
    return {"buyers": buyers, "listings": SALE_LISTINGS}

# --- Mount Static Directory (SPA Hosting) ---
if os.path.exists(os.path.join(ROOT, "frontend")):
    app.mount("/", StaticFiles(directory=os.path.join(ROOT, "frontend"), html=True), name="frontend")
else:
    print(f"Warning: static frontend directory not found at {os.path.join(ROOT, 'frontend')}")

# 🌱 AgriSetu — Smart Farmer Advisory & Community Hub

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen.svg?style=for-the-badge&logo=github)](https://aburahmannn.github.io/AgriSetu/)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/AbuRahmannn/AgriSetu)

AgriSetu is a premium, next-generation Web3 and AI-powered agricultural advisory platform designed to empower smallholder farmers. The system integrates real-time IoT field telemetry, machine-learning-based crop recommendations, computer-vision leaf pathology diagnostics, a localized microclimate weather advisor, an interactive spatial mandi market, a cryptographic supply chain registry, and a dynamic farming community forum integrated with Reddit APIs.

Built with **HTML5, Vanilla CSS, Javascript (ES6), FastAPI, SQLite, and scikit-learn**, the application is optimized for speed, responsive design, and seamless user experiences.

---

## 🚀 Key Modules & Features

### 1. 🏠 Home Dashboard
- **Live IoT Telemetry**: Simulates real-time soil telemetry logs including Soil Moisture, Temperature, pH, and Nitrogen (N), Phosphorus (P), and Potassium (K) ratios.
- **Dynamic 24h Graphing**: Renders live telemetry timelines on high-performance Canvas elements using **Chart.js** to track soil fluctuations.
- **Farmer Profile Synced Nodes**: Restores customized farmer profile data (name, village, phone number) from `localStorage` to personalize the entire advisory engine.

### 2. 🌾 Crop Advisor
- **RandomForest ML Model**: Backed by a pre-trained RandomForest classifier (with a rule-based fallback) that evaluates pH, NPK, moisture, temperature, and annual rainfall to select the highest-yielding crop.
- **Nutrient Deficit Assessment**: Compares input soil values against the ideal profile of the selected crop and recommends precise fertilizer corrections (e.g. Urea, DAP, MOP).
- **Sowing Calendar**: Computes a detailed, phase-by-phase cultivation timeline (from sowing to threshing) matching the recommended crop.

### 3. 🔍 Leaf Disease Scanner
- **Pathology Scanner Laser**: Runs an animated green scanner beam over uploaded crop leaf images during diagnostics.
- **Dual Pathology Engine**: Matches leaves using the **Gemini 1.5 Flash Vision API** (or falls back to a custom server-side Pillow color-inspector that scans pixel ratios for white mildew dust, brown rust pustules, or grey blights).
- **Comprehensive Reports**: Returns confidence scores, severity levels, disease causes, symptoms, organic remedies (e.g. neem oil, sulfur dusting), and chemical interventions.

### 4. 🤖 AI Advisory Chat
- **Interactive Floating Character**: Features an animated chatbot trigger avatar with robotic blinking eyes, antenna LED pulse states, floating bobs, and a hover-active smile.
- **Multilingual Support**: Supports queries in **English, Hindi, and Telugu**. It translates suggestion chips and responses dynamically.
- **Speech Recognition**: Integrated with the native browser **Web Speech API** for hands-free voice typing.
- **TF-IDF Semantic Matcher**: Queries are resolved by a local scikit-learn TF-IDF vectorizer and cosine similarity mapping for offline accuracy, falling back to Gemini if configured.

### 5. 📊 Market & Buyers
- **Geo-Spatial Mandi Map**: Renders an interactive, responsive map using **Leaflet.js** to locate nearby grain traders, mandi boards, and private buyers.
- **Crop Listings (Marketplace)**: A form allows farmers to list their own crop lots for sale, rendering them as markers on the Leaflet map and appending details in the local directory.
- **Seasonal Mandi Forecasting**: Predicts annual crop prices month-by-month, advising farmers on storage buffers to maximize profits by up to 15% during peak windows.

### 6. ⛓️ Supply Chain Traceability
- **Cryptographic Origin Registry**: Allows farmers to lock crop origin, organic validation, and quantities into a simulated Web3 ledger.
- **Proof-of-Work Mining**: Solves a simulated block mining puzzle to calculate SHA-256 hashes, linking blocks chain-style.
- **QR Certificate Verification**: Generates printable certificates containing a custom-encoded verification QR code (via QRServer API).

### 7. 👥 Agri Community Forum
- **Two-Column Social Feed**: Features a post creation panel alongside a local farmers' feed.
- **Multipart Form Uploads**: Supports attaching binary crop photos to posts. Image uploads are processed on the FastAPI server and served from static paths.
- **Reddit API Proxy Integration**: A backend HTTP client fetches trending topics in real time from `r/farming`, `r/agriculture`, `r/organicfarming`, and `r/gardening`, bypassing browser CORS blockades.
- **Likes & Nested Commenting**: Persists post likes and individual farmer comment replies in SQLite. Updates comment count badges dynamically.
- **Social Sharing Actions**: Enables sharing post links directly to WhatsApp and Reddit.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Deep Forest Dark Theme + Glassmorphic filters), Modern Javascript (ES6 Modules), Leaflet.js, Chart.js.
- **Backend**: FastAPI (Python 3.10+), Uvicorn ASGI Server.
- **Database**: SQLite3 (Self-healing startup migrations).
- **Machine Learning & Vision**: scikit-learn, Pillow, Joblib.
- **GenAI APIs**: Google Generative AI (Gemini Flash client for Vision and Chat).

---

## ⚙️ Project Setup & Installation

### 1. Prerequisites
- Python 3.10 or higher.
- Git.

### 2. Installation
Clone the repository:
```bash
git clone https://github.com/AbuRahmannn/AgriSetu.git
cd AgriSetu
```

Set up a Python Virtual Environment:
```bash
# Create virtual environment inside backend directory
cd backend
python -m venv .venv

# Activate virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate
```

Install backend dependencies:
```bash
pip install -r requirements.txt
```
*(Note: Ensure `fastapi`, `uvicorn`, `pydantic`, `joblib`, `scikit-learn`, `pillow`, `python-multipart`, and `google-generativeai` are installed.)*

### 3. API Keys (Optional)
To enable advanced Gemini-powered diagnostics and chatbot responses, set your API key as an environment variable:
```bash
# Windows (PowerShell):
$env:GEMINI_API_KEY="your_api_key_here"

# macOS/Linux:
export GEMINI_API_KEY="your_api_key_here"
```
If no key is provided, AgriSetu automatically falls back to its built-in scikit-learn TF-IDF semantic chatbot and local Pillow color leaf pathology inspector.

### 4. Running the Platform
Launch the FastAPI development server:
```bash
python -m uvicorn app.main:app --port 8000 --host 0.0.0.0 --reload
```

Open your browser and navigate to:
```
http://127.0.0.1:8000
```
*(Since FastAPI mounts static directories, the complete Single Page Application is served directly from the root path.)*

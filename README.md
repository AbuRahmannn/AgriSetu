# 🌱 AgriSetu — Smart Farmer Advisory & Community Hub

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen.svg?style=for-the-badge\&logo=github)](https://aburahmannn.github.io/AgriSetu/)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/AbuRahmannn/AgriSetu)

AgriSetu is a **smart agriculture web platform** designed to help farmers access crop recommendations, soil insights, plant disease assistance, weather information, market/buyer discovery, supply-chain traceability, and an agricultural community experience from a single platform.

The application combines **machine learning, AI-assisted features, geospatial visualization, real-time-style telemetry, and a Python FastAPI backend** to provide an interactive and responsive farmer-focused experience.

Built with **HTML5, CSS3, JavaScript (ES6), FastAPI, SQLite, scikit-learn, Pillow, Chart.js, and Leaflet.js**.

---

## 🚀 Key Modules & Features

### 1. 🏠 Home Dashboard

* **IoT-style Field Telemetry**

  * Displays soil parameters such as moisture, temperature, pH, and NPK values.
  * Provides a real-time-style monitoring experience for agricultural field conditions.

* **24-Hour Telemetry Visualization**

  * Uses **Chart.js** to visualize soil parameter trends.

* **Farmer Profile**

  * Stores farmer information locally using browser `localStorage`.
  * Personalizes the advisory experience using saved profile information.

---

### 2. 🌾 Crop Advisor

* **Machine Learning Crop Recommendation**

  * Uses a pre-trained **Random Forest** model to recommend suitable crops based on agricultural parameters.
  * Considers factors such as:

    * Soil pH
    * Nitrogen (N)
    * Phosphorus (P)
    * Potassium (K)
    * Soil moisture
    * Temperature
    * Rainfall

* **Rule-Based Fallback**

  * Provides a fallback mechanism when the ML model is unavailable.

* **Nutrient Assessment**

  * Compares soil conditions against the recommended crop's requirements.
  * Provides fertilizer suggestions such as Urea, DAP, and MOP where applicable.

* **Sowing Calendar**

  * Generates a crop cultivation timeline from sowing through harvesting-related stages.

---

### 3. 🔍 Leaf Disease Scanner

* **Crop Leaf Image Analysis**

  * Allows users to upload crop leaf images for analysis.

* **AI-Assisted Diagnosis**

  * Supports integration with Google's Gemini vision capabilities when a valid API key is configured.

* **Local Fallback Analysis**

  * Uses server-side **Pillow-based image analysis** when the external AI service is unavailable.

* **Diagnostic Report**

  * Can provide information such as:

    * Detected condition
    * Confidence
    * Severity
    * Possible causes
    * Symptoms
    * Suggested remedies

> **Note:** AI-generated disease analysis should be treated as an advisory aid and not as a substitute for professional agricultural diagnosis.

---

### 4. 🤖 AI Advisory Chat

* **Multilingual Interaction**

  * Supports **English, Hindi, and Telugu**.

* **Semantic Question Matching**

  * Uses a local **scikit-learn TF-IDF vectorizer** and cosine similarity for agricultural queries.

* **AI Integration**

  * Can use Gemini for enhanced responses when `GEMINI_API_KEY` is configured.

* **Offline-Friendly Fallback**

  * The local semantic matching system allows the chatbot to operate without a Gemini API key.

* **Voice Input**

  * Uses the browser's **Web Speech API** where supported.

---

### 5. 📊 Market & Buyers

* **Interactive Mandi Map**

  * Uses **Leaflet.js** for geospatial visualization.
  * Displays agricultural market and buyer locations.

* **Crop Listings**

  * Allows farmers to create crop listings for potential buyers.

* **Location-Based Visualization**

  * Crop and buyer information can be displayed geographically through interactive map markers.

* **Market Insights**

  * Provides agricultural market-related insights where supported by the application.

> Market information and forecasts should be considered informational and may not represent live government-market prices.

---

### 6. ⛓️ Supply Chain Traceability

* **Crop Origin Registry**

  * Records crop origin and related information in a simulated traceability workflow.

* **SHA-256 Hashing**

  * Demonstrates cryptographic hashing through a simulated blockchain-style structure.

* **Proof-of-Work Demonstration**

  * Includes a simulated mining mechanism to demonstrate how blocks can be linked using hashes.

* **QR Verification**

  * Generates QR-based verification information for registered crop records.

> This module is a **blockchain/Web3 simulation for demonstration purposes** and does not represent a production blockchain network.

---

### 7. 👥 Agri Community Forum

* **Farmer Community Feed**

  * Provides a social-style agricultural discussion interface.

* **Post Creation**

  * Users can create agricultural posts and attach crop images.

* **Image Uploads**

  * Uploaded images are processed through the FastAPI backend.

* **Community Interaction**

  * Supports likes and comments backed by the local SQLite database.

* **External Community Integration**

  * Supports Reddit-based agricultural content where the required external service is available.

* **Social Sharing**

  * Provides sharing options for supported platforms such as WhatsApp and Reddit.

---

## 🛠️ Technology Stack

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript (ES6)
* Leaflet.js
* Chart.js
* Web Speech API

### Backend

* Python 3.10+
* FastAPI
* Uvicorn

### Database

* SQLite3
* SQLAlchemy

### Machine Learning & Image Processing

* scikit-learn
* Joblib
* Pillow

### AI / Generative AI

* Google Gemini API *(optional)*

### Development Tools

* Git
* GitHub
* Bash / PowerShell / Command Prompt

---

# ⚙️ Project Setup & Installation

## 1. Prerequisites

Install the following before running AgriSetu:

* **Python 3.10 or higher**
* **Git**
* A modern web browser such as Chrome, Edge, or Firefox

Check your installations:

### Windows

```cmd
python --version
git --version
```

You should see versions similar to:

```text
Python 3.x.x
git version x.x.x
```

---

# 2. Clone the Repository

Open **Command Prompt** or **PowerShell**:

```bash
git clone https://github.com/AbuRahmannn/AgriSetu.git
cd AgriSetu
```

---

# 3. Create a Virtual Environment

Move into the backend directory:

```bash
cd backend
```

Create the virtual environment:

```bash
python -m venv .venv
```

---

## 4. Activate the Virtual Environment

### Windows — Command Prompt (CMD)

```cmd
.venv\Scripts\activate
```

### Windows — PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

### macOS / Linux

```bash
source .venv/bin/activate
```

After activation, your terminal should display something similar to:

```text
(.venv) C:\...\AgriSetu\backend>
```

### ⚠️ Windows PowerShell Execution Policy

If PowerShell displays an execution-policy error while activating the environment, run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then activate again:

```powershell
.venv\Scripts\Activate.ps1
```

Alternatively, use **Command Prompt**, which does not require the PowerShell activation command.

---

# 5. Install Dependencies

With the virtual environment activated:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Using:

```bash
python -m pip
```

is recommended because it ensures that pip is associated with the Python installation currently being used.

---

# 6. Gemini API Configuration — Optional

AgriSetu can run without a Gemini API key.

Without a key, the application uses its available local fallback mechanisms, including the TF-IDF-based chatbot and local image analysis.

If you want to enable Gemini-powered functionality, configure:

```text
GEMINI_API_KEY
```

### Windows PowerShell

```powershell
$env:GEMINI_API_KEY="YOUR_API_KEY_HERE"
```

### Windows CMD

```cmd
set GEMINI_API_KEY=YOUR_API_KEY_HERE
```

### macOS / Linux

```bash
export GEMINI_API_KEY="YOUR_API_KEY_HERE"
```

Then start the application.

> **Security:** Never commit your API key to GitHub. If using a `.env` file, make sure it is included in `.gitignore`.

---

# 7. Run the Backend

From the `backend` directory:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

A successful startup should look similar to:

```text
Uvicorn running on http://0.0.0.0:8000
Application startup complete.
```

The application may also initialize the SQLite database and prepare its machine-learning/chatbot components during startup.

---

# 8. Open AgriSetu

Once the server is running, open your browser and visit:

```text
http://127.0.0.1:8000
```

You can also use:

```text
http://localhost:8000
```

The frontend is served by the FastAPI application.

---

# 📚 API Documentation

FastAPI automatically provides interactive API documentation.

After starting the server, open:

### Swagger UI

```text
http://127.0.0.1:8000/docs
```

### ReDoc

```text
http://127.0.0.1:8000/redoc
```

These pages are useful for testing and understanding the available backend endpoints.

---

# 🛑 Stopping the Application

To stop the development server:

```text
CTRL + C
```

To deactivate the virtual environment:

```bash
deactivate
```

---

# 🔧 Troubleshooting

## `source is not recognized`

If you are on Windows and see:

```text
'source' is not recognized as an internal or external command
```

Do **not** use:

```bash
source .venv/bin/activate
```

Use:

```cmd
.venv\Scripts\activate
```

instead.

---

## `python is not recognized`

Check whether Python is installed:

```cmd
python --version
```

If Windows cannot find Python, install Python and make sure Python is added to your system PATH.

---

## Port 8000 is already in use

Run the application on another port:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Then open:

```text
http://127.0.0.1:8001
```

---

## Gemini API Key Not Found

If you see:

```text
No GEMINI_API_KEY found.
```

this does **not necessarily mean the application failed**.

AgriSetu can operate using its local fallback functionality when Gemini is not configured.

---

## API Endpoint Returns 404

If an endpoint returns:

```text
404 Not Found
```

first open:

```text
http://127.0.0.1:8000/docs
```

and verify the endpoint listed in the current FastAPI application.

Do not assume that an endpoint mentioned in an older README, frontend script, or previous version of the project is still available.

---

# 📁 Project Structure

```text
AgriSetu/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── ...
│   │
│   ├── requirements.txt
│   └── .venv/
│
├── frontend/
│   └── ...
│
├── sample_data/
│   └── ...
│
├── .github/
│   └── workflows/
│
├── render.yaml
├── README.md
└── .gitignore
```

---

# 🌐 Deployment

AgriSetu includes configuration for deployment workflows.

### GitHub Pages

The repository contains a GitHub Pages deployment workflow for the frontend.

### Render

A `render.yaml` configuration is included for deployment through Render.

For local development, however, the recommended approach is to run the FastAPI server directly:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

# ⚠️ Important Project Notes

AgriSetu is primarily a **student/development project and technology demonstration**.

Some functionality uses simulations, local fallback algorithms, browser APIs, or optional external services. Therefore:

* IoT telemetry shown by the dashboard may be simulated.
* Blockchain/Web3 functionality is a demonstration rather than a production blockchain.
* AI-generated agricultural recommendations should be independently verified.
* Market information should not be treated as guaranteed live pricing.
* External APIs may require configuration and can change availability.
* Browser-dependent features such as speech recognition may not work in every browser.
* Gemini-powered functionality requires a valid API key.

---

# 🎯 Project Objective

AgriSetu aims to demonstrate how **AI, machine learning, web technologies, geospatial systems, and digital community tools** can be combined into a unified agricultural platform.

The project focuses on building practical software that can help farmers make more informed decisions about:

* 🌱 Crop selection
* 🧪 Soil and nutrient conditions
* 🔍 Plant health
* 🌦️ Environmental conditions
* 📊 Market and buyer discovery
* ⛓️ Crop traceability
* 👥 Agricultural knowledge sharing

---

# 👨‍💻 Developer

**Abdul Rahman**

Information Technology Undergraduate

* GitHub: [@AbuRahmannn](https://github.com/AbuRahmannn)
* LinkedIn: [rahmanabd](https://www.linkedin.com/in/rahmanabd/)

---

## 📄 License

This project is intended for educational, development, and demonstration purposes.

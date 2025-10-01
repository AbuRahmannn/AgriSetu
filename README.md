🌱 AgriSetu: Smart Crop Advisory System for Small and Marginal Farmers
🚀 Overview
AgriSetu is a cutting-edge AI-powered software platform designed to bridge the digital divide for small and marginal farmers in India. It addresses the 




Smart India Hackathon 2025 (SIH25010) problem statement. By integrating advanced Machine Learning (ML), conversational AI, and real-time market data, AgriSetu provides personalized, profit-focused agricultural advice directly to the farmer's mobile or web device. The system is built on a 





mobile-first, multilingual architecture to ensure maximum accessibility and adoption across rural areas.




✨ Key Features & Technical Modules
AgriSetu's high-end functionality is delivered through robust, scalable modules:


Smart Crop Recommendation Engine: Analyzes soil data (NPK, pH), moisture, temperature, and rainfall, running on XGBoost/Random Forest models to predict the most profitable and sustainable crop for the region.



Deep Learning Disease Predictor: Provides instant diagnosis of plant diseases from uploaded leaf images using a ResNet CNN model, and suggests evidence-based treatment for timely intervention.




AI-Powered Agri-Chatbot: A conversational, multilingual assistant that uses the Google Gemini Pro API and Natural Language Processing (NLP) for instant, context-aware query resolution via text or voice.




Direct MarketLink & Price Intelligence: A geo-spatial portal and API integration (Agmarknet) connect farmers directly with nearby buyers, providing real-time price monitoring and demand forecasts to optimize selling price.




Comprehensive Advisory Toolkit: Includes modules for Water Management, Fertilizer/Nutrient Management, Harvest/Storage tips, and access to Government Schemes, ensuring complete lifecycle support.



Community Knowledge Forum: A collaborative digital space for farmers and experts to share best practices and localized solutions, promoting peer-to-peer learning.


⚙️ Technical Stack (High-End & Scalable)
The project leverages a modern, modular, and cloud-native architecture for performance, as outlined in the Technical Approach:


Frontend: Built with React Native (mobile) and React.js/Next.js (web) for cross-platform, optimized performance. Uses 

Tailwind CSS for responsive design.


Backend/API: Uses Node.js/Express.js for high-throughput API services and Django/Python for complex ML model integration and data processing.


Databases: Utilizes PostgreSQL for relational data integrity and MongoDB/Firebase Firestore for flexible, real-time data such as the Agri-Forum.


AI/ML: Core intelligence relies on Google Gemini Pro API, custom ML models trained using TensorFlow/PyTorch, and models like XGBoost/Random Forest for predictions.


Deployment: Hosted on AWS / GCP cloud platforms, leveraging services like Kubernetes and Docker for containerization and scalability, with CI/CD for automation.


APIs/Services: Integrates external APIs for Agritech Data (soil, weather), Agmarknet, Twilio (notifications), and Auth0 (security).

📈 Impact and Viability
AgriSetu provides quantifiable, high-impact value, ensuring its viability and sustainability:




Economic Gain: Projected 20-40% increase in net farmer income through yield optimization, reduced input costs, and better price realization via the MarketLink feature.




Resource Efficiency: Reduces resource wastage (water, fertilizer) by up to 30% through precision recommendations, aligning with sustainability goals.



User Base: Directly targets the 86% of small and marginal farmers who lack access to personalized, data-driven agricultural extension services.

🧑‍💻 Installation and Setup
Prerequisites
Python 3.10+

Node.js 18+

Docker (Recommended for local development)

Google Gemini API Key

Backend Setup (Python/FastAPI)
Clone the repository:
git clone [your-repo-link]
cd AgriSetu/backend

Create and activate a virtual environment and install dependencies:


pip install -r requirements.txt 

Configure Environment Variables:
Create a .env file and add API keys/database credentials.

Run the API Server (using uvicorn):
uvicorn main:app --reload
The API will be running on http://127.0.0.1:8000.

Frontend Setup (Web/Mobile)
The frontend is a hybrid application (React Native for mobile, static HTML/JS/Tailwind for web prototype).

Navigate to the frontend directory:
cd AgriSetu/frontend

Serve the files:
Use a local server to access the core HTML files (index.html, crop.html, disease.html, etc.).
The frontend files are configured to make API calls to the running backend service.

from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.inception_v3 import preprocess_input
import numpy as np
import os
import io

# Initialize the Flask app
app = Flask(__name__)

# Define the path to the models directory
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')

# Load the trained Keras model once when the server starts
# It now looks for the model in the 'models' directory
try:
    model_path = os.path.join(MODEL_DIR, 'disease_model.h5')
    model = load_model(model_path)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# A dummy function to simulate a model prediction if the real model fails to load
def dummy_predict(img):
    # Dummy logic to return a placeholder result
    return {
        'prediction': 'Dummy_Prediction_Healthy',
        'confidence': '0.99'
    }

# Define the prediction endpoint
@app.route('/api/predict_disease', methods=['POST'])
def predict_disease():
    if model is None:
        # If the model failed to load, return a dummy prediction
        return jsonify(dummy_predict(None))
    
    # Check if a file was uploaded
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        try:
            # Read the image file and preprocess it for the model
            img = image.load_img(io.BytesIO(file.read()), target_size=(224, 224))
            x = image.img_to_array(img)
            x = np.expand_dims(x, axis=0)
            img_data = preprocess_input(x)
            
            # Get the prediction from the model
            predictions = model.predict(img_data)
            predicted_class = np.argmax(predictions, axis=1)[0]
            
            # This is where you would map the class index to a class name
            # You must replace these with the actual class names from your dataset
            class_names = ['Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 'Apple___healthy', 
                           'Grape___Black_rot', 'Grape___Esca_(Black_Measles)', 'Grape___Leaf_blight_(Isariopsis_leaf_spot)', 'Grape___healthy', 
                           'Potato___Early_blight', 'Potato___Late_blight', 'Potato___healthy', 
                           'Tomato___Bacterial_spot', 'Tomato___Early_blight', 'Tomato___Late_blight', 'Tomato___Leaf_Mold', 'Tomato___healthy']
            predicted_label = class_names[predicted_class]

            response = {
                'prediction': predicted_label,
                'probabilities': predictions.tolist()
            }
            
            return jsonify(response)

        except Exception as e:
            return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # You can change the port if needed. Port 8000 is used in the frontend code.
    app.run(host='0.0.0.0', port=8000, debug=True)

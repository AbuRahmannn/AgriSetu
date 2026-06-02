import numpy as np
import joblib
import os
import csv
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

def generate_synthetic_data(num_samples_per_crop=200):
    crops = {
        "Rice":       {"ph": (5.0, 6.5), "N": (80, 120),  "P": (40, 60),  "K": (35, 60),  "moist": (70, 90), "temp": (22, 35), "rain": (150, 300)},
        "Wheat":      {"ph": (6.0, 7.5), "N": (60, 90),   "P": (30, 50),  "K": (30, 45),  "moist": (40, 60), "temp": (15, 25), "rain": (75, 150)},
        "Maize":      {"ph": (5.5, 7.0), "N": (50, 80),   "P": (40, 60),  "K": (20, 40),  "moist": (50, 70), "temp": (18, 30), "rain": (60, 120)},
        "Cotton":     {"ph": (6.0, 8.0), "N": (70, 100),  "P": (30, 50),  "K": (50, 80),  "moist": (30, 50), "temp": (25, 38), "rain": (50, 100)},
        "Sugarcane":  {"ph": (6.0, 7.8), "N": (100, 140), "P": (50, 80),  "K": (60, 100), "moist": (60, 80), "temp": (21, 32), "rain": (120, 250)},
        "Millets":    {"ph": (5.5, 7.5), "N": (20, 50),   "P": (15, 30),  "K": (15, 35),  "moist": (20, 40), "temp": (25, 35), "rain": (30, 70)},
        "Jowar":      {"ph": (6.0, 7.5), "N": (30, 60),   "P": (20, 40),  "K": (20, 40),  "moist": (25, 45), "temp": (24, 32), "rain": (40, 80)},
        "Ragi":       {"ph": (5.0, 7.0), "N": (40, 70),   "P": (20, 40),  "K": (30, 50),  "moist": (35, 55), "temp": (20, 30), "rain": (50, 90)}
    }
    
    data = []
    np.random.seed(42)
    
    for crop, bounds in crops.items():
        for _ in range(num_samples_per_crop):
            ph = np.random.uniform(*bounds["ph"])
            n = np.random.uniform(*bounds["N"])
            p = np.random.uniform(*bounds["P"])
            k = np.random.uniform(*bounds["K"])
            moist = np.random.uniform(*bounds["moist"])
            temp = np.random.uniform(*bounds["temp"])
            rain = np.random.uniform(*bounds["rain"])
            
            data.append([ph, n, p, k, moist, temp, rain, crop])
            
    return data

def main():
    print("Generating synthetic soil dataset...")
    data = generate_synthetic_data(250)
    
    # Save the synthetic dataset as CSV using standard csv module
    ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    csv_dir = os.path.join(ROOT, "sample_data")
    os.makedirs(csv_dir, exist_ok=True)
    csv_path = os.path.join(csv_dir, "synthetic_soil_health.csv")
    
    headers = ['ph', 'nitrogen', 'phosphorus', 'potassium', 'moisture', 'temperature', 'rainfall', 'crop_label']
    with open(csv_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(data)
    print(f"Dataset saved with {len(data)} rows to {csv_path}")
    
    # Prepare features and labels
    X = []
    y = []
    for row in data:
        X.append([float(row[0]), float(row[1]), float(row[2]), float(row[3]), float(row[4]), float(row[5]), float(row[6])])
        y.append(row[7])
        
    X = np.array(X)
    y = np.array(y)
    
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.2, random_state=42)
    
    print("Training RandomForest model...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    acc = clf.score(X_test, y_test)
    print(f"Model test accuracy: {acc:.4f}")
    
    model_dir = os.path.join(ROOT, "models")
    os.makedirs(model_dir, exist_ok=True)
    outpath = os.path.join(model_dir, "crop_model.joblib")
    
    joblib.dump((clf, le), outpath)
    print(f"Model successfully saved to {outpath}")

if __name__ == '__main__':
    main()

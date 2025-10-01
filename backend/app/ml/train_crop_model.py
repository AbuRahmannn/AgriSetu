"""Train a crop recommendation model from CSV.
Simple script using scikit-learn. Input CSV must contain features:
ph,nitrogen,phosphorus,potassium,moisture,temperature,rainfall,crop_label
"""
import argparse, pandas as pd, joblib, os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

def main(infile, outpath):
    df = pd.read_csv(infile)
    X = df[['ph','nitrogen','phosphorus','potassium','moisture','temperature','rainfall']].fillna(0)
    y = df['crop_label']
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.2, random_state=42)
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    acc = clf.score(X_test, y_test)
    print('Test accuracy:', acc)
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    joblib.dump((clf, le), outpath)
    print('Saved model to', outpath)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    main(args.input, args.out)

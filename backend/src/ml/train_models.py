"""
train_models.py
Trains and evaluates smart predictive matching models using Scikit-Learn:
1. NGO Claim Suitability Model (strict 20km provider radius constraint)
2. Volunteer Pickup Mission Model (strict 30km dual-radius constraint from provider & NGO)

Exports serialized lightweight JSON weights for instant, zero-dependency in-process
inference within Node.js.
"""

import os
import json
import csv
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

ML_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ML_DIR, 'data')
MODELS_DIR = os.path.join(ML_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

NGO_CSV = os.path.join(DATA_DIR, 'ngo_matching_train.csv')
VOL_CSV = os.path.join(DATA_DIR, 'volunteer_matching_train.csv')

def load_csv(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def train_ngo_model():
    print("\n--- Training NGO Matching Model (20km Radius Rule) ---")
    rows = load_csv(NGO_CSV)

    feature_cols = [
        'distance_km',
        'distance_ratio_20km',
        'capacity_fit_ratio',
        'capacity_overflow_risk',
        'food_category_match',
        'hours_to_expiry',
        'days_since_last_donation',
        'ngo_rating',
        'ngo_completion_rate',
        'is_within_20km'
    ]

    X = np.array([[float(r[col]) for col in feature_cols] for r in rows], dtype=np.float64)
    y = np.array([int(r['match_success']) for r in rows], dtype=np.int32)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train regularized Logistic Regression
    clf = LogisticRegression(max_iter=1000, C=1.0, random_state=42)
    clf.fit(X_train_scaled, y_train)

    y_pred = clf.predict(X_test_scaled)
    y_prob = clf.predict_proba(X_test_scaled)[:, 1]

    metrics = {
        'accuracy': round(accuracy_score(y_test, y_pred), 4),
        'precision': round(precision_score(y_test, y_pred, zero_division=0), 4),
        'recall': round(recall_score(y_test, y_pred), 4),
        'f1': round(f1_score(y_test, y_pred), 4),
        'roc_auc': round(roc_auc_score(y_test, y_prob), 4),
        'train_samples': len(y_train),
        'test_samples': len(y_test)
    }

    print(f"NGO Model Test Metrics: {json.dumps(metrics, indent=2)}")

    # Export model structure and weights for Node.js engine
    model_export = {
        'model_name': 'ngo_matching_logistic_model',
        'version': '1.0.0',
        'max_radius_km': 20.0,
        'feature_names': feature_cols,
        'means': scaler.mean_.tolist(),
        'stds': scaler.scale_.tolist(),
        'weights': clf.coef_[0].tolist(),
        'intercept': float(clf.intercept_[0]),
        'metrics': metrics
    }

    out_file = os.path.join(MODELS_DIR, 'ngo_matching_model.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(model_export, f, indent=2)

    print(f"Saved NGO model JSON to {out_file}")
    return model_export

def train_volunteer_model():
    print("\n--- Training Volunteer Matching Model (30km Dual-Radius Rule) ---")
    rows = load_csv(VOL_CSV)

    feature_cols = [
        'dist_to_provider_km',
        'dist_to_ngo_km',
        'max_of_two_distances_km',
        'total_route_estimate_km',
        'both_within_30km',
        'parcel_weight_kg',
        'vehicle_capacity_match',
        'volunteer_rating',
        'active_deliveries',
        'volunteer_completion_rate',
        'hours_to_expiry',
        'eta_minutes_to_pickup'
    ]

    X = np.array([[float(r[col]) for col in feature_cols] for r in rows], dtype=np.float64)
    y = np.array([int(r['pickup_success']) for r in rows], dtype=np.int32)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    clf = LogisticRegression(max_iter=1000, C=1.0, random_state=42)
    clf.fit(X_train_scaled, y_train)

    y_pred = clf.predict(X_test_scaled)
    y_prob = clf.predict_proba(X_test_scaled)[:, 1]

    metrics = {
        'accuracy': round(accuracy_score(y_test, y_pred), 4),
        'precision': round(precision_score(y_test, y_pred, zero_division=0), 4),
        'recall': round(recall_score(y_test, y_pred), 4),
        'f1': round(f1_score(y_test, y_pred), 4),
        'roc_auc': round(roc_auc_score(y_test, y_prob), 4),
        'train_samples': len(y_train),
        'test_samples': len(y_test)
    }

    print(f"Volunteer Model Test Metrics: {json.dumps(metrics, indent=2)}")

    model_export = {
        'model_name': 'volunteer_matching_logistic_model',
        'version': '1.0.0',
        'max_provider_radius_km': 30.0,
        'max_ngo_radius_km': 30.0,
        'feature_names': feature_cols,
        'means': scaler.mean_.tolist(),
        'stds': scaler.scale_.tolist(),
        'weights': clf.coef_[0].tolist(),
        'intercept': float(clf.intercept_[0]),
        'metrics': metrics
    }

    out_file = os.path.join(MODELS_DIR, 'volunteer_matching_model.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(model_export, f, indent=2)

    print(f"Saved Volunteer model JSON to {out_file}")
    return model_export

if __name__ == '__main__':
    train_ngo_model()
    train_volunteer_model()
    print("\nAll models trained and exported successfully!")

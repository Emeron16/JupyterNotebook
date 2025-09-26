import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
import joblib
import re
import json
import os
from datetime import datetime

# Constants
TRAINING_THRESHOLD = 50  # Number of new applications before retraining
MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

def preprocess_salary(salary):
    """Extract numeric values from salary strings."""
    if pd.isna(salary) or salary == '':
        return np.nan
    
    # Extract numbers using regex
    numbers = re.findall(r'\d+(?:,\d+)*(?:\.\d+)?', salary)
    if not numbers:
        return np.nan
    
    # Convert to float and take average if range
    numbers = [float(num.replace(',', '')) for num in numbers]
    return sum(numbers) / len(numbers)

def preprocess_data(df):
    """Preprocess the data for model training."""
    # Combine text features
    df['text_features'] = df['company'] + ' ' + df['position'] + ' ' + df['location']
    
    # Preprocess salary
    df['salary_numeric'] = df['salary'].apply(preprocess_salary)
    
    # Convert applied date to days since application
    df['days_since_application'] = (pd.Timestamp.now() - pd.to_datetime(df['appliedDate'])).dt.days
    
    return df

def get_last_training_count():
    """Get the number of applications used in the last training."""
    try:
        with open(os.path.join(MODEL_DIR, 'training_info.json'), 'r') as f:
            info = json.load(f)
            return info.get('last_training_count', 0)
    except FileNotFoundError:
        return 0

def save_training_info(count):
    """Save the number of applications used in training."""
    info = {
        'last_training_count': count,
        'last_training_date': datetime.now().isoformat()
    }
    with open(os.path.join(MODEL_DIR, 'training_info.json'), 'w') as f:
        json.dump(info, f)

def train_model(applications):
    """Train the status prediction model."""
    if not applications:
        print("No applications data provided.")
        return
    
    # Convert to DataFrame
    df = pd.DataFrame(applications)
    
    # Preprocess data
    df = preprocess_data(df)
    
    # Prepare features
    # Text features
    tfidf = TfidfVectorizer(max_features=1000, stop_words='english')
    text_features = tfidf.fit_transform(df['text_features'])
    
    # Numeric features
    numeric_features = df[['salary_numeric', 'days_since_application']].fillna(0)
    
    # Combine features
    X = np.hstack([text_features.toarray(), numeric_features])
    y = df['status']
    
    # Encode labels
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    print("\nModel Performance:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))
    
    # Save model and encoders
    joblib.dump(model, os.path.join(MODEL_DIR, 'status_predictor.joblib'))
    joblib.dump(tfidf, os.path.join(MODEL_DIR, 'tfidf_vectorizer.joblib'))
    joblib.dump(label_encoder, os.path.join(MODEL_DIR, 'label_encoder.joblib'))
    
    # Save training info
    save_training_info(len(applications))
    
    print(f"\nModel trained on {len(applications)} applications and saved.")

def should_retrain(applications):
    """Check if model should be retrained based on new data."""
    last_count = get_last_training_count()
    current_count = len(applications)
    
    # Retrain if:
    # 1. No model exists yet
    # 2. We have enough new data (50 more applications)
    # 3. We have at least 50 applications total
    return (not os.path.exists(os.path.join(MODEL_DIR, 'status_predictor.joblib')) or
            (current_count >= TRAINING_THRESHOLD and 
             current_count - last_count >= TRAINING_THRESHOLD))

def predict_status(company, position, location, salary, applied_date):
    """Predict status for a new job application."""
    try:
        # Load saved model and encoders
        model = joblib.load(os.path.join(MODEL_DIR, 'status_predictor.joblib'))
        tfidf = joblib.load(os.path.join(MODEL_DIR, 'tfidf_vectorizer.joblib'))
        label_encoder = joblib.load(os.path.join(MODEL_DIR, 'label_encoder.joblib'))
    except FileNotFoundError:
        print("Error: Model files not found. Please train the model first.")
        return None, 0
    
    # Preprocess input
    text_features = tfidf.transform([f"{company} {position} {location}"])
    salary_numeric = preprocess_salary(salary)
    days_since_application = (pd.Timestamp.now() - pd.to_datetime(applied_date)).days
    
    # Combine features
    X = np.hstack([text_features.toarray(), [[salary_numeric, days_since_application]]])
    
    # Make prediction
    prediction = model.predict(X)
    probability = model.predict_proba(X)
    
    # Get predicted status and confidence
    predicted_status = label_encoder.inverse_transform(prediction)[0]
    confidence = probability.max() * 100
    
    return predicted_status, confidence

def check_and_train(applications):
    """Check if retraining is needed and train if necessary."""
    if should_retrain(applications):
        print(f"Training new model with {len(applications)} applications...")
        train_model(applications)
    else:
        print(f"Current model is up to date. Last trained with {get_last_training_count()} applications.")

if __name__ == "__main__":
    # This script is meant to be imported and used by the extension
    pass 
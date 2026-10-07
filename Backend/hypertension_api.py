import numpy as np
import pandas as pd
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
import os

class EnsembleAveragedClassifier:
    def __init__(self, models=None): 
        self.models = models or [] 
    
    def predict_proba(self, X): 
        probs = [m.predict_proba(X)[:, 1] for m in self.models] 
        return np.mean(probs, axis=0).reshape(-1, 1)

def safe_predict_proba(model, X):
    """Safely extract positive class probability from any model format"""
    try:
        proba = model.predict_proba(X)
        
        if hasattr(proba, 'shape'):
            if proba.shape[1] == 2:
                return proba[:, 1]
            elif proba.shape[1] == 1:
                return proba[:, 0]
            else:
                return proba[:, 1] if proba.shape[1] > 1 else proba.ravel()
        else:
            return np.array(proba)[:, 1] if len(proba[0]) == 2 else np.array(proba).ravel()
            
    except Exception as e:
        print(f"Predict_proba failed: {e}, using predict instead")
        return model.predict(X)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load environment variables for OpenAI
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize OpenAI client
try:
    client = OpenAI(api_key=OPENAI_API_KEY)
    print("✅ OpenAI client initialized successfully!")
except Exception as e:
    print(f"❌ Error initializing OpenAI client: {e}")
    client = None

# Load models
try:
    stack_model = joblib.load("models/primary_hypertension_calibrated_final.pkl")
    scaler = joblib.load("models/optimized_scaler2.pkl") 
    imputer = joblib.load("models/optimized_imputer2.pkl")
    print("✅ Models loaded successfully!")
except Exception as e:
    print(f"❌ Error loading models: {e}")
    stack_model = scaler = imputer = None

# Define optimized features
optimized_features = [
    'age_activity_interaction', 'lifestyle_risk_score', 'active', 'INDFMPIR',
    'risk_acceleration', 'cv_metabolic_score', 'hypertension_risk_score',
    'bmi_income_interaction', 'ses_stress_index', 'RIDAGEYR',
    'BMI', 'BMXWAIST', 'waist_to_height', 'is_male',
    'age_log', 'age_squared', 'bmi_age_interaction',
    'salt_frequency_ordinal', 'DRQSPREP',
    'age_bmi_poly', 'waist_education_interaction'
]

def create_hypertension_features(df):
    """Create all engineered features for hypertension prediction"""
    df_eng = df.copy()
    
    # Basic derived features
    df_eng['waist_to_height'] = df_eng['BMXWAIST'] / df_eng['BMXHT']
    df_eng['age_squared'] = df_eng['RIDAGEYR'] ** 2
    
    # Handle salt frequency
    if 'DBD100' in df_eng.columns:
        df_eng['DBD100_cleaned'] = df_eng['DBD100'].replace({9: np.nan})
        df_eng['salt_frequency_ordinal'] = df_eng['DBD100_cleaned']
    else:
        df_eng['salt_frequency_ordinal'] = df_eng.get('salt_frequency_ordinal', 1)
    
    # Transformations
    df_eng['age_log'] = np.log1p(df_eng['RIDAGEYR'])
    df_eng['bmi_log'] = np.log1p(df_eng['BMI'])
    df_eng['bmi_squared'] = df_eng['BMI'] ** 2
    
    # Clinical risk scores
    df_eng['hypertension_risk_score'] = (
        (df_eng['RIDAGEYR'] / 10) * 2.5 +
        (df_eng['BMI'] - 22).clip(0, 25) * 1.8 +
        ((df_eng['BMXWAIST'] / df_eng['BMXHT']) - 0.45).clip(0, 0.5) * 200 +
        (1 - df_eng['active']) * 12 +
        (5 - df_eng['INDFMPIR'].clip(0, 5)) * 2.5 +
        (df_eng['salt_frequency_ordinal'] - 1) * 3.0 +
        (6 - df_eng['DRQSPREP']) * 2.0
    )
    
    df_eng['cv_metabolic_score'] = (
        np.exp((df_eng['RIDAGEYR'] - 35) / 12) +
        (df_eng['BMI'] ** 1.3) / 10 +
        ((df_eng['BMXWAIST'] - 80).clip(0, 50)) * 0.8 +
        (1 - df_eng['active']) * (df_eng['RIDAGEYR'] / 8)
    )
    
    # Interaction features
    df_eng['age_bmi_poly'] = (df_eng['RIDAGEYR'] ** 0.7) * (df_eng['BMI'] ** 1.4)
    df_eng['bmi_age_interaction'] = df_eng['RIDAGEYR'] * df_eng['BMI']
    df_eng['age_activity_interaction'] = df_eng['RIDAGEYR'] * (1 - df_eng['active'])
    df_eng['bmi_income_interaction'] = df_eng['BMI'] * (5 - df_eng['INDFMPIR'])
    
    if 'DMDEDUC2' in df_eng.columns:
        df_eng['waist_education_interaction'] = df_eng['BMXWAIST'] * (5 - df_eng['DMDEDUC2'])
    else:
        df_eng['waist_education_interaction'] = df_eng['BMXWAIST'] * 2.5
    
    # Behavioral composites
    df_eng['salt_risk_composite'] = (
        (df_eng['salt_frequency_ordinal'] - 1) * 2.5 +
        (6 - df_eng['DRQSPREP']) * 2.0 +
        ((df_eng['salt_frequency_ordinal'] - 1) * (6 - df_eng['DRQSPREP'])) * 0.4
    )
    
    if 'DMDEDUC2' in df_eng.columns:
        education_component = (5 - df_eng['DMDEDUC2'].clip(1, 5)) * 1.2
    else:
        education_component = 2.4
    
    df_eng['lifestyle_risk_score'] = (
        (1 - df_eng['active']) * 15 +
        (df_eng['salt_risk_composite'] / 2) +
        (5 - df_eng['INDFMPIR'].clip(0, 5)) * 1.5 +
        education_component
    )
    
    # Advanced features
    df_eng['risk_acceleration'] = df_eng['RIDAGEYR'] * df_eng['hypertension_risk_score'] / 1000
    
    if 'DMDEDUC2' in df_eng.columns and 'RIDRETH1' in df_eng.columns:
        ethnic_component = (df_eng['RIDRETH1'].isin([4, 5])).astype(int) * 1.5
    else:
        ethnic_component = 0
    
    df_eng['ses_stress_index'] = (
        (5 - df_eng['INDFMPIR']) * 2.5 +
        (5 - df_eng.get('DMDEDUC2', 3)) * 2.0 +
        ethnic_component
    )
    
    return df_eng

def get_interpretation(probability):
    """Get clinical interpretation based on probability"""
    if probability < 0.4:
        return "Low risk of hypertension. Maintain healthy lifestyle."
    elif probability < 0.6:
        return "Moderate risk. Consider lifestyle modifications and regular monitoring."
    else:
        return "High risk. Recommended to consult healthcare provider for assessment."

def generate_recommendations(patient_data, probability):
    """Generate AI-powered health recommendations"""
    if client is None:
        return ["AI recommendations unavailable - OpenAI client not configured"]
    
    risk_label = "High Risk" if probability >= 0.75 else "Moderate Risk" if probability >= 0.4 else "Low Risk"
    binary_prediction = "Positive" if probability > 0.5 else "Negative"
    
    prompt = f"""
You are a professional doctor assistant AI. A patient has the following data:

Age: {patient_data.get('RIDAGEYR', 'N/A')} years
BMI: {patient_data.get('BMI', 'N/A')}
Waist Circumference: {patient_data.get('BMXWAIST', 'N/A')} cm
Height: {patient_data.get('BMXHT', 'N/A')} cm
Physical Activity: {'Active' if patient_data.get('active') == 1 else 'Not Active'}
Income Level: {patient_data.get('INDFMPIR', 'N/A')}
Gender: {'Male' if patient_data.get('is_male') == 1 else 'Female'}
Do you add salt to food when cooking: {patient_data.get('DRQSPREP', 'N/A')} (1=Very often,2=Often,3=Sometimes,4=Rarely,5=Never)
Do you add salt to food at the table: {patient_data.get('salt_frequency_ordinal', 'N/A')} (1=Very often,2=Often,3=Sometimes,4=Rarely,5=Never)
Weight: {patient_data.get('BMXWT', 'N/A')} kg
Education: {patient_data.get('DMDEDUC2', 'N/A')} (1=Low, 5=High)

The patient has a primary hypertension risk prediction: {binary_prediction} ({risk_label}, probability={probability:.2f}).

Provide exactly 3-4 personalized, clear, and actionable health recommendations for this patient to manage or reduce primary hypertension risk. 

IMPORTANT FORMATTING RULES:
- Each recommendation should be 1-2 sentences maximum
- Do NOT use markdown formatting (no ###, **, * etc.)
- Do NOT number the recommendations
- Make them very concise and practical
- Focus on the most critical actions based on the patient's specific risk factors

Example format:
"Reduce sodium intake by choosing low-salt alternatives and using herbs instead of table salt"
"Increase physical activity to 30 minutes daily, such as brisk walking or cycling"
"Monitor blood pressure weekly and maintain a healthy weight through balanced nutrition"
"""
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1000  # Increased token limit
        )
        text = response.choices[0].message.content.strip()
        print("🤖 Raw AI response:", text)  # Debug line
        
        # Split by newlines and clean
        recommendations = []
        for line in text.split("\n"):
            line = line.strip()
            if not line:
                continue
            # Remove any remaining markdown, numbers, bullets
            cleaned = line.lstrip('1234567890.-•*" ').strip()
            # Remove quotes if present
            cleaned = cleaned.strip('"').strip()
            if (cleaned and 
                len(cleaned) > 15 and  # Slightly shorter minimum
                not cleaned.startswith(('Note:', 'Disclaimer:', 'Please note:', 'Example:', 'IMPORTANT:', 'Format:'))):
                recommendations.append(cleaned)
        
        # Ensure we have at least some recommendations
        if not recommendations:
            return get_fallback_recommendations(probability, patient_data)
        
        return recommendations[:4]  # Return max 4 recommendations
    
    except Exception as e:
        print("Error generating recommendations:", e)
        return get_fallback_recommendations(probability, patient_data)

def get_fallback_recommendations(probability, patient_data):
    """Provide fallback recommendations when AI fails"""
    risk_label = "High Risk" if probability >= 0.75 else "Moderate Risk" if probability >= 0.4 else "Low Risk"
    
    base_recommendations = [
        "Monitor blood pressure regularly and maintain a record of readings",
        "Reduce sodium intake by choosing fresh foods over processed options",
        "Engage in moderate physical activity for at least 30 minutes daily",
        "Maintain a healthy weight through balanced nutrition and portion control",
        "Limit alcohol consumption and avoid tobacco products",
        "Manage stress through relaxation techniques like deep breathing or meditation"
    ]
    
    # Customize based on risk level
    if risk_label == "High Risk":
        return base_recommendations[:4]
    elif risk_label == "Moderate Risk":
        return base_recommendations[1:5]
    else:
        return base_recommendations[2:6]
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    if stack_model and scaler and imputer:
        return jsonify({
            'status': 'healthy',
            'message': 'Hypertension Prediction API is running',
            'models_loaded': True,
            'openai_configured': client is not None
        })
    else:
        return jsonify({
            'status': 'unhealthy',
            'message': 'Models failed to load',
            'models_loaded': False
        }), 500

@app.route('/api/predict', methods=['POST'])
def predict_single():
    """Predict hypertension risk for a single patient"""
    if stack_model is None:
        return jsonify({'error': 'Models not loaded'}), 500
    
    try:
        data = request.json
        
        # Validate input
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        print("===== Received data from frontend =====")
        print(data)
        print("======================================")
        
        # Convert to DataFrame
        df_raw = pd.DataFrame([data])
        
        # Apply feature engineering
        df_engineered = create_hypertension_features(df_raw)
        
        # Select features
        available_features = [f for f in optimized_features if f in df_engineered.columns]
        X_input = df_engineered[available_features]
        
        # Preprocess
        X_imputed = imputer.transform(X_input)
        X_scaled = scaler.transform(X_imputed)
        
        # Predict
        probability = safe_predict_proba(stack_model, X_scaled)[0]
        
        # Determine risk level
        risk_level = "Low" if probability < 0.4 else "Moderate" if probability < 0.6 else "High"
        
        # Generate AI recommendations
        recommendations = generate_recommendations(data, probability)
        
        # Prepare response
        response = {
            'probability': round(float(probability), 3),
            'risk_level': risk_level,
            'binary_prediction': int(probability > 0.5),
            'interpretation': get_interpretation(probability),
            'features_used': len(available_features),
            'recommendations': recommendations
        }
        
        print(f"✅ Prediction successful: {probability:.3f} ({risk_level} Risk)")
        return jsonify(response)
    
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 400

@app.route('/api/predict-batch', methods=['POST'])
def predict_batch():
    """Predict hypertension risk for multiple patients"""
    if stack_model is None:
        return jsonify({'error': 'Models not loaded'}), 500
    
    try:
        data = request.json
        
        if not data or not isinstance(data, list):
            return jsonify({'error': 'Expected a list of patients'}), 400
        
        results = []
        
        for i, patient_data in enumerate(data):
            try:
                df_raw = pd.DataFrame([patient_data])
                df_engineered = create_hypertension_features(df_raw)
                
                available_features = [f for f in optimized_features if f in df_engineered.columns]
                X_input = df_engineered[available_features]
                
                X_imputed = imputer.transform(X_input)
                X_scaled = scaler.transform(X_imputed)
                
                probability = safe_predict_proba(stack_model, X_scaled)[0]
                risk_level = "Low" if probability < 0.4 else "Moderate" if probability < 0.6 else "High"
                
                results.append({
                    'patient_id': i,
                    'probability': round(float(probability), 3),
                    'risk_level': risk_level,
                    'binary_prediction': int(probability > 0.5),
                    'interpretation': get_interpretation(probability)
                })
                
            except Exception as e:
                results.append({
                    'patient_id': i,
                    'error': f'Failed to process patient: {str(e)}'
                })
        
        return jsonify({'predictions': results})
    
    except Exception as e:
        return jsonify({'error': f'Batch prediction failed: {str(e)}'}), 400

if __name__ == '__main__':
    print("🚀 Starting Hypertension Prediction API on port 8000...")
    print("📊 Endpoints:")
    print("   GET  http://localhost:8000/health")
    print("   POST http://localhost:8000/api/predict")
    print("   POST http://localhost:8000/api/predict-batch")
    print(f"🤖 OpenAI configured: {client is not None}")
    app.run(debug=True, host='0.0.0.0', port=8000)
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import re
from datetime import datetime
import os

app = Flask(__name__, static_folder='.')
CORS(app)

# --- Firebase Initialization ---
db = None
try:
    key_path = 'serviceAccountKey.json'
    if os.path.exists(key_path):
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase initialized successfully")
    else:
        print("❌ Error: serviceAccountKey.json not found")
except Exception as e:
    print(f"❌ Firebase Error: {e}")

# --- Helper Logic ---
def get_risk_level(report_count, starts_with_11=False):
    # Immediate High Risk logic for numbers starting with 11
    if starts_with_11:
        return {"level": "CRITICAL SCAM", "color": "#dc3545", "description": "High-risk scam pattern detected (Starts with 11)."}
    
    if report_count == 0:
        return {"level": "LOW", "color": "#4cc9f0", "description": "No reports found for this number."}
    elif report_count < 3:
        return {"level": "MEDIUM", "color": "#f8961e", "description": "This number has been reported a few times."}
    else:
        return {"level": "HIGH", "color": "#f72585", "description": "Warning: Multiple scam reports associated with this number."}

# --- API Routes ---

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/stats', methods=['GET'])
def get_stats():
    if not db: return jsonify({"error": "DB Offline"}), 500
    try:
        phones = db.collection('phone_numbers').stream()
        total_tracked = 0
        high_risk = 0
        for doc in phones:
            total_tracked += 1
            if doc.to_dict().get('report_count', 0) >= 3:
                high_risk += 1
        return jsonify({"total_tracked": total_tracked, "high_risk_numbers": high_risk})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recent-reports', methods=['GET'])
def get_recent():
    if not db: return jsonify({"error": "DB Offline"}), 500
    try:
        reports = db.collection('reports').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(5).stream()
        recent = []
        for doc in reports:
            data = doc.to_dict()
            recent.append({
                "phone": data.get('phone'),
                "category": data.get('category'),
                "time": data.get('timestamp').strftime("%b %d, %H:%M")
            })
        return jsonify(recent)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/check-number', methods=['POST'])
def check_number():
    if not db: return jsonify({"error": "DB Offline"}), 500
    try:
        data = request.json
        # Clean input: remove non-numeric characters
        phone = re.sub(r'\D', '', data.get('phone', ''))
        
        # Check for our specific "11" scam logic
        is_pattern_scam = phone.startswith('11')
        
        # Check database for existing reports
        doc = db.collection('phone_numbers').document(phone).get()
        report_count = doc.to_dict().get('report_count', 0) if doc.exists else 0
        
        # Get risk data using both report count and prefix logic
        risk = get_risk_level(report_count, starts_with_11=is_pattern_scam)
        
        return jsonify({
            "phone": phone, 
            "risk": risk, 
            "report_count": report_count,
            "message": risk["description"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/report-number', methods=['POST'])
def report_number():
    if not db: return jsonify({"error": "DB Offline"}), 500
    try:
        data = request.json
        phone = re.sub(r'\D', '', data.get('phone', ''))
        category = data.get('category')
        desc = data.get('description', '')
        
        if not phone:
            return jsonify({"error": "Phone number is required"}), 400

        # Update or create the phone record
        phone_ref = db.collection('phone_numbers').document(phone)
        if phone_ref.get().exists:
            phone_ref.update({'report_count': firestore.Increment(1)})
        else:
            phone_ref.set({
                'phone': phone, 
                'report_count': 1, 
                'created_at': datetime.now()
            })
        
        # Add a new report log
        db.collection('reports').add({
            'phone': phone, 
            'category': category, 
            'description': desc, 
            'timestamp': datetime.now()
        })
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Using port 5005 as per your original code
    app.run(debug=True, port=5005)
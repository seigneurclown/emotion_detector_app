import sys
import base64
import os

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass
from datetime import datetime, timezone
import cv2
import numpy as np
import torch
import torch.nn as nn
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
# Enable CORS for all routes and origins
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# ==========================================
# 1. Cấu hình MongoDB
# ==========================================
MONGO_URI = os.getenv(
    'MONGO_URI',
    'mongodb://admin:password123@localhost:27017/emotion_db?authSource=admin'
)
mongo_client = None
db = None

def get_db():
    global mongo_client, db
    if db is not None:
        try:
            mongo_client.admin.command('ping')
            return db
        except Exception:
            db = None
    try:
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        mongo_client.admin.command('ping')
        db = mongo_client['emotion_db']
        return db
    except Exception:
        try:
            # Fallback không dùng authSource
            mongo_client = MongoClient('mongodb://localhost:27017/emotion_db', serverSelectionTimeoutMS=1500)
            mongo_client.admin.command('ping')
            db = mongo_client['emotion_db']
            return db
        except Exception:
            return None

def serialize_doc(doc):
    """Chuyển đổi ObjectId và Datetime sang định dạng JSON-serializable."""
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for k, v in doc.items():
            if k == '_id':
                continue
            if isinstance(v, (datetime,)):
                result[k] = v.isoformat()
            else:
                result[k] = serialize_doc(v)
        return result
    if isinstance(doc, (datetime,)):
        return doc.isoformat()
    return doc

# ==========================================
# 2. Định nghĩa mô hình PyTorch & Load weights
# ==========================================
class EmotionCNN(nn.Module):
    def __init__(self, num_classes=7):
        super(EmotionCNN, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2, 2)
        )
        self.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(128 * 6 * 6, 256),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        return self.classifier(x)

EMOTIONS = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral']
device = torch.device('cpu')

# Nạp model
model = EmotionCNN(num_classes=7)
model.load_state_dict(torch.load('fer2013_model.pth', map_location=device))
model.eval()

# Nạp Face Detector
face_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')

# ==========================================
# 3. Routes nhận diện AI & Giao diện cũ
# ==========================================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['GET', 'POST', 'OPTIONS'])
def predict():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400

        # Giải mã ảnh từ Base64 do trình duyệt gửi lên
        image_data = data['image'].split(',')[1] if ',' in data['image'] else data['image']
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Invalid image format'}), 400

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

        results = []
        for (x, y, w, h) in faces:
            face_roi = gray[y:y+h, x:x+w]
            face_roi = cv2.resize(face_roi, (48, 48))

            face_tensor = face_roi.astype(np.float32) / 255.0
            face_tensor = (face_tensor - 0.5) / 0.5
            face_tensor = torch.tensor(face_tensor).unsqueeze(0).unsqueeze(0).to(device)

            with torch.no_grad():
                output = model(face_tensor)
                probs = torch.softmax(output, dim=1)
                pred_idx = torch.argmax(probs, dim=1).item()
                confidence = float(probs[0][pred_idx].item())

            results.append({
                'box': {'x': int(x), 'y': int(y), 'w': int(w), 'h': int(h)},
                'emotion': EMOTIONS[pred_idx],
                'confidence': round(confidence * 100, 1)
            })

        return jsonify({'faces': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==========================================
# 4. RESTful APIs quản lý Logs & Analytics
# ==========================================

@app.route('/api/logs', methods=['POST', 'OPTIONS'])
def save_logs():
    """Lưu batch kết quả nhận diện vào prediction_logs và cập nhật detection_sessions."""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    database = get_db()
    if database is None:
        return jsonify({
            'error': 'MongoDB chưa sẵn sàng. Hãy đảm bảo container emotion_mongodb đang chạy trên port 27017.'
        }), 503

    try:
        data = request.get_json() or {}
        session_id = data.get('session_id')
        user_email = data.get('user_email', 'anonymous@user.com')
        faces = data.get('faces', [])

        if not session_id:
            return jsonify({'error': 'session_id là bắt buộc'}), 400

        if not faces:
            return jsonify({'message': 'Không có khuôn mặt nào để lưu', 'inserted_count': 0}), 200

        now_utc = datetime.now(timezone.utc)
        records = []
        for f in faces:
            records.append({
                'session_id': session_id,
                'user_email': user_email,
                'timestamp': now_utc,
                'emotion': f.get('emotion', 'Neutral'),
                'confidence': float(f.get('confidence', 0.0)),
                'box': f.get('box', {})
            })

        # Batch insert vào collection prediction_logs
        insert_res = database['prediction_logs'].insert_many(records)
        inserted_count = len(insert_res.inserted_ids)

        # Cập nhật thông tin phiên vào detection_sessions (upsert)
        database['detection_sessions'].update_one(
            {'session_id': session_id},
            {
                '$setOnInsert': {
                    'session_id': session_id,
                    'user_email': user_email,
                    'created_at': now_utc
                },
                '$set': {
                    'last_active': now_utc,
                    'user_email': user_email
                },
                '$inc': {
                    'total_logs': inserted_count
                }
            },
            upsert=True
        )

        return jsonify({
            'status': 'success',
            'session_id': session_id,
            'inserted_count': inserted_count
        }), 201

    except Exception as e:
        return jsonify({'error': f'Lỗi lưu log: {str(e)}'}), 500


@app.route('/api/sessions', methods=['GET', 'OPTIONS'])
def get_sessions():
    """Trả về danh sách 10 phiên gần nhất sắp xếp giảm dần theo thời gian tạo."""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    database = get_db()
    if database is None:
        return jsonify({
            'error': 'MongoDB chưa sẵn sàng. Vui lòng kiểm tra Docker.',
            'sessions': []
        }), 503

    try:
        sessions_cursor = database['detection_sessions'].find(
            {}, {'_id': 0}
        ).sort('created_at', -1).limit(10)

        sessions = list(sessions_cursor)
        return jsonify({'sessions': serialize_doc(sessions)}), 200
    except Exception as e:
        return jsonify({'error': f'Lỗi lấy danh sách phiên: {str(e)}', 'sessions': []}), 500


@app.route('/api/analytics/<session_id>', methods=['GET', 'OPTIONS'])
def get_analytics(session_id):
    """
    Trả về dữ liệu phân tích:
    - distribution: Thống kê số lượng 7 cảm xúc bằng MongoDB Aggregation Pipeline ($group)
    - timeline: 50 bản ghi gần nhất có timestamp, emotion, confidence
    - Chỉ số tổng quan: total_logs, dominant_emotion, avg_confidence
    """
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    database = get_db()
    if database is None:
        return jsonify({
            'error': 'MongoDB chưa sẵn sàng',
            'distribution': {em: 0 for em in EMOTIONS},
            'timeline': [],
            'total_logs': 0,
            'dominant_emotion': None,
            'avg_confidence': 0.0
        }), 503

    try:
        match_query = {}
        if session_id and session_id.lower() != 'all':
            match_query['session_id'] = session_id

        # 1. Emotion distribution via Aggregation Pipeline
        pipeline = [
            {'$match': match_query},
            {'$group': {'_id': '$emotion', 'count': {'$sum': 1}}}
        ]
        agg_results = list(database['prediction_logs'].aggregate(pipeline))

        distribution = {em: 0 for em in EMOTIONS}
        for item in agg_results:
            em = item.get('_id')
            if em in distribution:
                distribution[em] = item['count']
            elif em:
                distribution[em] = item['count']

        total_logs = sum(distribution.values())

        # 2. Timeline: 50 bản ghi gần nhất
        timeline_docs = list(
            database['prediction_logs']
            .find(match_query, {'_id': 0, 'timestamp': 1, 'emotion': 1, 'confidence': 1})
            .sort('timestamp', -1)
            .limit(50)
        )
        # Sắp xếp lại tăng dần theo thời gian để vẽ biểu đồ line mượt
        timeline_docs.reverse()

        # 3. Dominant Emotion
        dominant_emotion = None
        if total_logs > 0:
            dominant_emotion = max(distribution, key=distribution.get)

        # 4. Average Confidence
        avg_confidence = 0.0
        if total_logs > 0:
            conf_pipeline = [
                {'$match': match_query},
                {'$group': {'_id': None, 'avg_conf': {'$avg': '$confidence'}}}
            ]
            conf_res = list(database['prediction_logs'].aggregate(conf_pipeline))
            if conf_res and conf_res[0].get('avg_conf') is not None:
                avg_confidence = round(float(conf_res[0]['avg_conf']), 1)

        return jsonify({
            'session_id': session_id,
            'total_logs': total_logs,
            'dominant_emotion': dominant_emotion,
            'avg_confidence': avg_confidence,
            'distribution': distribution,
            'timeline': serialize_doc(timeline_docs)
        }), 200

    except Exception as e:
        return jsonify({'error': f'Lỗi phân tích dữ liệu: {str(e)}'}), 500


if __name__ == '__main__':
    print("[AI Server] Flask AI & MongoDB API server started at http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
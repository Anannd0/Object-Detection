from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import os
import numpy as np
from werkzeug.utils import secure_filename
import base64
from io import BytesIO
from PIL import Image
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
import sqlite3
from datetime import datetime
import json
from vision_api import VisionAPIDetector

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)                                      
CORS(app)

               
UPLOAD_FOLDER = 'uploads'
RESULT_FOLDER = 'results'
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

                                    
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

                
DATABASE = 'detection_history.db'
def init_db():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
                             
    c.execute('''
        CREATE TABLE IF NOT EXISTS detections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            detection_type TEXT NOT NULL,
            filename TEXT,
            result_path TEXT,
            detections_json TEXT,
            total_objects INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
                                                  
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            subscription_type TEXT DEFAULT 'free',
            detection_count INTEGER DEFAULT 0
        )
    ''')
    
                                                              
    c.execute('''
        CREATE TABLE IF NOT EXISTS captured_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            image_path TEXT NOT NULL,
            detections_json TEXT,
            total_objects INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def get_user_subscription(user_id):
    conn = get_db()
    c = conn.cursor()
    
    c.execute('SELECT subscription_type, detection_count FROM users WHERE user_id = ?', (user_id,))
    row = c.fetchone()
    conn.close()
    
    if row:
        return row['subscription_type'], row['detection_count']
    else:

        conn = get_db()
        c = conn.cursor()
        c.execute('INSERT INTO users (user_id, subscription_type, detection_count) VALUES (?, ?, ?)',
                 (user_id, 'free', 0))
        conn.commit()
        conn.close()
        return 'free', 0

def check_detection_limit(user_id):

    subscription_type, detection_count = get_user_subscription(user_id)
    
    if subscription_type == 'free':
        return detection_count < 10, detection_count, 10
    else:
        return True, detection_count, -1                            

def increment_detection_count(user_id):

    conn = get_db()
    c = conn.cursor()
    

    c.execute('SELECT detection_count FROM users WHERE user_id = ?', (user_id,))
    row = c.fetchone()
    
    if row:
        new_count = row['detection_count'] + 1
        c.execute('UPDATE users SET detection_count = ? WHERE user_id = ?', (new_count, user_id))
    else:
                                      
        c.execute('INSERT INTO users (user_id, subscription_type, detection_count) VALUES (?, ?, ?)',
                 (user_id, 'free', 1))
        new_count = 1
    
    conn.commit()
    conn.close()
    return new_count

def save_detection(user_id, detection_type, filename, result_path, detections, total_objects):
    conn = get_db()
    c = conn.cursor()
    
    detections_json = json.dumps(detections)
    
    c.execute('''
        INSERT INTO detections (user_id, detection_type, filename, result_path, detections_json, total_objects)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, detection_type, filename, result_path, detections_json, total_objects))
    
    conn.commit()
    conn.close()
    return c.lastrowid

                                
init_db()

                 
model_path = 'Yolo Weight Checking/yolov8n.pt'
if not os.path.exists(model_path):
    model_path = 'Yolo with Image/yolov8n.pt'
model = YOLO(model_path)

                                         
                                                                                        
vision_credentials_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
if not vision_credentials_path and os.path.exists('google-credentials.json'):
    vision_credentials_path = 'google-credentials.json'

vision_detector = VisionAPIDetector(credentials_path=vision_credentials_path)

                                                           
                                                          
users = {
    'admin': generate_password_hash('admin')
}
user_emails = {}

def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/', methods=['GET'])
def landing():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('create_account'))

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route('/create-account', methods=['GET', 'POST'])
def create_account():
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        username = (data.get('username') or '').strip()
        email = (data.get('email') or '').strip()
        password = data.get('password') or ''
        confirm_password = data.get('confirm_password') or ''
        
        if not username or not email or not password or not confirm_password:
            return jsonify({'success': False, 'error': 'All fields are required.'}), 400
        
        if password != confirm_password:
            return jsonify({'success': False, 'error': 'Passwords do not match.'}), 400
        
        if username in users:
            return jsonify({'success': False, 'error': 'Username already exists.'}), 400
        
        users[username] = generate_password_hash(password)
        user_emails[username] = email
        get_user_subscription(username)
        return jsonify({'success': True, 'message': 'Account created. Redirecting to sign in.'})
    
    return render_template('create_account.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username in users and check_password_hash(users[username], password):
            session['user_id'] = username
            return jsonify({'success': True, 'redirect': url_for('dashboard')})
        else:
            return jsonify({'success': False, 'error': 'Invalid username or password'}), 401
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/detection_count', methods=['GET'])
@login_required
def get_detection_count():
    try:
        user_id = session.get('user_id', 'admin')
        _, current_count, limit = check_detection_limit(user_id)
        return jsonify({
            'success': True,
            'current_count': current_count,
            'limit': limit,
            'remaining': limit - current_count if limit > 0 else -1
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vision_status', methods=['GET'])
@login_required
def get_vision_status():
    return jsonify({
        'success': True,
        'enabled': vision_detector.is_enabled(),
        'message': 'Google Vision API is available' if vision_detector.is_enabled() else 'Google Vision API is not configured'
    })

@app.route('/api/detect_labels', methods=['POST'])
@login_required
def detect_labels():
    try:
        if not vision_detector.is_enabled():
            return jsonify({'error': 'Google Vision API is not configured'}), 400
        
                               
        user_id = session.get('user_id', 'admin')
        can_detect, current_count, limit = check_detection_limit(user_id)
        
        if not can_detect:
            return jsonify({
                'error': f'Detection limit reached! You have used {current_count}/{limit} detections.',
                'limit_reached': True
            }), 403
        
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
            return jsonify({'error': 'Invalid file type'}), 400
        
                            
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
                                    
        labels = vision_detector.detect_labels(filepath)
        
                                   
        increment_detection_count(user_id)
        
                  
        os.remove(filepath)
        
        return jsonify({
            'success': True,
            'labels': labels,
            'total_labels': len(labels)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/detection')
@login_required
def detection():
    return render_template('index.html')

@app.route('/account')
@login_required
def account():
    return render_template('account.html')

@app.route('/history')
@login_required
def history():
    return render_template('history.html')

@app.route('/subscription')
@login_required
def subscription():
    return render_template('subscription.html')

@app.route('/about')
@login_required
def about():
    return render_template('about.html')

@app.route('/detect_image', methods=['POST'])
@login_required
def detect_image():
    try:
                                     
        user_id = session.get('user_id', 'admin')
        can_detect, current_count, limit = check_detection_limit(user_id)
        
        if not can_detect:
            return jsonify({
                'error': f'Detection limit reached! You have used {current_count}/{limit} detections. Please upgrade to Pro for unlimited detections.',
                'limit_reached': True,
                'current_count': current_count,
                'limit': limit
            }), 403
        
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
            return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, BMP'}), 400
        
                                              
        detection_method = request.form.get('method', 'yolo').lower()
        
                            
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        detections = []
        annotated_img = None
        
                                 
        if detection_method == 'vision' and vision_detector.is_enabled():
                                   
            try:
                result = vision_detector.detect_objects(filepath)
                detections = result['detections']
                annotated_img = result['annotated_image']
            except Exception as e:
                return jsonify({'error': f'Vision API error: {str(e)}'}), 500
        else:
                                
            if detection_method == 'vision' and not vision_detector.is_enabled():
                                                              
                pass
            
                                
            results = model(filepath)
            
                                 
            annotated_img = results[0].plot()
            
                                   
            for r in results:
                for box in r.boxes:
                    x1, y1, x2, y2 = map(float, box.xyxy[0])
                    conf = float(box.conf[0])
                    class_id = int(box.cls[0])
                    label = model.names[class_id]
                    
                    detections.append({
                        'label': label,
                        'confidence': round(conf * 100, 2),
                        'bbox': [float(x1), float(y1), float(x2), float(y2)]
                    })
        
                                        
        img_pil = Image.fromarray(cv2.cvtColor(annotated_img, cv2.COLOR_BGR2RGB))
        buffered = BytesIO()
        img_pil.save(buffered, format="JPEG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
                                   
        new_count = increment_detection_count(user_id)
        
                                    
        save_detection(
            user_id=user_id,
            detection_type='image',
            filename=filename,
            result_path=None,                             
            detections=detections,
            total_objects=len(detections)
        )
        
                                
        os.remove(filepath)
        
                           
        _, updated_count, limit = check_detection_limit(user_id)
        
        return jsonify({
            'success': True,
            'image': f'data:image/jpeg;base64,{img_base64}',
            'detections': detections,
            'detection_count': updated_count,
            'detection_limit': limit,
            'method': detection_method if (detection_method == 'vision' and vision_detector.is_enabled()) else 'yolo'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/detect_video', methods=['POST'])
@login_required
def detect_video():
    try:
                                     
        user_id = session.get('user_id', 'admin')
        can_detect, current_count, limit = check_detection_limit(user_id)
        
        if not can_detect:
            return jsonify({
                'error': f'Detection limit reached! You have used {current_count}/{limit} detections. Please upgrade to Pro for unlimited detections.',
                'limit_reached': True,
                'current_count': current_count,
                'limit': limit
            }), 403
        
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        file = request.files['video']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename, ALLOWED_VIDEO_EXTENSIONS):
            return jsonify({'error': 'Invalid file type. Allowed: MP4, AVI, MOV, MKV, WEBM'}), 400
        
                            
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
                                 
        cap = cv2.VideoCapture(filepath)
        
                              
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
                                                                               
        output_filename = f'result_{filename}'
        output_path = os.path.join(RESULT_FOLDER, output_filename)
        
                                                  
        fourcc = cv2.VideoWriter_fourcc(*'avc1')               
        if not fourcc:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')            
        
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        frame_count = 0
        all_detections = []
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
                                    
            results = model(frame, stream=True)
            
            for r in results:
                annotated_frame = r.plot()
                out.write(annotated_frame)
                
                                                   
                frame_detections = []
                for box in r.boxes:
                    x1, y1, x2, y2 = map(float, box.xyxy[0])
                    conf = float(box.conf[0])
                    class_id = int(box.cls[0])
                    label = model.names[class_id]
                    
                    frame_detections.append({
                        'label': label,
                        'confidence': round(conf * 100, 2),
                        'bbox': [float(x1), float(y1), float(x2), float(y2)]
                    })
                
                if frame_detections:
                    all_detections.append({
                        'frame': frame_count,
                        'detections': frame_detections
                    })
            
            frame_count += 1
        
        cap.release()
        out.release()
        
                                   
        new_count = increment_detection_count(user_id)
        
                                                
        unique_objects = {}
        for frame_det in all_detections:
            for det in frame_det['detections']:
                label = det['label']
                if label not in unique_objects:
                    unique_objects[label] = 0
                unique_objects[label] += 1
        
        save_detection(
            user_id=user_id,
            detection_type='video',
            filename=filename,
            result_path=output_filename,
            detections=all_detections[:10],                        
            total_objects=len(unique_objects)
        )
        
                                
        os.remove(filepath)
        
                           
        _, current_count, limit = check_detection_limit(user_id)
        
        return jsonify({
            'success': True,
            'video_url': f'/results/{output_filename}',
            'total_frames': frame_count,
            'detections_summary': all_detections[:10],                                   
            'detection_count': current_count,
            'detection_limit': limit
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/results/<filename>')
@login_required
def get_result(filename):
    filepath = os.path.join(RESULT_FOLDER, filename)
    if os.path.exists(filepath):
        return send_file(filepath, mimetype='video/mp4', as_attachment=False)
    return jsonify({'error': 'File not found'}), 404

@app.route('/webcam_frame', methods=['POST'])
@login_required
def webcam_frame():
    try:
                                        
        data = request.get_json()
        if 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
                                              
        detection_method = data.get('method', 'yolo').lower()
        
                             
        image_data = data['image'].split(',')[1]                                         
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'error': 'Failed to decode image'}), 400
        
        detections = []
        annotated_frame = None
        
                                 
        if detection_method == 'vision' and vision_detector.is_enabled():
                                   
            try:
                result = vision_detector.detect_objects(frame)
                detections = result['detections']
                annotated_frame = result['annotated_image']
            except Exception as e:
                                           
                results = model(frame, stream=True)
                for r in results:
                    annotated_frame = r.plot()
                    for box in r.boxes:
                        x1, y1, x2, y2 = map(float, box.xyxy[0])
                        conf = float(box.conf[0])
                        class_id = int(box.cls[0])
                        label = model.names[class_id]
                        detections.append({
                            'label': label,
                            'confidence': round(conf * 100, 2),
                            'bbox': [float(x1), float(y1), float(x2), float(y2)]
                        })
        else:
                                
            results = model(frame, stream=True)
            
            for r in results:
                annotated_frame = r.plot()
                
                                    
                for box in r.boxes:
                    x1, y1, x2, y2 = map(float, box.xyxy[0])
                    conf = float(box.conf[0])
                    class_id = int(box.cls[0])
                    label = model.names[class_id]
                    
                    detections.append({
                        'label': label,
                        'confidence': round(conf * 100, 2),
                        'bbox': [float(x1), float(y1), float(x2), float(y2)]
                    })
        
        if annotated_frame is None:
            annotated_frame = frame
        
                                
        img_pil = Image.fromarray(cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB))
        buffered = BytesIO()
        img_pil.save(buffered, format="JPEG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return jsonify({
            'success': True,
            'image': f'data:image/jpeg;base64,{img_base64}',
            'detections': detections,
            'method': detection_method if (detection_method == 'vision' and vision_detector.is_enabled()) else 'yolo'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save_live_detection', methods=['POST'])
@login_required
def save_live_detection():
    try:
        user_id = session.get('user_id', 'admin')
        data = request.get_json()
        
        if 'detections' not in data:
            return jsonify({'error': 'No detections data provided'}), 400
        
                                                    
        all_detections = data.get('detections', [])
        
                             
        total_objects = len(all_detections)
        
                          
        filename = f"Live Detection Session - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        detection_id = save_detection(
            user_id=user_id,
            detection_type='realtime',
            filename=filename,
            result_path=None,                              
            detections=all_detections,
            total_objects=total_objects
        )
        
        return jsonify({
            'success': True,
            'detection_id': detection_id,
            'message': 'Live detection session saved to history'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
@login_required
def get_history():
    try:
        user_id = session.get('user_id', 'admin')
        conn = get_db()
        c = conn.cursor()
        
                                                                   
        c.execute('''
            SELECT id, detection_type, filename, result_path, detections_json, 
                   total_objects, created_at
            FROM detections
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 100
        ''', (user_id,))
        
        detection_rows = c.fetchall()
        
                                                                        
        c.execute('''
            SELECT id, image_path, detections_json, total_objects, created_at
            FROM captured_images
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 100
        ''', (user_id,))
        
        capture_rows = c.fetchall()
        conn.close()
        
        history = []
        
                                   
        for row in detection_rows:
            history.append({
                'id': row['id'],
                'type': row['detection_type'],
                'filename': row['filename'],
                'result_path': row['result_path'],
                'detections': json.loads(row['detections_json']) if row['detections_json'] else [],
                'total_objects': row['total_objects'],
                'created_at': row['created_at']
            })
        
                                        
        for row in capture_rows:
                                                                               
            image_path = row['image_path'] or ''
                                       
            image_path_normalized = image_path.replace('\\', '/')
            filename = os.path.basename(image_path_normalized) if image_path_normalized else 'Captured Image'
            
            history.append({
                'id': f"capture_{row['id']}",
                'type': 'capture',
                'filename': filename,
                'image_path': image_path_normalized,                       
                'result_path': None,
                'detections': json.loads(row['detections_json']) if row['detections_json'] else [],
                'total_objects': row['total_objects'],
                'created_at': row['created_at']
            })
        
                                                   
        history.sort(key=lambda x: x['created_at'], reverse=True)
        
                                        
        history = history[:100]
        
        return jsonify({'success': True, 'history': history})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

                                                       

@app.route('/api/capture_live_image', methods=['POST'])
@login_required
def capture_live_image():
    try:
        user_id = session.get('user_id', 'admin')
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
                             
        image_data = data['image'].split(',')[1]                                         
        image_bytes = base64.b64decode(image_data)
        
                                       
        os.makedirs('captures', exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        filename = f'capture_{user_id}_{timestamp}.jpg'
        image_path = os.path.join('captures', filename)
        
                                                                                 
        image_path = image_path.replace('\\', '/')
        
        with open(image_path, 'wb') as f:
            f.write(image_bytes)
        
                                    
        detections = data.get('detections', [])
        total_objects = len(detections)
        
                                                                       
        conn = get_db()
        c = conn.cursor()
        detections_json = json.dumps(detections)
        
        c.execute('''
            INSERT INTO captured_images (user_id, image_path, detections_json, total_objects)
            VALUES (?, ?, ?, ?)
        ''', (user_id, image_path, detections_json, total_objects))
        
        conn.commit()
        capture_id = c.lastrowid
        conn.close()
        
        return jsonify({
            'success': True,
            'capture_id': capture_id,
            'image_path': image_path,
            'message': 'Image captured and saved successfully'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/captured_images', methods=['GET'])
@login_required
def get_captured_images():
    try:
        user_id = session.get('user_id', 'admin')
        conn = get_db()
        c = conn.cursor()
        
                                                                        
        c.execute('''
            SELECT id, image_path, detections_json, total_objects, created_at
            FROM captured_images
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 100
        ''', (user_id,))
        
        rows = c.fetchall()
        conn.close()
        
        captures = []
        for row in rows:
            captures.append({
                'id': row['id'],
                'image_path': row['image_path'],
                'detections': json.loads(row['detections_json']) if row['detections_json'] else [],
                'total_objects': row['total_objects'],
                'created_at': row['created_at']
            })
        
        return jsonify({'success': True, 'captures': captures})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/captures/<path:filename>')
@login_required
def serve_capture(filename):

    from urllib.parse import unquote
    

    filename = unquote(filename)
    

    filename = filename.replace('\\', '/')
    filename = os.path.basename(filename)
    
    filepath = os.path.join('captures', filename)
    
    filepath = os.path.normpath(filepath)
    
    if os.path.exists(filepath) and os.path.isfile(filepath):

        captures_dir = os.path.normpath(os.path.abspath('captures'))
        file_abspath = os.path.normpath(os.path.abspath(filepath))
        if captures_dir in file_abspath or file_abspath.startswith(captures_dir):
            return send_file(filepath, mimetype='image/jpeg', as_attachment=False)
    

    return jsonify({'error': 'File not found'}), 404

@app.route('/api/clear_data', methods=['POST'])
@login_required
def clear_data():

    try:
        user_id = session.get('user_id', 'admin')
        conn = get_db()
        c = conn.cursor()
        

        c.execute('DELETE FROM detections WHERE user_id = ?', (user_id,))
        

        c.execute('SELECT image_path FROM captured_images WHERE user_id = ?', (user_id,))
        image_paths = c.fetchall()
        

        c.execute('DELETE FROM captured_images WHERE user_id = ?', (user_id,))
        

        for row in image_paths:
            image_path = row['image_path']
            if image_path and os.path.exists(image_path):
                try:
                    os.remove(image_path)
                except Exception as e:
                    print(f"Error deleting image {image_path}: {e}")
        
                               
        c.execute('UPDATE users SET detection_count = 0 WHERE user_id = ?', (user_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'All data cleared successfully'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    use_https = os.environ.get('AETHER_HTTPS', '1') == '1'
    if use_https:
        try:
            app.run(debug=True, host='0.0.0.0', port=5000, ssl_context='adhoc')
        except TypeError as e:
            print(str(e))
            print('Install cryptography to enable HTTPS: pip install cryptography')
            print('Or run without HTTPS: set AETHER_HTTPS=0')
            app.run(debug=True, host='0.0.0.0', port=5000)
    else:
        app.run(debug=True, host='0.0.0.0', port=5000)

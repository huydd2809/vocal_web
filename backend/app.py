from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid

app = Flask(__name__)
# Cho phép Frontend gọi API tới Backend
CORS(app)

# Lấy đường dẫn tuyệt đối của thư mục chứa file app.py hiện tại (tức là thư mục backend)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Ép đường dẫn file json luôn nằm trong thư mục backend này
DATA_FILE = os.path.join(BASE_DIR, 'vocabulary.json')

# Hàm đọc dữ liệu từ file JSON
def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except:
            return []

# Hàm lưu dữ liệu vào file JSON
def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# 1. API: Lấy danh sách từ vựng (Có hỗ trợ lọc theo Unit và Cấp độ)
@app.route('/api/words', methods=['GET'])
def get_words():
    unit = request.args.get('unit', 'all')
    level = request.args.get('level', 'all')
    
    words = load_data()
    
    # Lọc theo Unit nếu không chọn "Tất cả"
    if unit != 'all':
        words = [w for w in words if w.get('unit') == unit]
        
    # Lọc theo Level nếu không chọn "Tất cả"
    if level != 'all':
        words = [w for w in words if str(w.get('level')) == level]
        
    return jsonify(words)

# 2. API: Thêm từ vựng mới
@app.route('/api/words', methods=['POST'])
def add_word():
    data = request.json
    words = load_data()
    
    new_word = {
        "id": str(uuid.uuid4()), # Tạo ID ngẫu nhiên không trùng lặp
        "english": data.get('english'),
        "vietnamese": data.get('vietnamese'),
        "type": data.get('type'),
        "pronunciation": data.get('pronunciation'),
        "unit": data.get('unit'),
        "level": 1, # Từ mới thêm vào mặc định là Cấp 1
        # MỚI: Thêm dữ liệu Trường từ vựng
        "word_family": data.get('word_family', {})
    }
    
    words.append(new_word)
    save_data(words)
    return jsonify({"message": "Thêm từ thành công!", "word": new_word}), 201

# 3. API: Cập nhật cấp độ của từ vựng (Khi làm đúng hoặc khi chọn thủ công)
@app.route('/api/words/<word_id>', methods=['PUT'])
def update_level(word_id):
    data = request.json
    new_level = data.get('level')
    words = load_data()
    
    for w in words:
        if w.get('id') == word_id:
            # Đảm bảo level không vượt quá 4
            w['level'] = min(int(new_level), 4)
            save_data(words)
            return jsonify({"message": "Cập nhật cấp độ thành công!", "new_level": w['level']})
            
    return jsonify({"error": "Không tìm thấy từ vựng này"}), 404

# Chạy server
if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)
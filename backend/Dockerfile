# Sử dụng Python phiên bản nhẹ (slim) làm base image
FROM python:3.10-slim

# Thiết lập thư mục làm việc bên trong container
WORKDIR /app

# Copy file requirements.txt vào trước để tận dụng cache của Docker
COPY requirements.txt .

# Cài đặt các thư viện cần thiết
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code còn lại của thư mục backend vào container
COPY . .

# Mở port mà app Python của bạn đang chạy (ví dụ: Flask mặc định là 5000)
EXPOSE 5000

# Lệnh để chạy ứng dụng khi container khởi động
CMD ["python", "app.py"]
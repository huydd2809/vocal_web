# Sử dụng Nginx bản nhẹ làm base image
FROM nginx:alpine

# Xóa các file mặc định của Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copy toàn bộ file tĩnh từ thư mục frontend vào thư mục phục vụ web của Nginx
COPY . /usr/share/nginx/html

# Nginx mặc định chạy ở port 80
EXPOSE 80

# Chạy Nginx ở chế độ foreground để container không bị tắt
CMD ["nginx", "-g", "daemon off;"]
# Hướng Dẫn Triển Khai Hệ Thống (Production Deployment Guide)
### Ứng dụng Quản Lý Chi Tiêu Thông Minh 1.0 (Next.js 16 + Prisma + PostgreSQL + Gemini AI)

Tài liệu này cung cấp quy trình chuẩn hóa để triển khai ứng dụng lên môi trường Production an toàn, tin cậy và đạt chuẩn bảo mật ngân hàng.

---

## 1. Yêu Cầu Hạ Tầng & Hệ Điều Hành

| Thành phần | Yêu cầu tối thiểu | Khuyến nghị Production |
|---|---|---|
| **Node.js** | v20.x LTS | v22.x LTS |
| **Cơ sở dữ liệu** | PostgreSQL 15 | PostgreSQL 16 có Connection Pooling (PgBouncer) |
| **RAM** | 2 GB | 4 GB trở lên |
| **CPU** | 2 Cores | 4 Cores |
| **Bộ nhớ ổ cứng** | 20 GB SSD | 50 GB NVMe SSD |
| **Chứng chỉ bảo mật** | SSL / TLS (HTTPS) | Let's Encrypt / Cloudflare SSL với HSTS |

---

## 2. Danh Mục Biến Môi Trường Bắt Buộc

Trước khi khởi động ứng dụng, đảm bảo tất cả các biến môi trường sau đã được cấu hình trong bảng điều khiển hosting hoặc file `.env`:

```bash
# Môi trường
NODE_ENV="production"
NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS="false"

# Database (PostgreSQL với connection pooling)
DATABASE_URL="postgresql://[USER]:[PASS]@[HOST]:5432/[DB]?schema=public&connection_limit=20"

# Auth.js / NextAuth
AUTH_SECRET="<chuỗi-ngẫu-nhiên-32-ký-tự-sinh-bởi-openssl-rand-base64-32>"
NEXTAUTH_SECRET="<chuỗi-ngẫu-nhiên-32-ký-tự>"
NEXTAUTH_URL="https://your-domain.com"
AUTH_TRUST_HOST="true"

# Google Gemini AI
GEMINI_API_KEY="<api-key-tu-google-ai-studio>"
GEMINI_MODEL="gemini-3.6-flash"
HEALTH_CHECK_SECRET="<chuỗi-bí-mật-dành-cho-monitoring-service>"
```

---

## 3. Quy Trình Triển Khai (Zero-Downtime Migration)

### Bước 1: Kéo mã nguồn mới nhất
```bash
git pull origin main
```

### Bước 2: Cài đặt thư viện phụ thuộc
```bash
npm ci --only=production=false
```

### Bước 3: Sinh mã Prisma Client
```bash
npx prisma generate
```

### Bước 4: Chạy Database Migration (BẮT BUỘC KHÔNG DÙNG DB PUSH)
> [!IMPORTANT]
> Trên môi trường Production, **TUYỆT ĐỐI KHÔNG** chạy `prisma db push` hoặc `npm run db:seed`. Chỉ sử dụng lệnh migrate an toàn sau:
```bash
npm run db:migrate:deploy
```
Lệnh này sẽ kiểm tra và áp dụng tuần tự các tệp migration trong `prisma/migrations` mà không làm gián đoạn hay mất dữ liệu đang có.

### Bước 5: Biên dịch mã nguồn Next.js
```bash
npm run build
```

### Bước 6: Khởi động hoặc khởi động lại tiến trình
Sử dụng **PM2** để quản lý tiến trình nền trên Linux Server:
```bash
# Khởi động lần đầu
pm2 start npm --name "quanlychitieu" -- start

# Hoặc khởi động lại không gián đoạn
pm2 reload quanlychitieu --update-env
```

---

## 4. Triển Khai Bằng Docker & Docker Compose

### Cấu trúc file `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/quanlychitieu?schema=public
      - AUTH_SECRET=${AUTH_SECRET}
      - NEXTAUTH_URL=https://your-domain.com
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEMINI_MODEL=gemini-3.6-flash
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: quanlychitieu
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

---

## 5. Cấu Hình Nginx Reverse Proxy & SSL

Tệp cấu hình Nginx mẫu tại `/etc/nginx/sites-available/quanlychitieu`:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Giới hạn kích thước upload ảnh hóa đơn tối đa 10MB
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 6. Kiểm Tra Sau Khi Triển Khai (Post-Deployment Checklist)

1. **Kiểm tra trạng thái máy chủ**:
   ```bash
   curl -I https://your-domain.com/login
   # Kỳ vọng: HTTP/2 200 OK
   ```
2. **Kiểm tra sức khỏe AI Engine**:
   ```bash
   curl -H "x-health-token: YOUR_SECRET" https://your-domain.com/api/ai/health
   # Kỳ vọng: {"ok":true,"configured":true,"model":"gemini-3.6-flash"}
   ```
3. **Kiểm tra xác thực & Rate Limiting**:
   Thực hiện gửi yêu cầu liên tục để xác nhận phản hồi `HTTP 429 Too Many Requests`.
4. **Kiểm tra nhật ký kiểm toán (Audit Logs)**:
   Xác nhận các thao tác nạp tiền, chuyển tiền, xóa ví được ghi nhận vào bảng `audit_logs`.

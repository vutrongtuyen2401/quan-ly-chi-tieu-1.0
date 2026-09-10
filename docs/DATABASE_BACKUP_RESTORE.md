# Quy Trình Sao Lưu & Khôi Phục Cơ Sở Dữ Liệu (Backup & Restore Runbook)
### Cơ Sở Dữ Liệu: PostgreSQL 15/16 | Hệ Thống: Quản Lý Chi Tiêu 1.0

Tài liệu này hướng dẫn chi tiết quy trình tự động hóa sao lưu dự phòng, lưu trữ ngoại vi an toàn và kịch bản khôi phục thảm họa (Disaster Recovery) đảm bảo không mất mát dữ liệu tài chính của người dùng.

---

## 1. Chiến Lược Sao Lưu Dữ Liệu (Backup Strategy)

- **Chu kỳ sao lưu tự động**:
  - Hàng ngày (Daily): 02:00 AM (giờ ít người dùng nhất).
  - Trước mỗi lần cập nhật phiên bản lớn (Release/Migration): Thực hiện sao lưu thủ công tức thì.
- **Chính sách lưu giữ (Retention Policy - Quy tắc 7/4/12)**:
  - Giữ 7 bản sao lưu hàng ngày gần nhất.
  - Giữ 4 bản sao lưu cuối tuần của tháng.
  - Giữ 12 bản sao lưu cuối tháng của năm.
- **Lưu trữ ngoại vi (Off-site)**: Đẩy bản nén đã mã hóa lên Cloudflare R2 hoặc Amazon S3 Glacier.

---

## 2. Script Tự Động Sao Lưu (`scripts/db-backup.sh`)

Tạo script sao lưu trên máy chủ Linux tại `/opt/scripts/db-backup.sh`:

```bash
#!/bin/bash
set -eo pipefail

# ==========================================
# CẤU HÌNH THÔNG SỐ SAO LƯU
# ==========================================
BACKUP_DIR="/var/backups/postgresql/quanlychitieu"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/quanlychitieu_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="/var/log/db_backup.log"

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="quanlychitieu"
DB_USER="postgres"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] --- Bắt đầu tiến trình sao lưu cơ sở dữ liệu ---" >> "${LOG_FILE}"

# 1. Thực hiện pg_dump và nén gzip
export PGPASSWORD="${PGPASSWORD}"
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --no-owner \
    --clean \
    --if-exists \
    | gzip -9 > "${BACKUP_FILE}"

FILESIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo "[$(date)] ✓ Tạo bản sao lưu thành công: ${BACKUP_FILE} (Dung lượng: ${FILESIZE})" >> "${LOG_FILE}"

# 2. Xóa các bản sao lưu cũ hơn 14 ngày trên ổ cứng cục bộ
find "${BACKUP_DIR}" -type f -name "quanlychitieu_backup_*.sql.gz" -mtime +14 -exec rm -f {} \;
echo "[$(date)] ✓ Đã dọn dẹp các tệp sao lưu cũ hơn 14 ngày" >> "${LOG_FILE}"

# 3. Đồng bộ lên Cloud Storage ngoại vi (Nếu đã cấu hình rclone hoặc aws-cli)
if command -v aws &> /dev/null; then
    aws s3 cp "${BACKUP_FILE}" "s3://my-financial-app-backups/database/"
    echo "[$(date)] ✓ Đã tải bản sao lưu lên Amazon S3 thành công" >> "${LOG_FILE}"
fi

echo "[$(date)] --- Hoàn tất tiến trình sao lưu ---" >> "${LOG_FILE}"
```

Cấp quyền thực thi:
```bash
chmod +x /opt/scripts/db-backup.sh
```

---

## 3. Thiết Lập Lịch Chạy Tự Động (Crontab)

Mở bảng lập lịch tác vụ hệ thống:
```bash
crontab -e
```

Thêm dòng sau để tự động chạy lúc 02:00 sáng mỗi ngày:
```cron
0 2 * * * PGPASSWORD="your_secure_db_password" /opt/scripts/db-backup.sh >> /var/log/db_cron.log 2>&1
```

---

## 4. Quy Trình Khôi Phục Thảm Họa (Disaster Recovery Runbook)

Khi xảy ra sự cố hỏng hóc phần cứng, lỗi phần mềm hoặc cần khôi phục dữ liệu về thời điểm trước đó:

### Bước 1: Dừng ứng dụng Next.js để ngăn chặn ghi dữ liệu mới
```bash
pm2 stop quanlychitieu
```

### Bước 2: Chuẩn bị tệp sao lưu cần khôi phục
Xác định tệp sao lưu muốn khôi phục (ví dụ `quanlychitieu_backup_20260910_020000.sql.gz`).

### Bước 3: Ngắt toàn bộ kết nối đang mở vào cơ sở dữ liệu
Chạy lệnh SQL sau trong `psql` để đóng các session còn tồn đọng:
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'quanlychitieu' AND pid <> pg_backend_pid();
```

### Bước 4: Thực hiện khôi phục dữ liệu
```bash
# Giải nén và nạp trực tiếp vào PostgreSQL
gunzip -c /var/backups/postgresql/quanlychitieu/quanlychitieu_backup_20260910_020000.sql.gz | \
psql -h localhost -U postgres -d quanlychitieu
```

### Bước 5: Kiểm tra tính toàn vẹn dữ liệu sau khi khôi phục
Chạy script kiểm tra số lượng bản ghi:
```bash
node -e "
import('@prisma/client').then(async ({PrismaClient}) => {
  const prisma = new PrismaClient();
  const userCount = await prisma.user.count();
  const walletCount = await prisma.wallet.count();
  const txCount = await prisma.transaction.count();
  const auditCount = await prisma.auditLog.count();
  console.log('Kết quả kiểm tra cơ sở dữ liệu sau khôi phục:');
  console.log(' - Users:', userCount);
  console.log(' - Wallets:', walletCount);
  console.log(' - Transactions:', txCount);
  console.log(' - Audit Logs:', auditCount);
  await prisma.\$disconnect();
});
"
```

### Bước 6: Khởi động lại ứng dụng
```bash
pm2 restart quanlychitieu
```
Kiểm tra log:
```bash
pm2 logs quanlychitieu --lines 50
```

---

## 5. Diễn Tập Khôi Phục Định Kỳ (Drill Practice)
- Mỗi quý (3 tháng một lần), đội ngũ kỹ thuật cần tải một bản backup ngẫu nhiên về môi trường Staging biệt lập và thực hiện quy trình khôi phục hoàn chỉnh để đảm bảo tệp backup luôn hoạt động 100% khi có sự cố thật.

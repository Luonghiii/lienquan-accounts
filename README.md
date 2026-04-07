# Liên Quân Account Share

Web chia sẻ tài khoản Liên Quân, random từ file dữ liệu.

## Cấu trúc

- `index.html` – trang chính
- `css/styles.css` – styling
- `js/app.js` – logic parser và UI
- `data/` – chứa các file `acclq1.txt`, `acclq2.txt`, `acclq3.txt`

## Cách dùng

1. Upload các file `acclq*.txt` vào thư mục `data/` (cùng cấp với `index.html`)
2. Mở `index.html` qua GitHub Pages hoặc local
3. Nhấn **ROLL** để lấy ngẫu nhiên một tài khoản
4. Nhấn **COPY** để copy username|password
5. Chọn filter: Tất cả / Chỉ FULL / Chỉ MỖI SỐ

## Format dữ liệu hỗ trợ

- `username|password`
- `username:password Info = ...` (có thêm thông tin Rank, Level, Hero, Skin...)
- `result = username:password` (từ crawler)

## Deploy GitHub Pages

1. Push code lên repo
2. Vào Settings → Pages
3. Branch: `main`, folder `/ (root)`
4. Lưu → truy cập: `https://<username>.github.io/lienquan-accounts/`

## Lưu ý

- Chỉ dùng cho mục đích cá nhân, chia sẻ nội dung đã được xem xét.
- Không chứa thông tin nhạy cảm nếu repo là public.
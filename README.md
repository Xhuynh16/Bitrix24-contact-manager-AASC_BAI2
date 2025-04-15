# Bitrix24 Contact Manager

Ứng dụng quản lý liên hệ tích hợp với Bitrix24 CRM thông qua OAuth, cho phép thêm, sửa, xóa và xem danh sách liên hệ với đầy đủ thông tin cá nhân, địa chỉ và tài khoản ngân hàng.

## Tính năng

- Xem danh sách liên hệ với thông tin chi tiết
- Thêm mới liên hệ với đầy đủ thông tin:
  - Họ và tên
  - Số điện thoại
  - Email
  - Website
  - Địa chỉ (Phường/Xã, Quận/Huyện, Tỉnh/Thành phố)
  - Thông tin ngân hàng (Tên ngân hàng, Số tài khoản)
- Chỉnh sửa thông tin liên hệ
- Xóa liên hệ
- Tìm kiếm liên hệ theo từ khóa

## Yêu cầu hệ thống

- Node.js (v14 trở lên)
- npm hoặc yarn (cho BE)
- [ngrok](https://ngrok.com/) để tạo tunnel cho OAuth callback URL
- Tài khoản Bitrix24 với quyền quản trị

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/Xhuynh16/Bitrix24-contact-manager-AASC_BAI2.git
cd bitrix24-contact-manager
```

2. Cài đặt dependencies cho BE:
```bash
cd server
npm install
```

3. Tạo file .env hoặc cập nhật file .env hiện có:
```bash
cd server
cp .env.example .env
```

## Cấu hình Bitrix24 OAuth

1. Đăng nhập vào tài khoản Bitrix24 của bạn

2. Tạo OAuth application:
   - Vào `Applications > Developer resources`
   - Chọn "Add OAuth application"
   - Điền thông tin ứng dụng:
     - Application name: Contact Manager
     - Description: Quản lý liên hệ
     - Redirect URI: [URL_NGROK]/auth/callback (ví dụ: https://your-ngrok-url.ngrok-free.app/auth/callback)
     - Scope: Chọn các quyền sau:
       - CRM (crm)
       - CRM Contact (crm_contact)
       - CRM Requisite (crm_requisite)
       - CRM Address (crm_address)

3. Sau khi tạo, lấy Client ID và Client Secret

4. Cập nhật file `.env`:
```
BITRIX24_CLIENT_ID=your_client_id
BITRIX24_CLIENT_SECRET=your_client_secret
BITRIX24_REDIRECT_URI=your_ngrok_url/auth/callback
BITRIX24_DOMAIN=your_bitrix24_domain.bitrix24.vn
PORT=3000
NODE_ENV=development
```

## Chạy ứng dụng

1. Khởi động tunnel ngrok (cần làm trước để có URL callback):
```bash
ngrok http 3000
```
Copy URL được cấp (https://xxx.ngrok-free.app) và cập nhật vào file `.env` và cài đặt OAuth application trong Bitrix24

2. Khởi động BE:
```bash
cd server
npm start
```
Server sẽ chạy tại http://localhost:3000

3. Chạy FE:
   - Mở file `client/index.html` trong trình duyệt
   - Hoặc sử dụng Live Server extension của VS Code để chạy

## API Endpoints

### Quản lý liên hệ
- `GET /api/contact` - Lấy danh sách liên hệ
- `POST /api/contact` - Tạo liên hệ mới
- `PUT /api/contact/:id` - Cập nhật liên hệ
- `DELETE /api/contact/:id` - Xóa liên hệ

### API hỗ trợ 
- `GET /auth/callback` - Xử lý callback sau khi xác thực từ Bitrix24
- `POST /auth/install-event` - Xử lý sự kiện cài đặt ứng dụng
- `GET /auth/status` - Kiểm tra trạng thái xác thực

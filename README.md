# Bitrix24 Contact Manager

Ứng dụng quản lý liên hệ tích hợp với Bitrix24 CRM, cho phép thêm, sửa, xóa và xem danh sách liên hệ với đầy đủ thông tin cá nhân, địa chỉ và tài khoản ngân hàng.

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
- [ngrok](https://ngrok.com/) để tạo tunnel cho webhook
- Tài khoản Bitrix24 với quyền quản trị

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/your-username/bitrix24-contact-manager.git
cd bitrix24-contact-manager
```

2. Cài đặt dependencies cho BE:
```bash
cd server
npm install
```

3. Tạo file cấu hình:
```bash
cd server
cp config.example.js config.js
```

## Cấu hình Bitrix24

1. Đăng nhập vào tài khoản Bitrix24 của bạn

2. Tạo Webhook:
   - Vào `Applications > Webhooks`
   - Chọn "Add Incoming Webhook"
   - Cấp quyền cho webhook:
     - CRM (crm)
     - CRM Contact (crm_contact)
     - CRM Requisite (crm_requisite)
     - CRM Address (crm_address)

3. Copy webhook URL được cấp

4. Cập nhật file `server/config.js`:
```javascript
export const BITRIX24_WEBHOOK = 'YOUR_WEBHOOK_URL';
```

## Chạy ứng dụng

1. Khởi động BE:
```bash
cd server
npm start
```
Server sẽ chạy tại http://localhost:3000

2. Tạo tunnel với ngrok:
```bash
ngrok http 3000
```
Copy URL được cấp (https://xxx.ngrok.io) để cập nhật trong Bitrix24 webhook settings

3. Chạy FE:
- Mở file `client/index.html` trong trình duyệt
- Hoặc sử dụng Live Server extension của VS Code để chạy


## API Endpoints

- `GET /api/contact` - Lấy danh sách liên hệ
- `POST /api/contact` - Tạo liên hệ mới
- `PUT /api/contact/:id` - Cập nhật liên hệ
- `DELETE /api/contact/:id` - Xóa liên hệ

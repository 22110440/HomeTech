# 📦 Project Setup Guide

## 🛠️ Yêu cầu hệ thống

* **Node.js** >= 18
* **npm** >= 9
* **Java JDK** >= 21
* **Maven** >= 3.9

---

## 🚀 Cách chạy dự án

### 🔹 Backend (Spring Boot)

```bash
mvn spring-boot:run
```

Backend sẽ chạy mặc định tại:

```
http://localhost:8080
```

---

### 🔹 Frontend (React / Vite)

```bash
npm install
npm run dev
```

Frontend sẽ chạy mặc định tại:

```
http://localhost:5173
```

---

## 🔐 Tài khoản đăng nhập demo

### 👑 Admin Account

* **Username:** `admin1`
* **Password:** `123456`

### 👤 User Account

* **Username:** `test1`
* **Password:** `123456`

---

## 📁 Cấu trúc thư mục (tham khảo)

```
project-root/
│
├── backend/        # Spring Boot
│   └── src/
│
├── frontend/       # React / Vite
│   └── src/
│
└── README.md
```

---

## 📌 Ghi chú

* Đảm bảo **backend chạy trước frontend**.
* Kiểm tra file cấu hình `.env` (nếu có) cho frontend.
* Tài khoản demo chỉ dùng cho mục đích test.

---

✨ **link demo : https://drive.google.com/file/d/1-IRIK6oUIMVETt1INhii3vXp-hlOux0M/view?usp=sharing**

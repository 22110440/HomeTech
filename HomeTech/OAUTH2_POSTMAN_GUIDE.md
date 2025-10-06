# Hướng dẫn Test OAuth2 Gmail Login với Postman

## 🔧 Cấu hình đã cập nhật

- **Client ID**: `733643840733-4uloisdm1ud4s8fuhln4uekld3uqh6t3.apps.googleusercontent.com`
- **Client Secret**: `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`
- **Redirect URI**: `http://localhost:8080/login/oauth2/code/google`

## 📋 OAuth2 API Endpoints trong AuthRestController

### 1. **Lấy thông tin hướng dẫn OAuth2**
```
GET /api/auth/oauth2/login-info
```
**Response:**
```json
{
    "success": true,
    "message": "Thông tin đăng nhập OAuth2",
    "data": {
        "googleLoginUrl": "/oauth2/authorization/google",
        "redirectUri": "http://localhost:8080/login/oauth2/code/google",
        "scopes": ["profile", "email"],
        "instructions": {
            "step1": "Truy cập /oauth2/authorization/google để bắt đầu OAuth2 flow",
            "step2": "Đăng nhập với tài khoản Google",
            "step3": "Hệ thống sẽ tự động redirect và tạo JWT tokens",
            "step4": "Sử dụng JWT tokens để gọi các API khác"
        }
    }
}
```

### 2. **Hướng dẫn test OAuth2**
```
POST /api/auth/oauth2/test-login
```
**Response:**
```json
{
    "success": true,
    "message": "Hướng dẫn test OAuth2 Login",
    "instructions": {
        "method": "Không thể test OAuth2 trực tiếp bằng Postman",
        "reason": "OAuth2 flow yêu cầu browser để redirect",
        "solution": "Sử dụng browser để truy cập /oauth2/authorization/google",
        "alternative": "Sử dụng Postman OAuth2 Authorization Code flow",
        "steps": [
            "1. Mở browser và truy cập: http://localhost:8080/oauth2/authorization/google",
            "2. Đăng nhập với tài khoản Google",
            "3. Copy JWT token từ response",
            "4. Sử dụng JWT token trong Postman với header: Authorization: Bearer {token}"
        ]
    }
}
```

### 3. **Lấy thông tin OAuth2 user (sau khi đăng nhập)**
```
GET /api/auth/oauth2/user
```
**Headers:** `Authorization: Bearer {jwt_token}`

**Response:**
```json
{
    "success": true,
    "message": "Lấy thông tin OAuth2 user thành công",
    "data": {
        "email": "user@gmail.com",
        "name": "User Name",
        "picture": "https://lh3.googleusercontent.com/...",
        "googleId": "1234567890",
        "provider": "google"
    }
}
```

### 4. **Lấy thông tin user hiện tại**
```
GET /api/auth/user-info
```
**Headers:** `Authorization: Bearer {jwt_token}`

**Response:**
```json
{
    "success": true,
    "message": "Lấy thông tin user thành công",
    "data": {
        "username": "user123",
        "authorities": ["ROLE_USER"],
        "enabled": true,
        "accountNonExpired": true,
        "accountNonLocked": true,
        "credentialsNonExpired": true
    }
}
```

## 🚀 Cách Test với Postman

### **Method 1: Sử dụng Browser + Postman**

#### **Bước 1: Khởi tạo OAuth2 Login**
1. **Mở browser** và truy cập:
```
http://localhost:8080/oauth2/authorization/google
```

2. **Đăng nhập Google** với tài khoản của bạn

3. **Sau khi đăng nhập thành công**, bạn sẽ nhận được JSON response:
```json
{
    "success": true,
    "message": "Đăng nhập Google thành công",
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "email": "user@gmail.com",
    "name": "User Name",
    "picture": "https://lh3.googleusercontent.com/...",
    "username": "user123"
}
```

4. **Copy accessToken** từ response

#### **Bước 2: Sử dụng JWT Token trong Postman**

1. **Tạo request mới trong Postman**
2. **Method**: `GET`
3. **URL**: `http://localhost:8080/api/auth/user-info`
4. **Headers**:
```
Authorization: Bearer {paste_your_access_token_here}
Content-Type: application/json
```

### **Method 2: Sử dụng Postman OAuth2 Flow**

#### **Bước 1: Cấu hình OAuth2 trong Postman**

1. **Tạo request mới**
2. **Chọn tab "Authorization"**
3. **Type**: `OAuth 2.0`
4. **Cấu hình**:
   - **Grant Type**: `Authorization Code`
   - **Callback URL**: `http://localhost:8080/login/oauth2/code/google`
   - **Auth URL**: `https://accounts.google.com/o/oauth2/auth`
   - **Access Token URL**: `https://oauth2.googleapis.com/token`
   - **Client ID**: `733643840733-4uloisdm1ud4s8fuhln4uekld3uqh6t3.apps.googleusercontent.com`
   - **Client Secret**: `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`
   - **Scope**: `profile email`

5. **Click "Get New Access Token"**
6. **Đăng nhập Google** trong popup
7. **Use Token** để áp dụng token vào request

#### **Bước 2: Test các API**

Sau khi có token, test các endpoints:

```
GET /api/auth/oauth2/user
GET /api/auth/user-info
POST /api/auth/logout
```

## 📝 Postman Collection

Tạo collection với các request sau:

```
HomeTech OAuth2 API
├── 1. OAuth2 Login Info (GET /api/auth/oauth2/login-info)
├── 2. OAuth2 Test Guide (POST /api/auth/oauth2/test-login)
├── 3. Get OAuth2 User (GET /api/auth/oauth2/user) [Need Token]
├── 4. Get Current User Info (GET /api/auth/user-info) [Need Token]
├── 5. Refresh Token (POST /api/auth/refresh-token)
└── 6. Logout (POST /api/auth/logout)
```

## 🔄 Complete Test Flow

### **1. Test thông tin cấu hình:**
```bash
curl http://localhost:8080/api/auth/oauth2/login-info
```

### **2. Lấy JWT token qua browser:**
- Truy cập: `http://localhost:8080/oauth2/authorization/google`
- Đăng nhập Google
- Copy `accessToken` từ response

### **3. Test với JWT token:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/api/auth/user-info
```

### **4. Test OAuth2 user info:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/api/auth/oauth2/user
```

## ⚠️ Lưu ý quan trọng

### **1. OAuth2 Flow Limitations:**
- **Không thể test OAuth2 flow hoàn toàn trong Postman** vì cần browser redirect
- **Phải sử dụng browser** để complete OAuth2 authorization flow
- **Sau khi có JWT token** thì có thể test tất cả API trong Postman

### **2. Token Management:**
- **Access Token**: Hết hạn sau 24 giờ
- **Refresh Token**: Hết hạn sau 7 ngày
- **Sử dụng refresh token** để lấy access token mới

### **3. CORS:**
- **Response đã có CORS headers** để hỗ trợ frontend
- **Có thể gọi từ browser JavaScript** sau khi có token

## 🛠️ Troubleshooting

### **Lỗi "unauthorized":**
- Kiểm tra JWT token có đúng format không
- Verify token chưa hết hạn
- Đảm bảo header `Authorization: Bearer {token}`

### **Lỗi OAuth2:**
- Kiểm tra Client ID/Secret trong application.properties
- Verify redirect URI trong Google Console
- Đảm bảo ứng dụng đang chạy trên port 8080

### **Lỗi CORS:**
- Response đã có CORS headers
- Kiểm tra browser console nếu gọi từ frontend

---

**🎯 Kết luận:** OAuth2 endpoints đã được tích hợp vào `AuthRestController`. Sử dụng browser để lấy JWT token, sau đó test tất cả API trong Postman!

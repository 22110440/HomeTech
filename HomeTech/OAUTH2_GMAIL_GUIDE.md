# Hướng dẫn sử dụng OAuth2 Gmail Login - HomeTech

## 🔧 Cấu hình đã hoàn thành

### 1. **Google OAuth2 Configuration**
- **Client ID**: `221606735331-nlpd2vv9o9bmubbgqicrdedsgc8fg2k0.apps.googleusercontent.com`
- **Client Secret**: `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`
- **Redirect URI**: `http://localhost:8080/login/oauth2/code/google`
- **Scopes**: `profile, email`

### 2. **Dependencies đã thêm**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

## 🚀 Cách sử dụng

### **Method 1: Sử dụng Web Browser**

1. **Khởi động ứng dụng:**
```bash
mvn spring-boot:run
```

2. **Truy cập trang demo:**
```
http://localhost:8080/oauth-demo
```

3. **Click "Đăng nhập bằng Google"** hoặc truy cập trực tiếp:
```
http://localhost:8080/oauth2/authorization/google
```

4. **Đăng nhập bằng tài khoản Google** của bạn

5. **Nhận response JSON** với thông tin user và JWT tokens:
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

### **Method 2: Sử dụng Postman**

**⚠️ Lưu ý:** OAuth2 flow yêu cầu browser để redirect, nên không thể test trực tiếp bằng Postman. Tuy nhiên bạn có thể:

1. **Lấy Authorization Code từ browser:**
   - Truy cập: `http://localhost:8080/oauth2/authorization/google`
   - Đăng nhập Google
   - Copy JWT token từ response

2. **Sử dụng JWT token trong Postman:**
```
GET http://localhost:8080/api/auth/user
Authorization: Bearer {your_jwt_token}
```

## 🔗 API Endpoints

### 1. **Khởi tạo OAuth2 Login**
```
GET /oauth2/authorization/google
```
- Redirect user đến Google OAuth2 consent screen
- Tự động redirect về `/login/oauth2/code/google` sau khi user consent

### 2. **OAuth2 Callback (tự động)**
```
GET /login/oauth2/code/google
```
- Google tự động gọi endpoint này với authorization code
- Hệ thống xử lý và trả về JWT tokens

### 3. **Lấy thông tin user hiện tại**
```
GET /api/auth/user
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
    "success": true,
    "username": "user123",
    "authorities": ["ROLE_USER"]
}
```

### 4. **Đăng xuất**
```
POST /api/auth/logout
```

## 🔄 Flow hoạt động

1. **User click "Đăng nhập Google"** → Redirect đến `/oauth2/authorization/google`
2. **Spring Security redirect** → Google OAuth2 authorization server
3. **User đăng nhập Google** → Google redirect về `/login/oauth2/code/google` với code
4. **Spring Security exchange code** → Access token từ Google
5. **OAuth2UserService xử lý** → Tạo/cập nhật user trong database
6. **OAuth2LoginSuccessHandler** → Tạo JWT tokens và trả về response JSON

## 💾 Database Changes

### **Tự động tạo User và Account:**
- Khi user đăng nhập Google lần đầu, hệ thống tự động:
  - Tạo `Account` với username unique
  - Tạo `User` với thông tin từ Google (googleId, email, name, picture)
  - Đánh dấu email đã verified (vì Google đã xác thực)

### **Liên kết tài khoản existing:**
- Nếu đã có Account với email tương tự → Liên kết với Google ID
- Kích hoạt account nếu chưa được kích hoạt

## 🧪 Testing

### **Test Case 1: User mới**
1. Đăng nhập với Gmail chưa có trong hệ thống
2. Kiểm tra database: Account và User mới được tạo
3. Verify JWT token hoạt động với các API khác

### **Test Case 2: User đã tồn tại**
1. Đăng ký account bằng form thông thường với email X
2. Đăng nhập OAuth2 với cùng email X
3. Kiểm tra: Account được liên kết với Google ID

### **Test Case 3: JWT Token**
1. Lấy JWT token sau khi đăng nhập OAuth2
2. Sử dụng token để gọi protected APIs
3. Test token expiration và refresh

## 🛡️ Security Features

### **1. JWT Integration**
- OAuth2 login tạo JWT tokens tương tự như login thông thường
- Access token hết hạn sau 24h
- Refresh token hết hạn sau 7 ngày

### **2. User Data Protection**
- Chỉ lấy thông tin cần thiết: profile, email
- Không lưu trữ Google access token
- Sử dụng internal JWT tokens

### **3. Account Linking**
- Tự động liên kết account existing qua email
- Kích hoạt account khi đăng nhập OAuth2 thành công

## 🔧 Troubleshooting

### **Lỗi "redirect_uri_mismatch"**
- Đảm bảo redirect URI trong Google Console chính xác: `http://localhost:8080/login/oauth2/code/google`
- Kiểm tra cấu hình trong `application.properties`

### **Lỗi "invalid_client"**
- Kiểm tra Client ID và Client Secret
- Đảm bảo Google OAuth2 credentials đúng

### **Lỗi Database**
- Kiểm tra MySQL running
- Verify connection string và credentials

### **Lỗi JWT**
- Kiểm tra JWT secret configuration
- Verify token format trong Authorization header

## 📝 Customization

### **Thay đổi Success Handler:**
Chỉnh sửa `OAuth2LoginSuccessHandler` để:
- Redirect đến trang khác sau login
- Thêm thông tin user vào response
- Customize JWT token claims

### **Thêm OAuth2 Providers khác:**
Có thể thêm Facebook, GitHub, etc. trong `application.properties`:
```properties
spring.security.oauth2.client.registration.facebook.client-id=...
spring.security.oauth2.client.registration.github.client-id=...
```

## 🎯 Production Notes

1. **HTTPS Required:** Trong production, sử dụng HTTPS
2. **Domain Configuration:** Cập nhật redirect URI với domain thực tế
3. **Security:** Giữ bí mật Client Secret
4. **CORS:** Cấu hình CORS phù hợp với frontend domain

---

**🎉 Hoàn thành!** Hệ thống OAuth2 Gmail login đã sẵn sàng sử dụng với JWT token integration!

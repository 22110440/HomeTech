package com.hometech.hometech.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class SessionInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        String path = request.getRequestURI();

        // 🔥 BỎ QUA HOÀN TOÀN CHO API
        if (path.startsWith("/api")) {
            return true;
        }

        // 🔥 Bỏ qua tài nguyên static
        if (path.startsWith("/css")
                || path.startsWith("/js")
                || path.startsWith("/images")
                || path.startsWith("/ws")
                || path.startsWith("/websocket")) {
            return true;
        }

        // 🔥 Bỏ qua login, register, OAuth login
        if (path.startsWith("/auth")
                || path.startsWith("/oauth2")
                || path.startsWith("/payment")
                || path.equals("/")
                || path.equals("/home")) {
            return true;
        }

        // 🔥 Kiểm tra session login
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("user") == null) {

            // ❗ CHỈ redirect cho request từ trình duyệt
            if (isBrowser(request)) {
                response.sendRedirect("/auth/login");
                return false;
            }

            // ❗ API / fetch không bao giờ redirect
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }

        return true;
    }

    private boolean isBrowser(HttpServletRequest request) {
        String ua = request.getHeader("User-Agent");
        return ua != null && (
                ua.contains("Mozilla") ||
                        ua.contains("Chrome") ||
                        ua.contains("Safari") ||
                        ua.contains("Edge")
        );
    }
}

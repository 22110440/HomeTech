package com.hometech.hometech.controller.Api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/session")
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class SessionController {

    private final SessionRegistry sessionRegistry;

    public SessionController(SessionRegistry sessionRegistry) {
        this.sessionRegistry = sessionRegistry;
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getSessionInfo(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        HttpSession session = request.getSession(false);

        if (session != null) {
            response.put("success", true);
            response.put("sessionId", session.getId());
            response.put("isNew", session.isNew());
            response.put("creationTime", session.getCreationTime());
            response.put("lastAccessedTime", session.getLastAccessedTime());
            response.put("maxInactiveInterval", session.getMaxInactiveInterval());
            response.put("isAuthenticated", SecurityContextHolder.getContext().getAuthentication() != null &&
                SecurityContextHolder.getContext().getAuthentication().isAuthenticated());

            // Lấy thông tin user từ session
            if (SecurityContextHolder.getContext().getAuthentication() != null) {
                response.put("username", SecurityContextHolder.getContext().getAuthentication().getName());
                response.put("authorities", SecurityContextHolder.getContext().getAuthentication().getAuthorities());
            }
        } else {
            response.put("success", false);
            response.put("message", "No active session found");
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/extend")
    public ResponseEntity<Map<String, Object>> extendSession(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        HttpSession session = request.getSession(false);

        if (session != null) {
            // Extend session by accessing it
            session.getLastAccessedTime();
            response.put("success", true);
            response.put("message", "Session extended successfully");
            response.put("sessionId", session.getId());
        } else {
            response.put("success", false);
            response.put("message", "No active session to extend");
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateSession(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        HttpSession session = request.getSession(false);

        if (session != null && !session.isNew()) {
            response.put("success", true);
            response.put("valid", true);
            response.put("sessionId", session.getId());
            response.put("isAuthenticated", SecurityContextHolder.getContext().getAuthentication() != null &&
                SecurityContextHolder.getContext().getAuthentication().isAuthenticated());
        } else {
            response.put("success", true);
            response.put("valid", false);
            response.put("message", "Session is invalid or expired");
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/invalidate")
    public ResponseEntity<Map<String, Object>> invalidateSession(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        HttpSession session = request.getSession(false);

        if (session != null) {
            String sessionId = session.getId();
            session.invalidate();
            response.put("success", true);
            response.put("message", "Session invalidated successfully");
            response.put("sessionId", sessionId);
        } else {
            response.put("success", false);
            response.put("message", "No active session to invalidate");
        }

        return ResponseEntity.ok(response);
    }
}


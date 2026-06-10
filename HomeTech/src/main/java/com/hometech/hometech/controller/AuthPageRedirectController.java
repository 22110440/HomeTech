package com.hometech.hometech.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.IOException;

@Controller
public class AuthPageRedirectController {

    private final String frontendBaseUrl;

    public AuthPageRedirectController(@Value("${frontend.base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.frontendBaseUrl = normalizeOrigin(frontendBaseUrl);
    }

    @GetMapping({
            "/auth/login",
            "/auth/register",
            "/auth/forgot-password",
            "/auth/reset-password"
    })
    public void redirectToFrontendAuth(HttpServletRequest request,
                                       HttpServletResponse response) throws IOException {
        String path = request.getRequestURI();
        String targetPath = switch (path) {
            case "/auth/register" -> "/register";
            case "/auth/forgot-password" -> "/forgot-password";
            case "/auth/reset-password" -> "/reset-password";
            default -> "/login";
        };

        String query = request.getQueryString();
        String targetUrl = frontendBaseUrl + targetPath + (query == null || query.isBlank() ? "" : "?" + query);
        response.sendRedirect(targetUrl);
    }

    private String normalizeOrigin(String origin) {
        if (origin == null || origin.isBlank()) {
            return "http://localhost:5173";
        }
        return origin.replaceAll("/+$", "");
    }
}

package com.hometech.hometech.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hometech.hometech.service.JwtService;
import com.hometech.hometech.service.OAuth2UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final OAuth2UserService oAuth2UserService;
    private final ObjectMapper objectMapper;

    public OAuth2LoginSuccessHandler(JwtService jwtService, OAuth2UserService oAuth2UserService, ObjectMapper objectMapper) {
        this.jwtService = jwtService;
        this.oAuth2UserService = oAuth2UserService;
        this.objectMapper = objectMapper;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        
        try {
            // Process OAuth2 user and get UserDetails
            UserDetails userDetails = oAuth2UserService.processOAuth2User(oAuth2User);
            
            // Generate JWT tokens
            String accessToken = jwtService.generateToken(userDetails);
            String refreshToken = jwtService.generateRefreshToken(userDetails);
            
            // Get user information
            String email = oAuth2User.getAttribute("email");
            String name = oAuth2User.getAttribute("name");
            String picture = oAuth2User.getAttribute("picture");
            
            // Create response
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("success", true);
            responseData.put("message", "Đăng nhập Google thành công");
            responseData.put("accessToken", accessToken);
            responseData.put("refreshToken", refreshToken);
            responseData.put("tokenType", "Bearer");
            responseData.put("email", email);
            responseData.put("name", name);
            responseData.put("picture", picture);
            responseData.put("username", userDetails.getUsername());
            
            // Set response headers for JSON
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setStatus(HttpServletResponse.SC_OK);
            
            // Add CORS headers
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response.setHeader("Access-Control-Allow-Headers", "*");
            
            // Write JSON response (không redirect)
            response.getWriter().write(objectMapper.writeValueAsString(responseData));
            response.getWriter().flush();
            
        } catch (Exception e) {
            // Handle error
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Lỗi khi xử lý đăng nhập Google: " + e.getMessage());
            
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            
            response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
            response.getWriter().flush();
        }
    }
}

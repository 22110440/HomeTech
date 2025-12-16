package com.hometech.hometech.config;

import com.hometech.hometech.service.CustomUserDetailsService;
import com.hometech.hometech.service.JwtAuthenticationFilter;
import com.hometech.hometech.service.OAuth2UserService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final OAuth2UserService oAuth2UserService;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    public SecurityConfig(CustomUserDetailsService userDetailsService,
                          JwtAuthenticationFilter jwtAuthenticationFilter,
                          OAuth2UserService oAuth2UserService,
                          OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.oAuth2UserService = oAuth2UserService;
        this.oAuth2LoginSuccessHandler = oAuth2LoginSuccessHandler;
    }

    // ---------------- PASSWORD ENCODER ----------------
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // ---------------- AUTH PROVIDER ----------------
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    // ---------------- AUTH MANAGER ----------------
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // ---------------- SESSION REGISTRY ----------------
    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }

    // ---------------- CORS CONFIG ----------------
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOriginPatterns(Arrays.asList("*"));
        cfg.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(Arrays.asList("*"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    // 🔥 Chain 1: API - Stateless, JWT, no redirects (returns 401 JSON for unauth if needed)
    @Bean
    @Order(1)
    public SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/api/**")  // Only apply to /api/**
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        // Auth endpoints: only allow public flows, not admin registration
                        .requestMatchers(
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/admin/login",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
                                "/api/auth/verify-email",
                                "/api/auth/refresh-token"
                        ).permitAll()
                        // Admin-only APIs
                        .requestMatchers(
                                "/api/auth/register-admin",
                                "/api/admin/**"
                        ).hasRole("ADMIN")
                        // Chat API requires authenticated (customer or admin) via JWT
                        .requestMatchers("/api/chat/**").authenticated()
                        // Public catalogue/content APIs
                        .requestMatchers(
                                "/api/products/**",
                                "/api/categories/**",
                                "/api/content/**",
                                "/api/reviews/**",
                                "/api/vouchers/**"
                        ).permitAll()
                        // Payment APIs - cho phép PayOS create public (PayOS cần gọi mà không JWT)
                        .requestMatchers("/api/payment/payos/create").permitAll()
                        // VNPAY create vẫn yêu cầu login nếu cần
                        .requestMatchers("/api/payment/vnpay/create").authenticated()
                        // Payment webhooks - public (called by payment providers)
                        .requestMatchers(
                                "/api/payment/vnpay/**",
                                "/api/payment/payos/webhook"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)  // No sessions for API
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setContentType("application/json");
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.getOutputStream().println("{ \"error\": \"Unauthorized - Invalid or missing JWT\" }");
                        })
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .authenticationProvider(authenticationProvider());

        return http.build();
    }

    // 🔥 Chain 1.5: Payment callbacks (VNPAY, etc.) - always public, no login redirects
    @Bean
    @Order(2)
    public SecurityFilterChain paymentFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/payment/**")
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                );

        return http.build();
    }

    // 🔥 Chain 2: Web - Session-based, form login with redirects
    @Bean
    @Order(3)
    public SecurityFilterChain webFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher(request -> {
                    // Only match requests that are NOT API or payment endpoints
                    String path = request.getRequestURI();
                    return !path.startsWith("/api/") && !path.startsWith("/payment/");
                })
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/", "/home",
                                "/auth/**",
                                "/oauth2/**",
                                "/payment/**",
                                "/admin/login", "/admin/register",
                                "/css/**", "/js/**", "/images/**",
                                "/ws/**",
                                "/test-notification", "/websocket-test"
                        ).permitAll()
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                )
                .formLogin(form -> form
                        .loginPage("/auth/login")
                        .loginProcessingUrl("/login")
                        .defaultSuccessUrl("/", true)
                        .failureUrl("/auth/login?error=true")
                        .permitAll()
                )
                .oauth2Login(oauth2 -> oauth2
                        .loginPage("/auth/login")
                        .authorizationEndpoint(authz -> authz
                                .baseUri("/oauth2/authorization")
                        )
                        .userInfoEndpoint(user -> user.userService(oAuth2UserService))
                        .successHandler(oAuth2LoginSuccessHandler)
                )
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/auth/login?logout=true")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                        .permitAll()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            // For API-like requests (JSON content type), return 401 JSON instead of redirect
                            String acceptHeader = request.getHeader("Accept");
                            String contentType = request.getContentType();
                            if ((acceptHeader != null && acceptHeader.contains("application/json")) ||
                                (contentType != null && contentType.contains("application/json"))) {
                                response.setContentType("application/json; charset=utf-8");
                                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                response.getOutputStream().println("{ \"error\": \"Unauthorized\" }");
                            } else {
                                // For web requests, redirect to login page
                                new LoginUrlAuthenticationEntryPoint("/auth/login").commence(request, response, authException);
                            }
                        })
                )
                .authenticationProvider(authenticationProvider());

        return http.build();
    }
}
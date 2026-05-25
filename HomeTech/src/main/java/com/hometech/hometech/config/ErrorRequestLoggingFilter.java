package com.hometech.hometech.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class ErrorRequestLoggingFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(ErrorRequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            log.error(
                    "Unhandled exception for {} {}?{}",
                    request.getMethod(),
                    request.getRequestURI(),
                    request.getQueryString(),
                    ex
            );
            throw ex;
        } finally {
            int status = response.getStatus();
            if (status >= 400) {
                log.error(
                        "HTTP {} for {} {}?{} from {}",
                        status,
                        request.getMethod(),
                        request.getRequestURI(),
                        request.getQueryString(),
                        request.getRemoteAddr()
                );
            }
        }
    }
}

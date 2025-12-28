package com.hometech.hometech.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final SessionInterceptor sessionInterceptor;
    private final PaymentMethodConverter paymentMethodConverter;

    public WebConfig(SessionInterceptor sessionInterceptor,
                     PaymentMethodConverter paymentMethodConverter) {
        this.sessionInterceptor = sessionInterceptor;
        this.paymentMethodConverter = paymentMethodConverter;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(sessionInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns(
                        "/api/**",
                        "/api/products/**",// 🔥 Phải có dòng này
                        "/oauth2/**",
                        "/payment/**",
                        "/css/**", "/js/**", "/images/**"
                );
    }

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(paymentMethodConverter);
    }
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry
            .addResourceHandler("/uploads/**")
            .addResourceLocations("file:uploads/");
    }
}


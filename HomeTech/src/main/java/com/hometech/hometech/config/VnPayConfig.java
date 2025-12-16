package com.hometech.hometech.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

@Configuration  // ✅ rất quan trọng
@PropertySource("classpath:application.properties")
public class VnPayConfig {

    @Value("${vnpay.tmnCode}")
    private String tmnCode;

    @Value("${vnpay.hashSecret}")
    private String hashSecret;

    @Value("${vnpay.url}")
    private String paymentUrl;

    @Value("${vnpay.returnUrl}")
    private String returnUrl;

    public String getTmnCode() { return tmnCode; }
    public String getHashSecret() { return hashSecret; }
    public String getPaymentUrl() { return paymentUrl; }
    public String getReturnUrl() { return returnUrl; }
}

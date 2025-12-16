package com.hometech.hometech.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

@Configuration
@PropertySource("classpath:application.properties")
public class PayOsProperties {

    @Value("${payos.client-id}")
    private String clientId;

    @Value("${payos.api-key}")
    private String apiKey;

    @Value("${payos.checksum-key}")
    private String checksumKey;

    // Dùng môi trường production (không /test); nếu cần sandbox, đặt trong application.properties
    @Value("${payos.baseUrl:https://api-merchant.payos.vn}")
    private String baseUrl;

    @Value("${payos.return-url:${frontend.base-url}/payment/payos/callback}")
    private String returnUrl;

    @Value("${payos.cancel-url:${frontend.base-url}/payment/payos/cancel}")
    private String cancelUrl;

    public String getClientId() {
        return clientId;
    }

    public String getApiKey() {
        return apiKey;
    }

    public String getChecksumKey() {
        return checksumKey;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    /**
     * Build full payment-requests endpoint URL safely.
     * - Ensures single slash between baseUrl and path.
     * - Avoids double appending when baseUrl already includes /v2 or /payment-requests.
     */
    public String getPaymentRequestUrl() {
        String normalized = baseUrl != null ? baseUrl.trim() : "";
        if (normalized.isEmpty()) {
            normalized = "https://api-merchant.payos.vn";
        }
        // If already contains payment-requests, return as is.
        if (normalized.contains("/payment-requests")) {
            return normalized;
        }
        // If already contains /v2 at the end, just append payment-requests
        if (normalized.endsWith("/v2")) {
            return normalized + "/payment-requests";
        }
        // Ensure trailing slash before appending /v2/payment-requests
        if (!normalized.endsWith("/")) {
            normalized += "/";
        }
        return normalized + "v2/payment-requests";
    }

    public String getReturnUrl() {
        return returnUrl;
    }

    public String getCancelUrl() {
        return cancelUrl;
    }
}


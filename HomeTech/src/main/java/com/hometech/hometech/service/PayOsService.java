package com.hometech.hometech.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hometech.hometech.Repository.PaymentRepository;
import com.hometech.hometech.config.HmacUtil;
import com.hometech.hometech.config.PayOsProperties;
import com.hometech.hometech.dto.PayOsCreateResponse;
import com.hometech.hometech.dto.PayOsRefundResponse;
import com.hometech.hometech.dto.PayOsWebhookPayload;
import com.hometech.hometech.enums.PaymentMethod;
import com.hometech.hometech.model.Order;
import com.hometech.hometech.model.Payment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

@Service
public class PayOsService {

    private static final Logger log = LoggerFactory.getLogger(PayOsService.class);

    private final PayOsProperties properties;
    private final PaymentRepository paymentRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    public PayOsService(PayOsProperties properties,
                        PaymentRepository paymentRepository,
                        ObjectMapper objectMapper) {
        this.properties = properties;
        this.paymentRepository = paymentRepository;
        this.objectMapper = objectMapper;
        this.restTemplate = createRestTemplateWithUtf8();
    }

    private RestTemplate createRestTemplateWithUtf8() {
        RestTemplate template = new RestTemplate();
        template.getMessageConverters().stream()
                .filter(converter -> converter instanceof org.springframework.http.converter.StringHttpMessageConverter)
                .forEach(converter -> {
                    org.springframework.http.converter.StringHttpMessageConverter stringConverter =
                            (org.springframework.http.converter.StringHttpMessageConverter) converter;
                    stringConverter.setDefaultCharset(StandardCharsets.UTF_8);
                });
        return template;
    }

    public PayOsCreateResponse createPaymentLink(Order order) {
        if (order == null) {
            throw new IllegalArgumentException("Order is required");
        }

        Payment payment = order.getPayment();
        if (payment == null) {
            payment = paymentRepository.findByOrder(order).orElse(new Payment());
        }
        long orderCode = resolveOrderCode(order, payment);

        if (orderCode <= 0) {
            throw new IllegalArgumentException("OrderCode phải là số nguyên dương");
        }

        long amount = Math.round(order.getTotalAmount());
        if (amount < 10000) { // PayOS test yêu cầu >= 10.000đ
            throw new IllegalArgumentException("Số tiền thanh toán phải >= 10.000 VND");
        }

        log.info("PayOsService.createPaymentLink - Order totalAmount: {}, rounded amount: {}", order.getTotalAmount(), amount);

        // TRIM + loại bỏ space thừa hoàn toàn
        String returnUrl = properties.getReturnUrl().trim();
        String cancelUrl = properties.getCancelUrl().trim();

        log.info("PayOsService.createPaymentLink - returnUrl: '{}'", returnUrl);
        log.info("PayOsService.createPaymentLink - cancelUrl: '{}'", cancelUrl);

        if (!StringUtils.hasText(returnUrl) || !returnUrl.startsWith("http")) {
            throw new IllegalArgumentException("returnUrl không hợp lệ: " + returnUrl);
        }
        if (!StringUtils.hasText(cancelUrl) || !cancelUrl.startsWith("http")) {
            throw new IllegalArgumentException("cancelUrl không hợp lệ: " + cancelUrl);
        }

        long finalOrderCode = orderCode;
        if (finalOrderCode > Integer.MAX_VALUE) {
            long timestamp = System.currentTimeMillis() % 1000000;
            finalOrderCode = (order.getId() != null ? order.getId() : 1L) * 1000000 + timestamp;
            if (finalOrderCode > Integer.MAX_VALUE) {
                finalOrderCode = finalOrderCode % Integer.MAX_VALUE;
            }
        }
        if (finalOrderCode <= 0) {
            finalOrderCode = System.currentTimeMillis() % 1000000000L;
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("orderCode", (int) finalOrderCode);
        payload.put("amount", (int) amount);

        // Description: Giống bạn bè, có space
        String description = "Order " + order.getId();
        payload.put("description", description.trim());
        log.info("Description: '{}'", description);

        payload.put("returnUrl", returnUrl);
        payload.put("cancelUrl", cancelUrl);

        // Xóa buyer info và items để signature chỉ trên 5 trường cơ bản

        String checksumData = calculateChecksumData(finalOrderCode, amount, description, returnUrl, cancelUrl);
        String signature = HmacUtil.hmacSHA256(properties.getChecksumKey(), checksumData);
        payload.put("signature", signature);

        HttpHeaders headers = buildHeadersForCreate(signature);
        String bodyJson = toJson(payload);

        try {
            String url = properties.getBaseUrl() + "/v2/payment-requests";
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(bodyJson, headers), JsonNode.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                String errorBody = response.getBody() != null ? response.getBody().toString() : "";
                String errorMsg = extractMessage(errorBody);
                throw new IllegalStateException("PayOS trả về HTTP " + response.getStatusCodeValue() + 
                        (errorMsg != null ? ": " + errorMsg : ""));
            }

            JsonNode root = response.getBody();
            String code = root.path("code").asText("");
            if (!"00".equals(code)) {
                String desc = root.path("desc").asText("");
                log.warn("⚠ PayOS error code={} desc={}", code, desc);
                throw new IllegalStateException("PayOS error code=" + code + " desc=" + desc);
            }

            JsonNode data = root.path("data");
            PayOsCreateResponse result = new PayOsCreateResponse();
            result.setSuccess(true);
            result.setOrderCode(String.valueOf(finalOrderCode));
            result.setPaymentLinkId(data.path("paymentLinkId").asText(null));
            result.setCheckoutUrl(data.path("checkoutUrl").asText(null));
            result.setQrCode(data.path("qrCode").asText(null));
            result.setMessage("Tạo liên kết thanh toán thành công");

            if (result.getCheckoutUrl() == null || result.getCheckoutUrl().isBlank()) {
                throw new IllegalStateException("PayOS không trả về checkoutUrl");
            }

            // Cập nhật payment txnRef nếu cần
            payment.setTxnRef(String.valueOf(finalOrderCode));
            // Lưu paymentRequestId/paymentLinkId để dùng refund ngay cả khi webhook chưa trả về
            if (!StringUtils.hasText(payment.getTransactionNo())) {
                String paymentRequestId = data.path("paymentRequestId").asText(null);
                if (!StringUtils.hasText(paymentRequestId)) {
                    paymentRequestId = data.path("paymentLinkId").asText(null);
                }
                payment.setTransactionNo(paymentRequestId);
            }
            paymentRepository.save(payment);

            return result;
        } catch (HttpStatusCodeException e) {
            String errorBody = e.getResponseBodyAsString();
            String errorMsg = extractMessage(errorBody);
            throw new IllegalStateException("Lỗi gọi PayOS: " + e.getStatusCode() + 
                    (errorMsg != null ? ": " + errorMsg : ""), e);
        } catch (Exception e) {
            log.error("🔥 Lỗi tạo payment link PayOS", e);
            throw new IllegalStateException("Không thể tạo liên kết thanh toán PayOS", e);
        }
    }

    public boolean verifyWebhookSignature(PayOsWebhookPayload payload) {
        if (payload == null || payload.getData() == null) {
            return false;
        }
        Map<String, Object> dataMap = objectMapper.convertValue(payload.getData(), Map.class);
        String checksumData = buildChecksumData(dataMap);
        String calculatedSignature = HmacUtil.hmacSHA256(properties.getChecksumKey(), checksumData);
        return calculatedSignature.equals(payload.getSignature());
    }

    public void handleWebhook(PayOsWebhookPayload payload) {
        if (payload == null || payload.getData() == null || payload.getData().getOrderCode() == null) {
            return;
        }
        String orderCode = String.valueOf(payload.getData().getOrderCode());
        Optional<Payment> paymentOpt = paymentRepository.findByTxnRef(orderCode);
        if (paymentOpt.isEmpty()) {
            log.warn("PayOS webhook: payment with orderCode {} not found", orderCode);
            return;
        }

        Payment payment = paymentOpt.get();
        String status = payload.getData().getStatus();

        boolean isSuccessStatus = status != null && (
                "PAID".equalsIgnoreCase(status) ||
                "SUCCESS".equalsIgnoreCase(status) ||
                "SUCCEEDED".equalsIgnoreCase(status) ||
                "COMPLETED".equalsIgnoreCase(status)
        );

        if (isSuccessStatus) {
            payment.setStatus("SUCCESS");
        } else if ("CANCELLED".equalsIgnoreCase(status) || "REFUNDED".equalsIgnoreCase(status)) {
            payment.setStatus("REFUNDED");
        } else {
            payment.setStatus(status != null ? status.toUpperCase() : "UNKNOWN");
        }

        payment.setTransactionStatus(status);
        // Lưu paymentRequestId (ưu tiên) hoặc fallback paymentLinkId để dùng cho refund
        String paymentRequestId = payload.getData().getPaymentRequestId();
        if (!StringUtils.hasText(paymentRequestId)) {
            paymentRequestId = payload.getData().getPaymentLinkId();
        }
        payment.setTransactionNo(paymentRequestId);
        payment.setCheckoutUrl(payload.getData().getCheckoutUrl());
        paymentRepository.save(payment);
    }

    // Refund PayOS đã được gỡ bỏ theo yêu cầu

    // Dùng cho tạo payment link: header không cần x-checksum, signature đã nằm trong body
    private HttpHeaders buildHeadersForCreate(String signature) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json; charset=utf-8");
        headers.set("x-client-id", properties.getClientId());
        headers.set("x-api-key", properties.getApiKey());
        return headers;
    }

    // Dùng cho refund: giữ x-checksum (tương thích tài liệu refund PayOS)
    private HttpHeaders buildHeadersWithChecksum(String signature) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json; charset=utf-8");
        headers.set("x-client-id", properties.getClientId());
        headers.set("x-api-key", properties.getApiKey());
        headers.set("x-checksum", signature);
        return headers;
    }

    private String calculateChecksumData(long orderCode, long amount, String description, String returnUrl, String cancelUrl) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("amount", (int) amount);
        map.put("cancelUrl", cancelUrl);
        map.put("description", description);
        map.put("orderCode", (int) orderCode);
        map.put("returnUrl", returnUrl);
        return buildChecksumData(map);
    }

    private String buildChecksumData(Map<String, Object> data) {
        TreeMap<String, Object> sorted = new TreeMap<>(data);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Object> entry : sorted.entrySet()) {
            sb.append(entry.getKey()).append("=").append(entry.getValue()).append("&");
        }
        if (sb.length() > 0) sb.setLength(sb.length() - 1);
        String result = sb.toString();
        log.info("Checksum Data String: '{}'", result);
        return result;
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw new RuntimeException("Không thể serialize payload PayOS", e);
        }
    }

    private long resolveOrderCode(Order order, Payment existingPayment) {
    // Nếu đã có txnRef cũ → dùng lại (an toàn)
        if (existingPayment != null && StringUtils.hasText(existingPayment.getTxnRef())) {
            try {
                long code = Long.parseLong(existingPayment.getTxnRef());
                if (code > 0 && code < 2000000000L) {  // BẮT BUỘC < 2 tỷ
                    return code;
                }
            } catch (NumberFormatException ignored) {}
        }
    
    // Tạo orderCode an toàn: chỉ dùng orderId + timestamp nhỏ
    long orderId = order.getId() != null ? order.getId() : 1L;
    long timestamp = System.currentTimeMillis() % 1000000L; // 6 chữ số cuối
    long code = orderId * 1000 + timestamp; // nhân 1000 thay vì 1000000 → luôn < 2 tỷ

    // Đảm bảo luôn dưới 2 tỷ
    if (code >= 2000000000L) {
        code = code % 1900000000L + 1000000L; // ép về khoảng 1.000.000 - 1.999.999.999
    }
    if (code <= 0) code = 1000000L + timestamp;

    log.info("Generated safe orderCode: {}", code);
    return code;
}

    private String extractMessage(String errorBody) {
        if (!StringUtils.hasText(errorBody)) return null;
        try {
            JsonNode node = objectMapper.readTree(errorBody);
            if (node.hasNonNull("message")) return node.get("message").asText();
            if (node.hasNonNull("error")) return node.get("error").asText();
            if (node.hasNonNull("desc")) return node.get("desc").asText();
        } catch (Exception ignore) {}
        return null;
    }
}
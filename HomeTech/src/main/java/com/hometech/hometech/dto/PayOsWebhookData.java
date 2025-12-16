package com.hometech.hometech.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class PayOsWebhookData {
    private Integer orderCode;        // PayOS trả int
    private Long amount;
    private String description;
    private String status;            // PAID / PROCESSING / CANCELLED
    private String paymentLinkId;
    private String checkoutUrl;
    private Long transactionDateTime; // timestamp dạng số
    private String paymentRequestId;
}



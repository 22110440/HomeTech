package com.hometech.hometech.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class PayOsWebhookPayload {
    private PayOsWebhookData data;
    private String signature;
}




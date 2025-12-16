package com.hometech.hometech.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayOsCreateResponse {
    private boolean success;
    private String checkoutUrl;
    private String orderCode;
    private String paymentLinkId;
    private String qrCode;
    private String message;
}



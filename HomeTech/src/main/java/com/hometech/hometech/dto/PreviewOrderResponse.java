package com.hometech.hometech.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class PreviewOrderResponse {
    private final double subtotal;
    private final double discount;
    private final double finalTotal;
    private final boolean voucherValid;
    private final String voucherMessage;

    public PreviewOrderResponse(double subtotal, double discount, double finalTotal,
                                boolean voucherValid, String voucherMessage) {
        this.subtotal = subtotal;
        this.discount = discount;
        this.finalTotal = finalTotal;
        this.voucherValid = voucherValid;
        this.voucherMessage = voucherMessage;
    }

    public double getSubtotal() {
        return subtotal;
    }

    public double getDiscount() {
        return discount;
    }

    public double getFinalTotal() {
        return finalTotal;
    }

    public boolean isVoucherValid() {
        return voucherValid;
    }

    public String getVoucherMessage() {
        return voucherMessage;
    }

    @JsonProperty("message")
    public String getMessage() {
        return voucherMessage;
    }
}

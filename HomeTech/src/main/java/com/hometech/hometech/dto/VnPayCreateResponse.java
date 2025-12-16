package com.hometech.hometech.dto;

import java.util.Map;

public class VnPayCreateResponse {
    private final String paymentUrl;
    private final String txnRef;
    private final Map<String, String> params;

    public VnPayCreateResponse(String paymentUrl, String txnRef, Map<String, String> params) {
        this.paymentUrl = paymentUrl;
        this.txnRef = txnRef;
        this.params = params;
    }

    public String getPaymentUrl() {
        return paymentUrl;
    }

    public String getTxnRef() {
        return txnRef;
    }

    public Map<String, String> getParams() {
        return params;
    }
}


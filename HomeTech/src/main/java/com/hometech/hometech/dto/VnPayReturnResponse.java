package com.hometech.hometech.dto;

import java.util.Map;

public class VnPayReturnResponse {
    private final boolean validSignature;
    private final String responseCode;
    private final String txnRef;
    private final long amount;
    private final Map<String, String> rawParams;

    public VnPayReturnResponse(boolean validSignature,
                               String responseCode,
                               String txnRef,
                               long amount,
                               Map<String, String> rawParams) {
        this.validSignature = validSignature;
        this.responseCode = responseCode;
        this.txnRef = txnRef;
        this.amount = amount;
        this.rawParams = rawParams;
    }

    public boolean isValidSignature() {
        return validSignature;
    }

    public String getResponseCode() {
        return responseCode;
    }

    public String getTxnRef() {
        return txnRef;
    }

    public long getAmount() {
        return amount;
    }

    public Map<String, String> getRawParams() {
        return rawParams;
    }
}


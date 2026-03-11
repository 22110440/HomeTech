package com.hometech.hometech.dto;

import com.hometech.hometech.enums.PaymentMethod;

public class RepairBookingPaymentMethodRequest {
    private PaymentMethod paymentMethod;

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }
}

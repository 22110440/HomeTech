package com.hometech.hometech.config;

import com.hometech.hometech.enums.PaymentMethod;
import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

@Component
public class PaymentMethodConverter implements Converter<String, PaymentMethod> {

    @Override
    public PaymentMethod convert(String source) {
        if (source == null || source.trim().isEmpty()) {
            return null;
        }
        try {
            // Thử convert trực tiếp bằng name()
            return PaymentMethod.valueOf(source.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            // Nếu không tìm thấy, log và trả về null
            System.err.println("❌ PaymentMethodConverter - Invalid payment method: " + source);
            return null;
        }
    }
}



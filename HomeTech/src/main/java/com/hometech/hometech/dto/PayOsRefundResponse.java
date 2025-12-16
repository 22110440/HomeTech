package com.hometech.hometech.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayOsRefundResponse {
    private boolean success;
    private String message;
}



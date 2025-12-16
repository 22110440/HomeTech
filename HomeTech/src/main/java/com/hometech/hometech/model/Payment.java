package com.hometech.hometech.model;

import com.hometech.hometech.enums.PaymentMethod;
import jakarta.persistence.*;
import lombok.*;

import java.util.Date;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String method;
    private double amount;
    private String status;
    private String txnRef;
    private String orderInfo;
    private String bankCode;
    private String cardType;
    private String responseCode;
    private String transactionNo;
    private String payDate;
    private String transactionStatus;
    private String secureHash;
    private String checkoutUrl;

    @OneToOne
    @JoinColumn(name = "order_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Order order;
}

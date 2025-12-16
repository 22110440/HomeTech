package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Order;
import com.hometech.hometech.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByOrder(Order order);
    Optional<Payment> findByTxnRef(String txnRef);
}

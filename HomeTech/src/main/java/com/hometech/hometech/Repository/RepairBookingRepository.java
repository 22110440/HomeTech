package com.hometech.hometech.Repository;

import com.hometech.hometech.model.RepairBooking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RepairBookingRepository extends JpaRepository<RepairBooking, Long> {
    List<RepairBooking> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<RepairBooking> findTop5ByCustomerIdOrderByCreatedAtDesc(Long customerId);
    Optional<RepairBooking> findByPaymentTxnRef(String paymentTxnRef);
    List<RepairBooking> findAllByOrderByAppointmentDateAscAppointmentTimeAsc();
}

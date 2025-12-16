package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AddressRepository  extends JpaRepository<Address, Long> {
    boolean existsByCustomer_Id(Long customerId);
    Optional<Address> findByIdAndCustomer_Id(Long id, Long customerId);
    Optional<Address> findFirstByCustomer_IdOrderByIdAsc(Long customerId);
}

package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Address;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AddressRepository  extends JpaRepository<Address, Integer> {
}

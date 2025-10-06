package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, Integer> {
}

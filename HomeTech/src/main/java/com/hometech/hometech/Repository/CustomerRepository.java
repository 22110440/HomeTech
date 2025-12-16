package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Account;
import com.hometech.hometech.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findAllById(Long userId);
    Optional<Customer> findById(Long id);
    Optional<Customer> findByAccount(Account account);
    Optional<Customer> findByAccount_Username(String username);
}

package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Integer> {
}

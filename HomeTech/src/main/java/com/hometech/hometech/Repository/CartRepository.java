package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Cart;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CartRepository extends JpaRepository<Cart, Integer> {

}

package com.hometech.hometech.Repository;

import com.hometech.hometech.model.CartItem;
import com.hometech.hometech.model.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    @EntityGraph(attributePaths = {"product", "variant"})
    List<CartItem> findByCart(Cart cart);
}

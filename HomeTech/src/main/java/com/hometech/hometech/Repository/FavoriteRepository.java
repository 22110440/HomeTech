package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Favorite;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    @EntityGraph(attributePaths = {"product", "product.category"})
    List<Favorite> findByCustomerId(Long customerId);

    boolean existsByCustomerIdAndProductId(Long customerId, Long productId);

    Optional<Favorite> findByCustomerIdAndProductId(Long customerId, Long productId);

    void deleteByCustomerIdAndProductId(Long customerId, Long productId);
}


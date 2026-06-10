package com.hometech.hometech.Repository;

import com.hometech.hometech.model.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    List<ProductVariant> findByProduct_Id(Long productId);

    Optional<ProductVariant> findByIdAndProduct_Id(Long id, Long productId);
}


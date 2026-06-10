package com.hometech.hometech.Repository;

import com.hometech.hometech.model.ProductImage;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    List<ProductImage> findByProduct_Id(Long productId);

    @EntityGraph(attributePaths = "variant")
    @Query("SELECT pi FROM ProductImage pi WHERE pi.product.id = :productId ORDER BY pi.displayOrder ASC, pi.id ASC")
    List<ProductImage> findByProduct_IdOrderByDisplayOrderAsc(@Param("productId") Long productId);

    @EntityGraph(attributePaths = "variant")
    @Query("""
            SELECT pi FROM ProductImage pi
            WHERE pi.product.id = :productId
              AND ((:variantId IS NULL AND pi.variant IS NULL) OR pi.variant.id = :variantId)
            ORDER BY pi.displayOrder ASC, pi.id ASC
            """)
    List<ProductImage> findByProductAndOptionalVariantOrderByDisplayOrderAsc(
            @Param("productId") Long productId,
            @Param("variantId") Long variantId);

    List<ProductImage> findByVariant_Id(Long variantId);
}

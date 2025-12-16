package com.hometech.hometech.Repository;

import com.hometech.hometech.model.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    List<ProductImage> findByProduct_Id(Long productId);

    @Query("SELECT pi FROM ProductImage pi WHERE pi.product.id = :productId ORDER BY pi.displayOrder ASC, pi.id ASC")
    List<ProductImage> findByProduct_IdOrderByDisplayOrderAsc(@Param("productId") Long productId);


}

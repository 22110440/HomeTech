package com.hometech.hometech.Repository;

import com.hometech.hometech.model.ProductAttributeValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductAttributeValueRepository extends JpaRepository<ProductAttributeValue, Long> {

    List<ProductAttributeValue> findByProduct_Id(Long productId);
}



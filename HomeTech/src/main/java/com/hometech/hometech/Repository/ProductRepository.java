package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    List<Product> findTop12ByStatusTrueOrderByCreateDateDesc();

    @Query("SELECT p FROM Product p WHERE p.status = true AND (LOWER(p.productName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :q, '%')))")
    List<Product> fuzzySearch(@Param("q") String q);
}

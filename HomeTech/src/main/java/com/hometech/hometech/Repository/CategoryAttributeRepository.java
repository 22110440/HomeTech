package com.hometech.hometech.Repository;

import com.hometech.hometech.model.CategoryAttribute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryAttributeRepository extends JpaRepository<CategoryAttribute, Long> {

    List<CategoryAttribute> findByCategory_Id(Long categoryId);
}



package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Category;
import com.hometech.hometech.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

}



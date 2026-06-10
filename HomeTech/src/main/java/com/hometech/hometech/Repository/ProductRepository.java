package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Category;
import com.hometech.hometech.model.Product;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // 🟢 Query theo Category
    List<Product> findByCategory(Category category);
    List<Product> findByCategory_Id(long categoryId);
    List<Product> findByCategory_Name(String categoryName);

    // 🟢 Query sản phẩm active (hidden = false)
    List<Product> findByCategoryAndHidden(Category category, boolean hidden);
    List<Product> findByHiddenFalse();

    // 🟢 Sản phẩm mới thêm
    List<Product> findByCreatedAtAfter(LocalDateTime time);

    // 🟢 Top 10 bán chạy
    List<Product> findTop10ByOrderBySoldCountDesc();
    List<Product> findTop10ByCategory_NameOrderBySoldCountDesc(String categoryName);

    // 🔎 Search theo tên
    List<Product> findByNameContainingIgnoreCase(String keyword);

    // 🟠 Xoá ảnh theo productId (chỉ dùng nếu có bảng product_images)
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM product_images WHERE product_id = :productId", nativeQuery = true)
    void deleteImagesByProductId(long productId);
    // Sắp xếp theo giá
    List<Product> findAllByOrderByPriceAsc();
    List<Product> findAllByOrderByPriceDesc();

    // Sắp xếp theo lượt bán
    List<Product> findAllByOrderBySoldCountAsc();
    List<Product> findAllByOrderBySoldCountDesc();

    // Sắp xếp theo ngày tạo (createdAt)
    List<Product> findAllByOrderByCreatedAtDesc(); // mới nhất

    @Query("""
            select distinct p
            from Product p
            left join p.category c
            left join p.variants v
            left join p.attributeValues av
            where p.hidden = false
	              and (:keyword is null
	                   or lower(p.name) like lower(concat('%', :keyword, '%'))
	                   or lower(coalesce(p.description, '')) like lower(concat('%', :keyword, '%'))
	                   or lower(coalesce(c.name, '')) like lower(concat('%', :keyword, '%'))
	                   or lower(coalesce(v.name, '')) like lower(concat('%', :keyword, '%'))
	                   or lower(coalesce(av.value, '')) like lower(concat('%', :keyword, '%')))
	              and (:minPrice is null or p.price >= :minPrice)
	              and (:maxPrice is null or p.price <= :maxPrice)
	              and (:inStockOnly = false or p.stock > 0)
	            order by p.soldCount desc, p.price desc
	            """)
	    List<Product> searchActiveForChatbot(@Param("keyword") String keyword,
	                                         @Param("minPrice") Double minPrice,
	                                         @Param("maxPrice") Double maxPrice,
	                                         @Param("inStockOnly") boolean inStockOnly,
	                                         Pageable pageable);
	}

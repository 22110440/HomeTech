package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Review;
import com.hometech.hometech.model.Product;
import com.hometech.hometech.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    // 🟢 Kiểm tra xem 1 khách hàng đã đánh giá 1 sản phẩm chưa
    Optional<Review> findByCustomerAndProduct(Customer customer, Product product);



    // 🟢 Lấy tất cả đánh giá chưa ẩn (hiển thị cho người dùng)
    List<Review> findByProductAndHiddenFalse(Product product);



//    // 🟢 Tính trung bình rating chỉ trên các đánh giá không bị ẩn
//    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product = :product AND r.hidden = false")
//    Double getAverageRatingByProduct(@Param("product") Product product);
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.id = :productId AND r.hidden = true")
    Optional<Double> getAverageRating(@Param("productId") long productId);


}

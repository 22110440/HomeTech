package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Response;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ResponseRepository extends JpaRepository<Response, Integer> {
    Optional<Response> findByReviewId(Long reviewId);

}

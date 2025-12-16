package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Account;
import com.hometech.hometech.model.TokenForgetPassword;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TokenForgetPasswordRepository extends JpaRepository<TokenForgetPassword, Long> {


    // Tìm token chưa dùng theo token string
    Optional<TokenForgetPassword> findByTokenAndUsedFalse(String token);

    // Tìm tất cả token chưa dùng của 1 account
    List<TokenForgetPassword> findByAccountAndUsedFalse(Account account);
}

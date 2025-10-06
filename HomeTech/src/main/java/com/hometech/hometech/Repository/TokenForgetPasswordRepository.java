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
    Optional<TokenForgetPassword> findByToken(String token);
    
    Optional<TokenForgetPassword> findByTokenAndIsUsedFalse(String token);
    
    List<TokenForgetPassword> findByAccountAndIsUsedFalse(Account account);
    
    @Modifying
    @Query("DELETE FROM TokenForgetPassword t WHERE t.account.accountId = :accountId")
    void deleteByAccountId(@Param("accountId") Long accountId);
}
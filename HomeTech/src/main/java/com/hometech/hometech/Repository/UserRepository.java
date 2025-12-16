package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Account;
import com.hometech.hometech.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    User findByGoogleId(String googleId);
    User findByAccount(Account account);
    User findByAccount_Username(String username);
    List<User> findByFullNameContainingIgnoreCaseOrAccount_EmailContainingIgnoreCase(String fullName, String email);

}

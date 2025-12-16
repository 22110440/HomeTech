package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Admin;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminRepository extends JpaRepository<Admin, Long> {
}

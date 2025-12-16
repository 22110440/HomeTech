package com.hometech.hometech.Repository;

import com.hometech.hometech.model.FooterContent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FooterContentRepository extends JpaRepository<FooterContent, Long> {
    Optional<FooterContent> findFirstByActiveTrueOrderByUpdatedAtDesc();
}


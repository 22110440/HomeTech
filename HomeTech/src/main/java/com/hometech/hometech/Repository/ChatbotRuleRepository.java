package com.hometech.hometech.Repository;

import com.hometech.hometech.model.ChatbotRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChatbotRuleRepository extends JpaRepository<ChatbotRule, Long> {
    
    List<ChatbotRule> findByIsActiveTrue();
    
    Optional<ChatbotRule> findFirstByIsActiveTrueAndIsFallbackTrueOrderByCreatedAtDesc();
}

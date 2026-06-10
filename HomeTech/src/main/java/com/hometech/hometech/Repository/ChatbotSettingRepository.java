package com.hometech.hometech.Repository;

import com.hometech.hometech.model.ChatbotSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatbotSettingRepository extends JpaRepository<ChatbotSetting, Long> {
}

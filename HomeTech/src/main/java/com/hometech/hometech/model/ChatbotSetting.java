package com.hometech.hometech.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "chatbot_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Chatbot mode: DISABLED, RULES, AI, HYBRID
    @Column(nullable = false, length = 20)
    private String mode = "RULES";

    @Column(name = "gemini_api_key", length = 100)
    private String geminiApiKey;

    @Column(name = "ai_system_instruction", columnDefinition = "TEXT")
    private String aiSystemInstruction = "Bạn là nhân viên hỗ trợ khách hàng tự động của HomeTech (Hệ thống bán lẻ và sửa chữa thiết bị công nghệ). Hãy trả lời khách hàng một cách lịch sự, ngắn gọn và hữu ích bằng tiếng Việt. Nếu không giải quyết được vấn đề, hãy hướng dẫn khách hàng đợi nhân viên hỗ trợ thực tế.";

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getGeminiApiKey() {
        return geminiApiKey;
    }

    public void setGeminiApiKey(String geminiApiKey) {
        this.geminiApiKey = geminiApiKey;
    }

    @Column(name = "gemini_model", nullable = false, length = 50)
    private String geminiModel = "gemini-2.5-flash";

    public String getGeminiModel() {
        return geminiModel;
    }

    public void setGeminiModel(String geminiModel) {
        this.geminiModel = geminiModel != null && !geminiModel.trim().isEmpty() ? geminiModel : "gemini-2.5-flash";
    }

    public String getAiSystemInstruction() {
        return aiSystemInstruction;
    }

    public void setAiSystemInstruction(String aiSystemInstruction) {
        this.aiSystemInstruction = aiSystemInstruction;
    }
}

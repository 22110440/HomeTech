package com.hometech.hometech.dto;

public class SendChatMessageRequest {
    
    private Long conversationId;
    private String content;
    
    public Long getConversationId() {
        return conversationId;
    }
    
    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }
    
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
}


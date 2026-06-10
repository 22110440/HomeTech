package com.hometech.hometech.dto;

public class ChatMessagePayload {
    
    private Long id;
    private String senderType;
    private Long senderId;
    private String content;
    private java.time.LocalDateTime sentAt;
    private boolean hasFile;
    private String fileName;
    private String fileContentType;
    private boolean isAutoReply;
    private String chatbotIntent;
    private boolean handoffRequested;

    public boolean isAutoReply() {
        return isAutoReply;
    }
    public void setAutoReply(boolean autoReply) {
        this.isAutoReply = autoReply;
    }

    public String getChatbotIntent() {
        return chatbotIntent;
    }

    public void setChatbotIntent(String chatbotIntent) {
        this.chatbotIntent = chatbotIntent;
    }

    public boolean isHandoffRequested() {
        return handoffRequested;
    }

    public void setHandoffRequested(boolean handoffRequested) {
        this.handoffRequested = handoffRequested;
    }

    public boolean isHasFile() {
        return hasFile;
    }
    public void setHasFile(boolean hasFile) {
        this.hasFile = hasFile;
    }
    public String getFileName() {
        return fileName;
    }
    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
    public String getFileContentType() {
        return fileContentType;
    }
    public void setFileContentType(String fileContentType) {
        this.fileContentType = fileContentType;
    }
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }
    
    public String getSenderType() {
        return senderType;
    }
    
    public void setSenderType(String senderType) {
        this.senderType = senderType;
    }
    
    public Long getSenderId() {
        return senderId;
    }
    
    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }
    
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }

    public java.time.LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(java.time.LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }
}


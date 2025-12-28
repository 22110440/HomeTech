package com.hometech.hometech.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.hometech.hometech.enums.SenderType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id")
    @JsonIgnore
    private Conversation conversation;

    @Enumerated(EnumType.STRING)
    private SenderType senderType;

    private Long senderId;

    @Column(nullable = false, length = 1000)
    private String content;
    @Lob
    @Column(name = "file_data", columnDefinition = "LONGBLOB")
    private byte[] fileData;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_content_type")
    private String fileContentType;
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
    public byte[] getFileData() {
        return fileData;
    }
    public void setFileData(byte[] fileData) {
        this.fileData = fileData;
    }
    

    private LocalDateTime sentAt;

    @Column(name = "is_read")
    private boolean read;

    @PrePersist
    public void prePersist() {
        sentAt = LocalDateTime.now();
        read = false;
    }
}



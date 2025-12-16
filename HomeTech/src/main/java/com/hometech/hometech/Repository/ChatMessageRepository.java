package com.hometech.hometech.Repository;

import com.hometech.hometech.enums.SenderType;
import com.hometech.hometech.model.ChatMessage;
import com.hometech.hometech.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByConversationOrderBySentAtAsc(Conversation conversation);

    long countByConversationAndSenderTypeAndReadIsFalse(Conversation conversation, SenderType senderType);

    @Modifying
    @Query("update ChatMessage m set m.read = true where m.conversation = :conversation and m.senderType = :senderType and m.read = false")
    void markAsReadForConversationAndSenderType(@Param("conversation") Conversation conversation,
                                                @Param("senderType") SenderType senderType);
}



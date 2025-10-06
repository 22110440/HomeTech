package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Chat;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRepository extends JpaRepository<Chat, Integer> {
}

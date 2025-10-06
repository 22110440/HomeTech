package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Integer> {
}

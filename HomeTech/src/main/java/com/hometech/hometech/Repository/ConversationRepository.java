package com.hometech.hometech.Repository;

import com.hometech.hometech.model.Conversation;
import com.hometech.hometech.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByCustomer(Customer customer);
}



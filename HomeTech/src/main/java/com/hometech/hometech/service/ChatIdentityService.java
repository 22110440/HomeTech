package com.hometech.hometech.service;

import com.hometech.hometech.Repository.AccountRepository;
import com.hometech.hometech.enums.SenderType;
import com.hometech.hometech.model.Account;
import com.hometech.hometech.model.Admin;
import com.hometech.hometech.model.Customer;
import com.hometech.hometech.model.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class ChatIdentityService {

    private final AccountRepository accountRepository;

    public ChatIdentityService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public ChatIdentity resolve(UserDetails principal) {
        if (principal == null) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }

        Account account = accountRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản"));

        User user = account.getUser();
        if (user instanceof Customer customer) {
            return ChatIdentity.forCustomer(customer);
        }
        if (user instanceof Admin admin) {
            return ChatIdentity.forAdmin(admin);
        }

        throw new RuntimeException("Tài khoản không được phép sử dụng chat");
    }

    public static class ChatIdentity {
        private final SenderType senderType;
        private final Long senderId;
        private final Customer customer;
        private final Admin admin;

        private ChatIdentity(SenderType senderType, Long senderId, Customer customer, Admin admin) {
            this.senderType = senderType;
            this.senderId = senderId;
            this.customer = customer;
            this.admin = admin;
        }

        public static ChatIdentity forCustomer(Customer customer) {
            return new ChatIdentity(SenderType.CUSTOMER, customer.getId(), customer, null);
        }

        public static ChatIdentity forAdmin(Admin admin) {
            return new ChatIdentity(SenderType.ADMIN, admin.getId(), null, admin);
        }

        public SenderType getSenderType() {
            return senderType;
        }

        public Long getSenderId() {
            return senderId;
        }

        public boolean isCustomer() {
            return customer != null;
        }

        public Customer getCustomer() {
            return customer;
        }

        public boolean isAdmin() {
            return admin != null;
        }

        public Admin getAdmin() {
            return admin;
        }
    }
}



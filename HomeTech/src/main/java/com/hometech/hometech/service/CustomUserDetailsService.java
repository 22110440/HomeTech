package com.hometech.hometech.service;

import com.hometech.hometech.Repository.AccountReposirory;
import com.hometech.hometech.model.Account;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final AccountReposirory accountRepository;

    public CustomUserDetailsService(AccountReposirory accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Account account = accountRepository.findByUsername(username)
                .or(() -> accountRepository.findByEmail(username))
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng: " + username));

        return User.builder()
                .username(account.getUsername())
                .password(account.getPassword())
                .authorities(Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + account.getRole().name())))
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .disabled(!account.isEnabled())
                .build();
    }

    public UserDetails loadUserByEmail(String email) throws UsernameNotFoundException {
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng với email: " + email));

        return User.builder()
                .username(account.getUsername())
                .password(account.getPassword())
                .authorities(Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + account.getRole().name())))
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .disabled(!account.isEnabled())
                .build();
    }
}

package com.hometech.hometech.controller.Api;

import com.hometech.hometech.model.User;
import com.hometech.hometech.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserRestController {

    private final UserService userService;

    public UserRestController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/all")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        User user = userService.getById(id);
        if (user != null) {
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<User>> searchUsers(@RequestParam String keyword) {
        List<User> users = userService.searchUsers(keyword);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> getTotalUsers() {
        long totalUsers = userService.countAll();
        return ResponseEntity.ok(Map.of("totalUsers", totalUsers));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<String> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> request) {
        try {
            Boolean enabled = request.get("enabled");
            if (enabled == null) {
                return ResponseEntity.badRequest().body("enabled field is required");
            }
            userService.updateUserStatus(id, enabled);
            return ResponseEntity.ok("Cập nhật trạng thái thành công");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}


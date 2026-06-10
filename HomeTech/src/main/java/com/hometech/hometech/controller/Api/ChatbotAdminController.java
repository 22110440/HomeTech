package com.hometech.hometech.controller.Api;

import com.hometech.hometech.model.ChatbotRule;
import com.hometech.hometech.model.ChatbotSetting;
import com.hometech.hometech.service.ChatbotService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/chatbot")
public class ChatbotAdminController {

    private final ChatbotService chatbotService;

    public ChatbotAdminController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    @GetMapping("/settings")
    public ResponseEntity<?> getSettings() {
        try {
            return ResponseEntity.ok(chatbotService.getSettings());
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/settings")
    public ResponseEntity<?> updateSettings(@RequestBody ChatbotSetting settings) {
        try {
            return ResponseEntity.ok(chatbotService.updateSettings(settings));
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/rules")
    public ResponseEntity<?> getRules() {
        try {
            return ResponseEntity.ok(chatbotService.getAllRules());
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/rules")
    public ResponseEntity<?> createRule(@RequestBody ChatbotRule rule) {
        try {
            return ResponseEntity.ok(chatbotService.createRule(rule));
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PutMapping("/rules/{id}")
    public ResponseEntity<?> updateRule(@PathVariable Long id, @RequestBody ChatbotRule rule) {
        try {
            return ResponseEntity.ok(chatbotService.updateRule(id, rule));
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    @DeleteMapping("/rules/{id}")
    public ResponseEntity<?> deleteRule(@PathVariable Long id) {
        try {
            chatbotService.deleteRule(id);
            Map<String, Object> success = new HashMap<>();
            success.put("success", true);
            return ResponseEntity.ok(success);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}

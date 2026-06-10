package com.hometech.hometech.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hometech.hometech.model.ChatbotSetting;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class GeminiService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String generateReply(String prompt, String conversationHistory, ChatbotSetting setting) {
        String apiKey = setting.getGeminiApiKey();
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("Google Gemini API Key is missing. Please configure it in settings.");
        }

        String systemInstruction = setting.getAiSystemInstruction();
        if (systemInstruction == null) {
            systemInstruction = "Bạn là nhân viên hỗ trợ khách hàng của HomeTech.";
        }

        // Format prompt using conversation history to give full context
        String fullUserPrompt = prompt;
        if (conversationHistory != null && !conversationHistory.trim().isEmpty()) {
            fullUserPrompt = "Dưới đây là lịch sử hội thoại gần đây giữa Khách hàng và Hỗ trợ:\n" +
                    conversationHistory +
                    "\n\nTin nhắn mới nhất từ Khách hàng cần bạn trả lời:\n" +
                    prompt;
        }

        // List of available models for fallback
        List<String> availableModels = Arrays.asList(
            "gemini-2.5-flash",
            "gemini-3.5-flash",
            "gemini-3.1-flash-lite",
            "gemini-2.5-flash-lite"
        );

        List<String> tryList = new ArrayList<>();
        String selectedModel = setting.getGeminiModel();
        if (selectedModel == null || selectedModel.trim().isEmpty()) {
            selectedModel = "gemini-2.5-flash";
        }

        tryList.add(selectedModel);
        for (String modelName : availableModels) {
            if (!modelName.equalsIgnoreCase(selectedModel)) {
                tryList.add(modelName);
            }
        }

        // Keep gemini-1.5-flash as the ultimate fallback in case all others fail
        if (!tryList.contains("gemini-1.5-flash")) {
            tryList.add("gemini-1.5-flash");
        }

        Exception lastException = null;

        for (String currentModel : tryList) {
            try {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + currentModel + ":generateContent?key=" + apiKey;

                // Build request JSON structure
                Map<String, Object> requestBody = new HashMap<>();

                // 1. systemInstruction
                Map<String, Object> systemInstructionMap = new HashMap<>();
                Map<String, String> systemInstructionPart = new HashMap<>();
                systemInstructionPart.put("text", systemInstruction);
                systemInstructionMap.put("parts", Collections.singletonList(systemInstructionPart));
                requestBody.put("systemInstruction", systemInstructionMap);

                // 2. contents
                Map<String, Object> contentMap = new HashMap<>();
                contentMap.put("role", "user");
                Map<String, String> userPart = new HashMap<>();
                userPart.put("text", fullUserPrompt);
                contentMap.put("parts", Collections.singletonList(userPart));
                requestBody.put("contents", Collections.singletonList(contentMap));

                // Set headers
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

                // Send request
                String responseStr = restTemplate.postForObject(url, entity, String.class);

                // Parse response
                JsonNode root = objectMapper.readTree(responseStr);
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    JsonNode parts = candidates.get(0).path("content").path("parts");
                    if (parts.isArray() && parts.size() > 0) {
                        String result = parts.get(0).path("text").asText().trim();
                        if (!result.isEmpty()) {
                            // If fallback worked, print log for trace
                            if (!currentModel.equalsIgnoreCase(selectedModel)) {
                                System.out.println("Gemini Fallback SUCCESS: primary model " + selectedModel + " failed, fallback model " + currentModel + " succeeded.");
                            }
                            return result;
                        }
                    }
                }
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                lastException = e;
                int statusCode = e.getStatusCode().value();
                String errorBody = e.getResponseBodyAsString();
                System.err.println("Gemini Model " + currentModel + " failed with HTTP " + statusCode + ": " + errorBody);

                // If 429 (Rate Limit) or RESOURCE_EXHAUSTED quota exceeded, try fallback
                if (statusCode == 429 || (errorBody != null && errorBody.contains("RESOURCE_EXHAUSTED"))) {
                    System.err.println("Rate limit / Quota exceeded for model " + currentModel + ". Falling back to next model...");
                    continue;
                }
                
                // If it is another error (like 400 Bad Request due to invalid API key), stop loop
                break;
            } catch (Exception e) {
                lastException = e;
                System.err.println("Gemini Model " + currentModel + " failed with exception: " + e.getMessage());
                // Try fallback for network errors
                continue;
            }
        }

        if (lastException != null) {
            System.err.println("All Gemini models failed. Last exception: " + lastException.getMessage());
        }
        return "Chào bạn, hiện tại hệ thống AI đang bận. Vui lòng đợi trong giây lát, nhân viên tư vấn sẽ liên hệ lại với bạn ngay!";
    }
}

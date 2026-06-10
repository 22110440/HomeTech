package com.hometech.hometech.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ChatbotSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(ChatbotSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public ChatbotSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void ensureChatbotColumns() {
        // Log current columns and data for debugging
        debugDatabaseSchemaAndData();

        // Alter chat_message.sender_type column to support 'BOT' enum value by converting to VARCHAR(30)
        alterColumn("ALTER TABLE chat_message MODIFY COLUMN sender_type VARCHAR(30) NULL",
                "Ensured chat_message.sender_type supports BOT value");

        // Clean up invalid sender_type values to prevent Hibernate Enum mapping errors
        sanitizeSenderTypeValues();

        // Robustly ensure all required fields exist in chat_message
        addColumn("chat_message", "is_auto_reply", "BIT(1) NOT NULL DEFAULT 0");
        addColumn("chat_message", "file_name", "VARCHAR(255) NULL");
        addColumn("chat_message", "file_content_type", "VARCHAR(255) NULL");
        addColumn("chat_message", "file_data", "LONGBLOB NULL");
        addColumn("chat_message", "chatbot_intent", "VARCHAR(80) NULL");
        addColumn("chat_message", "handoff_requested", "BIT(1) NOT NULL DEFAULT 0");

        addColumn("conversation", "handoff_requested", "BIT(1) NOT NULL DEFAULT 0");
        addColumn("conversation", "handoff_reason", "VARCHAR(1000) NULL");
        addColumn("conversation", "handoff_requested_at", "DATETIME(6) NULL");
        addColumn("conversation", "last_bot_intent", "VARCHAR(80) NULL");

        // Ensure gemini_model exists in chatbot_settings table
        addColumn("chatbot_settings", "gemini_model", "VARCHAR(50) NOT NULL DEFAULT 'gemini-2.5-flash'");
    }

    private void debugDatabaseSchemaAndData() {
        try {
            log.info("=== DB DEBUG: chat_message table structure ===");
            jdbcTemplate.query("DESCRIBE chat_message", (rs, rowNum) -> {
                log.info("Column: {}, Type: {}, Null: {}, Key: {}, Default: {}",
                        rs.getString("Field"),
                        rs.getString("Type"),
                        rs.getString("Null"),
                        rs.getString("Key"),
                        rs.getString("Default"));
                return null;
            });

            log.info("=== DB DEBUG: chat_message data for conversation_id = 1 ===");
            jdbcTemplate.query("SELECT id, content, sender_type, sender_id, is_auto_reply FROM chat_message WHERE conversation_id = 1", (rs, rowNum) -> {
                log.info("ID: {}, Content: {}, SenderType: {}, SenderID: {}, IsAutoReply: {}",
                        rs.getLong("id"),
                        rs.getString("content"),
                        rs.getString("sender_type"),
                        rs.getLong("sender_id"),
                        rs.getBoolean("is_auto_reply"));
                return null;
            });
        } catch (Exception e) {
            log.error("Failed to debug database", e);
        }
    }

    private void sanitizeSenderTypeValues() {
        try {
            // First, update any NULL is_auto_reply to 0
            int updatedAutoReply = jdbcTemplate.update(
                "UPDATE chat_message SET is_auto_reply = 0 WHERE is_auto_reply IS NULL"
            );
            log.info("Sanitized {} messages with null is_auto_reply", updatedAutoReply);

            // Update sender_type = 'BOT' if it is empty, null, or has an invalid value and is_auto_reply is true
            int updatedBots = jdbcTemplate.update(
                "UPDATE chat_message SET sender_type = 'BOT' WHERE (sender_type IS NULL OR sender_type = '' OR sender_type NOT IN ('CUSTOMER', 'ADMIN', 'BOT')) AND is_auto_reply = 1"
            );
            log.info("Sanitized {} bot messages with invalid sender_type", updatedBots);

            // Update other invalid/empty sender_types to CUSTOMER or ADMIN based on sender_id
            int updatedOthers = jdbcTemplate.update(
                "UPDATE chat_message SET sender_type = 'CUSTOMER' WHERE (sender_type IS NULL OR sender_type = '' OR sender_type NOT IN ('CUSTOMER', 'ADMIN', 'BOT'))"
            );
            log.info("Sanitized {} other messages with invalid sender_type to CUSTOMER", updatedOthers);
        } catch (Exception e) {
            log.warn("Failed to sanitize sender_type/is_auto_reply values: {}", e.getMessage());
        }
    }

    private void alterColumn(String sql, String successLog) {
        try {
            jdbcTemplate.execute(sql);
            log.info(successLog);
        } catch (Exception ex) {
            log.warn("Skipping chatbot schema SQL [{}]: {}", sql, ex.getMessage());
        }
    }

    private void addColumn(String tableName, String columnName, String definition) {
        try {
            Integer exists = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = ?
                      AND COLUMN_NAME = ?
                    """,
                    Integer.class,
                    tableName,
                    columnName
            );
            if (exists != null && exists > 0) {
                return;
            }
            jdbcTemplate.execute(String.format("ALTER TABLE %s ADD COLUMN %s %s", tableName, columnName, definition));
            log.info("Added {}.{}", tableName, columnName);
        } catch (Exception ex) {
            log.warn("Skipping add column for {}.{}: {}", tableName, columnName, ex.getMessage());
        }
    }
}

package com.hometech.hometech.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class RepairBookingSchemaInitializer {

    private static final Logger log = LoggerFactory.getLogger(RepairBookingSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public RepairBookingSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void ensureRepairBookingColumnsCompatible() {
        alterColumn("ALTER TABLE repair_bookings MODIFY COLUMN status VARCHAR(30) NOT NULL",
                "Ensured repair_bookings.status supports RepairBookingStatus values");

        alterColumn("ALTER TABLE repair_bookings MODIFY COLUMN repair_package_id BIGINT NULL",
                "Ensured repair_bookings.repair_package_id allows trade-in bookings");

        alterColumn("ALTER TABLE repair_bookings MODIFY COLUMN payment_checkout_url VARCHAR(2000)",
                "Ensured repair_bookings.payment_checkout_url supports gateway URLs");

        alterColumn("ALTER TABLE repair_bookings MODIFY COLUMN payment_txn_ref VARCHAR(255)",
                "Ensured repair_bookings.payment_txn_ref has sufficient length");

        addColumn("booking_type", "VARCHAR(30) NOT NULL DEFAULT 'REPAIR'");
        addColumn("estimated_trade_in_amount", "DOUBLE NULL");
        addColumn("final_trade_in_amount", "DOUBLE NULL");
        addColumn("trade_in_health_score", "DOUBLE NULL");
        addColumn("trade_in_offer_range_min", "DOUBLE NULL");
        addColumn("trade_in_offer_range_max", "DOUBLE NULL");
        addColumn("trade_in_condition_name", "VARCHAR(150) NULL");
        addColumn("trade_in_condition_description", "VARCHAR(2000) NULL");
        addColumn("trade_in_battery_health", "INT NULL");
        addColumn("trade_in_functional_status", "VARCHAR(2000) NULL");
        addColumn("trade_in_visual_status", "VARCHAR(2000) NULL");
        addColumn("trade_in_inspection_images_json", "LONGTEXT NULL");
        addColumn("trade_in_ai_image_results_json", "LONGTEXT NULL");
        addColumn("trade_in_video_analysis_json", "LONGTEXT NULL");
        addColumn("trade_in_video_data_url", "LONGTEXT NULL");
    }

    private void alterColumn(String sql, String successLog) {
        try {
            jdbcTemplate.execute(sql);
            log.info(successLog);
        } catch (Exception ex) {
            log.warn("Skipping schema compatibility SQL [{}]: {}", sql, ex.getMessage());
        }
    }

    private void addColumn(String columnName, String definition) {
        try {
            Integer exists = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'repair_bookings'
                      AND COLUMN_NAME = ?
                    """,
                    Integer.class,
                    columnName
            );
            if (exists != null && exists > 0) {
                return;
            }
            jdbcTemplate.execute(String.format("ALTER TABLE repair_bookings ADD COLUMN %s %s", columnName, definition));
            log.info("Added repair_bookings.{}", columnName);
        } catch (Exception ex) {
            log.warn("Skipping add column for repair_bookings.{}: {}", columnName, ex.getMessage());
        }
    }
}

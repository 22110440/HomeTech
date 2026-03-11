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

        alterColumn("ALTER TABLE repair_bookings MODIFY COLUMN payment_checkout_url VARCHAR(2000)",
                "Ensured repair_bookings.payment_checkout_url supports gateway URLs");

        alterColumn("ALTER TABLE repair_bookings MODIFY COLUMN payment_txn_ref VARCHAR(255)",
                "Ensured repair_bookings.payment_txn_ref has sufficient length");
    }

    private void alterColumn(String sql, String successLog) {
        try {
            jdbcTemplate.execute(sql);
            log.info(successLog);
        } catch (Exception ex) {
            log.warn("Skipping schema compatibility SQL [{}]: {}", sql, ex.getMessage());
        }
    }
}

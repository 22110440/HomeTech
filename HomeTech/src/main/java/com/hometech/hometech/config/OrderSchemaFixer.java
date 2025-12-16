package com.hometech.hometech.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Component
public class OrderSchemaFixer {

    private static final Logger log = LoggerFactory.getLogger(OrderSchemaFixer.class);
    private final JdbcTemplate jdbcTemplate;

    public OrderSchemaFixer(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @PostConstruct
    public void applyFixes() {
        ensurePaymentMethodSupportsVnPay();
        ensureOrderInfoSnapshot();
        ensureOrderDiscountSnapshot();
    }

    private void ensurePaymentMethodSupportsVnPay() {
        try {
            String columnType = jdbcTemplate.queryForObject(
                    """
                            SELECT COLUMN_TYPE
                            FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = DATABASE()
                              AND TABLE_NAME = 'orders'
                              AND COLUMN_NAME = 'payment_method'
                            """,
                    String.class
            );

            if (columnType != null
                    && columnType.startsWith("enum(")
                    && !columnType.contains("VNPAY")) {
                log.info("Updating orders.payment_method enum to include VNPAY");
                jdbcTemplate.execute(
                        "ALTER TABLE orders " +
                                "MODIFY payment_method ENUM('COD','MOMO','CARD','VNPAY') " +
                                "DEFAULT 'COD'"
                );
                log.info("orders.payment_method enum updated successfully");
            }
        } catch (Exception ex) {
            log.warn("Could not verify/alter orders.payment_method column: {}", ex.getMessage());
        }
    }

    private void ensureOrderInfoSnapshot() {
        try {
            boolean orderInfoExists = tableExists("order_info");
            boolean orderAddressesExists = tableExists("order_addresses");

            if (!orderInfoExists && orderAddressesExists) {
                log.info("Renaming table order_addresses to order_info");
                jdbcTemplate.execute("RENAME TABLE order_addresses TO order_info");
                orderInfoExists = true;
            }

            if (orderInfoExists) {
                ensureEmailColumn();
            }

            boolean hasOrderInfoId = columnExists("orders", "order_info_id");
            boolean hasOrderAddressId = columnExists("orders", "order_address_id");

            if (!hasOrderInfoId && hasOrderAddressId) {
                log.info("Renaming orders.order_address_id to orders.order_info_id");
                jdbcTemplate.execute("ALTER TABLE orders CHANGE order_address_id order_info_id BIGINT");
            }
        } catch (Exception ex) {
            log.warn("Could not verify/alter order_info schema: {}", ex.getMessage());
        }
    }

    private void ensureEmailColumn() {
        if (!columnExists("order_info", "email")) {
            log.info("Adding email column to order_info");
            jdbcTemplate.execute("ALTER TABLE order_info ADD COLUMN email VARCHAR(255)");
        }
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.tables
                        WHERE table_schema = DATABASE()
                          AND table_name = ?
                        """,
                Integer.class,
                tableName
        );
        return count != null && count > 0;
    }

    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
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
        return count != null && count > 0;
    }

    private void ensureOrderDiscountSnapshot() {
        try {
            addColumnIfMissing("orders", "voucher_code_snapshot", "VARCHAR(255)");
            addColumnIfMissing("orders", "discount_amount", "DOUBLE DEFAULT 0");
        } catch (Exception ex) {
            log.warn("Could not verify/alter voucher snapshot columns: {}", ex.getMessage());
        }
    }

    private void addColumnIfMissing(String tableName, String columnName, String definition) {
        if (!columnExists(tableName, columnName)) {
            log.info("Adding column {}.{} ({})", tableName, columnName, definition);
            jdbcTemplate.execute(String.format("ALTER TABLE %s ADD COLUMN %s %s", tableName, columnName, definition));
        }
    }
}

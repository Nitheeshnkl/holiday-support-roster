package com.holidayroster.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.holidayroster.RosterApplication;
import com.holidayroster.audit.infrastructure.AuditEventRepository;
import com.holidayroster.organization.domain.Employee;
import com.holidayroster.organization.domain.Team;
import com.holidayroster.organization.domain.TeamLeadAssignment;
import com.holidayroster.organization.application.OrganizationService;
import com.holidayroster.organization.infrastructure.EmployeeRepository;
import com.holidayroster.organization.infrastructure.TeamLeadAssignmentRepository;
import com.holidayroster.organization.infrastructure.TeamRepository;
import com.holidayroster.notification.infrastructure.NotificationDeliveryRepository;
import com.holidayroster.notification.infrastructure.NotificationOutboxRepository;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.flywaydb.core.api.MigrationState;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import jakarta.persistence.EntityManager;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import com.github.dockerjava.api.command.InspectContainerResponse;

@Testcontainers(disabledWithoutDocker = true)
@ActiveProfiles("test")
@SpringBootTest(classes = RosterApplication.class, webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@Import(MySqlPersistenceIntegrationTest.MySqlTestMigrationConfiguration.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class MySqlPersistenceIntegrationTest {

    private static final String DATABASE = "holiday_roster_dev";
    private static final String MIGRATION_PASSWORD = randomSecret();
    private static final String APP_PASSWORD = randomSecret();

    static final class RosterMySQLContainer extends MySQLContainer<RosterMySQLContainer> {

        RosterMySQLContainer() {
            super("mysql:9.7.1");
        }

        @Override
        protected void containerIsStarted(InspectContainerResponse containerInfo) {
            try (Connection connection = DriverManager.getConnection(
                    getJdbcUrl(), "root", getPassword());
                 Statement statement = connection.createStatement()) {
                statement.execute("CREATE USER 'roster_app'@'%' IDENTIFIED BY '" + APP_PASSWORD + "'");
                statement.execute("GRANT SELECT, INSERT ON `" + DATABASE + "`.* TO 'roster_app'@'%'");
            } catch (SQLException exception) {
                throw new IllegalStateException("Could not provision isolated integration-test principals.", exception);
            }
        }
    }

    @Container
    static final RosterMySQLContainer MYSQL = new RosterMySQLContainer()
            .withDatabaseName(DATABASE)
            .withUsername("roster_migrator")
            .withPassword(MIGRATION_PASSWORD);

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    Flyway flyway;

    @Autowired
    AuditEventRepository auditEvents;

    @Autowired
    NotificationOutboxRepository outbox;

    @Autowired
    NotificationDeliveryRepository deliveries;

    @Autowired
    EmployeeRepository employees;

    @Autowired
    TeamRepository teams;

    @Autowired
    TeamLeadAssignmentRepository teamLeads;

    @Autowired
    OrganizationService organizationService;

    @Autowired
    EntityManager entityManager;

    @Configuration(proxyBeanMethods = false)
    static class MySqlTestMigrationConfiguration {
        @Bean
        FlywayMigrationStrategy migrateThenGrantRuntimeTableUpdates() {
            return flyway -> {
                flyway.migrate();
                grantRuntimeTableUpdates();
            };
        }
    }

    static void grantRuntimeTableUpdates() {
        try (Connection connection = DriverManager.getConnection(MYSQL.getJdbcUrl(), "root", MYSQL.getPassword());
             Statement statement = connection.createStatement()) {
            for (String table : new String[] {
                    "organisation_setting", "employee", "team", "team_membership",
                    "team_lead_assignment", "user_account", "account_action_token", "user_role_assignment", "holiday", "availability_record",
                    "notification_outbox"
            }) {
                statement.execute("GRANT UPDATE ON `" + DATABASE + "`." + table + " TO 'roster_app'@'%'");
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Could not grant the runtime principal its post-migration table privileges.", exception);
        }
    }

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry properties) {
        properties.add("DB_URL", MYSQL::getJdbcUrl);
        properties.add("DB_APP_USERNAME", () -> "roster_app");
        properties.add("DB_APP_PASSWORD", () -> APP_PASSWORD);
        properties.add("DB_MIGRATION_URL", MYSQL::getJdbcUrl);
        properties.add("DB_MIGRATION_USERNAME", MYSQL::getUsername);
        properties.add("DB_MIGRATION_PASSWORD", MYSQL::getPassword);
        properties.add("SESSION_COOKIE_SECURE", () -> "false");
    }

    @Test
    @Order(1)
    void forwardMigrationsCreateOrganizationSchemaAndSequenceAccountForeignKeysAfterAccountTable() {
        var applied = Arrays.stream(flyway.info().applied())
                .filter(migration -> migration.getVersion() != null)
                .toList();
        assertThat(applied).hasSize(8);
        assertThat(applied).extracting(migration -> migration.getVersion().getVersion())
                .containsExactly("1", "2", "3", "4", "5", "6", "7", "8");
        assertThat(applied).allSatisfy(migration -> assertThat(migration.getState()).isEqualTo(MigrationState.SUCCESS));

        assertTableExists("audit_event");
        assertTableExists("notification_outbox");
        assertTableExists("notification_delivery");
        assertTableExists("organisation_setting");
        assertTableExists("employee");
        assertTableExists("team");
        assertTableExists("team_membership");
        assertTableExists("team_lead_assignment");
        assertTableExists("user_account");
        assertTableExists("account_action_token");
        assertTableExists("app_role");
        assertTableExists("permission");
        assertTableExists("role_permission");
        assertTableExists("user_role_assignment");
        assertTableExists("holiday");
        assertTableExists("availability_record");
        assertIndexExists("audit_event", "ix_audit_event_target_time");
        assertIndexExists("notification_outbox", "uk_notification_outbox_event_key");
        assertIndexExists("notification_delivery", "uk_notification_delivery_attempt");
        assertIndexExists("employee", "uq_employee_work_email");
        assertConstraintExists("audit_event", "ck_audit_event_actor_type");
        assertConstraintExists("notification_outbox", "ck_notification_outbox_delivery_status");
        assertConstraintExists("notification_delivery", "ck_notification_delivery_channel");
        assertThat(userAccountReferenceCount()).isEqualTo(2);
        assertThat(teamLeadAccountReferenceCount()).isEqualTo(1);
        assertThat(columnIsNullable("team_lead_assignment", "assigned_by_user_account_id")).isTrue();
        assertThat(columnExists("team_lead_assignment", "row_version")).isTrue();
        assertThat(columnIsNullable("employee", "work_email")).isFalse();
        assertThat(columnLength("team", "team_name")).isEqualTo(160);
        assertConstraintExists("availability_record", "ck_availability_dates");
        assertIndexExists("availability_record", "ix_availability_employee_interval");
    }

    @Test
    @Order(2)
    @Transactional
    void runtimePrincipalPersistsAuditOutboxAndDeliveryAndCannotMutateAuditRows() {
        String correlationId = "mysql-it-" + UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        assertThat(auditEvents.append(null, "SYSTEM", "INTEGRATION_TEST", "IntegrationTest", null,
                now, "transactional integration probe", correlationId, null, null,
                "integration-test", now)).isEqualTo(1);
        assertThat(auditEvents.findByCorrelationId(correlationId)).isPresent();

        String eventKey = "mysql-it-" + UUID.randomUUID();
        assertThat(outbox.append(eventKey, "INTEGRATION_TEST", "IntegrationTest", 1L,
                null, null, null, "integration-test", "non-sensitive test payload",
                "PENDING", (short) 0, null, now, now)).isEqualTo(1);
        var notification = outbox.findByEventKey(eventKey).orElseThrow();

        assertThat(deliveries.append(notification.getId(), "IN_APP", (short) 1, "SENT",
                null, now, null, null, now)).isEqualTo(1);
        assertThat(deliveries.findByNotificationOutbox_IdOrderByAttemptNumberAsc(notification.getId()))
                .singleElement()
                .satisfies(delivery -> {
                    assertThat(delivery.getChannelCode()).isEqualTo("IN_APP");
                    assertThat(delivery.getDeliveryStatus()).isEqualTo("SENT");
                });

        String grants = String.join(" ", jdbc.queryForList("SHOW GRANTS FOR CURRENT_USER()", String.class))
                .toUpperCase();
        assertThat(grants).contains("SELECT", "INSERT")
                .contains("UPDATE")
                .doesNotContain("DELETE", "ALL PRIVILEGES");
        assertThat(tablePrivilegeCount("audit_event", "UPDATE")).isZero();
        assertThat(tablePrivilegeCount("notification_delivery", "UPDATE")).isZero();
        assertThat(tablePrivilegeCount("employee", "UPDATE")).isEqualTo(1);

        assertThrows(org.springframework.dao.DataAccessException.class,
                () -> jdbc.update("UPDATE audit_event SET reason = reason WHERE correlation_id = ?", correlationId));
        assertThrows(org.springframework.dao.DataAccessException.class,
                () -> jdbc.update("DELETE FROM audit_event WHERE correlation_id = ?", correlationId));
    }

    @Test
    @Order(3)
    @Transactional
    void mysqlEnforcesCheckConstraintsAndDeferredAccountForeignKeys() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("""
                INSERT INTO audit_event (actor_type, action_code, target_type, occurred_at_utc,
                    source_module, created_at_utc)
                VALUES ('INVALID', 'TEST', 'IntegrationTest', ?, 'integration-test', ?)
                """, now, now));

        assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("""
                INSERT INTO notification_outbox (event_key, event_type, aggregate_type, aggregate_id,
                    template_code, delivery_status, attempt_count, created_at_utc, updated_at_utc)
                VALUES (?, 'TEST', 'IntegrationTest', 1, 'integration-test', 'INVALID', 0, ?, ?)
                """, "mysql-invalid-" + UUID.randomUUID(), now, now));

        assertConstraintExists("notification_outbox", "fk_notification_outbox_recipient_user_account");
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.key_column_usage
                WHERE table_schema = DATABASE() AND table_name = 'notification_outbox'
                  AND column_name = 'recipient_user_account_id'
                  AND referenced_table_name = 'user_account'
                  AND referenced_column_name = 'id'
                """, Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT @@SESSION.FOREIGN_KEY_CHECKS", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT @@GLOBAL.FOREIGN_KEY_CHECKS", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                SELECT engine FROM information_schema.tables
                WHERE table_schema = DATABASE() AND table_name = 'notification_outbox'
                """, String.class)).isEqualToIgnoringCase("InnoDB");
        assertThat(jdbc.queryForObject("""
                SELECT constraint_type FROM information_schema.table_constraints
                WHERE table_schema = DATABASE() AND table_name = 'notification_outbox'
                  AND constraint_name = 'fk_notification_outbox_recipient_user_account'
                """, String.class)).isEqualTo("FOREIGN KEY");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_account WHERE id = 999999999", Integer.class))
                .isZero();
        assertThrows(SQLException.class, () -> {
            try (Connection root = DriverManager.getConnection(MYSQL.getJdbcUrl(), "root", MYSQL.getPassword());
                 Statement statement = root.createStatement()) {
                statement.execute("SET FOREIGN_KEY_CHECKS = 1");
                statement.execute("INSERT INTO notification_outbox (event_key,event_type,aggregate_type,aggregate_id,recipient_user_account_id,template_code,delivery_status,attempt_count,created_at_utc,updated_at_utc) VALUES ('root-invalid-fk-probe','TEST','IntegrationTest',1,999999999,'probe','PENDING',0,NOW(6),NOW(6))");
            }
        });
        assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("""
                INSERT INTO notification_outbox (event_key, event_type, aggregate_type, aggregate_id,
                    recipient_user_account_id, template_code, delivery_status, attempt_count,
                    created_at_utc, updated_at_utc)
                VALUES (?, 'TEST', 'IntegrationTest', 1, 999999999, 'integration-test',
                    'PENDING', 0, ?, ?)
                """, "mysql-runtime-invalid-fk-" + UUID.randomUUID(), now, now));

        LocalDate today = now.toLocalDate();
        String email = "unique-" + UUID.randomUUID() + "@example.test";
        String employeeCode = "U" + UUID.randomUUID().toString().substring(0, 8);
        jdbc.update("""
                INSERT INTO employee (employee_code,first_name,last_name,work_email,employment_start_date,
                    status,created_at_utc,updated_at_utc,row_version)
                VALUES (?, 'Unique', 'Probe', ?, ?, 'ACTIVE', ?, ?, 0)
                """, employeeCode, email, today, now, now);
        assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbc.update("""
                INSERT INTO employee (employee_code,first_name,last_name,work_email,employment_start_date,
                    status,created_at_utc,updated_at_utc,row_version)
                VALUES (?, 'Duplicate', 'Probe', ?, ?, 'ACTIVE', ?, ?, 0)
                """, "D" + UUID.randomUUID().toString().substring(0, 8), email, today, now, now));
    }

    @Test
    @Order(4)
    @Transactional
    void mysqlPersistsEmployeeTeamAndVersionedTeamLeadWithActorAudit() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        var today = now.toLocalDate();
        String suffix = UUID.randomUUID().toString();
        Employee employee = employees.save(new Employee("IT-" + suffix.substring(0, 8), "Integration", "Member",
                suffix + "@example.test", today.minusDays(30), null, today, null, now.toInstant(ZoneOffset.UTC)));
        Team team = teams.save(new Team("IT-" + suffix.substring(0, 8), "Integration Team", today,
                now.toInstant(ZoneOffset.UTC)));
        var accountKey = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                    INSERT INTO user_account (employee_id, username, email, password_hash, account_status,
                        failed_login_count, created_at_utc, updated_at_utc)
                    VALUES (?, ?, ?, 'integration-test-hash', 'PENDING', 0, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, employee.getId());
            statement.setString(2, "it-" + suffix);
            statement.setString(3, suffix + "-account@example.test");
            statement.setObject(4, now);
            statement.setObject(5, now);
            return statement;
        }, accountKey);
        Long accountId = accountKey.getKey().longValue();

        TeamLeadAssignment assignment = teamLeads.save(new TeamLeadAssignment(
                team.getId(), employee.getId(), today, null, accountId, now.toInstant(ZoneOffset.UTC)));
        entityManager.flush();
        assertThat(assignment.getRowVersion()).isZero();
        assertThat(teamLeads.findById(assignment.getId())).isPresent();

        String correlationId = "mysql-lead-it-" + suffix;
        assertThat(auditEvents.append(accountId, "USER", "TEAM_LEAD_APPOINTED", "TeamLeadAssignment",
                assignment.getId(), now, "integration test", correlationId, null, "created",
                "organization", now)).isEqualTo(1);
        assignment.closeOn(today.plusDays(20));
        teamLeads.save(assignment);
        entityManager.flush();
        assertThat(assignment.getRowVersion()).isEqualTo(1L);
        assertThat(auditEvents.findByCorrelationId(correlationId)).isPresent()
                .get().extracting(event -> event.getActorUserAccountId()).isEqualTo(accountId);

        var administrator = UsernamePasswordAuthenticationToken.authenticated("it-" + suffix, "", Arrays.asList(
                new SimpleGrantedAuthority("ROLE_ADMIN"),
                new SimpleGrantedAuthority("ORG.TEAM_LEAD.MANAGE"),
                new SimpleGrantedAuthority("SCOPE:ORG")));
        assertThrows(OrganizationService.OrganizationValidationException.class,
                () -> organizationService.appointTeamLead(team.getId(), "\"0\"", employee.getId(),
                        today.plusDays(10), administrator));
        assertThat(teamLeads.findByTeamIdOrderByValidFromDesc(team.getId())).hasSize(1);
    }

    private void assertTableExists(String table) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema = DATABASE() AND table_name = ?
                """, Integer.class, table);
        assertThat(count).isEqualTo(1);
    }

    private void assertIndexExists(String table, String index) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.statistics
                WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
                """, Integer.class, table, index);
        assertThat(count).isGreaterThan(0);
    }

    private void assertConstraintExists(String table, String constraint) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.table_constraints
                WHERE table_schema = DATABASE() AND table_name = ? AND constraint_name = ?
                """, Integer.class, table, constraint);
        assertThat(count).isEqualTo(1);
    }

    private int userAccountReferenceCount() {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.key_column_usage
                WHERE table_schema = DATABASE()
                    AND table_name IN ('audit_event', 'notification_outbox')
                    AND referenced_table_name = 'user_account'
                """, Integer.class);
        return count == null ? 0 : count;
    }

    private int teamLeadAccountReferenceCount() {
        return referenceCount("team_lead_assignment", "user_account");
    }

    private int referenceCount(String table, String referencedTable) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.key_column_usage
                WHERE table_schema = DATABASE() AND table_name = ?
                    AND referenced_table_name = ?
                """, Integer.class, table, referencedTable);
        return count == null ? 0 : count;
    }

    private boolean columnIsNullable(String table, String column) {
        String nullable = jdbc.queryForObject("""
                SELECT IS_NULLABLE FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
                """, String.class, table, column);
        return "YES".equalsIgnoreCase(nullable);
    }

    private int tablePrivilegeCount(String table, String privilege) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.table_privileges
                WHERE table_schema = DATABASE() AND table_name = ?
                    AND privilege_type = ? AND grantee LIKE '%roster_app%'
                """, Integer.class, table, privilege);
        return count == null ? 0 : count;
    }

    private int columnLength(String table, String column) {
        Integer length = jdbc.queryForObject("""
                SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
                """, Integer.class, table, column);
        return length == null ? 0 : length;
    }

    private boolean columnExists(String table, String column) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?
                """, Integer.class, table, column);
        return count != null && count == 1;
    }

    private static String randomSecret() {
        return UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    }
}

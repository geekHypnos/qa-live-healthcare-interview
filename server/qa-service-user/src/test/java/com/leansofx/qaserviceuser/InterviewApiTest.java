package com.leansofx.qaserviceuser;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.junit.jupiter.api.BeforeEach;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InterviewApiTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;

    @BeforeEach void seed() {
        db.execute("CREATE TABLE IF NOT EXISTS doctors(id VARCHAR(32) PRIMARY KEY, username VARCHAR(64), name VARCHAR(80), title VARCHAR(80), department VARCHAR(80), avatar VARCHAR(500), experience VARCHAR(100), specialties VARCHAR(1000), is_active BOOLEAN)");
        db.execute("CREATE TABLE IF NOT EXISTS patients(id VARCHAR(32) PRIMARY KEY, name VARCHAR(80), birthday VARCHAR(20), phone VARCHAR(30), gender VARCHAR(20))");
        db.execute("CREATE TABLE IF NOT EXISTS accounts(id VARCHAR(32) PRIMARY KEY, username VARCHAR(64) UNIQUE, password_hash VARCHAR(100), role VARCHAR(20), profile_id VARCHAR(32))");
        db.update("DELETE FROM accounts"); db.update("DELETE FROM doctors"); db.update("DELETE FROM patients");
        db.update("INSERT INTO doctors VALUES('doc001','dr-zhang-wei','张伟医生','主任医师','心内科','','15年临床经验','[\"高血压\"]',true)");
        db.update("INSERT INTO patients VALUES('patient001','赵明','1985-03-15','','男')");
        var encoder = new BCryptPasswordEncoder();
        db.update("INSERT INTO accounts VALUES('a1','patient001',?,'PATIENT','patient001')", encoder.encode("Patient123!"));
        db.update("INSERT INTO accounts VALUES('a2','dr-zhang-wei',?,'DOCTOR','doc001')", encoder.encode("123456"));
    }

    @Test void doctorsArePublicAndDoNotExposePasswords() throws Exception {
        mvc.perform(get("/api/doctors")).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("doc001"))
            .andExpect(jsonPath("$[0].specialties[0]").value("高血压"))
            .andExpect(jsonPath("$[0].password").doesNotExist())
            .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
    }
    @Test void identityRequiresSession() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void csrfEndpointProvidesToken() throws Exception {
        mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk())
            .andExpect(jsonPath("$.token", not(emptyString())))
            .andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"));
    }
    @Test void csrfIsRequiredForLoginAndLogout() throws Exception {
        mvc.perform(post("/api/auth/login").contentType("application/json").content(credentials("patient001","Patient123!")))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/logout")).andExpect(status().isForbidden());
    }
    @Test void invalidCredentialsShareSameError() throws Exception {
        for (String user : new String[]{"patient001", "missing"}) {
            mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content(credentials(user,"wrong")))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        }
    }
    @Test void invalidJsonAndParametersAreRejected() throws Exception {
        for (String body : new String[]{"{", "{}", credentials("a".repeat(65),"test"), credentials("patient001","密".repeat(25)), "{\"username\":12,\"password\":true}"}) {
            mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
        }
    }
    @Test void patientSessionPersistsAndLogoutInvalidatesIt() throws Exception {
        var login = mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content(credentials("patient001","Patient123!")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("PATIENT"))
            .andExpect(jsonPath("$.profile.id").value("patient001")).andReturn();
        var session = (MockHttpSession) login.getRequest().getSession(false);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isOk());
        org.junit.jupiter.api.Assertions.assertTrue(session.isInvalid());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void doctorRoleIsDeterminedByDatabase() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content(credentials("dr-zhang-wei","123456")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("DOCTOR"))
            .andExpect(jsonPath("$.profile.username").value("dr-zhang-wei"))
            .andExpect(jsonPath("$.profile.password").doesNotExist());
    }
    @Test void usernameLengthIsCheckedAfterTrimming() throws Exception {
        // 64 字符账号在数据库中合法，首尾空白不应计入账号长度。
        String username = "u".repeat(64);
        db.update("UPDATE accounts SET username = ? WHERE id = 'a1'", username);
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json")
            .content(credentials("  " + username + "  ", "Patient123!")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("PATIENT"));
    }
    @Test void optionalPatientFieldsMayBeNull() throws Exception {
        // SQL 允许这些字段为空，不能因 Map.of 不接受 null 而让正常账号登录失败。
        db.update("UPDATE patients SET birthday = NULL, phone = NULL, gender = NULL WHERE id = 'patient001'");
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json")
            .content(credentials("patient001", "Patient123!")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.profile.id").value("patient001"))
            .andExpect(jsonPath("$.profile.phone").value(""));
    }
    @Test void failedAccountSwitchInvalidatesOldSession() throws Exception {
        var login = mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json")
            .content(credentials("patient001", "Patient123!"))).andExpect(status().isOk()).andReturn();
        var session = (MockHttpSession) login.getRequest().getSession(false);
        mvc.perform(post("/api/auth/login").session(session).with(csrf()).contentType("application/json")
            .content(credentials("missing", "wrong"))).andExpect(status().isUnauthorized());
        org.junit.jupiter.api.Assertions.assertTrue(session.isInvalid());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void successfulLoginRotatesExistingSessionId() throws Exception {
        var session = new MockHttpSession();
        String previousId = session.getId();
        mvc.perform(post("/api/auth/login").session(session).with(csrf()).contentType("application/json")
            .content(credentials("patient001", "Patient123!"))).andExpect(status().isOk());
        org.junit.jupiter.api.Assertions.assertNotEquals(previousId, session.getId());
    }
    @Test void databaseFailureReturnsSanitizedError() throws Exception {
        db.execute("ALTER TABLE doctors RENAME TO doctors_unavailable");
        try {
            mvc.perform(get("/api/doctors")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("SERVICE_ERROR"))
                .andExpect(jsonPath("$.message").value("服务暂不可用，请稍后重试"))
                .andExpect(jsonPath("$.trace").doesNotExist());
        } finally { db.execute("ALTER TABLE doctors_unavailable RENAME TO doctors"); }
    }
    private String credentials(String username, String password) {
        return "{\"username\":\""+username+"\",\"password\":\""+password+"\"}";
    }
}

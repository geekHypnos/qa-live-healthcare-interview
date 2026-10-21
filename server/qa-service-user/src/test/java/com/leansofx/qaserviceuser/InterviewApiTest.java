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
    private String credentials(String username, String password) {
        return "{\"username\":\""+username+"\",\"password\":\""+password+"\"}";
    }
}

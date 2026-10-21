package com.leansofx.qaserviceuser.auth;

import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import com.leansofx.qaserviceuser.doctor.DoctorRepository;

@Service
public class AccountService {
    private final JdbcTemplate jdbc;
    private final DoctorRepository doctors;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final String dummyHash = encoder.encode("not-a-real-account");
    public AccountService(JdbcTemplate jdbc, DoctorRepository doctors) { this.jdbc = jdbc; this.doctors = doctors; }
    public SessionIdentity authenticate(String username, String password) {
        var rows = jdbc.queryForList("SELECT id, password_hash, role, profile_id FROM accounts WHERE username = ?", username);
        // 未知账号也执行一次 BCrypt，避免直接通过响应耗时区分账号是否存在。
        String hash = rows.isEmpty() ? dummyHash : (String) rows.get(0).get("password_hash");
        boolean matches = encoder.matches(password, hash);
        if (rows.isEmpty() || !matches) throw new BadCredentialsException("Invalid credentials");
        var account = rows.get(0);
        String role = (String) account.get("role"), id = (String) account.get("profile_id");
        Object profile;
        if ("DOCTOR".equals(role)) { profile = doctors.findById(id); }
        else if ("PATIENT".equals(role)) {
            profile = jdbc.queryForObject("SELECT id, name, birthday, phone, gender FROM patients WHERE id = ?",
                (rs, n) -> Map.of("id", rs.getString("id"), "name", rs.getString("name"),
                    "birthday", rs.getString("birthday"), "phone", rs.getString("phone"), "gender", rs.getString("gender")), id);
        } else { throw new BadCredentialsException("Invalid role"); }
        return new SessionIdentity(role, (String) account.get("id"), profile);
    }
}

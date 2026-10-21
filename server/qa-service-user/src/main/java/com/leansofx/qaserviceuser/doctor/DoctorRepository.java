package com.leansofx.qaserviceuser.doctor;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DoctorRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    public DoctorRepository(JdbcTemplate jdbc, ObjectMapper mapper) { this.jdbc = jdbc; this.mapper = mapper; }
    public List<DoctorDto> findAll() { return jdbc.query("SELECT * FROM doctors ORDER BY id", this::read); }
    public DoctorDto findById(String id) {
        return jdbc.query("SELECT * FROM doctors WHERE id = ?", this::read, id).stream().findFirst().orElseThrow();
    }
    private DoctorDto read(ResultSet rs, int row) throws SQLException {
        try {
            List<String> specialties = mapper.readValue(rs.getString("specialties"), new TypeReference<List<String>>() {});
            return new DoctorDto(rs.getString("id"), rs.getString("username"), rs.getString("name"),
                rs.getString("title"), rs.getString("department"), rs.getString("avatar"),
                rs.getString("experience"), specialties, rs.getBoolean("is_active"));
        } catch (java.io.IOException e) { throw new SQLException("Invalid stored specialties", e); }
    }
}

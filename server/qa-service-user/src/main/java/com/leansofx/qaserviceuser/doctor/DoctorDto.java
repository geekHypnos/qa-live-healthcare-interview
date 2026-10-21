package com.leansofx.qaserviceuser.doctor;

import java.io.Serializable;
import java.util.List;

// 对外仅提供展示资料，账号凭据永远不进入这个 DTO。
public record DoctorDto(String id, String username, String name, String title,
        String department, String avatar, String experience, List<String> specialties,
        boolean isActive) implements Serializable {}

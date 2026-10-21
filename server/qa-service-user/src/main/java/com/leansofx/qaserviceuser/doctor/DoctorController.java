package com.leansofx.qaserviceuser.doctor;

import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {
    private final DoctorRepository doctors;
    public DoctorController(DoctorRepository doctors) { this.doctors = doctors; }
    @GetMapping public List<DoctorDto> list() { return doctors.findAll(); }
}

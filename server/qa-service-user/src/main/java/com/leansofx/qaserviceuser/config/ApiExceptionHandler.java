package com.leansofx.qaserviceuser.config;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<?> credentials() { return error(401, "INVALID_CREDENTIALS", "用户名或密码错误"); }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class, IllegalArgumentException.class})
    ResponseEntity<?> input() { return error(400, "INVALID_INPUT", "输入不合法，请检查用户名和密码"); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> failure() { return error(500, "SERVICE_ERROR", "服务暂不可用，请稍后重试"); }
    private ResponseEntity<?> error(int status, String code, String message) {
        return ResponseEntity.status(status).body(Map.of("code", code, "message", message));
    }
}

package com.leansofx.qaserviceuser.config;

import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

@Configuration
public class SecurityConfig {
    @Bean CsrfTokenRepository csrfRepository() { return new HttpSessionCsrfTokenRepository(); }
    @Bean SecurityFilterChain security(HttpSecurity http, CsrfTokenRepository csrf, ObjectMapper mapper) throws Exception {
        http.csrf(c -> c.csrfTokenRepository(csrf))
            .authorizeHttpRequests(a -> a.requestMatchers("/api/doctors", "/api/auth/csrf", "/api/auth/login", "/actuator/health", "/error").permitAll()
                .requestMatchers("/api/auth/me").authenticated().anyRequest().denyAll())
            .requestCache(c -> c.disable())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> {
                    res.setStatus(401); res.setContentType("application/json;charset=UTF-8");
                    mapper.writeValue(res.getWriter(), Map.of("code", "UNAUTHENTICATED", "message", "请先登录"));
                })
                .accessDeniedHandler((req, res, ex) -> {
                    res.setStatus(403); res.setContentType("application/json;charset=UTF-8");
                    mapper.writeValue(res.getWriter(), Map.of("code", "FORBIDDEN", "message", "请求验证失败，请重试"));
                }))
            .logout(l -> l.logoutUrl("/api/auth/logout").invalidateHttpSession(true).clearAuthentication(true).deleteCookies("JSESSIONID")
                .logoutSuccessHandler((req, res, auth) -> {
                    res.setContentType("application/json;charset=UTF-8");
                    mapper.writeValue(res.getWriter(), Map.of("message", "已退出登录"));
                }));
        return http.build();
    }
}

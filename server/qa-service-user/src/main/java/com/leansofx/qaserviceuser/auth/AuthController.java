package com.leansofx.qaserviceuser.auth;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AccountService accounts;
    private final CsrfTokenRepository csrf;
    private final HttpSessionSecurityContextRepository contexts = new HttpSessionSecurityContextRepository();
    public AuthController(AccountService accounts, CsrfTokenRepository csrf) { this.accounts = accounts; this.csrf = csrf; }
    public record LoginRequest(@NotBlank @Size(max=64) String username, @NotBlank @Size(max=128) String password) {
        public LoginRequest {
            // 先规范账号再验证长度；密码保持原值，不裁剪空白。
            if (username != null) username = username.trim();
        }
    }

    @GetMapping("/csrf") public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }
    @PostMapping("/login") public SessionIdentity login(@Valid @RequestBody LoginRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        if (body.password().getBytes(StandardCharsets.UTF_8).length > 72) throw new IllegalArgumentException("Password too long");
        SessionIdentity identity;
        try { identity = accounts.authenticate(body.username(), body.password()); }
        catch (BadCredentialsException e) {
            // 失败的账号切换不能留下上一个账号的有效身份。
            if (request.getSession(false) != null) request.getSession(false).invalidate();
            SecurityContextHolder.clearContext();
            throw e;
        }
        request.getSession(true);
        request.changeSessionId();
        var authentication = UsernamePasswordAuthenticationToken.authenticated(identity, null,
            List.of(new SimpleGrantedAuthority("ROLE_" + identity.role())));
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        // Spring Security 6 自定义登录必须显式保存上下文，下一次请求才能恢复身份。
        contexts.saveContext(context, request, response);
        csrf.saveToken(null, request, response);
        return identity;
    }
    @GetMapping("/me") public SessionIdentity me(Authentication auth) { return (SessionIdentity) auth.getPrincipal(); }
}

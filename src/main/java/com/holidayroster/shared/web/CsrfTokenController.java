package com.holidayroster.shared.web;

import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CsrfTokenController {
    @GetMapping({"/api/v2/session/csrf", "/api/v1/session/csrf"})
    public ResponseEntity<Map<String, String>> csrfToken(CsrfToken csrfToken) {
        // Calling getToken materializes Spring Security's session-backed deferred token.
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(Map.of("csrfToken", csrfToken.getToken()));
    }
}

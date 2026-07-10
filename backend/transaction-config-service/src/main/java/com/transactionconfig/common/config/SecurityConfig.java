package com.transactionconfig.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Security configuration for request validation and rate limiting.
 */
@Configuration
public class SecurityConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new RequestValidationInterceptor());
    }

    /**
     * Interceptor to validate requests before they reach controllers.
     */
    private static class RequestValidationInterceptor implements HandlerInterceptor {
        
        private static final int MAX_URI_LENGTH = 2048;
        private static final int MAX_HEADER_VALUE_LENGTH = 8192;
        
        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
            // Validate URI length
            String uri = request.getRequestURI();
            if (uri != null && uri.length() > MAX_URI_LENGTH) {
                response.setStatus(414); // URI Too Long
                return false;
            }
            
            // Validate header sizes
            var headerNames = request.getHeaderNames();
            if (headerNames != null) {
                while (headerNames.hasMoreElements()) {
                    String headerName = headerNames.nextElement();
                    String headerValue = request.getHeader(headerName);
                    if (headerValue != null && headerValue.length() > MAX_HEADER_VALUE_LENGTH) {
                        response.setStatus(431); // Request Header Fields Too Large
                        return false;
                    }
                }
            }
            
            return true;
        }
    }
}

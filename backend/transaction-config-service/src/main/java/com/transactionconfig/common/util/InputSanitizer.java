package com.transactionconfig.common.util;

import org.springframework.stereotype.Component;

/**
 * Utility class for sanitizing user input to prevent XSS and injection attacks.
 */
@Component
public class InputSanitizer {

    /**
     * Sanitize input by escaping HTML special characters to prevent XSS attacks.
     * 
     * @param input the raw input string
     * @return sanitized string with HTML characters escaped
     */
    public static String sanitizeHtml(String input) {
        if (input == null) {
            return null;
        }
        
        return input
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;")
            .replace("/", "&#x2F;");
    }

    /**
     * Remove potentially dangerous characters from input.
     * Allows alphanumeric, spaces, and common punctuation only.
     * 
     * @param input the raw input string
     * @return cleaned string
     */
    public static String removeSpecialCharacters(String input) {
        if (input == null) {
            return null;
        }
        
        // Allow letters, numbers, spaces, and safe punctuation
        return input.replaceAll("[^a-zA-Z0-9\\s.,!?@#()\\-_/]", "");
    }

    /**
     * Validate and clean ISIN codes.
     * 
     * @param isin the ISIN code
     * @return cleaned ISIN (uppercase, trimmed, alphanumeric only)
     */
    public static String sanitizeIsin(String isin) {
        if (isin == null) {
            return null;
        }
        
        return isin.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
    }

    /**
     * Truncate string to maximum length to prevent buffer overflow.
     * 
     * @param input the input string
     * @param maxLength maximum allowed length
     * @return truncated string
     */
    public static String truncate(String input, int maxLength) {
        if (input == null) {
            return null;
        }
        
        return input.length() > maxLength ? input.substring(0, maxLength) : input;
    }

    /**
     * Check if string contains SQL injection patterns.
     * 
     * @param input the input to check
     * @return true if suspicious patterns detected
     */
    public static boolean containsSqlInjectionPatterns(String input) {
        if (input == null) {
            return false;
        }
        
        String lower = input.toLowerCase();
        String[] patterns = {
            "' or '1'='1",
            "' or 1=1",
            "'; drop table",
            "'; delete from",
            "' union select",
            "<script>",
            "javascript:",
            "onerror="
        };
        
        for (String pattern : patterns) {
            if (lower.contains(pattern)) {
                return true;
            }
        }
        
        return false;
    }
}

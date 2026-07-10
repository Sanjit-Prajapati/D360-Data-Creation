package com.transactionconfig.isin.validator;

import com.transactionconfig.common.util.InputSanitizer;
import com.transactionconfig.isin.repository.IsinRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class IsinValidator {

    private static final Pattern ISIN_PATTERN = Pattern.compile("^[A-Z0-9]{12}$");
    
    private final IsinRepository repository;

    @Autowired
    public IsinValidator(IsinRepository repository) {
        this.repository = repository;
    }

    public void validateIsinFormat(String isin) {
        if (isin == null) {
            throw new IllegalArgumentException("ISIN cannot be null.");
        }
        
        // Sanitize and normalize
        String sanitized = InputSanitizer.sanitizeIsin(isin);
        
        if (sanitized == null || !ISIN_PATTERN.matcher(sanitized).matches()) {
            throw new IllegalArgumentException("ISIN must be exactly 12 alphanumeric characters.");
        }
    }

    public void validateIsinUniqueness(String isin) {
        if (isin == null) {
            throw new IllegalArgumentException("ISIN cannot be null.");
        }
        
        String normalized = isin.toUpperCase().trim();
        
        if (repository.existsByIsin(normalized)) {
            throw new IllegalArgumentException("ISIN '" + normalized + "' already exists.");
        }
    }
}

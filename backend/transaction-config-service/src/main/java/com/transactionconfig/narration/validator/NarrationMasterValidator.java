package com.transactionconfig.narration.validator;

import com.transactionconfig.narration.enums.FipId;
import com.transactionconfig.narration.enums.TransactionType;
import com.transactionconfig.narration.repository.NarrationMasterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class NarrationMasterValidator {

    private final NarrationMasterRepository repository;

    @Autowired
    public NarrationMasterValidator(NarrationMasterRepository repository) {
        this.repository = repository;
    }

    /**
     * Validates that the provided narrationRegex string is not blank.
     * Note: The field is called narrationRegex for backward compatibility,
     * but it now accepts free text including placeholders like {SettlementId} and {AccountNumber}.
     * 
     * Validation Rules:
     * - Can contain exactly ONE {SettlementId} placeholder (exact spelling only)
     * - Can contain exactly ONE {AccountNumber} placeholder (exact spelling only)
     * - Cannot contain both {SettlementId} and {AccountNumber} together
     * - Cannot contain multiple instances of the same placeholder
     * - Can contain neither (plain text)
     * - Cannot contain any other curly brace placeholders or misspellings
     *
     * @param narrationRegex the narration text to validate
     * @throws IllegalArgumentException if the text is null, blank, contains both placeholders, multiple placeholders, or contains invalid placeholders
     */
    public void validateRegexSyntax(String narrationRegex) {
        if (narrationRegex == null || narrationRegex.trim().isEmpty()) {
            throw new IllegalArgumentException("Narration text must not be blank.");
        }
        
        // Count occurrences of valid placeholders
        int settlementIdCount = countOccurrences(narrationRegex, "{SettlementId}");
        int accountNumberCount = countOccurrences(narrationRegex, "{AccountNumber}");
        
        // Check if both types of placeholders are present
        if (settlementIdCount > 0 && accountNumberCount > 0) {
            throw new IllegalArgumentException(
                "Narration cannot contain both {SettlementId} and {AccountNumber}. " +
                "Please use only one placeholder type."
            );
        }
        
        // Check if multiple instances of the same placeholder
        if (settlementIdCount > 1) {
            throw new IllegalArgumentException(
                "Narration cannot contain multiple {SettlementId} placeholders. " +
                "Only one placeholder is allowed."
            );
        }
        
        if (accountNumberCount > 1) {
            throw new IllegalArgumentException(
                "Narration cannot contain multiple {AccountNumber} placeholders. " +
                "Only one placeholder is allowed."
            );
        }
        
        // Check for any other curly brace patterns that are not the valid placeholders
        // Remove valid placeholders first, then check if any curly braces remain
        String withoutValidPlaceholders = narrationRegex
            .replace("{SettlementId}", "")
            .replace("{AccountNumber}", "");
        
        if (withoutValidPlaceholders.contains("{") || withoutValidPlaceholders.contains("}")) {
            throw new IllegalArgumentException(
                "Narration contains invalid placeholder. " +
                "Only {SettlementId} and {AccountNumber} are allowed (exact spelling required)."
            );
        }
    }
    
    /**
     * Helper method to count occurrences of a substring in a string.
     *
     * @param text the text to search in
     * @param substring the substring to count
     * @return the number of occurrences
     */
    private int countOccurrences(String text, String substring) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(substring, index)) != -1) {
            count++;
            index += substring.length();
        }
        return count;
    }

    /**
     * Ensures no duplicate rule exists for the same (fipId, transactionType, narrationRegex) combination.
     *
     * @param fipId           the FIP ID
     * @param transactionType the transaction type
     * @param narrationRegex  the narration regex
     * @throws IllegalArgumentException if a duplicate is found
     */
    public void validateUniqueness(FipId fipId, TransactionType transactionType, String narrationRegex) {
        if (repository.existsByFipIdAndTransactionTypeAndNarrationRegex(
                fipId, transactionType, narrationRegex.trim())) {
            throw new IllegalArgumentException(
                    "A narration rule for FIP '" + fipId + "', type '" + transactionType +
                    "' with the given regex already exists.");
        }
    }

    /**
     * Validates uniqueness for update operations, allowing the record being updated to keep
     * the same combination (identified by excludeId).
     *
     * @param fipId           the FIP ID
     * @param transactionType the transaction type
     * @param narrationRegex  the narration regex
     * @param excludeId       the ID of the record being updated (excluded from uniqueness check)
     * @throws IllegalArgumentException if a conflicting duplicate is found
     */
    public void validateUniquenessForUpdate(
            FipId fipId, TransactionType transactionType, String narrationRegex, String excludeId) {

        repository.findByFipIdAndTransactionTypeAndNarrationRegex(
                        fipId, transactionType, narrationRegex.trim())
                .ifPresent(existing -> {
                    if (!existing.getId().equals(excludeId)) {
                        throw new IllegalArgumentException(
                                "A narration rule for FIP '" + fipId + "', type '" + transactionType +
                                "' with the given regex already exists.");
                    }
                });
    }
}

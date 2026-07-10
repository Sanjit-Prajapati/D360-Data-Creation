package com.transactionconfig.narration.dto.request;

import com.transactionconfig.narration.enums.Direction;
import com.transactionconfig.narration.enums.FipId;
import com.transactionconfig.narration.enums.TransactionCategory;
import com.transactionconfig.narration.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NarrationSearchRequest {

    /**
     * Multiple FIP IDs for searching across multiple FIPs at once.
     * If empty or null, searches across all FIPs.
     */
    private List<FipId> fipIds;

    private TransactionType transactionType;
    private TransactionCategory transactionCategory;
    
    /**
     * Free-text search on narrationRegex field.
     * Matches if the regex contains this search term (case-insensitive).
     */
    private String narrationRegex;
    
    private Direction direction;
}

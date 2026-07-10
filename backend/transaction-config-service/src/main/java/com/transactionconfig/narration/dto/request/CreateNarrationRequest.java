package com.transactionconfig.narration.dto.request;

import com.transactionconfig.narration.enums.Direction;
import com.transactionconfig.narration.enums.FipId;
import com.transactionconfig.narration.enums.TransactionCategory;
import com.transactionconfig.narration.enums.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateNarrationRequest {

    /**
     * One or more FIP IDs. A separate narration rule record will be created for each entry.
     */
    @NotEmpty(message = "At least one FIP ID must be selected")
    private List<FipId> fipIds;

    @NotNull(message = "Transaction type is required")
    private TransactionType transactionType;

    @NotNull(message = "Transaction category is required")
    private TransactionCategory transactionCategory;

    @NotBlank(message = "Narration regex is required")
    private String narrationRegex;

    @NotNull(message = "Direction is required")
    private Direction direction;
}

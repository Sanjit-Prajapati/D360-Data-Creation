package com.transactionconfig.narration.dto.request;

import com.transactionconfig.narration.enums.Direction;
import com.transactionconfig.narration.enums.FipId;
import com.transactionconfig.narration.enums.TransactionCategory;
import com.transactionconfig.narration.enums.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateNarrationRequest {

    @NotNull(message = "FIP ID is required")
    private FipId fipId;

    @NotNull(message = "Transaction type is required")
    private TransactionType transactionType;

    @NotNull(message = "Transaction category is required")
    private TransactionCategory transactionCategory;

    @NotBlank(message = "Narration regex is required")
    private String narrationRegex;

    @NotNull(message = "Direction is required")
    private Direction direction;
}

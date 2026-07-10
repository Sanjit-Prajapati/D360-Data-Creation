package com.transactionconfig.narration.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.transactionconfig.narration.enums.Direction;
import com.transactionconfig.narration.enums.FipId;
import com.transactionconfig.narration.enums.TransactionCategory;
import com.transactionconfig.narration.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NarrationResponse {

    private String id;
    private FipId fipId;
    private TransactionType transactionType;
    private TransactionCategory transactionCategory;
    private String narrationRegex;
    private Direction direction;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}

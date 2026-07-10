package com.transactionconfig.narration.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.transactionconfig.narration.enums.Direction;
import com.transactionconfig.narration.enums.FipId;
import com.transactionconfig.narration.enums.TransactionCategory;
import com.transactionconfig.narration.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "narration_masters")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class NarrationMaster {

    @Id
    private String id;

    @Indexed
    private FipId fipId;

    @Indexed
    private TransactionType transactionType;

    @Indexed
    private TransactionCategory transactionCategory;

    private String narrationRegex;

    private Direction direction;

    @CreatedDate
    @Indexed
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}

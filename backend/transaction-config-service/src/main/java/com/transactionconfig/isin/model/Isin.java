package com.transactionconfig.isin.model;

import com.transactionconfig.isin.enums.SecurityType;
import com.transactionconfig.isin.enums.Status;
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

@Document(collection = "isins")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Isin {

    @Id
    private String id;

    @Indexed(unique = true)
    private String isin;

    @Indexed
    private String securityName;
    private String symbol;

    @Indexed
    private SecurityType securityType;
    private Status status;

    @CreatedDate
    @Indexed
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}

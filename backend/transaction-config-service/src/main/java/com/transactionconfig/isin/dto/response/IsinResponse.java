package com.transactionconfig.isin.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.transactionconfig.isin.enums.SecurityType;
import com.transactionconfig.isin.enums.Status;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IsinResponse {

    private String id;
    private String isin;
    private String securityName;
    private String symbol;
    private SecurityType securityType;
    private Status status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}

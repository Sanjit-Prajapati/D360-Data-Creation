package com.transactionconfig.isin.dto.request;

import com.transactionconfig.isin.enums.SecurityType;
import com.transactionconfig.isin.enums.Status;
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
public class CreateIsinRequest {

    @NotBlank(message = "ISIN is required")
    private String isin;

    @NotBlank(message = "Security name is required")
    private String securityName;

    @NotBlank(message = "Symbol is required")
    private String symbol;

    @NotNull(message = "Security type is required")
    private SecurityType securityType;

    @NotNull(message = "Status is required")
    private Status status;
}

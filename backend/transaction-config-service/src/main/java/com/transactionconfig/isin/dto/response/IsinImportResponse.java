package com.transactionconfig.isin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IsinImportResponse {
    private int totalRecords;
    private int recordsCreated;
    private int duplicateRecords;
    private List<IsinResponse> records;
}

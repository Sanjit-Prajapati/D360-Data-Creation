package com.transactionconfig.isin.service;

import com.transactionconfig.isin.dto.request.CreateIsinRequest;
import com.transactionconfig.isin.dto.request.UpdateIsinRequest;
import com.transactionconfig.isin.dto.response.IsinResponse;
import com.transactionconfig.isin.enums.SecurityType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.io.Writer;
import java.io.IOException;
import java.util.List;

import com.transactionconfig.isin.dto.response.IsinImportResponse;

public interface IsinService {
    Page<IsinResponse> getAll(String search, SecurityType securityType, Pageable pageable);
    IsinResponse getById(String id);
    IsinResponse create(CreateIsinRequest request);
    IsinResponse update(String id, UpdateIsinRequest request);
    void delete(String id);
    void exportToCsv(Writer writer, String search, SecurityType securityType) throws IOException;
    IsinImportResponse importFromCsv(org.springframework.web.multipart.MultipartFile file) throws IOException;
}

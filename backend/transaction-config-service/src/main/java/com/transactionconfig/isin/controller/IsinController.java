package com.transactionconfig.isin.controller;

import com.transactionconfig.common.response.ApiResponse;
import com.transactionconfig.isin.dto.request.CreateIsinRequest;
import com.transactionconfig.isin.dto.request.UpdateIsinRequest;
import com.transactionconfig.isin.dto.response.IsinResponse;
import com.transactionconfig.isin.dto.response.IsinImportResponse;
import com.transactionconfig.isin.enums.SecurityType;
import com.transactionconfig.isin.service.IsinService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/config/isins")
public class IsinController {

    private final IsinService service;

    @Autowired
    public IsinController(IsinService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<IsinResponse>>> getAllIsins(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "securityType", required = false) SecurityType securityType,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        Page<IsinResponse> page = service.getAll(search, securityType, pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(), "Fetched all ISIN records successfully"));
    }

    @GetMapping("/export")
    public void exportIsins(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "securityType", required = false) SecurityType securityType,
            HttpServletResponse response) throws IOException {
        response.setContentType("text/csv");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"isins_export.csv\"");
        service.exportToCsv(response.getWriter(), search, securityType);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IsinResponse>> getIsinById(@PathVariable("id") String id) {
        IsinResponse isin = service.getById(id);
        return ResponseEntity.ok(ApiResponse.success(isin, "Fetched ISIN record successfully"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<IsinResponse>> createIsin(@Valid @RequestBody CreateIsinRequest request) {
        IsinResponse isin = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(isin, "Created ISIN record successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<IsinResponse>> updateIsin(
            @PathVariable("id") String id,
            @Valid @RequestBody UpdateIsinRequest request) {
        IsinResponse isin = service.update(id, request);
        return ResponseEntity.ok(ApiResponse.success(isin, "Updated ISIN record successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteIsin(@PathVariable("id") String id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Deleted ISIN record successfully"));
    }

    @PostMapping("/import")
    public ResponseEntity<ApiResponse<IsinImportResponse>> importIsins(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws IOException {
        IsinImportResponse response = service.importFromCsv(file);
        return ResponseEntity.ok(ApiResponse.success(response, "Imported ISIN records successfully"));
    }
}

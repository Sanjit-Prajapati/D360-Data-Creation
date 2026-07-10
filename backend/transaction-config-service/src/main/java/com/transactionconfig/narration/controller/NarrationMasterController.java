package com.transactionconfig.narration.controller;

import com.transactionconfig.common.response.ApiResponse;
import com.transactionconfig.narration.dto.request.CreateNarrationRequest;
import com.transactionconfig.narration.dto.request.NarrationSearchRequest;
import com.transactionconfig.narration.dto.request.UpdateNarrationRequest;
import com.transactionconfig.narration.dto.response.NarrationResponse;
import com.transactionconfig.narration.enums.FipId;
import com.transactionconfig.narration.enums.TransactionCategory;
import com.transactionconfig.narration.enums.TransactionType;
import com.transactionconfig.narration.service.NarrationMasterService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/v1/config/narrations")
public class NarrationMasterController {

    private final NarrationMasterService service;

    @Autowired
    public NarrationMasterController(NarrationMasterService service) {
        this.service = service;
    }

    /**
     * GET /api/v1/config/narrations
     * Lists narration rules with optional full-text search and dropdown filters.
     * Returns full Page metadata (totalElements, totalPages, etc.) so the UI
     * can render accurate pagination controls.
     *
     * @param search              free-text search on narrationRegex
     * @param fipId               filter by FIP ID
     * @param transactionType     filter by transaction type
     * @param transactionCategory filter by transaction category
     * @param pageable            pagination + sorting (default: createdAt DESC, size 10)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NarrationResponse>>> getAll(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "fipId", required = false) FipId fipId,
            @RequestParam(value = "transactionType", required = false) TransactionType transactionType,
            @RequestParam(value = "transactionCategory", required = false) TransactionCategory transactionCategory,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<NarrationResponse> page = service.getAll(search, fipId, transactionType, transactionCategory, pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(), "Fetched narrations successfully"));
    }

    /**
     * POST /api/v1/config/narrations/search
     * Alternative search endpoint that accepts filters via JSON body instead of query params.
     * Useful for complex filter combinations or when the client prefers POST over GET for searches.
     *
     * @param searchRequest JSON body containing search filters
     * @param pageable      pagination + sorting (default: createdAt DESC, size 10)
     */
    @PostMapping("/search")
    public ResponseEntity<ApiResponse<List<NarrationResponse>>> searchNarrations(
            @Valid @RequestBody NarrationSearchRequest searchRequest,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        // Handle multiple FIP IDs - search across all provided FIPs
        Page<NarrationResponse> page = service.searchWithMultipleFips(searchRequest, pageable);
        return ResponseEntity.ok(ApiResponse.success(page.getContent(), "Searched narrations successfully"));
    }

    /**
     * GET /api/v1/config/narrations/options
     * Lightweight endpoint used by the Transaction Creation screen.
     * Returns only the narration ID and regex string for the given
     * (fipId, transactionType) combination — no pagination needed here.
     *
     * Example:
     *   GET /api/v1/config/narrations/options?fipId=fip@finrepo&transactionType=BUY
     *
     * @param fipIdValue      required — the FIP context for the transaction (as string value)
     * @param transactionTypeValue required — the type of transaction being created (as string)
     */
    @GetMapping("/options")
    public ResponseEntity<ApiResponse<List<NarrationResponse>>> getNarrationOptions(
            @RequestParam("fipId") String fipIdValue,
            @RequestParam("transactionType") String transactionTypeValue) {

        // Convert string values to enums
        FipId fipId = FipId.fromValue(fipIdValue);
        TransactionType transactionType = TransactionType.valueOf(transactionTypeValue);

        List<NarrationResponse> narrations = service.getNarrationOptions(fipId, transactionType);
        return ResponseEntity.ok(ApiResponse.success(narrations, "Fetched narration options successfully"));
    }

    /**
     * GET /api/v1/config/narrations/{id}
     * Retrieves a single narration rule by its ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NarrationResponse>> getById(@PathVariable("id") String id) {
        NarrationResponse narration = service.getById(id);
        return ResponseEntity.ok(ApiResponse.success(narration, "Fetched narration rule successfully"));
    }

    /**
     * POST /api/v1/config/narrations
     * Creates narration rules — one per FIP ID in the request.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<List<NarrationResponse>>> create(
            @Valid @RequestBody CreateNarrationRequest request) {
        List<NarrationResponse> created = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Created " + created.size() + " narration rule(s) successfully"));
    }

    /**
     * PUT /api/v1/config/narrations/{id}
     * Replaces an existing narration rule entirely.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<NarrationResponse>> update(
            @PathVariable("id") String id,
            @Valid @RequestBody UpdateNarrationRequest request) {
        NarrationResponse narration = service.update(id, request);
        return ResponseEntity.ok(ApiResponse.success(narration, "Updated narration rule successfully"));
    }

    /**
     * DELETE /api/v1/config/narrations/{id}
     * Permanently removes a narration rule.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable("id") String id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Deleted narration rule successfully"));
    }

    /**
     * GET /api/v1/config/narrations/transaction-types
     * Exposes all backend TransactionType enum constants with their custom labels.
     */
    @GetMapping("/transaction-types")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getTransactionTypes() {
        List<Map<String, String>> list = Stream.of(TransactionType.values())
                .map(t -> Map.of("value", t.name(), "label", t.getLabel()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(list, "Fetched transaction types successfully"));
    }

    /**
     * GET /api/v1/config/narrations/transaction-categories
     * Exposes all backend TransactionCategory enum constants with their custom labels.
     */
    @GetMapping("/transaction-categories")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getTransactionCategories() {
        List<Map<String, String>> list = Stream.of(TransactionCategory.values())
                .map(t -> Map.of("value", t.name(), "label", t.getLabel()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(list, "Fetched transaction categories successfully"));
    }

    /**
     * GET /api/v1/config/narrations/fip-ids
     * Exposes all backend FipId enum constants with their values as labels.
     */
    @GetMapping("/fip-ids")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getFipIds() {
        List<Map<String, String>> list = Stream.of(FipId.values())
                .map(f -> Map.of("value", f.getValue(), "label", f.getValue()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(list, "Fetched FIP IDs successfully"));
    }

    /**
     * POST /api/v1/config/narrations/export
     * Exports narration records as CSV with optional filtering.
     * Uses POST to support complex filter criteria in request body.
     */
    @PostMapping("/export")
    public ResponseEntity<byte[]> exportNarrations(
            @RequestBody(required = false) NarrationSearchRequest searchRequest) {
        
        byte[] csvData = service.exportToCsv(searchRequest);
        
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv; charset=UTF-8")
                .header("Content-Disposition", "attachment; filename=\"narration_master_export.csv\"")
                .body(csvData);
    }
}

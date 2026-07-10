package com.transactionconfig.narration.service;

import com.transactionconfig.narration.dto.request.CreateNarrationRequest;
import com.transactionconfig.narration.dto.request.NarrationSearchRequest;
import com.transactionconfig.narration.dto.request.UpdateNarrationRequest;
import com.transactionconfig.narration.dto.response.NarrationResponse;
import com.transactionconfig.narration.enums.FipId;
import com.transactionconfig.narration.enums.TransactionCategory;
import com.transactionconfig.narration.enums.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NarrationMasterService {

    /** Paginated list with optional search + filter — used by the Narration Master UI. */
    Page<NarrationResponse> getAll(
            String search,
            FipId fipId,
            TransactionType transactionType,
            TransactionCategory transactionCategory,
            Pageable pageable);

    /** Search with multiple FIP IDs via request body */
    Page<NarrationResponse> searchWithMultipleFips(
            NarrationSearchRequest searchRequest,
            Pageable pageable);

    /** Export narrations to CSV with optional filtering */
    byte[] exportToCsv(NarrationSearchRequest searchRequest);

    /** Flat list of active narration options for a given (fipId, transactionType) — used by Transaction Creation. */
    List<NarrationResponse> getNarrationOptions(FipId fipId, TransactionType transactionType);

    NarrationResponse getById(String id);

    List<NarrationResponse> create(CreateNarrationRequest request);

    NarrationResponse update(String id, UpdateNarrationRequest request);

    void delete(String id);
}

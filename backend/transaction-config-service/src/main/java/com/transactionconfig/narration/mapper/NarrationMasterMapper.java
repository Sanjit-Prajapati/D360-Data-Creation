package com.transactionconfig.narration.mapper;

import com.transactionconfig.narration.dto.request.CreateNarrationRequest;
import com.transactionconfig.narration.dto.request.UpdateNarrationRequest;
import com.transactionconfig.narration.dto.response.NarrationResponse;
import com.transactionconfig.narration.entity.NarrationMaster;
import com.transactionconfig.narration.enums.FipId;

public class NarrationMasterMapper {

    private NarrationMasterMapper() {
        // Utility class — do not instantiate
    }

    public static NarrationMaster toEntity(CreateNarrationRequest request, FipId fipId) {
        if (request == null) {
            return null;
        }
        return NarrationMaster.builder()
                .fipId(fipId)
                .transactionType(request.getTransactionType())
                .transactionCategory(request.getTransactionCategory())
                .narrationRegex(request.getNarrationRegex().trim())
                .direction(request.getDirection())
                .build();
    }

    public static NarrationResponse toResponse(NarrationMaster entity) {
        if (entity == null) {
            return null;
        }
        return NarrationResponse.builder()
                .id(entity.getId())
                .fipId(entity.getFipId())
                .transactionType(entity.getTransactionType())
                .transactionCategory(entity.getTransactionCategory())
                .narrationRegex(entity.getNarrationRegex())
                .direction(entity.getDirection())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public static void updateEntity(UpdateNarrationRequest request, NarrationMaster entity) {
        if (request == null || entity == null) {
            return;
        }
        entity.setFipId(request.getFipId());
        entity.setTransactionType(request.getTransactionType());
        entity.setTransactionCategory(request.getTransactionCategory());
        entity.setNarrationRegex(request.getNarrationRegex().trim());
        entity.setDirection(request.getDirection());
    }
}

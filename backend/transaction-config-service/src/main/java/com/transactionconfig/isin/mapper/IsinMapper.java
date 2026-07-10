package com.transactionconfig.isin.mapper;

import com.transactionconfig.isin.dto.request.CreateIsinRequest;
import com.transactionconfig.isin.dto.request.UpdateIsinRequest;
import com.transactionconfig.isin.dto.response.IsinResponse;
import com.transactionconfig.isin.model.Isin;

public class IsinMapper {

    public static Isin toEntity(CreateIsinRequest request) {
        if (request == null) {
            return null;
        }
        return Isin.builder()
                .isin(request.getIsin().toUpperCase().trim())
                .securityName(request.getSecurityName().trim())
                .symbol(request.getSymbol().trim())
                .securityType(request.getSecurityType())
                .status(request.getStatus())
                .build();
    }

    public static IsinResponse toResponse(Isin entity) {
        if (entity == null) {
            return null;
        }
        return IsinResponse.builder()
                .id(entity.getId())
                .isin(entity.getIsin())
                .securityName(entity.getSecurityName())
                .symbol(entity.getSymbol())
                .securityType(entity.getSecurityType())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public static void updateEntity(UpdateIsinRequest request, Isin entity) {
        if (request == null || entity == null) {
            return;
        }
        entity.setSecurityName(request.getSecurityName().trim());
        entity.setSymbol(request.getSymbol().trim());
        entity.setSecurityType(request.getSecurityType());
        entity.setStatus(request.getStatus());
    }
}

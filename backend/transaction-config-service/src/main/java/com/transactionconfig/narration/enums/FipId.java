package com.transactionconfig.narration.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum FipId {

    FIP_AT_FINREPO("fip@finrepo"),
    FIP_AT_NSDL("fip@nsdl"),
    CDSLFIP("CDSLFIP");

    private final String value;

    FipId(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static FipId fromValue(String value) {
        for (FipId fipId : FipId.values()) {
            if (fipId.value.equalsIgnoreCase(value) || fipId.name().equalsIgnoreCase(value)) {
                return fipId;
            }
        }
        throw new IllegalArgumentException("Invalid FipId value: " + value + 
            ". Valid values are: FIP_AT_FINREPO, FIP_AT_NSDL, CDSLFIP");
    }

    @Override
    public String toString() {
        return value;
    }
}

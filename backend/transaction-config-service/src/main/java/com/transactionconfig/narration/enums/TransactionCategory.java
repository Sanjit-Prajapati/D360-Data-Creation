package com.transactionconfig.narration.enums;

public enum TransactionCategory {

    MARKET("Market"),
    VOLUNTARY_CA("Voluntary CA"),
    MANDATORY_CA("Mandatory CA"),
    PRIMARY("Primary"),
    NOT_A_TRANSACTION("Not a Transaction"),
    ESOP("ESOP");

    private final String label;

    TransactionCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return this.label;
    }
}

package com.transactionconfig.narration.enums;

public enum TransactionType {

    BUY("Buy"),
    SELL("Sell"),
    IPO_FPO("IPO/FPO"),
    BONUS("Bonus"),
    STOCK_SPLIT("Stock Split"),
    SPIN_OFF("Spin Off"),
    RIGHTS("Rights"),
    ESOP("ESOP"),
    OFF_MARKET("Off Market"),
    MERGER("Merger"),
    SCHEME_OF_ARRANGEMENT("Scheme Of Arrangement"),
    BUY_BACK("Buy Back"),
    OFFER_FOR_SALE("Offer For Sale"),
    CONVERSION("Conversion"),
    CONFISCATE("Confiscate"),
    FORFEIT("Forfeit"),
    PLEDGE("Pledge"),
    UNPLEDGE("Unpledge"),
    INVOCATION("Invocation"),
    MARGIN_PLEDGE("Margin Pledge"),
    MARGIN_UNPLEDGE("Margin Unpledge"),
    MARGIN_INVOCATION("Margin Invocation"),
    MTF_PLEDGE("MTF Pledge"),
    MTF_UNPLEDGE("MTF Unpledge"),
    MTF_INVOCATION("MTF Invocation"),
    CUSPA_PLEDGE("CUSPA Pledge"),
    CUSPA_UNPLEDGE("CUSPA Unpledge"),
    CUSPA_INVOCATION("CUSPA Invocation"),
    LENDING_PLEDGE("Lending Pledge"),
    LENDING_UNPLEDGE("Lending Unpledge"),
    LENDING_INVOCATION("Lending Invocation"),
    OFF_MARKET_ACCOUNT_TRANSFER("Off Market Account Transfer"),
    UNCLAIMED_ALLOTMENT("Unclaimed Allotment"),
    BORROWED_SLB("Borrowed SLB"),
    RETURNED_SLB("Returned SLB"),
    RECEIVED_BACK_SLB("Received Back SLB"),
    LOCK_IN("Lock In"),
    LOCK_IN_RELEASE("Lock In Release"),
    CAPITAL_REDUCTION("Capital Reduction"),
    TRADE_CANCELLATION("Trade Cancellation"),
    DEMATERIALISED("Dematerialised"),
    REMATERIALISED("Rematerialised"),
    PREFERENTIAL_ALLOTMENT("Preferential Allotment"),
    IEPF_TRANSFER("IEPF Transfer");

    private final String label;

    TransactionType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return this.label;
    }
}

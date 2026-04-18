package com.hometech.hometech.dto;

import com.hometech.hometech.enums.RepairBookingStatus;

public class RepairBookingProgressRequest {
    private RepairBookingStatus status;
    private String progressNote;
    private Double estimatedTradeInAmount;
    private Double finalTradeInAmount;
    private Double tradeInHealthScore;
    private String tradeInConditionName;
    private String tradeInConditionDescription;
    private Integer tradeInBatteryHealth;
    private String tradeInFunctionalStatus;
    private String tradeInVisualStatus;
    private java.util.List<String> tradeInInspectionImages;

    public RepairBookingStatus getStatus() {
        return status;
    }

    public void setStatus(RepairBookingStatus status) {
        this.status = status;
    }

    public String getProgressNote() {
        return progressNote;
    }

    public void setProgressNote(String progressNote) {
        this.progressNote = progressNote;
    }

    public Double getEstimatedTradeInAmount() {
        return estimatedTradeInAmount;
    }

    public void setEstimatedTradeInAmount(Double estimatedTradeInAmount) {
        this.estimatedTradeInAmount = estimatedTradeInAmount;
    }

    public Double getFinalTradeInAmount() {
        return finalTradeInAmount;
    }

    public void setFinalTradeInAmount(Double finalTradeInAmount) {
        this.finalTradeInAmount = finalTradeInAmount;
    }

    public Double getTradeInHealthScore() {
        return tradeInHealthScore;
    }

    public void setTradeInHealthScore(Double tradeInHealthScore) {
        this.tradeInHealthScore = tradeInHealthScore;
    }

    public String getTradeInConditionName() {
        return tradeInConditionName;
    }

    public void setTradeInConditionName(String tradeInConditionName) {
        this.tradeInConditionName = tradeInConditionName;
    }

    public String getTradeInConditionDescription() {
        return tradeInConditionDescription;
    }

    public void setTradeInConditionDescription(String tradeInConditionDescription) {
        this.tradeInConditionDescription = tradeInConditionDescription;
    }

    public Integer getTradeInBatteryHealth() {
        return tradeInBatteryHealth;
    }

    public void setTradeInBatteryHealth(Integer tradeInBatteryHealth) {
        this.tradeInBatteryHealth = tradeInBatteryHealth;
    }

    public String getTradeInFunctionalStatus() {
        return tradeInFunctionalStatus;
    }

    public void setTradeInFunctionalStatus(String tradeInFunctionalStatus) {
        this.tradeInFunctionalStatus = tradeInFunctionalStatus;
    }

    public String getTradeInVisualStatus() {
        return tradeInVisualStatus;
    }

    public void setTradeInVisualStatus(String tradeInVisualStatus) {
        this.tradeInVisualStatus = tradeInVisualStatus;
    }

    public java.util.List<String> getTradeInInspectionImages() {
        return tradeInInspectionImages;
    }

    public void setTradeInInspectionImages(java.util.List<String> tradeInInspectionImages) {
        this.tradeInInspectionImages = tradeInInspectionImages;
    }
}

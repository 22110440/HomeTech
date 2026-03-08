package com.hometech.hometech.dto;

import com.hometech.hometech.enums.RepairBookingStatus;

public class RepairBookingProgressRequest {
    private RepairBookingStatus status;
    private String progressNote;

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
}

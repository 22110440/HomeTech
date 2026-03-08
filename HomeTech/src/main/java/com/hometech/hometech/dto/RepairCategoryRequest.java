package com.hometech.hometech.dto;

public class RepairCategoryRequest {
    private String phoneType;
    private String serviceCategory;
    private Boolean active;

    public String getPhoneType() { return phoneType; }
    public void setPhoneType(String phoneType) { this.phoneType = phoneType; }
    public String getServiceCategory() { return serviceCategory; }
    public void setServiceCategory(String serviceCategory) { this.serviceCategory = serviceCategory; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}

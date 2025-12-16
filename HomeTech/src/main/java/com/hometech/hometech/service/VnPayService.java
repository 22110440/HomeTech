package com.hometech.hometech.service;

import com.hometech.hometech.config.HmacUtil;
import com.hometech.hometech.config.VnPayConfig;
import com.hometech.hometech.dto.VnPayCreateResponse;
import com.hometech.hometech.dto.VnPayReturnResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;


@Service
public class VnPayService {

    @Autowired
    private VnPayConfig config;

    public VnPayCreateResponse createPaymentUrl(HttpServletRequest request, long amount, String orderInfo) {
        String vnp_Version     = "2.1.0";
        String vnp_Command     = "pay";
        String vnp_TxnRef      = Long.toString(System.currentTimeMillis());  // hoặc mã đơn hàng
        String vnp_IpAddr      = request.getRemoteAddr();
        String vnp_TmnCode     = config.getTmnCode();
        String orderType       = "other";
        String vnp_Locale      = "vn";
        String vnp_CurrCode    = "VND";

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnp_TmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(amount * 100)); // nhân 100 => VNPAY yêu cầu. :contentReference[oaicite:8]{index=8}
        vnp_Params.put("vnp_CurrCode", vnp_CurrCode);
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", orderInfo);
        vnp_Params.put("vnp_OrderType", orderType);
        vnp_Params.put("vnp_Locale", vnp_Locale);
        vnp_Params.put("vnp_ReturnUrl", config.getReturnUrl());
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);
        vnp_Params.put("vnp_CreateDate", new SimpleDateFormat("yyyyMMddHHmmss").format(new Date()));

        // sắp xếp tham số tăng dần tên:
        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        for (String fieldName : fieldNames) {
            String value = vnp_Params.get(fieldName);
            if ((value != null) && (value.length() > 0)) {
                // build hashData and query string
                hashData.append(fieldName).append('=').append(URLEncoder.encode(value, StandardCharsets.UTF_8)).append('&');
                query.append(fieldName).append('=').append(URLEncoder.encode(value, StandardCharsets.UTF_8)).append('&');
            }
        }
        // remove last "&"
        if (hashData.length() > 0) {
            hashData.deleteCharAt(hashData.length() - 1);
        }
        if (query.length() > 0) {
            query.deleteCharAt(query.length() - 1);
        }

        String secureHash = HmacUtil.hmacSHA512(config.getHashSecret(), hashData.toString());
        String paymentUrl = config.getPaymentUrl() + "?" + query.toString() + "&vnp_SecureHash=" + secureHash;
        return new VnPayCreateResponse(paymentUrl, vnp_TxnRef, Collections.unmodifiableMap(vnp_Params));
    }

    public VnPayReturnResponse processReturn(HttpServletRequest request) {
        Map<String, String> vnp_Params = new HashMap<>();
        for (Enumeration<String> e = request.getParameterNames(); e.hasMoreElements();) {
            String paramName = e.nextElement();
            if (paramName.startsWith("vnp_")) {
                vnp_Params.put(paramName, request.getParameter(paramName));
            }
        }
        String vnp_SecureHash = vnp_Params.remove("vnp_SecureHash");
        String secureHashValue = vnp_SecureHash;
        // sắp xếp và hash lại như lúc gửi
        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        for (String fieldName : fieldNames) {
            hashData.append(fieldName).append('=').append(URLEncoder.encode(vnp_Params.get(fieldName), StandardCharsets.UTF_8)).append('&');
        }
        if (hashData.length() > 0) hashData.deleteCharAt(hashData.length() - 1);
        String calculatedHash = HmacUtil.hmacSHA512(config.getHashSecret(), hashData.toString());

        boolean validSignature = calculatedHash.equals(vnp_SecureHash);
        String responseCode = vnp_Params.get("vnp_ResponseCode");
        String txnRef       = vnp_Params.get("vnp_TxnRef");
        String amount       = vnp_Params.get("vnp_Amount");
        long paidAmount = amount != null ? Long.parseLong(amount) / 100 : 0L;

        Map<String, String> rawParams = new HashMap<>(vnp_Params);
        rawParams.put("vnp_SecureHash", secureHashValue);

        return new VnPayReturnResponse(
                validSignature,
                responseCode,
                txnRef,
                paidAmount,
                Collections.unmodifiableMap(rawParams)
        );
    }
}

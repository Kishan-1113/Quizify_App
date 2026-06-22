package com.example.quizify.Controllers;

import org.springframework.web.bind.annotation.RestController;

import com.example.quizify.Models.PremiumPlans;
import com.example.quizify.Services.PaymentService;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.graphql.GraphQlProperties.Http;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.security.core.Authentication;

@RestController
@Lazy
@RequestMapping("/premium")
@CrossOrigin
public class PaymentController {

    private PaymentService paymentService;

    PaymentController(PaymentService pService) {
        paymentService = pService;
    }

    @GetMapping("/plans")
    public ResponseEntity<List<PremiumPlans>> getAllPlans() {
        return ResponseEntity.status(HttpStatus.OK).body(paymentService.getAllPlans());
    }

    @PostMapping("/plans")
    public ResponseEntity<?> subscribeToPlan(@RequestBody SubscriptionRequest request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiResponse("error", "Unauthorized"));
        }
        String email = authentication.getName();
        boolean success = paymentService.subscribeUser(email, request.getPlanId());
        if (success) {
            return ResponseEntity.status(HttpStatus.OK).body(new ApiResponse("success", "Successfully upgraded to Premium!"));
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiResponse("error", "Failed to subscribe: plan or user not found"));
        }
    }

    public static class SubscriptionRequest {
        private Long planId;

        public Long getPlanId() {
            return planId;
        }

        public void setPlanId(Long planId) {
            this.planId = planId;
        }
    }

    public static class ApiResponse {
        private String status;
        private String message;

        public ApiResponse(String status, String message) {
            this.status = status;
            this.message = message;
        }

        public String getStatus() {
            return status;
        }

        public String getMessage() {
            return message;
        }
    }

}

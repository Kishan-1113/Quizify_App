package com.example.quizify.Controllers;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.quizify.Models.UserPerformance;
import com.example.quizify.Services.UserPerformanceService;

@RestController
@RequestMapping("/performance")
@CrossOrigin
public class PerformanceController {

    @Autowired
    private UserPerformanceService performanceService;

    // Get current user's performance logs
    @GetMapping("/my")
    public ResponseEntity<List<UserPerformance>> getMyPerformance(Authentication authentication) {
        String email = authentication.getName();
        List<UserPerformance> logs = performanceService.getMyPerformance(email);
        return ResponseEntity.ok(logs);
    }

    // Get all user performance logs (Admins only)
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserPerformance>> getAllPerformance() {
        List<UserPerformance> logs = performanceService.getAllPerformance();
        return ResponseEntity.ok(logs);
    }
}

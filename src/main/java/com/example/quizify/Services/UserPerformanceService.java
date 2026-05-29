package com.example.quizify.Services;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.example.quizify.Models.ModelUser;
import com.example.quizify.Models.UserPerformance;
import com.example.quizify.Repositories.JpaRepo4Users;
import com.example.quizify.Repositories.UserPerformanceRepo;

@Service
public class UserPerformanceService {

    @Autowired
    private UserPerformanceRepo userPerformanceRepo;

    @Autowired
    private JpaRepo4Users userRepo;

    public List<UserPerformance> getMyPerformance(String email) {
        ModelUser user = userRepo.findUserByemail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return userPerformanceRepo.findByUserOrderByTimestampDesc(user);
    }

    public List<UserPerformance> getAllPerformance() {
        return userPerformanceRepo.findAllByOrderByTimestampDesc();
    }
}

package com.example.quizify.Services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.quizify.Exceptions.ResourceNotFoundException;
import com.example.quizify.Models.LoginRequest;
import com.example.quizify.Models.ModelUser;
import com.example.quizify.Repositories.JpaRepo4Users;

@Service
public class UserService {

    @Autowired
    private JpaRepo4Users userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authManager;

    @Autowired
    private JwtService jwtService;

    public List<ModelUser> getAllUsers() {
        return userRepo.findAll();
    }

    public ModelUser getUserByEmail(String email) {
        return userRepo.findUserByemail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }

    public void registerUser(ModelUser user) {
        if (user != null) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
            userRepo.save(user);
        } else
            throw new ResourceNotFoundException("User can't be empty !");
    }

    public String loginUser(LoginRequest entity) {

        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        entity.getEmail(),
                        entity.getPassword()));

        return jwtService.generateToken(entity.getEmail());
    }

}

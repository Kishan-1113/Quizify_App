package com.example.quizify.Controllers;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.quizify.Models.LoginRequest;
import com.example.quizify.Models.ModelUser;
import com.example.quizify.Services.UserService;

import java.util.Map;
import java.util.HashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/users")
public class LoginController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public ResponseEntity<?> registerNewUser(@RequestBody ModelUser newUser) {
        userService.registerUser(newUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest entity) {
        String token = userService.loginUser(entity);
        ModelUser user = userService.getUserByEmail(entity.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("role", user.getRole());

        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

}

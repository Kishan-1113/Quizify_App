package com.example.quizify.Services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.example.quizify.Exceptions.ResourceNotFoundException;
import com.example.quizify.Models.ModelUser;
import com.example.quizify.Models.UserPrinciple;
import com.example.quizify.Repositories.JpaRepo4Users;

@Service
public class MyUserDetailService implements UserDetailsService {

    @Autowired
    private JpaRepo4Users userRepo;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {

        ModelUser user = userRepo.findUserByemail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found !"));

        return new UserPrinciple(user);
    }

}
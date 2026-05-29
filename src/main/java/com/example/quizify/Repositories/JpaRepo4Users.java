package com.example.quizify.Repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.quizify.Models.ModelUser;

@Repository
public interface JpaRepo4Users extends JpaRepository<ModelUser, Long> {
    Optional<ModelUser> findUserByemail(String username);
}

package com.example.quizify.Repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.example.quizify.Models.Quiz;

@Repository
public interface QuizRepo extends JpaRepository<Quiz, Integer> {
}

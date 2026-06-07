package com.example.quizify.Repositories;

import org.springframework.context.annotation.Lazy;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.example.quizify.Models.Quiz;

import java.util.Optional;
import java.util.List;

@Repository
@Lazy
public interface QuizRepo extends JpaRepository<Quiz, Integer> {

    @EntityGraph(attributePaths = {"creator", "questions"})
    Optional<Quiz> findById(Integer id);

    @EntityGraph(attributePaths = {"creator"})
    List<Quiz> findAll();
}

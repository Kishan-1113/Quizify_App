package com.example.quizify.Controllers;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;

import com.example.quizify.Models.QuestionSet;
import com.example.quizify.Services.QuestionService;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/questions")
@CrossOrigin
public class QuestionController {

    @Autowired
    private QuestionService questionService;

    @GetMapping("/allQs")
    public ResponseEntity<List<QuestionSet>> getAllQues() {
        return ResponseEntity.status(HttpStatus.OK).body(questionService.getAllQues());
    }

    @GetMapping("/{category}")
    public ResponseEntity<List<QuestionSet>> getByCategory(@PathVariable String category) {
        return ResponseEntity.status(HttpStatus.OK).body(questionService.getQuesByCategory(category));
    }

    // Get Question by level
    @GetMapping("/level/{level}")
    public ResponseEntity<List<QuestionSet>> getQuesByDifficulty(@PathVariable String level) {
        return ResponseEntity.status(HttpStatus.OK).body(questionService.getQuesByDifficultyLevel(level));
    }

    // Add new questions (Admins only)
    @PostMapping("/add")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> addNewQues(@RequestBody QuestionSet newQues) {
        questionService.saveNewQues(newQues);
        return ResponseEntity.status(HttpStatus.CREATED).body("Question added successfully!");
    }

    // Edit/update a question (Admins only)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<QuestionSet> updateQues(@PathVariable int id, @RequestBody QuestionSet updated) {
        QuestionSet q = questionService.updateQuestion(id, updated);
        return ResponseEntity.ok(q);
    }

    // Delete a question (Admins only)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteQues(@PathVariable int id) {
        questionService.deleteQuestion(id);
        return ResponseEntity.ok("Question deleted successfully!");
    }

}
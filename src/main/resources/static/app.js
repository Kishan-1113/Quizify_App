/**
 * QUIZIFY CLIENT-SIDE APPLICATION
 * SPA Navigation, State Management, API integration, Interactive Quiz Logic, and UI transitions.
 */

// Base API URL (relative to origin since it's served by Spring Boot)
const API_BASE = window.location.origin;

// State Variables
let quizState = {
    quizId: null,
    title: "",
    category: "",
    difficulty: "",
    questions: [],      // Array of QuestionWrapper
    responses: [],      // Array of { id, response }
    currentQuestionIndex: 0,
    timer: null,
    timeLeft: 30,       // 30 seconds per question
    maxTime: 30
};

// Auth State Variables
let authState = {
    token: localStorage.getItem('quizify_token') || null,
    user: JSON.parse(localStorage.getItem('quizify_user')) || null
};

// DOM elements mapping
const screens = {
    home: document.getElementById('home-screen'),
    setup: document.getElementById('setup-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen'),
    admin: document.getElementById('admin-screen'),
    auth: document.getElementById('auth-screen')
};

const navBtns = {
    home: document.getElementById('nav-home-btn'),
    admin: document.getElementById('nav-admin-btn')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSetupForm();
    initQuizPlayEvents();
    initAdminForm();
    initAdminTabs();
    initAdminQuizForm();
    initAuth(); // Initialize auth forms, tabs, and buttons
    initTheme(); // Initialize Dark/Light mode theme toggle
    initSharedQuizEvents();
    
    // Check authentication. If logged in, load app stats & question bank, otherwise checkAuth redirects to auth screen
    if (checkAuth()) {
        loadAppStats();
        loadQuestionBank();
        loadUserRatings();
        showScreen('home');
    }
});

// ==========================================================================
// SPA NAVIGATION & ROUTING
// ==========================================================================

function initNavigation() {
    // Header Logo Click
    document.getElementById('header-logo').addEventListener('click', () => {
        resetQuizState();
        showScreen('home');
    });

    // Navigation links
    navBtns.home.addEventListener('click', () => {
        resetQuizState();
        showScreen('home');
    });
    navBtns.admin.addEventListener('click', () => {
        resetQuizState();
        showScreen('admin');
        loadQuestionBank(); // Refresh bank when opening admin
    });

    // Hero action buttons
    document.getElementById('play-quiz-hero-btn').addEventListener('click', () => {
        showScreen('setup');
    });
    document.getElementById('manage-ques-hero-btn').addEventListener('click', () => {
        showScreen('admin');
    });

    // Back to home buttons
    document.querySelectorAll('.btn-back-home').forEach(btn => {
        btn.addEventListener('click', () => {
            resetQuizState();
            showScreen('home');
        });
    });

    // Popular categories quick play clicks
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const category = card.getAttribute('data-category');
            openSetupWithCategory(category);
        });
    });
}

function showScreen(screenKey) {
    // Stop quiz timer if running and transitioning away from play screen
    if (screenKey !== 'quiz') {
        stopQuizTimer();
    }

    // Redirect to login if user is not authenticated or token is expired
    if (!authState.token || isTokenExpired(authState.token)) {
        checkAuth();
        screenKey = 'auth';
    } else if (screenKey === 'auth') {
        // If already logged in, redirect away from auth page to home
        screenKey = 'home';
    }

    // Role-based path access control
    if (screenKey === 'admin') {
        if (!authState.user || authState.user.role !== 'ADMIN') {
            showToast("Access Denied: Admin privileges required", "error");
            screenKey = 'home';
        }
    }

    // Hide all screens
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });

    // Show selected screen
    if (screens[screenKey]) {
        screens[screenKey].classList.add('active');
    }

    // Update active nav button
    Object.values(navBtns).forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    
    if (screenKey === 'home' || screenKey === 'setup' || screenKey === 'result') {
        if (navBtns.home) navBtns.home.classList.add('active');
    } else if (screenKey === 'admin') {
        if (navBtns.admin) navBtns.admin.classList.add('active');
    }
}

function openSetupWithCategory(category) {
    showScreen('setup');
    
    // Set form category select
    const categorySelect = document.getElementById('quiz-category');
    const customCategoryInput = document.getElementById('quiz-custom-category');
    
    // Reset custom category field
    customCategoryInput.value = "";

    // Find if category is in select options
    let found = false;
    for (let option of categorySelect.options) {
        if (option.value === category) {
            categorySelect.value = category;
            found = true;
            break;
        }
    }

    // If it's a custom category not in select dropdown, write it to custom field
    if (!found) {
        categorySelect.value = "";
        customCategoryInput.value = category;
    }

    // Update title placeholder
    document.getElementById('quiz-title').value = `${category} Master Challenge`;
}

function resetQuizState() {
    stopQuizTimer();
    quizState = {
        quizId: null,
        title: "",
        category: "",
        difficulty: "",
        questions: [],
        responses: [],
        currentQuestionIndex: 0,
        timer: null,
        timeLeft: 30,
        maxTime: 30
    };
}

// ==========================================================================
// QUIZ GENERATION & PLAY LOGIC
// ==========================================================================

function initSetupForm() {
    const rangeInput = document.getElementById('quiz-num-questions');
    const rangeDisplay = document.getElementById('range-val-display');
    
    // Link range input to display text
    rangeInput.addEventListener('input', (e) => {
        rangeDisplay.textContent = e.target.value;
    });

    // Toggle visibility option based on mode selection
    const modeTransient = document.getElementById('mode-transient');
    const modePersistent = document.getElementById('mode-persistent');
    const visibilityGroup = document.getElementById('visibility-group');

    if (modeTransient && modePersistent && visibilityGroup) {
        modeTransient.addEventListener('change', () => {
            visibilityGroup.style.display = 'none';
        });
        modePersistent.addEventListener('change', () => {
            visibilityGroup.style.display = 'block';
        });
    }

    // Quiz form submission
    const form = document.getElementById('quiz-config-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('quiz-title').value || "Quiz Session";
        const categoryVal = document.getElementById('quiz-category').value;
        const customCategoryVal = document.getElementById('quiz-custom-category').value;
        const numQ = rangeInput.value;
        const difficulty = document.getElementById('quiz-difficulty').value;

        // Choose category: custom overrides select if typed
        const category = (customCategoryVal && customCategoryVal.trim() !== "") 
            ? customCategoryVal.trim() 
            : categoryVal;

        if (!category) {
            showToast("Please select or type a category", "error");
            return;
        }

        try {
            // Disable start button to prevent double-clicks
            const startBtn = document.getElementById('start-quiz-btn');
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Loading...';

            const mode = document.querySelector('input[name="quiz-mode"]:checked').value;
            const visibility = document.getElementById('quiz-visibility').value;

            // 1. Create the quiz on the backend (transient or persistent)
            let createUrl;
            if (mode === 'persistent') {
                createUrl = `${API_BASE}/quiz/create-persistent?category=${encodeURIComponent(category)}&numQ=${numQ}&title=${encodeURIComponent(title)}&difficulty=${encodeURIComponent(difficulty)}&visibility=${encodeURIComponent(visibility)}`;
            } else {
                createUrl = `${API_BASE}/quiz/create?category=${encodeURIComponent(category)}&numQ=${numQ}&title=${encodeURIComponent(title)}&difficulty=${encodeURIComponent(difficulty)}`;
            }
            
            const response = await authFetch(createUrl, { method: 'POST' });
            
            if (!response.ok) {
                throw new Error("Failed to generate quiz. Make sure there are enough questions in this category/difficulty!");
            }

            const quizId = await response.json();
            
            // 2. Fetch the masked questions for the quiz
            const getUrl = `${API_BASE}/quiz/get/${quizId}`;
            const questionsResponse = await authFetch(getUrl);
            
            if (!questionsResponse.ok) {
                throw new Error("Failed to load quiz questions.");
            }

            const questions = await questionsResponse.json();

            if (questions.length === 0) {
                const diffText = difficulty === 'Any' ? '' : ` with difficulty '${difficulty}'`;
                throw new Error(`No questions found in category '${category}'${diffText}! Add some in the Admin Panel first.`);
            }

            // Save variables in state
            quizState.quizId = quizId;
            quizState.title = title;
            quizState.category = category;
            quizState.difficulty = difficulty;
            quizState.questions = questions;
            quizState.currentQuestionIndex = 0;
            
            // Pre-populate empty responses
            quizState.responses = questions.map(q => ({ id: q.id, response: "" }));

            // Reset start button
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fa-solid fa-rocket"></i> Launch Quiz';

            // Show active quiz screen and render first question
            showScreen('quiz');
            setupQuizViewHeader();
            renderQuestion(0);

            if (mode === 'persistent') {
                try {
                    await navigator.clipboard.writeText(quizId);
                    showToast(`Quiz Saved to DB! ID: ${quizId} (Copied to Clipboard)`, "success");
                } catch (clipErr) {
                    showToast(`Quiz Saved to DB! ID: ${quizId}`, "success");
                }
            } else {
                showToast("Quiz generated successfully! Good Luck!", "success");
            }

        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
            
            const startBtn = document.getElementById('start-quiz-btn');
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fa-solid fa-rocket"></i> Launch Quiz';
        }
    });
}

function setupQuizViewHeader() {
    document.getElementById('quiz-active-category').textContent = quizState.category;
    document.getElementById('quiz-active-difficulty').textContent = quizState.difficulty === 'Any' ? 'All Levels' : quizState.difficulty;
    document.getElementById('quiz-active-title').textContent = quizState.title;
    document.getElementById('total-questions-num').textContent = quizState.questions.length;
}

function renderQuestion(index) {
    if (index < 0 || index >= quizState.questions.length) return;
    
    quizState.currentQuestionIndex = index;
    const question = quizState.questions[index];

    // Reset UI bindings
    document.getElementById('current-question-num').textContent = index + 1;
    document.getElementById('active-question-text').textContent = question.question;

    // Render option list
    const optionsList = document.getElementById('active-options-list');
    optionsList.innerHTML = "";

    const userSavedAnswer = quizState.responses[index].response;

    const letters = ['A', 'B', 'C', 'D'];
    const optionsArray = [question.option1, question.option2, question.option3, question.option4];

    optionsArray.forEach((optionText, i) => {
        if (!optionText) return; // Skip if null/empty
        
        const optionBtn = document.createElement('button');
        optionBtn.className = 'option-btn';
        if (userSavedAnswer === optionText) {
            optionBtn.classList.add('selected');
        }

        const isChecked = userSavedAnswer === optionText;
        optionBtn.innerHTML = `
            <span class="option-letter">${letters[i]}</span>
            <span class="option-content">${escapeHTML(optionText)}</span>
            <span class="option-check-icon">
                <i class="${isChecked ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}"></i>
            </span>
        `;

        optionBtn.addEventListener('click', () => {
            selectOption(index, optionText);
        });

        optionsList.appendChild(optionBtn);
    });

    // Update question navigation grid
    updateQuestionNavGrid();

    // Configure Prev/Next buttons
    const prevBtn = document.getElementById('quiz-prev-btn');
    const nextBtn = document.getElementById('quiz-next-btn');
    const submitBtn = document.getElementById('quiz-submit-btn');

    // Prev Button state
    prevBtn.disabled = index === 0;

    // Next vs Submit Button state
    if (index === quizState.questions.length - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-flex';
    } else {
        nextBtn.style.display = 'inline-flex';
        submitBtn.style.display = 'none';
    }

    // Reset question timer
    resetQuestionTimer();
}

function selectOption(questionIndex, selectedText) {
    // Save response in state
    quizState.responses[questionIndex].response = selectedText;

    // Update option buttons UI immediately
    const optionBtns = document.querySelectorAll('#active-options-list .option-btn');
    optionBtns.forEach(btn => {
        const text = btn.querySelector('.option-content').textContent;
        const icon = btn.querySelector('.option-check-icon i');
        
        if (text === selectedText) {
            btn.classList.add('selected');
            icon.className = 'fa-solid fa-circle-check';
        } else {
            btn.classList.remove('selected');
            icon.className = 'fa-regular fa-circle';
        }
    });

    // Update question navigation grid
    updateQuestionNavGrid();
}

function updateQuestionNavGrid() {
    const grid = document.getElementById('question-nav-grid');
    grid.innerHTML = "";

    quizState.questions.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.className = 'q-nav-btn';
        
        const isAnswered = quizState.responses[i] && quizState.responses[i].response !== "";
        const isActive = quizState.currentQuestionIndex === i;

        if (isAnswered) btn.classList.add('answered');
        if (isActive) btn.classList.add('active');

        btn.textContent = i + 1;
        btn.addEventListener('click', () => {
            renderQuestion(i);
        });

        grid.appendChild(btn);
    });

    // Update Top Linear Progress Bar
    const progressPercent = ((quizState.responses.filter(r => r.response !== "").length) / quizState.questions.length) * 100;
    document.getElementById('quiz-progress-bar').style.width = `${progressPercent}%`;
}

function initQuizPlayEvents() {
    // Navigation Action Clicks
    document.getElementById('quiz-prev-btn').addEventListener('click', () => {
        if (quizState.currentQuestionIndex > 0) {
            renderQuestion(quizState.currentQuestionIndex - 1);
        }
    });

    document.getElementById('quiz-next-btn').addEventListener('click', () => {
        if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
            renderQuestion(quizState.currentQuestionIndex + 1);
        }
    });

    document.getElementById('quiz-clear-btn').addEventListener('click', () => {
        selectOption(quizState.currentQuestionIndex, "");
    });

    // Quiz submit click
    document.getElementById('quiz-submit-btn').addEventListener('click', async () => {
        if (confirm("Are you sure you want to submit and complete the quiz?")) {
            await submitQuizResponses();
        }
    });
}

// ==========================================================================
// TIMER SYSTEM
// ==========================================================================

function stopQuizTimer() {
    if (quizState.timer) {
        clearInterval(quizState.timer);
        quizState.timer = null;
    }
}

function resetQuestionTimer() {
    stopQuizTimer();
    quizState.timeLeft = quizState.maxTime;
    updateTimerCircleUI();

    quizState.timer = setInterval(() => {
        quizState.timeLeft--;
        updateTimerCircleUI();

        if (quizState.timeLeft <= 0) {
            stopQuizTimer();
            handleQuestionTimeout();
        }
    }, 1000);
}

function updateTimerCircleUI() {
    const textCounter = document.getElementById('timer-counter');
    const circleProgress = document.getElementById('timer-progress');
    
    textCounter.textContent = quizState.timeLeft;

    // Calculate Dash Offset (perimeter is 219.9)
    const offset = 219.9 - (quizState.timeLeft / quizState.maxTime) * 219.9;
    circleProgress.style.strokeDashoffset = offset;

    // Warning state when below 10 seconds
    if (quizState.timeLeft <= 8) {
        circleProgress.classList.add('timer-danger');
        textCounter.style.color = '#ef4444';
    } else {
        circleProgress.classList.remove('timer-danger');
        textCounter.style.color = '#fff';
    }
}

function handleQuestionTimeout() {
    showToast("Time's up for this question!", "info");
    
    // Auto-save empty string if nothing selected
    if (quizState.responses[quizState.currentQuestionIndex].response === "") {
        quizState.responses[quizState.currentQuestionIndex].response = "";
    }

    // Go to next question or auto submit
    if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
        renderQuestion(quizState.currentQuestionIndex + 1);
    } else {
        showToast("Auto-submitting quiz...", "info");
        submitQuizResponses();
    }
}

// ==========================================================================
// QUIZ RESULT ANALYSIS & REVIEW
// ==========================================================================

async function submitQuizResponses() {
    stopQuizTimer();
    
    try {
        const submitBtn = document.getElementById('quiz-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

        const submitUrl = `${API_BASE}/quiz/submit/${quizState.quizId}`;
        const response = await authFetch(submitUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quizState.responses)
        });

        if (!response.ok) {
            throw new Error("Failed to submit responses to the backend.");
        }

        const result = await response.json(); // QuizResult model DTO
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Submit Quiz';

        // Render result page
        showScreen('result');
        displayResultDetails(result);
        loadUserRatings();

    } catch (error) {
        console.error(error);
        showToast(error.message, "error");
        
        const submitBtn = document.getElementById('quiz-submit-btn');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Submit Quiz';
    }
}

function displayResultDetails(result) {
    const percent = Math.round((result.score / result.totalQuestions) * 100);
    
    // Set circle graph percent variable for conic gradient
    const scoreCircle = document.querySelector('.score-circle');
    scoreCircle.style.setProperty('--percentage', `${percent}%`);

    // Bind scores
    document.getElementById('result-score-fraction').textContent = `${result.score}/${result.totalQuestions}`;
    document.getElementById('result-score-percent').textContent = `${percent}%`;
    document.getElementById('result-category').textContent = quizState.category;
    document.getElementById('result-difficulty').textContent = quizState.difficulty === 'Any' ? 'All Levels' : quizState.difficulty;
    document.getElementById('result-total-qs').textContent = result.totalQuestions;
    document.getElementById('result-correct-qs').textContent = result.score;
    
    const incorrectQs = result.totalQuestions - result.score;
    document.getElementById('result-incorrect-qs').textContent = incorrectQs;

    // Headline message based on performance
    const headline = document.getElementById('result-headline');
    const subtext = document.getElementById('result-subtext');

    if (percent === 100) {
        headline.textContent = "🏆 Perfect Score!";
        subtext.textContent = "Outstanding! You got every single question right!";
    } else if (percent >= 80) {
        headline.textContent = "🎉 Excellent Job!";
        subtext.textContent = "Fantastic score! You clearly know your stuff.";
    } else if (percent >= 50) {
        headline.textContent = "👍 Good Attempt!";
        subtext.textContent = "Nice work! You passed, but there's room to improve.";
    } else {
        headline.textContent = "📚 Keep Practicing!";
        subtext.textContent = "Don't worry! Review the answers below to learn and try again.";
    }

    // Setup action buttons on result page
    document.getElementById('result-home-btn').onclick = () => {
        resetQuizState();
        showScreen('home');
    };
    document.getElementById('result-retry-btn').onclick = () => {
        const category = quizState.category;
        resetQuizState();
        openSetupWithCategory(category);
    };

    // Render detailed review list
    const reviewList = document.getElementById('review-questions-list');
    reviewList.innerHTML = "";

    result.reviews.forEach((review, i) => {
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${review.correct ? 'correct' : 'incorrect'}`;

        const isCorrectIcon = review.correct 
            ? '<i class="fa-solid fa-circle-check"></i>' 
            : '<i class="fa-solid fa-circle-xmark"></i>';

        reviewItem.innerHTML = `
            <div class="review-status-icon">${isCorrectIcon}</div>
            <div class="review-details">
                <div class="review-question">Q${i+1}. ${escapeHTML(review.questionText)}</div>
                <div class="review-answers-row">
                    <div class="review-answer-info">
                        <span>Your Answer</span>
                        <span class="${review.correct ? 'text-success' : 'text-danger'}">${escapeHTML(review.userResponse)}</span>
                    </div>
                    ${!review.correct ? `
                    <div class="review-answer-info">
                        <span>Correct Answer</span>
                        <span class="text-success">${escapeHTML(review.correctAnswer)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        reviewList.appendChild(reviewItem);
    });
}

// ==========================================================================
// ADMIN DASHBOARD (QUESTION CRUD)
// ==========================================================================

function initAdminForm() {
    const form = document.getElementById('add-question-form');
    
    // Wire up reset button to clear edit state as well
    const resetBtn = document.getElementById('form-reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            form.reset();
            resetQuestionFormState();
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const qId = document.getElementById('form-question-id').value;
        const isEdit = qId !== "";

        const questionData = {
            question: document.getElementById('form-question').value.trim(),
            category: document.getElementById('form-category').value.trim(),
            difficulty: document.getElementById('form-difficulty').value,
            answer: document.getElementById('form-answer').value.trim(),
            option1: document.getElementById('form-option1').value.trim(),
            option2: document.getElementById('form-option2').value.trim(),
            option3: document.getElementById('form-option3').value.trim()
        };

        try {
            const submitBtn = document.getElementById('form-submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${isEdit ? 'Updating...' : 'Saving...'}`;

            const url = isEdit ? `${API_BASE}/questions/${qId}` : `${API_BASE}/questions/add`;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await authFetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(questionData)
            });

            submitBtn.disabled = false;
            submitBtn.innerHTML = isEdit ? '<i class="fa-solid fa-save"></i> Update Question' : '<i class="fa-solid fa-floppy-disk"></i> Save Question';

            if (!response.ok) {
                throw new Error(`Failed to ${isEdit ? 'update' : 'save'} question to the database.`);
            }

            showToast(`Question ${isEdit ? 'updated' : 'saved'} successfully!`, "success");
            form.reset();
            resetQuestionFormState();

            // Refresh dashboards and stats
            loadAppStats();
            loadQuestionBank();

        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
        }
    });

    // Category list filter dropdown change
    document.getElementById('filter-category').addEventListener('change', (e) => {
        filterQuestionBankList(e.target.value);
    });
}

// Full array of questions loaded from DB
let allQuestionsCache = [];

async function loadQuestionBank() {
    try {
        const response = await authFetch(`${API_BASE}/questions/allQs`);
        if (!response.ok) {
            throw new Error("Failed to load questions from database.");
        }

        allQuestionsCache = await response.json();
        
        // Populate category options in filter
        populateCategoryFilter(allQuestionsCache);
        
        // Render questions table
        filterQuestionBankList(document.getElementById('filter-category').value);

    } catch (error) {
        console.error(error);
        const tbody = document.getElementById('questions-table-body');
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger"><i class="fa-solid fa-triangle-exclamation"></i> Error loading questions. Is PostgreSQL connected?</td></tr>`;
    }
}

function populateCategoryFilter(questions) {
    const filterSelect = document.getElementById('filter-category');
    
    // Remember current selection
    const selectedVal = filterSelect.value;

    // Get unique categories
    const categories = [...new Set(questions.map(q => q.category))].filter(Boolean);
    
    // Clear and reset options
    filterSelect.innerHTML = '<option value="all">All Categories</option>';
    
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filterSelect.appendChild(option);
    });

    // Restore selected value if possible
    if (categories.includes(selectedVal)) {
        filterSelect.value = selectedVal;
    } else {
        filterSelect.value = 'all';
    }
}

function filterQuestionBankList(categoryFilter) {
    const tbody = document.getElementById('questions-table-body');
    tbody.innerHTML = "";

    const filtered = categoryFilter === 'all' 
        ? allQuestionsCache 
        : allQuestionsCache.filter(q => q.category === categoryFilter);

    document.getElementById('question-bank-subtitle').textContent = `Manage existing questions in the database (${filtered.length} shown)`;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No questions found in this category.</td></tr>';
        return;
    }

    filtered.forEach(q => {
        const tr = document.createElement('tr');
        
        const qDiff = q.difficulty || 'Medium';
        let diffClass = 'difficulty-medium';
        if (qDiff.toLowerCase() === 'easy') diffClass = 'difficulty-easy';
        if (qDiff.toLowerCase() === 'hard') diffClass = 'difficulty-hard';

        tr.innerHTML = `
            <td>${q.id}</td>
            <td>
                <div class="table-question-text" title="${escapeHTML(q.question)}">${escapeHTML(q.question)}</div>
            </td>
            <td><span class="badge-category">${escapeHTML(q.category)}</span></td>
            <td><span class="badge-difficulty ${diffClass}">${escapeHTML(qDiff)}</span></td>
            <td>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn btn-secondary py-1 px-2" style="padding: 4px 8px; font-size: 12px; height: 28px;" onclick="viewQuestionDetailsAlert(${q.id})">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                    <button class="btn btn-primary py-1 px-2" style="padding: 4px 8px; font-size: 12px; height: 28px; background: #3b82f6; border-color: #3b82f6;" onclick="editQuestionTrigger(${q.id})">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn btn-danger py-1 px-2" style="padding: 4px 8px; font-size: 12px; height: 28px; background: #ef4444; border-color: #ef4444;" onclick="deleteQuestionTrigger(${q.id})">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Global helper for viewing details
window.viewQuestionDetailsAlert = function(id) {
    const q = allQuestionsCache.find(item => item.id === id);
    if (!q) return;

    alert(
        `Question Details:\n\n` +
        `Question: ${q.question}\n` +
        `Category: ${q.category}\n` +
        `Difficulty: ${q.difficulty}\n\n` +
        `Correct Answer: ${q.answer}\n` +
        `Option 1: ${q.option1}\n` +
        `Option 2: ${q.option2}\n` +
        `Option 3: ${q.option3}`
    );
};

async function loadAppStats() {
    try {
        const response = await authFetch(`${API_BASE}/questions/allQs`);
        if (!response.ok) return;

        const questions = await response.json();
        
        // Count unique categories
        const categories = [...new Set(questions.map(q => q.category))].filter(Boolean);

        document.getElementById('stat-total-questions').textContent = questions.length;
        document.getElementById('stat-total-categories').textContent = categories.length;

    } catch (e) {
        console.error("Failed to load statistics on home screen", e);
    }
}

// ==========================================================================
// TOAST NOTIFICATIONS & HELPERS
// ==========================================================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = toast.querySelector('.toast-icon');

    toastMsg.textContent = message;
    
    // Clear previous types
    toast.className = 'toast show';
    toast.classList.add(type);

    // Set icons
    if (type === 'success') {
        toastIcon.className = 'toast-icon fa-solid fa-circle-check';
    } else if (type === 'error') {
        toastIcon.className = 'toast-icon fa-solid fa-circle-exclamation';
    } else if (type === 'info') {
        toastIcon.className = 'toast-icon fa-solid fa-circle-info';
    }

    // Hide after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==========================================================================
// AUTHENTICATION AND ROLE SYSTEM
// ==========================================================================

function initAuth() {
    const tabLogin = document.getElementById('tab-login-btn');
    const tabRegister = document.getElementById('tab-register-btn');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Switch to Login Tab
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    });

    // Switch to Sign Up Tab
    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    });

    // Handle Login Form Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        const loginBtn = document.getElementById('login-submit-btn');
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';

        try {
            const response = await fetch(`${API_BASE}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errMsg = await response.text();
                throw new Error(errMsg || "Invalid email or password");
            }

            const data = await response.json(); // {token, email, name, role}
            
            // Save state
            authState.token = data.token;
            authState.user = { email: data.email, name: data.name, role: data.role };
            localStorage.setItem('quizify_token', data.token);
            localStorage.setItem('quizify_user', JSON.stringify(authState.user));

            showToast(`Welcome back, ${data.name}!`, "success");
            
            // Update UI showing/hiding
            checkAuth();
            
            // Load application data
            loadAppStats();
            loadQuestionBank();
            loadUserRatings();

            // Redirect to Home
            showScreen('home');

            // Reset form
            loginForm.reset();

        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Login';
        }
    });

    // Handle Register Form Submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const role = "USER";

        const registerBtn = document.getElementById('register-submit-btn');
        registerBtn.disabled = true;
        registerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

        try {
            const response = await fetch(`${API_BASE}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role })
            });

            if (!response.ok) {
                const errMsg = await response.text();
                throw new Error(errMsg || "Registration failed");
            }

            showToast("Account created successfully! Please login.", "success");
            
            // Switch tab to Login
            tabLogin.click();
            
            // Pre-fill email
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').focus();

            // Reset register form
            registerForm.reset();

        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
        } finally {
            registerBtn.disabled = false;
            registerBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Sign Up';
        }
    });

    // Handle Logout Click
    document.getElementById('nav-logout-btn').addEventListener('click', () => {
        handleLogout("Logged out successfully");
    });
}

function handleLogout(message = "Logged out successfully") {
    // Clear storage
    authState.token = null;
    authState.user = null;
    localStorage.removeItem('quizify_token');
    localStorage.removeItem('quizify_user');
    
    // Reset state
    resetQuizState();
    
    // Update navigation views
    checkAuth();
    
    if (message) {
        showToast(message, "info");
    }
}

function isTokenExpired(token) {
    if (!token) return true;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        
        let base64Url = parts[1];
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        if (payload.exp) {
            const now = Math.floor(Date.now() / 1000);
            return payload.exp < now;
        }
        return false;
    } catch (e) {
        console.error("Error checking token expiration:", e);
        return true;
    }
}

function checkAuth() {
    const hasTokenInStorage = !!localStorage.getItem('quizify_token');
    if (!authState.token || isTokenExpired(authState.token)) {
        const wasLoggedIn = hasTokenInStorage;
        authState.token = null;
        authState.user = null;
        localStorage.removeItem('quizify_token');
        localStorage.removeItem('quizify_user');

        // Logged out: hide navigation links and show auth screen
        document.getElementById('nav-home-btn').style.display = 'none';
        document.getElementById('nav-admin-btn').style.display = 'none';
        document.getElementById('user-profile-menu').style.display = 'none';
        
        // Show auth screen directly
        Object.values(screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        if (screens.auth) screens.auth.classList.add('active');
        
        if (wasLoggedIn) {
            showToast("Session expired. Please login again.", "info");
        }
        return false;
    } else {
        // Logged in: show home and user chips
        document.getElementById('nav-home-btn').style.display = 'inline-flex';
        
        // Only show Admin Dashboard link if user is an admin
        if (authState.user && authState.user.role === 'ADMIN') {
            document.getElementById('nav-admin-btn').style.display = 'inline-flex';
        } else {
            document.getElementById('nav-admin-btn').style.display = 'none';
        }
        
        document.getElementById('user-profile-menu').style.display = 'flex';
        document.getElementById('user-name-display').innerHTML = `<i class="fa-solid fa-circle-user"></i> ${escapeHTML(authState.user.name)} <span style="font-size: 11px; opacity: 0.8; margin-left: 4px;">(${escapeHTML(authState.user.role)})</span>`;
        return true;
    }
}

async function authFetch(url, options = {}) {
    options.headers = options.headers || {};
    
    if (authState.token) {
        options.headers['Authorization'] = `Bearer ${authState.token}`;
    }
    
    try {
        const response = await fetch(url, options);
        
        if (response.status === 401 || response.status === 403) {
            handleLogout("Session expired. Please login again.");
            throw new Error("Session expired. Please login again.");
        }
        
        return response;
    } catch (err) {
        console.error("Authenticated Fetch error:", err);
        throw err;
    }
}

// ==========================================================================
// DARK/LIGHT THEME SWITCHER SYSTEM
// ==========================================================================

function initTheme() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const currentTheme = localStorage.getItem('quizify_theme') || 'dark';
    
    // Apply current theme on load
    if (currentTheme === 'light') {
        document.body.classList.add('light-mode');
        themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.remove('light-mode');
        themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }

    // Toggle theme click listener
    themeBtn.addEventListener('click', () => {
        const isLight = document.body.classList.contains('light-mode');
        if (isLight) {
            document.body.classList.remove('light-mode');
            localStorage.setItem('quizify_theme', 'dark');
            themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            showToast("Dark Mode activated", "info");
        } else {
            document.body.classList.add('light-mode');
            localStorage.setItem('quizify_theme', 'light');
            themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            showToast("Light Mode activated", "info");
        }
    });
}

// ==========================================================================
// ADMIN DASHBOARD TABBED NAVIGATION & EDIT FLOWS
// ==========================================================================

function resetQuestionFormState() {
    document.getElementById('form-question-id').value = "";
    document.getElementById('admin-form-title').innerHTML = '<i class="fa-solid fa-circle-plus text-gradient"></i> Add New Question';
    document.getElementById('admin-form-desc').textContent = "Expand the quiz database by adding a custom question";
    document.getElementById('form-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Question';
}

function initAdminTabs() {
    const tabQuestions = document.getElementById('admin-tab-questions');
    const tabQuizzes = document.getElementById('admin-tab-quizzes');

    const paneQuestions = document.getElementById('admin-pane-questions');
    const paneQuizzes = document.getElementById('admin-pane-quizzes');

    if (!tabQuestions || !tabQuizzes) return;

    const tabs = [tabQuestions, tabQuizzes];
    const panes = [paneQuestions, paneQuizzes];

    function switchTab(activeTab, activePane) {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.style.display = 'none');
        
        activeTab.classList.add('active');
        activePane.style.display = 'block';
    }

    tabQuestions.addEventListener('click', () => {
        switchTab(tabQuestions, paneQuestions);
    });

    tabQuizzes.addEventListener('click', () => {
        switchTab(tabQuizzes, paneQuizzes);
        loadQuizzesList();
    });
}

async function loadQuizzesList() {
    const tbody = document.getElementById('quizzes-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading quizzes...</td></tr>';

    try {
        const response = await authFetch(`${API_BASE}/quiz/all`);
        if (!response.ok) throw new Error("Failed to load quizzes.");
        const quizzes = await response.json();

        tbody.innerHTML = "";
        if (quizzes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No quizzes saved in the database yet.</td></tr>';
            return;
        }

        quizzes.forEach(q => {
            const tr = document.createElement('tr');
            const creatorName = q.creator ? q.creator.email : 'System';
            
            let diffClass = 'difficulty-medium';
            if ((q.difficulty || '').toLowerCase() === 'easy') diffClass = 'difficulty-easy';
            if ((q.difficulty || '').toLowerCase() === 'hard') diffClass = 'difficulty-hard';

            tr.innerHTML = `
                <td>${q.id}</td>
                <td><strong>${escapeHTML(q.title)}</strong> <span style="font-size: 11px; opacity: 0.6; display: block; margin-top: 2px;">Visibility: ${q.visibility}</span></td>
                <td><span class="badge-category">${escapeHTML(q.category || "Any")}</span></td>
                <td><span class="badge-difficulty ${diffClass}">${escapeHTML(q.difficulty || "Any")}</span></td>
                <td>${escapeHTML(creatorName)}</td>
                <td>
                    <button class="btn btn-danger py-1 px-2" style="padding: 4px 8px; font-size: 12px; height: 28px; background: #ef4444; border-color: #ef4444;" onclick="deleteQuizTrigger(${q.id})">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${escapeHTML(err.message)}</td></tr>`;
    }
}

window.deleteQuizTrigger = async function(id) {
    if (!confirm(`Are you sure you want to delete Quiz ID: ${id}?`)) return;

    try {
        const response = await authFetch(`${API_BASE}/quiz/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast("Quiz deleted successfully!", "success");
            loadQuizzesList();
        } else {
            const msg = await response.text();
            showToast(msg || "Failed to delete quiz.", "error");
        }
    } catch (err) {
        showToast("Error deleting quiz: " + err.message, "error");
    }
};

async function loadUserRatings() {
    const tbody = document.getElementById('user-ratings-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading your ratings...</td></tr>';

    try {
        const response = await authFetch(`${API_BASE}/performance/my`);
        if (!response.ok) throw new Error("Failed to load performance ratings.");
        const logs = await response.json();

        tbody.innerHTML = "";
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;">No quiz completions logged yet. Play a quiz to see your ratings!</td></tr>';
            return;
        }

        logs.forEach(log => {
            const tr = document.createElement('tr');
            const percentage = log.percentage;
            
            let ratingColor = '#ef4444'; // Red
            if (percentage >= 50 && percentage < 80) ratingColor = '#f59e0b'; // Amber
            if (percentage >= 80) ratingColor = '#10b981'; // Green

            const formattedDate = new Date(log.timestamp).toLocaleString();

            tr.innerHTML = `
                <td><strong>${escapeHTML(log.quizTitle)}</strong></td>
                <td><span class="badge-category">${escapeHTML(log.category)}</span></td>
                <td><span class="badge-difficulty difficulty-${(log.difficulty || 'Any').toLowerCase()}">${escapeHTML(log.difficulty || 'Any')}</span></td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 3px;">
                        <span style="font-weight: 700; color: ${ratingColor}; font-size: 13px;">${log.score}/${log.totalQuestions} (${percentage}%)</span>
                        <div style="width: 100px; height: 6px; background: rgba(255,255,255,0.15); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: ${ratingColor};"></div>
                        </div>
                    </div>
                </td>
                <td style="font-size: 13px; opacity: 0.8;">${formattedDate}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${escapeHTML(err.message)}</td></tr>`;
    }
}

window.editQuestionTrigger = function(id) {
    const q = allQuestionsCache.find(item => item.id === id);
    if (!q) return;

    // Pre-populate fields
    document.getElementById('form-question-id').value = q.id;
    document.getElementById('form-question').value = q.question;
    document.getElementById('form-category').value = q.category;
    document.getElementById('form-difficulty').value = q.difficulty;
    document.getElementById('form-answer').value = q.answer;
    document.getElementById('form-option1').value = q.option1;
    document.getElementById('form-option2').value = q.option2;
    document.getElementById('form-option3').value = q.option3;

    // Change title and button text
    document.getElementById('admin-form-title').innerHTML = '<i class="fa-solid fa-edit text-gradient"></i> Edit Question';
    document.getElementById('admin-form-desc').textContent = `Editing Question ID: ${q.id}`;
    document.getElementById('form-submit-btn').innerHTML = '<i class="fa-solid fa-save"></i> Update Question';
    
    // Scroll form into view
    document.querySelector('.admin-form-card').scrollIntoView({ behavior: 'smooth' });
};

window.deleteQuestionTrigger = async function(id) {
    if (!confirm(`Are you sure you want to delete Question ID: ${id}?`)) return;

    try {
        const response = await authFetch(`${API_BASE}/questions/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast("Question deleted successfully!", "success");
            loadAppStats();
            loadQuestionBank();
        } else {
            const msg = await response.text();
            showToast(msg || "Failed to delete question.", "error");
        }
    } catch (err) {
        showToast("Error deleting question: " + err.message, "error");
    }
};

// ==========================================================================
// PLAY SHARED QUIZ BY ID LOGIC
// ==========================================================================

function initSharedQuizEvents() {
    const playSharedBtn = document.getElementById('play-shared-btn');
    if (!playSharedBtn) return;

    playSharedBtn.addEventListener('click', async () => {
        const input = document.getElementById('shared-quiz-id');
        const quizIdVal = input.value.trim();

        if (!quizIdVal || isNaN(quizIdVal) || parseInt(quizIdVal) <= 0) {
            showToast("Please enter a valid Quiz ID", "error");
            return;
        }

        const quizId = parseInt(quizIdVal);

        try {
            playSharedBtn.disabled = true;
            playSharedBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Fetching...';

            // 1. Fetch metadata first to run visibility/access control check
            const infoResponse = await authFetch(`${API_BASE}/quiz/info/${quizId}`);
            if (!infoResponse.ok) {
                if (infoResponse.status === 403) {
                    throw new Error("Access denied: This quiz is private!");
                } else if (infoResponse.status === 404) {
                    throw new Error("Quiz not found! Double-check the ID.");
                } else {
                    throw new Error("Failed to fetch quiz information.");
                }
            }
            const info = await infoResponse.json();

            // 2. Fetch the masked play questions
            const getResponse = await authFetch(`${API_BASE}/quiz/get/${quizId}`);
            if (!getResponse.ok) throw new Error("Failed to retrieve quiz questions.");
            const questions = await getResponse.json();

            if (questions.length === 0) {
                throw new Error("No questions found in this quiz.");
            }

            // Save variables in state
            quizState.quizId = info.id;
            quizState.title = info.title;
            quizState.category = info.category || "Any";
            quizState.difficulty = info.difficulty || "Any";
            quizState.questions = questions;
            quizState.currentQuestionIndex = 0;

            // Pre-populate empty responses
            quizState.responses = questions.map(q => ({ id: q.id, response: "" }));

            // Reset button & input
            playSharedBtn.disabled = false;
            playSharedBtn.innerHTML = '<i class="fa-solid fa-play"></i> Play Quiz';
            input.value = "";

            // Show active quiz screen and render first question
            showScreen('quiz');
            setupQuizViewHeader();
            renderQuestion(0);
            showToast(`Loaded Quiz: ${info.title}`, "success");

        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
            
            playSharedBtn.disabled = false;
            playSharedBtn.innerHTML = '<i class="fa-solid fa-play"></i> Play Quiz';
        }
    });
}

function initAdminQuizForm() {
    const adminCreateForm = document.getElementById('admin-create-quiz-form');
    if (!adminCreateForm) return;

    adminCreateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('admin-quiz-title').value.trim();
        const category = document.getElementById('admin-quiz-category').value;
        const difficulty = document.getElementById('admin-quiz-difficulty').value;
        const numQ = parseInt(document.getElementById('admin-quiz-num').value);
        const visibility = document.getElementById('admin-quiz-visibility').value;

        const submitBtn = document.getElementById('admin-create-quiz-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';

        try {
            const createUrl = `${API_BASE}/quiz/create-persistent?category=${encodeURIComponent(category)}&numQ=${numQ}&title=${encodeURIComponent(title)}&difficulty=${encodeURIComponent(difficulty)}&visibility=${encodeURIComponent(visibility)}`;
            const response = await authFetch(createUrl, { method: 'POST' });
            
            if (!response.ok) {
                throw new Error("Failed to create persistent quiz. Make sure there are enough questions in this category/difficulty!");
            }

            const quizId = await response.json();
            showToast(`Quiz created successfully! ID: ${quizId}`, "success");
            
            // Reset form
            adminCreateForm.reset();
            document.getElementById('admin-quiz-difficulty').value = "Any";
            document.getElementById('admin-quiz-visibility').value = "PUBLIC";
            document.getElementById('admin-quiz-num').value = "5";

            // Refresh the quizzes list table
            loadQuizzesList();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Create Quiz & Save';
        }
    });
}




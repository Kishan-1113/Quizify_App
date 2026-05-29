# Quizify - Interactive Quiz Platform

Quizify is a premium interactive single-page web application built with a Spring Boot backend and an HTML/CSS/Vanilla JS frontend. It features secure JWT authentication, dynamic quiz generation, and detailed user results and analytics.

---

## 🚀 How to Run the Application

### 1. Prerequisites
- **Java 21** installed on your system.
- **PostgreSQL Database** server installed and running.
- **Maven** (included via wrapper `mvnw.cmd` / `mvnw`).

### 2. Configure Database & Environment
The application uses environment variables loaded from a `.env` file in the project root folder.
Create or edit the `.env` file in the root folder with the following contents:
```properties
POSTGRES_PASSWORD=your_postgres_password
JWT_SECRET=your Jwt Secret
```
*Note: Make sure a database named `QuizDataBase` exists in your PostgreSQL instance (matches `jdbc:postgresql://localhost:5432/QuizDataBase`). You can create it using pgAdmin or psql command:*
```sql
CREATE DATABASE "QuizDataBase";
```

### 3. Compile and Run the Server
Open a terminal in the project root directory and execute:

**On Windows:**
```powershell
.\mvnw.cmd spring-boot:run
```

**On macOS/Linux:**
```bash
chmod +x mvnw
./mvnw spring-boot:run
```

Once started, the application will boot on **port 8080**.

---

## 🌐 How to Access the UI
The frontend UI is served statically by Spring Boot. Access it directly from your web browser at:
👉 **[http://localhost:8080/](http://localhost:8080/)**

---

## 📖 Application User Manual

### 1. Authentication Flow
Upon hitting the website, if you are not logged in, you will be redirected to the **Authentication Screen**:
- **Sign Up**: Create an account with your Name, Email, Password, and Role (`User` or `Admin`).
- **Login**: Authenticate using your credentials. Upon successful login, the frontend stores your secure JWT token in local storage, and a customized greeting header appears showing your name and role.
- **Logout**: Click the Logout button in the header to end your session.

### 2. Quiz Play Flow (`USER` & `ADMIN` Roles)
- Click **Play a Quiz** or select one of the popular categories (Java, Python, SQL, General).
- Customize your assessment: Enter a Quiz Title, select/type a custom Category, and set the Number of Questions (2 to 15 Qs).
- Click **Launch Quiz**: The app generates a randomized quiz from the database.
- **Answer Questions**: Select options (A, B, C, D) within the 30-second time limit per question. Navigation buttons and a sidebar grid allow jumping between questions.
- **Submit**: Once submitted, you will immediately see a result card featuring:
  - Total score and percentage indicator.
  - Performance headlines and action buttons (Retry / Back to Home).
  - Detailed review listing correct answers alongside your answers.

### 3. Question Bank Management (`ADMIN` Role Only)
Users registered with the **Admin** role can access the **Admin Dashboard**:
- **View Bank**: See all available questions stored in the database.
- **Category Filter**: Filter questions instantly using the dropdown.
- **Add New Question**: Enter the description, select a difficulty level, define the correct option, and write three distractor (incorrect) options. Click "Save Question" to commit it directly to the PostgreSQL database.

---

## 🔌 API Documentation (Backend Endpoints)

All endpoints below require standard headers if authenticated, except for authentication routes.

### 🔑 Authentication Routes (Public)
- **Register User**: `POST /users/register`
  - Body:
    ```json
    {
      "name": "Alex Smith",
      "email": "alex@example.com",
      "password": "securepassword",
      "role": "USER"
    }
    ```
- **Login User**: `POST /users/login`
  - Body:
    ```json
    {
      "email": "alex@example.com",
      "password": "securepassword"
    }
    ```
  - Response:
    ```json
    {
      "token": "JWT_BEARER_TOKEN_STRING",
      "email": "alex@example.com",
      "name": "Alex Smith",
      "role": "USER"
    }
    ```

### ❓ Question Management (Requires Authentication)
- **Get All Questions**: `GET /questions/allQs`
- **Get Questions by Category**: `GET /questions/{category}`
- **Get Questions by Difficulty**: `GET /questions/level/{difficulty}` (e.g. Easy, Medium, Hard)
- **Add Question**: `POST /questions/add`
  - Body:
    ```json
    {
      "question": "Which of the following is not a primitive type in Java?",
      "category": "Java",
      "difficulty": "Easy",
      "answer": "String",
      "option1": "int",
      "option2": "double",
      "option3": "boolean"
    }
    ```

### 📝 Quiz Management (Requires Authentication)
- **Create Quiz**: `POST /quiz/create`
  - Request Parameters: `category`, `numQ`, `title`, `difficulty` (optional, defaults to `"Any"`)
  - Response: Quiz ID (integer)
- **Get Quiz Questions**: `GET /quiz/get/{id}`
  - Response: List of questions with shuffled, masked options (correct answers are hidden on load).
- **Submit Quiz**: `POST /quiz/submit/{id}`
  - Body: List of responses:
    ```json
    [
      { "id": 1, "response": "String" },
      { "id": 2, "response": "int" }
    ]
    ```
  - Response: Detailed score and individual response reviews.

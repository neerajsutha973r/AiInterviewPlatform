# 🤖 AI Interview Platform

An AI-powered technical interview platform that simulates real-world technical interviews using Google Gemini, speech recognition, text-to-speech, and semantic question similarity search with PostgreSQL and pgvector.

The platform allows users to create interviews based on a specific **role** and **difficulty**, receive AI-generated technical questions, answer them using voice or text, and receive AI-powered evaluation and feedback.

---

## 🚀 Features

### 🎯 Personalized Interviews

Users can create an interview by selecting:

- Interview title
- Technical role
- Difficulty level

The system generates questions specifically for the selected role and difficulty.

### 🤖 AI Question Generation

Google Gemini generates technical interview questions dynamically.

Each interview contains:

- Exactly 10 questions
- Open-ended questions
- Practical scenarios
- Role-specific questions
- Difficulty-appropriate questions
- Expected/correct answers for evaluation

### 🧠 Semantic Question Similarity

The platform uses **Gemini Embedding 001** to convert questions into vector embeddings.

These embeddings are stored in **Neon PostgreSQL using pgvector**.

Before accepting a new question, the system performs a semantic similarity search against previously stored questions.

This helps prevent questions that are:

- Identical
- Substantially similar
- Simple rewordings
- Similar scenarios with different wording

A similarity threshold of **0.85** is currently used.

### 🎤 Speech Recognition

Candidates can answer interview questions using their microphone.

Speech is converted into text using the browser's Speech Recognition API and displayed in the answer box.

### 🔊 Text-to-Speech

The AI interviewer reads each question aloud using browser text-to-speech.

After the question is spoken, the system automatically starts listening for the candidate's answer.

### 📊 AI Answer Evaluation

Candidate answers are evaluated by Google Gemini based on:

- Accuracy
- Completeness
- Technical correctness

The system returns:

- Score from 0–10
- Constructive feedback

### 🔐 Authentication

User authentication is implemented using JWT-based authentication.

Authenticated users can manage their own interviews.

### 📈 Interview Results

After completing an interview, the platform evaluates the candidate's answers and provides an interview result with scores and feedback.

---

# 🛠️ Tech Stack

## Frontend

- React
- React Router
- Axios
- JavaScript
- Web Speech API
- Speech Synthesis API
- CSS

## Backend

- Node.js
- Express.js
- REST APIs
- JWT Authentication

## AI

- Google Gemini
- Gemini 3.1 Flash-Lite
- Gemini Embedding 001

## Database

- PostgreSQL
- Neon PostgreSQL
- pgvector

---

# 🏗️ System Architecture

                         ┌──────────────────────┐
                         │    React Frontend    │
                         └──────────┬───────────┘
                                    │
                                    │ REST API
                                    ▼
                         ┌──────────────────────┐
                         │   Node.js + Express  │
                         └──────────┬───────────┘
                                    │
                   ┌────────────────┼─────────────────┐
                   │                │                 │
                   ▼                ▼                 ▼
             Interview          Answer            AI Service
             Service            Service               │
                   │                │                  │
                   │                │                  ▼
                   │                │           Google Gemini
                   │                │                  │
                   │                │          ┌───────┴────────┐
                   │                │          │                │
                   │                │          ▼                ▼
                   │                │     Text Generation   Embeddings
                   │                │                           │
                   │                │                           ▼
                   │                │                    Gemini Embedding
                   │                │                           │
                   └────────────────┴───────────────────────────┤
                                                                ▼
                                                     PostgreSQL + pgvector
                                                                │
                                                                ▼
                                                               Neon


---

# 🧠 Question Generation & Similarity System

The question generation system follows multiple steps.

## Step 1 — User Creates an Interview

The user selects:

```text
Role
Difficulty
Interview Title
```

The backend stores the interview in PostgreSQL.

---

## Step 2 — Gemini Generates Questions

When the user starts the interview, the backend sends the selected role and difficulty to Gemini.

Example:

```text
Role: Backend Developer
Difficulty: Medium
```

Gemini generates exactly 10 questions.

Each question contains:

```json
{
  "question": "...",
  "correct_answer": "..."
}
```

---

## Step 3 — Generate Embeddings

Each generated question is sent to:

```text
Gemini Embedding 001
```

The model converts the question into a numerical vector.

Currently, the application uses:

```text
768 dimensions
```

Conceptually:

```text
Question
   ↓
Gemini Embedding 001
   ↓
[0.012, -0.034, 0.087, ...]
   ↓
768-dimensional vector
```

---

## Step 4 — Search Existing Questions

The generated question's embedding is compared with embeddings already stored in PostgreSQL.

The search is restricted by:

```text
Role
+
Difficulty
```

This means a question generated for:

```text
Backend Developer + Medium
```

is compared against relevant questions from the same role and difficulty.

---

## Step 5 — Calculate Similarity

pgvector calculates vector distance using:

```sql
q.embedding <=> $1::vector
```

The application converts the distance into a similarity score:

```sql
1 - (q.embedding <=> $1::vector)
```

The closest question is returned first.

---

## Step 6 — Apply Similarity Threshold

The current threshold is:

```text
0.85
```

The logic is:

```text
Similarity >= 0.85
        ↓
Similar question
        ↓
Reject

Similarity < 0.85
        ↓
Different question
        ↓
Accept
```

This allows the system to detect semantic similarity rather than only checking whether the text is exactly the same.

---

# 🔍 Why Use pgvector?

Traditional SQL text matching may fail when two questions have different wording but similar meanings.

For example:

```text
Question A:
"How does caching improve backend performance?"

Question B:
"Explain how caching can reduce response time in a backend system."
```

The wording is different, but the underlying concept is very similar.

Vector embeddings represent the **semantic meaning** of the questions.

pgvector allows PostgreSQL to efficiently compare these vectors.

Therefore:

```text
Text
 ↓
Embedding
 ↓
Vector
 ↓
pgvector
 ↓
Similarity Search
```

---

# 🗄️ Database Design

The project uses **Neon PostgreSQL** as the primary database.

The `questions` table contains question information and its embedding.

```text
questions
├── id
├── interview_id
├── question
├── correct_answer
├── question_order
├── created_at
└── embedding
```

The `embedding` column stores the vector generated by Gemini Embedding 001.

The `questions` table is connected to the `interviews` table using:


# 🎤 Voice Interview Flow

The interview experience supports voice interaction.

```text
AI Question
     ↓
Text-to-Speech
     ↓
Candidate listens
     ↓
Speech Recognition starts
     ↓
Candidate speaks
     ↓
Speech converted to text
     ↓
Answer submitted
     ↓
Next question
```

This creates a more natural interview experience compared with a traditional form-based application.

---


Create a `.env` file inside the backend directory.

```env
DATABASE_URL=your_neon_database_url
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
```

Never commit your `.env` file to GitHub.

Add the following to `.gitignore`:

```gitignore
.env
node_modules/
```

---

# ▶️ Installation

## 1. Clone the Repository

```bash
git clone https://github.com/your-username/AIInterviewPlatform.git

cd AIInterviewPlatform
```

---

## 2. Install Backend Dependencies

```bash
cd backend

npm install
```

Start the backend:

```bash
npm run dev
```

---

## 3. Install Frontend Dependencies

Open another terminal:

```bash
cd frontend

npm install
```

Start the frontend:

```bash
npm run dev
```


# 🚧 Current Limitations

The current implementation has some areas that can be improved.

### Question Regeneration

If a generated question is rejected because it is too similar to an existing question, the system does not yet automatically regenerate a replacement question.

### Batch-Level Similarity

Currently, generated questions are primarily checked against questions already stored in the database.

Questions generated in the same batch can be further compared against each other.


The current system uses:


Gemini Embeddings
        +
Neon PostgreSQL
        +
pgvector
        +
Semantic Similarity Search



---

# 🚀 Future Improvements

- Automatically regenerate rejected questions
- Guarantee exactly 10 unique questions
- Compare questions within the same generated batch
- Adaptive interview difficulty
- Topic-based question selection
- Interview performance analytics
- Personalized candidate feedback
- Question difficulty classification
- Improved answer evaluation
- Interview history analysis
- RAG-based interview knowledge retrieval
- Production vector indexes for larger datasets

---

# 🎯 Project Goal

The goal of this project is to build a realistic AI-powered interview experience while learning how modern AI systems can be integrated with a full-stack application.



# 👨‍💻 Author

**Neeraj Suthar**

AI Interview Platform built as a hands-on project for learning and implementing modern AI and full-stack technologies.

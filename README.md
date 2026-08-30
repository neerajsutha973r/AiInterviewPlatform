# 🤖 AI Interview Platform

An AI-powered interview preparation platform designed to help developers practice technical interviews through dynamically generated questions, answer evaluation, and personalized interview sessions.

The platform is designed to generate interview questions based on **topic, difficulty, and interview context**, while maintaining question history to reduce repetitive questions across sessions.

---

## ✨ Features

### 🎯 AI-Powered Interview Questions

* Generate technical interview questions using an LLM.
* Select specific topics and difficulty levels.
* Generate questions dynamically instead of relying only on a static question bank.
* Support for topics such as **Data Structures & Algorithms (DSA)** and other technical subjects.

### 🧠 Question History & Deduplication

The platform keeps track of previously generated questions so that the AI can avoid repeatedly asking the same or highly similar questions.

A future **RAG-based question retrieval system** will be used to retrieve previously asked questions and provide them as context to the LLM before generating a new question.

### 📊 Answer Evaluation

* Evaluate submitted answers using AI.
* Provide feedback on the user's response.
* Identify strengths and areas for improvement.
* Generate interview-style feedback rather than only checking whether an answer is correct.

### 📈 Interview Practice

* Practice questions based on selected difficulty.
* Track interview sessions.
* Maintain question and answer history.
* Improve preparation through repeated practice with different questions.

---

## 🏗️ Planned RAG Architecture

One of the major goals of this project is to solve a common problem with LLM-based question generation:

> **The LLM can generate the same or very similar question when given the same topic and difficulty.**

To solve this, the platform will maintain a vector database containing previously generated questions.

### Question Generation Flow

```text
User
 │
 ▼
Select Topic + Difficulty
 │
 ▼
Retrieve Previous Questions
 │
 ▼
Vector Database
 │
 ▼
Similar Questions
 │
 ▼
LLM
 │
 │  "Generate a NEW question
 │   different from these questions"
 ▼
New Interview Question
 │
 ▼
Store Question in Vector DB
```

This approach combines **Retrieval-Augmented Generation (RAG)** with question generation to improve question diversity and reduce repetition.

---

## 🧩 RAG Pipeline

The planned RAG pipeline consists of:

```text
Generated Question
       │
       ▼
   Text Chunking
       │
       ▼
   Embeddings
       │
       ▼
  Vector Database
       │
       ▼
Similarity Search
       │
       ▼
Previously Asked Questions
       │
       ▼
      LLM
       │
       ▼
New Question
```

The retrieved questions will be provided to the LLM as negative context so that it can generate a sufficiently different question while maintaining the requested topic and difficulty.

---

## 🛠️ Technology Stack

### Frontend

* React.js
* JavaScript
* HTML
* CSS

### Backend

* Python
* REST API

### AI / GenAI

* Large Language Models (LLMs)
* Prompt Engineering
* Retrieval-Augmented Generation (RAG)
* Embeddings

### Vector Database

* ChromaDB

### Planned AI Components

* Question generation
* Semantic similarity search
* Question deduplication
* Answer evaluation
* Personalized feedback

---

## 📂 High-Level Architecture

```text
                  ┌──────────────────┐
                  │      User        │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │    Frontend      │
                  │     React        │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │     Backend      │
                  │     Python       │
                  └────────┬─────────┘
                           │
                 ┌─────────┴─────────┐
                 ▼                   ▼
        ┌─────────────────┐  ┌─────────────────┐
        │  Vector Search  │  │      LLM        │
        │    ChromaDB     │  │ Question/Answer │
        └────────┬────────┘  └────────┬────────┘
                 │                    │
                 └─────────┬──────────┘
                           ▼
                  ┌──────────────────┐
                  │ Interview Result │
                  └──────────────────┘
```

---

## 🚀 Project Goals

The main goals of the project are:

* Generate diverse technical interview questions.
* Reduce duplicate and highly similar questions.
* Understand how RAG can improve LLM applications.
* Build a practical semantic-search pipeline.
* Provide AI-powered answer evaluation.
* Track interview performance over time.
* Create a realistic AI interview experience.

---

## 🔮 Future Improvements

* [ ] RAG-based question history
* [ ] Semantic duplicate detection
* [ ] Difficulty-aware question retrieval
* [ ] Adaptive difficulty based on performance
* [ ] Voice-based interviews
* [ ] Resume-based interview questions
* [ ] Job-description-based questions
* [ ] Interview performance dashboard
* [ ] Personalized learning recommendations
* [ ] Follow-up questions based on previous answers
* [ ] Question quality evaluation
* [ ] Multi-agent interview architecture

---

## 🧪 Example

Suppose the user selects:

```text
Topic: Trie
Difficulty: Medium
```

The system first retrieves previously generated Trie questions:

```text
Question 1 → Implement Trie
Question 2 → Search a word in Trie
Question 3 → Word Dictionary using Trie
Question 4 → Autocomplete using Trie
```

The LLM then receives these questions as context and is instructed to generate a **new medium-difficulty Trie problem that is meaningfully different from the retrieved questions**.

This prevents the system from simply generating another variation of an already-used question.

---

## 📚 Learning Focus

This project is also being developed as a practical learning project for understanding:

* Generative AI
* LLM application development
* Prompt engineering
* Embeddings
* Vector databases
* Semantic search
* RAG architecture
* AI evaluation
* Backend API development
* Full-stack AI applications

---

## 👨‍💻 Author

**Neeraj Suthar**

Built as a practical project to explore the development of AI-powered interview systems and RAG-based applications.

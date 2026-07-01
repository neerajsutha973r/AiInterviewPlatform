CREATE TABLE answers (

    id SERIAL PRIMARY KEY,

    question_id INTEGER NOT NULL,

    answer TEXT,

    score INTEGER,

    feedback TEXT,

    correct_answer TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (question_id)
    REFERENCES questions(id)
    ON DELETE CASCADE

);
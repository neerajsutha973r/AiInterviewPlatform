CREATE TABLE questions (

    id SERIAL PRIMARY KEY,

    interview_id INTEGER NOT NULL,

    question TEXT NOT NULL,

    question_order INTEGER NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (interview_id)
    REFERENCES interviews(id)
    ON DELETE CASCADE

);
CREATE TABLE interviews (

    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    title VARCHAR(150) NOT NULL,

    role VARCHAR(100) NOT NULL,

    difficulty VARCHAR(20) DEFAULT 'Medium',

    status VARCHAR(20) DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

ALTER TABLE interviews
ADD COLUMN total_score INTEGER DEFAULT 0;

ALTER TABLE interviews
ADD COLUMN total_questions INTEGER DEFAULT 0;

ALTER TABLE interviews
ADD COLUMN completed_at TIMESTAMP;
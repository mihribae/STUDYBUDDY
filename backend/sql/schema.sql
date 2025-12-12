CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  email VARCHAR(128) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  preferred_language ENUM ('en', 'tr', 'cs') DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(128) NOT NULL,
  color CHAR(7) NOT NULL DEFAULT '#4A90E2',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lessons_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  event_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lesson_events_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lesson_id INT NOT NULL,
  technique ENUM ('pomodoro', 'ultradian', 'custom') NOT NULL,
  focus_seconds INT NOT NULL DEFAULT 0,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_study_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_study_sessions_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  due_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS general_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  lesson_id INT NULL,
  color CHAR(7) NOT NULL DEFAULT '#4A90E2',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_general_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_general_events_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions (created_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_events_date ON lesson_events (event_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks (completed);
CREATE INDEX IF NOT EXISTS idx_general_events_user ON general_events (user_id);
CREATE INDEX IF NOT EXISTS idx_general_events_date ON general_events (event_date);



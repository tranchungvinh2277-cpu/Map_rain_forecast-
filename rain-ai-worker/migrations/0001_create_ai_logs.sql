CREATE TABLE IF NOT EXISTS ai_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    session_id TEXT,
    message_id TEXT,

    question TEXT NOT NULL,
    intent TEXT,
    data_source TEXT,

    selected_province TEXT,
    selected_station TEXT,
    station_id TEXT,

    latitude REAL,
    longitude REAL,

    hours INTEGER,
    radius_km REAL,
    threshold_mm REAL,

    observed_summary TEXT,
    forecast_summary TEXT,

    answer TEXT,

    success INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,

    client TEXT,
    app_version TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at
    ON ai_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_logs_session_id
    ON ai_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_ai_logs_intent
    ON ai_logs(intent);

CREATE INDEX IF NOT EXISTS idx_ai_logs_data_source
    ON ai_logs(data_source);

CREATE INDEX IF NOT EXISTS idx_ai_logs_station_id
    ON ai_logs(station_id);

CREATE INDEX IF NOT EXISTS idx_ai_logs_selected_province
    ON ai_logs(selected_province);
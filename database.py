import os
import csv
import logging
from datetime import datetime
import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Database configuration from environment variables
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_NAME = os.getenv("DB_NAME", "mantra")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")

CSV_USER_FILE = 'user_data.csv'
CSV_THERAPY_FILE = 'therapy_activity.csv'

_db_pool = None
_db_available = False


def get_db_pool():
    """Initializes or returns MySQL connection pool."""
    global _db_pool, _db_available
    if _db_pool is not None:
        return _db_pool

    try:
        # First ensure database exists
        ensure_database_exists()

        _db_pool = pooling.MySQLConnectionPool(
            pool_name="patchmantra_pool",
            pool_size=5,
            pool_reset_session=True,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            autocommit=True,
            connect_timeout=5
        )
        _db_available = True
        logger.info(f"MySQL connection pool established successfully for database '{DB_NAME}'")
        return _db_pool
    except Exception as e:
        logger.warning(f"MySQL connection pool initialization failed: {e}. Falling back to CSV storage.")
        _db_available = False
        return None


def ensure_database_exists():
    """Connects to MySQL server and creates the target database if it doesn't exist."""
    try:
        temp_conn = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            connect_timeout=5
        )
        cursor = temp_conn.cursor()
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        )
        temp_conn.commit()
        cursor.close()
        temp_conn.close()
        logger.info(f"Database '{DB_NAME}' verified/created.")
    except Exception as e:
        logger.error(f"Error ensuring database exists: {e}")
        raise


def get_connection():
    """Gets a connection from the pool or creates a direct connection."""
    pool = get_db_pool()
    if pool:
        return pool.get_connection()
    # Fallback direct connection attempt
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        autocommit=True,
        connect_timeout=5
    )


def init_db():
    """Creates tables and migrates existing CSV data if tables are newly created."""
    global _db_available
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(128) NOT NULL UNIQUE,
                name VARCHAR(150),
                mobile VARCHAR(50),
                role VARCHAR(50),
                specialization VARCHAR(150),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_session (session_id),
                INDEX idx_mobile (mobile)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)

        # 2. therapy_logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS therapy_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(128) NOT NULL,
                name VARCHAR(150),
                mobile VARCHAR(50),
                role VARCHAR(50),
                therapy_key VARCHAR(100),
                therapy_title VARCHAR(150),
                language VARCHAR(50),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_session (session_id),
                INDEX idx_therapy (therapy_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)

        # 3. chat_logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(128),
                role VARCHAR(50),
                therapy VARCHAR(100),
                language VARCHAR(50),
                user_query TEXT,
                bot_response TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_session (session_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)

        cursor.close()
        conn.close()
        _db_available = True
        logger.info("Database tables initialized successfully.")

        # Migrate existing CSV rows into MySQL if table was just created
        migrate_csv_data()
        return True

    except Exception as e:
        logger.warning(f"Database initialization warning: {e}. Operating in resilient mode.")
        _db_available = False
        return False


def migrate_csv_data():
    """Migrates any existing rows from user_data.csv and therapy_activity.csv into MySQL."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Check existing user count
        cursor.execute("SELECT COUNT(*) FROM users;")
        user_count = cursor.fetchone()[0]

        if user_count == 0 and os.path.exists(CSV_USER_FILE):
            logger.info("Migrating existing data from user_data.csv into MySQL...")
            with open(CSV_USER_FILE, 'r', newline='', encoding='utf-8') as f:
                reader = csv.reader(f)
                header = next(reader, None)
                for row in reader:
                    if len(row) >= 6:
                        # [timestamp, session_id, name, mobile, role, specialization, last_activity]
                        ts_str = row[0]
                        session_id = row[1]
                        name = row[2]
                        mobile = row[3]
                        role = row[4]
                        spec = row[5]
                        try:
                            created_at = datetime.fromisoformat(ts_str)
                        except Exception:
                            created_at = datetime.now()

                        cursor.execute("""
                            INSERT IGNORE INTO users (session_id, name, mobile, role, specialization, created_at, last_activity)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (session_id, name, mobile, role, spec, created_at, created_at))
            conn.commit()
            logger.info("user_data.csv migration complete.")

        # Check existing therapy_logs count
        cursor.execute("SELECT COUNT(*) FROM therapy_logs;")
        therapy_count = cursor.fetchone()[0]

        if therapy_count == 0 and os.path.exists(CSV_THERAPY_FILE):
            logger.info("Migrating existing data from therapy_activity.csv into MySQL...")
            with open(CSV_THERAPY_FILE, 'r', newline='', encoding='utf-8') as f:
                reader = csv.reader(f)
                header = next(reader, None)
                for row in reader:
                    if len(row) >= 8:
                        # [timestamp, session_id, name, mobile, role, therapy_key, therapy_title, language]
                        ts_str = row[0]
                        session_id = row[1]
                        name = row[2]
                        mobile = row[3]
                        role = row[4]
                        t_key = row[5]
                        t_title = row[6]
                        lang = row[7]
                        try:
                            created_at = datetime.fromisoformat(ts_str)
                        except Exception:
                            created_at = datetime.now()

                        cursor.execute("""
                            INSERT INTO therapy_logs (session_id, name, mobile, role, therapy_key, therapy_title, language, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, (session_id, name, mobile, role, t_key, t_title, lang, created_at))
            conn.commit()
            logger.info("therapy_activity.csv migration complete.")

        cursor.close()
        conn.close()
    except Exception as e:
        logger.warning(f"CSV to MySQL migration encountered non-fatal issue: {e}")


def save_user_to_db(session_id, name='', mobile='', role='', specialization=''):
    """Saves or updates user details in MySQL."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now()

        query = """
            INSERT INTO users (session_id, name, mobile, role, specialization, created_at, last_activity)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                name = IF(VALUES(name) != '', VALUES(name), name),
                mobile = IF(VALUES(mobile) != '', VALUES(mobile), mobile),
                role = IF(VALUES(role) != '', VALUES(role), role),
                specialization = IF(VALUES(specialization) != '', VALUES(specialization), specialization),
                last_activity = VALUES(last_activity);
        """
        cursor.execute(query, (session_id, name, mobile, role, specialization, now, now))
        conn.commit()
        cursor.close()
        conn.close()
        logger.info(f"User saved to MySQL: session_id={session_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving user to MySQL: {e}")
        return False


def save_therapy_log_to_db(session_id, name='', mobile='', role='', therapy_key='', therapy_title='', language=''):
    """Saves therapy interaction log to MySQL."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now()

        query = """
            INSERT INTO therapy_logs (session_id, name, mobile, role, therapy_key, therapy_title, language, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """
        cursor.execute(query, (session_id, name, mobile, role, therapy_key, therapy_title, language, now))
        conn.commit()
        cursor.close()
        conn.close()
        logger.info(f"Therapy log saved to MySQL: session_id={session_id}, therapy={therapy_key}")
        return True
    except Exception as e:
        logger.error(f"Error saving therapy log to MySQL: {e}")
        return False


def save_chat_log_to_db(session_id, role='', therapy='', language='', user_query='', bot_response=''):
    """Logs conversation interaction to MySQL."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now()

        query = """
            INSERT INTO chat_logs (session_id, role, therapy, language, user_query, bot_response, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """
        cursor.execute(query, (session_id, role, therapy, language, user_query, bot_response, now))
        conn.commit()
        cursor.close()
        conn.close()
        logger.info(f"Chat log saved to MySQL: session_id={session_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving chat log to MySQL: {e}")
        return False


def get_db_health():
    """Returns database connection status and table statistics."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM users;")
        users_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM therapy_logs;")
        therapy_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM chat_logs;")
        chat_count = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return {
            "status": "healthy",
            "database": DB_NAME,
            "host": DB_HOST,
            "port": DB_PORT,
            "counts": {
                "users": users_count,
                "therapy_logs": therapy_count,
                "chat_logs": chat_count
            }
        }
    except Exception as e:
        return {
            "status": "unavailable",
            "error": str(e),
            "database": DB_NAME,
            "host": DB_HOST
        }

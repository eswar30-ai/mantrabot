from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from groq import Groq
import httpx
import json
import csv
import os
from datetime import datetime
from dotenv import load_dotenv
import uuid
import logging
import re
from difflib import SequenceMatcher
from database import (
    init_db,
    save_user_to_db,
    save_therapy_log_to_db,
    save_chat_log_to_db,
    get_db_health
)


LANG_MSG = {
    "English": {
        "choose_therapy": "Please choose a therapy to continue.",
        "select_therapy": "Sorry, I did not understand your request.",
    },
    "Hindi": {
        "choose_therapy": "कृपया जारी रखने के लिए एक थेरेपी चुनें।",
        "select_therapy": "क्षमा करें, मैं आपकी अनुरोध को समझ नहीं पाया।",
    },
    "Telugu": {
        "choose_therapy": "దయచేసి కొనసాగడానికి ఒక థెరపీని ఎంచుకోండి.",
        "select_therapy": "క్షమించండి, మీ అభ్యర్థన నాకు అర్థం కాలేదు.",
    }
}


# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/config")
def get_config():
    return jsonify({"API_BASE_URL": os.getenv("API_BASE_URL")})


# Configure Groq
try:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not found in environment variables")
    # Disable SSL verification for corporate proxy SSL interception issues
    client = Groq(api_key=api_key, http_client=httpx.Client(verify=False))
    logger.info("Groq API configured successfully (SSL verification disabled)")
except Exception as e:
    logger.error(f"Error configuring Groq API: {e}")

# Files
CSV_FILE = 'user_data.csv'
JSON_FILE = 'quick_chips.json'
THERAPY_LOG_FILE = 'therapy_activity.csv'


# Initialize CSV
def init_csv():
    if not os.path.exists(CSV_FILE):
        with open(CSV_FILE, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(['timestamp', 'session_id', 'name', 'mobile', 'role', 'specialization', 'last_activity'])
        logger.info("CSV file initialized")


def init_therapy_log():
    if not os.path.exists(THERAPY_LOG_FILE):
        with open(THERAPY_LOG_FILE, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow([
                'timestamp',
                'session_id',
                'name',
                'mobile',
                'role',
                'therapy_key',
                'therapy_title',
                'language'
            ])


# Load data from JSON
def load_quick_data():
    try:
        if not os.path.exists(JSON_FILE):
            logger.error(f"JSON file {JSON_FILE} not found")
            return {}
        with open(JSON_FILE, 'r', encoding='utf-8') as file:
            data = json.load(file)
        logger.info("Quick chips data loaded successfully")
        return data
    except Exception as e:
        logger.error(f"Error loading quick chips data: {e}")
        return {}

# Serve static files
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

# Save user data
@app.route('/api/save-user', methods=['POST'])
def save_user():
    try:
        data = request.json or {}
        logger.info(f"Saving user data: {data}")
        if not os.path.exists(CSV_FILE):
            init_csv()

        session_id = data.get('session_id', str(uuid.uuid4()))
        name = data.get('name', '').strip()
        mobile = data.get('mobile', '').strip()
        role = data.get('role', '').strip()
        specialization = data.get('specialization', '').strip()

        # 1. Save to MySQL Database
        try:
            save_user_to_db(session_id, name, mobile, role, specialization)
        except Exception as db_err:
            logger.warning(f"Failed saving user to MySQL (CSV fallback active): {db_err}")

        # 2. Save to CSV file
        rows = []
        user_found = False
        if os.path.exists(CSV_FILE):
            with open(CSV_FILE, 'r', newline='', encoding='utf-8') as file:
                reader = csv.reader(file)
                rows = list(reader)

        for i in range(1, len(rows)):
            row = rows[i]
            if row[1] == session_id:
                rows[i] = [
                    datetime.now().isoformat(),
                    session_id,
                    name or row[2],
                    mobile or row[3],
                    role or row[4],
                    specialization or row[5],
                    datetime.now().isoformat()
                ]
                user_found = True
                break

        if not user_found:
            rows.append([
                datetime.now().isoformat(),
                session_id,
                name,
                mobile,
                role,
                specialization,
                datetime.now().isoformat()
            ])

        with open(CSV_FILE, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerows(rows)

        return jsonify({"status": "success", "message": "User data saved"})
    except Exception as e:
        logger.error(f"Error saving user data: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/log-therapy', methods=['POST'])
def log_therapy():
    try:
        data = request.json or {}

        session_id = data.get('session_id')
        therapy_key = data.get('therapy_key')
        therapy_title = data.get('therapy_title')
        role = data.get('role')
        language = data.get('language')
        name = data.get('name', '')
        mobile = data.get('mobile', '')

        if not session_id or not therapy_key:
            return jsonify({"status": "error", "message": "Missing data"}), 400

        # 1. Save to MySQL Database
        try:
            save_therapy_log_to_db(session_id, name, mobile, role, therapy_key, therapy_title, language)
        except Exception as db_err:
            logger.warning(f"Failed logging therapy to MySQL (CSV fallback active): {db_err}")

        # 2. Save to CSV file
        if not os.path.exists(THERAPY_LOG_FILE):
            init_therapy_log()

        with open(THERAPY_LOG_FILE, 'a', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow([
                datetime.now().isoformat(),
                session_id,
                name,
                mobile,
                role,
                therapy_key,
                therapy_title,
                language
            ])

        return jsonify({"status": "success"})

    except Exception as e:
        logger.error(f"Therapy log error: {e}")
        return jsonify({"status": "error"}), 500


@app.route('/api/db-health', methods=['GET'])
def db_health():
    """Endpoint to check database connection status and statistics"""
    return jsonify(get_db_health())


# Get therapies
@app.route('/api/get-therapies', methods=['POST'])
def get_therapies():
    try:
        data = request.json
        role = data.get('role', 'Consumer')
        language = data.get('language', 'English')

        quick_data = load_quick_data()
        if role not in quick_data:
            return jsonify({"therapies": []})

        therapies = []
        for key, value in quick_data[role].items():
            if isinstance(value, dict) and 'therapeutic_purpose' in value:
                ingredient = value.get('active_ingredient', key)
                purpose = value.get('therapeutic_purpose', '')
                desc_en = f"{ingredient} patch - helps manage {purpose.lower()}"
                desc_translated = translate_text(desc_en, language)
                therapies.append({
                    "key": key,
                    "title": key,
                    "description": desc_translated
                })
        return jsonify({"therapies": therapies})
    except Exception as e:
        logger.error(f"Error in get_therapies: {e}")
        return jsonify({"therapies": []})

# Get main headings
@app.route('/api/get-main-headings', methods=['POST'])
def get_main_headings():
    try:
        data = request.json
        role = data.get('role', 'Consumer')
        therapy = data.get('therapy')
        language = data.get('language', 'English')

        quick_data = load_quick_data()
        if not therapy or role not in quick_data or therapy not in quick_data[role]:
            return jsonify({"headings": []})


        headings = []
        therapy_data = quick_data[role][therapy]
        for key, value in therapy_data.items():
            if isinstance(value, dict) and 'qa_pairs' in value:
                if key in ['therapeutic_purpose', 'active_ingredient']:
                    continue
                title = translate_text(key.strip(), language)
                headings.append({
                    "key": key,
                    "title": title,
                    "question_count": len(value['qa_pairs'])
                })
        return jsonify({"headings": headings})
    except Exception as e:
        logger.error(f"Error in get_main_headings: {e}")
        return jsonify({"headings": []})

# Get questions for heading
@app.route('/api/get-all-heading-questions', methods=['POST'])
def get_all_heading_questions():
    try:
        data = request.json
        role = data.get('role', 'Consumer')
        therapy = data.get('therapy')
        heading_key = data.get('heading_key', '')
        language = data.get('language', 'English')

        quick_data = load_quick_data()
        if not therapy or role not in quick_data or therapy not in quick_data[role]:
            return jsonify({"questions": []})

        therapy_data = quick_data[role][therapy]
        actual_key = next((k for k in therapy_data.keys() if k.strip() == heading_key.strip()), None)
        if not actual_key or 'qa_pairs' not in therapy_data[actual_key]:
            return jsonify({"questions": []})

        questions = []
        for i, qa in enumerate(therapy_data[actual_key]['qa_pairs']):
            q = translate_text(qa['question'].strip(), language)
            questions.append({
                "id": i,
                "question": q,
                "original_question": qa['question']
            })
        return jsonify({"questions": questions})
    except Exception as e:
        logger.error(f"Error in get_all_heading_questions: {e}")
        return jsonify({"questions": []})

# Get rephrased answer
@app.route('/api/get-rephrased-answer', methods=['POST'])
def get_rephrased_answer():
    try:
        data = request.json
        role = data.get('role')
        therapy = data.get('therapy')
        heading_key = (data.get('heading_key') or '').strip()
        question_id = int(data.get('question_id', -1))
        language = data.get('language', 'English')

        quick_data = load_quick_data()
        if not therapy or role not in quick_data or therapy not in quick_data[role]:
            return jsonify({"answer": "Data not found"})

        if not heading_key:
            return jsonify({"answer": "Heading key not provided"})

        therapy_data = quick_data[role][therapy]
        actual_key = next((k for k in therapy_data.keys() if k.strip() == heading_key), None)
        if not actual_key or 'qa_pairs' not in therapy_data[actual_key]:
            return jsonify({"answer": "Question not found"})

        qa_pairs = therapy_data[actual_key]['qa_pairs']
        if question_id < 0 or question_id >= len(qa_pairs):
            return jsonify({"answer": "Invalid question ID"})

        original_answer = qa_pairs[question_id]['answer']
        original_question = qa_pairs[question_id]['question']
        ingredient = therapy_data.get('active_ingredient', therapy)
        purpose = therapy_data.get('therapeutic_purpose', 'health support')

        session_id = data.get('session_id', '')

        rephrased = rephrase_with_groq(
            original_answer,
            language,
            role,
            original_question,
            therapy,
            ingredient,
            purpose
        )

        # Log conversation to database
        try:
            save_chat_log_to_db(session_id, role, therapy, language, original_question, rephrased)
        except Exception as log_err:
            logger.warning(f"Failed to save rephrased answer to chat log: {log_err}")

        return jsonify({"answer": rephrased})
    except Exception as e:
        logger.error(f"Error in get_rephrased_answer: {e}")
        return jsonify({"answer": "Sorry, couldn't get the answer."})

@app.route('/api/chat-nitof', methods=['POST'])
def chat_nitof():
    try:
        data = request.json or {}
        query = (data.get('query') or '').strip()
        role = data.get('role', 'Consumer')
        language = data.get('language', 'English')
        therapy = data.get('therapy')

        if not therapy:
            msg = {
                "English": "Please select a therapy to continue.",
                "Hindi": "कृपया जारी रखने के लिए एक थेरेपी चुनें।",
                "Telugu": "దయచేసి కొనసాగడానికి ఒక థెరపీని ఎంచుకోండి."
            }
            return jsonify({"response": msg.get(language, msg["English"]), "need_therapy_selection": True})


        quick_data = load_quick_data()
        therapy_data = quick_data.get(role, {}).get(therapy)

        if not therapy_data:
            return jsonify({"response": "No data found for selected therapy."})

        # Convert therapy section to plain text pairs for GPT matching
        qa_list = []
        for heading, section in therapy_data.items():
            if isinstance(section, dict) and 'qa_pairs' in section:
                for qa in section['qa_pairs']:
                    qa_list.append({
                        "question": qa['question'],
                        "answer": qa['answer']
                    })

        system_prompt = f"""
You are Mantra Bot. A professional medical assistant for transdermal patch therapy.

The user has selected therapy: {therapy}
Allowed Data Source: ONLY the QA data provided below.
Language: {language}

Rules:
- If the question is related to this therapy, provide the exact correct answer from dataset.
- If the question refers to a different brand or therapy: reply professionally that they selected {therapy}.
- If the user asks about price, cost, MRP, rate:
  Respond: "Prices may vary by location. Please check at nearby medical stores."
  >>> Translate this message into {language}.
- If the dataset does not include the information: ask them to ask questions related to this therapy.
- DO NOT create medical claims outside dataset.
- Keep answers medically safe and short.

Dataset:
{json.dumps(qa_list, ensure_ascii=False)}
"""

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            max_tokens=300,
            temperature=0.1
        )

        # Extract Groq matched dataset answer
        matched_answer = completion.choices[0].message.content.strip()

        # STEP 1: Rephrase properly (adds <strong>, bullets, better Telugu/Hindi wording)
        rephrased = rephrase_with_groq(
            matched_answer,
            language,
            role,
            query,
            therapy,
            therapy_data.get('active_ingredient', therapy),
            therapy_data.get('therapeutic_purpose', "health support")
        )

        # STEP 2: Format (adds bullet points & bold if needed)
        formatted_reply = format_answer(rephrased, language)

        # Log conversation to database
        session_id = data.get('session_id', '')
        try:
            save_chat_log_to_db(session_id, role, therapy, language, query, formatted_reply)
        except Exception as log_err:
            logger.warning(f"Failed to save chat to database: {log_err}")

        return jsonify({"response": formatted_reply})


    except Exception as e:
        logger.error(f"Groq Processing Error: {e}")
        return jsonify({"response": "Technical issue. Try again later."})

# General chat

def word_similarity(a, b):
    """Simple token based similarity"""
    a_words = a.lower().split()
    b_words = b.lower().split()
    return sum(1 for w in a_words if w in b_words)

def fuzzy_ratio(a, b):
    """Fuzzy ratio using sequence matcher"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def smart_similarity(query, question):
    """Weighted hybrid similarity"""
    token_sim = word_similarity(query, question)
    fuzzy_sim = fuzzy_ratio(query, question)
    combined = (token_sim * 0.4) + (fuzzy_sim * 0.6 * 10)
    return combined




#     except Exception as e:
#         logger.error(f"ChatGPT Processing Error: {e}")
#         return jsonify({"response": "Technical issue. Try again later."})

    

def format_answer(answer, language):
    # 1. Translate the text properly
    translated = translate_text(answer, language)

    # Normalize spacing
    translated = translated.replace("•", "\n•")

    # Split only on NEW LINES, not on "•"
    parts = [p.strip() for p in translated.split("\n") if p.strip()]

    bullets = []

    for p in parts:

        # If the line already starts with a bullet, remove it and clean text
        if p.startswith("•"):
            p = p[1:].strip()

        # Bold only the first phrase (until Hindi full stop "।" or English ".")
        if "।" in p:
            first, rest = p.split("।", 1)
            formatted = f"• <b>{first}।</b> {rest.strip()}"
        elif "." in p:
            first, rest = p.split(".", 1)
            formatted = f"• <b>{first}.</b> {rest.strip()}"
        else:
            # If no sentence break, bold only first 3–4 words
            words = p.split()
            if len(words) > 4:
                bold_part = " ".join(words[:4])
                rest = " ".join(words[4:])
                formatted = f"• <b>{bold_part}</b> {rest}"
            else:
                formatted = f"• <b>{p}</b>"

        bullets.append(formatted)

    return "<br>".join(bullets)

# def detect_therapy_ai(text: str) -> tuple[str, float]:
#     """
#     Returns (therapy, confidence in 0..1).
#     One of: Nitof, Hetriva, Trans-D, K-Plast
#     """
#     try:
#         prompt = f"""
# You are a classifier. Map the user's message to exactly one therapy name from this list:
# - Nitof (smoking cessation / nicotine / quit smoking)
# - Hetriva (dementia / Alzheimer's / memory / cognitive)
# - Trans-D (acute pain / injury / diclofenac)
# - K-Plast (chronic pain / arthritis / ketoprofen)

# Output strictly as: THERAPY|CONFIDENCE
# Where THERAPY ∈ {{Nitof,Hetriva,Trans-D,K-Plast}} and CONFIDENCE is a number 0..1.

# User: "{text}"
# """
#         resp = client.chat.completions.create(
#             model="o3-mini",
#             messages=[{"role": "user", "content": prompt}],
#             max_tokens=20,
#             temperature=0
#         )
#         raw = resp.choices[0].message.content.strip()
#         # Expected "Hetriva|0.86"
#         if "|" in raw:
#             t, c = raw.split("|", 1)
#             t = t.strip()
#             try:
#                 c = float(c.strip())
#             except:
#                 c = 0.0
#             if t in {"Nitof", "Hetriva", "Trans-D", "K-Plast"}:
#                 return t, max(0.0, min(1.0, c))
#     except Exception as e:
#         logger.error(f"Therapy detection error: {e}")
#     # Fallback unknown
#     return "", 0.0


# @app.route('/api/detect-therapy', methods=['POST'])
# def api_detect_therapy():
#     try:
#         data = request.json or {}
#         text = data.get('text', '')
#         t, conf = detect_therapy_ai(text)
#         return jsonify({"therapy": t, "confidence": conf})
#     except Exception as e:
#         logger.error(f"/api/detect-therapy error: {e}")
#         return jsonify({"therapy": "", "confidence": 0.0}), 500


# Helper: Rephrase with Groq
def rephrase_with_groq(original_answer, language, role, question="", brand="Nitof", ingredient="", purpose=""):
    try:
        lang_prompt = {
            'Hindi': 'Always respond in Hindi only. Use Devanagari script.',
            'Telugu': 'Always respond in Telugu only. Use Telugu script.',
            'English': 'Always respond in English only.'
        }.get(language, 'Always respond in English only.')

        role_prompt = "Use medical terminology." if role == 'Doctor' else "Use simple, consumer-friendly language."

        prompt = f"""
        {lang_prompt}
        {role_prompt}
        Brand: {brand}
        Active Ingredient: {ingredient}
        Therapeutic Purpose: {purpose}

        User Question: "{question or 'General query'}"
        Context: "{original_answer}"

        Respond clearly, engagingly, and accurately.
        Rules:
        - Use <strong> tags for bold (never *)
        - Use • bullet points on new lines
        - Only respond in {language}
        - Keep it concise and helpful
        """

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.3
        )
        result = response.choices[0].message.content.strip()
        result = result.replace('*', '')
        result = result.replace('• ', '\n• ').replace('•', '\n•').replace('\n\n•', '\n•')
        result = re.sub(r'\n+', '\n', result).strip()

        return result
    except Exception as e:
        logger.error(f"Rephrase error: {e}")
        return original_answer.replace('*', '')

# Helper: Translate
def translate_text(text, language):
    if language == 'English':
        return text

    try:
        prompt = f"""
Translate the following text into natural {language}.
Do NOT leave English words like 'quitting', 'design', 'cessation'.
Use proper Hindi/Telugu equivalents.
Keep medical meaning intact.
Return only the translated text, no explanation.

Text:
{text}
"""

        response = client.chat.completions.create(
            model="qwen/qwen3.8-27B",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.0
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"Translation error: {e}")
        return text

# Initialize data stores
init_csv()
init_therapy_log()
try:
    init_db()
except Exception as e:
    logger.warning(f"Initial DB setup notice: {e}")

if __name__ == '__main__':
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting PatchMantra Assistant - Multi-Brand Version on {host}:{port}")
    app.run(host=host, port=port)

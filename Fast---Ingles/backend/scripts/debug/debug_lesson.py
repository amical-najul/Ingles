import os
import json
import csv
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def debug_one_lesson():
    load_dotenv()
    
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    host = os.getenv("POSTGRES_HOST")
    port = os.getenv("POSTGRES_PORT")
    db = os.getenv("POSTGRES_DB")
    
    db_url = f"postgresql://{user}:{password}@{host}:{port}/{db}"
    engine = create_engine(db_url)
    
    with engine.connect() as conn:
        print("Connected to DB.")
        
        # Read first row from CSV
        with open('/app/import_data/lessons_rows.csv', mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            row = next(reader) # First row
            
        print(f"Read row ID: {row.get('id')}")
        
        # Clean data similar to main script
        filtered_row = {}
        # Columns in lessons table (assumed from previous knowledge + schema)
        valid_cols = ['id', 'day_id', 'topic', 'category_id', 'level_id', 'content', 'word_count', 'ai_provider', 'ai_model', 'created_at', 'updated_at', 'category']
        # Note: 'category' column might not exist in table, need to check. 
        # But import_supabase filtered by actual cols. We will skip filtering by DB cols and just use known ones or try blindly.
        # Ideally we query DB cols first.
        try:
            cols_res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'lessons'"))
            db_cols = [r[0] for r in cols_res]
            print(f"DB Columns: {db_cols}")
        except Exception as e:
            print(f"Error getting columns: {e}")
            return

        for k, v in row.items():
            if k in db_cols:
                filtered_row[k] = v
        
        # Handle empty
        for k, v in filtered_row.items():
            if v == "" or v == "NULL":
                filtered_row[k] = None
                
        # Handle int
        for k in ['id', 'day_id', 'category_id', 'level_id', 'word_count']:
            if k in filtered_row and filtered_row[k] is not None:
                try:
                    filtered_row[k] = int(float(filtered_row[k]))
                except:
                    pass
                    
        # Handle JSON content
        if 'content' in filtered_row and filtered_row['content']:
            try:
                # FIRST decode from CSV format
                val = filtered_row['content']
                print(f"Original content (len={len(val)}): {val[:50]}...")
                parsed = json.loads(val)
                print(f"Parsed JSON type: {type(parsed)}")
                # Then DUMP for psycopg2
                filtered_row['content'] = json.dumps(parsed)
                print("Re-dumped content for DB.")
            except Exception as e:
                print(f"Error parsing JSON: {e}")
                
        # Insert
        try:
            cols = ", ".join(filtered_row.keys())
            placeholders = ", ".join([f":{k}" for k in filtered_row.keys()])
            stmt = text(f"INSERT INTO lessons ({cols}) VALUES ({placeholders})")
            
            # Check for conflict to delete first for debug
            lid = filtered_row.get('id')
            conn.execute(text("DELETE FROM lessons WHERE id = :id"), {"id": lid})
            
            conn.execute(stmt, filtered_row)
            conn.commit()
            print("Successfully inserted lesson row 1.")
        except Exception as e:
            print(f"Error inserting: {e}")
            # print full row
            print(f"Row data: {filtered_row}")

if __name__ == "__main__":
    debug_one_lesson()

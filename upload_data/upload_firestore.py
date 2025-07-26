import gspread
import firebase_admin
from firebase_admin import credentials, firestore

# --- CONFIGURATION ---
SERVICE_ACCOUNT_FILE = 'service-account.json'
SHEET_URL = 'https://docs.google.com/spreadsheets/d/14c31ak47ePW4PxBbT7-kx_ms213E96CkGo1WtL-Muck/edit?usp=sharing'
SHEET_NAME = 'Sheet1' 

print("--- Starting Stateful Firestore Upload Script ---")

# --- AUTHENTICATION ---
try:
    cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
    firebase_admin.initialize_app(cred)
    gc = gspread.service_account(filename=SERVICE_ACCOUNT_FILE)
    db = firestore.client()
    print("✓ Authentication successful.")
except Exception as e:
    print(f"🔥 Authentication failed: {e}")
    exit()

# --- DATA UPLOAD ---
try:
    spreadsheet = gc.open_by_url(SHEET_URL)
    worksheet = spreadsheet.worksheet(SHEET_NAME)
    all_data = worksheet.get_all_records()
    print(f"✓ Successfully opened worksheet: '{SHEET_NAME}'")

    processed_categories = set()
    # --- NEW: "Memory" variable to hold the last seen category ID ---
    last_category_id = None

    print("\n--- Processing Rows and Uploading to Firestore ---")
    for index, row in enumerate(all_data):
        category_name = row.get('Categories')
        nominee_name = row.get('Nominees')

        # Skip if there's no nominee name on this row
        if not nominee_name:
            continue

        # --- NEW LOGIC: Check if this row defines a new category ---
        if category_name:
            # This row has a category name, so we process it and update our memory
            category_id = category_name.lower().replace(' ', '-').replace('/', '-')
            last_category_id = category_id # Update memory
            
            # Check if we need to create the category document in Firestore
            if category_id not in processed_categories:
                print(f"  > New category found: '{category_name}'.")
                category_desc = row.get('Description', '')
                # The 'order' value is only read from rows that define a new category
                category_order = int(row.get('order') or 0) 
                
                category_doc_data = {
                    'title': category_name,
                    'description': category_desc,
                    'order': category_order
                }
                db.collection('categories').document(category_id).set(category_doc_data)
                processed_categories.add(category_id)
                print(f"    ✓ Created category document: {category_id}")
        
        # If we have a category in memory, add the nominee
        if last_category_id:
            print(f"  > Adding nominee '{nominee_name}' to category '{last_category_id}'...")
            image_url = row.get('imageUrl', '')
            nominee_doc_data = {
                'name': nominee_name,
                'imageUrl': image_url,
                'votes': 0
            }
            db.collection('categories').document(last_category_id).collection('nominees').add(nominee_doc_data)
            print(f"    ✓ Added nominee.")
        else:
            print(f"  - Skipping nominee '{nominee_name}' because no category has been defined yet.")

    print("\n--- ✅ Script finished successfully! ---")

except Exception as e:
    print(f"🔥 An error occurred during the upload process: {e}")
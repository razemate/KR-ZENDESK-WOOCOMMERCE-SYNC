I will fix the font size issue by strictly increasing the current font sizes by 1px (from 11px to 12px) as requested.

### 1. Update Styles
- **File:** `assets/app-styles.css`
- **Action:** Change all instances of `font-size: 11px` to `font-size: 12px`.
  - This affects the body, titles, rows, labels, values, buttons, and links.

### 2. Force Cache Update
- **File:** `assets/iframe.html`
- **Action:** Update the script version from `v=15` to `v=16`.
  - This ensures the browser loads the new CSS immediately.

### 3. Package for Upload
- **Action:** Create `UPLOAD_READY/KR_Zendesk_Woo_App_v16.zip`.
- **Contents:** `manifest.json`, `assets/`, and `translations/`.

# UPLOAD_AND_TESTING.md — Zendesk Upload & Validation (Authoritative)

This file defines EXACTLY how the Zendesk private app is tested and uploaded.
Follow these steps in order. Do not skip steps.

## 1. Prepare Zendesk App Folder
The ZIP uploaded to Zendesk MUST contain ONLY:

- manifest.json
- assets/
  - iframe.html
  - main.js (optional)
  - styles.css (optional)
  - logo.png (128x128 PNG)
  - logo-small.png (64x64 PNG)
- translations/en.json

NO node_modules  
NO markdown files  
NO build tools  

## 2. Validate Locally (REQUIRED)
Install Zendesk CLI once:

npm install -g @zendesk/zcli

Run validation:

zcli apps:validate /path/to/zendesk-app

Validation MUST pass with zero errors.

## 3. Local Testing
Serve the app locally:

zcli apps:server /path/to/zendesk-app

Open any Zendesk ticket and append:

?zcli_apps=true

Verify:
- App loads in ticket sidebar
- No console errors
- Secure parameter api_endpoint is available

## 4. Upload as Private App
Zendesk Admin Center →
Apps & Integrations →
Zendesk Support Apps →
Upload Private App

Upload the ZIP file.

## 5. Post-Install Checks
- Configure secure setting: api_endpoint
- Open an existing ticket
- Verify Woo data renders correctly
- Verify Refresh button works
- Verify error states render safely

## Common Failures
- Missing logo files → Upload rejected
- Wrong filename (MANIFEST.md instead of manifest.json) → Upload rejected
- Raw fetch() usage → App fails silently
- Non-secure parameters → Data blocked

This process is FINAL.

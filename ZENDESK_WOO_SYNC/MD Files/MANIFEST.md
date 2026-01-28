# MANIFEST.md — Zendesk Private App Manifest (AUTHORITATIVE REFERENCE)

IMPORTANT:
- This file is a REFERENCE for the AI builder.
- When building the actual Zendesk app ZIP, this content MUST be saved as:
  manifest.json
- Zendesk WILL REJECT the app if the file is not named exactly manifest.json.

------------------------------------------------------------
FINAL manifest.json CONTENT (DO NOT MODIFY STRUCTURE)
------------------------------------------------------------

{
  "name": "Woo Subscription Viewer",
  "author": {
    "name": "KR",
    "email": "support@katusaresearch.com"
  },
  "version": "1.0.0",
  "frameworkVersion": "2.0",
  "defaultLocale": "en",
  "location": {
    "support": {
      "ticket_sidebar": {
        "url": "assets/iframe.html",
        "flexible": true,
        "size": {
          "height": "400px"
        }
      }
    }
  },
  "parameters": [
    {
      "name": "api_endpoint",
      "type": "url",
      "secure": true,
      "required": true
    }
  ]
}

------------------------------------------------------------
MANDATORY RULES
------------------------------------------------------------
- frameworkVersion MUST be exactly \"2.0\"
- location MUST be support.ticket_sidebar
- iframe.html is REQUIRED and must exist in /assets
- API keys must NEVER be hardcoded
- Only secure parameters may be used for endpoints/secrets
- This manifest is FINAL and AUTHORITATIVE

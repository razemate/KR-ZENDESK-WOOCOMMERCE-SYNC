I will proceed with integrating the AI Assistant into the main Zendesk app and restructuring the project as requested.

### **1. Rename & Organize**
*   **Rename** the `AI_HELPER` folder to `AI_ASSISTANT` to reflect the new naming convention.

### **2. Backend Updates (`AI_ASSISTANT/backend/api/ai-reply.js`)**
*   **Update API**: Modify the backend handler to accept a `customInstruction` parameter in the request body.
*   **Prompt Logic**: Append the user's custom instructions to the prompt sent to OpenAI, allowing for tailored responses.

### **3. Frontend Layout (`ZENDESK_WOO_SYNC/assets/iframe.html`)**
*   **Remove Tabs**: Switch from a tabbed interface to a vertical layout.
*   **Woo Sync Section**: Keep the existing "Woo Info" section at the top (`<div id="app">`).
*   **AI Assistant Section**: Add a new section **below** the Woo Sync info containing:
    *   **Header**: "AI Assistant" title with a **Settings** link (toggles a settings panel).
    *   **Settings Panel**: A hidden/collapsible area for future configuration (e.g., tone, model).
    *   **Input**: A text area labeled **"Custom Instruction (Optional)"**.
    *   **Action**: A primary button **"Generate Draft Reply"**.
    *   **Output**: A result area to display and insert the generated draft.

### **4. Frontend Logic (`ZENDESK_WOO_SYNC/assets/main.js`)**
*   **Integrate Logic**: Merge the AI handling code from the helper into the main app's logic.
*   **Custom Instructions**: Capture the text from the new input field and send it to the backend.
*   **Settings Toggle**: Implement simple logic to show/hide the Settings panel.
*   **Styles**: Update `app-styles.css` to ensure the new section looks clean and distinct (using a separator like `<hr>` or a card style).

This approach unifies the tools into a single, efficient sidebar app with the requested layout.
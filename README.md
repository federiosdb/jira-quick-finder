# Jira Quick Finder

![Jira Quick Finder](/src/images/logo-wallpaper.png)

---

## 🧩 Overview

**Jira Quick Finder** is a lightweight browser extension (for **Chrome** and **Edge**) designed to **instantly open Jira issues across multiple Jira instances** using a simple key like `JAG-6660`.

It helps teams working with several Jira servers (clients, environments, or projects) jump directly to the right issue — without needing to remember multiple URLs or logins.

---

## 🚀 Features (v1.0.14)

### 🔍 Fast Issue Lookup
- Enter any Jira issue key (e.g., `JAG-6660`) to open it instantly.
- Supports **multiple keys separated by commas** → opens all in new tabs.  
  Example: `JAG-6660,JAG-6661`
- Search history: This feature helps to find all the previous log of your search.
  - Access it via the new "History" tab.
  - View your last 20 unique Jira issues searched.
  - Delete individual entries or clear the entire history.
  - Download the search history as CSV
- Omnibox support (`jira JAG-1234` from address bar).
- Ping and notes feature for Jira issues on History page.
- Alarms feature for Jira issues on History page.
- Smart key mapping (e.g., `JAG-1234` opens the Jira configured for `JAG`).
- Theme support (Dark/Light).
- Export/Import configuration profiles.
- Full architecture review.

### ⚙️ Configurable Jira Instances
- In the **Options page**, define multiple **prefix → base URL** pairs.  
  Example:  
  - `JAG` → `https://yoururl.client.com/browse/`
  - `ABC` → `https://mycompanyjira.atlassian.net/browse/`
- Add unlimited Jira configurations.
- Data is safely stored using Chrome’s `sync` storage (shared across your signed-in browsers).

### 🧠 Smart Key Mapping
- Automatically detects the **prefix before the dash** (`-`) to match the correct Jira URL.
- Example: `JAG-1234` opens the Jira configured for `JAG`.

### ⚡ Keyboard Shortcuts
Two productivity boosters are built-in:
- **Alt + J** → Open the extension popup.
- **Ctrl + Shift + J** → Instantly open issues from the clipboard text.

> Example: copy “JAG-9999” and press **Alt+Shift+J** → the issue opens directly!

### 🧰 Clean & Responsive UI
- Modern look with dark text and clean layout.
- Buttons with icons for quick recognition:
  - ➕ **Add**
  - 💾 **Save**
  - ❌ **Close Tab**

### 🪟 Popup Convenience
- Accessed from the Jira Quick Finder icon in the browser toolbar.
- Input field auto-focused on open.
- Press **Enter** to trigger search (same as clicking “Send”).
- Includes quick access to the configuration page.

### 🧹 Compliant with Chrome MV3 CSP
- No inline JavaScript.
- Background service worker for commands.
- Fully compatible with Edge Chromium.

---

## 🧭 Installation Guide

### 🔹 For Google Chrome
1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the project folder.
5. Pin the Jira Quick Finder icon to your toolbar for quick access.

### 🔹 For Microsoft Edge
1. Open Edge and go to `edge://extensions/`.
2. Enable **Developer mode** (bottom left).
3. Click **Load unpacked** and select the same project folder.
4. Pin the Jira Quick Finder icon to your toolbar.

> 💡 After installation, click the **Jira Quick Finder logo** → configure your Jira prefixes and URLs, and you’re ready to go!

---

## 🧑‍💻 File Structure

```
jira-quick-finder/
├── css/
    └── styles.css
├── icons/
    ├── picture.png
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    ├── icon128.png
    ├── icon256.png
    └── icon512.png
├── images
    ├── logo-wallpaper.png
    ├── logo.png
    └── picture.png
├── js/
    ├── history
        └── history.js
    ├── background.js
    ├── content_script.js
    ├── news.js
    ├── options.js
    ├── popup.js
    └── theme.js
├── pages
    ├── history.html
    ├── news.html
    ├── options.html
    └── popup.html
└── .gitignore
└── LICENSE
└── manifest.json
└── README.md

```

---

## 🧭 Example Configuration

| Project | Key | Jira Base URL |
| --------|-----|----------------|
| ProjectJAG | JAG | https://yoururl.client.com/browse/ |
| ProjectAbc | ABC | https://mycompanyjira.atlassian.net/browse/ |

When searching for:
```
JAG-6660, ABC-1001
```
→ Two new tabs will open with each issue in the correct Jira.

---

## 🏁 Future Improvements (Planned)
- Issue preview (summary/status via Jira API).
- Import/export configuration profiles.
- Option to open issues in background tabs.

---

## ✨ Version  updated status (v1.0.14)
- **Version updated with calm**:
  - Full architecture review.

---

## 📬 Contact

For questions, improvements, or support, please contact:  
**Fede Ríos**  
_Project Manager | Scrum Master | Delivery Manager | Full Stack_  

---

© 2025 All rights reserved.

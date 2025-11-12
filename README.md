# NTT DATA – Jira Quick Finder

![NTT DATA – Jira Quick Finder](icons/picture.png)

---

## 🧩 Overview

**NTT DATA – Jira Quick Finder** is a lightweight browser extension (for **Chrome** and **Edge**) designed to **instantly open Jira issues across multiple Jira instances** using a simple key like `MAG-6660`.

It helps teams working with several Jira servers (clients, environments, or projects) jump directly to the right issue — without needing to remember multiple URLs or logins.

---

## 🚀 Features (v1.0.3)

### 🔍 Fast Issue Lookup
- Enter any Jira issue key (e.g., `MAG-6660`) to open it instantly.
- Supports **multiple keys separated by commas** → opens all in new tabs.  
  Example: `MAG-6660,MAG-6661`

### ⚙️ Configurable Jira Instances
- In the **Options page**, define multiple **prefix → base URL** pairs.  
  Example:  
  - `MAG` → `https://portail.agir.client.com/browse/`
  - `ABC` → `https://mycompanyjira.atlassian.net/browse/`
- Add unlimited Jira configurations.
- Data is safely stored using Chrome’s `sync` storage (shared across your signed-in browsers).

### 🧠 Smart Key Mapping
- Automatically detects the **prefix before the dash** (`-`) to match the correct Jira URL.
- Example: `MAG-1234` opens the Jira configured for `MAG`.

### ⚡ Keyboard Shortcuts
Two productivity boosters are built-in:
- **Alt + J** → Open the extension popup.
- **Alt + Shift + J** → Instantly open issues from the clipboard text.

> Example: copy “MAG-9999” and press **Alt+Shift+J** → the issue opens directly!

### 🧰 Clean & Responsive UI
- Modern NTT DATA look with dark text and clean layout.
- Buttons with icons for quick recognition:
  - ➕ **Add**
  - 💾 **Save**
  - ❌ **Close Tab**

### 🪟 Popup Convenience
- Accessed from the NTT DATA icon in the browser toolbar.
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
5. Pin the NTT DATA icon to your toolbar for quick access.

### 🔹 For Microsoft Edge
1. Open Edge and go to `edge://extensions/`.
2. Enable **Developer mode** (bottom left).
3. Click **Load unpacked** and select the same project folder.
4. Pin the NTT DATA icon to your toolbar.

> 💡 After installation, click the **NTT DATA logo** → configure your Jira prefixes and URLs, and you’re ready to go!

---

## 🧑‍💻 File Structure

```
ntt-jira-finder/
├── manifest.json
├── popup.html
├── popup.js
├── options.html
├── options.js
├── background.js
├── styles.css
└── icons/
    ├── picture.png     ← Main cover image
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 🧭 Example Configuration

| Key | Jira Base URL |
|-----|----------------|
| MAG | https://portail.agir.client.com/browse/ |
| ABC | https://mycompanyjira.atlassian.net/browse/ |

When searching for:
```
MAG-6660, ABC-1001
```
→ Two new tabs will open with each issue in the correct Jira.

---

## 🏁 Future Improvements (Planned)
- Context menu integration (“Open selection in Jira”).
- Omnibox support (`jir MAG-1234` from address bar).
- Issue preview (summary/status via Jira API).
- Import/export configuration profiles.
- Option to open issues in background tabs.

---

## 📬 Contact

For questions, improvements, or support, please contact:  
**Fede Ríos – NTT DATA**  
_Project Manager | Scrum Master | Delivery Manager_  

---

© 2025 NTT DATA – All rights reserved.

>**Important update:** If you're upgrading from an older version, disable your PIN before upgrading. Running the new version with a PIN still enabled will cause data to fail to load, and you'll have to manually fix the settings table in the database. If you're new here, no action needed. Please look into the release page for more information.

# Journaling Web App

### Why Another Journaling App? Right?

Honestly, I'm not sure either. I tried a bunch of journaling apps, but I always felt pressured to write regularly. Every app seems obsessed with returning users, streaks, and push notifications. Eventually, I had enough. That's when I switched completely to Obsidian, and I loved it. I still do. But something always felt missing.

Don't get me wrong. Obsidian is an incredible tool with unmatched customization options. Still, I wanted something more personal. So I decided to design the kind of app I had in my mind. I explored the journaling and tracking app space and came up with a simple concept. But back then, I was still just a designer. I couldn't bring it to life. I even thought of open-sourcing the design, but the pressure to organize it all made me postpone it… and two years just slipped by.

Then large language models started getting really capable, and in just one day, I managed to build the skeleton of this platform. Android still feels too heavy, so I went with a simple web app. It's built entirely for personal use, exactly how I imagined it. But then I thought, why not share it with others? So here I am.

This app is a local-first, private journaling tool designed for personal use only. All your data is stored in a local database (`better-sqlite3`) inside the project directory. Individual journals and letters can be exported as `.md` (Markdown) files, but the main application data stays within the local database. Nothing is ever sent to or stored on any remote server. Your thoughts remain entirely private on your device. The goal of this project is to provide a simple, fast, and customizable journaling experience. By keeping everything local, you have full ownership and control over your data.

Oh and another thing. Since you have full database access, you can just create your own version of a journaling app. You are not tied to this UI. This is the freedom of choice. You don't need to deploy or host anything. Everything runs on your own computer. Just start the app with a script. It's simple as that.

> To prevent data corruption and data loss, please back up your database occasionally and save it in a secure location, cloud or local - your choice. Your data, your responsibility.

#### Disclaimer
I'm a designer who had an idea and used LLMs to bring it to life. This is a completely vibe-coded app, which means the code was built iteratively through prompting (thanks to Google AI, Claude, DeepSeek, and others). Since I've built multiple projects this way, I know what to expect, what not to expect, and what to change when something goes wrong or when to just restart things. I tested this in multiple ways and even used it for a few months. No issues found so far. If you encounter a bug, the best course of action is to review the code (using any LLM or by yourself) or restart the application. If you suspect data corruption, you can inspect the `journal.db` file in the `storage` folder using any DB browser. As a last resort, deleting the `journal.db` file will reset the application to a clean state but all journal entries will be lost.



## Core Philosophy
The whole point of this project is **data ownership and privacy**.
*   **100% Local:** All data, including journal entries, follow ups, letters, tags, and settings, is stored in a single database file on your computer. Nothing is ever sent to a remote server or the cloud.
*   **Offline First:** The application works perfectly without an internet connection.
*   **Full Control:** You have direct access to your data file and can back it up, move it, or inspect it as you see fit. Use any DB browser.
## Getting Started

Follow these steps to get the application running on your local machine.
### Prerequisites
*   **Node.js:** Make sure you have a recent version of Node.js installed (v22.x or later is recommended). You can download it from [nodejs.org](https://nodejs.org/).
*   **npm:** This is included with Node.js.  

### Installation & Setup
  
1.  **Clone the Repository**: Open your terminal, navigate to where you want to store the project, and run:
    ```
    git clone https://github.com/romiojoseph/journal.git
    ```

2.  **Navigate into the Project**
    ```
    cd journal
    ```

3.  **Install Dependencies**: This will install Next.js and all the required libraries for the application to run.

    ```
    npm install
    ```

    Before starting the project, take a look at the JSON files in the **data** folder, you can edit them to suit your needs. There’s a UI for managing all tags.

    All these tags are created with help from **Claude** based on a detailed prompt.

4.  **Run the Development Server**: This will start the application. The first time you run this, it will automatically create the necessary `storage` folder and `journal.db` database file.

    ```
    npm run dev
    ```

    Or, just build and start for speed. You can also use the included .bat script. Add it to your system’s environment variables, open a terminal, and just run `diary`. It's simple as that!

    ```
    npm run build 

    npm run start
    ```

    The app is configured to run on port 2048 (see `package.json` scripts).

5.  **Open the App**: Open your web browser and go to **http://127.0.0.1:2048**. You should be greeted by the welcome message on your first visit.

## How It Works: Key Concepts

### The Database

**This is the most important part of the application.** Please make sure this file is in the `gitignore`.

*   All of your journal entries, tags, follow-ups, and letters are stored in a single file located at:

    ```
    /storage/journal.db
    ```

*   **This file is your journal.** It is critical that you back up this file regularly to prevent data loss. If you move the project to a new computer, you must move this file along with it.
*   Deleting this file will completely reset the application to a fresh start.

### Tag Management
Tags are stored and read from the database (`/storage/journal.db`) in the `tags` table.

The `/data/*.json` files are still supported as a convenient “seed + bulk edit” source:
* On startup, the app syncs tags from `/data` into the database (insert/update, no duplicates).

Mood `type` values used across the app:
* `mood`
* `activity`
* `people`
* `place`



### Security PIN

The application uses a multi-layered security model:

*   **PIN Storage:** When you enable a PIN, it is hashed using **Argon2** (memory-hard, GPU/ASIC-resistant) and stored in the `journal.db` database.
*   **Key Derivation:** The encryption key is derived from your passphrase using **PBKDF2-HMAC-SHA256** (100,000 iterations, 32-byte salt).
*   **Data Encryption:** All sensitive data (journal entries, follow-ups, letters, drafts) is encrypted using **AES-256-GCM** (authenticated encryption with IV + auth tag). The Node.js built-in `crypto` module (OpenSSL-backed) handles all cryptographic operations.
*   **Session Management:**
    *   `SessionGuard.jsx` performs periodic client-side session checks.
    *   `/api/check-session` validates your session server-side every 10 seconds.
    *   `/api/extend-session` allows you to extend your vault session (5/10/15/30 minutes).
    *   `VaultTimer.jsx` displays a live countdown of your remaining session time with quick extend/lock controls.
*   **There is no "Forgot PIN" feature.** If you lose your PIN, you will not be able to access your journals or letters. You can verify this in both states using any DB browser.


## Project Structure
A brief overview of the key directories in this project:

```
/app/                # All pages and API routes (Next.js App Router)

/components/         # All reusable React components

/context/            # Global React contexts (e.g., for modals, fonts)

/data/               # JSON files that define the available tags

/lib/                # Core library files, most importantly the database connection (db.js)

/public/             # Static assets, including the locally hosted fonts

/sql/                # All .sql files, keeping queries separate from application logic

/storage/            # The most important folder; contains your journal.db file

/styles/             # All CSS Modules and global stylesheets
```

## Recent Dev Notes



## Core Technologies

*   **Framework:** Next.js (latest with Turbopack)
*   **Language:** JavaScript
*   **Database:** `better-sqlite3` (a local, file-based SQLite database)
- **Encryption:**
  - **PIN Hashing:** Argon2 (memory-hard, GPU/ASIC-resistant)
  - **Key Derivation:** PBKDF2-HMAC-SHA256 (100K iterations, 32-byte salt)
  - **Data Encryption:** AES-256-GCM (authenticated encryption with auth tag)
  - **Crypto Module:** Node.js built-in `crypto` (OpenSSL-backed)
*   **Styling:** Vanilla CSS with CSS Modules
### Libraries
*   **UI & Icons:**: `react`, `react-dom` & `@phosphor-icons/react`

*   **Data Visualization (Nivo):**: `@nivo/core`, `@nivo/bar`, `@nivo/calendar`, `@nivo/line`, `@nivo/radar`, `@nivo/sunburst`, `@nivo/treemap`

*   **UI Components:**: `react-datepicker`, `react-select`

*   **Linting:**: `eslint`, `eslint-config-next`
### Fonts
All fonts are downloaded from **Google Fonts** and self-hosted locally from the `/public/fonts` directory to ensure privacy and offline availability.

*   **Google Sans** (Sans-Serif, Default)
*   **JetBrains Mono** (Monospace)
*   **Google Sans Code** (Monospace)

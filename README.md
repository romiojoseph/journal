# Journaling Web App

### Why another journaling app? Right?

Honestly, I'm not sure either. I tried a bunch of journaling apps, but I always felt pressured to write regularly. Every app seems obsessed with returning users, streaks, and push notifications. Eventually, I had enough. That's when I switched completely to Obsidian, and I loved it. I still do. But something always felt missing.

Don't get me wrong. Obsidian is an incredible tool with unmatched customization options. Still, I wanted something more personal. So I decided to design the kind of app I had in mind. I explored the journaling and tracking app space and came up with a simple concept. But back then, I was still just a designer. I couldn't bring it to life. I even thought of open-sourcing the design, but the pressure to organize it all made me postpone it… and two years just slipped by.

Then large language models started getting really capable, and in just one day, I managed to build the skeleton of this platform. Android still feels too heavy, so I went with a simple web app. It's built entirely for my personal use, exactly how I imagined it. But then I thought, why not share it with others? So here I am.

This app is a local-first, private journaling tool designed for personal use only. All your data is stored in a local database (`better-sqlite3`) inside the project directory. Individual journals can be exported as `.md` (Markdown) files, but the main application data stays within the local database. Nothing is ever sent to or stored on any remote server. Your thoughts remain entirely private on your device.

The goal of this project is to provide a simple and fast journaling experience that generates insights as time goes by. By keeping everything local, you have full ownership and control over your data.

Oh and another thing. Since you have full database access, you can just create your own version of a journaling app. You are not tied to this UI. This is the freedom of choice. You don't need to deploy or host anything. Everything runs on your own computer. Just start the app with a script. It's simple as that.

> To prevent data corruption and data loss, please back up your database occasionally and save it in a secure location, cloud or local - your choice. Your data, your responsibility.

#### Disclaimer
This is a completely vibe-coded app, which means I have no idea how the code is written (Thanks to Google AI Studio, Claude and DeepSeek). But since I've built multiple projects this way, I know what to expect, what not to expect, and what to change when something goes wrong or when to restart things. I tested this in multiple ways and even used it for a week. No issues found so far. So, if you encounter a bug, the best course of action is to review the code (Use any LLM or by yourself) or restart the application. If you suspect data corruption, you can inspect the `journal.db` file in the `storage` folder using any DB browser. As a last resort, deleting the `journal.db` file will reset the application to a clean state (all journal entries will be lost).

## Core Philosophy
The whole point of this project is **data ownership and privacy**.
*   **100% Local:** All data, including journal entries, tags, and settings, is stored in a single database file on your computer. Nothing is ever sent to a remote server or the cloud.
*   **Offline First:** The application works perfectly without an internet connection.
*   **Full Control:** You have direct access to your data file and can back it up, move it, or inspect it as you see fit. Use any DB browser.
## Getting Started

Follow these steps to get the application running on your local machine.
### Prerequisites
*   **Node.js:** Make sure you have a recent version of Node.js installed (v20.x or later is recommended). You can download it from [nodejs.org](https://nodejs.org/).
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

    Before starting the project, take a look at the JSON files in the **data** folder, you can edit them to suit your needs. There’s a UI element for creating all tags **except moods**.
    
    Mood tags can be **edited or deleted** through the UI, but **new ones must be created in the JSON**.  
    This setup helps prevent adding arbitrary or unnecessary moods.

    Any updates made through the UI will automatically sync to both the JSON files and the database.  
    So, configure things the way you prefer before continuing or just stick with the defaults.  
    All these tags are created with help from **Claude** based on a detailed prompt.

4.  **Run the Development Server**: This will start the application. The first time you run this, it will automatically create the necessary `storage` folder and `journal.db` database file.

    ```
    npm run dev
    ```

    Or, just build and start for speed. You can also use the included script. Add it to your system’s environment variables, open a terminal, and just run `diary`. It's simple as that!

    ```
    npm run build 

    npm run start
    ```

    I configured the startup to use port 2468 with: `"start": "next start -p 2468"`

5.  **Open the App**: Open your web browser and go to **http://localhost:2468**. You should be greeted by the welcome message on your first visit.

## How It Works: Key Concepts

### The Database: Your Entire Journal  

**This is the most important part of the application.** Please make sure this file is in the `gitignore`.

*   All of your journal entries, tags, follow-ups, and PIN are stored in a single file located at:

    ```
    /storage/journal.db
    ```

*   **This file is your journal.** It is critical that you back up this file regularly to prevent data loss. If you move the project to a new computer, you must move this file along with it.
*   Deleting this file will completely reset the application to a fresh start.

### Tag Management
The application's tagging system is highly flexible and is controlled by a set of JSON files located in the `/data` folder. You can edit these files directly or use the "Tag Management" interface in the `Config` tab to customize all your available tags.

### Security PIN
The application uses a server-side security model via a `proxy.js` file.
*   When you enable a PIN, a hashed version is stored in the `journal.db` database.
*   The proxy intercepts every request. If a PIN is enabled and you don't have a valid session cookie, it will force a redirect to the `/access-vault` page, making the main app inaccessible.
*   **There is no "Forgot PIN" feature.** If you lose your PIN, you will not be able to access your journal through the app. The only recovery method would be to manually inspect the `journal.db`  file using any DB browser tool or delete it and start over. **Keep your PIN safe.** It’s only used to block access to your data through the UI.

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

## Core Technologies

*   **Framework:** Next.js (latest with Turbopack)
*   **Language:** JavaScript
*   **Database:** `better-sqlite3` (a local, file-based SQLite database)
*   **Styling:** Vanilla CSS with CSS Modules
### Libraries
*   **UI & Icons:**: `react`, `react-dom` & `@phosphor-icons/react`

*   **Data Visualization (Nivo):**: `@nivo/core`, `@nivo/bar`, `@nivo/calendar`, `@nivo/line`, `@nivo/radar`, `@nivo/sunburst`, `@nivo/treemap`

*   **UI Components:**: `react-datepicker`, `react-select`

*   **Linting:**: `eslint`, `eslint-config-next`
### Fonts
All fonts are downloaded from **Google Fonts** and self-hosted locally from the `/public/fonts` directory to ensure privacy and offline availability.

*   **Inter** (Sans-Serif, Default)
*   **Lora** (Serif)
*   **JetBrains Mono** (Monospace)
*   **Google Sans Code** (Monospace)
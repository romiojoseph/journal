'use client';

import styles from '../../../styles/AboutPage.module.css';
import FontSelector from '../../../components/FontSelector';
import Image from "next/image";

export default function AboutPage() {
    return (
        <div className={styles.container}>
            <FontSelector />
            <Image
                src="/favicon.svg"
                alt="App icon"
                width={64}
                height={64}
                className={styles.appIcon}
                priority
            />
            <h2>Why another journaling app?</h2>
            <p>
                Honestly, I&apos;m not sure either. I tried a bunch of journaling apps, but I always felt pressured to write regularly. Every app seems obsessed with returning users, streaks, and push notifications. Eventually, I had enough. That&apos;s when I switched completely to Obsidian, and I loved it. I still do. But something always felt missing.
            </p>
            <p>
                Don&apos;t get me wrong. Obsidian is an incredible tool with unmatched customization options. Still, I wanted something more personal. So I decided to design the kind of app I had in mind. I explored the journaling and tracking app space and came up with a simple concept. But back then, I was still just a designer. I couldn&apos;t bring it to life. I even thought of open-sourcing the design, but the pressure to organize it all made me postpone it… and two years just slipped by.
            </p>
            <p>
                Then large language models started getting really capable, and in just one day, I managed to build the skeleton of this platform. Android still feels too heavy, so I went with a simple web app. It&apos;s built entirely for my personal use, exactly how I imagined it. But then I thought, why not share it with others? So here I am.
            </p>
            <p>
                This app is a local-first, private journaling tool designed for personal use only. All your data is stored in a local database (<code>better-sqlite3</code>) inside the project directory. Individual journals can be exported as <code>.md</code> (Markdown) files, but the main application data stays within the local database. Nothing is ever sent to or stored on any remote server. Your thoughts remain entirely private on your device.
            </p>

            <p>
                The goal of this project is to provide a simple, fast, and customizable journaling experience. By keeping everything local, you have full ownership and control over your data.
            </p>
            <p>Oh and another thing. Since you have full database access, you can just create your own version of a journaling app. You are not tied to this UI. This is the freedom of choice. You don&apos;t need to deploy or host anything. Everything runs on your own computer. Just start the app with a script. It&apos;s simple as that.</p>

            <blockquote>To prevent data corruption and data loss, please back up your database occasionally and save it in a secure location, cloud or local - your choice. Your data, your responsibility.</blockquote>

            <h3>Technology Stack</h3>
            <ul>
                <li><strong>Framework:</strong> Next.js (App Router)</li>
                <li><strong>Language:</strong> JavaScript</li>
                <li><strong>Styling:</strong> Vanilla CSS Modules</li>
                <li><strong>Database:</strong> better-sqlite3 (Local file-based)</li>
                <li><strong>Icons:</strong> Phosphor Icons</li>
                <li><strong>Charts:</strong> Nivo</li>
            </ul>

            <h3>Disclaimer</h3>
            <p>
                This is a completely vibe-coded app, which means I have no idea how the code is written (Thanks to Google AI Studio, Claude and DeepSeek). But since I&apos;ve built multiple projects this way, I know what to expect, what not to expect, and what to change when something goes wrong or when to restart things. I tested this in multiple ways and even used it for a week. No issues found so far. So, if you encounter a bug, the best course of action is to review the code (Use any LLM or by yourself) or restart the application. If you suspect data corruption, you can inspect the `journal.db` file in the `storage` folder using any DB browser. As a last resort, deleting the `journal.db` file will reset the application to a clean state (all journal entries will be lost).
            </p>
        </div>
    );
}
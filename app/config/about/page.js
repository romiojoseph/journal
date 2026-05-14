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
                Don&apos;t get me wrong. Obsidian is an incredible tool with unmatched customization options. Still, I wanted something more personal. So I decided to design the kind of app I had in my mind. I explored the journaling and tracking app space and came up with a simple concept. But back then, I was still just a designer. I couldn&apos;t bring it to life. I even thought of open-sourcing the design, but the pressure to organize it all made me postpone it… and two years just slipped by.
            </p>
            <p>
                Then large language models started getting really capable, and in just one day, I managed to build the skeleton of this platform. Android still feels too heavy, so I went with a simple web app. It&apos;s built entirely for personal use, exactly how I imagined it. But then I thought, why not share it with others? So here I am.
            </p>
            <p>
                This app is a local-first, private journaling tool designed for personal use only. All your data is stored in a local database (<code>better-sqlite3</code>) inside the project directory. Individual journals and letters can be exported as <code>.md</code> (Markdown) files, but the main application data stays within the local database. Nothing is ever sent to or stored on any remote server. Your thoughts remain entirely private on your device. The goal of this project is to provide a simple, fast, and customizable journaling experience. By keeping everything local, you have full ownership and control over your data.
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
                <li><strong>Encryption:</strong>
                    <ul>
                        <li><strong>PIN Hashing:</strong> Argon2 (memory-hard, GPU/ASIC-resistant)</li>
                        <li><strong>Key Derivation:</strong> PBKDF2-HMAC-SHA256 (100K iterations, 32-byte salt)</li>
                        <li><strong>Data Encryption:</strong> AES-256-GCM (authenticated encryption)</li>
                        <li><strong>Crypto Module:</strong> Node.js built-in <code>crypto</code> (OpenSSL-backed)</li>
                    </ul>
                </li>
            </ul>

            <h3>Disclaimer</h3>
            <p>
                I'm a designer who had an idea and used LLMs to bring it to life. This is a completely vibe-coded app,  which means the code was built iteratively through prompting (thanks to Google AI, Claude, DeepSeek, and others). Since I&apos;ve built multiple projects this way, I know what to expect, what not to expect, and what to change when something goes wrong or when to just restart things. I tested this in multiple ways and even used it for a few months. No issues found so far. If you encounter a bug, the best course of action is to review the code (using any LLM or by yourself) or restart the application. If you suspect data corruption, you can inspect the <code>journal.db</code> file in the <code>storage</code> folder using any DB browser. As a last resort, deleting the <code>journal.db</code> file will reset the application to a clean state but all journal entries will be lost.
            </p>

            <h3>Release</h3>
            <p>You can install it as PWA.</p>
            <p><strong>0.1.0</strong>: Shared the first public version on <a href='https://github.com/romiojoseph/journal/tree/183554f9a85e6d97eb9d851bc004cd63cc305acb' target="_blank" rel="noopener noreferrer">4th December 2025</a>. I used it regularly since then and noticed a few issues and other things I wanted to improve.</p>
            <p><strong>2.0.0</strong>: Current version. A lot has changed, including layouts, and I&apos;ve added a feature to write letters. I noticed there&apos;s demand for this kind of features, browsing forums made one thing clear: people like writing letters to get things off their mind and reflect on them. I also changed PIN-based security to passphrase-based encryption to make the application more secure and private. If you plan to upgrade, please take a backup of your db. I have tried my best to not mess up, but things can go wrong.</p>
        </div>
    );
}
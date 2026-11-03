<p align="center">
  <img src="assets/wordmark.svg" alt="Pebble — plan calmly" width="320">
</p>

**Pebble** is a calm, minimal study planner for students. Plan your week, get a heads-up about tomorrow, focus in timed sessions, learn with flashcards, and take a breather when it gets busy.

It is just HTML, CSS and JavaScript. There is no server, no account and no build step. Everything a student adds is saved privately in their own browser.

## Features

- **Sign in / create account**: each student gets their own username and password, and their own separate planner. Passwords are never stored, only a secure hash (salted PBKDF2-SHA256). Features include *Keep me signed in*, quick-pick profiles for shared computers, change password, sign out and delete account.

- **Today**: a greeting, today's to-dos with a progress bar, unfinished tasks carried over from earlier days, a **Tomorrow** preview, exam countdowns and a weekly focus chart with a streak.
- **Natural quick-add**: type `History essay friday 4pm #history !high` and Pebble works out the date, time, subject and priority.
  - Dates: `today`, `tomorrow`, `monday` / `next fri`, `in 3 days`, `in 2 weeks`, `14/11`
  - Times: `4pm`, `9:30`, `at 15:00`
  - `#subject` picks a subject. `!high` or `!!` marks it urgent, `!low` marks it low priority.
  - The word `exam` makes it an exam. Words like `lesson` or `class` make it an event.
- **Calendar**: a month view that starts on Monday. Click a day to see and add items. Drag items to another day to move them, and double-click a day to add an item with full details.
- **To-do list**: tabs for Upcoming, Today, Overdue, Done and All, plus search. Every item can be edited and deleted, and deleting can be undone.
- **Reminders**
  - An evening heads-up listing tomorrow's to-dos (7pm by default, you can change it)
  - An optional morning summary of the day
  - Per-item reminders, sent 15 minutes before the item
  - **Add to my phone's calendar (.ics)** exports upcoming items with alerts the evening before, so reminders still arrive when Pebble is closed
- **Focus timer**: Pomodoro-style focus and break sessions with an animated ring and a gentle chime. You can play rain, waves or deep ambient sound, which is generated in the browser so it needs no audio files. Each finished session adds a pebble to the day's count.
- **Flashcards**: decks with simple spaced repetition. Cards you know come back after 1, 3, 7, 14, 30 and then 60 days.
- **Breathe**: guided breathing (Gentle 4-6, Box 4-4-4-4, and 4-7-8 for exam nerves).
- **Settings**: your name, light/dark/auto theme, colour-coded subjects, and backup/restore to JSON.
- Works offline and can be installed as an app on a phone or desktop.
- Keyboard shortcuts: `N` adds a new item, `1`–`7` switch pages, `Space` starts the timer or flips a card, `Esc` closes windows.

## Put it on GitHub Pages

1. Create a new repository on GitHub, for example `pebble`.
2. Upload **everything in this folder**, keeping the folder structure. That includes `.nojekyll`. On the website you can drag the files into **Add file → Upload files**. With git:
   ```bash
   git init
   git add .
   git commit -m "Pebble study planner"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/pebble.git
   git push -u origin main
   ```
3. In the repository, go to **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then pick **main** and **/(root)**. Click **Save**.
4. After a minute your site is live at `https://YOUR-USERNAME.github.io/pebble/`.

> Notifications need HTTPS. GitHub Pages provides it automatically.

## About accounts

GitHub Pages can only host files and can't run a server or database. Pebble's accounts are therefore **saved on the device**: a student who creates an account on their laptop signs in on that laptop. To move a planner to another device, use **Settings → Download backup**, then sign in on the new device and choose **Restore backup**. Forgotten passwords can't be reset by email, but the account can be removed from the device and recreated.

For accounts that work on every device (cloud sync), you would need to connect a free backend such as Firebase or Supabase. That can be added later.

## About notifications

Browsers only let a website send notifications while it is open: in a tab, a pinned tab or an installed app. Sending them while it is fully closed would need a push server, and Pebble deliberately doesn't have one so that everyone's data stays private. For reminders that always arrive, students can use **Settings → Add to my phone's calendar**.

## Files

```
index.html             page structure
css/style.css          all styling (light + dark)
js/app.js              all app logic
js/auth.js             login page + accounts
sw.js                  offline support + notification clicks
manifest.webmanifest   lets it be installed as an app
assets/                logo.svg, wordmark.svg, app icons
```

## Customising

- **Colours**: change the variables at the top of `css/style.css`: `--accent` (sage), `--lav` (lavender) and `--peach`.
- **Encouraging lines**: edit the `THOUGHTS` list in `js/app.js`.
- **Default subjects**: edit `DEFAULT_SUBJECTS` in `js/app.js`.
- After changing files, bump `CACHE = 'pebble-v2'` in `sw.js` (to `v3` and so on) so returning visitors get the new version.

Made by Happychap5005.

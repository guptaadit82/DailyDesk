# Daily Desk - GK and English Exam PWA

Daily Desk is a mobile-first offline exam revision app built with plain HTML, CSS, JavaScript modules, and local JSON.

## User Flow

1. User opens the app.
2. User chooses a top-level subject:
   - GK
   - English
3. GK shows a dashboard and two bottom tabs:
   - Study
   - Quiz
4. English shows a dashboard and three bottom tabs:
   - Connector
   - Vocab
   - Quiz

## GK

Study renders all GK data from `data/gk-data.json` as ordered modules:

- Dams and Rivers GK
- Regulatory Bodies and Functions
- Organs, Vitamins and Diseases
- Important National and International Days
- HQ, City and Famous Reports
- Recent National, International, Technical and Sports News

Quiz uses 20 random MCQs from the GK quiz bank.

## English

Connector renders all concepts, tone maps, rules, connector families, and connector practice data from `data/phrase-connectors.json`.

Vocab renders all vocabulary words from `vocab.json` with English meaning, Hindi meaning, synonyms, antonyms, banking usage, difficulty, and exam tags.

Quiz uses 30 random mixed MCQs from the connector and vocabulary quiz bank.

## App Structure

- `index.html` - static app shell.
- `style.css` - responsive app visual system.
- `app.js` - compatibility loader for older cached shells.
- `js/config.js` - constants, course config, and file paths.
- `js/utils.js` - shared formatting, escaping, grouping, and shuffle helpers.
- `js/store.js` - localStorage state and streak handling.
- `js/subjects.js` - data loading, validation, and GK/English course normalization.
- `js/views.js` - render functions for dashboard, study modules, and quiz.
- `js/main.js` - course navigation, tab rendering, quiz engine, and PWA install wiring.
- `icons/` - Daily Desk logo and browser/PWA icons.
- `sw.js` and `manifest.json` - offline/PWA support.

## Data Files

- `vocab.json`
- `data/phrase-connectors.json`
- `data/gk-data.json`
- `data/data.json`

`data/data.json` contains the normalized `quizQuestions` bank. Every quiz question has 4 options and one correct answer index.

## Run Locally

```powershell
cd "C:\Users\Aditya Gupta\Downloads\vocabdesk"
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

The app works offline after the first successful visit when the service worker has cached the shell and data files.

## Deployment

This repo includes a GitHub Pages workflow at `.github/workflows/pages.yml`.

After pushing to `main`, the site is intended to publish at:

```text
https://guptaadit82.github.io/DailyDesk/
```

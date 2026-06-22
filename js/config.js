export const CONFIG = Object.freeze({
  storageKey: "vocabdesk_course_state_v1",
  installDismissKey: "vocabdesk_install_dismissed_v4",
  quizSizes: Object.freeze({
    gk: 20,
    english: 30
  }),
  files: Object.freeze({
    vocab: "vocab.json",
    phrase: "data/phrase-connectors.json",
    gk: "data/gk-data.json",
    quiz: "data/data.json"
  }),
  courses: Object.freeze([
    { id: "gk", label: "GK", title: "General Knowledge", tabs: ["study", "quiz"] },
    { id: "english", label: "English", title: "English", tabs: ["connector", "vocab", "quiz"] }
  ])
});

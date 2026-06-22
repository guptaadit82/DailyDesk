import { CONFIG } from "./config.js";
import { createStore } from "./store.js";
import { loadAppData } from "./subjects.js";
import {
  bottomTabs,
  connectorPage,
  courseOptions,
  emptyState,
  loadError,
  mistakeList,
  quizIntro,
  quizQuestion,
  quizResult,
  studyPage,
  vocabPage
} from "./views.js?v=mobile2";
import { shuffle } from "./utils.js";

const store = createStore(CONFIG.storageKey);
const dom = {};
const app = {
  data: null,
  selectedCourseId: "gk",
  activeTab: "study",
  quiz: null,
  deferredInstallPrompt: null
};

let booted = false;
if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init, { once: true });
}else{
  init();
}

async function init(){
  if(booted) return;
  booted = true;
  cacheDom();
  ensureShell();

  try{
    app.data = await loadAppData(CONFIG.files);
    app.selectedCourseId = app.data.byId[store.state.selectedCourseId] ? store.state.selectedCourseId : "gk";
    app.activeTab = defaultTabForCourse(app.selectedCourseId);
  }catch(error){
    dom.loadError.hidden = false;
    dom.loadError.innerHTML = loadError(error);
    console.error(error);
    return;
  }

  wireEvents();
  renderCoursePicker();
  render();
  registerServiceWorker();
}

function cacheDom(){
  document.querySelectorAll("[id]").forEach(node => { dom[node.id] = node; });
}

function ensureShell(){
  document.querySelectorAll(".screen").forEach(screen => screen.remove());

  if(!dom.view){
    const appRoot = document.getElementById("app") || document.body;
    const view = document.createElement("section");
    view.id = "view";
    view.className = "workspace";
    appRoot.appendChild(view);
    dom.view = view;
  }

  if(!dom.bottomnav){
    const existing = document.querySelector(".bottomnav");
    const nav = existing || document.createElement("nav");
    nav.id = "bottomnav";
    nav.className = "bottomnav";
    nav.setAttribute("aria-label", "Course modes");
    if(!existing) document.body.appendChild(nav);
    dom.bottomnav = nav;
  }

  if(!dom.loadError){
    const error = document.createElement("section");
    error.id = "loadError";
    error.className = "load-error";
    error.hidden = true;
    document.getElementById("app")?.prepend(error);
    dom.loadError = error;
  }
}

function wireEvents(){
  dom.subjectSelect.addEventListener("change", () => selectCourse(dom.subjectSelect.value));
  dom.bottomnav.addEventListener("click", event => {
    const button = event.target.closest("[data-tab]");
    if(!button) return;
    setActiveTab(button.dataset.tab);
  });
  dom.view.addEventListener("click", handleWorkspaceClick);
  dom.btnInstall.addEventListener("click", installApp);
  dom.btnDismissInstall.addEventListener("click", dismissInstall);

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    app.deferredInstallPrompt = event;
    if(!localStorage.getItem(CONFIG.installDismissKey)) dom.installBanner.hidden = false;
  });
}

function renderCoursePicker(){
  dom.subjectSelect.innerHTML = courseOptions(app.data.courses.map(course => ({
    id: course.id,
    label: course.shortTitle || course.title
  })));
  dom.subjectSelect.value = app.selectedCourseId;
}

function selectCourse(courseId){
  if(!app.data.byId[courseId]) return;
  app.selectedCourseId = courseId;
  app.activeTab = defaultTabForCourse(courseId);
  app.quiz = null;
  store.mutate(state => {
    state.selectedCourseId = courseId;
    state.activeTabs[courseId] = app.activeTab;
  });
  render();
}

function setActiveTab(tab){
  const nextTab = validTabForCourse(app.selectedCourseId, tab);
  app.activeTab = nextTab;
  app.quiz = null;
  store.mutate(state => {
    state.activeTabs[app.selectedCourseId] = nextTab;
  });
  render();
}

function validTabForCourse(courseId, tab){
  const fallback = defaultTabForCourse(courseId);
  const allowed = courseId === "english" ? ["connector", "vocab", "quiz"] : ["study", "quiz"];
  return allowed.includes(tab) ? tab : fallback;
}

function defaultTabForCourse(courseId){
  return courseId === "english" ? "connector" : "study";
}

function currentCourse(){
  return app.data.byId[app.selectedCourseId];
}

function render(){
  const course = currentCourse();
  const tabs = course.id === "english" ? ["connector", "vocab", "quiz"] : ["study", "quiz"];
  dom.subjectSelect.value = course.id;
  dom.bottomnav.style.setProperty("--tab-count", String(tabs.length));
  dom.bottomnav.innerHTML = bottomTabs(tabs, app.activeTab);
  dom.dataVersion.textContent = "Data " + (course.dataVersion || "local");
  dom.streakCount.textContent = store.state.streak.current || 0;

  if(app.activeTab !== "quiz") app.quiz = null;
  if(app.activeTab === "study") renderStudy();
  if(app.activeTab === "connector") renderConnector();
  if(app.activeTab === "vocab") renderVocab();
  if(app.activeTab === "quiz") renderQuiz();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function renderStudy(){
  const course = currentCourse();
  dom.view.innerHTML = studyPage(course, courseStats(course));
}

function renderConnector(){
  const course = currentCourse();
  dom.view.innerHTML = connectorPage(course, courseStats(course));
}

function renderVocab(){
  const course = currentCourse();
  dom.view.innerHTML = vocabPage(course, courseStats(course));
}

function renderQuiz(){
  const course = currentCourse();
  if(app.quiz && app.quiz.courseId === course.id){
    renderQuizQuestionOrResult();
    return;
  }
  dom.view.innerHTML = quizIntro(course, courseStats(course), quizSize(course.id));
}

function handleWorkspaceClick(event){
  const introButton = event.target.closest("[data-quiz-intro]");
  if(introButton){
    if(introButton.dataset.quizIntro === "start") startQuiz();
    if(introButton.dataset.quizIntro === "mistakes") renderStoredMistakes();
    return;
  }

  const optionButton = event.target.closest("[data-quiz-option]");
  if(optionButton){
    answerQuizQuestion(Number(optionButton.dataset.quizOption));
    return;
  }

  const actionButton = event.target.closest("[data-quiz-action]");
  if(!actionButton) return;
  if(actionButton.dataset.quizAction === "next"){
    app.quiz.index += 1;
    renderQuizQuestionOrResult();
  }
  if(actionButton.dataset.quizAction === "restart") startQuiz();
  if(actionButton.dataset.quizAction === "mistakes") renderCurrentMistakes();
  if(actionButton.dataset.quizAction === "back"){
    app.quiz = null;
    renderQuiz();
  }
}

function startQuiz(){
  const course = currentCourse();
  const size = quizSize(course.id);
  const questions = shuffle(course.quizQuestions).slice(0, size).map(shuffleQuestionOptions);
  app.quiz = {
    courseId: course.id,
    questions,
    index: 0,
    answers: [],
    score: 0,
    saved: false
  };
  store.markActivity();
  renderQuizQuestionOrResult();
}

function shuffleQuestionOptions(question){
  const options = question.options.map((text, index) => ({ text, correct: index === question.correctOptionIndex }));
  const shuffled = shuffle(options);
  return Object.assign({}, question, {
    options: shuffled.map(option => option.text),
    correctOptionIndex: shuffled.findIndex(option => option.correct)
  });
}

function renderQuizQuestionOrResult(){
  if(!app.quiz) return;
  if(app.quiz.index >= app.quiz.questions.length){
    if(!app.quiz.saved) saveQuizAttempt();
    dom.view.innerHTML = quizResult(app.quiz);
    return;
  }
  dom.view.innerHTML = quizQuestion(app.quiz);
}

function answerQuizQuestion(chosenIndex){
  if(!app.quiz || app.quiz.answers[app.quiz.index]) return;
  const question = app.quiz.questions[app.quiz.index];
  const correct = chosenIndex === question.correctOptionIndex;
  if(correct) app.quiz.score += 1;
  app.quiz.answers[app.quiz.index] = {
    qid: question.id,
    chosenIndex,
    chosen: question.options[chosenIndex],
    correct,
    question
  };
  store.mutate(state => {
    if(correct) delete state.missedQuestionIds[question.id];
    else state.missedQuestionIds[question.id] = true;
  });
  renderQuizQuestionOrResult();
}

function saveQuizAttempt(){
  const course = currentCourse();
  store.mutate(state => {
    const record = state.quizStats[course.id] || { correct: 0, total: 0, attempts: 0, lastScore: 0 };
    record.correct += app.quiz.score;
    record.total += app.quiz.questions.length;
    record.attempts += 1;
    record.lastScore = app.quiz.score;
    state.quizStats[course.id] = record;
  });
  app.quiz.saved = true;
  store.markActivity();
}

function renderCurrentMistakes(){
  const questions = (app.quiz?.answers || []).filter(answer => answer && !answer.correct).map(answer => answer.question);
  dom.view.innerHTML = mistakeList(currentCourse(), questions, "Mistakes from this attempt");
}

function renderStoredMistakes(){
  const course = currentCourse();
  const questions = course.quizQuestions.filter(question => store.state.missedQuestionIds[question.id]);
  dom.view.innerHTML = mistakeList(course, questions, "Saved Mistakes");
}

function courseStats(course){
  const record = store.state.quizStats[course.id] || { correct: 0, total: 0, attempts: 0, lastScore: 0 };
  const questionIds = new Set(course.quizQuestions.map(question => question.id));
  const missed = Object.keys(store.state.missedQuestionIds).filter(id => questionIds.has(id)).length;
  return {
    quizCount: course.quizQuestions.length,
    attempts: record.attempts || 0,
    lastScore: record.lastScore || 0,
    accuracy: record.total ? Math.round(record.correct * 100 / record.total) : 0,
    missed
  };
}

function quizSize(courseId){
  return CONFIG.quizSizes[courseId] || 20;
}

function installApp(){
  if(!app.deferredInstallPrompt) return;
  app.deferredInstallPrompt.prompt();
  app.deferredInstallPrompt.userChoice.finally(() => {
    app.deferredInstallPrompt = null;
    dom.installBanner.hidden = true;
  });
}

function dismissInstall(){
  localStorage.setItem(CONFIG.installDismissKey, "1");
  dom.installBanner.hidden = true;
}

function registerServiceWorker(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

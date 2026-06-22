import { todayStr } from "./utils.js";

export function defaultState(){
  return {
    selectedCourseId: "gk",
    activeTabs: { gk: "study", english: "connector" },
    quizStats: {},
    missedQuestionIds: {},
    activityLog: {},
    streak: { current: 0, longest: 0, lastActiveDate: null }
  };
}

export function createStore(storageKey){
  let state = normalize(load(storageKey));

  function save(){
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function mutate(updater){
    updater(state);
    state = normalize(state);
    save();
  }

  function markActivity(){
    state.activityLog[todayStr()] = true;
    updateStreak();
    save();
  }

  function updateStreak(){
    const today = todayStr();
    const yesterday = todayStr(new Date(Date.now() - 86400000));
    const log = state.activityLog || {};

    if(log[today] && state.streak.lastActiveDate !== today){
      state.streak.current = state.streak.lastActiveDate === yesterday ? state.streak.current + 1 : 1;
      state.streak.lastActiveDate = today;
      state.streak.longest = Math.max(state.streak.longest || 0, state.streak.current);
      return;
    }

    if(state.streak.lastActiveDate && state.streak.lastActiveDate !== today && state.streak.lastActiveDate !== yesterday){
      state.streak.current = 0;
    }
  }

  updateStreak();
  save();

  return {
    get state(){ return state; },
    save,
    mutate,
    markActivity,
    updateStreak
  };
}

function load(storageKey){
  try{
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : defaultState();
  }catch(error){
    return defaultState();
  }
}

function normalize(value){
  const fresh = defaultState();
  const state = Object.assign(fresh, value || {});
  state.activeTabs = Object.assign(fresh.activeTabs, state.activeTabs || {});
  state.quizStats = state.quizStats || {};
  state.missedQuestionIds = state.missedQuestionIds || {};
  state.activityLog = state.activityLog || {};
  state.streak = Object.assign(defaultState().streak, state.streak || {});
  if(!["gk", "english"].includes(state.selectedCourseId)) state.selectedCourseId = "gk";
  if(!["study", "quiz"].includes(state.activeTabs.gk)) state.activeTabs.gk = "study";
  if(!["connector", "vocab", "quiz"].includes(state.activeTabs.english)) state.activeTabs.english = "connector";
  return state;
}

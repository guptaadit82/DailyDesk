import { attr, esc, textOf, titleCase } from "./utils.js";

export function courseOptions(courses){
  return courses.map(course => `<option value="${attr(course.id)}">${esc(course.label || course.shortTitle || course.title)}</option>`).join("");
}

export function bottomTabs(tabs, activeTab){
  const labels = {
    study: "Study",
    connector: "Connector",
    vocab: "Vocab",
    quiz: "Quiz"
  };
  return tabs.map(tab => `
    <button class="nav-btn ${tab === activeTab ? "active" : ""}" data-tab="${attr(tab)}">
      <span>${esc(labels[tab] || titleCase(tab))}</span>
    </button>
  `).join("");
}

export function dashboard(course, stats, activeLabel){
  return `
    <article class="dashboard course-${attr(course.id)}">
      <div class="dashboard-copy">
        <p class="eyebrow">${esc(activeLabel || "Dashboard")}</p>
        <h1>${esc(course.title)}</h1>
        <p>${esc(course.dashboard?.primary || course.subtitle || "")}</p>
      </div>
      <div class="metric-grid">
        ${(course.dashboard?.metrics || []).map(([label, value]) => metric(label, value)).join("")}
        ${metric("Accuracy", stats.accuracy + "%")}
        ${metric("Mistakes", stats.missed)}
      </div>
    </article>
  `;
}

export function studyPage(course, stats){
  return `
    ${dashboard(course, stats, "GK Study")}
    <div class="study-index">
      ${(course.studyModules || []).map((module, index) => `<a href="#module-${index + 1}">${esc(index + 1)}. ${esc(module.title)}</a>`).join("")}
    </div>
    <div class="module-list">
      ${(course.studyModules || []).map((module, index) => learningModule(module, index)).join("")}
    </div>
  `;
}

export function connectorPage(course, stats){
  return `
    ${dashboard(course, stats, "Connector")}
    <div class="study-index">
      ${(course.connectorModules || []).map((module, index) => `<a href="#module-${index + 1}">${esc(index + 1)}. ${esc(module.title)}</a>`).join("")}
    </div>
    <div class="module-list">
      ${(course.connectorModules || []).map((module, index) => learningModule(module, index)).join("")}
    </div>
  `;
}

export function vocabPage(course, stats){
  return `
    ${dashboard(course, stats, "Vocabulary")}
    <div class="study-index">
      ${(course.vocabModules || []).map((module, index) => `<a href="#module-${index + 1}">${esc(index + 1)}. ${esc(module.title)}</a>`).join("")}
    </div>
    <div class="module-list">
      ${(course.vocabModules || []).map((module, index) => learningModule(module, index)).join("")}
    </div>
  `;
}

export function quizIntro(course, stats, quizSize){
  return `
    ${dashboard(course, stats, "Quiz")}
    <article class="quiz-shell">
      <div class="panel-title">
        <div>
          <p class="eyebrow">${esc(course.shortTitle || course.title)}</p>
          <h2>${quizSize} Random Questions</h2>
        </div>
        <span class="score-pill">${stats.quizCount} in bank</span>
      </div>
      <div class="quiz-rules">
        <span>Random from full database</span>
        <span>4 options per question</span>
        <span>No timer</span>
        <span>No negative marking</span>
      </div>
      <div class="metric-grid compact">
        ${metric("Attempts", stats.attempts)}
        ${metric("Last score", stats.lastScore + "/" + quizSize)}
        ${metric("Accuracy", stats.accuracy + "%")}
        ${metric("Mistakes", stats.missed)}
      </div>
      <div class="inline-actions">
        <button class="btn" data-quiz-intro="start">Start Quiz</button>
        <button class="btn secondary" data-quiz-intro="mistakes">Review Mistakes</button>
      </div>
    </article>
  `;
}

export function quizQuestion(session){
  const question = session.questions[session.index];
  const questionNumber = session.index + 1;
  const answered = session.answers[session.index];
  return `
    <article class="quiz-shell">
      <div class="panel-title">
        <div>
          <p class="eyebrow">${esc(question.keyword || question.tone || "Quiz")}</p>
          <h2>Question ${questionNumber} / ${session.questions.length}</h2>
        </div>
        <span class="score-pill">${session.score} correct</span>
      </div>
      ${progress(questionNumber - 1, session.questions.length)}
      <p class="quiz-question">${esc(question.question)}</p>
      <div class="quiz-options">
        ${question.options.map((option, index) => quizOption(question, option, index, answered)).join("")}
      </div>
      <div class="explanation-card" id="quizExplanation" ${answered ? "" : "hidden"}>
        ${answered ? explanation(question) : ""}
      </div>
      <button class="btn full" data-quiz-action="next" ${answered ? "" : "hidden"}>${questionNumber === session.questions.length ? "Show Result" : "Next Question"}</button>
    </article>
  `;
}

export function quizResult(session){
  const wrong = session.questions.length - session.score;
  const accuracy = Math.round(session.score * 100 / session.questions.length);
  return `
    <article class="quiz-shell result-card">
      <p class="eyebrow">Result</p>
      <h1>${session.score} / ${session.questions.length}</h1>
      <div class="metric-grid compact">
        ${metric("Accuracy", accuracy + "%")}
        ${metric("Correct", session.score)}
        ${metric("Wrong", wrong)}
        ${metric("Negative", 0)}
      </div>
      <div class="inline-actions">
        <button class="btn secondary" data-quiz-action="mistakes">Review Mistakes</button>
        <button class="btn" data-quiz-action="restart">Restart Quiz</button>
        <button class="btn secondary" data-quiz-action="back">Quiz Home</button>
      </div>
    </article>
  `;
}

export function mistakeList(course, questions, title){
  if(!questions.length) return emptyState(title, "No mistakes saved for this course yet.");
  return `
    <article class="quiz-shell">
      <div class="panel-title">
        <div>
          <p class="eyebrow">${esc(course.shortTitle || course.title)}</p>
          <h2>${esc(title)}</h2>
        </div>
        <button class="btn secondary small" data-quiz-action="back">Quiz Home</button>
      </div>
      <div class="mistake-list">
        ${questions.map(question => `
          <details>
            <summary>${esc(question.question)}</summary>
            ${explanation(question)}
          </details>
        `).join("")}
      </div>
    </article>
  `;
}

export function loadError(error){
  return `
    <h1>App data could not load</h1>
    <p>${esc(error.message || error)}</p>
    <p>Serve this folder through localhost so browser security allows local JSON fetches.</p>
  `;
}

export function emptyState(title, body){
  return `<div class="empty-state"><h2>${esc(title)}</h2><p>${esc(body)}</p></div>`;
}

function learningModule(module, index){
  return `
    <article class="learning-module" id="module-${index + 1}">
      <div class="module-head">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <h2>${esc(module.title)}</h2>
          ${module.subtitle ? `<p>${esc(module.subtitle)}</p>` : ""}
        </div>
      </div>
      ${module.stats ? `<div class="metric-grid module-metrics">${module.stats.map(([label, value]) => metric(label, value)).join("")}</div>` : ""}
      <div class="block-list">
        ${(module.blocks || []).map(block).join("")}
      </div>
    </article>
  `;
}

function block(item){
  if(!item) return "";
  if(item.kind === "text"){
    return `
      <section class="content-block">
        <h3>${esc(item.title)}</h3>
        ${(item.lines || []).map(line => `<p>${esc(line)}</p>`).join("")}
      </section>
    `;
  }
  if(item.kind === "list"){
    return `
      <section class="content-block">
        <h3>${esc(item.title)}</h3>
        <ul>${(item.items || []).map(value => `<li>${esc(textOf(value))}</li>`).join("")}</ul>
      </section>
    `;
  }
  if(item.kind === "raw"){
    return `
      <details class="content-block raw-block">
        <summary>${esc(item.title)}</summary>
        ${(item.pages || []).map(page => `
          <section>
            <h3>Page ${esc(page.page)}</h3>
            <pre>${esc(page.text)}</pre>
          </section>
        `).join("")}
      </details>
    `;
  }
  if(item.kind === "table"){
    return tableBlock(item.title, item.rows || []);
  }
  return "";
}

function tableBlock(title, rows){
  if(!rows.length) return "";
  const normalizedRows = rows.map(row => normalizeRow(row));
  const columns = Array.from(normalizedRows.reduce((set, row) => {
    Object.keys(row).forEach(key => set.add(key));
    return set;
  }, new Set()));
  return `
    <section class="content-block">
      <h3>${esc(title)}</h3>
      <div class="table-wrap">
        <table>
          <thead><tr>${columns.map(column => `<th>${esc(titleCase(column))}</th>`).join("")}</tr></thead>
          <tbody>
            ${normalizedRows.map(row => `<tr>${columns.map(column => `<td>${esc(textOf(row[column]))}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function normalizeRow(row){
  if(row == null) return { Value: "" };
  if(typeof row !== "object" || Array.isArray(row)) return { Value: textOf(row) };
  return row;
}

function metric(label, value){
  return `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
}

function progress(value, total){
  const width = total ? Math.round(value * 100 / total) : 0;
  return `<div class="progress-track" aria-hidden="true"><div style="width:${width}%"></div></div>`;
}

function quizOption(question, option, index, answered){
  const classes = ["option"];
  if(answered){
    if(index === question.correctOptionIndex) classes.push("correct");
    if(index === answered.chosenIndex && !answered.correct) classes.push("wrong");
  }
  return `<button class="${classes.join(" ")}" data-quiz-option="${index}" ${answered ? "disabled" : ""}>${esc(option)}</button>`;
}

function explanation(question){
  return `
    <p><strong>Answer:</strong> ${esc(question.answer)}</p>
    ${question.explanation_en ? `<p>${esc(question.explanation_en)}</p>` : ""}
    ${question.explanation_hi ? `<p>${esc(question.explanation_hi)}</p>` : ""}
    ${question.rule ? `<p class="rule-line">${esc(question.rule)}</p>` : ""}
  `;
}

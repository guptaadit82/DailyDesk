import { countBy, textOf, titleCase } from "./utils.js";

export async function loadAppData(files){
  const [vocab, phrase, gk, quizData] = await Promise.all([
    loadJson(files.vocab),
    loadJson(files.phrase),
    loadJson(files.gk),
    loadJson(files.quiz)
  ]);
  validateData(vocab, phrase, gk, quizData);

  const englishQuiz = quizData.quizQuestions.filter(question => ["vocabulary", "phrase-connectors"].includes(question.subjectId));
  const gkQuiz = quizData.quizQuestions.filter(question => !["vocabulary", "phrase-connectors"].includes(question.subjectId));

  const courses = [
    buildGkCourse(gk, gkQuiz),
    buildEnglishCourse(vocab, phrase, englishQuiz)
  ];

  return {
    raw: { vocab, phrase, gk, quizData },
    courses,
    byId: Object.fromEntries(courses.map(course => [course.id, course]))
  };
}

async function loadJson(url){
  const response = await fetch(url);
  if(!response.ok) throw new Error("Could not load " + url);
  return response.json();
}

function validateData(vocab, phrase, gk, quizData){
  if(!Array.isArray(vocab) || vocab.length === 0) throw new Error("vocab.json is empty or invalid.");
  if(!phrase || !Array.isArray(phrase.coreConcepts) || !Array.isArray(phrase.connectorFamilies)) throw new Error("phrase-connectors.json is invalid.");
  if(!gk || !Array.isArray(gk.topics)) throw new Error("gk-data.json is invalid.");
  if(!quizData || !Array.isArray(quizData.quizQuestions)) throw new Error("data/data.json is missing quizQuestions.");

  const invalid = quizData.quizQuestions.find(question =>
    !question.id ||
    !question.subjectId ||
    !question.question ||
    !Array.isArray(question.options) ||
    question.options.length !== 4 ||
    question.correctOptionIndex < 0 ||
    question.correctOptionIndex > 3
  );
  if(invalid) throw new Error("Invalid quiz question: " + invalid.id);
}

function buildGkCourse(gk, quizQuestions){
  const topics = gk.topics || [];
  const sourceBlocks = [
    textBlock("App", [gk.app?.name, gk.app?.description].filter(Boolean)),
    textBlock("Sources", sourceLines(gk.source)),
    tableBlock("Known PDF Issues", gk.source?.knownPdfIssues || [])
  ].filter(Boolean).concat(sourceRawBlocks(gk.source));
  const studyModules = [
    {
      type: "overview",
      title: "GK Data Overview",
      subtitle: gk.app?.description || "Static GK, current affairs, and exam connector facts.",
      stats: [
        ["Topics", topics.length],
        ["Study blocks", topics.reduce((total, topic) => total + Object.keys(topic).length, 0)],
        ["Quiz questions", quizQuestions.length],
        ["Data version", gk.dataVersion || gk.generatedOn || "local"]
      ],
      blocks: sourceBlocks
    },
    ...topics.map(topicToModule)
  ];

  return {
    id: "gk",
    type: "gk",
    title: "General Knowledge",
    shortTitle: "GK",
    subtitle: "Static GK, exam facts, reports, important days, and current affairs",
    dataVersion: gk.dataVersion || gk.generatedOn || "gk",
    dashboard: {
      primary: "Study all GK and SSC GS data in one ordered notebook, then test with a 25-question proportioned quiz.",
      metrics: [
        ["Topics", topics.length],
        ["Study modules", studyModules.length],
        ["Quiz bank", quizQuestions.length],
        ["Mode", "Study + Quiz"]
      ]
    },
    studyModules,
    quizQuestions
  };
}

function sourceLines(source){
  if(!source) return [];
  const lines = [
    source.pdfPath ? "PDF: " + sourceLabel(source.pdfPath) + " (" + source.pdfPath + ")" : "",
    source.pageCount ? "Pages: " + source.pageCount : "",
    source.preservationPolicy
  ].filter(Boolean);
  (source.additionalSources || []).forEach(item => {
    lines.push("PDF: " + sourceLabel(item.pdfPath) + " (" + item.pdfPath + ")");
    if(item.pageCount) lines.push("Pages: " + item.pageCount);
    if(item.preservationPolicy) lines.push(item.preservationPolicy);
  });
  return lines;
}

function sourceRawBlocks(source){
  if(!source) return [];
  const blocks = [];
  const primaryRaw = rawBlock("Original PDF Text - " + sourceLabel(source.pdfPath || "Primary Source"), source.rawPages || []);
  if(primaryRaw) blocks.push(primaryRaw);
  (source.additionalSources || []).forEach(item => {
    const block = rawBlock("Original PDF Text - " + sourceLabel(item.pdfPath || "Additional Source"), item.rawPages || []);
    if(block) blocks.push(block);
  });
  return blocks;
}

function sourceLabel(value){
  return String(value || "Source").split(/[\\/]/).pop() || "Source";
}

function topicToModule(topic){
  const blocks = [];
  blocks.push(textBlock("Status", [topic.status, topic.sourceWarning, topic.sourceNote, topic.examScopeFromPdf, topic.rawPromptFromPdf].filter(Boolean)));
  blocks.push(listBlock("Exam Tags", topic.examTags));
  (topic.sections || []).forEach(section => blocks.push(listBlock(section.title, section.items, {
    collapsible: section.collapsible
  })));

  if(topic.tables){
    Object.entries(topic.tables).forEach(([name, rows]) => blocks.push(tableBlock(titleCase(name), rows)));
  }

  (topic.connectorSets || []).forEach(set => {
    blocks.push(tableBlock(set.title, (set.items || []).map(item => ({
      [set.leftLabel || "Left"]: item.left,
      [set.rightLabel || "Right"]: item.right,
      Note: item.extra ? textOf(item.extra) : ""
    }))));
  });

  blocks.push(listBlock("One-Liners", topic.oneLiners));
  blocks.push(tableBlock("Revision Strategy", topic.revisionStrategy));
  blocks.push(tableBlock("Top 20", topic.top20));
  blocks.push(tableBlock("Extra Super Important", topic.extraSuperImportant));
  blocks.push(tableBlock("Ultra Short Revision", topic.ultraShortRevision));
  blocks.push(listBlock("Memory Hack", topic.memoryHack));
  blocks.push(tableBlock("Items", topic.items));
  blocks.push(tableBlock("Flashcards", topic.flashcards));
  blocks.push(tableBlock("Original Questions", topic.questions));
  blocks.push(tableBlock("Sources", topic.sources));

  if(topic.rawPages && topic.rawPages.length){
    blocks.push(rawBlock("Original PDF Text", topic.rawPages));
  }

  return {
    type: "topic",
    title: topic.title,
    subtitle: (topic.status || "GK topic").replace(/_/g, " "),
    blocks: blocks.filter(Boolean)
  };
}

function buildEnglishCourse(vocab, phrase, quizQuestions){
  const connectorModules = [
    {
      type: "overview",
      title: "Connector Concepts",
      subtitle: phrase.metadata?.subtitle || "Hindi-English connector learning data.",
      stats: [
        ["Core concepts", phrase.coreConcepts?.length || 0],
        ["Tone groups", phrase.toneMap?.length || 0],
        ["Rules", phrase.commonRules?.length || 0],
        ["Practice questions", phrase.practiceQuestions?.length || 0]
      ],
      blocks: [
        textBlock("Metadata", [
          phrase.metadata?.title,
          phrase.metadata?.subtitle,
          phrase.metadata?.languageMode,
          phrase.metadata?.recommendedUse
        ].filter(Boolean)),
        listBlock("Target Exams", phrase.metadata?.targetExams)
      ].filter(Boolean)
    },
    ...(phrase.coreConcepts || []).map(concept => ({
      type: "concept",
      title: concept.title,
      subtitle: "Core concept",
      blocks: [
        textBlock("Explanation", [concept.explanation_en, concept.explanation_hi].filter(Boolean)),
        concept.example ? tableBlock("Example", [{
          Before: Array.isArray(concept.example.before) ? concept.example.before.join(" / ") : concept.example.before,
          After: concept.example.after,
          Hindi: concept.example.meaning_hi
        }]) : null
      ].filter(Boolean)
    })),
    {
      type: "tone-map",
      title: "Tone Map",
      subtitle: "Relation signals and connector keywords",
      blocks: [tableBlock("Tone Map", phrase.toneMap || [])]
    },
    {
      type: "rules",
      title: "Common Rules and Traps",
      subtitle: "High-yield grammar traps for IBPS/SBI/RRB English",
      blocks: [tableBlock("Rules", phrase.commonRules || [])]
    },
    ...(phrase.connectorFamilies || []).map(family => ({
      type: "family",
      title: family.family,
      subtitle: family.meaning_hi,
      blocks: [tableBlock("Keywords", family.keywords || [])]
    })),
    {
      type: "practice",
      title: "Connector Practice Bank",
      subtitle: "All original connector practice prompts with answers and explanations",
      blocks: [tableBlock("Practice Questions", phrase.practiceQuestions || [])]
    }
  ];

  const categoryCounts = Object.entries(countBy(vocab, "category")).map(([category, count]) => ({ category, count }));
  const vocabModules = [
    {
      type: "overview",
      title: "Vocabulary Overview",
      subtitle: "Banking exam words with Hindi meaning, usage, synonyms, and antonyms.",
      stats: [
        ["Words", vocab.length],
        ["Categories", categoryCounts.length],
        ["Quiz questions", quizQuestions.filter(question => question.subjectId === "vocabulary").length],
        ["Mode", "Study + Quiz"]
      ],
      blocks: [
        tableBlock("Category Count", categoryCounts),
        listBlock("Revision Fields", ["English meaning", "Hindi meaning", "synonym", "antonym", "banking usage", "exam relevance"])
      ].filter(Boolean)
    },
    ...Object.entries(groupVocab(vocab)).map(([category, words]) => ({
      type: "vocab-category",
      title: category,
      subtitle: words.length + " words",
      blocks: [tableBlock(category + " Words", words.map(word => ({
        Word: word.word,
        English: word.meaning_en,
        Hindi: word.meaning_hi,
        Synonyms: (word.synonyms || []).join(", "),
        Antonyms: (word.antonyms || []).join(", "),
        Usage: word.banking_usage || word.example,
        Difficulty: word.difficulty,
        Exams: (word.exam_relevance || []).join(", ")
      })))]
    }))
  ];

  return {
    id: "english",
    type: "english",
    title: "English",
    shortTitle: "English",
    subtitle: "Phrase connectors, vocabulary, and mixed IBPS-style practice",
    dataVersion: phrase.metadata?.version || "english-local",
    dashboard: {
      primary: "Study connectors and vocabulary separately, then take a 30-question mixed quiz.",
      metrics: [
        ["Connector items", phrase.connectorFamilies?.reduce((total, family) => total + (family.keywords?.length || 0), 0) || 0],
        ["Vocab words", vocab.length],
        ["Mixed quiz bank", quizQuestions.length],
        ["Mode", "Connector + Vocab + Quiz"]
      ]
    },
    connectorModules,
    vocabModules,
    quizQuestions
  };
}

function groupVocab(vocab){
  return vocab.reduce((groups, word) => {
    const key = word.category || "Vocabulary";
    if(!groups[key]) groups[key] = [];
    groups[key].push(word);
    return groups;
  }, {});
}

function textBlock(title, lines){
  if(!lines || !lines.length) return null;
  return { kind: "text", title, lines };
}

function listBlock(title, items, options = {}){
  if(!items || !items.length) return null;
  return {
    kind: "list",
    title,
    items,
    collapsible: Boolean(options.collapsible)
  };
}

function tableBlock(title, rows){
  if(!rows || !rows.length) return null;
  return { kind: "table", title, rows };
}

function rawBlock(title, pages){
  if(!pages || !pages.length) return null;
  return { kind: "raw", title, pages };
}

// BCSI 9020 – Materials Science Review
// Minimal Academic Quiz (one-at-a-time) with summary review of incorrect answers.
// Supports two question types: "multiple_choice" and "fill_blank".
// Starts fresh on every load. No user identity or remote storage.
// JSON files must be in the same folder (Week 4 & Week 5).

const els = {
  setupCard: document.getElementById('setup-card'),
  quizCard: document.getElementById('quiz-card'),
  summaryCard: document.getElementById('summary-card'),
  topic: document.getElementById('topic'),
  startBtn: document.getElementById('start-btn'),
  progress: document.getElementById('progress'),
  setupError: document.getElementById('setup-error'),
  score: document.getElementById('score'),
  qText: document.getElementById('question-text'),
  options: document.getElementById('options'),
  fillin: document.getElementById('fillin'),
  fillinInput: document.getElementById('fillin-input'),
  submitFillin: document.getElementById('submit-fillin'),
  feedback: document.getElementById('feedback'),
  answerReveal: document.getElementById('answer-reveal'),
  nextBtn: document.getElementById('next-btn'),
  quitBtn: document.getElementById('quit-btn'),
  finalScore: document.getElementById('final-score'),
  wrongList: document.getElementById('wrong-list'),
  restartBtn: document.getElementById('restart-btn'),
};

// State
let questionQueue = [];
let currentIndex = 0;
let score = 0;
let wrongAnswers = [];
let answered = false;

// Helpers
function shuffle(arr){
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeText(s){
  return (s ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u2019'’`]/g, '')   // remove apostrophes
    .replace(/[^a-z0-9\s\.\-]/g, '') // strip most punctuation but keep dots/dashes
    .replace(/\s+/g, ' ');
}

function setFeedback(ok, msg){
  els.feedback.className = 'feedback ' + (ok ? 'correct' : 'incorrect');
  els.feedback.textContent = msg;
}

function setProgress(){
  const totalQuestions = questionQueue.length;
  const asked = totalQuestions === 0 ? 0 : Math.min(currentIndex + 1, totalQuestions);
  els.progress.textContent = `Question ${asked} of ${totalQuestions}`;
  els.score.textContent = `Score: ${score}/${asked}`;
}

function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

function lockUI(){
  const btns = els.options.querySelectorAll('button');
  btns.forEach(b => b.disabled = true);
  els.submitFillin.disabled = true;
  els.fillinInput.disabled = true;
}

function resetUI(){
  els.options.innerHTML = '';
  els.fillinInput.value = '';
  els.fillinInput.disabled = false;
  els.submitFillin.disabled = false;
  els.feedback.textContent = '';
  els.feedback.className = 'feedback';
  els.answerReveal.textContent = '';
  hide(els.answerReveal);
  hide(els.nextBtn);
}

function setSetupError(msg){
  if(!els.setupError) return;
  if(msg){
    els.setupError.textContent = msg;
    show(els.setupError);
  }else{
    els.setupError.textContent = '';
    hide(els.setupError);
  }
}

async function startQuiz(){
  const file = els.topic.value;
  setSetupError('');
  els.startBtn.disabled = true;
  try{
    const res = await fetch(file);
    if(!res.ok) throw new Error(`Failed to load ${file}`);
    const data = await res.json();
    if(!Array.isArray(data)){
      throw new Error('Quiz data must be an array of questions.');
    }
    if(data.length === 0){
      alert('No questions are available for this topic yet.');
      return;
    }

    let desiredCount = data.length;
    while(true){
      const defaultVal = Math.min(10, data.length);
      const input = prompt(`How many questions would you like? (1-${data.length})`, String(defaultVal));
      if(input === null){
        return; // user cancelled
      }
      const parsed = Number.parseInt(input, 10);
      if(Number.isInteger(parsed) && parsed >= 1 && parsed <= data.length){
        desiredCount = parsed;
        break;
      }
      alert(`Please enter a whole number between 1 and ${data.length}.`);
    }

    const pool = shuffle([...data]);
    questionQueue = pool.slice(0, desiredCount).map(q => ({ ...q }));
  }catch(err){
    alert(`Could not load quiz data. Make sure the JSON files are present. ${err.message}`);
    return;
  } finally {
    els.startBtn.disabled = false;
  }

  currentIndex = 0;
  score = 0;
  wrongAnswers = [];
  answered = false;

  hide(els.setupCard);
  hide(els.summaryCard);
  show(els.quizCard);

  renderCurrent();
}

function renderCurrent(){
  resetUI();
  setProgress();

  const q = questionQueue[currentIndex];
  els.qText.textContent = q.question ?? '';

  const type = q.type || (q.options ? 'multiple_choice' : 'fill_blank');

  if(type === 'multiple_choice'){
    showMultipleChoice(q);
  } else {
    showFillBlank(q);
  }
}

function recordWrongAnswer(q, userAnswer){
  wrongAnswers.push({
    question: q.question,
    userAnswer,
    correctAnswer: q.answer
  });
}

function scheduleRetry(q){
  const insertAt = Math.min(questionQueue.length, currentIndex + 4);
  questionQueue.splice(insertAt, 0, q);
  setProgress();
}

function showMultipleChoice(q){
  show(els.options);
  hide(els.fillin);

  const correct = q.answer;
  const normalizedCorrect = correct != null ? String(correct) : '';
  const options = Array.isArray(q.options) ? q.options.slice() : [];
  if(options.length === 0 && typeof correct === 'string'){
    options.push(correct);
  }
  shuffle(options);

  options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.choiceValue = String(opt);

    const letterSpan = document.createElement('span');
    letterSpan.className = 'option-letter';
    letterSpan.textContent = `${String.fromCharCode(65 + idx)}.`;

    const textSpan = document.createElement('span');
    textSpan.className = 'option-text';
    textSpan.textContent = opt;

    btn.append(letterSpan, textSpan);
    btn.addEventListener('click', () => {
      if(answered) return;
      answered = true;

      const selectedValue = String(opt);
      const isCorrect = selectedValue === normalizedCorrect;
      if(isCorrect){
        btn.classList.add('correct');
        score += 1;
        setFeedback(true, 'Correct ✅');
      }else{
        btn.classList.add('incorrect');
        setFeedback(false, 'Incorrect ❌');
        recordWrongAnswer(q, opt);
        scheduleRetry(q);
        [...els.options.querySelectorAll('button')].forEach(b => {
          if(String(b.dataset.choiceValue) === normalizedCorrect) b.classList.add('correct');
        });
      }
      lockUI();
      show(els.nextBtn);
      setProgress();
    });
    els.options.appendChild(btn);
  });
}

function showFillBlank(q){
  hide(els.options);
  show(els.fillin);

  const correct = normalizeText(q.answer);

  const submit = () => {
    if(answered) return;
    const userRaw = els.fillinInput.value;
    const user = normalizeText(userRaw);
    answered = true;

    const isCorrect = user === correct;
    if(isCorrect){
      setFeedback(true, 'Correct ✅');
      score += 1;
    }else{
      setFeedback(false, 'Incorrect ❌');
      recordWrongAnswer(q, userRaw);
      els.answerReveal.textContent = `Correct answer: ${q.answer}`;
      show(els.answerReveal);
      scheduleRetry(q);
    }
    lockUI();
    show(els.nextBtn);
    setProgress();
  };

  els.submitFillin.onclick = submit;
  els.fillinInput.onkeydown = (e) => {
    if(e.key === 'Enter') submit();
  };
  els.fillinInput.focus();
}

function nextQuestion(){
  answered = false;
  currentIndex += 1;
  if(currentIndex >= questionQueue.length){
    return showSummary();
  }
  renderCurrent();
}

function showSummary(){
  hide(els.quizCard);
  show(els.summaryCard);

  const total = questionQueue.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  els.finalScore.textContent = `Final Score: ${score} / ${total} (${pct}%)`;

  els.wrongList.innerHTML = '';
  if(wrongAnswers.length === 0){
    const p = document.createElement('p');
    p.textContent = 'Excellent! You answered every question correctly.';
    els.wrongList.appendChild(p);
  }else{
    wrongAnswers.forEach((w, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'wrong-item';
      const q = document.createElement('p');
      q.className = 'wrong-q';
      q.textContent = `${idx + 1}. ${w.question}`;
      const ua = document.createElement('p');
      ua.className = 'wrong-a';
      ua.textContent = `Your answer: ${w.userAnswer}`;
      const ca = document.createElement('p');
      ca.className = 'wrong-c';
      ca.textContent = `Correct answer: ${w.correctAnswer}`;
      wrap.append(q, ua, ca);
      els.wrongList.appendChild(wrap);
    });
  }
}

function restart(){
  hide(els.quizCard);
  hide(els.summaryCard);
  show(els.setupCard);
  answered = false;
  currentIndex = 0;
  score = 0;
  wrongAnswers = [];
  questionQueue = [];
  els.feedback.textContent = '';
  els.options.innerHTML = '';
  els.fillinInput.value = '';
  els.answerReveal.textContent = '';
  hide(els.answerReveal);
  setProgress();
}

// Wire up
els.startBtn.addEventListener('click', startQuiz);
els.nextBtn.addEventListener('click', nextQuestion);
els.restartBtn.addEventListener('click', restart);
els.quitBtn.addEventListener('click', restart);

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

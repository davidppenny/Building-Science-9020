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
  score: document.getElementById('score'),
  qText: document.getElementById('question-text'),
  options: document.getElementById('options'),
  fillin: document.getElementById('fillin'),
  fillinInput: document.getElementById('fillin-input'),
  submitFillin: document.getElementById('submit-fillin'),
  feedback: document.getElementById('feedback'),
  nextBtn: document.getElementById('next-btn'),
  finalScore: document.getElementById('final-score'),
  wrongList: document.getElementById('wrong-list'),
  restartBtn: document.getElementById('restart-btn'),
};

// State
let questions = [];
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
  els.progress.textContent = `Question ${Math.min(currentIndex + 1, questions.length)} of ${questions.length}`;
  els.score.textContent = `Score: ${score}`;
}

function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

function lockUI(){
  // Disable buttons/inputs after answering
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
  hide(els.nextBtn);
}

async function startQuiz(){
  const file = els.topic.value;
  try{
    const res = await fetch(file);
    if(!res.ok) throw new Error(`Failed to load ${file}`);
    const data = await res.json();
    questions = shuffle([...data]);
  }catch(err){
    alert('Could not load quiz data. Make sure the JSON files are present.
' + err.message);
    return;
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

  const q = questions[currentIndex];
  els.qText.textContent = q.question ?? '';

  // Decide type
  const type = q.type || (q.options ? 'multiple_choice' : 'fill_blank');

  if(type === 'multiple_choice'){
    showMultipleChoice(q);
  } else {
    showFillBlank(q);
  }
}

function showMultipleChoice(q){
  show(els.options);
  hide(els.fillin);

  const correct = q.answer;
  const options = Array.isArray(q.options) ? q.options.slice() : [];
  // Ensure options exist; if not, fallback
  if(options.length === 0 && typeof correct === 'string'){
    options.push(correct);
  }
  // Shuffle options for fairness
  shuffle(options);

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      if(answered) return;
      answered = true;

      const isCorrect = opt === correct;
      if(isCorrect){
        btn.classList.add('correct');
        score += 1;
        setFeedback(true, 'Correct ✅');
      }else{
        btn.classList.add('incorrect');
        setFeedback(false, 'Incorrect ❌');
        wrongAnswers.push({
          question: q.question,
          userAnswer: opt,
          correctAnswer: correct
        });
        // Also highlight the correct one
        [...els.options.querySelectorAll('button')].forEach(b => {
          if(b.textContent === correct) b.classList.add('correct');
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

  function submit(){
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
      wrongAnswers.push({
        question: q.question,
        userAnswer: userRaw,
        correctAnswer: q.answer
      });
    }
    lockUI();
    show(els.nextBtn);
    setProgress();
  }

  els.submitFillin.onclick = submit;
  els.fillinInput.onkeydown = (e) => {
    if(e.key === 'Enter'){ submit(); }
  };
  els.fillinInput.focus();
}

function nextQuestion(){
  answered = false;
  currentIndex += 1;
  if(currentIndex >= questions.length){
    return showSummary();
  }
  renderCurrent();
}

function showSummary(){
  hide(els.quizCard);
  show(els.summaryCard);

  const total = questions.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  els.finalScore.textContent = `Final Score: ${score} / ${total} (${pct}%)`;

  // Wrong answers list
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
  // Return to setup screen (fresh start)
  hide(els.quizCard);
  hide(els.summaryCard);
  show(els.setupCard);
  answered = false;
  currentIndex = 0;
  score = 0;
  wrongAnswers = [];
  els.feedback.textContent = '';
  els.options.innerHTML = '';
  els.fillinInput.value = '';
  setProgress();
}

// Wire up
els.startBtn.addEventListener('click', startQuiz);
els.nextBtn.addEventListener('click', nextQuestion);
els.restartBtn.addEventListener('click', restart);

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

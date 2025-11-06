// ====================== Data ======================
/**
 * A small bank of MCQs. Each question has:
 * text: string, options: string[], answer: index (0..n-1), explain: optional string
 */
const QUESTION_BANK = [
    {
        text: "Which method adds a new element to the end of an array?",
        options: ["push()", "pop()", "shift()", "unshift()"], answer: 0, explain: "push() appends to the end; pop() removes from end; shift()/unshift() work at the start."
    },
    {
        text: "What does '===' check in JavaScript?",
        options: ["Value only", "Type only", "Value and type", "Reference only"], answer: 2, explain: "Strict equality compares both value and type without coercion."
    },
    {
        text: "Which DOM API selects the first match for a CSS selector?",
        options: ["getElementById", "querySelector", "querySelectorAll", "getElementsByClassName"], answer: 1
    },
    {
        text: "What is the default value of an uninitialized variable declared with 'let'?",
        options: ["null", "undefined", "0", "'' (empty string)"], answer: 1
    },
    {
        text: "Which function converts a JSON string into an object?",
        options: ["JSON.stringify", "JSON.parse", "Object.fromJSON", "toJSON"], answer: 1
    },
    {
        text: "Which statement is true about const in JS?",
        options: ["Variables cannot ever change", "The binding can't be reassigned", "It freezes the object", "It's block-scoped and hoisted as initialized"], answer: 1, explain: "const prevents rebinding, but object contents can still change; it's block-scoped."
    },
    {
        text: "How do you schedule code to run after a delay?",
        options: ["setTimeout", "setInterval", "requestAnimationFrame", "Promise.resolve"], answer: 0
    },
    {
        text: "Which method returns a new array with elements that pass a test?",
        options: ["map", "filter", "reduce", "forEach"], answer: 1
    },
    {
        text: "What does localStorage store values as?",
        options: ["Numbers", "Strings", "Objects", "Any type"], answer: 1, explain: "Web Storage stores key/value pairs as strings; we serialize for structured data."
    },
    {
        text: "Which event is best for handling form submission?",
        options: ["click", "submit", "change", "input"], answer: 1
    }
];

// ====================== Helpers ======================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const storage = {
    get(k, fb) { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

function shuffle(array) {
    // Fisher–Yates
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ====================== State ======================
const state = {
    questions: [], // filled with shuffled copy
    index: 0,
    score: 0,
    correct: 0,
    answered: 0,
    startTime: 0,
    timerId: null,
    checked: false, // whether current question has been checked
    selections: [] // selected option indices per question
};

// ====================== Elements ======================
const qCounter = $('#qCounter');
const progressBar = $('#progressBar');
const qEl = $('#question');
const form = $('#optionsForm');
const explain = $('#explain');
const checkBtn = $('#checkBtn');
const nextBtn = $('#nextBtn');
const finishBtn = $('#finishBtn');
const timerEl = $('#timer');

const scoreEl = $('#score');
const bestEl = $('#best');
const answeredEl = $('#answered');
const correctEl = $('#correct');
const totalEl = $('#total');

const resultBox = $('#result');
const summary = $('#summary');
const review = $('#review');

// ====================== Init ======================
function init() {
    state.questions = shuffle([...QUESTION_BANK]);
    state.index = 0; state.score = 0; state.correct = 0; state.answered = 0; state.checked = false; state.selections = [];
    totalEl.textContent = state.questions.length;
    bestEl.textContent = storage.get('bestScore', 0);
    renderQuestion();
    startTimer();
    resultBox.classList.add('hidden');
}

function startTimer() {
    state.startTime = Date.now();
    clearInterval(state.timerId);
    state.timerId = setInterval(() => {
        const secs = Math.floor((Date.now() - state.startTime) / 1000);
        const mm = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');
        timerEl.textContent = `${mm}:${ss}`;
    }, 250);
}

// ====================== Render ======================
function renderQuestion() {
    const i = state.index;
    const q = state.questions[i];
    qCounter.textContent = `Question ${i + 1} / ${state.questions.length}`;
    progressBar.style.width = `${(i) / state.questions.length * 100}%`;
    qEl.textContent = q.text;
    form.innerHTML = '';
    explain.textContent = '';
    state.checked = false;

    q.options.forEach((text, idx) => {
        const label = document.createElement('label');
        label.className = 'opt';
        const input = document.createElement('input');
        input.type = 'radio'; input.name = 'opt'; input.value = String(idx);
        const span = document.createElement('span'); span.textContent = text;
        label.append(input, span);
        form.appendChild(label);
    });

    // Restore selection if any
    const prev = state.selections[i];
    if (prev !== undefined) {
        const inp = $(`input[value="${prev}"]`, form);
        if (inp) { inp.checked = true; }
    }

    // Buttons visibility
    nextBtn.classList.toggle('hidden', i >= state.questions.length - 1);
    finishBtn.classList.toggle('hidden', i < state.questions.length - 1);
}

// ====================== Logic ======================
form.addEventListener('change', () => {
    const val = new FormData(form).get('opt');
    const sel = val !== null ? Number(val) : undefined;
    state.selections[state.index] = sel;
});

checkBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (state.checked) return; // avoid double check
    const sel = state.selections[state.index];
    if (sel === undefined) { alert('Please select an option.'); return; }

    const q = state.questions[state.index];
    const labels = $$('.opt', form);
    labels.forEach((label, idx) => {
        if (idx === q.answer) label.classList.add('correct');
        if (idx === sel && sel !== q.answer) label.classList.add('wrong');
    });

    state.answered++;
    if (sel === q.answer) { state.correct++; state.score += 1; }
    state.checked = true;
    updateStats();

    if (q.explain) { explain.textContent = 'Why: ' + q.explain; }
});

nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (state.index < state.questions.length - 1) {
        state.index++;
        renderQuestion();
    }
});

finishBtn.addEventListener('click', (e) => {
    e.preventDefault();
    endQuiz();
});

$('#resetBtn').addEventListener('click', () => { init(); });

function updateStats() {
    scoreEl.textContent = state.score;
    answeredEl.textContent = state.answered;
    correctEl.textContent = state.correct;
}

function endQuiz() {
    // Stop timer and fill progress
    clearInterval(state.timerId);
    progressBar.style.width = '100%';

    // ===== Auto-grade all questions based on current selections =====
    let computedCorrect = 0;
    let computedAnswered = 0;
    state.questions.forEach((q, i) => {
        const sel = state.selections[i];
        if (sel !== undefined) {
            computedAnswered++;
            if (sel === q.answer) computedCorrect++;
        }
    });
    state.correct = computedCorrect;
    state.answered = computedAnswered;
    state.score = computedCorrect; // 1 point per correct
    updateStats();

    const total = state.questions.length;
    const percent = Math.round((state.score / total) * 100);
    const timeTaken = timerEl.textContent;

    // best score persistence
    const best = Math.max(storage.get('bestScore', 0), state.score);
    storage.set('bestScore', best);
    bestEl.textContent = best;

    // ===== Summary (Option A style) =====
    summary.textContent = `You scored ${state.score}/${total} (${percent}%). Time: ${timeTaken}. Correct answers: ${state.correct}.`;
    resultBox.classList.remove('hidden');
    renderReview();
}

function renderReview() {
    review.innerHTML = '';
    state.questions.forEach((q, i) => {
        const chosen = state.selections[i];
        const block = document.createElement('div');
        block.className = 'card';
        block.style.padding = '12px';
        block.innerHTML = `<strong>Q${i + 1}.</strong> ${q.text}`;

        const list = document.createElement('div');
        list.className = 'options';
        q.options.forEach((text, idx) => {
            const item = document.createElement('div');
            item.className = 'opt';
            if (idx === q.answer) item.classList.add('correct');
            if (idx === chosen && chosen !== q.answer) item.classList.add('wrong');
            item.textContent = text;
            list.appendChild(item);
        });
        block.appendChild(list);
        if (q.explain) {
            const ex = document.createElement('div');
            ex.className = 'muted';
            ex.textContent = 'Why: ' + q.explain;
            block.appendChild(ex);
        }
        review.appendChild(block);
    });
}

$('#playAgainBtn').addEventListener('click', () => init());
$('#reviewBtn').addEventListener('click', () => {
    review.scrollIntoView({ behavior: 'smooth' });
});

// Kickoff
init();

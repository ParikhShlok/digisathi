// script.js
// Beginner-friendly comments throughout explain where Array and Linear Search are used.

// === DATA (Array) ===
// We store all messages in this array. Each element is an object with `text`, `type`, and `explanation`.
// This is the 'Array' in our DSA lesson.
const messages = [
  { text: "Hi, your parcel couldn't be delivered. Click here to reschedule: http://bit.ly/reschedule", type: "fraud", explanation: "Legitimate couriers rarely use shortened links and will usually show your name or tracking ID. Avoid clicking links." },
  { text: "Your bank: We've noticed a login from new device. Verify here: bank.example.com/verify", type: "fraud", explanation: "Banks don't ask you to verify by clicking links in messages. Open the official app/website instead." },
  { text: "Hey, are we still meeting at 5pm?", type: "safe", explanation: "Short, personal messages with context from someone you know are usually safe." },
  { text: "Congratulations! You've won a $1000 voucher. Reply YES to claim.", type: "fraud", explanation: "Unexpected prizes are classic scams. Do not reply or give personal info." },
  { text: "Can you send me the notes from today's class?", type: "safe", explanation: "Typical friend/classmate message — safe if you know the sender." },
  { text: "Your subscription has been canceled. Call 1800-555-000 to reactivate.", type: "fraud", explanation: "Scammers may try to get you to call premium numbers. Check your accounts directly instead." },
  { text: "Reminder: team standup tomorrow 9:30 AM.", type: "safe", explanation: "Work-related reminders from known sources are usually safe." },
  { text: "Urgent! Transfer 5000 now or your account will be closed.", type: "fraud", explanation: "Scary urgent language is used to push quick, emotional reactions — be cautious." }
];

// === STATE ===
let currentIndex = -1;
let score = 0;
let attempts = 0;
let round = 0;

// For no-repeat selection: keep a shuffled list of indices and pop from it.
let remainingIndices = [];

// Shuffle helper (Fisher-Yates)
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

function resetRemaining() {
  remainingIndices = messages.map((_, i) => i);
  shuffleArray(remainingIndices);
}

function getNextIndex() {
  if (remainingIndices.length === 0) resetRemaining();
  return remainingIndices.pop();
}

// === DOM REFERENCES ===
const messageText = document.getElementById('messageText');
const safeBtn = document.getElementById('safeBtn');
const fraudBtn = document.getElementById('fraudBtn');
const resultEl = document.getElementById('result');
const explanationEl = document.getElementById('explanation');
const nextBtn = document.getElementById('nextBtn');
const speakBtn = document.getElementById('speakBtn');
const scoreEl = document.getElementById('score');
const attemptsEl = document.getElementById('attempts');
const roundEl = document.getElementById('round');

// === UTILITY: Random index ===
function pickRandomIndex() {
  // Deprecated for main flow; kept for compatibility.
  return Math.floor(Math.random() * messages.length);
}

// === LINEAR SEARCH ===
// We implement linear search to find the message in the array and verify its type.
// Linear Search: iterate through the array from start to end and compare each element.
// Time complexity: O(n). This is intentionally simple and educational.
function linearSearchCheck(displayedText, userChoice) {
  // We scan `messages` one-by-one to find an object with matching `text`.
  for (let i = 0; i < messages.length; i++) {
    // Compare the text — when we find it, check the type property.
    if (messages[i].text === displayedText) {
      // Return an object with the result and the explanation stored in the array.
      return { found: true, correct: messages[i].type === userChoice, explanation: messages[i].explanation };
    }
  }
  // If not found (shouldn't happen), return not found.
  return { found: false, correct: false, explanation: 'Message not found in database.' };
}

// === UI UPDATE: Show new message ===
function showMessage(index) {
  currentIndex = index;
  round++;
  roundEl.textContent = round;
  messageText.textContent = messages[index].text;
  // hide previous feedback
  resultEl.classList.add('hidden');
  explanationEl.classList.add('hidden');
  // Re-enable choice buttons when a new message appears
  safeBtn.disabled = false;
  fraudBtn.disabled = false;
  // Update progress bar: fraction of messages used in current cycle
  const used = (messages.length - remainingIndices.length);
  const pct = Math.round((used / messages.length) * 100);
  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = pct + '%';
}

// === Handle user selection ===
function handleChoice(choice) {
  const displayed = messages[currentIndex].text;
  // Use linear search to verify correctness (educational purpose).
  const check = linearSearchCheck(displayed, choice);

  attempts++;
  attemptsEl.textContent = attempts;

  if (check.found) {
    if (check.correct) {
      score++;
      scoreEl.textContent = score;
      resultEl.textContent = 'Correct ✔️';
      resultEl.style.color = '#0a6a2b';
    } else {
      resultEl.textContent = 'Wrong ⚠️';
      resultEl.style.color = '#9b2a2b';
    }

    // Show explanation from the array with an icon
    explanationEl.innerHTML = (check.correct ? '<span class="icon">✔️</span>' : '<span class="icon">⚠️</span>') + ' ' + check.explanation;
    resultEl.classList.remove('hidden');
    explanationEl.classList.remove('hidden');
    // Disable choice buttons after answer to prevent repeated clicks
    safeBtn.disabled = true;
    fraudBtn.disabled = true;
  } else {
    resultEl.textContent = 'Error: message not found in array.';
    resultEl.classList.remove('hidden');
  }
}

// === NEXT MESSAGE ===
function nextMessage() {
  // Use the no-repeat shuffled list of indices for better learning coverage.
  const idx = getNextIndex();
  showMessage(idx);
}

// === Text-to-Speech ===
function speakExplanation() {
  // Speak only the explanation text (strip icons if any)
  const raw = explanationEl.textContent || '';
  // Remove leading icon characters like ✔️ or ⚠️ and trim
  const text = raw.replace(/^[^a-zA-Z0-9\u00C0-\u024F]+\s*/, '').trim();
  if (!text) return;
  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } else {
    alert('Text-to-speech not supported in this browser.');
  }
}

// === EVENT LISTENERS ===
safeBtn.addEventListener('click', () => handleChoice('safe'));
fraudBtn.addEventListener('click', () => handleChoice('fraud'));
nextBtn.addEventListener('click', nextMessage);
speakBtn.addEventListener('click', speakExplanation);

// === INITIALIZE GAME ===
// Start with a random message so the app is ready-to-use.
(function init() {
  scoreEl.textContent = score;
  attemptsEl.textContent = attempts;
  // Prepare no-repeat indices and show the first message
  resetRemaining();
  const startIndex = getNextIndex();
  showMessage(startIndex);
})();

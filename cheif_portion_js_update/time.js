// ======================================================================
// RUSTIC FORK - TIME & SHIFTS PAGE SCRIPT
// File: time.js
//
// IMPORTANT: This file does NOT change any HTML or CSS.
// It just makes the empty boxes already in time.html (like
// <span id="clockTime">) update themselves, and makes the buttons
// that are already on the page actually work.
//
// What this file does, in plain words:
//   1. Remembers whether the chef is clocked in right now, and since
//      what exact moment, using localStorage.
//   2. Every second, updates the big clock to show how long the
//      current shift has been running.
//   3. Lets the chef press the big green/red button to clock in
//      or clock out.
//   4. The +15m / -15m buttons nudge the start time, in case the
//      chef forgot to clock in/out right on time.
//   5. "Reset" cancels the shift that is currently running.
//   6. Every time the chef clocks out, we save that shift into a
//      list, add up "This week" hours, and fill the progress bar.
//   7. Also makes the shared header (profile menu + shift button)
//      work, and keeps it matching the real clock state.
// ======================================================================


// ----------------------------------------------------------------------
// PART 1: SETTINGS
// ----------------------------------------------------------------------

// Where we save things in the browser's little notebook (localStorage).
var ACTIVE_SHIFT_KEY = "rf_active_shift"; // the shift that is running right now (or nothing)
var SHIFT_HISTORY_KEY = "rf_shift_history"; // the list of finished shifts
var SHIFT_STORAGE_KEY = "rf_on_shift"; // the simple on/off flag other pages read

// How many hours count as "full" for the progress bar.
var WEEKLY_GOAL_HOURS = 40;


// ----------------------------------------------------------------------
// PART 2: SMALL HELPER FUNCTIONS
// ----------------------------------------------------------------------

function showToast(message) {
  var toastBox = document.getElementById("toast");
  if (!toastBox) {
    return;
  }
  toastBox.textContent = message;
  toastBox.classList.add("show");
  window.clearTimeout(window._toastTimer);
  window._toastTimer = window.setTimeout(function () {
    toastBox.classList.remove("show");
  }, 2500);
}

// Turns two-digit numbers like the hour "9" into "09", so the clock
// always looks tidy.
function twoDigits(number) {
  if (number < 10) {
    return "0" + number;
  }
  return "" + number;
}

// Turns a number of milliseconds into "01h:23m:45s".
function formatClock(totalMs) {
  var totalSeconds = Math.floor(totalMs / 1000);
  var hours = Math.floor(totalSeconds / 3600);
  var minutes = Math.floor((totalSeconds % 3600) / 60);
  var seconds = totalSeconds % 60;
  return twoDigits(hours) + "h:" + twoDigits(minutes) + "m:" + twoDigits(seconds) + "s";
}

// Turns a number of milliseconds into a friendlier "8h 13m" label,
// used for the weekly total and the shift history list.
function formatHoursMinutes(totalMs) {
  var totalMinutes = Math.round(totalMs / 60000);
  var hours = Math.floor(totalMinutes / 60);
  var minutes = totalMinutes % 60;
  return hours + "h " + twoDigits(minutes) + "m";
}

// Turns a clock timestamp into something like "8:02 AM".
function formatTimeOfDay(timestampMs) {
  var date = new Date(timestampMs);
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? "PM" : "AM";
  var hour12 = hours % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }
  return hour12 + ":" + twoDigits(minutes) + " " + ampm;
}

// Turns a timestamp into "Mon, Sep 7".
function formatShortDate(timestampMs) {
  var date = new Date(timestampMs);
  var weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return weekdayNames[date.getDay()] + ", " + monthNames[date.getMonth()] + " " + date.getDate();
}

// Turns today's date into "Monday, September 7, 2026", for the text
// under the big clock.
function formatFullDate(timestampMs) {
  var date = new Date(timestampMs);
  var weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return weekdayNames[date.getDay()] + ", " + monthNames[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
}


// ----------------------------------------------------------------------
// PART 3: LOADING AND SAVING SHIFT INFORMATION
// ----------------------------------------------------------------------

// Returns the start time (in milliseconds) of the shift that is
// running right now, or null if the chef is not clocked in.
function getActiveShiftStart() {
  var text = localStorage.getItem(ACTIVE_SHIFT_KEY);
  if (!text) {
    return null;
  }
  return Number(text);
}

function setActiveShiftStart(timestampMsOrNull) {
  if (timestampMsOrNull === null) {
    localStorage.removeItem(ACTIVE_SHIFT_KEY);
  } else {
    localStorage.setItem(ACTIVE_SHIFT_KEY, "" + timestampMsOrNull);
  }
}

function loadShiftHistory() {
  var text = localStorage.getItem(SHIFT_HISTORY_KEY);
  if (!text) {
    return [];
  }
  return JSON.parse(text);
}

function saveShiftHistory(historyList) {
  localStorage.setItem(SHIFT_HISTORY_KEY, JSON.stringify(historyList));
}


// ----------------------------------------------------------------------
// PART 4: THE BIG CLOCK
// ----------------------------------------------------------------------

// Redraws the big clock number, the button, and the date line.
function renderClock() {
  var startTime = getActiveShiftStart();
  var clockTimeEl = document.getElementById("clockTime");
  var clockBtn = document.getElementById("clockBtn");

  if (startTime) {
    // On shift: show how long it has been running.
    var elapsedMs = Date.now() - startTime;
    clockTimeEl.textContent = formatClock(elapsedMs);
    clockBtn.innerHTML = "⏹<br/>Clock Out";
    clockBtn.classList.add("stop");
  } else {
    // Off shift: show all zeros.
    clockTimeEl.textContent = "00h:00m:00s";
    clockBtn.innerHTML = "▶<br/>Clock In";
    clockBtn.classList.remove("stop");
  }

  document.getElementById("clockDate").textContent = formatFullDate(Date.now());
}


// ----------------------------------------------------------------------
// PART 5: THIS WEEK'S HOURS + PROGRESS BAR
// ----------------------------------------------------------------------

// Works out the very first moment of "this week" (we count Sunday as
// the first day), so we know which past shifts to add up.
function getStartOfThisWeek() {
  var now = new Date();
  var daysSinceSunday = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  var startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceSunday);
  return startOfWeek.getTime();
}

function renderWeekSummary() {
  var startOfWeek = getStartOfThisWeek();
  var history = loadShiftHistory();

  // Add up every finished shift that happened this week.
  var totalMs = 0;
  for (var i = 0; i < history.length; i++) {
    if (history[i].clockIn >= startOfWeek) {
      totalMs += history[i].durationMs;
    }
  }

  // If the chef is clocked in right now, count that time too.
  var activeStart = getActiveShiftStart();
  if (activeStart && activeStart >= startOfWeek) {
    totalMs += Date.now() - activeStart;
  }

  document.getElementById("weekHours").textContent = formatHoursMinutes(totalMs);

  var totalHours = totalMs / 3600000;
  var percent = Math.min(100, Math.round((totalHours / WEEKLY_GOAL_HOURS) * 100));
  document.getElementById("weekBar").style.width = percent + "%";
}


// ----------------------------------------------------------------------
// PART 6: THE "RECENT SHIFTS" LIST
// ----------------------------------------------------------------------

function renderShiftHistory() {
  var history = loadShiftHistory();
  var box = document.getElementById("shiftRows");

  if (history.length === 0) {
    box.innerHTML = '<div class="tiny" style="text-align:center;padding:14px 0">No completed shifts yet.</div>';
    return;
  }

  // Show the newest shift first.
  var sortedHistory = history.slice().reverse();

  var html = "";
  for (var i = 0; i < sortedHistory.length; i++) {
    var shift = sortedHistory[i];
    html += '<div class="detail-row" style="padding:8px 0;border-top:1px solid var(--border-color)">';
    html += "  <div>";
    html += "    <b>" + formatShortDate(shift.clockIn) + "</b>";
    html += '    <div class="tiny">' + formatTimeOfDay(shift.clockIn) + " – " + formatTimeOfDay(shift.clockOut) + "</div>";
    html += "  </div>";
    html += '  <b style="color:var(--accent-dark)">' + formatHoursMinutes(shift.durationMs) + "</b>";
    html += "</div>";
  }
  box.innerHTML = html;
}


// ----------------------------------------------------------------------
// PART 7: PUTTING IT ALL TOGETHER
// ----------------------------------------------------------------------

function renderEverything() {
  renderClock();
  renderWeekSummary();
  renderShiftHistory();
  paintHeaderShiftChip();
}


// ----------------------------------------------------------------------
// PART 8: THE CLOCK IN / CLOCK OUT BUTTON
// ----------------------------------------------------------------------

var clockButton = document.getElementById("clockBtn");
if (clockButton) {
  clockButton.addEventListener("click", function () {
    var startTime = getActiveShiftStart();

    if (startTime) {
      // The chef was clocked in, so this click means "clock out".
      var finishedShift = {
        clockIn: startTime,
        clockOut: Date.now(),
        durationMs: Date.now() - startTime
      };
      var history = loadShiftHistory();
      history.push(finishedShift);
      saveShiftHistory(history);

      setActiveShiftStart(null);
      localStorage.setItem(SHIFT_STORAGE_KEY, "false");
      showToast("Clocked out. Shift saved: " + formatHoursMinutes(finishedShift.durationMs) + ".");
    } else {
      // The chef was off shift, so this click means "clock in".
      setActiveShiftStart(Date.now());
      localStorage.setItem(SHIFT_STORAGE_KEY, "true");
      showToast("Clocked in. Have a great shift!");
    }

    renderEverything();
  });
}


// ----------------------------------------------------------------------
// PART 9: THE -15m / +15m / RESET BUTTONS
// ----------------------------------------------------------------------

// The -15m and +15m buttons both use the same "data-adjust" attribute
// in the HTML, so we can find them both at once.
var adjustButtons = document.querySelectorAll("[data-adjust]");
for (var a = 0; a < adjustButtons.length; a++) {
  adjustButtons[a].addEventListener("click", function (event) {
    var startTime = getActiveShiftStart();
    if (!startTime) {
      showToast("Clock in first before adjusting the time.");
      return;
    }
    var minutesToAdjust = Number(event.currentTarget.getAttribute("data-adjust"));

    // Moving the start time earlier makes the shift look LONGER.
    // Moving it later makes the shift look SHORTER. So "+15m" (make
    // the logged time 15 minutes longer) means we move the start
    // time 15 minutes earlier, and "-15m" moves it later.
    var newStartTime = startTime - minutesToAdjust * 60000;

    // Do not allow the start time to be in the future.
    if (newStartTime > Date.now()) {
      newStartTime = Date.now();
    }

    setActiveShiftStart(newStartTime);
    renderEverything();
  });
}

var resetShiftButton = document.getElementById("resetShift");
if (resetShiftButton) {
  resetShiftButton.addEventListener("click", function () {
    var startTime = getActiveShiftStart();
    if (!startTime) {
      showToast("There is no running shift to reset.");
      return;
    }
    var sure = window.confirm("Reset the current shift? This will not be saved.");
    if (!sure) {
      return;
    }
    setActiveShiftStart(null);
    localStorage.setItem(SHIFT_STORAGE_KEY, "false");
    showToast("Shift reset.");
    renderEverything();
  });
}


// ----------------------------------------------------------------------
// PART 10: THE HEADER (profile picture menu + shift button)
// This page's header shift button is special: instead of being its
// own separate on/off switch, it always matches the real clock
// above, and clicking it clocks the chef in or out (same as
// pressing the big round button).
// ----------------------------------------------------------------------

function paintHeaderShiftChip() {
  var shiftChipButton = document.getElementById("shiftChip");
  if (!shiftChipButton) {
    return;
  }
  var isOnShift = getActiveShiftStart() !== null;
  if (isOnShift) {
    shiftChipButton.textContent = "● On Shift";
    shiftChipButton.classList.add("on");
  } else {
    shiftChipButton.textContent = "● Off Shift";
    shiftChipButton.classList.remove("on");
  }
}

var shiftChipButton = document.getElementById("shiftChip");
if (shiftChipButton) {
  shiftChipButton.addEventListener("click", function () {
    // Just re-use the exact same button logic as the big clock
    // button, so both controls always agree with each other.
    document.getElementById("clockBtn").click();
  });
}

var avatarButton = document.getElementById("avatarBtn");
var accountMenu = document.getElementById("accountMenu");
if (avatarButton && accountMenu) {
  avatarButton.addEventListener("click", function (event) {
    event.stopPropagation();
    accountMenu.classList.toggle("open");
  });
  document.addEventListener("click", function () {
    accountMenu.classList.remove("open");
  });
}

var accountDetailsButton = document.getElementById("accountDetailsBtn");
if (accountDetailsButton) {
  accountDetailsButton.addEventListener("click", function () {
    showToast("Account details are not available in this demo yet.");
  });
}

var switchChefButton = document.getElementById("switchChefBtn");
if (switchChefButton) {
  switchChefButton.addEventListener("click", function () {
    showToast("Switch chef is not available in this demo yet.");
  });
}


// ----------------------------------------------------------------------
// PART 11: POPUP WINDOW (MODAL) CLOSING
// This page does not open its own popups yet, but this keeps every
// page consistent in case one is added later.
// ----------------------------------------------------------------------

document.body.addEventListener("click", function (event) {
  if (event.target.getAttribute && event.target.getAttribute("data-action") === "close-modal") {
    var modalBackdrop = document.getElementById("modal");
    if (modalBackdrop) {
      modalBackdrop.classList.remove("open");
    }
  }
});

var modalBackdropEl = document.getElementById("modal");
if (modalBackdropEl) {
  modalBackdropEl.addEventListener("click", function (event) {
    if (event.target === modalBackdropEl) {
      modalBackdropEl.classList.remove("open");
    }
  });
}


// ----------------------------------------------------------------------
// PART 12: START EVERYTHING UP
// ----------------------------------------------------------------------

renderEverything();

// Redraw every second so the big clock keeps ticking while the chef
// is clocked in.
window.setInterval(renderEverything, 1000);

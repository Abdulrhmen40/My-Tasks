/* ====== بيانات وتهيئة ====== */
const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const tasksContainer = document.getElementById("tasksContainer");
const counter = document.getElementById("counter");
const totalNum = document.getElementById("totalNum");
const activeNum = document.getElementById("activeNum");
const filterBtns = document.querySelectorAll(".filter-btn");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");
const sortBtn = document.getElementById("sortBtn");
const sortModeLabel = document.getElementById("sortMode");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const fileInput = document.getElementById("fileInput");
const clearAllBtn = document.getElementById("clearAllBtn");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const themeToggle = document.getElementById("themeToggle");
const lastSavedLabel = document.getElementById("lastSaved");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");

let state = {
  tasks: [], // كل مهمة: {id, text, completed, createdAt}
  filter: "all", // all | active | completed
  search: "",
  sort: "new-first", // new-first | old-first
  theme: localStorage.getItem("theme") || "dark",
  history: [],
  historyIndex: -1,
};

// helpers
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ====== ثيم ====== */
function applyTheme() {
  if (state.theme === "light") {
    document.documentElement.classList.add("light");
    localStorage.setItem("theme", "light");
  } else {
    document.documentElement.classList.remove("light");
    localStorage.setItem("theme", "dark");
  }
}
// init theme
applyTheme();
themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  applyTheme();
});

/* ====== حفظ واستعادة (localStorage) ====== */
function saveToLocal() {
  const payload = {
    tasks: state.tasks.slice(),
    sort: state.sort,
    theme: state.theme,
  };
  localStorage.setItem("todo_v2", JSON.stringify(payload));
  lastSavedLabel.textContent = new Date().toLocaleString();
  // history push
  pushHistory();
}

function loadFromLocal() {
  const raw = localStorage.getItem("todo_v2");
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    state.tasks = Array.isArray(data.tasks) ? data.tasks : [];
    state.sort = data.sort || "new-first";
    state.theme = data.theme || state.theme;
    applyTheme();
  } catch (e) {
    console.warn("load error", e);
  }
}

// History (simple undo/redo snapshot of tasks array)
function pushHistory() {
  // keep small history
  const snap = JSON.stringify(state.tasks);
  if (state.history[state.history.length - 1] === snap) return;
  state.history.push(snap);
  if (state.history.length > 50) state.history.shift();
  state.historyIndex = state.history.length - 1;
}
function undo() {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    state.tasks = JSON.parse(state.history[state.historyIndex]);
    render();
    saveToLocal();
  }
}
function redo() {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    state.tasks = JSON.parse(state.history[state.historyIndex]);
    render();
    saveToLocal();
  }
}
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

/* ====== إضافة مهمة ====== */
function addTask(text) {
  if (!text || !text.trim()) return;
  const t = {
    id: uid(),
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
  };
  state.tasks.unshift(t);
  saveToLocal();
  render();
}

addBtn.addEventListener("click", () => {
  addTask(taskInput.value);
  taskInput.value = "";
  taskInput.focus();
});
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addTask(taskInput.value);
    taskInput.value = "";
  }
});

/* ====== إنشاء عنصر مهمة ====== */
function createTaskElement(task) {
  const el = document.createElement("div");
  el.className = "task fade-in";
  el.dataset.id = task.id;
  el.setAttribute("draggable", "true");

  // checkbox
  const cb = document.createElement("div");
  cb.className = "checkbox" + (task.completed ? " checked" : "");
  cb.innerHTML = task.completed ? "✔" : "";
  cb.title = "تبديل الحالة";
  cb.addEventListener("click", () => {
    task.completed = !task.completed;
    render();
    saveToLocal();
  });

  // body
  const body = document.createElement("div");
  body.className = "task-body";
  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = task.text;
  title.title = "اضغط مرتين للتعديل";
  title.classList.add("editable");
  title.contentEditable = false;

  // meta
  const meta = document.createElement("div");
  meta.className = "task-meta muted";
  const created = new Date(task.createdAt);
  meta.innerHTML = `<span>معرف: <strong>${task.id.slice(
    -6
  )}</strong></span><span>تم الإنشاء: ${created.toLocaleString()}</span>`;

  body.appendChild(title);
  body.appendChild(meta);

  // actions
  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "btn ghost";
  editBtn.innerHTML = "✏️";
  editBtn.title = "تعديل المهمة";
  editBtn.addEventListener("click", () => startEditing(title, task));

  const delBtn = document.createElement("button");
  delBtn.className = "btn ghost";
  delBtn.innerHTML = "🗑";
  delBtn.title = "حذف";
  delBtn.addEventListener("click", () => {
    state.tasks = state.tasks.filter((t) => t.id !== task.id);
    render();
    saveToLocal();
  });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  // double click to edit
  title.addEventListener("dblclick", () => startEditing(title, task));

  // on blur or Enter save edit
  title.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      title.blur();
    }
  });
  title.addEventListener("blur", () => {
    if (title.textContent.trim() === "") {
      // prevent empty — restore previous
      const old = state.tasks.find((t) => t.id === task.id);
      title.textContent = old ? old.text : "بدون عنوان";
    } else {
      const old = state.tasks.find((t) => t.id === task.id);
      if (old && old.text !== title.textContent.trim()) {
        old.text = title.textContent.trim();
        saveToLocal();
        render(); // re-render to update meta etc
      }
    }
  });

  el.appendChild(cb);
  el.appendChild(body);
  el.appendChild(actions);

  // drag handlers
  el.addEventListener("dragstart", (e) => {
    el.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  });
  el.addEventListener("dragend", () => {
    el.classList.remove("dragging");
  });

  return el;
}

function startEditing(titleEl, task) {
  titleEl.contentEditable = true;
  titleEl.focus();
  // move caret to end
  document
    .getSelection()
    .collapse(titleEl.firstChild || titleEl, titleEl.textContent.length);
}

/* ====== Render ====== */
function render() {
  // filter & search & sort
  let list = state.tasks.slice();
  if (state.search && state.search.trim() !== "") {
    const q = state.search.toLowerCase();
    list = list.filter((t) => t.text.toLowerCase().includes(q));
  }
  if (state.filter === "active") list = list.filter((t) => !t.completed);
  if (state.filter === "completed") list = list.filter((t) => t.completed);
  if (state.sort === "new-first")
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // clear and populate
  tasksContainer.innerHTML = "";
  if (list.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    list.forEach((task) => {
      const el = createTaskElement(task);
      tasksContainer.appendChild(el);
    });
  }

  // stats
  totalNum.textContent = state.tasks.length;
  activeNum.textContent = state.tasks.filter((t) => !t.completed).length;
  counter.textContent = `${state.tasks.length} مهام — ${
    state.tasks.filter((t) => !t.completed).length
  } متبقي`;

  // maintain filter button active class
  filterBtns.forEach((b) => {
    if (b.dataset.filter === state.filter) b.classList.add("active");
    else b.classList.remove("active");
  });

  // update sort label
  sortModeLabel.textContent =
    state.sort === "new-first" ? "جديد → قديم" : "قديم → جديد";
}

/* ====== Filters & Search & Sort handlers ====== */
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.filter = btn.dataset.filter;
    render();
  });
});

searchInput.addEventListener("input", (e) => {
  state.search = e.target.value;
  render();
});

sortBtn.addEventListener("click", () => {
  state.sort = state.sort === "new-first" ? "old-first" : "new-first";
  render();
  saveToLocal();
});

/* ====== Drag & Drop container handling to reorder tasks ====== */
tasksContainer.addEventListener("dragover", (e) => {
  e.preventDefault();
  const after = getDragAfterElement(tasksContainer, e.clientY);
  const dragging = document.querySelector(".dragging");
  if (!dragging) return;
  if (after == null) tasksContainer.appendChild(dragging);
  else tasksContainer.insertBefore(dragging, after);
});

tasksContainer.addEventListener("drop", (e) => {
  e.preventDefault();
  // compute new order from DOM and update state.tasks accordingly
  const newOrderIds = Array.from(tasksContainer.children).map(
    (ch) => ch.dataset.id
  );
  const map = new Map(state.tasks.map((t) => [t.id, t]));
  const reordered = [];
  newOrderIds.forEach((id) => {
    if (map.has(id)) reordered.push(map.get(id));
  });
  // also append any tasks not currently in filtered view (to preserve)
  state.tasks.forEach((t) => {
    if (!reordered.find((x) => x.id === t.id)) reordered.push(t);
  });
  state.tasks = reordered;
  render();
  saveToLocal();
});

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".task:not(.dragging)"),
  ];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else return closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

/* ====== Export / Import JSON ====== */
exportBtn.addEventListener("click", () => {
  const payload = {
    tasks: state.tasks.slice(),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tasks-backup-${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (Array.isArray(data.tasks)) {
        // merge with IDs unique: skip duplicates by id, else append
        const existingIds = new Set(state.tasks.map((t) => t.id));
        const toAdd = data.tasks
          .filter((t) => !existingIds.has(t.id))
          .map((t) => ({
            id: t.id || uid(),
            text: t.text || "بدون عنوان",
            completed: !!t.completed,
            createdAt: t.createdAt || new Date().toISOString(),
          }));
        state.tasks = toAdd.concat(state.tasks); // imported first
        saveToLocal();
        render();
      } else {
        alert("الملف لا يحتوي على قائمة مهام صحيحة.");
      }
    } catch (err) {
      alert("فشل قراءة الملف: " + err.message);
    }
  };
  reader.readAsText(file);
  // clear input
  fileInput.value = "";
});

/* ====== Clear actions ====== */
clearAllBtn.addEventListener("click", () => {
  if (!confirm("هل تريد حذف كل المهام؟ هذه العملية لا يمكن التراجع عنها."))
    return;
  state.tasks = [];
  render();
  saveToLocal();
});

clearCompletedBtn.addEventListener("click", () => {
  state.tasks = state.tasks.filter((t) => !t.completed);
  render();
  saveToLocal();
});

/* ====== Utility: start app, load data ====== */
loadFromLocal();
render();

/* ====== Helper: get element by y position (already above) ====== */

/* ====== last: small helper to ensure tasksContainer is keyboard accessible ====== */
// focus management: focus first task on pressing ArrowDown from input
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    const first = tasksContainer.querySelector(".task");
    if (first) first.focus();
  }
});

// expose add via global for debug (optional)
window.__addTask = addTask;

// push initial history snapshot
pushHistory();

// save periodically (every 8s) to ensure lastSaved updated
setInterval(() => saveToLocal(), 8000);

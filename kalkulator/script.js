(() => {
  "use strict";

  const OPS = ["+", "−", "×", "÷"];
  const HISTORY_KEY = "kalkulator.history";
  const THEME_KEY = "kalkulator.theme";
  const MAX_HISTORY = 50;

  const $ = (id) => document.getElementById(id);
  const exprEl = $("expression");
  const resultEl = $("result");
  const keysEl = $("keys");
  const historyEl = $("history");
  const historyList = $("historyList");
  const historyEmpty = $("historyEmpty");
  const toastEl = $("toast");

  const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 10 });

  let expr = "";            // internal expression, uses "." as decimal separator
  let justEvaluated = false;
  let lastExpr = "";
  let history = load(HISTORY_KEY, []);

  // ---------- Safe parser (no eval) ----------

  function tokenize(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (/[0-9.]/.test(ch)) {
        let j = i;
        while (j < src.length && /[0-9.]/.test(src[j])) j++;
        const text = src.slice(i, j);
        if ((text.match(/\./g) || []).length > 1) throw new Error("Angka tidak valid");
        tokens.push({ type: "num", value: parseFloat(text === "." ? "0" : text) });
        i = j;
      } else if ("+−×÷%()".includes(ch)) {
        tokens.push({ type: "op", value: ch });
        i++;
      } else {
        throw new Error("Karakter tidak dikenal");
      }
    }
    return tokens;
  }

  function evaluate(src) {
    const tokens = tokenize(src);
    let pos = 0;
    const peek = () => tokens[pos];
    const isOp = (t, v) => t && t.type === "op" && t.value === v;

    function parseExpr() {
      let left = parseTerm();
      while (isOp(peek(), "+") || isOp(peek(), "−")) {
        const op = tokens[pos++].value;
        const right = parseTerm();
        left = op === "+" ? left + right : left - right;
      }
      return left;
    }

    function parseTerm() {
      let left = parseUnary();
      for (;;) {
        const t = peek();
        if (isOp(t, "×") || isOp(t, "÷")) {
          pos++;
          const right = parseUnary();
          if (t.value === "÷" && right === 0) throw new Error("Tidak bisa dibagi nol");
          left = t.value === "×" ? left * right : left / right;
        } else if (t && (t.type === "num" || isOp(t, "("))) {
          left *= parseUnary(); // implicit multiplication: 2(3) or (2)(3)
        } else {
          return left;
        }
      }
    }

    function parseUnary() {
      if (isOp(peek(), "−")) { pos++; return -parseUnary(); }
      if (isOp(peek(), "+")) { pos++; return parseUnary(); }
      return parsePostfix();
    }

    function parsePostfix() {
      let value = parsePrimary();
      while (isOp(peek(), "%")) { pos++; value /= 100; }
      return value;
    }

    function parsePrimary() {
      const t = tokens[pos++];
      if (!t) throw new Error("Ekspresi belum lengkap");
      if (t.type === "num") return t.value;
      if (t.value === "(") {
        const v = parseExpr();
        if (isOp(peek(), ")")) pos++;
        else if (pos < tokens.length) throw new Error("Kurung tidak cocok");
        return v; // allow missing closing parentheses at the end
      }
      throw new Error("Ekspresi tidak valid");
    }

    if (!tokens.length) return 0;
    const value = parseExpr();
    if (pos < tokens.length) throw new Error("Ekspresi tidak valid");
    if (!Number.isFinite(value)) throw new Error("Hasil terlalu besar");
    return parseFloat(value.toPrecision(12)); // tame floating point noise (0.1 + 0.2)
  }

  // ---------- Formatting ----------

  function formatNumber(n) {
    if (Math.abs(n) >= 1e15 || (n !== 0 && Math.abs(n) < 1e-9)) {
      return n.toExponential(6).replace(".", ",").replace("e", "×10^").replace("+", "");
    }
    return numberFormat.format(n).replace("-", "−");
  }

  function formatExpr(src) {
    // Group digits of each number for readability and use "," as decimal separator.
    return src.replace(/[0-9.]+/g, (m) => {
      const [int, dec] = m.split(".");
      const grouped = int ? Number(int).toLocaleString("id-ID") : "0";
      return dec !== undefined ? `${grouped},${dec}` : grouped;
    });
  }

  function numberToExpr(n) {
    let s = String(n);
    if (s.includes("e")) s = n.toFixed(10).replace(/\.?0+$/, "");
    return s.replace("-", "−");
  }

  // ---------- Rendering ----------

  function fitText() {
    const len = resultEl.textContent.length;
    const base = resultEl.classList.contains("preview") ? 32 : 52;
    const size = len > 9 ? Math.max(24, Math.floor(base * 9 / len)) : base;
    resultEl.style.fontSize = resultEl.classList.contains("error") ? "" : size + "px";
  }

  function render() {
    resultEl.classList.remove("error", "preview");
    if (justEvaluated) {
      exprEl.textContent = lastExpr ? formatExpr(lastExpr) + " =" : "";
      resultEl.textContent = expr ? formatNumber(evaluate(expr)) : "0";
    } else if (!expr) {
      exprEl.textContent = "";
      resultEl.textContent = "0";
    } else {
      exprEl.textContent = formatExpr(expr);
      exprEl.scrollLeft = exprEl.scrollWidth;
      resultEl.classList.add("preview");
      let preview = "";
      try {
        const trimmed = expr.replace(/[+−×÷(]+$/, "");
        if (trimmed) preview = formatNumber(evaluate(trimmed));
      } catch { /* incomplete expression: no preview */ }
      resultEl.textContent = preview || " ";
    }
    fitText();
  }

  function showError(message) {
    resultEl.classList.remove("preview");
    resultEl.classList.add("error");
    resultEl.textContent = message;
    resultEl.style.fontSize = "";
  }

  // ---------- Input handling ----------

  const lastChar = () => expr.slice(-1);
  const isDigit = (c) => /[0-9]/.test(c);
  const openParens = () => (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length;

  function startFresh() {
    if (justEvaluated) { expr = ""; justEvaluated = false; }
  }

  function continueFromResult() {
    justEvaluated = false;
  }

  function input(value) {
    if (isDigit(value)) {
      startFresh();
      if (lastChar() === ")" || lastChar() === "%") expr += "×";
      // avoid leading zeros like "007"
      const m = expr.match(/(^|[^0-9.])0$/);
      if (m) expr = expr.slice(0, -1);
      expr += value;
    } else if (value === ".") {
      startFresh();
      const current = expr.match(/[0-9.]*$/)[0];
      if (current.includes(".")) return;
      if (lastChar() === ")" || lastChar() === "%") expr += "×";
      expr += current ? "." : "0.";
    } else if (OPS.includes(value)) {
      continueFromResult();
      const last = lastChar();
      if (!expr) {
        if (value === "−") expr = "−";
        else expr = "0" + value;
      } else if (last === "(") {
        if (value === "−") expr += value;
      } else if (OPS.includes(last)) {
        // replace operator, but allow "×−" / "÷−" for negative numbers
        if (value === "−" && (last === "×" || last === "÷")) expr += value;
        else {
          expr = expr.replace(/[+−×÷]+$/, "");
          if (expr && lastChar() !== "(") expr += value;
          else if (value === "−") expr += value;
        }
      } else if (last === ".") {
        expr += "0" + value;
      } else {
        expr += value;
      }
    } else if (value === "%") {
      continueFromResult();
      const last = lastChar();
      if (isDigit(last) || last === ")" || last === "%") expr += "%";
    } else if (value === "(") {
      startFresh();
      const last = lastChar();
      if (isDigit(last) || last === ")" || last === "%") expr += "×";
      expr += "(";
    } else if (value === ")") {
      continueFromResult();
      const last = lastChar();
      if (openParens() > 0 && (isDigit(last) || last === ")" || last === "%" || last === ".")) expr += ")";
    }
    render();
  }

  function clearAll() {
    expr = "";
    lastExpr = "";
    justEvaluated = false;
    render();
  }

  function backspace() {
    if (justEvaluated) { justEvaluated = false; lastExpr = ""; }
    expr = expr.slice(0, -1);
    render();
  }

  function negate() {
    if (justEvaluated) {
      expr = expr.startsWith("−") ? expr.slice(1) : "−" + expr;
      lastExpr = "";
      render();
      return;
    }
    const m = expr.match(/[0-9.]+%*$/);
    if (!m) return;
    const start = expr.length - m[0].length;
    const before = expr.slice(0, start);
    const prev = before.slice(-1);
    const prevPrev = before.slice(-2, -1);
    const prevIsUnaryMinus = prev === "−" && (prevPrev === "" || OPS.includes(prevPrev) || prevPrev === "(");
    expr = prevIsUnaryMinus ? before.slice(0, -1) + m[0] : before + "−" + m[0];
    render();
  }

  function equals() {
    if (!expr || justEvaluated) return;
    try {
      const source = expr.replace(/[+−×÷(]+$/, "");
      const value = evaluate(source);
      const closed = source + ")".repeat(Math.max(0, openParens()));
      lastExpr = closed;
      addHistory(closed, value);
      expr = numberToExpr(value);
      justEvaluated = true;
      render();
      resultEl.classList.remove("pop");
      void resultEl.offsetWidth;
      resultEl.classList.add("pop");
    } catch (err) {
      showError(err.message);
    }
  }

  const actions = { clear: clearAll, backspace, negate, equals };

  keysEl.addEventListener("click", (e) => {
    const key = e.target.closest(".key");
    if (!key) return;
    if (key.dataset.action) actions[key.dataset.action]();
    else input(key.dataset.value);
  });

  // ---------- Keyboard ----------

  const keyMap = {
    "+": "+", "-": "−", "*": "×", "x": "×", "X": "×", "/": "÷", ":": "÷",
    "%": "%", "(": "(", ")": ")", ".": ".", ",": ".",
  };

  function flashKey(selector) {
    const el = keysEl.querySelector(selector);
    if (!el) return;
    el.classList.add("pressed");
    setTimeout(() => el.classList.remove("pressed"), 120);
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) {
      input(k); flashKey(`[data-value="${k}"]`);
    } else if (keyMap[k]) {
      input(keyMap[k]); flashKey(`[data-value="${keyMap[k]}"]`);
    } else if (k === "Enter" || k === "=") {
      e.preventDefault(); equals(); flashKey('[data-action="equals"]');
    } else if (k === "Backspace") {
      backspace(); flashKey('[data-action="backspace"]');
    } else if (k === "Escape" || k === "Delete") {
      clearAll(); flashKey('[data-action="clear"]');
    } else {
      return;
    }
    e.preventDefault();
  });

  // ---------- Copy result ----------

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
  }

  resultEl.addEventListener("click", async () => {
    const text = resultEl.textContent.trim();
    if (!text || resultEl.classList.contains("error")) return;
    try {
      await navigator.clipboard.writeText(text);
      toast("Hasil disalin");
    } catch {
      toast("Gagal menyalin");
    }
  });

  // ---------- History ----------

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  }

  function addHistory(expression, value) {
    history.unshift({ expression, value });
    history = history.slice(0, MAX_HISTORY);
    save(HISTORY_KEY, history);
    renderHistory();
  }

  function renderHistory() {
    historyList.innerHTML = "";
    history.forEach((item, idx) => {
      const li = document.createElement("li");
      li.dataset.index = idx;
      const e = document.createElement("div");
      e.className = "h-expr";
      e.textContent = formatExpr(item.expression) + " =";
      const r = document.createElement("div");
      r.className = "h-res";
      r.textContent = formatNumber(item.value);
      li.append(e, r);
      historyList.appendChild(li);
    });
    historyEmpty.hidden = history.length > 0;
  }

  historyList.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const item = history[Number(li.dataset.index)];
    lastExpr = item.expression;
    expr = numberToExpr(item.value);
    justEvaluated = true;
    render();
    if (window.matchMedia("(max-width: 720px)").matches) toggleHistory(false);
  });

  $("clearHistory").addEventListener("click", () => {
    history = [];
    save(HISTORY_KEY, history);
    renderHistory();
  });

  const historyBtn = $("historyToggle");
  function toggleHistory(force) {
    const open = historyEl.classList.toggle("open", force);
    historyBtn.setAttribute("aria-pressed", String(open));
  }
  historyBtn.addEventListener("click", () => toggleHistory());

  // ---------- Theme ----------

  const root = document.documentElement;
  function applyTheme(theme) { root.dataset.theme = theme; }
  const storedTheme = load(THEME_KEY, null);
  applyTheme(storedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  $("themeToggle").addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    save(THEME_KEY, next);
  });

  renderHistory();
  render();
})();

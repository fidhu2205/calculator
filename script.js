// Pink Advanced Calculator - client-side logic
// Supports basic math, advanced functions (sin/cos/tan, log, ln), sqrt, power, percent, factorial,
// memory (M+, M-, MR, MC), history, keyboard support, and background color picker.

(() => {
  const display = document.getElementById('display');
  const keypad = document.getElementById('keypad');
  const equalsBtn = document.getElementById('equals');
  const historyEl = document.getElementById('history');
  const bgPicker = document.getElementById('bgPicker');
  const themeToggle = document.getElementById('themeToggle');
  const calc = document.getElementById('calculator');

  let expr = '';
  let memory = 0;
  let lastResult = null;
  const history = [];

  // Render display safely
  function renderDisplay(text) {
    display.textContent = (text === '' || typeof text === 'undefined') ? '0' : String(text);
  }

  function insert(text) {
    expr += text;
    renderDisplay(expr);
  }

  function setExpr(value) {
    expr = String(value);
    renderDisplay(expr);
  }

  function clearAll() {
    expr = '';
    renderDisplay('0');
  }

  function backspace() {
    expr = expr.slice(0, -1);
    renderDisplay(expr || '0');
  }

  function flash(msg, ms = 900) {
    const prev = historyEl.textContent;
    historyEl.textContent = msg;
    setTimeout(() => historyEl.textContent = prev, ms);
  }

  // Map actions
  function doAction(action) {
    switch(action) {
      case 'clear': clearAll(); break;
      case 'back': backspace(); break;
      case 'sqrt': insert('sqrt('); break;
      case 'pow': insert('^'); break;
      case 'percent': insert('%'); break;
      case 'fact': insert('!'); break;
      case 'paren': {
        // balanced parentheses
        const open = (expr.match(/\(/g) || []).length;
        const close = (expr.match(/\)/g) || []).length;
        insert(open === close ? '(' : ')');
        break;
      }
      case 'pi': insert('π'); break;
      case 'e': insert('e'); break;
      case 'mc': memory = 0; flash('Memory cleared'); break;
      case 'mplus': evaluate(false); if (!isNaN(lastResult)) memory += Number(lastResult); flash('M+'); break;
      case 'mminus': evaluate(false); if (!isNaN(lastResult)) memory -= Number(lastResult); flash('M-'); break;
      case 'mr': insert(String(memory)); break;
      default: break;
    }
  }

  // Evaluate expression (client-side, sanitized)
  function evaluate(addHistory = true) {
    if (!expr || expr.trim() === '') return;
    try {
      const value = safeEvaluate(expr);
      lastResult = (typeof value === 'number' && isFinite(value)) ? value : NaN;
      renderDisplay(lastResult);
      if (addHistory) {
        history.unshift(`${expr} = ${lastResult}`);
        if (history.length > 8) history.pop();
        historyEl.textContent = history.join('  •  ');
      }
      expr = String(lastResult);
    } catch (err) {
      renderDisplay('Error');
      lastResult = NaN;
    }
  }

  // Safe evaluator: map friendly tokens to Math functions/constants
  function safeEvaluate(input) {
    if (!input) return 0;
    // Replace some visual operators
    let s = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi');

    // Handle percentage: convert "number%" into "(number/100)"
    s = s.replace(/([0-9.]+)%/g, '($1/100)');

    // Replace constants
    s = s.replace(/\bpi\b/g, `(${Math.PI})`);
    s = s.replace(/\be\b/g, `(${Math.E})`);

    // ^ => **
    s = s.replace(/\^/g, '**');

    // Map function names to Math.* or custom
    const fnMap = {
      'sin': 'Math.sin',
      'cos': 'Math.cos',
      'tan': 'Math.tan',
      'asin': 'Math.asin',
      'acos': 'Math.acos',
      'atan': 'Math.atan',
      'sqrt': 'Math.sqrt',
      'abs': 'Math.abs',
      'floor': 'Math.floor',
      'ceil': 'Math.ceil',
      'round': 'Math.round',
      'log10': 'Math.log10',
      'ln': 'Math.log',
    };
    Object.keys(fnMap).forEach(k => {
      s = s.replace(new RegExp('\\b' + k + '\\s*\\(', 'g'), fnMap[k] + '(');
    });

    // Factorial handling: replace "expr!" with factorial(expr)
    function replaceFactorials(str) {
      const re = /(\([^\(\)]+\)|\d+(\.\d+)?)!/;
      let t = str;
      while (re.test(t)) {
        t = t.replace(re, 'factorial($1)');
      }
      return t;
    }
    s = replaceFactorials(s);

    // Allow only safe characters
    if (!/^[0-9+\-*/%^().,_\sA-Za-z*!]+$/.test(s)) {
      throw new Error('Invalid characters');
    }

    // Build wrapped eval with helper functions
    const wrapped = `
      (function(){
        function factorial(n){
          n = Number(n);
          if (!isFinite(n) || n < 0) return NaN;
          if (Math.floor(n) !== n) {
            // factorial for non-integers not supported in this basic version
            return NaN;
          }
          let r = 1;
          for (let i=2;i<=n;i++) r *= i;
          return r;
        }
        Math.log10 = Math.log10 || function(x){ return Math.log(x)/Math.LN10; };
        return ${s};
      })()
    `;

    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(wrapped);
      return fn();
    } catch (e) {
      throw new Error('Evaluation error');
    }
  }

  // Click handling
  keypad.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    const insertText = btn.dataset.insert;
    const action = btn.dataset.action;

    if (insertText) {
      insert(insertText);
      return;
    }
    if (action) {
      if (action === 'equals') evaluate();
      else doAction(action);
    }
  });

  // Equals button
  equalsBtn.addEventListener('click', () => evaluate());

  // Keyboard support
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (/^[0-9]$/.test(k)) insert(k);
    else if (k === '.') insert('.');
    else if (k === 'Enter' || k === '=') { e.preventDefault(); evaluate(); }
    else if (k === 'Backspace') doAction('back');
    else if (k === 'Escape') doAction('clear');
    else if (['+','-','*','/','(',')','^','%'].includes(k)) insert(k);
  });

  // Background color picker
  bgPicker.addEventListener('input', (e) => {
    const color = e.target.value;
    calc.style.setProperty('--panel', color);
    // adjust page background slightly based on brightness
    const rgb = hexToRgb(color);
    const luminance = (0.299*rgb.r + 0.587*rgb.g + 0.114*rgb.b) / 255;
    if (luminance > 0.7) document.body.classList.add('light');
    else document.body.classList.remove('light');
  });

  // Theme toggle
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light');
    const pressed = themeToggle.getAttribute('aria-pressed') === 'true';
    themeToggle.setAttribute('aria-pressed', String(!pressed));
    themeToggle.textContent = pressed ? '🌙' : '☀️';
  });

  // Hex to rgb
  function hexToRgb(hex) {
    const h = hex.replace('#','');
    if (h.length === 3) {
      return {
        r: parseInt(h[0]+h[0],16),
        g: parseInt(h[1]+h[1],16),
        b: parseInt(h[2]+h[2],16)
      };
    } else {
      const v = parseInt(h,16);
      return { r: (v>>16)&255, g: (v>>8)&255, b: v&255 };
    }
  }

  // Init
  renderDisplay('0');
  historyEl.textContent = '';
  // expose for debugging
  window.__pinkCalc = { insert, evaluate, doAction, safeEvaluate };

})();
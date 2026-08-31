// Minimal Shopping List Web App for Meta Ray-Ban Display (600x600, keyboard first)
// - Arrow Up/Down to move, Enter toggles complete, Delete removes
// - Voice input via Web Speech API (if available)
// - Neural Band integration point: listens for 'neural-text-input' custom event
// - All interactive items are keyboard-focusable (tabindex=0)

(() => {
  const itemsEl = document.getElementById('items');
  const startVoiceBtn = document.getElementById('start-voice');
  const startNeuralBtn = document.getElementById('start-neural');
  const addManualBtn = document.getElementById('add-manual');
  const manualInput = document.getElementById('manual-input');
  const manualSubmit = document.getElementById('manual-submit');
  const viewport = document.getElementById('viewport');

  let items = [];

  // Utility: render list with incomplete items first (stable)
  function render() {
    // sort: incomplete first, completed last, keep insertion order
    const sorted = items.slice().sort((a,b) => {
      if (a.completed === b.completed) return a.index - b.index;
      return a.completed ? 1 : -1;
    });
    itemsEl.innerHTML = '';
    sorted.forEach(item => {
      itemsEl.appendChild(createItemElement(item));
    });
  }

  function createItemElement(item){
    const li = document.createElement('li');
    li.className = 'item';
    li.setAttribute('role','button');
    li.setAttribute('tabindex','0');
    li.dataset.id = item.id;
    li.setAttribute('aria-checked', item.completed ? 'true' : 'false');

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = item.text;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'action-btn';
    toggleBtn.textContent = item.completed ? 'Undo' : 'Done';
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleComplete(item.id);
    });
    toggleBtn.setAttribute('aria-label', item.completed ? 'Mark as incomplete' : 'Mark as complete');

    const delBtn = document.createElement('button');
    delBtn.className = 'action-btn';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeItem(item.id);
    });
    delBtn.setAttribute('aria-label', 'Delete item');

    actions.appendChild(toggleBtn);
    actions.appendChild(delBtn);

    li.appendChild(label);
    li.appendChild(actions);

    // keyboard handling
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        toggleComplete(item.id);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeItem(item.id);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusNextItem(li);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusPrevItem(li);
      }
    });

    // click to toggle (also accessible via Enter)
    li.addEventListener('click', () => toggleComplete(item.id));

    return li;
  }

  function addItem(text){
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    const index = items.length ? Math.max(...items.map(i => i.index)) + 1 : 0;
    items.push({id, text: text.trim(), completed:false, index});
    render();
    // focus the newly added item
    setTimeout(() => {
      const el = itemsEl.querySelector(`[data-id="${id}"]`);
      if (el) { el.focus(); el.scrollIntoView({block:'nearest'}); }
    }, 0);
  }

  function removeItem(id){
    items = items.filter(i => i.id !== id);
    render();
    // focus sensible item
    const first = itemsEl.querySelector('.item');
    if (first) first.focus();
  }

  function toggleComplete(id){
    const it = items.find(i => i.id === id);
    if (!it) return;
    it.completed = !it.completed;
    render();
    // keep focus on the toggled item (now moved to bottom if completed)
    setTimeout(() => {
      const el = itemsEl.querySelector(`[data-id="${id}"]`);
      if (el) el.focus();
    }, 0);
  }

  function focusNextItem(current){
    const all = Array.from(itemsEl.querySelectorAll('.item'));
    const idx = all.indexOf(current);
    if (idx >= 0 && idx < all.length - 1) {
      all[idx+1].focus();
      all[idx+1].scrollIntoView({block:'nearest'});
    }
  }
  function focusPrevItem(current){
    const all = Array.from(itemsEl.querySelectorAll('.item'));
    const idx = all.indexOf(current);
    if (idx > 0) {
      all[idx-1].focus();
      all[idx-1].scrollIntoView({block:'nearest'});
    } else {
      // focus header controls if at top
      document.getElementById('start-voice').focus();
    }
  }

  // Global keyboard shortcuts (keyboard-only navigation)
  window.addEventListener('keydown', (e) => {
    // single-key shortcuts only when viewport has focus
    if (!document.activeElement || !viewport.contains(document.activeElement)) return;
    if (e.key === 'v' || e.key === 'V') {
      e.preventDefault();
      toggleVoice();
    } else if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      toggleNeural();
    } else if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      openManualInput();
    }
  });

  // Manual add handling
  addManualBtn.addEventListener('click', openManualInput);
  manualSubmit.addEventListener('click', () => {
    const v = manualInput.value.trim();
    if (v) { addItem(v); manualInput.value=''; }
    // keep keyboard focus inside viewport
    viewport.focus();
  });
  manualInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      manualSubmit.click();
    } else if (e.key === 'Escape') {
      // close manual input
      viewport.focus();
    }
  });
  function openManualInput(){
    // make hidden-controls effectively focusable for keyboard users
    manualInput.value = '';
    manualInput.focus();
    manualInput.setAttribute('aria-hidden','false');
    // user types and presses Enter to submit
  }

  // Voice input (Web Speech API)
  let recognition = null;
  let recognizing = false;
  function setupSpeech(){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const r = new SpeechRecognition();
    r.lang = 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (ev) => {
      const t = ev.results[0][0].transcript;
      if (t && t.trim()) addItem(t.trim());
    };
    r.onend = () => { recognizing = false; updateVoiceButton(); };
    r.onerror = (e) => {
      console.warn('Speech error', e);
      recognizing = false;
      updateVoiceButton();
    };
    return r;
  }

  function toggleVoice(){
    if (!recognition) recognition = setupSpeech();
    if (!recognition) {
      alert('Voice input not supported in this browser/environment.');
      return;
    }
    if (recognizing) {
      recognition.stop();
      recognizing = false;
    } else {
      try {
        recognition.start();
        recognizing = true;
      } catch (err) {
        console.warn('Speech start failed', err);
      }
    }
    updateVoiceButton();
  }
  function updateVoiceButton(){
    startVoiceBtn.setAttribute('aria-pressed', recognizing ? 'true' : 'false');
    startVoiceBtn.textContent = recognizing ? 'Stop Voice' : 'Start Voice';
  }
  startVoiceBtn.addEventListener('click', toggleVoice);

  // Neural Band input integration point
  // Devices that support the Neural Band should dispatch a custom event with the recognized text:
  // window.dispatchEvent(new CustomEvent('neural-text-input', {detail: {text: 'milk'}}));
  // or the device might call a global function window.onNeuralText(text)
  startNeuralBtn.addEventListener('click', () => {
    // toggle visual press state; real neural activation is device-specific
    const pressed = startNeuralBtn.getAttribute('aria-pressed') === 'true';
    startNeuralBtn.setAttribute('aria-pressed', (!pressed).toString());
    // hint to device to start neural capture if available
    if (window.requestNeuralCapture) {
      window.requestNeuralCapture(); // example device hook
    } else {
      // otherwise, instruct user how to send text programmatically:
      alert('Neural mode toggled. If your device provides neural text to the page, it should dispatch the event "neural-text-input".');
    }
  });

  // Custom event listener for neural input
  window.addEventListener('neural-text-input', (ev) => {
    const t = ev.detail && ev.detail.text ? ev.detail.text : '';
    if (t) addItem(t.trim());
  });

  // Also support direct API call hook
  window.onNeuralText = function(text){
    if (text && text.trim()) addItem(text.trim());
  };

  function toggleNeural(){
    // wrapper if needed by keyboard shortcuts
    startNeuralBtn.click();
  }
  startNeuralBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); startNeuralBtn.click(); }
  });

  // Initial demo items
  addItem('Milk');
  addItem('Eggs');
  addItem('Bread');

  // Focus management: when app loads, focus first control.
  setTimeout(() => {
    document.getElementById('start-voice').focus();
  }, 100);

  // Expose app state for debugging (developer only)
  window.SHOPPING_APP = {
    addItem,
    removeItem,
    toggleComplete,
    getItems: () => items
  };

  // Prevent page scroll via keyboard on the root
  window.addEventListener('keydown', function(e){
    // prevent default page scroll keys when viewport has focus
    if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key) && viewport.contains(document.activeElement)) {
      e.preventDefault();
    }
  }, {passive:false});
})();
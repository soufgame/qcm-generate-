    let questions = [];
    let isVerified = false;

    const form = document.getElementById('pdfForm');
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const uploadSection = document.getElementById('uploadSection');
    const loadingSection = document.getElementById('loadingSection');
    const errorSection = document.getElementById('errorSection');
    const qcmForm = document.getElementById('qcmForm');
    const verifyBtn = document.getElementById('verifyBtn');
    const resetBtn = document.getElementById('resetBtn');
    const retryBtn = document.getElementById('retryBtn');
    const resultsDiv = document.getElementById('results');
    const actionButtons = document.getElementById('actionButtons');

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      fileName.textContent = file ? file.name : 'Aucun fichier sélectionné';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const questionCount = document.getElementById('questionCount').value;
      formData.append('questionCount', questionCount);

      uploadSection.classList.add('hidden');
      loadingSection.classList.remove('hidden');
      errorSection.classList.add('hidden');
      qcmForm.innerHTML = '';
      resultsDiv.classList.add('hidden');
      actionButtons.style.display = 'none';

      try {
        const res = await fetch('/api/qcm/generate', {
          method: 'POST',
          body: formData
        });
        
        const contentType = res.headers.get('content-type');
        const text = await res.text();
        
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          throw new Error(`Response is not valid JSON. Content-Type: ${contentType}. Response: ${text.substring(0, 100)}`);
        }

        loadingSection.classList.add('hidden');

        if (data.qcm) {
          if (Array.isArray(data.qcm)) {
            questions = data.qcm;
          } else if (data.qcm.questions && Array.isArray(data.qcm.questions)) {
            questions = data.qcm.questions;
          } else {
            throw new Error("Structure QCM inattendue");
          }

          // Transformer les questions au format attendu
          questions = questions.map(q => ({
            question: q.question,
            options: q.options.map(o => o.text || o),
            correctIndex: q.options.findIndex(o => 
              (o.text || o) === (q.answer?.text || q.answer)
            )
          }));

          generateForm();
          actionButtons.style.display = 'flex';
        } else {
          throw new Error(data.error || "Erreur lors de la génération du QCM");
        }
      } catch (err) {
        loadingSection.classList.add('hidden');
        errorSection.classList.remove('hidden');
        errorSection.textContent = "❌ Erreur : " + err.message;
        uploadSection.classList.remove('hidden');
      }
    });

    function generateForm() {
      qcmForm.innerHTML = questions.map((q, qIndex) => `
        <div class="question-card" id="question-${qIndex}">
          <div class="question-title">
            <span class="question-number">Question ${qIndex + 1}</span>
            ${q.question}
          </div>
          <div class="options">
            ${q.options.map((opt, optIndex) => `
              <div class="option" onclick="selectOption(${qIndex}, ${optIndex})">
                <input type="radio" name="q${qIndex}" value="${optIndex}" id="q${qIndex}_${optIndex}">
                <label for="q${qIndex}_${optIndex}">${String.fromCharCode(65 + optIndex)}. ${opt}</label>
              </div>
            `).join('')}
          </div>
          <div class="correct-answer hidden" id="answer-${qIndex}"></div>
        </div>
      `).join('');
    }

    function selectOption(qIndex, optIndex) {
      if (isVerified) return;
      document.getElementById(`q${qIndex}_${optIndex}`).checked = true;
    }

    function verifyAnswers() {
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;

      questions.forEach((q, qIndex) => {
        const selected = document.querySelector(`input[name="q${qIndex}"]:checked`);
        const options = document.querySelectorAll(`#question-${qIndex} .option`);
        const answerDiv = document.getElementById(`answer-${qIndex}`);

        if (!selected) {
          unanswered++;
          options[q.correctIndex].classList.add('neutral');
          answerDiv.innerHTML = `✓ Réponse correcte : <strong>${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}</strong>`;
          answerDiv.classList.remove('hidden');
        } else {
          const selectedIndex = parseInt(selected.value);
          if (selectedIndex === q.correctIndex) {
            correct++;
            options[selectedIndex].classList.add('correct');
          } else {
            incorrect++;
            options[selectedIndex].classList.add('incorrect');
            options[q.correctIndex].classList.add('correct');
          }
          answerDiv.innerHTML = `✓ Réponse correcte : <strong>${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}</strong>`;
          answerDiv.classList.remove('hidden');
        }
      });

      const total = questions.length;
      const percentage = ((correct / total) * 100).toFixed(1);

      resultsDiv.innerHTML = `
        <h2>📊 Résultats du QCM</h2>
        <div class="score-grid">
          <div class="score-item">
            <div class="label">Score Total</div>
            <div class="value">${correct}/${total}</div>
          </div>
          <div class="score-item">
            <div class="label">Pourcentage</div>
            <div class="value">${percentage}%</div>
          </div>
          <div class="score-item">
            <div class="label">✓ Bonnes Réponses</div>
            <div class="value">${correct}</div>
          </div>
          <div class="score-item">
            <div class="label">✗ Mauvaises Réponses</div>
            <div class="value">${incorrect}</div>
          </div>
        </div>
      `;
      resultsDiv.classList.remove('hidden');

      isVerified = true;
      verifyBtn.classList.add('hidden');
      resetBtn.classList.remove('hidden');
      retryBtn.classList.remove('hidden');

      document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.disabled = true;
      });
    }

    function resetQuiz() {
      isVerified = false;
      resultsDiv.classList.add('hidden');
      verifyBtn.classList.remove('hidden');
      resetBtn.classList.add('hidden');
      retryBtn.classList.add('hidden');

      document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.disabled = false;
        input.checked = false;
      });

      document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('correct', 'incorrect', 'neutral');
      });

      document.querySelectorAll('.correct-answer').forEach(ans => {
        ans.classList.add('hidden');
      });
    }

    verifyBtn.addEventListener('click', verifyAnswers);
    resetBtn.addEventListener('click', resetQuiz);
    retryBtn.addEventListener('click', resetQuiz);

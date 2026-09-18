/* Reusable quiz widget. Markup contract:
   <div class="quiz" data-answer="1">
     <p class="q">Question text</p>
     <button>Option A</button><button>Option B</button>
     <p class="why" hidden>Explanation shown after answering.</p>
   </div>
   data-answer is the 0-based index of the correct button. */
document.querySelectorAll('.quiz').forEach(function (quiz) {
  var correct = Number(quiz.dataset.answer);
  var why = quiz.querySelector('.why');
  var buttons = Array.prototype.slice.call(quiz.querySelectorAll('button'));
  buttons.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      buttons.forEach(function (b) { b.disabled = true; });
      btn.classList.add(i === correct ? 'right' : 'wrong');
      if (i !== correct) buttons[correct].classList.add('right');
      if (why) why.hidden = false;
    });
  });
});

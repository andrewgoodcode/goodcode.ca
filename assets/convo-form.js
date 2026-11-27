/* Conversational multistep form.
   Progressive enhancement: without JavaScript the form renders as the
   original single-page form, labels and all. With JavaScript, each
   .form-field that carries a data-question becomes one step, one question
   at a time, with previous answers shown as a recap thread above the
   current question. Field names and field ids are unchanged. If
   data-convo-pending names an element, a final submit shows that element
   instead of submitting (backend not connected yet). If data-convo-kit
   names a Kit endpoint, a final submit POSTs the form to Kit and shows
   the success message named in data-convo-kit-success. */
(function () {
  'use strict';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function truncate(s) {
    s = (s || '').replace(/\s+/g, ' ').trim();
    if (s.length > 100) s = s.slice(0, 100) + '...';
    return s;
  }

  function initForm(form) {
    var fields = Array.prototype.slice.call(form.querySelectorAll('.form-field'));
    if (!fields.length) return;
    var i;
    for (i = 0; i < fields.length; i++) {
      if (!fields[i].getAttribute('data-question')) return;
    }
    form.setAttribute('novalidate', '');
    form.classList.add('convo-enhanced');

    var steps = [];
    var total = fields.length + 1;
    var current = 0;

    /* Progress bar, recap thread, and live status region, built by JS. */
    var progress = el('div', 'convo-progress');
    var track = el('div', 'convo-progress-track');
    var fill = el('span', 'convo-progress-fill');
    var progressText = el('p', 'convo-progress-text');
    track.appendChild(fill);
    progress.appendChild(track);
    progress.appendChild(progressText);
    var thread = el('ol', 'convo-thread');
    thread.setAttribute('aria-label', 'Your answers so far');
    var status = el('p', 'convo-status visually-hidden');
    status.setAttribute('aria-live', 'polite');
    var stepsWrap = el('div', 'convo-steps');
    form.insertBefore(progress, fields[0]);
    form.insertBefore(thread, fields[0]);
    form.insertBefore(stepsWrap, fields[0]);
    form.insertBefore(status, fields[0]);

    var submitBtn = form.querySelector('button[type="submit"]');
    var submitParent = submitBtn ? submitBtn.parentNode : null;

    function answerDisplay(step) {
      var c = step.control;
      if (!c) return '';
      if (step.chips) {
        var opt = c.options[c.selectedIndex];
        return opt && opt.value ? opt.textContent : '';
      }
      return (c.value || '').trim();
    }

    function showError(step, message) {
      step.error.textContent = message;
      step.error.hidden = false;
      if (step.control) step.control.setAttribute('aria-invalid', 'true');
    }

    function clearError(step) {
      step.error.textContent = '';
      step.error.hidden = true;
      if (step.control) step.control.removeAttribute('aria-invalid');
    }

    function validateStep(idx) {
      var step = steps[idx];
      clearError(step);
      if (step.optional && !answerDisplay(step)) return true;
      var c = step.control;
      if (step.chips) {
        if (!c.value) {
          showError(step, 'Please choose one of the options.');
          return false;
        }
        return true;
      }
      if (c && !c.checkValidity()) {
        showError(step, c.validationMessage || 'Please answer this question.');
        c.focus();
        return false;
      }
      return true;
    }

    function renderThread(upto) {
      while (thread.firstChild) thread.removeChild(thread.firstChild);
      for (var j = 0; j < upto; j++) {
        var disp = answerDisplay(steps[j]);
        var li = el('li', 'convo-recap');
        li.appendChild(el('span', 'convo-recap-q', steps[j].question));
        li.appendChild(el('span', 'convo-recap-a', disp ? truncate(disp) : 'Skipped'));
        thread.appendChild(li);
      }
    }

    function buildReview() {
      while (reviewList.firstChild) reviewList.removeChild(reviewList.firstChild);
      steps.forEach(function (step, idx) {
        var row = el('li', 'convo-review-row');
        row.appendChild(el('span', 'convo-review-q', step.question));
        var disp = answerDisplay(step);
        row.appendChild(el('span', 'convo-review-a', disp ? truncate(disp) : 'Not given'));
        var edit = el('button', 'convo-edit', 'Edit');
        edit.type = 'button';
        edit.setAttribute('aria-label', 'Edit: ' + step.question);
        edit.addEventListener('click', function () { showStep(idx, true); });
        row.appendChild(edit);
        reviewList.appendChild(row);
      });
    }

    function showStep(n, focus) {
      steps.forEach(function (s) {
        s.fieldset.hidden = true;
        s.fieldset.classList.remove('is-active');
      });
      reviewStep.hidden = true;
      reviewStep.classList.remove('is-active');
      var target = n < fields.length ? steps[n].fieldset : reviewStep;
      target.hidden = false;
      void target.offsetWidth;
      target.classList.add('is-active');
      current = n;
      renderThread(Math.min(n, fields.length));
      fill.style.width = Math.round((n / total) * 100) + '%';
      if (n < fields.length) {
        progressText.textContent = 'Step ' + (n + 1) + ' of ' + fields.length;
        status.textContent = 'Step ' + (n + 1) + ' of ' + fields.length + ': ' + steps[n].question;
      } else {
        progressText.textContent = 'Step ' + total + ' of ' + total + ': Review';
        status.textContent = 'Review your answers.';
        buildReview();
      }
      if (focus === false) return;
      var focusTarget = null;
      if (n < fields.length) {
        var step = steps[n];
        if (step.chips) {
          focusTarget = step.chipGroup.querySelector('[aria-pressed="true"]') || step.chipGroup.querySelector('.convo-chip');
        } else {
          focusTarget = step.control;
        }
      } else {
        focusTarget = reviewList.querySelector('.convo-edit') || submitBtn;
      }
      if (focusTarget) focusTarget.focus();
    }

    function advance(idx, skipped) {
      if (!skipped && !validateStep(idx)) return;
      showStep(idx + 1, true);
    }

    /* Build one step per field. */
    fields.forEach(function (field, idx) {
      var question = field.getAttribute('data-question');
      var fs = document.createElement('fieldset');
      fs.className = 'convo-step';
      fs.hidden = true;
      var q = el('p', 'convo-question', question);
      q.id = 'convo-q-' + idx;
      fs.setAttribute('aria-labelledby', q.id);
      fs.appendChild(q);
      var hint = field.getAttribute('data-hint');
      if (hint) fs.appendChild(el('p', 'convo-hint', hint));
      fs.appendChild(field);
      var label = field.querySelector('label');
      if (label) label.classList.add('visually-hidden');
      var control = field.querySelector('input, select, textarea');
      if (control && hint && control.hasAttribute('placeholder')) {
        control.removeAttribute('placeholder');
      }
      var err = el('p', 'convo-error');
      err.hidden = true;
      fs.appendChild(err);
      var step = {
        fieldset: fs,
        field: field,
        error: err,
        question: question,
        control: control,
        optional: field.getAttribute('data-optional') === 'true',
        chips: field.getAttribute('data-chips') === 'true',
        chipGroup: null
      };
      if (step.chips && control && control.tagName === 'SELECT') {
        control.classList.add('visually-hidden');
        control.setAttribute('tabindex', '-1');
        control.setAttribute('aria-hidden', 'true');
        var group = el('div', 'convo-chips');
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', question);
        Array.prototype.slice.call(control.options).forEach(function (opt) {
          if (!opt.value) return;
          var chip = el('button', 'convo-chip', opt.textContent);
          chip.type = 'button';
          chip.setAttribute('aria-pressed', 'false');
          chip.addEventListener('click', function () {
            control.value = opt.value;
            Array.prototype.slice.call(group.children).forEach(function (c) {
              c.setAttribute('aria-pressed', 'false');
            });
            chip.setAttribute('aria-pressed', 'true');
            clearError(step);
            advance(idx, false);
          });
          group.appendChild(chip);
        });
        field.appendChild(group);
        step.chipGroup = group;
      }
      var nav = el('div', 'convo-nav');
      if (idx > 0) {
        var back = el('button', 'convo-back', 'Back');
        back.type = 'button';
        back.addEventListener('click', function () { showStep(idx - 1, true); });
        nav.appendChild(back);
      }
      if (step.optional) {
        var skip = el('button', 'convo-skip', 'Skip');
        skip.type = 'button';
        skip.addEventListener('click', function () { advance(idx, true); });
        nav.appendChild(skip);
      }
      var next = el('button', 'convo-next ' + (form.getAttribute('data-convo-next-class') || ''), idx === fields.length - 1 ? 'Review answers' : 'Continue');
      next.type = 'button';
      next.addEventListener('click', function () { advance(idx, false); });
      nav.appendChild(next);
      fs.appendChild(nav);
      stepsWrap.appendChild(fs);
      steps.push(step);
      if (control && control.tagName !== 'TEXTAREA' && control.tagName !== 'SELECT') {
        control.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            advance(idx, false);
          }
        });
      }
    });

    /* Review step, with an Edit link per answer and the original submit. */
    var reviewStep = document.createElement('fieldset');
    reviewStep.className = 'convo-step convo-review';
    reviewStep.hidden = true;
    var rq = el('p', 'convo-question', 'Here is what you told us');
    rq.id = 'convo-q-review';
    reviewStep.setAttribute('aria-labelledby', rq.id);
    reviewStep.appendChild(rq);
    var reviewList = el('ul', 'convo-review-list');
    reviewStep.appendChild(reviewList);
    var rnav = el('div', 'convo-nav');
    var rback = el('button', 'convo-back', 'Back');
    rback.type = 'button';
    rback.addEventListener('click', function () { showStep(fields.length - 1, true); });
    rnav.appendChild(rback);
    reviewStep.appendChild(rnav);
    if (submitBtn) {
      reviewStep.appendChild(submitBtn);
      if (submitParent && submitParent !== form && submitParent.parentNode === form && submitParent.children.length === 0) {
        form.removeChild(submitParent);
      }
    }
    stepsWrap.appendChild(reviewStep);

    /* Final submit. If a pending element is named, the backend is not
       connected yet, so show that notice instead of submitting. If a Kit
       endpoint is named in data-convo-kit, POST the form to Kit (mode
       no-cors, same as the Kit signup forms) and show the Kit success
       message from data-convo-kit-success. The form fields already carry
       the Kit names (email_address and fields[...]), so new FormData(form)
       sends exactly what Kit expects. Otherwise leave submit alone (the
       page's own handler runs). */
    var pendingSel = form.getAttribute('data-convo-pending');
    var kitUrl = form.getAttribute('data-convo-kit');
    if (pendingSel) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var pending = document.querySelector(pendingSel);
        form.hidden = true;
        if (pending) {
          pending.classList.add('is-visible');
          pending.setAttribute('tabindex', '-1');
          pending.focus();
        }
      });
    } else if (kitUrl) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var successSel = form.getAttribute('data-convo-success');
        var successMsg = form.getAttribute('data-convo-kit-success') || 'Thank you.';
        var errorMsg = form.getAttribute('data-convo-kit-error') || 'Something went wrong. Please try again.';
        var target = successSel ? document.querySelector(successSel) : null;
        fetch(kitUrl, {
          method: 'POST',
          body: new FormData(form),
          mode: 'no-cors'
        }).then(function () {
          /* The no-cors response is opaque, so this only means the
             request was sent. The message says so, it does not claim a
             confirmed delivery. */
          form.hidden = true;
          if (target) {
            target.textContent = successMsg;
            target.classList.add('is-visible');
            target.setAttribute('tabindex', '-1');
            target.focus();
          }
        }).catch(function () {
          if (target) {
            target.textContent = errorMsg;
            target.classList.add('is-visible');
          }
        });
      });
    }

    showStep(0, false);
  }

  var forms = document.querySelectorAll('form[data-convo]');
  Array.prototype.forEach.call(forms, initForm);
})();

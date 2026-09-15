'use strict';
// Old Android browsers may not implement HTMLDialogElement.
(function () {
  var sheet = document.getElementById('sheet');
  if (typeof sheet.showModal === 'function') return;
  var focusBefore;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.showModal = function () {
    focusBefore = document.activeElement;
    sheet.setAttribute('open', '');
    sheet.classList.add('fallback-dialog');
    document.body.classList.add('modal-open');
    document.getElementById('close-sheet').focus();
  };
  sheet.close = function () {
    sheet.removeAttribute('open');
    document.body.classList.remove('modal-open');
    if (focusBefore) focusBefore.focus();
  };
  sheet.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') sheet.close();
    if (event.key !== 'Tab') return;
    var controls = sheet.querySelectorAll('button:not([hidden]), a[href], input, select');
    var first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
}());

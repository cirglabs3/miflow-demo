'use strict';
(function () {
  var status = document.getElementById('offline-status');
  var installButton = document.getElementById('install-app');
  var updateButton = document.getElementById('update-app');
  var installPrompt = null, registration = null, ready = false, applyingUpdate = false;
  var hadController = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
  var display = window.matchMedia('(display-mode: standalone)');
  function installed() { return display.matches || window.navigator.standalone === true; }
  function syncInstalled() { installButton.hidden = installed(); }
  syncInstalled();
  if (display.addEventListener) display.addEventListener('change', syncInstalled);
  else if (display.addListener) display.addListener(syncInstalled);
  function setStatus(text, isReady) {
    ready = !!isReady;
    status.textContent = text;
    status.classList.toggle('ready', ready);
  }
  function refreshStatus() {
    if (ready) setStatus(navigator.onLine ? 'Ready offline' : 'Offline · Ready to use', true);
  }
  window.addEventListener('online', function () { refreshStatus(); if (registration) checkReady(); });
  window.addEventListener('offline', refreshStatus);
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault(); installPrompt = event;
    installButton.textContent = 'Install MiFlow';
  });
  window.addEventListener('appinstalled', function () { installPrompt = null; installButton.hidden = true; });
  function installHelp() {
    var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var steps = ios
      ? '<ol><li>Open this address in Safari.</li><li>Tap Share, then Add to Home Screen.</li><li>If shown, leave Open as Web App enabled, then tap Add.</li><li>Open the MiFlow icon while online and wait for Ready offline.</li></ol>'
      : '<ol><li>Open this address in Chrome on your phone.</li><li>Choose Install app or Add to Home screen from the browser menu, then confirm installation if offered.</li><li>Open the MiFlow icon while online and wait for Ready offline.</li></ol>';
    showSheet('<div class="eyebrow">MIFLOW ON YOUR PHONE</div><h2>Your own app icon.</h2><p>Launch MiFlow from your Home Screen in its own window.</p>' +
      (installPrompt ? '<button class="install-action" id="confirm-install">Install MiFlow</button>' : '') + steps +
      '<p>Installation options depend on your browser. If the icon opens a browser tab, use Safari on iPhone or Chrome on Android and install again. Opening the website link directly still opens a browser tab.</p><p>For offline use, allow the first download to finish. Clearing browser storage removes the saved app files; reconnect to restore them.</p>');
    var confirm = document.getElementById('confirm-install');
    if (confirm) confirm.onclick = function () {
      var prompt = installPrompt;
      if (!prompt) return;
      prompt.prompt();
      prompt.userChoice.then(function () { installPrompt = null; confirm.hidden = true; });
    };
  }
  installButton.onclick = installHelp;
  function showUpdate() { updateButton.hidden = !(registration && registration.waiting && navigator.serviceWorker.controller && registration.waiting !== navigator.serviceWorker.controller); }
  updateButton.onclick = function () {
    if (!registration || !registration.waiting) return;
    applyingUpdate = true;
    updateButton.disabled = true;
    updateButton.textContent = 'Updating…';
    registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  };
  // Ask the controlling worker to verify its entire cache before claiming readiness.
  function checkReady() {
    var controller = navigator.serviceWorker.controller;
    if (!controller) return;
    var channel = new MessageChannel();
    var timeout = setTimeout(function () {
      setStatus('Offline access not confirmed · Reopen online', false);
    }, 10000);
    channel.port1.onmessage = function (event) {
      clearTimeout(timeout); channel.port1.close();
      if (event.data && event.data.ready) { ready = true; refreshStatus(); }
      else setStatus('Offline files missing · Reconnect and reopen', false);
    };
    controller.postMessage({type:'CHECK_OFFLINE', repair:navigator.onLine}, [channel.port2]);
  }
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    setStatus('Offline setup needs a secure website', false);
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (applyingUpdate || hadController) window.location.reload();
    else { hadController = true; showUpdate(); checkReady(); }
  });
  navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'}).then(function (reg) {
    registration = reg; showUpdate();
    reg.addEventListener('updatefound', function () {
      var worker = reg.installing;
      worker.addEventListener('statechange', function () {
        if (worker.state === 'installed') showUpdate();
        if (worker.state === 'redundant' && !ready) setStatus('Offline download failed · Reopen online', false);
      });
    });
    return navigator.serviceWorker.ready;
  }).then(function () { showUpdate(); checkReady(); }).catch(function () {
    setStatus('Offline setup unavailable · Reopen online', false);
  });
}());

(function () {
      var root = document.documentElement;
      root.classList.add('fonts-loading');
      var finished = false, cap;
      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(cap);
        root.classList.remove('fonts-loading');
        root.classList.add('fonts-ready');
      }
      // The skeleton stays until the app has drawn its first screen (markAppReady), with a cap so it can never trap the page.
      window.markAppReady = function () {
        if (root.classList.contains('app-ready')) return;
        root.classList.add('app-ready');
        var sk = document.getElementById('boot-skeleton');
        if (sk) setTimeout(function () { sk.remove(); }, 260);
      };
      setTimeout(window.markAppReady, 8000);
      cap = setTimeout(finish, 3000);
      // The page uses the built-in system font, so there is nothing to wait for here.
      finish();
    })();

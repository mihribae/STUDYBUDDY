(function () {
  if (window.location.protocol !== "file:") {
    return;
  }

  function showBanner() {
    if (document.getElementById("studybuddy-file-protocol-warning")) {
      return;
    }
    var bar = document.createElement("div");
    bar.id = "studybuddy-file-protocol-warning";
    bar.setAttribute("role", "alert");
    bar.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "z-index:2147483647",
      "padding:14px 18px",
      "background:#b45309",
      "color:#fff",
      "font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif",
      "text-align:center",
      "box-shadow:0 4px 12px rgba(0,0,0,.2)"
    ].join(";");
    bar.innerHTML =
      "<strong>StudyBuddy</strong> dosyadan açıldığında (file://) sayfa genelde düzgün çalışmaz. " +
      "Backend klasöründe <code style=\"background:rgba(0,0,0,.2);padding:2px 6px;border-radius:4px\">npm run dev</code> çalıştırıp " +
      "tarayıcıda <strong>http://localhost:4000</strong> adresini açın. " +
      "Alternatif: VS Code <em>Live Server</em> ile HTTP üzerinden açın.";
    document.body.prepend(bar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showBanner);
  } else {
    showBanner();
  }
})();

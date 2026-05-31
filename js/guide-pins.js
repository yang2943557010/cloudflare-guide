(function () {
  document.querySelectorAll(".guide-figure[data-figure]").forEach(function (fig) {
    var figureId = fig.getAttribute("data-figure");
    var pins = fig.querySelectorAll(".guide-pin");
    var list = document.querySelector(".guide-pin-list[data-figure=\"" + figureId + "\"]");
    if (!list) return;

    var items = list.querySelectorAll("li[data-pin]");

    function activate(n) {
      pins.forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-pin") === n);
      });
      items.forEach(function (li) {
        li.classList.toggle("is-highlighted", li.getAttribute("data-pin") === n);
      });
    }

    function clear() {
      pins.forEach(function (p) {
        p.classList.remove("is-active");
      });
      items.forEach(function (li) {
        li.classList.remove("is-highlighted");
      });
    }

    pins.forEach(function (pin) {
      var n = pin.getAttribute("data-pin");
      pin.setAttribute("role", "button");
      pin.setAttribute("tabindex", "0");
      pin.setAttribute("aria-label", "标注 " + n);

      pin.addEventListener("mouseenter", function () {
        activate(n);
      });
      pin.addEventListener("focus", function () {
        activate(n);
      });
      pin.addEventListener("mouseleave", clear);
      pin.addEventListener("blur", clear);
      pin.addEventListener("click", function (e) {
        e.preventDefault();
        var target = document.getElementById(figureId + "-pin-" + n);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        activate(n);
      });
    });

    items.forEach(function (li) {
      var n = li.getAttribute("data-pin");
      li.addEventListener("mouseenter", function () {
        activate(n);
      });
      li.addEventListener("mouseleave", clear);
    });
  });
})();

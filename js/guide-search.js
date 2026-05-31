(function () {
  var input = document.getElementById("guide-search-input");
  var resultsEl = document.getElementById("guide-search-results");
  if (!input || !resultsEl) return;

  var blocks = Array.prototype.slice.call(
    document.querySelectorAll(".guide-content .guide-block[id]")
  );

  var index = blocks.map(function (block) {
    var titleEl = block.querySelector("h2");
    return {
      id: block.id,
      el: block,
      title: titleEl ? titleEl.textContent.replace(/\s+/g, " ").trim() : block.id,
      text: block.textContent.replace(/\s+/g, " ").trim(),
      keywords: (block.getAttribute("data-search") || "").replace(/\s+/g, " ").trim(),
    };
  });

  var activeMarks = [];
  var debounceTimer = null;

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function clearHighlights() {
    activeMarks.forEach(function (mark) {
      var parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    });
    activeMarks = [];
  }

  function highlightInBlock(block, query) {
    if (!query || query.length < 2) return;
    var re = new RegExp(escapeRegExp(query), "gi");
    var walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest(".guide-pin, script, style")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(function (node) {
      var text = node.nodeValue;
      if (!re.test(text)) {
        re.lastIndex = 0;
        return;
      }
      re.lastIndex = 0;
      var frag = document.createDocumentFragment();
      var last = 0;
      var match;
      while ((match = re.exec(text)) !== null) {
        if (match.index > last) {
          frag.appendChild(document.createTextNode(text.slice(last, match.index)));
        }
        var mark = document.createElement("mark");
        mark.className = "search-highlight";
        mark.textContent = match[0];
        frag.appendChild(mark);
        activeMarks.push(mark);
        last = match.index + match[0].length;
      }
      if (last < text.length) {
        frag.appendChild(document.createTextNode(text.slice(last)));
      }
      node.parentNode.replaceChild(frag, node);
    });
  }

  function snippet(text, query) {
    var lower = text.toLowerCase();
    var q = query.toLowerCase();
    var idx = lower.indexOf(q);
    if (idx < 0) return text.slice(0, 80) + "…";
    var start = Math.max(0, idx - 24);
    var end = Math.min(text.length, idx + query.length + 48);
    var part = text.slice(start, end);
    if (start > 0) part = "…" + part;
    if (end < text.length) part = part + "…";
    return part.replace(new RegExp("(" + escapeRegExp(query) + ")", "gi"), "<mark>$1</mark>");
  }

  function scoreItem(item, query) {
    var q = query.toLowerCase();
    var title = item.title.toLowerCase();
    var blob = (item.title + " " + item.keywords + " " + item.text).toLowerCase();
    if (title === q) return 100;
    if (title.indexOf(q) === 0) return 90;
    if (title.indexOf(q) >= 0) return 80;
    if (item.keywords.toLowerCase().indexOf(q) >= 0) return 70;
    if (blob.indexOf(q) >= 0) return 50;
    var terms = q.split(/\s+/).filter(Boolean);
    if (!terms.length) return 0;
    var matched = terms.filter(function (t) {
      return blob.indexOf(t) >= 0;
    }).length;
    return matched === terms.length ? 30 + matched * 5 : 0;
  }

  function search(query) {
    var q = query.trim();
    clearHighlights();

    blocks.forEach(function (block) {
      block.classList.remove("search-dimmed", "search-match");
    });

    if (!q) {
      resultsEl.hidden = true;
      resultsEl.innerHTML = "";
      return [];
    }

    var matches = index
      .map(function (item) {
        return { item: item, score: scoreItem(item, q) };
      })
      .filter(function (x) {
        return x.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });

    matches.forEach(function (m) {
      m.item.el.classList.add("search-match");
    });

    blocks.forEach(function (block) {
      if (!block.classList.contains("search-match")) {
        block.classList.add("search-dimmed");
      }
    });

    if (!matches.length) {
      resultsEl.hidden = false;
      resultsEl.innerHTML =
        '<p class="guide-search-empty">未找到与「' + escapeHtml(q) + "」相关的说明</p>";
      return [];
    }

    resultsEl.hidden = false;
    resultsEl.innerHTML =
      '<p class="guide-search-count">找到 ' +
      matches.length +
      " 个相关章节</p>" +
      matches
        .slice(0, 12)
        .map(function (m) {
          return (
            '<a class="guide-search-item" href="#' +
            escapeHtml(m.item.id) +
            '" data-target="' +
            escapeHtml(m.item.id) +
            '">' +
            '<span class="guide-search-item-title">' +
            escapeHtml(m.item.title) +
            "</span>" +
            '<span class="guide-search-item-snippet">' +
            snippet(m.item.text, q) +
            "</span></a>"
          );
        })
        .join("");

    return matches;
  }

  function goToSection(id, query) {
    var block = document.getElementById(id);
    if (!block) return;
    clearHighlights();
    blocks.forEach(function (b) {
      b.classList.remove("search-dimmed", "search-match");
    });
    if (query) {
      block.classList.add("search-match");
      highlightInBlock(block, query);
    }
    block.scrollIntoView({ behavior: "smooth", block: "start" });
    block.classList.add("search-flash");
    setTimeout(function () {
      block.classList.remove("search-flash");
    }, 1200);
  }

  input.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      search(input.value);
    }, 180);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      var matches = search(input.value);
      if (matches.length) {
        goToSection(matches[0].item.id, input.value.trim());
      }
    }
    if (e.key === "Escape") {
      input.value = "";
      search("");
      input.blur();
    }
  });

  resultsEl.addEventListener("click", function (e) {
    var link = e.target.closest(".guide-search-item");
    if (!link) return;
    e.preventDefault();
    goToSection(link.getAttribute("data-target"), input.value.trim());
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".guide-search-wrap")) {
      if (!input.value.trim()) resultsEl.hidden = true;
    }
  });

  var params = new URLSearchParams(location.search);
  var initialQ = params.get("q");
  if (initialQ) {
    input.value = initialQ;
    var matches = search(initialQ);
    if (matches.length) {
      setTimeout(function () {
        goToSection(matches[0].item.id, initialQ.trim());
      }, 300);
    }
  }
})();

function highlightAllAnchorTags() {
  const allLinks = document.querySelectorAll('a');

  allLinks.forEach(link => {
    link.style.textDecoration = 'underline';
    link.style.textDecorationColor = 'pink';
    link.style.textDecorationThickness = '2px';
  });
}

// Run on initial page load
highlightAllAnchorTags();

// Watch for changes
const observer = new MutationObserver(() => {
  highlightAllAnchorTags();
});

observer.observe(document.body, { childList: true, subtree: true });


////////////////////////////////////////////////////////////////////////// 


(function () {
  console.log("✅ DEVScan v2: universal link highlighter with Shadow DOM support 🧠");

  const processed = new WeakSet();
  const hoverBadge = document.createElement("div");

  // Badge setup
  hoverBadge.textContent = "⚠️ Link detected";
  Object.assign(hoverBadge.style, {
    position: "fixed",
    background: "#222",
    color: "#fff",
    fontSize: "12px",
    padding: "4px 8px",
    borderRadius: "4px",
    zIndex: "99999",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    display: "none",
    pointerEvents: "none",
    transition: "top 0.05s ease, left 0.05s ease"
  });
  document.body.appendChild(hoverBadge);

  const linkRegex = /\b(?:https?:\/\/|www\.)[^\s"<>()]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi;

  function addCursorTrackingBadge(target) {
    const move = (e) => {
      hoverBadge.style.left = (e.clientX + 12) + "px";
      hoverBadge.style.top = (e.clientY - 30) + "px";
    };
    target.addEventListener("mouseenter", () => {
      hoverBadge.style.display = "block";
      document.addEventListener("mousemove", move);
    });
    target.addEventListener("mouseleave", () => {
      hoverBadge.style.display = "none";
      document.removeEventListener("mousemove", move);
    });
  }

  function addFakeUnderline(rect) {
    const line = document.createElement("div");
    Object.assign(line.style, {
      position: "fixed",
      left: rect.left + "px",
      top: rect.bottom + "px",
      width: rect.width + "px",
      height: "2px",
      background: "green",
      zIndex: "99999",
      pointerEvents: "none"
    });
    document.body.appendChild(line);
  }

  function forceUnderlineElement(el, rect) {
    el.style.setProperty("text-decoration", "underline", "important");
    el.style.setProperty("text-decoration-color", "green", "important");
    el.style.setProperty("text-decoration-thickness", "2px", "important");
    el.style.setProperty("text-underline-offset", "2px", "important");

    addCursorTrackingBadge(el);
  }

  function processTarget(el) {
    if (processed.has(el)) return;

    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      forceUnderlineElement(el, rect);
    } else {
      const child = el.querySelector("span, div");
      if (child && !processed.has(child)) {
        const childRect = child.getBoundingClientRect();
        if (childRect.width > 0 && childRect.height > 0) {
          forceUnderlineElement(child, childRect);
          processed.add(child);
          return;
        }
      }

      addFakeUnderline(rect);
      addCursorTrackingBadge(el);
    }

    processed.add(el);
  }

  function scanAndStyle(root = document) {
    const walkDOM = (node) => {
      const roots = [node];

      if (node.querySelectorAll) {
        node.querySelectorAll("*").forEach(el => {
          if (el.shadowRoot) roots.push(el.shadowRoot);
        });
      }

      roots.forEach(rootNode => {
        const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];

        while (walker.nextNode()) {
          const textNode = walker.currentNode;
          if (
            textNode.parentNode &&
            textNode.nodeValue.trim().length > 0 &&
            !processed.has(textNode.parentNode) &&
            !["SCRIPT", "STYLE", "NOSCRIPT"].includes(textNode.parentNode.tagName)
          ) {
            textNodes.push(textNode);
          }
        }

        textNodes.forEach(node => {
          const matches = [...node.nodeValue.matchAll(linkRegex)];
          if (matches.length === 0) return;

          const frag = document.createDocumentFragment();
          let lastIndex = 0;

          matches.forEach(match => {
            const [url] = match;
            const index = match.index;

            if (index > lastIndex) {
              frag.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex, index)));
            }

            const span = document.createElement("span");
            span.textContent = url;
            span.style.textDecoration = "underline";
            span.style.textDecorationColor = "green";
            span.style.textDecorationThickness = "2px";
            span.style.textUnderlineOffset = "2px";

            addCursorTrackingBadge(span);
            processed.add(span);

            frag.appendChild(span);
            lastIndex = index + url.length;
          });

          if (lastIndex < node.nodeValue.length) {
            frag.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex)));
          }

          node.parentNode.replaceChild(frag, node);
        });

        const anchors = rootNode.querySelectorAll?.(
          'a, span[role="link"], div[jsaction*="click"], div[data-header-feature] a, div[data-ved] a, a[jsname]'
        ) || [];
        anchors.forEach(processTarget);
      });
    };

    walkDOM(root);
  }

  const observer = new MutationObserver(() => {
    scanAndStyle();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Google Docs specific case
  if (location.hostname.includes("docs.google.com")) {
    const waitForEditor = () => {
      const editor = document.querySelector(".kix-appview-editor");
      if (!editor) return setTimeout(waitForEditor, 1000);
      console.log("🧠 Google Docs editor ready.");
      scanAndStyle(editor);
    };
    waitForEditor();
  } else {
    scanAndStyle(); // Initial run
  }
})();



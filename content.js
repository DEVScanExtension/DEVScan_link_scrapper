(function () {
  console.log("✅ DEVScan v2: universal link highlighter with Shadow DOM support 🧠");

  const processed = new WeakSet();

  const linkRegex = /(?:https?:\/\/|www\.)\S+/gi;

  function processTarget(el) {
    if (processed.has(el)) return;
  
    const isAnchor = el.tagName === 'A';
    const href = el.getAttribute?.('href');
  
    const isValidLink = isAnchor && href && href.trim() !== '';
  
    if (isValidLink) {
      try {
        const absoluteUrl = new URL(href, window.location.href).href;
        // console.log("🔗 Link found:", absoluteUrl);
        // Send a message to the background script
        chrome.runtime.sendMessage(
          {
            type: "NEW_LINK_FOUND",
            payload: {
              url: absoluteUrl,
              timestamp: Date.now()
            }
          },
          function (response) {
            // Handle the response from the background script
            if (response && response.status === "received") {
              console.log("Link processed successfully:", response.message);
            } else {
              console.error("Error processing link:", response.message);
            }
          }
        );
    } catch (e) {
        console.log("🔗 Invalid link (could not resolve):", href);
    }
        

      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Style the anchor itself
        el.style.textDecoration = "underline";
        el.style.textDecorationColor = "green";
        el.style.textDecorationThickness = "2px";
        el.style.textUnderlineOffset = "2px";
  
        // ✅ Also style block-level children like <h3>, <div>, <span>, etc.
        const children = el.querySelectorAll("*");
        children.forEach(child => {
          child.style.textDecoration = "underline";
          child.style.textDecorationColor = "green";
          child.style.textDecorationThickness = "2px";
          child.style.textUnderlineOffset = "2px";
        });
      }
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

            frag.appendChild(span);
            processed.add(span);

            lastIndex = index + url.length;
          });

          if (lastIndex < node.nodeValue.length) {
            frag.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex)));
          }

          node.parentNode.replaceChild(frag, node);
        });

        const anchors = rootNode.querySelectorAll?.(
          'a, span[role="link"], div[jsaction*="click"], div[data-header-feature] a, div[data-ved] a, a[jsname], a > h3'
        ) || [];
        anchors.forEach(processTarget);
      });
    };

    walkDOM(root);
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scanAndStyle(node); // re-scan only the new stuff
          }
        });
      }
    }
  });

  function waitForBody(callback) {
    if (document.body) {
      callback();
    } else {
      requestAnimationFrame(() => waitForBody(callback));
    }
  }
  
  waitForBody(() => {
    observer.observe(document.body, { childList: true, subtree: true });
    scanAndStyle(); // You can also call initial scan here
  });
  

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

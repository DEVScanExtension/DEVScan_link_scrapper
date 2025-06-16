let linkQueue = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "NEW_LINK_FOUND") {
    const { url, timestamp } = message.payload;
    console.log("📨 Link received in background.js:", url);
    
    linkQueue.push({ url, timestamp });
    sendResponse({ status: "received" });
  }

  return true; // Keep the channel open for async response
});

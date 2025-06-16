let linkQueue = []; // Queue to hold links
const batchSize = 5; // Number of links to process per batch

// Function to process a batch of links
function processBatch() {
  if (linkQueue.length === 0) {
    console.log("No more links to process.");
    return;
  }

  // Process a batch of links
  const batch = linkQueue.splice(0, batchSize); // Get the first batch of links

  console.log(`Processing batch of ${batch.length} links:`, batch);

  // Log remaining links in the queue
  console.log(`Remaining links in queue: ${linkQueue.length}`);

  // Optionally, you could add more logic here for post-processing, etc.

  // Continue processing the next batch if there are more links
  if (linkQueue.length > 0) {
    setTimeout(processBatch, 3000); // Adjust delay as needed
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "NEW_LINK_FOUND") {
    const { url, timestamp } = message.payload;
    console.log("📨 Link received in background.js:", url);

    // Add the new link to the queue
    linkQueue.push({ url, timestamp });

    // Start processing the batch if the queue length reaches the batch size
    if (linkQueue.length % batchSize === 0) {
      processBatch(); // Start processing batches when the batch size is reached
    }

    sendResponse({ status: "received" });
  }

  return true; // Keep the channel open for async response
});

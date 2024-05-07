const fs = require("fs");
const path = require("path");

const inputJson = [];

function formatConversationData(messages) {
  const formattedData = {
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };

  const formattedJsonLine = JSON.stringify(formattedData);

  fs.appendFile(
    path.join(__dirname, "generated.jsonl"),
    formattedJsonLine + "\n",
    (err) => {
      if (err) {
        console.error("Failed to append to file:", err);
      } else {
        console.log("Appended successfully.");
      }
    }
  );
}

formatConversationData(inputJson);

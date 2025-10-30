// --- EXAMPLE USAGE ---

const sampleHtml = `
<!-- This is a top-level comment about the structure -->
<div id="main-container" class="layout-flex" disabled>
    <h1 class="title">My Sample Document</h1>

    <p>This is a paragraph with <strong>nested text</strong> and a line break.<br>
    And here is the second line of text.</p>

    <!-- This is a script block for demonstration -->
    <script type="text/javascript">
        // The parser must treat this as multiline text.
        function setup() {
            const data = {
                id: 1,
                name: 'test'
            };
            console.log(data.name);
        }
        setup();
    </script>

    <input type="text" placeholder="Enter name" required>

    <!-- Empty div placeholder -->
    <div class="footer"></div>
</div>
`;

console.log("--- Original HTML Input ---");
console.log(sampleHtml.trim());
console.log("\n" + "=".repeat(50) + "\n");


// 1. Convert HTML to JSON
const jsonOutput = htmlToJson(sampleHtml);

console.log("--- JSON Output Structure ---");
// Use JSON.stringify for clean, indented output
console.log(JSON.stringify(jsonOutput, null, 2));
console.log("\n" + "=".repeat(50) + "\n");


// 2. Convert JSON back to HTML
const htmlOutput = jsonToHtml(jsonOutput);

console.log("--- Reconstructed HTML Output ---");
console.log(htmlOutput.trim());
console.log("\n" + "=".repeat(50) + "\n");


// 3. Verification
if (htmlOutput.replace(/\s+/g, ' ').trim() === sampleHtml.replace(/\s+/g, ' ').trim()) {
    console.log("Verification successful: Original HTML structurally matches the reconstructed HTML.");
} else {
    console.log("Verification failed: There might be slight structural differences or whitespace variations.");
}

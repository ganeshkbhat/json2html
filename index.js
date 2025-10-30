/**
 * HTML and JSON Conversion Utility
 *
 * This script provides two primary functions:
 * 1. htmlToJson(html) - Converts an HTML string (including comments, tags, attributes, and text)
 * into a structured JSON object. It specifically handles multiline JavaScript content within
 * <script> tags as a single 'text' node.
 * 2. jsonToHtml(json) - Reconstructs the HTML string from the structured JSON object.
 */

// --- UTILITY FUNCTIONS ---

/**
 * Extracts attributes from an opening HTML tag string.
 * @param {string} tagString - The string of the opening tag (e.g., 'div id="main" class="container"').
 * @returns {Object} A map of attribute keys to values.
 */
function extractAttributes(tagString) {
    const attributes = {};
    // Regex to find attribute key="value" or key='value' or just key
    const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:'([^']*)'|"([^"]*)"))?/g;

    let match;
    while ((match = attrRegex.exec(tagString)) !== null) {
        const key = match[1];
        // Value is captured in group 2 (single quotes) or group 3 (double quotes).
        // If neither, the attribute is a boolean/valueless attribute (e.g., 'disabled').
        const value = match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : '';
        attributes[key] = value;
    }
    return attributes;
}

/**
 * Parses an HTML string into a structured JSON representation recursively.
 * @param {string} html - The HTML string to parse.
 * @returns {Array<Object>} An array of JSON nodes representing the parsed HTML structure.
 */
function htmlToJson(html) {
    let index = 0;
    const nodes = [];

    // Helper to advance the index and return the substring
    const consume = (length) => {
        const content = html.substring(index, index + length);
        index += length;
        return content;
    };

    // Helper to find the index of a substring
    const indexOf = (str) => html.indexOf(str, index);

    // Main parsing loop
    while (index < html.length) {
        const nextOpenBracket = indexOf('<');

        // 1. Handle Text Node (everything before the next '<')
        if (nextOpenBracket === -1) {
            // Remaining content is text
            const remainingText = html.substring(index).trim();
            if (remainingText.length > 0) {
                nodes.push({ type: 'text', content: remainingText });
            }
            index = html.length;
            break; // Done parsing
        }

        const textBeforeTag = html.substring(index, nextOpenBracket).trim();
        if (textBeforeTag.length > 0) {
            nodes.push({ type: 'text', content: textBeforeTag });
        }
        index = nextOpenBracket;

        // Ensure we have enough characters for a tag/comment start
        if (index + 1 >= html.length) break;

        // 2. Handle Comment Node (<!-- ... -->)
        if (html.substring(index, index + 4) === '<!--') {
            const commentEnd = indexOf('-->');
            if (commentEnd !== -1) {
                // Consume '<!--' (4 chars)
                consume(4);
                // Extract comment content (up to the end marker)
                const commentContent = html.substring(index, commentEnd).trim();
                nodes.push({ type: 'comment', content: commentContent });
                // Consume comment content and '-->' (3 chars)
                consume(commentEnd - index + 3);
            } else {
                // Malformed comment, treat as text/error
                consume(1); // Consume '<' and continue
            }
            continue;
        }

        // 3. Handle Element Node (<tag ...>)
        if (html[index] === '<' && html[index + 1] !== '/') {
            const tagEnd = indexOf('>');
            if (tagEnd === -1) {
                break; // Malformed tag
            }

            // Extract the full opening tag content (e.g., 'div id="main"')
            const fullTagContent = html.substring(index + 1, tagEnd).trim();

            // Find the tag name (first word)
            const tagNameMatch = fullTagContent.match(/^([a-zA-Z0-9_-]+)/);
            if (!tagNameMatch) {
                consume(1); // Malformed, consume '<' and continue
                continue;
            }
            const tagName = tagNameMatch[1].toLowerCase();

            // Extract attributes string (everything after the tag name)
            const attributesString = fullTagContent.substring(tagName.length).trim();
            const attributes = extractAttributes(attributesString);

            // Consume the opening tag
            consume(tagEnd - index + 1);

            const endTag = `</${tagName}>`;
            const endTagIndex = indexOf(endTag);

            const newNode = { type: 'element', tagName, attributes, children: [] };

            // Handle self-closing tags (e.g., <br /> or <input type="text">)
            const isSelfClosing = fullTagContent.endsWith('/') || ['br', 'img', 'input', 'link', 'meta', 'hr', 'source', 'area'].includes(tagName);

            if (isSelfClosing || endTagIndex === -1) {
                // If self-closing or no explicit end tag found, no children are processed.
            } else {
                const innerHTML = html.substring(index, endTagIndex);

                // ** Special Handling for <script> content (multiline text) **
                if (tagName === 'script') {
                    if (innerHTML.trim().length > 0) {
                        newNode.children.push({ type: 'text', content: innerHTML });
                    }
                    consume(innerHTML.length); // Consume inner content
                } else {
                    // Recurse for standard element content
                    newNode.children = htmlToJson(innerHTML);
                    consume(innerHTML.length); // Consume inner content
                }

                // Consume the closing tag
                consume(endTag.length);
            }

            nodes.push(newNode);
            continue;
        }

        // 4. Handle Closing Tag (</tag>) - Should only happen if content is malformed/outer scope is wrong
        if (html[index] === '<' && html[index + 1] === '/') {
             // We are at a closing tag. Since this parser works recursively on innerHTML,
             // a closing tag here means we are finished with the current section.
             // We consume the opening '<' and the loop will end naturally.
            consume(1);
            continue;
        }

        // If nothing matched, consume the character and continue to avoid infinite loop
        consume(1);
    }
    return nodes;
}

// --- HTML SERIALIZER ---

/**
 * Reconstructs an HTML string from a structured JSON node.
 * @param {Object|Array<Object>} jsonNode - The JSON structure (single node or array of nodes).
 * @returns {string} The reconstructed HTML string.
 */
function jsonToHtml(jsonNode) {
    if (Array.isArray(jsonNode)) {
        return jsonNode.map(jsonToHtml).join('');
    }

    const node = jsonNode;
    let html = '';

    switch (node.type) {
        case 'text':
            // Use the content directly, which preserves multiline code from <script>
            html += node.content;
            break;

        case 'comment':
            html += `<!-- ${node.content} -->`;
            break;

        case 'element':
            let attrString = '';
            for (const key in node.attributes) {
                if (Object.hasOwnProperty.call(node.attributes, key)) {
                    // Handle valueless attributes like 'disabled' or 'required'
                    const value = node.attributes[key];
                    if (value === '') {
                        attrString += ` ${key}`;
                    } else {
                        attrString += ` ${key}="${value}"`;
                    }
                }
            }

            const isSelfClosing = ['br', 'img', 'input', 'link', 'meta', 'hr', 'source', 'area'].includes(node.tagName);

            html += `<${node.tagName}${attrString}>`;

            if (!isSelfClosing) {
                // Recursively convert children to HTML
                if (node.children && node.children.length > 0) {
                    html += jsonToHtml(node.children);
                }
                html += `</${node.tagName}>`;
            }
            break;

        default:
            // Ignore unknown types
            break;
    }

    return html;
}


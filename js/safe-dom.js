const ALLOWED_TAGS = new Set([
  "A", "BLOCKQUOTE", "BR", "CODE", "DIV", "EM", "H2", "H3", "H4",
  "HR", "IMG", "LI", "OL", "P", "PRE", "SPAN", "STRONG", "TABLE",
  "TBODY", "TD", "TH", "THEAD", "TR", "UL"
]);
const ALLOWED_ATTRIBUTES = new Set(["alt", "class", "colspan", "height", "href", "rel", "rowspan", "src", "target", "title", "width"]);

function safeUrl(value, image = false) {
  const url = String(value || "").trim();
  if (/^(https?:|\/|\.\/|\.\.\/|#)/i.test(url)) return url;
  if (image && /^data:image\/(?:png|jpeg|webp);base64,/i.test(url)) return url;
  return "";
}

export function sanitizeRichHtml(input) {
  const template = document.createElement("template");
  template.innerHTML = String(input || "");
  const nodes = [...template.content.querySelectorAll("*")];
  for (const node of nodes) {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      node.replaceWith(document.createTextNode(node.textContent || ""));
      continue;
    }
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      if (!ALLOWED_ATTRIBUTES.has(name)) node.removeAttribute(attribute.name);
    }
    if (node.hasAttribute("href")) {
      const url = safeUrl(node.getAttribute("href"));
      if (url) node.setAttribute("href", url); else node.removeAttribute("href");
    }
    if (node.hasAttribute("src")) {
      const url = safeUrl(node.getAttribute("src"), true);
      if (url) node.setAttribute("src", url); else node.removeAttribute("src");
    }
    if (node.getAttribute("target") === "_blank") node.setAttribute("rel", "noopener noreferrer");
  }
  return template.innerHTML;
}

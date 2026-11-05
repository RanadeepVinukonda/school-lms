const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'pre', 'code', 'blockquote', 'hr', 'div', 'span',
  'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'sub', 'sup', 'small', 'mark', 'del', 'ins',
]);

const ALLOWED_ATTRS = new Set([
  'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
  'class', 'id', 'style', 'title', 'download',
]);

const URI_ATTRS = new Set(['href', 'src']);

function sanitizeAttrs(attrs: NamedNodeMap): string {
  let result = '';
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    const name = attr.name.toLowerCase();
    if (!ALLOWED_ATTRS.has(name)) continue;
    let value = attr.value;
    if (URI_ATTRS.has(name)) {
      const lower = value.toLowerCase().trim();
      if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) continue;
    }
    if (name === 'href' && !value.startsWith('http') && !value.startsWith('/') && !value.startsWith('#') && !value.startsWith('mailto:')) continue;
    result += ` ${name}="${value.replace(/"/g, '&quot;')}"`;
  }
  return result;
}

export function sanitizeHtml(html: string): string {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>/g, '');
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const body = doc.body;
  function cleanNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      let inner = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        inner += cleanNode(el.childNodes[i]);
      }
      return inner;
    }
    const attrs = sanitizeAttrs(el.attributes);
    let inner = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      inner += cleanNode(el.childNodes[i]);
    }
    const voidElements = new Set(['br', 'hr', 'img']);
    if (voidElements.has(tag)) {
      return `<${tag}${attrs} />`;
    }
    return `<${tag}${attrs}>${inner}</${tag}>`;
  }
  let result = '';
  for (let i = 0; i < body.childNodes.length; i++) {
    result += cleanNode(body.childNodes[i]);
  }
  return result;
}

#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(`ensure-canonical: ${message}`);
  process.exit(1);
}

function escapeHtmlAttribute(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isCanonicalLinkTag(tag) {
  const relMatch = tag.match(
    /\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
  );

  if (!relMatch) {
    return false;
  }

  const relValue = relMatch[1] ?? relMatch[2] ?? relMatch[3] ?? '';
  return relValue
    .trim()
    .split(/\s+/)
    .some((token) => token.toLowerCase() === 'canonical');
}

function validateCanonicalUrl(value) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    fail(`invalid canonical URL: ${value}`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    fail('canonical URL must use http:// or https://');
  }

  if (parsed.hash) {
    fail('canonical URL must not contain a fragment (#...)');
  }

  return value;
}

function main() {
  const [, , htmlFileArgument, canonicalUrlArgument] = process.argv;

  if (!htmlFileArgument || !canonicalUrlArgument) {
    fail(
      'usage: node ensure-canonical.js <html-file> <canonical-url>'
    );
  }

  const htmlFile = path.resolve(process.cwd(), htmlFileArgument);
  const canonicalUrl = validateCanonicalUrl(canonicalUrlArgument.trim());

  if (!fs.existsSync(htmlFile)) {
    fail(`file not found: ${htmlFileArgument}`);
  }

  const originalHtml = fs.readFileSync(htmlFile, 'utf8');
  const lineEnding = originalHtml.includes('\r\n') ? '\r\n' : '\n';

  const headOpenMatch = /<head\b[^>]*>/i.exec(originalHtml);
  if (!headOpenMatch) {
    fail(`missing <head> element in ${htmlFileArgument}`);
  }

  const headContentStart = headOpenMatch.index + headOpenMatch[0].length;
  const headCloseMatch = /<\/head\s*>/i.exec(
    originalHtml.slice(headContentStart)
  );

  if (!headCloseMatch) {
    fail(`missing </head> element in ${htmlFileArgument}`);
  }

  const headContentEnd = headContentStart + headCloseMatch.index;
  const headContent = originalHtml.slice(headContentStart, headContentEnd);

  // Remove every existing canonical link from <head>, regardless of
  // attribute order or quoting style, so the result always contains one.
  const withoutCanonical = headContent.replace(/<link\b[^>]*>/gi, (tag) =>
    isCanonicalLinkTag(tag) ? '' : tag
  );

  const indentationMatch = withoutCanonical.match(
    /(?:^|\r?\n)([\t ]+)\S/
  );
  const indentation = indentationMatch ? indentationMatch[1] : '  ';
  const canonicalTag = `${indentation}<link rel="canonical" href="${escapeHtmlAttribute(
    canonicalUrl
  )}">`;

  const normalizedHeadContent = withoutCanonical.trimEnd();
  const updatedHeadContent =
    normalizedHeadContent.length > 0
      ? `${normalizedHeadContent}${lineEnding}${canonicalTag}${lineEnding}`
      : `${lineEnding}${canonicalTag}${lineEnding}`;

  const updatedHtml =
    originalHtml.slice(0, headContentStart) +
    updatedHeadContent +
    originalHtml.slice(headContentEnd);

  if (updatedHtml === originalHtml) {
    console.log(
      `Canonical already correct: ${htmlFileArgument} -> ${canonicalUrl}`
    );
    return;
  }

  fs.writeFileSync(htmlFile, updatedHtml, 'utf8');
  console.log(`Canonical set: ${htmlFileArgument} -> ${canonicalUrl}`);
}

main();

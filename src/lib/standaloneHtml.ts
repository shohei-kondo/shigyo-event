import { readFile } from 'node:fs/promises';

type VariantKey = 'v2' | 'v3';

type VariantConfig = {
  sourcePath: string;
  profileImageId: string;
};

const variants: Record<VariantKey, VariantConfig> = {
  v2: {
    sourcePath: '../../artifact/lawyer-standalone/lawyer-v2-standalone.html',
    profileImageId: '0662fd60-c6b7-4be3-b592-79c61a8b8fbb',
  },
  v3: {
    sourcePath: '../../artifact/lawyer-standalone/lawyer-v3-standalone.html',
    profileImageId: '0f4ef4a6-7b3b-4402-9de7-b055ad6c5f79',
  },
};

const profilePhotoPath = '../../input/profile-0426cut-web.jpg';
const LOGO_URL = '/shigyo-event/comet-logo.png';
const LOGO_WHITE_URL = '/shigyo-event/comet-logo-white.png';
const DAIHON_GIF_URL = '/shigyo-event/daihon.gif';
const CHECKLIST_GIF_URL = '/shigyo-event/checklist.gif';
const KAIJO_GIF_URL = '/shigyo-event/kaijyo.gif';
const manifestPattern =
  /(<script type="__bundler\/manifest">\s*)([\s\S]*?)(\s*<\/script>)/;

export async function renderStandaloneVariant(variantKey: VariantKey) {
  const variant = variants[variantKey];
  const [html, profilePhoto] = await Promise.all([
    readFile(new URL(variant.sourcePath, import.meta.url), 'utf8'),
    readFile(new URL(profilePhotoPath, import.meta.url)),
  ]);

  const withProfileImage = replaceManifestImage(
    html,
    variant.profileImageId,
    'image/jpeg',
    profilePhoto.toString('base64'),
  );
  return injectCommonLpAdjustments(patchBundlerShell(withProfileImage), variantKey);
}

function patchBundlerShell(html: string) {
  // ローディング画面を COMET ロゴに差し替え（シールドSVG＋「イベント幹事サポート」を廃止）。
  const thumbnailHtml = `<div id="__bundler_thumbnail"><img src="${LOGO_WHITE_URL}" alt="COMET" style="width:min(220px,55vw);height:auto;display:block"></div>`;
  const patched = html.replace(
    /<div id="__bundler_thumbnail">[\s\S]*?<\/div>\s*<div id="__bundler_loading">/,
    `${thumbnailHtml}\n  <div id="__bundler_loading">`,
  );
  return patched.replace(
    '#__bundler_thumbnail svg { width: 100%; height: 100%; object-fit: contain; }',
    '#__bundler_thumbnail img { width: min(220px, 55vw); height: auto; }',
  );
}

function replaceManifestImage(
  html: string,
  imageId: string,
  mime: string,
  base64Data: string,
) {
  const match = html.match(manifestPattern);
  if (!match || match.index === undefined) {
    throw new Error('Bundler manifest was not found in the standalone HTML.');
  }

  const manifest = JSON.parse(match[2]) as Record<
    string,
    { mime: string; compressed: boolean; data: string }
  >;
  if (!manifest[imageId]) {
    throw new Error(`Profile image ID was not found: ${imageId}`);
  }

  manifest[imageId] = {
    ...manifest[imageId],
    mime,
    compressed: false,
    data: base64Data,
  };

  const updatedManifest = JSON.stringify(manifest);
  return [
    html.slice(0, match.index),
    match[1],
    updatedManifest,
    match[3],
    html.slice(match.index + match[0].length),
  ].join('');
}

function injectCommonLpAdjustments(html: string, variantKey: VariantKey) {
  const payload = JSON.stringify({
    variantKey,
    deliverables: {
      daihon: DAIHON_GIF_URL,
      checklist: CHECKLIST_GIF_URL,
      venue: KAIJO_GIF_URL,
    },
  });
  const injection = `
<style id="codex-lp-adjustments-style">
  .codex-deliverables,
  .codex-company-about {
    font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .codex-deliverables {
    padding: 72px 24px;
    background: #fff;
  }

  .codex-section-inner {
    max-width: 1120px;
    margin: 0 auto;
  }

  .codex-section-label {
    display: block;
    margin-bottom: 8px;
    color: #a08550;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
  }

  .codex-section-title {
    margin: 0 0 10px;
    color: #1c1917;
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(26px, 3vw, 34px);
    line-height: 1.5;
  }

  .codex-section-lead {
    margin: 0 0 34px;
    color: #5a5550;
    font-size: 15px;
    line-height: 1.9;
  }

  .codex-deliverables-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    max-width: 900px;
    margin: 0 auto;
  }

  .codex-deliverable-card {
    overflow: hidden;
    border: 1px solid #e7ded2;
    background: #fffdf9;
    box-shadow: 0 10px 26px rgba(28, 25, 23, 0.08);
  }

  .codex-deliverable-card img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    object-position: center;
    background: #f4f0ea;
  }

  /* 進行台本・幹事メモは旧サンプル向けにぼかしを入れていたが、GIF差し替え後は鮮明に表示する。 */
  .codex-deliverable-card > img {
    filter: none;
    transform: none;
    object-fit: contain;
    background: #f4f0ea;
  }

  .codex-venue-preview {
    position: relative;
    overflow: hidden;
    aspect-ratio: 4 / 3;
    background: #eef2f6;
  }

  .codex-venue-preview img {
    width: 100%;
    height: 100%;
    aspect-ratio: auto;
    object-fit: cover;
    filter: blur(1.2px) saturate(0.9) contrast(0.96);
    transform: scale(1.04);
  }

  .codex-venue-preview::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(27,58,107,0.08));
    pointer-events: none;
  }

  .codex-venue-chip {
    position: absolute;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 0 10px;
    border: 1px solid rgba(255,255,255,0.72);
    background: rgba(27,58,107,0.86);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    box-shadow: 0 6px 18px rgba(0,0,0,0.16);
  }

  .codex-venue-chip--summary {
    left: 14px;
    top: 14px;
  }

  .codex-venue-chip--candidate {
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
  }

  .codex-venue-chip--table {
    left: 14px;
    bottom: 14px;
    background: rgba(160,133,80,0.9);
  }

  .codex-deliverable-body {
    padding: 18px 18px 20px;
  }

  .codex-deliverable-badge {
    display: inline-block;
    margin-bottom: 9px;
    color: #a08550;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
  }

  .codex-deliverable-title {
    margin: 0 0 8px;
    color: #1c1917;
    font-family: 'Noto Serif JP', serif;
    font-size: 17px;
    line-height: 1.55;
  }

  .codex-deliverable-text {
    margin: 0;
    color: #5a5550;
    font-size: 13px;
    line-height: 1.75;
  }

  .codex-company-about {
    padding: 72px 24px;
    background: #fff;
  }

  .codex-about-panel {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 42px;
    align-items: start;
    padding: 34px;
    border: 1px solid #e7ded2;
    background: #fffdf9;
  }

  .codex-about-photo {
    overflow: hidden;
    aspect-ratio: 3 / 4;
    background: #eee8df;
  }

  .codex-about-photo img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
  }

  .codex-about-role {
    margin: 0 0 4px;
    color: #a08550;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
  }

  .codex-about-name {
    margin: 0 0 18px;
    color: #1c1917;
    font-family: 'Noto Serif JP', serif;
    font-size: 24px;
    line-height: 1.5;
  }

  .codex-about-text {
    margin: 0 0 22px;
    color: #4f4943;
    font-size: 14px;
    line-height: 1.9;
  }

  .codex-reasons-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin: 28px 0 24px;
  }

  .codex-reason-card {
    padding: 18px 18px 20px;
    border-left: 3px solid #a08550;
    background: #f8f4ee;
  }

  .codex-reason-card small {
    display: block;
    margin-bottom: 8px;
    color: #a08550;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
  }

  .codex-reason-title {
    margin: 0 0 10px;
    color: #1c1917;
    font-family: 'Noto Serif JP', serif;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.65;
  }

  .codex-reason-text {
    margin: 0;
    color: #4f4943;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.85;
  }

  .codex-about-actions {
    margin-top: 4px;
  }

  .codex-company-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 0 18px;
    border: 1px solid #1b3a6b;
    background: #1b3a6b;
    color: #fff !important;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
  }

  .codex-site-footer {
    background: #15120f;
    color: #fff;
    font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .codex-site-footer__inner {
    display: grid;
    gap: 18px;
    max-width: 1120px;
    margin: 0 auto;
    padding: 30px 24px 26px;
  }

  .codex-site-footer__top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .codex-site-footer__brand {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .codex-site-footer__logo {
    display: block;
    width: auto;
    height: 28px;
    flex-shrink: 0;
  }

  .codex-site-footer__label {
    display: block;
    margin-bottom: 4px;
    color: #c8a86a;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
  }

  .codex-site-footer__company {
    color: #fff !important;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.5;
    text-decoration: none !important;
  }

  .codex-site-footer__company:hover {
    text-decoration: underline !important;
  }

  .codex-site-footer__link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 999px;
    color: #fff !important;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none !important;
    white-space: nowrap;
  }

  .codex-site-footer__link:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .codex-site-footer__bottom {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.66);
    font-size: 12px;
    line-height: 1.7;
  }

  .codex-hero,
  .codex-site-header,
  .codex-realities,
  .codex-common-issues,
  .codex-plan-guide {
    font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .codex-site-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    width: 100%;
    border-bottom: 1px solid #e3ddd4;
    background: rgba(255, 253, 249, 0.96);
    backdrop-filter: blur(10px);
    transition: box-shadow 0.2s ease;
  }

  body.codex-has-fixed-header {
    padding-top: var(--codex-header-height, 68px);
  }

  .codex-site-header.is-scrolled {
    box-shadow: 0 6px 18px rgba(28, 25, 23, 0.1);
  }

  .codex-site-header__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    max-width: 1120px;
    min-height: 68px;
    margin: 0 auto;
    padding: 0 24px;
    transition: min-height 0.2s ease;
  }

  .codex-site-header.is-scrolled .codex-site-header__inner {
    min-height: 52px;
  }

  .codex-site-header__logo {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
  }

  .codex-site-header__logo img {
    display: block;
    width: auto;
    height: 30px;
    transition: height 0.2s ease;
  }

  .codex-site-header.is-scrolled .codex-site-header__logo img {
    height: 24px;
  }

  .codex-site-header__brand {
    color: #1b3a6b;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .codex-site-header__cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0 18px;
    border: 1px solid #1b3a6b;
    border-radius: 4px;
    background: #1b3a6b;
    color: #fff !important;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none !important;
    white-space: nowrap;
  }

  .codex-hero {
    padding: 84px 24px 72px;
    background: #f7f3ec;
  }

  .codex-hero__inner {
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
    gap: 44px;
    align-items: center;
    max-width: 1120px;
    margin: 0 auto;
  }

  .codex-hero__eyebrow,
  .codex-realities__eyebrow,
  .codex-issues__eyebrow,
  .codex-plan__eyebrow {
    display: block;
    margin-bottom: 12px;
    color: #a08550;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.2em;
  }

  .codex-hero__title {
    margin: 0 0 20px;
    color: #15120f;
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(28px, 3.4vw, 46px);
    line-height: 1.55;
  }

  .codex-hero__title-nowrap {
    white-space: nowrap;
  }

  .codex-hero__lead {
    margin: 0 0 24px;
    color: #3f3933;
    font-size: 15px;
    line-height: 2;
  }

  .codex-hero__note {
    margin: 0 0 26px;
    padding: 18px 20px;
    border-left: 3px solid #a08550;
    background: #fffdf9;
    color: #26364f;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.9;
  }

  .codex-hero__actions,
  .codex-plan__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .codex-hero__button,
  .codex-plan__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 46px;
    padding: 0 20px;
    border: 1px solid #1b3a6b;
    border-radius: 4px;
    background: #1b3a6b;
    color: #fff !important;
    font-size: 14px;
    font-weight: 700;
    text-decoration: none !important;
  }

  .codex-hero__button--secondary {
    background: #fff;
    color: #1b3a6b !important;
  }

  .codex-hero__image {
    overflow: hidden;
    min-height: 420px;
    border: 1px solid #dfd5c8;
    background: #e5ded4;
  }

  .codex-hero__image img {
    display: block;
    width: 100%;
    max-width: 100%;
    height: 100%;
    min-height: 420px;
    object-fit: cover;
    object-position: center;
  }

  .codex-realities,
  .codex-common-issues,
  .codex-plan-guide {
    padding: 72px 24px;
    background: #fff;
  }

  .codex-realities {
    background: #eeeae1;
  }

  .codex-realities__inner,
  .codex-issues__inner,
  .codex-plan__inner {
    max-width: 1040px;
    margin: 0 auto;
  }

  .codex-realities__title,
  .codex-issues__title,
  .codex-plan__title {
    margin: 0 0 28px;
    color: #15120f;
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(24px, 3vw, 34px);
    line-height: 1.6;
    text-align: center;
  }

  .codex-realities__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .codex-reality,
  .codex-issue,
  .codex-plan-card {
    border: 1px solid #e4ddd2;
    background: #fffdf9;
  }

  .codex-reality {
    padding: 24px 22px;
  }

  .codex-reality h3 {
    margin: 0 0 10px;
    color: #1b3a6b;
    font-family: 'Noto Serif JP', serif;
    font-size: 17px;
    line-height: 1.55;
  }

  .codex-reality p {
    margin: 0;
    color: #3f3933;
    font-size: 14px;
    line-height: 1.9;
  }

  .codex-issue p {
    margin: 0;
    color: #1d2638;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.85;
  }

  .codex-issues__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .codex-issue {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 14px;
    padding: 20px;
  }

  .codex-issue__num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    background: #f1e8d7;
    color: #a08550;
    font-weight: 700;
  }

  .codex-plan-guide {
    background: #fff;
  }

  .codex-plan__lead {
    max-width: 720px;
    margin: -12px auto 28px;
    color: #5a5550;
    font-size: 14px;
    line-height: 1.9;
    text-align: center;
  }

  .codex-plan__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .codex-plan-table {
    max-width: 760px;
    margin: 0 auto;
    border-top: 1px solid #ebe5dc;
    background: #f7f4ef;
  }

  .codex-plan-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    align-items: center;
    gap: 18px;
    min-height: 66px;
    padding: 14px 20px;
    border-bottom: 1px solid #ebe5dc;
    color: #2f2a25 !important;
    text-decoration: none !important;
    transition: background 0.18s ease, border-color 0.18s ease;
  }

  .codex-plan-row:hover {
    background: #fffdf9;
  }

  .codex-plan-row__problem {
    color: #2f2a25;
    font-size: 14px;
    line-height: 1.65;
  }

  .codex-plan-row__label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid #bdd2e8;
    background: #eef5ff;
    color: #1b4f83;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.4;
    text-align: center;
  }

  .codex-plan-row--free .codex-plan-row__label {
    border-color: #badccf;
    background: #effaf5;
    color: #22704e;
  }

  .codex-plan-row--script .codex-plan-row__label {
    border-color: #dfcda2;
    background: #fff8e8;
    color: #76572a;
  }

  .codex-plan-row--both .codex-plan-row__label {
    border-color: #1b3a6b;
    background: #1b3a6b;
    color: #fff;
  }

  .codex-plan__note {
    max-width: 620px;
    margin: 28px auto 0;
    color: #6b6259;
    font-size: 13px;
    line-height: 1.9;
    text-align: center;
  }

  .codex-plan-guide .codex-plan__actions {
    justify-content: center;
    margin-top: 18px;
  }

  .codex-plan-card {
    display: grid;
    gap: 14px;
    padding: 20px;
    border-left: 5px solid #1b3a6b;
  }

  .codex-plan-card--free {
    border-left-color: #2f8a62;
  }

  .codex-plan-card--venue {
    border-left-color: #1b65a7;
  }

  .codex-plan-card--script {
    border-left-color: #a08550;
  }

  .codex-plan-card--both {
    border-left-color: #1b3a6b;
  }

  .codex-plan-card__problem {
    margin: 0;
    color: #1c1917;
    font-family: 'Noto Serif JP', serif;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.65;
  }

  .codex-plan-card__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .codex-plan-card__tag {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border: 1px solid currentColor;
    color: #1b3a6b;
    font-size: 12px;
    font-weight: 700;
  }

  .codex-plan-card__tag--free {
    color: #2f8a62;
  }

  .codex-plan-card__tag--venue {
    color: #1b65a7;
  }

  .codex-plan-card__tag--script {
    color: #8a6b2f;
  }

  .codex-plan-card__text {
    margin: 0;
    color: #4f4943;
    font-size: 13px;
    line-height: 1.8;
  }

  .codex-plan-card__cta {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0 16px;
    border: 1px solid #1b3a6b;
    background: #1b3a6b;
    color: #fff !important;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none !important;
  }

  .codex-plan-card--free .codex-plan-card__cta {
    border-color: #2f8a62;
    background: #2f8a62;
  }

  .codex-plan-card--venue .codex-plan-card__cta {
    border-color: #1b65a7;
    background: #1b65a7;
  }

  .codex-plan-card--script .codex-plan-card__cta {
    border-color: #8a6b2f;
    background: #8a6b2f;
  }

  .codex-plan__fallback {
    margin-top: 24px;
    padding: 22px;
    border: 1px solid #d8dee8;
    background: #f7f9fc;
    text-align: center;
  }

  .codex-plan__fallback p {
    margin: 0 0 14px;
    color: #3f4956;
    font-size: 14px;
    line-height: 1.8;
  }

  html.codex-lp-variant-v3 section[style*="background:#1B3A6B"] [style*="color:rgba(255,255,255,0.6)"],
  html.codex-lp-variant-v3 section[style*="background:#1B3A6B"] [style*="color:rgba(255,255,255,0.65)"],
  html.codex-lp-variant-v3 section[style*="background:#1B3A6B"] [style*="color:rgba(255,255,255,0.7)"],
  html.codex-lp-variant-v3 section[style*="background:#1B3A6B"] [style*="color:rgba(255,255,255,0.72)"],
  html.codex-lp-variant-v3 section[style*="background:#1B3A6B"] [style*="color:rgba(255,255,255,0.75)"] {
    color: rgba(255,255,255,0.9) !important;
  }

  html.codex-lp-variant-v3 section[style*="background:#1B3A6B"] a[href][style*="border"] {
    border-color: rgba(255,255,255,0.78) !important;
    background: rgba(255,255,255,0.11) !important;
    color: #fff !important;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.18) inset;
  }

  html.codex-lp-variant-v3 section[style*="background:#1B3A6B"] a[href][style*="background:#fff"],
  html.codex-lp-variant-v3 section[style*="background:#1B3A6B"] a[href][style*="background: #fff"] {
    border-color: #fff !important;
    background: #fff !important;
    color: #123160 !important;
    box-shadow: 0 12px 28px rgba(0,0,0,0.18);
  }

  @media (max-width: 920px) {
    .codex-hero__inner {
      grid-template-columns: 1fr;
      gap: 26px;
    }

    .codex-hero__image,
    .codex-hero__image img {
      min-height: 280px;
    }

    .codex-hero__image img {
      width: 100% !important;
      max-width: 100% !important;
      height: 100% !important;
    }

    .codex-realities__grid,
    .codex-issues__grid,
    .codex-plan__grid {
      grid-template-columns: 1fr;
    }

    .codex-plan-row {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .codex-plan-row__label {
      justify-self: start;
    }

    .codex-deliverables-grid,
    .codex-reasons-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .codex-about-panel {
      grid-template-columns: 1fr;
    }

    .codex-about-photo {
      max-width: 260px;
    }
  }

  @media (max-width: 560px) {
    html,
    body {
      overflow-x: hidden;
    }

    body img,
    body picture,
    body video,
    body canvas,
    body svg {
      max-width: 100%;
    }

    body [style*="display:grid"] {
      min-width: 0;
    }

    body [style*="grid-template-columns:repeat(2,1fr)"],
    body [style*="grid-template-columns: repeat(2, 1fr)"],
    body [style*="grid-template-columns:repeat(3,1fr)"],
    body [style*="grid-template-columns: repeat(3, 1fr)"],
    body [style*="grid-template-columns:1fr 1fr"],
    body [style*="grid-template-columns: 1fr 1fr"],
    body [style*="grid-template-columns:200px 1fr"],
    body [style*="grid-template-columns: 200px 1fr"],
    body [style*="grid-template-columns:260px"] {
      grid-template-columns: 1fr !important;
    }

    body a[style*="max-width:300px"] {
      box-sizing: border-box;
      max-width: 100% !important;
    }

    header:not(.codex-site-header),
    section,
    footer {
      max-width: 100vw;
    }

    .codex-site-header__inner {
      min-height: 58px;
      padding: 0 18px;
    }

    .codex-site-header__brand {
      font-size: 13px;
    }

    .codex-site-header__cta {
      min-height: 38px;
      padding: 0 12px;
      font-size: 12px;
    }

    .codex-hero,
    .codex-realities,
    .codex-common-issues,
    .codex-plan-guide,
    .codex-deliverables,
    .codex-company-about {
      padding: 54px 18px;
    }

    .codex-hero__title {
      font-size: 28px;
    }

    .codex-hero__title-nowrap {
      white-space: normal;
    }

    .codex-hero__actions,
    .codex-plan__actions {
      display: grid;
    }

    .codex-hero__button,
    .codex-plan__button,
    .codex-plan-card__cta {
      width: 100%;
    }

    .codex-issue {
      grid-template-columns: 1fr;
    }

    .codex-deliverables-grid,
    .codex-reasons-grid {
      grid-template-columns: 1fr;
    }

    .codex-about-panel {
      padding: 22px;
    }
  }
</style>
<script id="codex-lp-adjustments-script">
  (() => {
    const custom = ${payload};
    document.documentElement.classList.add('codex-lp-variant-' + custom.variantKey);
    let applied = false;

    const text = (node) => (node?.textContent || '').replace(/\\s+/g, ' ').trim();
    const attr = (value) => String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');

    function ensureRuntimeStyles() {
      if (document.getElementById('codex-lp-runtime-style')) return;
      const style = document.createElement('style');
      style.id = 'codex-lp-runtime-style';
      const embeddedStyles = document.getElementById('codex-lp-adjustments-style')?.textContent || '';
      style.textContent = [
        embeddedStyles,
        ".codex-site-header,.codex-hero,.codex-realities,.codex-common-issues,.codex-plan-guide{font-family:'Noto Sans JP',-apple-system,BlinkMacSystemFont,sans-serif}",
        ".codex-site-header{position:fixed;top:0;left:0;right:0;z-index:1000;width:100%;border-bottom:1px solid #e3ddd4;background:rgba(255,253,249,.96);backdrop-filter:blur(10px);transition:box-shadow .2s ease}",
        "body.codex-has-fixed-header{padding-top:var(--codex-header-height,68px)}",
        ".codex-site-header.is-scrolled{box-shadow:0 6px 18px rgba(28,25,23,.1)}",
        ".codex-site-header__inner{display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:1120px;min-height:68px;margin:0 auto;padding:0 24px;transition:min-height .2s ease}",
        ".codex-site-header.is-scrolled .codex-site-header__inner{min-height:52px}",
        ".codex-site-header__logo{display:inline-flex;align-items:center;text-decoration:none}",
        ".codex-site-header__logo img{display:block;width:auto;height:30px;transition:height .2s ease}",
        ".codex-site-header.is-scrolled .codex-site-header__logo img{height:24px}",
        ".codex-site-header__brand{color:#1b3a6b;font-size:14px;font-weight:700;letter-spacing:.04em}",
        ".codex-site-header__cta{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 18px;border:1px solid #1b3a6b;border-radius:4px;background:#1b3a6b;color:#fff!important;font-size:13px;font-weight:700;text-decoration:none!important;white-space:nowrap}",
        ".codex-hero{padding:84px 24px 72px;background:#f7f3ec}",
        ".codex-hero__inner{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:44px;align-items:center;max-width:1120px;margin:0 auto}",
        ".codex-hero__eyebrow,.codex-realities__eyebrow,.codex-issues__eyebrow,.codex-plan__eyebrow{display:block;margin-bottom:12px;color:#a08550;font-size:11px;font-weight:700;letter-spacing:.2em}",
        ".codex-hero__title{margin:0 0 20px;color:#15120f;font-family:'Noto Serif JP',serif;font-size:clamp(28px,3.4vw,46px);line-height:1.55}",
        ".codex-hero__title-nowrap{white-space:nowrap}",
        ".codex-hero__lead{margin:0 0 24px;color:#3f3933;font-size:15px;line-height:2}",
        ".codex-hero__note{margin:0 0 26px;padding:18px 20px;border-left:3px solid #a08550;background:#fffdf9;color:#26364f;font-size:14px;font-weight:700;line-height:1.9}",
        ".codex-hero__actions,.codex-plan__actions{display:flex;flex-wrap:wrap;gap:12px}",
        ".codex-hero__button,.codex-plan__button{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 20px;border:1px solid #1b3a6b;border-radius:4px;background:#1b3a6b;color:#fff!important;font-size:14px;font-weight:700;text-decoration:none!important}",
        ".codex-hero__button--secondary{background:#fff;color:#1b3a6b!important}",
        ".codex-hero__image{overflow:hidden;min-height:420px;border:1px solid #dfd5c8;background:#e5ded4}",
        ".codex-hero__image img{display:block;width:100%!important;max-width:100%!important;height:100%;min-height:420px;object-fit:cover;object-position:center}",
        ".codex-realities,.codex-common-issues,.codex-plan-guide{padding:72px 24px;background:#fff}",
        ".codex-realities{background:#eeeae1}",
        ".codex-realities__inner,.codex-issues__inner,.codex-plan__inner{max-width:1040px;margin:0 auto}",
        ".codex-realities__title,.codex-issues__title,.codex-plan__title{margin:0 0 28px;color:#15120f;font-family:'Noto Serif JP',serif;font-size:clamp(24px,3vw,34px);line-height:1.6;text-align:center}",
        ".codex-realities__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}",
        ".codex-reality,.codex-issue,.codex-plan-card{border:1px solid #e4ddd2;background:#fffdf9}",
        ".codex-reality{padding:24px 22px}",
        ".codex-reality h3{margin:0 0 10px;color:#1b3a6b;font-family:'Noto Serif JP',serif;font-size:17px;line-height:1.55}",
        ".codex-reality p{margin:0;color:#3f3933;font-size:14px;line-height:1.9}",
        ".codex-issue p{margin:0;color:#1d2638;font-size:16px;font-weight:700;line-height:1.85}",
        ".codex-issues__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}",
        ".codex-issue{display:grid;grid-template-columns:42px minmax(0,1fr);gap:14px;padding:20px}",
        ".codex-issue__num{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;background:#f1e8d7;color:#a08550;font-weight:700}",
        ".codex-plan__lead{max-width:720px;margin:-12px auto 28px;color:#5a5550;font-size:14px;line-height:1.9;text-align:center}",
        ".codex-plan__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}",
        ".codex-plan-table{max-width:760px;margin:0 auto;border-top:1px solid #ebe5dc;background:#f7f4ef}",
        ".codex-plan-row{display:grid;grid-template-columns:minmax(0,1fr) 220px;align-items:center;gap:18px;min-height:66px;padding:14px 20px;border-bottom:1px solid #ebe5dc;color:#2f2a25!important;text-decoration:none!important;transition:background .18s ease,border-color .18s ease}.codex-plan-row:hover{background:#fffdf9}",
        ".codex-plan-row__problem{color:#2f2a25;font-size:14px;line-height:1.65}.codex-plan-row__label{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 12px;border:1px solid #bdd2e8;background:#eef5ff;color:#1b4f83;font-size:12px;font-weight:700;line-height:1.4;text-align:center}",
        ".codex-plan-row--free .codex-plan-row__label{border-color:#badccf;background:#effaf5;color:#22704e}.codex-plan-row--script .codex-plan-row__label{border-color:#dfcda2;background:#fff8e8;color:#76572a}.codex-plan-row--both .codex-plan-row__label{border-color:#1b3a6b;background:#1b3a6b;color:#fff}",
        ".codex-plan__note{max-width:620px;margin:28px auto 0;color:#6b6259;font-size:13px;line-height:1.9;text-align:center}",
        ".codex-plan-guide .codex-plan__actions{justify-content:center;margin-top:18px}",
        ".codex-plan-card{display:grid;gap:14px;padding:20px;border-left:5px solid #1b3a6b}",
        ".codex-plan-card--free{border-left-color:#2f8a62}.codex-plan-card--venue{border-left-color:#1b65a7}.codex-plan-card--script{border-left-color:#a08550}.codex-plan-card--both{border-left-color:#1b3a6b}",
        ".codex-plan-card__problem{margin:0;color:#1c1917;font-family:'Noto Serif JP',serif;font-size:17px;font-weight:700;line-height:1.65}",
        ".codex-plan-card__meta{display:flex;flex-wrap:wrap;gap:8px}",
        ".codex-plan-card__tag{display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border:1px solid currentColor;color:#1b3a6b;font-size:12px;font-weight:700}",
        ".codex-plan-card__tag--free{color:#2f8a62}.codex-plan-card__tag--venue{color:#1b65a7}.codex-plan-card__tag--script{color:#8a6b2f}",
        ".codex-plan-card__text{margin:0;color:#4f4943;font-size:13px;line-height:1.8}",
        ".codex-plan-card__cta{justify-self:start;display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 16px;border:1px solid #1b3a6b;background:#1b3a6b;color:#fff!important;font-size:13px;font-weight:700;text-decoration:none!important}",
        ".codex-plan-card--free .codex-plan-card__cta{border-color:#2f8a62;background:#2f8a62}.codex-plan-card--venue .codex-plan-card__cta{border-color:#1b65a7;background:#1b65a7}.codex-plan-card--script .codex-plan-card__cta{border-color:#8a6b2f;background:#8a6b2f}",
        ".codex-plan__fallback{margin-top:24px;padding:22px;border:1px solid #d8dee8;background:#f7f9fc;text-align:center}.codex-plan__fallback p{margin:0 0 14px;color:#3f4956;font-size:14px;line-height:1.8}",
        ".codex-venue-preview{position:relative;overflow:hidden;aspect-ratio:4/3;background:#eef2f6}.codex-venue-preview img{width:100%;height:100%;aspect-ratio:auto;object-fit:cover;filter:blur(1.2px) saturate(.9) contrast(.96);transform:scale(1.04)}",
        ".codex-venue-preview:after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.12),rgba(27,58,107,.08));pointer-events:none}",
        ".codex-venue-chip{position:absolute;z-index:1;display:inline-flex;align-items:center;min-height:26px;padding:0 10px;border:1px solid rgba(255,255,255,.72);background:rgba(27,58,107,.86);color:#fff;font-size:11px;font-weight:700;letter-spacing:.04em;box-shadow:0 6px 18px rgba(0,0,0,.16)}",
        ".codex-venue-chip--summary{left:14px;top:14px}.codex-venue-chip--candidate{right:14px;top:50%;transform:translateY(-50%)}.codex-venue-chip--table{left:14px;bottom:14px;background:rgba(160,133,80,.9)}",
        "@media(max-width:920px){.codex-hero__inner{grid-template-columns:1fr;gap:26px}.codex-hero__image,.codex-hero__image img{min-height:280px}.codex-realities__grid,.codex-issues__grid,.codex-plan__grid,.codex-plan-row{grid-template-columns:1fr}.codex-plan-row{gap:10px}.codex-plan-row__label{justify-self:start}}",
        "@media(max-width:560px){html,body{overflow-x:hidden}.codex-site-header__inner{min-height:58px;padding:0 18px}.codex-site-header__brand{font-size:13px}.codex-site-header__cta{min-height:38px;padding:0 12px;font-size:12px}.codex-hero,.codex-realities,.codex-common-issues,.codex-plan-guide{padding:54px 18px}.codex-hero__title{font-size:28px}.codex-hero__title-nowrap{white-space:normal}.codex-hero__actions,.codex-plan__actions{display:grid}.codex-hero__button,.codex-plan__button,.codex-plan-card__cta{width:100%}.codex-issue{grid-template-columns:1fr}}",
        ".codex-deliverables,.codex-company-about{font-family:'Noto Sans JP',-apple-system,BlinkMacSystemFont,sans-serif}",
        ".codex-deliverables,.codex-company-about{padding:72px 24px;background:#fff}",
        ".codex-section-inner{max-width:1120px;margin:0 auto}",
        ".codex-section-label{display:block;margin-bottom:8px;color:#a08550;font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase}",
        ".codex-section-title{margin:0 0 10px;color:#1c1917;font-family:'Noto Serif JP',serif;font-size:clamp(26px,3vw,34px);line-height:1.5}",
        ".codex-section-lead{margin:0 0 34px;color:#5a5550;font-size:15px;line-height:1.9}",
        ".codex-deliverables-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;max-width:900px;margin:0 auto}",
        ".codex-deliverable-card{overflow:hidden;border:1px solid #e7ded2;background:#fffdf9;box-shadow:0 10px 26px rgba(28,25,23,.08)}",
        ".codex-deliverable-card img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;object-position:center;background:#f4f0ea}",
        ".codex-deliverable-card>img{filter:none;transform:none;object-fit:contain;background:#f4f0ea}",
        ".codex-deliverable-body{padding:18px 18px 20px}",
        ".codex-deliverable-badge{display:inline-block;margin-bottom:9px;color:#a08550;font-size:10px;font-weight:700;letter-spacing:.16em}",
        ".codex-deliverable-title{margin:0 0 8px;color:#1c1917;font-family:'Noto Serif JP',serif;font-size:17px;line-height:1.55}",
        ".codex-deliverable-text{margin:0;color:#5a5550;font-size:13px;line-height:1.75}",
        ".codex-about-panel{display:grid;grid-template-columns:260px minmax(0,1fr);gap:42px;align-items:start;padding:34px;border:1px solid #e7ded2;background:#fffdf9}",
        ".codex-about-photo{overflow:hidden;aspect-ratio:3/4;background:#eee8df}",
        ".codex-about-photo img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}",
        ".codex-about-role{margin:0 0 4px;color:#a08550;font-size:12px;font-weight:700;letter-spacing:.12em}",
        ".codex-about-name{margin:0 0 18px;color:#1c1917;font-family:'Noto Serif JP',serif;font-size:24px;line-height:1.5}",
        ".codex-about-text{margin:0 0 22px;color:#4f4943;font-size:14px;line-height:1.9}",
        ".codex-reasons-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:28px 0 24px}",
        ".codex-reason-card{padding:18px 18px 20px;border-left:3px solid #a08550;background:#f8f4ee}",
        ".codex-reason-card small{display:block;margin-bottom:8px;color:#a08550;font-size:11px;font-weight:700;letter-spacing:.12em}",
        ".codex-reason-title{margin:0 0 10px;color:#1c1917;font-family:'Noto Serif JP',serif;font-size:15px;font-weight:700;line-height:1.65}",
        ".codex-reason-text{margin:0;color:#4f4943;font-size:13px;font-weight:400;line-height:1.85}",
        ".codex-about-actions{margin-top:4px}",
        ".codex-company-link{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 18px;border:1px solid #1b3a6b!important;background:#1b3a6b!important;color:#fff!important;font-size:13px;font-weight:700;text-decoration:none!important}",
        ".codex-site-footer{background:#15120f;color:#fff;font-family:'Noto Sans JP',-apple-system,BlinkMacSystemFont,sans-serif}",
        ".codex-site-footer__inner{display:grid;gap:18px;max-width:1120px;margin:0 auto;padding:30px 24px 26px}",
        ".codex-site-footer__top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:18px}",
        ".codex-site-footer__brand{display:flex;align-items:center;gap:14px;min-width:0}",
        ".codex-site-footer__logo{display:block;width:auto;height:28px;flex-shrink:0}",
        ".codex-site-footer__label{display:block;margin-bottom:4px;color:#c8a86a;font-size:11px;font-weight:700;letter-spacing:.16em}",
        ".codex-site-footer__company{color:#fff!important;font-size:15px;font-weight:700;line-height:1.5;text-decoration:none!important}",
        ".codex-site-footer__company:hover{text-decoration:underline!important}",
        ".codex-site-footer__link{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border:1px solid rgba(255,255,255,.7);border-radius:999px;color:#fff!important;font-size:13px;font-weight:700;text-decoration:none!important;white-space:nowrap}",
        ".codex-site-footer__link:hover{background:rgba(255,255,255,.1)}",
        ".codex-site-footer__bottom{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding-top:14px;border-top:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.66);font-size:12px;line-height:1.7}",
        "html.codex-lp-variant-v3 section[style*='background: rgb(27, 58, 107)']:has(a[href*='/forms/free-consultation/']) p,html.codex-lp-variant-v3 section[style*='background: rgb(27, 58, 107)']:has(a[href*='/forms/free-consultation/']) span{color:rgba(255,255,255,.9)!important}",
        "html.codex-lp-variant-v3 section[style*='background: rgb(27, 58, 107)'] a[href*='/forms/venue-support/'],html.codex-lp-variant-v3 section[style*='background: rgb(27, 58, 107)'] a[href*='/forms/script-support/']{border-color:rgba(255,255,255,.82)!important;background:rgba(255,255,255,.12)!important;color:#fff!important;font-weight:700!important;box-shadow:0 0 0 1px rgba(255,255,255,.18) inset!important}",
        "html.codex-lp-variant-v3 section[style*='background: rgb(27, 58, 107)'] a[href*='/forms/free-consultation/'][style*='background: rgb(255, 255, 255)']{color:#123160!important;background:#fff!important}",
        "@media(max-width:920px){.codex-deliverables-grid,.codex-reasons-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.codex-about-panel{grid-template-columns:1fr}.codex-about-photo{max-width:260px}}",
        "@media(max-width:760px){body [style*='display:grid'],body [style*='display: grid']{min-width:0}body [style*='grid-template-columns:repeat(2,1fr)'],body [style*='grid-template-columns: repeat(2, 1fr)'],body [style*='grid-template-columns:repeat(3,1fr)'],body [style*='grid-template-columns: repeat(3, 1fr)'],body [style*='grid-template-columns:1fr 1fr'],body [style*='grid-template-columns: 1fr 1fr'],body [style*='grid-template-columns:200px 1fr'],body [style*='grid-template-columns: 200px 1fr'],body [style*='grid-template-columns:260px']{grid-template-columns:1fr!important}body a[style*='max-width:300px']{box-sizing:border-box;max-width:100%!important}}",
        "@media(max-width:560px){.codex-deliverables,.codex-company-about{padding:54px 18px}.codex-deliverables-grid,.codex-reasons-grid{grid-template-columns:1fr}.codex-about-panel{padding:22px}}",
      ].filter(Boolean).join('\\n');
      document.head.appendChild(style);
    }

    function parseAlpha(color) {
      const rgba = color.match(/rgba\\(\\s*([0-9.]+),\\s*([0-9.]+),\\s*([0-9.]+),\\s*([0-9.]+)\\s*\\)/);
      if (rgba) {
        return {
          red: Number(rgba[1]),
          green: Number(rgba[2]),
          blue: Number(rgba[3]),
          alpha: Number(rgba[4]),
        };
      }
      const rgb = color.match(/rgb\\(\\s*([0-9.]+),\\s*([0-9.]+),\\s*([0-9.]+)\\s*\\)/);
      if (!rgb) return null;
      return {
        red: Number(rgb[1]),
        green: Number(rgb[2]),
        blue: Number(rgb[3]),
        alpha: 1,
      };
    }

    function luminance(color) {
      return color ? (0.2126 * color.red + 0.7152 * color.green + 0.0722 * color.blue) : 0;
    }

    function hasLightBackground(element, stopAt) {
      let current = element;
      while (current && current !== stopAt) {
        const background = parseAlpha(getComputedStyle(current).backgroundColor);
        if (background && background.alpha > 0.65 && luminance(background) > 220) return true;
        current = current.parentElement;
      }
      return false;
    }

    function improveDarkContrast() {
      const sections = Array.from(document.querySelectorAll('section')).filter((section) => {
        const background = getComputedStyle(section).backgroundColor;
        return background === 'rgb(27, 58, 107)' || background === 'rgba(27, 58, 107, 1)';
      });

      for (const section of sections) {
        for (const element of Array.from(section.querySelectorAll('*'))) {
          const color = parseAlpha(getComputedStyle(element).color);
          if (!hasLightBackground(element, section) && color && luminance(color) < 235) {
            element.style.setProperty('color', 'rgba(255,255,255,0.9)', 'important');
          } else if (color && color.red > 230 && color.green > 230 && color.blue > 230 && color.alpha < 0.86) {
            element.style.setProperty('color', 'rgba(255,255,255,0.9)', 'important');
          }
        }

        for (const link of Array.from(section.querySelectorAll('a[href]'))) {
          const label = text(link);
          if (label.includes('会場選び') || label.includes('進行表・台本')) {
            link.style.setProperty('border-color', 'rgba(255,255,255,0.82)', 'important');
            link.style.setProperty('background', 'rgba(255,255,255,0.12)', 'important');
            link.style.setProperty('color', '#fff', 'important');
            link.style.setProperty('font-weight', '700', 'important');
            link.style.setProperty('box-shadow', '0 0 0 1px rgba(255,255,255,0.18) inset', 'important');
          }
        }
      }

      for (const link of Array.from(document.querySelectorAll('a[href]'))) {
        const label = text(link);
        if (label.includes('会場選びを相談する（') || label.includes('進行表・台本作成を相談する（')) {
          link.style.setProperty('border-color', 'rgba(255,255,255,0.82)', 'important');
          link.style.setProperty('background', 'rgba(255,255,255,0.12)', 'important');
          link.style.setProperty('color', '#fff', 'important');
          link.style.setProperty('font-weight', '700', 'important');
          link.style.setProperty('box-shadow', '0 0 0 1px rgba(255,255,255,0.18) inset', 'important');
        }
      }
    }

    function normalizeMobileOverflow() {
      const viewportWidth = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
      if (viewportWidth > 760) return;
      for (const image of Array.from(document.querySelectorAll('img'))) {
        const rect = image.getBoundingClientRect();
        if (rect.width > viewportWidth + 8 || rect.right > viewportWidth + 8 || rect.left < -8) {
          image.style.setProperty('width', '100vw', 'important');
          image.style.setProperty('max-width', '100vw', 'important');
          image.style.setProperty('height', 'auto', 'important');
          image.style.setProperty('left', '0', 'important');
          image.style.setProperty('right', 'auto', 'important');
          image.style.setProperty('transform', 'none', 'important');
          image.style.setProperty('object-fit', 'cover', 'important');
          const parent = image.parentElement;
          if (parent) {
            parent.style.setProperty('max-width', '100vw', 'important');
            parent.style.setProperty('overflow', 'hidden', 'important');
          }
        }
      }
      for (const grid of Array.from(document.querySelectorAll('[style*="display:grid"], [style*="display: grid"]'))) {
        const columns = getComputedStyle(grid).gridTemplateColumns;
        if (columns && columns.split(' ').length > 1) {
          grid.style.setProperty('grid-template-columns', '1fr', 'important');
        }
      }
    }

    function sectionByText(label) {
      return Array.from(document.querySelectorAll('section')).find((section) =>
        text(section).includes(label),
      );
    }

    function removeRetiredSections() {
      // 差し替え対象外で元HTMLに残る「解決のポイント」セクション（比較表含む）を削除する。
      const section = sectionByText('解決のポイント');
      if (section) section.remove();
    }

    function imageByAlt(alt) {
      return document.querySelector('img[alt="' + alt + '"]')?.getAttribute('src') || '';
    }

    function replaceHeader() {
      if (document.querySelector('.codex-site-header')) return true;
      const header = document.querySelector('header');
      if (!header) return false;
      header.outerHTML = \`
        <header class="codex-site-header">
          <div class="codex-site-header__inner">
            <a class="codex-site-header__logo" href="#" aria-label="ページ先頭へ">
              <img src="${LOGO_URL}" alt="株式会社COMET" />
            </a>
            <a class="codex-site-header__cta" href="/shigyo-event/forms/free-consultation/">まずは無料で相談する</a>
          </div>
        </header>
      \`;
      return true;
    }

    function replaceHero() {
      if (document.querySelector('.codex-hero')) return true;
      const section =
        sectionByText('なんとなく例年通り') ||
        sectionByText('必要なところだけお手伝いします') ||
        sectionByText('持ち回りで幹事');
      if (!section) return false;
      const heroImage = section.querySelector('img')?.getAttribute('src') || imageByAlt('懇親会実施例');

      section.outerHTML = \`
        <section class="codex-hero">
          <div class="codex-hero__inner">
            <div>
              <span class="codex-hero__eyebrow">弁護士会・支部向け</span>
              <h1 class="codex-hero__title">持ち回りの幹事業務、<br><span class="codex-hero__title-nowrap">“なんとなく例年通り”で</span><br>進めていませんか？</h1>
              <p class="codex-hero__lead">
                研修後の懇親会、支部総会、忘年会・新年会。先生方同士の関係づくりや支部活動への参加意欲に関わる大切な機会ですが、
                会場選び、案内、進行、当日の確認が幹事様に集中しがちです。
              </p>
              <div class="codex-hero__actions">
                <a class="codex-hero__button" href="/shigyo-event/forms/free-consultation/">まずは無料で相談する</a>
                <a class="codex-hero__button codex-hero__button--secondary" href="#plan-guide">プランを確認する</a>
              </div>
            </div>
            \${heroImage ? \`
              <div class="codex-hero__image">
                <img src="\${attr(heroImage)}" alt="弁護士会・支部イベントの様子">
              </div>
            \` : ''}
          </div>
        </section>
      \`;
      return true;
    }

    function replaceRealities() {
      // 「見落としがちなこと」セクションは COMMON ISSUES と統合したため、
      // 元セクションが残っていれば取り除く（重複防止）。
      const section = sectionByText('見落としがちなこと');
      if (section) section.remove();
      return true;
    }

    function replaceCommonIssues() {
      if (document.querySelector('.codex-common-issues')) return true;
      const section = sectionByText('つまずき') || sectionByText('つまづき') || sectionByText('COMMON ISSUES');
      const issues = [
        ['会場候補の比較軸がそろわず、どこが良いか決めきれない'],
        ['案内・出欠・リマインドが後回しになり、確認が直前まで残る'],
        ['乾杯・挨拶・締めの進行が、当日までふわっとしている'],
        ['確認事項がメモやメールに散らばり、抜け漏れが不安'],
        ['質問と判断が幹事に集中し、本業の合間で対応しきれない'],
      ];

      const html = \`
        <section class="codex-common-issues">
          <div class="codex-issues__inner">
            <span class="codex-issues__eyebrow">COMMON ISSUES</span>
            <h2 class="codex-issues__title">弁護士会・支部イベントで、<br>こんなお困りごとはありませんか？</h2>
            <div class="codex-issues__grid">
              \${issues.map((issue, index) => \`
                <article class="codex-issue">
                  <span class="codex-issue__num">\${String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <p>\${issue[0]}</p>
                  </div>
                </article>
              \`).join('')}
            </div>
          </div>
        </section>
      \`;
      if (section) {
        section.outerHTML = html;
        return true;
      }
      const anchor = document.querySelector('.codex-realities') || document.querySelector('.codex-hero');
      if (!anchor) return false;
      anchor.insertAdjacentHTML('afterend', html);
      return true;
    }

    function replacePlanGuide() {
      if (document.querySelector('.codex-plan-guide')) return true;
      const section = sectionByText('どのプランを選べばよいかわからない方へ');
      const plans = [
        {
          type: 'free',
          problem: 'まだ何も決まっていない',
          label: '無料相談',
          href: '/shigyo-event/forms/free-consultation/',
        },
        {
          type: 'free',
          problem: '何を準備すればよいか、いったん整理したい',
          label: '無料相談',
          href: '/shigyo-event/forms/free-consultation/',
        },
        {
          type: 'venue',
          problem: '候補の探し方・比較軸から相談したい',
          label: '会場選びサポート（2万円）',
          href: '/shigyo-event/forms/venue-support/',
        },
        {
          type: 'venue',
          problem: '会場候補はあるが、条件比較に迷っている',
          label: '会場選びサポート（2万円）',
          href: '/shigyo-event/forms/venue-support/',
        },
        {
          type: 'script',
          problem: '当日の流れ・司会コメントを整えたい',
          label: '進行表・台本作成（3万円）',
          href: '/shigyo-event/forms/script-support/',
        },
        {
          type: 'both',
          problem: '会場も進行も、まとめて見てほしい',
          label: 'まず無料相談へ',
          href: '/shigyo-event/forms/free-consultation/',
        },
      ];

      const html = \`
        <section class="codex-plan-guide" id="plan-guide">
          <div class="codex-plan__inner">
            <span class="codex-plan__eyebrow">PLAN GUIDE</span>
            <h2 class="codex-plan__title">どのプランを選べばよいか<br>わからない方へ</h2>
            <p class="codex-plan__lead">
              今の迷いに近いものを選ぶと、相談先のフォームへ進めます。
            </p>
            <div class="codex-plan-table">
              \${plans.map((plan) => \`
                <a class="codex-plan-row codex-plan-row--\${plan.type}" href="\${plan.href}">
                  <span class="codex-plan-row__problem">\${plan.problem}</span>
                  <span class="codex-plan-row__label">\${plan.label}</span>
                </a>
              \`).join('')}
            </div>
            <p class="codex-plan__note">
              迷った場合は、まず無料相談で状況を伺ったうえで、必要なサポート範囲を一緒に整理します。
            </p>
            <div class="codex-plan__actions">
              <a class="codex-plan__button" href="/shigyo-event/forms/free-consultation/">まずは無料で相談する</a>
            </div>
          </div>
        </section>
      \`;
      if (section) {
        section.outerHTML = html;
        return true;
      }
      const serviceAnchor = document.getElementById('services') || sectionByText('サービス内容と料金');
      const fallbackAnchor = document.querySelector('.codex-common-issues') || document.querySelector('.codex-realities');
      const anchor = serviceAnchor || fallbackAnchor;
      if (!anchor) return false;
      anchor.insertAdjacentHTML(serviceAnchor ? 'afterend' : 'afterend', html);
      return true;
    }

    function replaceDeliverables() {
      if (document.querySelector('.codex-deliverables')) return true;
      const section = sectionByText('成果物のサンプル');
      if (!section) return false;

      const cards = [
        {
          badge: 'SAMPLE',
          title: '進行台本',
          image: custom.deliverables.daihon,
          alt: '進行台本サンプル',
          text: '司会・音響・映像の動きが同時に確認できる進行台本。関係者間の認識合わせに使えます。',
        },
        {
          badge: 'SAMPLE',
          title: '幹事メモ・<br>当日チェックリスト',
          image: custom.deliverables.checklist,
          alt: '幹事メモ・当日チェックリストサンプル',
          text: '当日確認すべき事項や、抜け漏れを防ぐためのメモを実務向けに整理します。',
        },
        {
          badge: 'SAMPLE',
          title: '会場ご提案資料',
          image: custom.deliverables.venue,
          alt: '会場ご提案資料サンプル',
          text: '条件に合わせて複数候補を比較できるよう、雰囲気・導線・設備面を資料化します。',
        },
      ];

      section.outerHTML = \`
        <section class="codex-deliverables" id="deliverables">
          <div class="codex-section-inner">
            <span class="codex-section-label">DELIVERABLES</span>
            <h2 class="codex-section-title">成果物のサンプル</h2>
            <p class="codex-section-lead">実際にお渡しする資料や、当日のサポートイメージです。</p>
            <div class="codex-deliverables-grid">
              \${cards.map((card) => \`
                <article class="codex-deliverable-card">
                  <img src="\${attr(card.image)}" alt="\${attr(card.alt)}">
                  <div class="codex-deliverable-body">
                    <span class="codex-deliverable-badge">\${card.badge}</span>
                    <h3 class="codex-deliverable-title">\${card.title}</h3>
                    <p class="codex-deliverable-text">\${card.text}</p>
                  </div>
                </article>
              \`).join('')}
            </div>
          </div>
        </section>
      \`;
      return true;
    }

    function replaceAbout() {
      if (document.querySelector('.codex-company-about')) return true;
      const section = sectionByText('担当者について');
      if (!section) return false;
      const profileImage = document.querySelector('img[alt="担当者の写真"]')?.getAttribute('src') || '';
      if (!profileImage) return false;

      const reasons = [
        {
          label: '選ばれる理由①',
          title: 'はじめてのイベント担当でも安心の、分かりやすいサポート',
          body: 'イベント開催が初めての幹事様・事務局様にも安心してご依頼いただけるよう、準備の流れや必要な作業を丁寧に整理しながら進行します。「何から始めればいいか分からない」という段階からでも、分かりやすく伴走いたします。',
        },
        {
          label: '選ばれる理由②',
          title: '豊富な現場経験に基づく、安定した準備とスムーズな当日運営',
          body: '数多くのイベント運営で培った知識と経験をもとに、事前準備から当日の進行管理までしっかりサポート。受付、誘導、進行、登壇者対応など、細かな段取りを整えることで、主催者様が安心して本番を迎えられる体制をつくります。',
        },
        {
          label: '選ばれる理由③',
          title: '“お願いしたいところだけ”依頼できる、柔軟なサポート体制',
          body: '企画から丸ごと依頼するだけでなく、受付まわり、当日運営、進行台本作成、事務局サポートなど、必要な部分だけのご依頼も可能です。ご予算や社内承認の状況に合わせて、無理のない形でイベント開催をサポートします。',
        },
        {
          label: '選ばれる理由④',
          title: 'イベントを「開催して終わり」にしない、次につながる設計',
          body: 'セミナー、勉強会、相談会、交流会などは、当日を無事に終えることだけが目的ではありません。参加者満足度を高め、次回参加・個別相談・関係構築につながるよう、受付対応、進行、アンケート、導線づくりまで意識した運営をご提案します。',
        },
      ];

      section.outerHTML = \`
        <section class="codex-company-about" id="profile">
          <div class="codex-section-inner">
            <span class="codex-section-label">ABOUT</span>
            <h2 class="codex-section-title">会社の代表について</h2>
            <div class="codex-about-panel">
              <div class="codex-about-photo">
                <img src="\${attr(profileImage)}" alt="井藤　栞の写真">
              </div>
              <div>
                <p class="codex-about-role">株式会社COMET　代表取締役</p>
                <h3 class="codex-about-name">井藤　栞</h3>
                <p class="codex-about-text">
                  私たちはイベントを通じて「人生を豊かにする"きっかけ"」づくりを行っています。
                </p>
                <p class="codex-about-text">
                  今まで、過去に300名以上をお招きする弁護士会様のセミナー運営や、某省の大臣や国会議員をお招きしたVIP対応を含む医師会様のお集まり等、数多くの士業の皆さまのイベントをお手伝いしてきました。
                </p>
                <p class="codex-about-text">
                  普段の業務もお忙しいなか、一生懸命にイベントのご準備をされる事務局の皆さまや幹事の皆さまの姿に心打たれ「もっと皆さまのお力になることができないか？」、そう考えこのサービスを展開させていただくことを決めました。
                </p>
                <p class="codex-about-text">
                  ぜひ気軽な相談からで大歓迎ですし、いつかは「イベントで困ったらCOMET！」と皆様に覚えていただけるような存在になれたら嬉しいなと思っています。
                </p>
              </div>
            </div>
            <div class="codex-reasons-grid">
              \${reasons.map((reason) => \`
                <article class="codex-reason-card">
                  <small>\${reason.label}</small>
                  <h4 class="codex-reason-title">\${reason.title}</h4>
                  <p class="codex-reason-text">\${reason.body}</p>
                </article>
              \`).join('')}
            </div>
            <div class="codex-about-actions">
              <a class="codex-company-link" href="https://comet-event.co.jp/about/" target="_blank" rel="noopener noreferrer">
                会社概要を見る
              </a>
            </div>
          </div>
        </section>
      \`;
      return true;
    }

    function replaceFooter() {
      if (document.querySelector('.codex-site-footer')) return true;
      const aboutUrl = 'https://comet-event.co.jp/about/';
      const markup = \`
        <footer class="codex-site-footer">
          <div class="codex-site-footer__inner">
            <div class="codex-site-footer__top">
              <div class="codex-site-footer__brand">
                <img class="codex-site-footer__logo" src="${LOGO_WHITE_URL}" alt="株式会社COMET">
                <div class="codex-site-footer__brand-text">
                  <span class="codex-site-footer__label">OPERATED BY</span>
                  <a class="codex-site-footer__company" href="\${aboutUrl}" target="_blank" rel="noopener noreferrer">運営会社：株式会社COMET</a>
                </div>
              </div>
              <a class="codex-site-footer__link" href="\${aboutUrl}" target="_blank" rel="noopener noreferrer">
                会社概要を見る <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div class="codex-site-footer__bottom">
              <span>社内イベントを、組織を動かす設計へ。</span>
              <span>© 2026 名古屋のイベント業なら株式会社COMET ALL RIGHTS RESERVED.</span>
            </div>
          </div>
        </footer>
      \`;
      const footer = document.querySelector('footer');
      if (footer) {
        footer.outerHTML = markup;
      } else {
        // 元HTMLに footer が無い場合は本文末尾に追加する。
        document.body.insertAdjacentHTML('beforeend', markup);
      }
      return true;
    }

    let headerScrollBound = false;
    function hideBundlerShell() {
      const thumb = document.getElementById('__bundler_thumbnail');
      if (thumb) thumb.style.setProperty('display', 'none', 'important');
      const loading = document.getElementById('__bundler_loading');
      if (loading) loading.style.setProperty('display', 'none', 'important');
      const err = document.getElementById('__bundler_err');
      if (err) err.remove();
    }

    function setupHeaderScroll() {
      if (headerScrollBound) return;
      const header = document.querySelector('.codex-site-header');
      if (!header) return;
      headerScrollBound = true;

      // bundle 内の overflow 親要素では sticky が効かないため、body 直下へ移して fixed 固定する。
      if (header.parentElement !== document.body) {
        document.body.insertBefore(header, document.body.firstChild);
      }
      document.body.classList.add('codex-has-fixed-header');

      const syncHeaderOffset = () => {
        const height = Math.ceil(header.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--codex-header-height', height + 'px');
        document.body.style.paddingTop = height + 'px';
      };

      const onScroll = () => {
        const y = window.pageYOffset || document.documentElement.scrollTop || 0;
        header.classList.toggle('is-scrolled', y > 12);
        syncHeaderOffset();
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', syncHeaderOffset, { passive: true });
      onScroll();
    }

    function apply() {
      ensureRuntimeStyles();
      removeRetiredSections();
      hideBundlerShell();
      const isV3 = custom.variantKey === 'v3';
      if (isV3) setupHeaderScroll();
      if (applied) return true;
      const headerDone = isV3 ? replaceHeader() : true;
      const heroDone = isV3 ? replaceHero() : true;
      const realitiesDone = isV3 ? replaceRealities() : true;
      const issuesDone = isV3 ? replaceCommonIssues() : true;
      const planGuideDone = isV3 ? replacePlanGuide() : true;
      const deliverablesDone = isV3 ? replaceDeliverables() : true;
      const aboutDone = isV3 ? replaceAbout() : true;
      const footerDone = isV3 ? replaceFooter() : true;
      if (isV3) improveDarkContrast();
      normalizeMobileOverflow();
      if (headerDone && heroDone && realitiesDone && issuesDone && planGuideDone && deliverablesDone && aboutDone && footerDone) {
        applied = true;
        [120, 500, 1200, 2500].forEach((delay) => {
          setTimeout(() => {
            ensureRuntimeStyles();
            removeRetiredSections();
            hideBundlerShell();
            if (isV3) improveDarkContrast();
            normalizeMobileOverflow();
          }, delay);
        });
        return true;
      }
      return false;
    }

    if (!apply()) {
      const observer = new MutationObserver(() => {
        if (apply()) observer.disconnect();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      window.addEventListener('load', apply, { once: true });
      setTimeout(() => {
        apply();
        observer.disconnect();
      }, 8000);
    }
  })();
</script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${injection}</body>`);
  }
  return `${html}${injection}`;
}

/**
 * 士業イベント幹事サポートLP フォーム受信用 GAS Web アプリ。
 *
 * 役割（3点セット）:
 *   1. スプレッドシートへ1行追記（フォーム種別ごとにシートを分割）
 *   2. 申込者へお礼メール（自動返信文＋入力内容のコピー）
 *   3. 自社（管理者）へ通知メール
 *
 * 静的サイト(GitHub Pages)のフォームJSが、本アプリの exec URL へ JSON を POST する。
 * 本アプリは HTML を配信しない（doGet はヘルスチェック用 JSON のみ）。
 *
 * 設定は「プロジェクトの設定 > スクリプト プロパティ」で行う:
 *   SPREADSHEET_ID   ... 書き込み先スプレッドシートのID（必須）
 *   OWNER_EMAIL      ... 自社通知の宛先（必須。カンマ区切りで複数可）
 *   SENDER_NAME      ... 送信者表示名（任意。既定: イベント幹事サポート）
 *   SENDER_EMAIL     ... 送信元Gmailエイリアス（任意。未設定なら通常の送信元）
 *   REPLY_TO_EMAIL   ... 返信先（任意。未設定なら SENDER_EMAIL）
 *   SEND_USER_COPY   ... 'false' で申込者へのお礼メールを停止（任意）
 */

const DEFAULT_SHEET_NAME = 'responses';
const DEFAULT_SENDER_NAME = 'イベント幹事サポート';

// 申込者へのお礼メール本文（設計書セクション17 / src/data/common.ts の brand.autoReply と対応）
const AUTO_REPLY_LINES = [
  'お問い合わせありがとうございます。',
  '内容を確認のうえ、通常1〜2営業日以内に担当者よりご連絡いたします。',
  '開催時期が近い場合や、お急ぎの場合は、その旨もあわせてお知らせください。',
];

// シート先頭に固定で並べるメタ列
const META_COLUMNS = ['受信日時', '流入元LP', 'プラン', 'フォーム名'];

function doGet(e) {
  return handleHealthCheck_(e);
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const validation = validatePayload_(payload);
    if (!validation.ok) {
      return jsonResponse_({ ok: false, error: validation.error }, 400);
    }

    appendResponse_(payload);
    sendNotifications_(payload);

    return jsonResponse_({ ok: true }, 200);
  } catch (error) {
    return jsonResponse_(
      { ok: false, error: String(error && error.message ? error.message : error) },
      500
    );
  }
}

function handleHealthCheck_(e) {
  const props = PropertiesService.getScriptProperties();
  return jsonResponse_(
    {
      ok: true,
      service: 'shigyo-event-form',
      spreadsheetConfigured: Boolean(props.getProperty('SPREADSHEET_ID')),
      ownerConfigured: Boolean(props.getProperty('OWNER_EMAIL')),
      timestamp: new Date().toISOString(),
    },
    200
  );
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Empty request body.');
  }
  const parsed = JSON.parse(e.postData.contents);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function validatePayload_(payload) {
  if (payload.monitoring) {
    return { ok: true };
  }
  if (!String(payload.name || '').trim()) {
    return { ok: false, error: 'お名前が未入力です。' };
  }
  if (!String(payload.email || '').trim()) {
    return { ok: false, error: 'メールアドレスが未入力です。' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email || ''))) {
    return { ok: false, error: 'メールアドレスの形式が正しくありません。' };
  }
  if (!String(payload.professionType || '').trim()) {
    return { ok: false, error: '士業・団体種別が未入力です。' };
  }
  return { ok: true };
}

function appendResponse_(payload) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('Script property SPREADSHEET_ID is not configured.');
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheetName = sanitizeSheetName_(payload.formType);
  const sheet =
    spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);

  writeRowByHeader_(sheet, buildRowPairs_(payload));
}

/** メタ列＋各入力項目を [ラベル, 値] の配列にして返す */
function buildRowPairs_(payload) {
  const meta = [
    ['受信日時', new Date()],
    ['流入元LP', String(payload.sourcePage || '')],
    ['プラン', String(payload.plan || '')],
    ['フォーム名', String(payload.formTitle || payload.formType || '')],
  ];
  const fields = (payload.fields || []).map(function (f) {
    return [String((f && f.label) || ''), String((f && f.value) || '')];
  });
  return meta.concat(fields);
}

/**
 * ヘッダー行を見ながら行を追記する（動的ヘッダー方式）。
 * 新しいラベルが来たらヘッダーに列を追加し、値はヘッダー順に整列して書き込む。
 */
function writeRowByHeader_(sheet, pairs) {
  let header = [];
  if (sheet.getLastRow() >= 1) {
    const lastCol = Math.max(1, sheet.getLastColumn());
    header = sheet
      .getRange(1, 1, 1, lastCol)
      .getValues()[0]
      .map(function (v) {
        return String(v);
      })
      .filter(function (v) {
        return v !== '';
      });
  }

  let headerChanged = false;
  pairs.forEach(function (pair) {
    if (header.indexOf(pair[0]) === -1) {
      header.push(pair[0]);
      headerChanged = true;
    }
  });

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
  } else if (headerChanged) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
  }

  const valueByLabel = {};
  pairs.forEach(function (pair) {
    valueByLabel[pair[0]] = pair[1];
  });

  const row = header.map(function (label) {
    return Object.prototype.hasOwnProperty.call(valueByLabel, label)
      ? valueByLabel[label]
      : '';
  });
  sheet.appendRow(row);
}

function sanitizeSheetName_(formType) {
  const name = String(formType || '').trim();
  if (!name) return DEFAULT_SHEET_NAME;
  // シート名に使えない文字を除去し、長すぎる場合は切り詰める
  return name.replace(/[\[\]\*\/\\\?:]/g, '-').slice(0, 90) || DEFAULT_SHEET_NAME;
}

function sendNotifications_(payload) {
  if (payload.monitoring) {
    return;
  }

  const props = PropertiesService.getScriptProperties();
  const ownerEmail = props.getProperty('OWNER_EMAIL');
  const mailOptions = getMailOptions_(props);
  const formTitle = String(payload.formTitle || payload.formType || 'お問い合わせ');

  if (ownerEmail) {
    sendEmail_(
      {
        to: ownerEmail,
        subject: `【${formTitle}】${payload.professionType || ''} / ${payload.name || ''}`,
        body: buildOwnerBody_(payload),
        htmlBody: buildOwnerHtmlBody_(payload),
      },
      mailOptions
    );
  }

  if (payload.email && props.getProperty('SEND_USER_COPY') !== 'false') {
    sendEmail_(
      {
        to: payload.email,
        subject: `${formTitle}を受け付けました`,
        body: buildUserBody_(payload, mailOptions),
        htmlBody: buildUserHtmlBody_(payload, mailOptions),
      },
      mailOptions
    );
  }
}

function getMailOptions_(props) {
  const senderEmail = String(props.getProperty('SENDER_EMAIL') || '').trim();
  const senderName = String(
    props.getProperty('SENDER_NAME') || DEFAULT_SENDER_NAME
  ).trim();
  const replyTo = String(
    props.getProperty('REPLY_TO_EMAIL') || senderEmail || ''
  ).trim();

  if (!senderEmail) {
    return { senderName: senderName, replyTo: replyTo };
  }

  const aliases = GmailApp.getAliases();
  if (aliases.indexOf(senderEmail) === -1) {
    throw new Error(
      `SENDER_EMAIL is not configured as a Gmail sending alias: ${senderEmail}`
    );
  }

  return { senderEmail: senderEmail, senderName: senderName, replyTo: replyTo };
}

function sendEmail_(message, options) {
  if (options.senderEmail) {
    GmailApp.sendEmail(message.to, message.subject, message.body, {
      from: options.senderEmail,
      name: options.senderName,
      replyTo: options.replyTo || undefined,
      htmlBody: message.htmlBody,
    });
    return;
  }

  MailApp.sendEmail({
    to: message.to,
    subject: message.subject,
    body: message.body,
    name: options.senderName,
    replyTo: options.replyTo || undefined,
    htmlBody: message.htmlBody,
  });
}

function buildOwnerBody_(payload) {
  return ['新しいお問い合わせを受け付けました。', '', buildResponseSummary_(payload)].join(
    '\n'
  );
}

function buildUserBody_(payload, mailOptions) {
  return []
    .concat([`${payload.name || ''} 様`, ''])
    .concat(AUTO_REPLY_LINES)
    .concat([
      '',
      '--- ご入力内容のコピー ---',
      buildResponseSummary_(payload),
      '',
      mailOptions.senderName || DEFAULT_SENDER_NAME,
    ])
    .join('\n');
}

function buildOwnerHtmlBody_(payload) {
  return [
    '<p>新しいお問い合わせを受け付けました。</p>',
    htmlResponseSummary_(payload),
  ].join('');
}

function buildUserHtmlBody_(payload, mailOptions) {
  return [
    `<p>${escapeHtml_(payload.name || '')} 様</p>`,
    `<p>${AUTO_REPLY_LINES.map(escapeHtml_).join('<br>')}</p>`,
    '<hr>',
    '<p><strong>ご入力内容のコピー</strong></p>',
    htmlResponseSummary_(payload),
    `<p>${escapeHtml_(mailOptions.senderName || DEFAULT_SENDER_NAME)}</p>`,
  ].join('');
}

function htmlResponseSummary_(payload) {
  return `<pre style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;white-space:pre-wrap;line-height:1.7;">${escapeHtml_(
    buildResponseSummary_(payload)
  )}</pre>`;
}

function buildResponseSummary_(payload) {
  const lines = [];
  lines.push(`フォーム: ${payload.formTitle || payload.formType || ''}`);
  lines.push(`流入元LP: ${payload.sourcePage || ''}`);
  lines.push(`プラン: ${payload.plan || ''}`);
  lines.push('');
  (payload.fields || []).forEach(function (f) {
    const label = (f && f.label) || '';
    const value = (f && f.value) || '';
    lines.push(`${label}: ${value || '（未入力）'}`);
  });
  return lines.join('\n');
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonResponse_(body, statusCode) {
  return ContentService.createTextOutput(
    JSON.stringify(Object.assign({ statusCode: statusCode }, body))
  ).setMimeType(ContentService.MimeType.JSON);
}

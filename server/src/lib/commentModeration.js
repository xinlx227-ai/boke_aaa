const COMMENT_MODERATION_STATUS = {
  FLAGGED: "FLAGGED",
  IGNORED: "IGNORED"
};

const COMMENT_MODERATION_RULES = [
  {
    reason: "辱骂攻击",
    keywords: ["fuck", "傻逼", "垃圾", "攻击性表达"]
  },
  {
    reason: "广告引流",
    keywords: ["加微信", "免费领取", "私聊赚钱", "贷款"]
  },
  {
    reason: "违法风险",
    keywords: ["赌博", "博彩", "代开发票"]
  }
];

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function dedupe(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function serializeList(values) {
  return dedupe(values).join("、");
}

function parseList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split("、")
    .map((item) => item.trim())
    .filter(Boolean);
}

function detectCommentModeration(content) {
  const normalizedContent = normalizeText(content);
  const reasons = [];
  const keywords = [];

  for (const rule of COMMENT_MODERATION_RULES) {
    const matchedKeywords = rule.keywords.filter((keyword) =>
      normalizedContent.includes(normalizeText(keyword))
    );

    if (matchedKeywords.length > 0) {
      reasons.push(rule.reason);
      keywords.push(...matchedKeywords);
    }
  }

  if (reasons.length === 0) {
    return null;
  }

  return {
    status: COMMENT_MODERATION_STATUS.FLAGGED,
    reasons: dedupe(reasons),
    keywords: dedupe(keywords),
    reasonText: serializeList(reasons),
    keywordText: serializeList(keywords)
  };
}

function formatCommentModeration(row) {
  return {
    status: row.moderationStatus || null,
    reasons: parseList(row.moderationReason),
    keywords: parseList(row.moderationKeywords),
    reasonText: row.moderationReason || "",
    keywordText: row.moderationKeywords || "",
    moderatedAt: row.moderatedAt || null,
    moderatorId: row.moderatorId == null ? null : Number(row.moderatorId)
  };
}

export {
  COMMENT_MODERATION_STATUS,
  COMMENT_MODERATION_RULES,
  detectCommentModeration,
  formatCommentModeration,
  serializeList
};

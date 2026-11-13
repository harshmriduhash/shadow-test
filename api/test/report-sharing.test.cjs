const test = require('node:test');
const assert = require('node:assert/strict');
const {
    createReportShareToken,
    hashReportShareToken,
    isReportShareToken,
    reportShareExpiry
} = require('../dist/report-sharing.js');

test('report share tokens are high entropy, validated, and stored as one-way hashes', () => {
    const { token, tokenHash } = createReportShareToken();
    assert.equal(isReportShareToken(token), true);
    assert.equal(tokenHash, hashReportShareToken(token));
    assert.notEqual(tokenHash, token);
    assert.equal(tokenHash.length, 64);
    assert.equal(isReportShareToken('short-token'), false);
    assert.notEqual(hashReportShareToken(token), hashReportShareToken(createReportShareToken().token));
});

test('report share expiration uses exact UTC day intervals', () => {
    const now = new Date('2026-11-13T23:30:00.000Z');
    assert.equal(reportShareExpiry(7, now).toISOString(), '2026-11-20T23:30:00.000Z');
    assert.equal(now.toISOString(), '2026-11-13T23:30:00.000Z');
});

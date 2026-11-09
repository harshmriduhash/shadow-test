const test = require('node:test');
const assert = require('node:assert/strict');
const { cursorArgs, cursorPage } = require('../dist/pagination.js');

test('cursorArgs excludes the first record when continuing a page', () => {
    assert.deepEqual(cursorArgs(), {});
    assert.deepEqual(cursorArgs('record-20'), { cursor: { id: 'record-20' }, skip: 1 });
});

test('cursorPage returns only the requested items and a continuation cursor', () => {
    const records = [{ id: 'record-1' }, { id: 'record-2' }, { id: 'record-3' }];
    assert.deepEqual(cursorPage(records, 2, 8), {
        items: records.slice(0, 2),
        totalCount: 8,
        hasMore: true,
        nextCursor: 'record-2'
    });
});

test('cursorPage clears the cursor on the final page', () => {
    const records = [{ id: 'record-1' }];
    assert.deepEqual(cursorPage(records, 2, 1), {
        items: records,
        totalCount: 1,
        hasMore: false,
        nextCursor: null
    });
});

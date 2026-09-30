import { buildDraftPrompt } from './workbookPrompts';
import { normalizeWorkbook, updateWorkbookField, addQuestion, editQuestion, selectQuestion, removeQuestion, workbookText, workbookSections, updateQuestion, characterCount, draftTarget, lengthInstruction } from './questionWorkbooks';

test('legacy single-question content migrates without losing experience or drafts', () => {
  const old = { major: '전공', question: '첫 문항', experienceTitle: '제목', experienceSummary: '기존 경험', draft: '기존 초안', finalDraft: '기존 최종본' };
  const data = normalizeWorkbook(old);
  expect(data.questions).toHaveLength(1);
  expect(data.questions[0]).toMatchObject(oldWithoutMajor(old));
  expect(normalizeWorkbook(JSON.parse(JSON.stringify(data)))).toEqual(data);
});
const oldWithoutMajor = ({ major, ...fields }) => fields;

test('switching questions keeps every scoped field independent and common information shared', () => {
  let data = normalizeWorkbook({ major: '전공', companyName: '기업', question: '첫 문항', experienceSummary: '첫 경험', draft: '첫 초안' });
  const firstId = data.activeQuestionId;
  data = addQuestion(data); const secondId = data.activeQuestionId;
  expect(data.experienceSummary).toBe(''); expect(data.draft).toBe('');
  data = updateWorkbookField(data, 'question', '둘째 문항');
  data = updateWorkbookField(data, 'draft', '둘째 초안');
  data = updateWorkbookField(data, 'companyName', '새 기업');
  data = editQuestion(data, firstId, '첫 문항 수정');
  expect(data.question).toBe('둘째 문항');
  data = selectQuestion(data, firstId);
  expect(data).toMatchObject({ question: '첫 문항 수정', draft: '첫 초안', experienceSummary: '첫 경험', companyName: '새 기업' });
  data = normalizeWorkbook(JSON.parse(JSON.stringify(data)));
  data = selectQuestion(data, secondId);
  expect(data).toMatchObject({ question: '둘째 문항', draft: '둘째 초안', experienceSummary: '', companyName: '새 기업' });
});

test('deleting active or inactive questions preserves survivors and always retains one question', () => {
  let data = normalizeWorkbook({ question: '첫 문항', draft: '첫 초안' }); const firstId = data.activeQuestionId;
  data = addQuestion(data); data = updateWorkbookField(data, 'question', '둘째');
  const secondId = data.activeQuestionId;
  const keepSecond = removeQuestion(data, firstId);
  expect(keepSecond.question).toBe('둘째'); expect(keepSecond.activeQuestionId).toBe(secondId);
  const keepFirst = removeQuestion(data, secondId);
  expect(keepFirst.question).toBe('첫 문항'); expect(keepFirst.draft).toBe('첫 초안');
  expect(removeQuestion(keepFirst, firstId)).toBe(keepFirst);
});

test('all export formats share complete sections for every question, regardless of selection', () => {
  let data = normalizeWorkbook({ question: '첫 문항', draft: '첫 초안', finalDraft: '첫 최종본' });
  data = addQuestion(data); data = updateWorkbookField(data, 'question', '둘째 문항'); data = updateWorkbookField(data, 'finalDraft', '둘째 최종본');
  const text = workbookText(data);
  for (const value of ['첫 문항', '첫 초안', '첫 최종본', '둘째 문항', '둘째 최종본']) expect(text).toContain(value);
  expect(workbookSections(data).filter(section => section.title.endsWith('· 최종본'))).toHaveLength(2);
});

test('question length settings survive legacy migration, inactive edits and reload independently', () => {
  let data = normalizeWorkbook({ question: '기존 문항', draft: '기존 초안' });
  expect(data).toMatchObject({ charLimit: '', charCountMode: 'includeSpaces', draftOverflow: false });
  const firstId = data.activeQuestionId;
  data = updateQuestion(data, firstId, { charLimit: '0500', charCountMode: 'excludeSpaces', draftOverflow: true });
  data = addQuestion(data); const secondId = data.activeQuestionId;
  expect(data).toMatchObject({ charLimit: '', charCountMode: 'includeSpaces', draftOverflow: false });
  data = updateQuestion(data, secondId, { charLimit: '700' });
  data = updateQuestion(data, firstId, { charLimit: '600' });
  expect(data.charLimit).toBe('700');
  data = normalizeWorkbook(JSON.parse(JSON.stringify(data)));
  data = selectQuestion(data, firstId);
  expect(data).toMatchObject({ charLimit: '600', charCountMode: 'excludeSpaces', draftOverflow: true, draft: '기존 초안' });
});

test('invalid stored limits are unset and character counting handles spaces, CRLF and Unicode', () => {
  for (const value of ['0', '-5', '2.5', 'abc', Infinity, '9007199254740992']) expect(normalizeWorkbook({ charLimit: value }).charLimit).toBe('');
  expect(normalizeWorkbook({ charLimit: 500 }).charLimit).toBe('500');
  expect(characterCount('가 나\r\n다😀')).toBe(6);
  expect(characterCount('가 나\r\n다😀', 'excludeSpaces')).toBe(4);
});

test('draft prompt applies the selected limit, optional 120 percent, and factual safeguards', () => {
  let data = normalizeWorkbook({ question: '지원 동기', charLimit: '500', charCountMode: 'excludeSpaces', jdText: '고객 요구 파악', action: '내가 고객 의견을 분류했다' });
  expect(draftTarget(data)).toBe(500);
  const normal = buildDraftPrompt(data);
  expect(normal).toContain('초안도 500자 이내'); expect(normal).not.toContain('600자');
  for (const value of ['공백 제외', '고객 요구 파악', '내가 고객 의견을 분류했다', '약 60%', '입력된 사실과 수치만', '정보가 부족하면 작성 전에']) expect(normal).toContain(value);
  data = updateWorkbookField(data, 'draftOverflow', true);
  expect(draftTarget(data)).toBe(600);
  expect(buildDraftPrompt(data)).toContain('퇴고용 초안만 제한의 120%인 600자');
  expect(lengthInstruction(data)).toContain('최종본도 500자 이내');
  expect(buildDraftPrompt(normalizeWorkbook({}))).toContain('작성 전에 학생에게 제한 글자수');
});

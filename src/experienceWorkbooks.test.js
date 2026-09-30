import { normalizeWorkbook, addQuestion, selectQuestion, updateWorkbookField, workbookText } from './questionWorkbooks';
import { addExperience, updateExperience, selectExperience, archiveExperience, restoreExperience } from './experienceWorkbooks';
import { buildDraftPrompt } from './workbookPrompts';

const addMemo = (data, title, summary) => {
  let next = addExperience(data);
  const id = next.experiences[next.experiences.length - 1].id;
  next = updateExperience(next, id, 'experienceTitle', title);
  next = updateExperience(next, id, 'experienceSummary', summary);
  return { data: next, id };
};

test('legacy single and multiple question experiences migrate without losing any writing', () => {
  const data = normalizeWorkbook({ questions: [
    { id: 'one', question: '첫 문항', experienceTitle: '고객 응대', experienceSummary: '불편 개선', action: '의견 분류', draft: '첫 초안', finalDraft: '첫 최종본' },
    { id: 'two', question: '둘째', experienceTitle: '협업', experienceSummary: '갈등 중재', action: '합의', draft: '둘째 초안' },
  ], activeQuestionId: 'two' });
  expect(data.experiences).toHaveLength(2);
  expect(data).toMatchObject({ experienceTitle: '협업', experienceSummary: '갈등 중재', action: '합의', draft: '둘째 초안' });
  expect(selectQuestion(data, 'one')).toMatchObject({ draft: '첫 초안', finalDraft: '첫 최종본', experienceSummary: '불편 개선' });
  expect(normalizeWorkbook(JSON.parse(JSON.stringify(data)))).toEqual(data);
});

test('switching experience restores STAR, feedback and drafts while limits and question stay shared', () => {
  let data = normalizeWorkbook({ question: '지원 동기', charLimit: '500', experienceTitle: '첫 경험', experienceSummary: '첫 메모', action: '첫 행동', draft: '첫 초안', finalDraft: '첫 최종본' });
  const firstId = data.selectedExperienceId;
  const second = addMemo(data, '둘째 경험', '둘째 메모'); data = selectExperience(second.data, second.id);
  expect(data).toMatchObject({ question: '지원 동기', charLimit: '500', action: '', draft: '', finalDraft: '' });
  data = updateWorkbookField(data, 'action', '둘째 행동');
  data = updateWorkbookField(data, 'aiFeedback', '둘째 피드백');
  data = updateWorkbookField(data, 'draft', '둘째 초안');
  data = selectExperience(data, firstId);
  expect(data).toMatchObject({ action: '첫 행동', draft: '첫 초안', finalDraft: '첫 최종본', experienceSummary: '첫 메모' });
  data = normalizeWorkbook(JSON.parse(JSON.stringify(data)));
  data = selectExperience(data, second.id);
  expect(data).toMatchObject({ action: '둘째 행동', aiFeedback: '둘째 피드백', draft: '둘째 초안' });
  expect(buildDraftPrompt(data)).toContain('경험 제목: 둘째 경험');
  expect(buildDraftPrompt(data)).toContain('Action: 둘째 행동');
});

test('shared experience edits reach linked questions while their STAR remains independent', () => {
  let data = normalizeWorkbook({ question: '첫 문항', experienceTitle: '공통 경험', experienceSummary: '공통 메모', action: '첫 문항 관점' });
  const questionId = data.activeQuestionId, experienceId = data.selectedExperienceId;
  data = addQuestion(data); const secondQuestionId = data.activeQuestionId;
  data = selectExperience(data, experienceId);
  expect(data.action).toBe('');
  data = updateWorkbookField(data, 'action', '둘째 문항 관점');
  data = updateExperience(data, experienceId, 'experienceSummary', '수정된 메모');
  expect(selectQuestion(data, questionId)).toMatchObject({ action: '첫 문항 관점', experienceSummary: '수정된 메모' });
  expect(selectQuestion(data, secondQuestionId)).toMatchObject({ action: '둘째 문항 관점', experienceSummary: '수정된 메모' });
});

test('archive unlinks every question and restore recovers memo and writing after reload', () => {
  let data = normalizeWorkbook({ question: '문항', experienceTitle: '보존할 경험', experienceSummary: '보존할 메모', action: '보존할 행동', draft: '보존할 초안' });
  const experienceId = data.selectedExperienceId;
  data = archiveExperience(data, experienceId);
  expect(data).toMatchObject({ selectedExperienceId: '', experienceTitle: '', action: '', draft: '' });
  data = normalizeWorkbook(JSON.parse(JSON.stringify(data)));
  expect(data.experiences.filter(item => !item.archived)).toHaveLength(0);
  expect(selectExperience(data, experienceId)).toBe(data);
  data = restoreExperience(data, experienceId); data = selectExperience(data, experienceId);
  expect(data).toMatchObject({ experienceTitle: '보존할 경험', experienceSummary: '보존할 메모', action: '보존할 행동', draft: '보존할 초안' });
});

test('unselected writing survives choosing and unselecting a memo and export contains unused memos and saved versions', () => {
  let data = normalizeWorkbook({});
  data = updateWorkbookField(data, 'draft', '경험 선택 전 초안');
  const memo = addMemo(data, '탐색 경험', '<script>메모</script>'); data = selectExperience(memo.data, memo.id);
  expect(data.draft).toBe('');
  data = updateWorkbookField(data, 'draft', '선택 경험의 초안');
  data = selectExperience(data, '');
  expect(data.draft).toBe('경험 선택 전 초안');
  const unused = addMemo(data, '사용하지 않은 경험', '자유 메모');
  const text = workbookText(unused.data);
  for (const value of ['사용하지 않은 경험', '자유 메모', '경험 선택 전 초안', '선택 경험의 초안']) expect(text).toContain(value);
});

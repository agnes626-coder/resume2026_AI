import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { buildFeedbackPrompt } from './workbookPrompts';
import { feedbackComplete } from './feedbackFields';
import { normalizeWorkbook, addQuestion, selectQuestion, updateWorkbookField, workbookText } from './questionWorkbooks';
import { addExperience, selectExperience, archiveExperience, restoreExperience } from './experienceWorkbooks';
jest.mock('./firebase', () => ({}));
jest.mock('./courseService', () => ({}));
jest.mock('docx', () => ({ Document: jest.fn(), Packer: {}, Paragraph: jest.fn(), TextRun: jest.fn() }));
jest.mock('file-saver', () => ({ saveAs: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;

test('evaluation uses the selected facts and actual limit with feedback-only and missing-evidence safeguards', () => {
  const data = normalizeWorkbook({ question: '선택 문항', jdText: '선택 JD', jdRequirements: '분석 요구사항', situation: '2025년 3~6월', task: '과제명과 내 역할', action: '응답 80건 분류', result: '비교 결과', competencyEvidence: '내 근거', jobConnection: '미래 계획', draft: '선택 초안', charLimit: '700', charCountMode: 'excludeSpaces', draftOverflow: true });
  const prompt = buildFeedbackPrompt(data);
  for (const text of ['선택 문항', '선택 JD', '분석 요구사항', '2025년 3~6월', '과제명과 내 역할', '응답 80건 분류', '비교 결과', '내 근거', '미래 계획', '선택 초안', '700자', '840자', '공백 제외']) expect(prompt).toContain(text);
  for (const text of ['각각 5점 만점', '최대 2개', '질문 3~5개', 'Level 3', 'Level 4', '약 60%', '평가 유보', '판정 유보', '답을 대신 만들지', '수정본이나 대체 문장']) expect(prompt).toContain(text);
  expect(prompt).not.toContain('학생 80명의');
});

test('legacy feedback and revisions remain complete without a new optional review note', () => {
  const data = normalizeWorkbook({ aiFeedback: '기존 평가', revisedDraft: '학생의 기존 수정본', draft: '기존 초안' });
  expect(data).toMatchObject({ aiFeedback: '기존 평가', revisedDraft: '학생의 기존 수정본', revisionNotes: '', draft: '기존 초안' });
  expect(feedbackComplete(data)).toBe(true);
  expect(feedbackComplete({ ...data, revisedDraft: ' \n' })).toBe(false);
});

test('student review decisions stay scoped to the question and experience across archive, restore and export', () => {
  let data = normalizeWorkbook({ question: '첫 문항', experienceTitle: '첫 경험', draft: '원본', aiFeedback: '피드백', revisedDraft: '수정본', revisionNotes: '첫 판단' });
  const firstQuestion = data.activeQuestionId; const firstExperience = data.selectedExperienceId;
  data = addExperience(data); const secondExperience = data.experiences[1].id;
  data = selectExperience(data, secondExperience); expect(data.revisionNotes).toBe('');
  data = updateWorkbookField(data, 'revisionNotes', '다른 경험 판단');
  data = selectExperience(data, firstExperience); expect(data.revisionNotes).toBe('첫 판단'); expect(data.draft).toBe('원본');
  data = addQuestion(data); const secondQuestion = data.activeQuestionId;
  data = selectExperience(data, firstExperience); expect(data.revisionNotes).toBe('');
  data = updateWorkbookField(data, 'revisionNotes', '둘째 문항 판단');
  data = selectQuestion(data, firstQuestion); data = archiveExperience(data, secondExperience);
  data = normalizeWorkbook(JSON.parse(JSON.stringify(data))); data = restoreExperience(data, secondExperience);
  for (const value of ['첫 판단', '다른 경험 판단', '둘째 문항 판단', '원본', '피드백', '수정본']) expect(workbookText(data)).toContain(value);
  data = selectExperience(data, secondExperience); expect(data.revisionNotes).toBe('다른 경험 판단');
  data = selectQuestion(data, secondQuestion); expect(data.revisionNotes).toBe('둘째 문항 판단');
});

test('student writes a draft before evaluation, reviews feedback and revises without changing the original', async () => {
  localStorage.setItem('ai_self_intro_full_app_v1', JSON.stringify({ major: '전공', nickname: '학생', courseId: 'general', question: '문항', charLimit: '4' }));
  const container = document.createElement('div'); document.body.appendChild(container); let root = createRoot(container);
  const click = text => act(async () => Array.from(container.querySelectorAll('button')).find(button => button.textContent.includes(text)).click());
  const field = label => { const item = Array.from(container.querySelectorAll('label')).find(element => element.textContent === label); return document.getElementById(item.htmlFor); };
  const fill = (label, value) => act(() => { const element = field(label); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
  try {
    await act(async () => root.render(<App />)); await click('6단계');
    expect(container.querySelector('.feedback-prompt')).toBeNull();
    await click('5단계에서 초안 작성하기'); fill('AI 초안 또는 내가 작성한 초안', '원본 초안');
    await click('6단계');
    const details = container.querySelector('.feedback-prompt'); expect(details.open).toBe(false);
    await act(async () => details.querySelector('summary').click()); expect(details.open).toBe(true);
    expect(details.querySelector('pre').textContent).toContain('원본 초안');
    fill('AI 피드백', '구체적인 방법을 설명하세요'); fill('내가 반영할 피드백과 수정 계획', '방법 설명을 보완하고 확인되지 않은 수치는 제외'); fill('피드백 반영 수정본', '직접 수정한 문장');
    expect(container.querySelector('.feedback-length-over').textContent).toContain('초과');
    const stored = JSON.parse(localStorage.getItem('ai_self_intro_full_app_v1'));
    expect(stored.draft).toBe('원본 초안'); expect(stored.finalDraft).toBe(''); expect(stored.revisionNotes).toContain('확인되지 않은 수치는 제외');
    await click('5단계'); expect(field('AI 초안 또는 내가 작성한 초안').value).toBe('원본 초안');
    await act(async () => { root.unmount(); root = createRoot(container); root.render(<App />); }); await click('6단계');
    expect(field('피드백 반영 수정본').value).toBe('직접 수정한 문장');
    expect(field('내가 반영할 피드백과 수정 계획').value).toContain('확인되지 않은 수치는 제외');
    await click('7단계'); expect(container.querySelector('pre').textContent).toContain('확인되지 않은 수치는 제외');
  } finally { act(() => root.unmount()); container.remove(); localStorage.clear(); }
});

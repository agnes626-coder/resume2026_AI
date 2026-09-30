import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { normalizeWorkbook, updateWorkbookField, addQuestion, selectQuestion, workbookText } from './questionWorkbooks';
import { addExperience, selectExperience, archiveExperience, restoreExperience } from './experienceWorkbooks';
import { competencyConnectionComplete } from './competencyConnections';
import { buildCompetencyPrompt, buildDraftPrompt } from './workbookPrompts';
jest.mock('./firebase', () => ({}));
jest.mock('./courseService', () => ({}));
jest.mock('docx', () => ({ Document: jest.fn(), Packer: {}, Paragraph: jest.fn(), TextRun: jest.fn() }));
jest.mock('file-saver', () => ({ saveAs: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;

test('legacy competency notes survive and are not mistaken for a fully supported job connection', () => {
  const data = normalizeWorkbook({ competencies: '기존 협업 역량', draft: '기존 초안' });
  expect(data).toMatchObject({ competencies: '기존 협업 역량', competencyEvidence: '', jobConnection: '', jdRequirements: '', draft: '기존 초안' });
  expect(competencyConnectionComplete(data)).toBe(false);
  expect(competencyConnectionComplete({ ...data, jdRequirements: '분석', competencyEvidence: '  ', jobConnection: '기여' })).toBe(false);
  expect(normalizeWorkbook({ jdRequirements: ['잘못 저장한 형식'] }).jdRequirements).toBe('');
});

test('evidence and job connection stay with each question and experience through archive, restore, reload and export', () => {
  let data = normalizeWorkbook({ question: '첫 문항', experienceTitle: '첫 경험', competencies: '분석', competencyEvidence: '첫 행동 근거', jobConnection: '첫 직무 연결', jdRequirements: '공통 JD 요구사항' });
  const firstQuestion = data.activeQuestionId; const firstExperience = data.selectedExperienceId;
  data = addExperience(data); const secondExperience = data.experiences[1].id;
  data = selectExperience(data, secondExperience);
  expect(data).toMatchObject({ competencyEvidence: '', jobConnection: '', jdRequirements: '공통 JD 요구사항' });
  data = updateWorkbookField(data, 'competencyEvidence', '다른 경험 근거'); data = updateWorkbookField(data, 'jobConnection', '다른 경험 연결');
  data = selectExperience(data, firstExperience);
  expect(data.competencyEvidence).toBe('첫 행동 근거'); expect(data.jobConnection).toBe('첫 직무 연결');
  data = addQuestion(data); const secondQuestion = data.activeQuestionId;
  data = selectExperience(data, firstExperience);
  expect(data.competencyEvidence).toBe('');
  data = updateWorkbookField(data, 'competencyEvidence', '둘째 문항 근거'); data = updateWorkbookField(data, 'jobConnection', '둘째 문항 연결');
  data = updateWorkbookField(data, 'jdRequirements', '수정한 공통 JD');
  data = selectQuestion(data, firstQuestion); data = archiveExperience(data, secondExperience);
  data = normalizeWorkbook(JSON.parse(JSON.stringify(data))); data = restoreExperience(data, secondExperience);
  for (const text of ['첫 행동 근거', '첫 직무 연결', '다른 경험 근거', '다른 경험 연결', '둘째 문항 근거', '둘째 문항 연결', '수정한 공통 JD']) expect(workbookText(data)).toContain(text);
  data = selectExperience(data, secondExperience);
  expect(data).toMatchObject({ competencyEvidence: '다른 경험 근거', jobConnection: '다른 경험 연결' });
  data = selectQuestion(data, secondQuestion);
  expect(data).toMatchObject({ competencyEvidence: '둘째 문항 근거', jobConnection: '둘째 문항 연결', jdRequirements: '수정한 공통 JD' });
});

test('connection help and draft prompts include supplied JD, STAR, evidence and future contribution without filling example facts', () => {
  const data = normalizeWorkbook({ jdText: 'JD원문 데이터 분석', jdRequirements: '요구사항 분석 역량', action: '직접 분류한 행동', competencies: '핵심 분석', competencyEvidence: '입력한 근거', jobConnection: '향후 기여 계획' });
  expect(competencyConnectionComplete(data)).toBe(true);
  for (const prompt of [buildCompetencyPrompt(data), buildDraftPrompt(data)]) {
    for (const text of ['JD원문 데이터 분석', '요구사항 분석 역량', '직접 분류한 행동', '핵심 분석', '입력한 근거', '향후 기여 계획']) expect(prompt).toContain(text);
    expect(prompt).not.toContain('학생 80명');
  }
  expect(buildCompetencyPrompt(data)).toContain('정보가 부족하면 먼저 질문');
  expect(buildDraftPrompt(data)).toContain('미래의 기여 계획을 과거에 달성한 성과처럼 쓰지 않습니다');
});

test('student fills connection fields, sees completion, and carries evidence into drafting after reload', async () => {
  localStorage.setItem('ai_self_intro_full_app_v1', JSON.stringify({ major: '전공', nickname: '학생', courseId: 'general', question: '문항', experienceTitle: '경험', competencies: '기존 역량', jdText: '채용공고 원문', action: '기존 행동' }));
  const container = document.createElement('div'); document.body.appendChild(container); let root = createRoot(container);
  const click = text => act(async () => Array.from(container.querySelectorAll('button')).find(button => button.textContent.includes(text)).click());
  const field = label => { const item = Array.from(container.querySelectorAll('label')).find(element => element.textContent === label); return document.getElementById(item.htmlFor); };
  const fill = (label, value) => act(() => { const element = field(label); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
  try {
    await act(async () => root.render(<App />)); await click('4단계');
    expect(field('경험에서 찾은 핵심 역량').value).toBe('기존 역량');
    expect(container.querySelectorAll('.competency-reference')).toHaveLength(2);
    expect(container.querySelector('.competency-reference').open).toBe(false);
    fill('JD 핵심 요구사항·역량', '고객 의견 분석'); fill('역량을 입증하는 나의 행동·결과', '의견을 직접 분류했다'); fill('지원 직무와의 연결·기여', '개선 우선순위 제안에 활용');
    expect(container.querySelector('.competency-connection [role=status]').textContent).toContain('모두 작성했습니다');
    await click('5단계'); expect(container.querySelector('.workbook-section pre').textContent).toContain('의견을 직접 분류했다');
    await act(async () => { root.unmount(); root = createRoot(container); root.render(<App />); }); await click('4단계');
    expect(field('지원 직무와의 연결·기여').value).toBe('개선 우선순위 제안에 활용');
    expect(field('JD 핵심 요구사항·역량').value).toBe('고객 의견 분석');
  } finally { act(() => root.unmount()); container.remove(); localStorage.clear(); }
});

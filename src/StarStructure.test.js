import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { starMetrics } from './starMetrics';
import { normalizeWorkbook, addQuestion, selectQuestion, updateWorkbookField } from './questionWorkbooks';
import { addExperience, updateExperience } from './experienceWorkbooks';

jest.mock('./firebase', () => ({}));
jest.mock('./courseService', () => ({}));
jest.mock('docx', () => ({ Document: jest.fn(), Packer: {}, Paragraph: jest.fn(), TextRun: jest.fn() }));
jest.mock('file-saver', () => ({ saveAs: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;

test('empty and whitespace-only STAR shows no percentage rather than an invented score', () => {
  expect(starMetrics({})).toMatchObject({ total: 0, actionPercent: null });
  expect(starMetrics({ situation: '\n', task: ' ', action: '\t\r\n', result: '' }).actionPercent).toBeNull();
});

test('Action share counts Unicode and ignores spacing consistently across all four STAR parts', () => {
  const metrics = starMetrics({ situation: '가 나', task: '다', action: '라 마\n바 사 아😀', result: '차' });
  expect(metrics).toEqual({ counts: { situation: 2, task: 1, action: 6, result: 1 }, total: 10, actionPercent: 60 });
  expect(starMetrics({ action: '나의 행동' }).actionPercent).toBe(100);
  expect(starMetrics({ situation: '상황' }).actionPercent).toBe(0);
});

test('STAR screen restores the selected question and experience and recalculates Action share without rewriting text', async () => {
  let data = normalizeWorkbook({ major: '전공', nickname: '학생', courseId: 'general', question: '첫 문항', experienceTitle: '첫 경험', experienceSummary: '기존 메모', situation: '가나', task: '다', action: '라마바사아자', result: '차' });
  const firstQuestionId = data.activeQuestionId;
  data = addQuestion(data); const secondQuestionId = data.activeQuestionId;
  for (const [key, value] of Object.entries({ question: '둘째 문항', situation: '가', task: '나', action: '다라마', result: '바' })) data = updateWorkbookField(data, key, value);
  data = selectQuestion(data, firstQuestionId);
  data = addExperience(data); const secondExperienceId = data.experiences[data.experiences.length - 1].id;
  data = updateExperience(data, secondExperienceId, 'experienceTitle', '둘째 경험');
  localStorage.setItem('ai_self_intro_full_app_v1', JSON.stringify(data));
  const container = document.createElement('div'); document.body.appendChild(container); let root = createRoot(container);
  const click = text => act(async () => Array.from(container.querySelectorAll('button')).find(button => button.textContent.includes(text)).click());
  const change = (element, value) => act(() => {
    const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
  const field = label => {
    const element = Array.from(container.querySelectorAll('label')).find(item => item.textContent === label);
    return document.getElementById(element.htmlFor);
  };
  try {
    await act(async () => root.render(<App />)); await click('3단계');
    expect(container.querySelector('[role=meter]').getAttribute('aria-valuenow')).toBe('60');
    expect(field('Action (행동)').value).toBe('라마바사아자');
    const guide = container.querySelector('.star-action-guide');
    expect(guide.open).toBe(false); guide.querySelector('summary').click(); expect(guide.open).toBe(true);
    expect(guide.textContent).toContain('본인 주도 역할');
    change(container.querySelector('#active-workbook-question'), secondQuestionId);
    expect(container.querySelector('[role=meter]').getAttribute('aria-valuenow')).toBe('50');
    expect(field('Action (행동)').value).toBe('다라마');
    change(container.querySelector('#active-workbook-question'), firstQuestionId);
    change(container.querySelector('.experience-selection select'), secondExperienceId);
    expect(container.querySelector('[role=meter]')).toBeNull();
    expect(container.querySelector('.star-action-balance').textContent).toContain('STAR를 작성하면');
    change(field('Situation (상황)'), '가나다라마바사아'); change(field('Action (행동)'), '자차');
    expect(container.querySelector('[role=meter]').getAttribute('aria-valuenow')).toBe('20');
    await act(async () => { root.unmount(); root = createRoot(container); root.render(<App />); });
    await click('3단계');
    expect(field('Action (행동)').value).toBe('자차');
    expect(container.querySelector('[role=meter]').getAttribute('aria-valuenow')).toBe('20');
    change(container.querySelector('.experience-selection select'), data.questions[0].selectedExperienceId);
    expect(field('Action (행동)').value).toBe('라마바사아자');
    expect(container.querySelector('[role=meter]').getAttribute('aria-valuenow')).toBe('60');
  } finally { act(() => root.unmount()); container.remove(); localStorage.clear(); }
});

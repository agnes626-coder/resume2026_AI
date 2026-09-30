import { competencyExportFields } from './competencyConnections';
import { normalizeExperiences, updateCompatibilityExperience, experienceExportSections, savedExperienceSections } from "./experienceWorkbooks";

export const questionFields = [
  'question', 'experienceTitle', 'experienceSummary', 'situation', 'task',
  'action', 'result', 'competencies', 'competencyEvidence', 'jobConnection', 'draft', 'aiFeedback', 'revisedDraft',
  'finalDraft', 'reflection', 'charLimit', 'charCountMode', 'draftOverflow', 'selectedExperienceId',
];
const newId = () => globalThis.crypto?.randomUUID?.() || `question-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const normalizeCharLimit = value => {
  const text = String(value ?? '');
  const limit = Number(text);
  return /^\d+$/.test(text) && Number.isSafeInteger(limit) && limit > 0 ? String(limit) : '';
};
const fieldsFrom = source => ({
  ...Object.fromEntries(questionFields.map(key => [key, typeof source?.[key] === 'string' ? source[key] : ''])),
  charLimit: normalizeCharLimit(source?.charLimit),
  charCountMode: source?.charCountMode === 'excludeSpaces' ? 'excludeSpaces' : 'includeSpaces',
  draftOverflow: source?.draftOverflow === true,
});
export const characterCount = (text, mode = 'includeSpaces') => Array.from(mode === 'excludeSpaces' ? text.replace(/\s/g, '') : text.replace(/\r\n?/g, '\n')).length;
export const draftTarget = data => data.charLimit ? Math.floor(Number(data.charLimit) * (data.draftOverflow ? 120 : 100) / 100) : null;
export const lengthInstruction = (data, draft = false) => data.charLimit
  ? `제출 제한: ${data.charLimit}자 이내 (${data.charCountMode === 'excludeSpaces' ? '공백 제외' : '공백 포함'}). ${draft && data.draftOverflow ? `퇴고용 초안만 제한의 120%인 ${draftTarget(data)}자 이내로 작성하고, 최종본은 ${data.charLimit}자 이내로 줄입니다.` : `${draft ? '초안' : '최종본'}도 ${data.charLimit}자 이내로 작성합니다.`}`
  : '제한 글자수 미설정: 임의로 정하지 말고 작성 전에 학생에게 제한 글자수와 공백 계산 기준을 질문합니다.';
const blankQuestion = () => ({ id: newId(), ...fieldsFrom({}) });

export function normalizeWorkbook(saved = {}) {
  const seen = new Set();
  let questions = Array.isArray(saved.questions) ? saved.questions.filter(item => item && typeof item === 'object').map(item => {
    const id = typeof item.id === 'string' && item.id && !seen.has(item.id) ? item.id : newId();
    seen.add(id);
    return { ...item, id, ...fieldsFrom(item) };
  }) : [];
  if (!questions.length) questions = [{ ...blankQuestion(), ...fieldsFrom(saved) }];
  const active = questions.find(item => item.id === saved.activeQuestionId) || questions[0];
  return normalizeExperiences({ ...saved, jdRequirements: typeof saved.jdRequirements === 'string' ? saved.jdRequirements : '', questions, activeQuestionId: active.id, ...fieldsFrom(active) });
}

export function updateWorkbookField(data, key, value) {
  if (['experienceTitle', 'experienceSummary'].includes(key)) return updateCompatibilityExperience(data, key, value);
  if (!questionFields.includes(key)) return { ...data, [key]: value };
  return updateQuestion(data, data.activeQuestionId, { [key]: value });
}

export function updateQuestion(data, id, updates) {
  const questions = data.questions.map(item => item.id === id ? { ...item, ...updates, ...fieldsFrom({ ...item, ...updates }) } : item);
  const changed = questions.find(item => item.id === id);
  return changed ? { ...data, questions, ...(id === data.activeQuestionId ? fieldsFrom(changed) : {}) } : data;
}

export function editQuestion(data, id, question) {
  return updateQuestion(data, id, { question });
}

export function selectQuestion(data, id) {
  const selected = data.questions.find(item => item.id === id);
  return selected ? { ...data, activeQuestionId: id, ...fieldsFrom(selected) } : data;
}

export function addQuestion(data) {
  const added = blankQuestion();
  return { ...data, questions: [...data.questions, added], activeQuestionId: added.id, ...fieldsFrom(added) };
}

export function removeQuestion(data, id) {
  if (data.questions.length <= 1) return data;
  const index = data.questions.findIndex(item => item.id === id);
  if (index < 0) return data;
  const questions = data.questions.filter(item => item.id !== id);
  const next = { ...data, questions };
  return id === data.activeQuestionId ? selectQuestion(next, questions[Math.min(index, questions.length - 1)].id) : next;
}

export function workbookSections(data) {
  const common = [
    { title: '사용자 정보', fields: [['전공', data.major], ['닉네임', data.nickname], ['참가 교과목', data.courseName]] },
    { title: '공통 지원 정보', fields: [['지원 직무', data.jobTitle], ['기업명', data.companyName], ['채용공고/JD', data.jdText], ['JD 핵심 요구사항·역량', data.jdRequirements]] },
  ];
  return [...common, ...experienceExportSections(data), ...data.questions.flatMap((item, index) => [
    { title: `문항 ${index + 1}`, fields: [['자기소개서 문항', item.question], ['제한 글자수', item.charLimit ? `${item.charLimit}자` : '미설정'], ['글자수 계산 기준', item.charCountMode === 'excludeSpaces' ? '공백 제외' : '공백 포함'], ['퇴고용 120% 초안', item.draftOverflow ? '사용' : '사용 안 함']] },
    { title: `문항 ${index + 1} · 면접관의 시선으로 경험 탐색`, fields: [['경험 제목', item.experienceTitle], ['경험 요약', item.experienceSummary]] },
    { title: `문항 ${index + 1} · STAR`, fields: [['Situation', item.situation], ['Task', item.task], ['Action', item.action], ['Result', item.result]] },
    { title: `문항 ${index + 1} · 역량 연결`, fields: competencyExportFields(item) },
    { title: `문항 ${index + 1} · 초안`, fields: [['초안', item.draft]] },
    { title: `문항 ${index + 1} · AI 첨삭`, fields: [['AI 피드백', item.aiFeedback], ['수정본', item.revisedDraft]] },
    { title: `문항 ${index + 1} · 최종본`, fields: [['최종본', item.finalDraft], ['점검 메모', item.reflection]] },
    ...savedExperienceSections(data, item, index),
  ])];
}

export const workbookText = data => ['AI 기반 자기소개서 워크북', ...workbookSections(data).map(section => `[${section.title}]\n${section.fields.map(([label, value]) => `${label}: ${value || ''}`).join('\n')}`)].join('\n\n');

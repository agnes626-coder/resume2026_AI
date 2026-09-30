const newId = () => globalThis.crypto?.randomUUID?.() || `experience-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const experienceWritingFields = ['situation', 'task', 'action', 'result', 'competencies', 'draft', 'aiFeedback', 'revisedDraft', 'finalDraft', 'reflection'];
const writingFrom = source => Object.fromEntries(experienceWritingFields.map(key => [key, typeof source?.[key] === 'string' ? source[key] : '']));
const memoFrom = source => ({ experienceTitle: typeof source?.experienceTitle === 'string' ? source.experienceTitle : '', experienceSummary: typeof source?.experienceSummary === 'string' ? source.experienceSummary : '' });
const hasContent = source => Object.values({ ...memoFrom(source), ...writingFrom(source) }).some(value => value.trim());
const cacheFrom = source => source && typeof source === 'object' && !Array.isArray(source) ? Object.fromEntries(Object.entries(source).map(([id, writing]) => [id, writingFrom(writing)])) : {};
const selectionKey = id => id || 'unassigned';
const projectActive = data => {
  const active = data.questions.find(item => item.id === data.activeQuestionId) || data.questions[0];
  return { ...data, ...memoFrom(active), ...writingFrom(active), selectedExperienceId: active.selectedExperienceId || '' };
};

export function normalizeExperiences(data) {
  const seen = new Set();
  const experiences = Array.isArray(data.experiences) ? data.experiences.filter(item => item && typeof item === 'object').map(item => {
    const id = typeof item.id === 'string' && item.id && !seen.has(item.id) ? item.id : newId();
    seen.add(id);
    return { ...item, id, ...memoFrom(item), archived: item.archived === true };
  }) : [];
  const migrate = data.experienceModelVersion !== 1;
  const questions = data.questions.map(item => {
    let experience = experiences.find(entry => entry.id === item.selectedExperienceId && !entry.archived);
    if (!experience && migrate && hasContent(item)) {
      experience = { id: newId(), ...memoFrom(item), archived: false };
      experiences.push(experience);
    }
    return { ...item, experienceDrafts: cacheFrom(item.experienceDrafts), selectedExperienceId: experience?.id || '', ...memoFrom(experience) };
  });
  return projectActive({ ...data, experiences, questions, experienceModelVersion: 1 });
}

function changeSelection(question, experience) {
  const selectedExperienceId = experience?.id || '';
  if (question.selectedExperienceId === selectedExperienceId) return question;
  const experienceDrafts = { ...cacheFrom(question.experienceDrafts), [selectionKey(question.selectedExperienceId)]: writingFrom(question) };
  return { ...question, experienceDrafts, selectedExperienceId, ...memoFrom(experience), ...writingFrom(experienceDrafts[selectionKey(selectedExperienceId)]) };
}

export function selectExperience(data, id) {
  const experience = data.experiences.find(item => item.id === id && !item.archived);
  if (id && !experience) return data;
  return projectActive({ ...data, questions: data.questions.map(item => item.id === data.activeQuestionId ? changeSelection(item, experience) : item) });
}

export function addExperience(data) {
  return { ...data, experiences: [...data.experiences, { id: newId(), experienceTitle: '', experienceSummary: '', archived: false }] };
}

export function updateExperience(data, id, key, value) {
  if (!['experienceTitle', 'experienceSummary'].includes(key) || typeof value !== 'string') return data;
  const experiences = data.experiences.map(item => item.id === id ? { ...item, [key]: value } : item);
  const experience = experiences.find(item => item.id === id);
  if (!experience) return data;
  return projectActive({ ...data, experiences, questions: data.questions.map(item => item.selectedExperienceId === id ? { ...item, ...memoFrom(experience) } : item) });
}

// Preserve old callers that edit the original experienceTitle / experienceSummary fields.
export function updateCompatibilityExperience(data, key, value) {
  if (data.experiences.some(item => item.id === data.selectedExperienceId && !item.archived)) return updateExperience(data, data.selectedExperienceId, key, value);
  const experience = { id: newId(), ...memoFrom(data), [key]: value, archived: false };
  return projectActive({ ...data, experiences: [...data.experiences, experience], questions: data.questions.map(item => item.id === data.activeQuestionId ? { ...item, ...memoFrom(experience), selectedExperienceId: experience.id } : item) });
}

export function archiveExperience(data, id) {
  if (!data.experiences.some(item => item.id === id && !item.archived)) return data;
  return projectActive({ ...data, experiences: data.experiences.map(item => item.id === id ? { ...item, archived: true } : item), questions: data.questions.map(item => item.selectedExperienceId === id ? changeSelection(item, undefined) : item) });
}

export function restoreExperience(data, id) {
  return { ...data, experiences: data.experiences.map(item => item.id === id ? { ...item, archived: false } : item) };
}

export function experienceExportSections(data) {
  return data.experiences.map((item, index) => ({ title: `경험 목록 ${index + 1}${item.archived ? ' · 삭제 후 보관' : ''}`, fields: [['경험 제목', item.experienceTitle], ['경험 메모', item.experienceSummary]] }));
}

export function savedExperienceSections(data, question, questionIndex) {
  return Object.entries(cacheFrom(question.experienceDrafts)).filter(([id, writing]) => id !== selectionKey(question.selectedExperienceId) && Object.values(writing).some(value => value.trim())).map(([id, writing]) => {
    const experience = data.experiences.find(item => item.id === id);
    return { title: `문항 ${questionIndex + 1} · 보관 작성본 (${experience?.experienceTitle || '경험 미선택'})`, fields: [['Situation', writing.situation], ['Task', writing.task], ['Action', writing.action], ['Result', writing.result], ['역량', writing.competencies], ['초안', writing.draft], ['AI 피드백', writing.aiFeedback], ['수정본', writing.revisedDraft], ['최종본', writing.finalDraft], ['점검 메모', writing.reflection]] };
  });
}

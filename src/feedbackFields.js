export const feedbackComplete = data => ['aiFeedback', 'revisedDraft'].every(key => typeof data[key] === 'string' && data[key].trim());
export const feedbackExportFields = data => [['AI 피드백', data.aiFeedback], ['학생의 피드백 검토·수정 계획', data.revisionNotes], ['수정본', data.revisedDraft]];

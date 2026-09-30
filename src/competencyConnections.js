export const competencyConnectionComplete = data => ['jdRequirements', 'competencies', 'competencyEvidence', 'jobConnection'].every(key => typeof data[key] === 'string' && data[key].trim());
export const competencyExportFields = data => [['강조할 핵심 역량', data.competencies], ['역량을 입증하는 나의 행동·결과', data.competencyEvidence], ['지원 직무와의 연결·기여', data.jobConnection]];

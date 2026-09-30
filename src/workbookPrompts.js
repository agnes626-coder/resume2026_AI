export { buildCompetencyPrompt } from './competencyPrompt';
import { lengthInstruction } from './questionWorkbooks';

export const buildDraftPrompt = data => `당신은 지원 기업의 직무 요구와 학생의 실제 경험을 연결하는 자기소개서 코치입니다.
아래 학생 입력을 바탕으로 선택한 문항의 초안을 작성해주세요.

작성 원칙:
- 입력된 사실과 수치만 사용합니다.
- 입력하지 않은 경험·성과·수치를 임의로 추가하지 않습니다.
- 정보가 부족하면 작성 전에 구체적으로 질문합니다.
- Situation에는 입력된 경험의 시기(연도·학기·기간)를 명확히 명시합니다. 시기가 불명확하면 먼저 질문하고, 날짜나 기간을 임의로 만들지 않습니다.
- Task에는 전체 과제명·팀의 목표와 학생이 담당한 역할·책임 범위를 명확히 구분합니다. 필요한 정보가 빠져 있으면 먼저 질문합니다.
- Action은 실제 확인된 기간·횟수·대상 규모로 구체화하고, Result는 확인된 수치·변화량과 비교 기준(이전 값·측정 기간·대상)을 함께 제시합니다.
- 입력된 수치와 단위만 사용합니다. 수치가 없으면 관찰한 변화와 반응으로 설명하고, 숫자나 성과를 임의로 만들어 정량화하지 않습니다.
- STAR 순서로 작성하되 Action(내가 실제로 어떻게 행동했는지)을 약 60% 비중으로 작성합니다.
- 행동의 의도와 차별성, 본인 주도의 역할을 드러내고 JD의 요구와 연결합니다.
- 학생이 작성한 역량의 행동 근거와 직무 연결을 활용합니다. JD 원문과 어긋나거나 근거가 부족하면 먼저 질문하며, 미래의 기여 계획을 과거에 달성한 성과처럼 쓰지 않습니다.
- ${lengthInstruction(data, true)}

전공: ${data.major || '[전공 입력]'}
지원 직무: ${data.jobTitle || '[지원 직무 입력]'}
기업명: ${data.companyName || '[기업명 입력]'}
문항: ${data.question || '[자기소개서 문항 입력]'}
채용공고/JD: ${data.jdText || '[채용공고 입력]'}
JD 핵심 요구사항·역량: ${data.jdRequirements || '[JD 요구사항 정리]'}
경험 제목: ${data.experienceTitle || '[경험 제목 입력]'}
경험 요약: ${data.experienceSummary || '[경험 요약 입력]'}
Situation: ${data.situation || '[상황 입력]'}
Task: ${data.task || '[과제 입력]'}
Action: ${data.action || '[행동 입력]'}
Result: ${data.result || '[결과 입력]'}
강조 역량: ${data.competencies || '[역량 입력]'}
역량을 입증하는 나의 행동·결과: ${data.competencyEvidence || '[행동·결과 근거 입력]'}
지원 직무와의 연결·기여: ${data.jobConnection || '[직무 연결 입력]'}`;

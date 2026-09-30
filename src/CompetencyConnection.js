import React from 'react';
import { competencyConnectionComplete } from './competencyConnections';

export function CompetencyConnection({ data, onChange, onBasic, Field, PromptBox, prompt, secondaryButton }) {
  return <section className="competency-connection" aria-label="경험과 직무 역량 연결">
    <p>역량 이름만 나열하기보다 실제 행동으로 설명해야 합니다. 채용공고에서 요구하는 것 → 내 경험에서 찾은 역량 → 행동·결과 근거 → 지원 직무에서의 기여 순서로 연결해보세요. AI의 제안을 참고해도 최종 내용은 학생이 확인하고 직접 작성합니다.</p>
    <details className="competency-reference">
      <summary>1단계 지원정보와 3단계 STAR 확인하기</summary>
      <dl>{[['지원 기업·직무', [data.companyName, data.jobTitle].filter(Boolean).join(' · ')], ['채용공고 / JD', data.jdText], ['현재 자기소개서 문항', data.question], ['선택한 경험·사례', data.experienceTitle], ['Situation', data.situation], ['Task', data.task], ['Action — 나의 행동', data.action], ['Result — 결과', data.result]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '아직 입력하지 않았습니다.'}</dd></div>)}</dl>
      <button type="button" onClick={onBasic} style={secondaryButton}>1단계 지원정보·JD 수정하기</button>
    </details>
    <details className="competency-reference">
      <summary>역량과 직무를 연결하는 예시 보기</summary>
      <p>학습용 가상 사례입니다. 실제 채용공고와 자신의 행동·확인한 수치로 바꿔 작성하세요.</p>
      <dl>
        <div><dt>JD 요구사항</dt><dd>고객 의견을 분석하고 서비스 개선안을 제안하는 능력</dd></div>
        <div><dt>핵심 역량</dt><dd>데이터 기반 문제해결능력</dd></div>
        <div><dt>나의 행동·결과 근거</dt><dd>학생 80명의 설문 응답을 3개 유형으로 분류하고, 팀 회의에서 근거를 공유해 개선 우선순위를 제안했습니다.</dd></div>
        <div><dt>직무와의 연결·기여</dt><dd>의견을 유형별로 분석하고 우선순위를 정한 방법을 활용해, 서비스 기획 업무에서 고객 요구를 근거로 개선안을 제안하겠습니다.</dd></div>
      </dl>
    </details>
    <section className="competency-connection-card"><h3>1. 채용공고에서 요구하는 역량 찾기</h3>
      <Field label="JD 핵심 요구사항·역량" value={data.jdRequirements} onChange={value => onChange('jdRequirements', value)} placeholder="채용공고의 담당 업무·자격요건에서 핵심 요구사항을 적으세요. 예: 고객 의견 분석, 개선안 제안, 유관 부서 협업" textarea rows={4} help="지원 기업·직무·JD와 함께 모든 자기소개서 문항에 공통으로 적용됩니다. JD가 없으면 먼저 1단계에 입력하세요. 공고에 없는 요구사항을 임의로 만들지 마세요." />
    </section>
    <section className="competency-connection-card"><h3>2. 나의 행동을 역량 언어로 설명하기</h3>
      <Field label="경험에서 찾은 핵심 역량" value={data.competencies} onChange={value => onChange('competencies', value)} placeholder="예: 데이터 기반 문제해결, 의견 조율, 책임감. 실제 행동으로 입증할 수 있는 역량만 적으세요." textarea rows={4} help="기존에 작성한 핵심 역량은 이 입력란에 유지됩니다. 여러 역량을 적는다면 아래 근거와 직무 연결도 역량별로 구분하세요." />
      <Field label="역량을 입증하는 나의 행동·결과" value={data.competencyEvidence} onChange={value => onChange('competencyEvidence', value)} placeholder="각 역량의 근거가 되는 3단계 Action·Result를 적으세요. 어떤 판단을 했고, 내가 직접 무엇을 했으며, 확인한 변화는 무엇인가요?" textarea rows={6} help="팀 전체의 성과와 나의 역할을 구분하세요. 수치는 확인한 자료와 단위·비교 기준이 있을 때만 사용합니다." />
    </section>
    <section className="competency-connection-card"><h3>3. 지원 직무에서의 기여로 연결하기</h3>
      <Field label="지원 직무와의 연결·기여" value={data.jobConnection} onChange={value => onChange('jobConnection', value)} placeholder="JD의 어떤 요구사항과 연결되나요? 경험에서 익힌 방법을 해당 직무의 어떤 업무에 활용할 수 있나요?" textarea rows={5} help="과거의 실제 경험과 앞으로의 기여 계획을 구분하세요. ‘잘할 수 있다’보다 활용할 방법과 업무를 구체적으로 적으세요." />
    </section>
    <p role="status">{competencyConnectionComplete(data) ? 'JD 요구사항, 핵심 역량, 행동 근거, 직무 연결을 모두 작성했습니다. 사실과 연결 논리를 확인한 뒤 5단계로 진행하세요.' : 'JD 요구사항 → 핵심 역량 → 나의 행동·결과 → 직무 연결을 채우세요. 역량과 근거·직무 연결은 자기소개서 문항과 선택한 경험마다 따로 저장됩니다.'}</p>
    <PromptBox title="역량 연결 도움 프롬프트" prompt={prompt} />
  </section>;
}

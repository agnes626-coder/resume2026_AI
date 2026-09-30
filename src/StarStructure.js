import React from 'react';
import { starMetrics } from './starMetrics';
import { starExample } from './starExample';

export function StarStructure({ data, onChange, Field }) {
  const { counts, total, actionPercent } = starMetrics(data);
  return <section className="star-structure" aria-label="STAR 구조화 입력">
    <details className="star-worked-example">
      <summary>팀 프로젝트 STAR 예시 보기</summary>
      <p>학습용 가상 사례입니다. 기간·팀원 수·역할·행동·수치를 자신의 실제 경험과 확인한 자료로 바꿔 작성하세요.</p>
      <dl>{[["S · Situation — 시기·기간·팀원 수", starExample.situation], ["T · Task — 전체 과제명·목표·내 역할", `전체 과제명: 교내 편의시설 이용 경험 개선. ${starExample.task}`], ["A · Action — 본인 주도 행동과 수치", starExample.action], ["R · Result — 확인한 변화와 비교 기준", starExample.result]].map(([title, text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}</dl>
    </details>
    <p className="star-example-note">입력란의 예시도 가상 사례입니다. 예시를 그대로 제출하지 말고 자신의 실제 경험으로 작성하세요.</p>
    <div className="star-context-grid">
      <section className="star-context-card" aria-label="상황 정리">
        <h3>S · Situation — 시기부터 명확하게</h3>
        <Field label="Situation (상황)" value={data.situation} onChange={value => onChange('situation', value)} placeholder={`예: ${starExample.situation}`} textarea rows={4} help="경험의 시기(연도·학기·기간)를 먼저 명확히 적으세요. 예: 2025년 2학기, 2025년 7~8월. 이어서 장소·함께한 사람·당시 문제와 제약을 간결하게 정리하세요." />
      </section>
      <section className="star-context-card" aria-label="과제 정리">
        <h3>T · Task — 과제명과 내 역할</h3>
        <Field label="Task (과제)" value={data.task} onChange={value => onChange('task', value)} placeholder={`예: 전체 과제명은 ‘교내 편의시설 이용 경험 개선’입니다. ${starExample.task}`} textarea rows={4} help="전체 과제명과 팀의 목표를 먼저 적고, 그 안에서 내가 담당한 역할·책임 범위와 해결해야 했던 과제를 명확히 구분하세요." />
      </section>
    </div>
    <section className="star-action-card" aria-label="Action 구체적 행동 핵심">
      <div className="star-action-heading"><h3>A · Action — 구체적 행동(핵심)</h3><span>작성 비중 약 60%</span></div>
      <p className="star-action-lead">왜 그렇게 판단했는지, 실제로 어떻게 행동했는지, 내가 맡아 주도한 역할이 드러나도록 가장 자세하게 작성하세요. 행동의 횟수·기간·대상 규모도 확인한 수치로 구체화하세요.</p>
      <details className="star-action-guide">
        <summary>Action 작성 질문·예시 보기</summary>
        <ol>
          <li><strong>의도·판단:</strong> 무엇을 확인했고, 왜 그 방법을 선택했나요? 다른 방법도 검토했나요?</li>
          <li><strong>구체적인 방법:</strong> 어떤 순서와 도구로 행동했나요? 상대방에게 무엇을 제안하거나 설명했나요?</li>
          <li><strong>본인 주도 역할:</strong> 팀이 함께 한 일 중 내가 직접 결정하고 실행한 부분은 무엇인가요?</li>
          <li><strong>행동의 수치화:</strong> 얼마나 오래, 몇 번, 몇 명 또는 몇 건을 대상으로 행동했나요? 자료를 정리한 건수, 회의 횟수, 진행 기간 등 실제 확인한 수치와 단위를 적어보세요.</li>
        </ol>
        <p>표현 예시(가상 수치) — 자신의 실제 행동과 확인한 수치로 바꿔 작성하세요.</p>
        <p>“설문을 열심히 진행했다” → “4주 동안 학생 80명의 응답을 모아 불편 사항을 3개 유형으로 분류하고, 팀 회의 6회에서 개선 우선순위를 제안했다.”</p>
        <p>실제로 하지 않은 행동과 확인하지 않은 성과·수치를 추가하지 마세요.</p>
      </details>
      <Field label="Action (행동)" value={data.action} onChange={value => onChange('action', value)} placeholder={`예: ${starExample.action}`} textarea rows={11} />
      <div className="star-action-balance" aria-label="Action 작성 비중">
        <p role="status">{actionPercent === null ? 'STAR를 작성하면 Action의 비중이 표시됩니다.' : `현재 Action 비중: ${actionPercent}% · 참고 목표: 약 60%`}</p>
        {actionPercent !== null && <div className="star-action-meter" role="meter" aria-label="STAR 메모 중 Action 비중" aria-valuemin={0} aria-valuemax={100} aria-valuenow={actionPercent} aria-valuetext={`Action ${actionPercent}%, 참고 목표 약 60%`}><div style={{ width: `${actionPercent}%` }} /><span className="star-action-target" aria-hidden="true" /></div>}
        <p>STAR 메모의 공백 제외 글자수 기준입니다. 이 비율을 참고하며, 최종 자기소개서에서도 구체적인 행동이 약 60%를 차지하도록 퇴고하세요.</p>
        {total > 0 && <p>S {counts.situation}자 · T {counts.task}자 · A {counts.action}자 · R {counts.result}자 / 총 {total}자</p>}
      </div>
    </section>
    <section className="star-context-card" aria-label="결과 정리">
      <h3>R · Result — 변화와 근거</h3>
      <Field label="Result (결과)" value={data.result} onChange={value => onChange('result', value)} placeholder={`예: ${starExample.result}`} textarea rows={4} help="무엇이 얼마나 달라졌는지, 확인된 수치·변화량과 비교 기준을 함께 적으세요. 수치가 없다면 주변의 반응과 실제 관찰한 변화를 설명하세요. 확인하지 않은 수치는 만들지 마세요." />
    </section>
  </section>;
}

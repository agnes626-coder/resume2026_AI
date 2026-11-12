import React, { useState, useId } from 'react';

// 특정 기업 문항을 옮기지 않고, 채용 자기소개서에서 자주 나오는 유형을 일반화한 학습용 예시입니다.
export const questionExamples = [
  {
    id: 'motivation', title: '지원동기', charLimit: '700',
    question: '우리 회사와 지원 직무에 지원한 이유를 구체적으로 기술하고, 입사를 위해 어떤 준비를 해왔는지 작성해 주십시오.',
    tips: ['회사 일반 칭찬보다 직무·사업과 나의 경험이 만나는 지점을 쓰세요.', '"왜 이 회사인가"와 "왜 이 직무인가"를 나눠 답하면 구조가 분명해집니다.', '채용공고·JD의 요구 역량과 준비 과정을 연결하세요.'],
  },
  {
    id: 'growth', title: '성장과정', charLimit: '500',
    question: '본인의 가치관이나 성격 형성에 큰 영향을 준 경험을 중심으로 성장과정을 기술해 주십시오.',
    tips: ['출생부터 시간순으로 나열하지 말고 영향을 준 사건 1~2개에 집중하세요.', '그 경험이 지금의 일하는 방식·태도로 어떻게 이어졌는지 마무리하세요.'],
  },
  {
    id: 'personality', title: '성격의 장단점', charLimit: '500',
    question: '본인 성격의 장점과 단점을 각각 사례를 들어 설명하고, 단점을 보완하기 위해 노력한 점을 작성해 주십시오.',
    tips: ['장점은 지원 직무에 도움이 되는 특성으로 고르고 사례로 증명하세요.', '단점은 직무에 치명적이지 않은 것을 솔직하게 쓰고, 보완 행동과 변화를 함께 쓰세요.'],
  },
  {
    id: 'competency', title: '직무 역량·경험', charLimit: '1000',
    question: '지원 직무를 수행하는 데 필요한 역량은 무엇이라고 생각하며, 그 역량을 갖추기 위해 노력한 경험을 구체적으로 기술해 주십시오.',
    tips: ['JD에서 핵심 역량 1~2개를 골라 두괄식으로 제시하세요.', 'STAR 구조로 쓰되 Action(내가 한 행동)의 비중을 가장 크게 두세요.', '수업·프로젝트·아르바이트 등 결과를 수치나 변화로 보여 주세요.'],
  },
  {
    id: 'collaboration', title: '갈등 해결·협업 경험', charLimit: '800',
    question: '공동의 목표를 위해 다른 사람과 협력했던 경험 중, 의견 차이나 갈등을 해결한 사례와 그 과정에서 본인의 역할을 작성해 주십시오.',
    tips: ['갈등의 원인을 객관적으로 설명하고 상대를 비난하지 마세요.', '내가 직접 한 조율 행동(경청, 대안 제시, 역할 재분배 등)을 구체적으로 쓰세요.', '결과와 함께 협업에서 배운 점을 정리하세요.'],
  },
  {
    id: 'failure', title: '실패·극복 경험', charLimit: '800',
    question: '목표를 달성하지 못했거나 어려움에 부딪혔던 경험을 소개하고, 이를 극복하기 위해 어떻게 노력했으며 무엇을 배웠는지 기술해 주십시오.',
    tips: ['실패 자체보다 원인 분석과 이후의 행동 변화가 평가 포인트입니다.', '배운 점이 이후 다른 경험에서 실제로 적용된 사례가 있으면 덧붙이세요.'],
  },
  {
    id: 'aspiration', title: '입사 후 포부', charLimit: '600',
    question: '입사 후 지원 직무에서 이루고 싶은 목표와 이를 위한 단기·장기 계획을 구체적으로 작성해 주십시오.',
    tips: ['"최고가 되겠다" 같은 다짐보다 직무에서 할 수 있는 구체적 기여를 쓰세요.', '입사 초기(1~3년)와 이후(5~10년)로 나눠 단계별 계획을 제시하세요.', '회사의 사업 방향이나 JD 내용과 연결하면 설득력이 높아집니다.'],
  },
];


export function QuestionExamples({ activeIndex, onUse }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return <section className={`question-examples${open ? ' is-open' : ''}`} aria-label="자기소개서 문항 예시">
    <button type="button" className="question-examples-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
      <span>자주 나오는 문항 예시 {open ? '접기' : '보기'} <small>({questionExamples.length}개 유형)</small></span>
      <span aria-hidden="true" className="question-example-icon">{open ? '−' : '+'}</span>
    </button>
    <div id={panelId} className="question-examples-panel" hidden={!open}>
      {open && <>
        <p>대표 유형을 일반화한 예시입니다. 실제 지원처의 문항과 제한 글자수를 확인해 그대로 입력하세요.</p>
        <ol className="question-examples-list">
          {questionExamples.map(example => <li key={example.id} className="question-example">
            <h4>{example.title}</h4>
            <blockquote>{example.question} <span className="question-example-limit">({example.charLimit}자 이내 예시)</span></blockquote>
            <strong>작성 팁</strong>
            <ul>{example.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>
            {onUse && <button type="button" className="question-example-use" onClick={() => onUse(example)}>이 예시를 문항 {activeIndex + 1}(작성 중)에 넣기</button>}
          </li>)}
        </ol>
      </>}
    </div>
  </section>;
}
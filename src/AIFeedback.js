import React from 'react';
import { characterCount } from './questionWorkbooks';
import { feedbackComplete } from './feedbackFields';

export function AIFeedback({ data, onChange, onDraft, Field, PromptBox, prompt, secondaryButton }) {
  const hasDraft = Boolean(data.draft.trim());
  const countMode = data.charCountMode === 'excludeSpaces' ? '공백 제외' : '공백 포함';
  const count = characterCount(data.revisedDraft, data.charCountMode);
  const overLimit = Boolean(data.charLimit && count > Number(data.charLimit));
  return <section className="ai-feedback-workbook" aria-label="AI 피드백 검토와 학생 직접 수정">
    <ol className="feedback-flow"><li>AI에게 평가·질문 받기</li><li>사실 확인하고 수정 방향 판단하기</li><li>내 언어로 직접 수정하기</li></ol>
    <details className="feedback-reference"><summary>5단계 초안과 STAR 근거 확인하기</summary>
      <dl>{[['현재 자기소개서 문항', data.question], ['지원 기업·직무', [data.companyName, data.jobTitle].filter(Boolean).join(' · ')], ['JD 요구사항', data.jdRequirements || data.jdText], ['선택한 경험·사례', data.experienceTitle], ['Situation', data.situation], ['Task', data.task], ['Action — 나의 행동', data.action], ['Result — 결과', data.result], ['5단계 초안 원문', data.draft]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '아직 입력하지 않았습니다.'}</dd></div>)}</dl>
      <button type="button" onClick={onDraft} style={secondaryButton}>5단계 초안 확인·수정하기</button>
    </details>
    <section className="feedback-card"><h3>1. 초안을 평가받기</h3>
      <p>아래 프롬프트를 복사해 ChatGPT 또는 Claude에 붙여 넣으세요. AI의 응답은 평가와 질문이며, 학생이 사실을 확인하고 반영할 내용을 결정합니다.</p>
      <div className="feedback-criteria" aria-label="각 5점 만점 평가 기준">
        <div><strong>논리성 / 5점</strong><p>상황·과제·행동·결과가 연결되고 문항에 답하는가?</p></div>
        <div><strong>구체성 / 5점</strong><p>시기·과제명·역할·방법과 결과의 근거가 드러나는가?</p></div>
        <div><strong>직무적합성 / 5점</strong><p>JD 요구사항과 실제 행동·직무 기여가 연결되는가?</p></div>
      </div>
      <p>점수와 근거 외에 뻔한 표현 최대 2개, 구체화 질문, Action Level 판정, Action 약 60% 비중 점검과 수정 방향을 요청합니다. 점수와 Level은 참고 의견이며, AI가 사실을 확인할 수 없는 부분은 학생이 확인해야 합니다.</p>
      {hasDraft ? <details className="feedback-reference feedback-prompt"><summary>평가·질문 프롬프트 열고 복사하기</summary><PromptBox title="AI 피드백 프롬프트" prompt={prompt} /></details> : <div className="feedback-empty"><p role="status">아직 5단계 초안이 없습니다. 먼저 평가받을 초안을 작성하세요.</p><button type="button" onClick={onDraft} style={secondaryButton}>5단계에서 초안 작성하기</button></div>}
    </section>
    <section className="feedback-card"><h3>2. 피드백을 검토하고 사실 확인하기</h3>
      <Field label="AI 피드백" value={data.aiFeedback} onChange={value => onChange('aiFeedback', value)} placeholder="논리성·구체성·직무적합성 각 5점과 근거, 뻔한 표현, 구체화 질문, Action Level과 수정 방향이 담긴 응답을 붙여 넣으세요." textarea rows={10} help="AI의 지적이 나의 실제 경험과 일치하는지 확인하세요. 확인되지 않은 성과나 수치를 추가하라는 제안은 반영하지 마세요." />
      <Field label="내가 반영할 피드백과 수정 계획" value={data.revisionNotes} onChange={value => onChange('revisionNotes', value)} placeholder="선택 사항: 어떤 피드백을 왜 반영하나요? 반영하지 않을 제안과 이유는 무엇인가요? 구체화 질문에는 실제 사실로 답하고 수정할 순서를 적어보세요." textarea rows={5} help="AI 질문의 답이 3단계 STAR에 빠져 있었다면, 확인한 사실을 STAR에도 보완하세요. 초안과 수정본은 자동으로 바뀌지 않습니다." />
    </section>
    <section className="feedback-card feedback-student-revision"><h3>3. 학생이 직접 수정하기</h3>
      <p>5단계 초안과 피드백을 참고해 아래에 직접 작성하세요. 실제로 하지 않은 행동을 만들지 않고, 자신의 말투로 판단 이유와 구체적인 방법을 보완합니다.</p>
      <Field label="피드백 반영 수정본" value={data.revisedDraft} onChange={value => onChange('revisedDraft', value)} placeholder="내가 확인하고 선택한 피드백을 반영해 직접 수정한 버전을 적으세요. 원래 초안은 5단계에 그대로 보관됩니다." textarea rows={14} />
      <p role="status" className={overLimit ? 'feedback-length-over' : ''}>수정본 글자수 ({countMode}): {count}{data.charLimit ? ` / 제한 ${data.charLimit}자 · ${overLimit ? `${count - Number(data.charLimit)}자 초과 — 최종본에서 직접 줄여주세요.` : `${Number(data.charLimit) - count}자 남음`}` : ' · 제한 미설정 — 1단계에서 설정하세요.'}</p>
      <p>공백 포함 {characterCount(data.revisedDraft)}자 / 공백 제외 {characterCount(data.revisedDraft, 'excludeSpaces')}자. 120% 옵션은 초안에만 적용하며 최종본은 실제 제출 제한에 맞춥니다.</p>
    </section>
    <p role="status">{feedbackComplete(data) ? 'AI 피드백과 학생 수정본을 기록했습니다. 사실관계·어조를 확인한 뒤 7단계 최종본으로 진행하세요.' : 'AI 피드백을 기록하고 학생이 직접 수정본을 작성하면 이 단계가 완료됩니다.'}</p>
  </section>;
}

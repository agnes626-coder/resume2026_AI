import { addExperience, updateExperience } from './experienceWorkbooks';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Packer, Document, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import App from './App';
import { normalizeWorkbook, addQuestion, updateWorkbookField } from './questionWorkbooks';
jest.mock('./firebase', () => ({}));
jest.mock('./courseService', () => ({}));
jest.mock('docx', () => ({
  Document: jest.fn(), Paragraph: jest.fn(function(value) { this.value = value; }),
  TextRun: jest.fn(function(value) { this.value = value; }),
  Packer: { toBlob: jest.fn() },
}));
jest.mock('file-saver', () => ({ saveAs: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;
test('download buttons include both questions in text, DOCX and escaped PDF print content', async () => {
  let data = normalizeWorkbook({ major: '전공', nickname: '학생', courseId: 'general', question: '첫 문항 <script>', charLimit: '500', charCountMode: 'excludeSpaces', draftOverflow: true, draft: '첫 초안\n다음 줄' });
  data = addQuestion(data); data = updateWorkbookField(data, 'question', '둘째 문항'); data = updateWorkbookField(data, 'finalDraft', '둘째 최종본');
  data = addExperience(data);
  data = updateExperience(data, data.experiences[data.experiences.length - 1].id, 'experienceSummary', '사용하지 않은 경험 <script>');
  localStorage.setItem('ai_self_intro_full_app_v1', JSON.stringify(data));
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  Paragraph.mockImplementation(function(value) { this.value = value; });
  TextRun.mockImplementation(function(value) { this.value = value; });
  URL.createObjectURL = jest.fn(() => 'blob:test'); URL.revokeObjectURL = jest.fn();
  const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const printWindow = { document: { open: jest.fn(), write: jest.fn(), close: jest.fn() }, focus: jest.fn(), print: jest.fn() };
  const popup = jest.spyOn(window, 'open').mockReturnValue(printWindow);
  Packer.toBlob.mockResolvedValue('docx-blob');
  try {
    await act(async () => root.render(<App />));
    const click = async text => act(async () => Array.from(container.querySelectorAll('button')).find(button => button.textContent.includes(text)).click());
    await click('TXT 다운로드');
    const text = await new Promise(resolve => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result);
      reader.readAsText(URL.createObjectURL.mock.calls[0][0]);
    });
    expect(text).toContain('사용하지 않은 경험 <script>');
    expect(text).toContain('제한 글자수: 500자'); expect(text).toContain('글자수 계산 기준: 공백 제외');
    expect(text).toContain('첫 초안\n다음 줄'); expect(text).toContain('둘째 최종본');
    await click('DOCX 다운로드');
    const docx = JSON.stringify(Document.mock.calls[0][0]);
    expect(docx).toContain('사용하지 않은 경험 <script>');
    expect(docx).toContain('500자'); expect(docx).toContain('공백 제외');
    expect(docx).toContain('첫 문항 <script>'); expect(docx).toContain('둘째 문항'); expect(docx).toContain('둘째 최종본');
    expect(saveAs).toHaveBeenCalledWith('docx-blob', '자기소개서_워크북.docx');
    await click('PDF 다운로드');
    const html = printWindow.document.write.mock.calls[0][0];
    expect(html).toContain('사용하지 않은 경험 &lt;script&gt;');
    expect(html).toContain('500자'); expect(html).toContain('공백 제외');
    expect(html).toContain('첫 문항 &lt;script&gt;'); expect(html).not.toContain('첫 문항 <script>');
    expect(html).toContain('첫 초안<br />다음 줄'); expect(html).toContain('둘째 최종본');
  } finally {
    act(() => root.unmount()); container.remove(); anchorClick.mockRestore(); popup.mockRestore(); localStorage.clear();
  }
});

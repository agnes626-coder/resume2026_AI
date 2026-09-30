# 무료 Firebase 연결 안내

GitHub 저장소 연결과 Firebase 프로젝트 연결은 별개입니다. Firebase 콘솔에서 프로젝트를 찾고 접근할 수 있어야 합니다. 이 버전은 Cloud Functions를 사용하지 않으며 Spark 무료 요금제를 유지합니다.

## 1. 무료 요금제 확인

Firebase 콘솔에서 사용할 프로젝트를 선택하고 Spark 요금제인지 확인하세요. 이 구성에는 Blaze 전환이나 결제 수단 등록이 필요하지 않습니다. 무료 한도가 소진되면 서비스가 제한될 수 있습니다.

원래 코드에 있던 프로젝트 ID는 `sonorous-stone-492010-j8`입니다. 해당 프로젝트가 본인 계정에서 보이는지 확인하세요. 다른 프로젝트를 사용한다면 그 프로젝트의 웹 앱 설정값을 입력합니다.

## 2. 이메일/비밀번호·Google·익명 로그인 활성화

Firebase 콘솔의 Authentication에서 로그인 방법을 설정합니다.

- Google: 교수자 로그인용입니다.
- 이메일/비밀번호: Google 계정이 없는 교수자용입니다. 이메일 링크 로그인이 아니라 이메일/비밀번호 옵션을 활성화합니다.
- 익명: 학생과 일반참가자의 기기별 식별용입니다. 학생에게 별도 로그인 화면을 표시하지 않습니다.

Authentication 설정의 승인된 도메인에 개발용 `localhost`를 추가합니다. 운영 주소가 정해지면 해당 도메인도 추가합니다.

## 3. Firestore 보안 규칙 적용

Firestore Database가 없다면 생성합니다. 기존 데이터베이스가 있다면 그대로 사용합니다.

Firestore Database의 규칙 탭에서 현재 규칙을 먼저 복사해 보관하세요. 프로젝트 폴더의 `firestore.rules` 내용을 검토한 뒤 붙여 넣고 게시합니다. 다른 앱이 같은 Firebase 프로젝트를 사용한다면 해당 앱의 규칙을 유지하도록 병합합니다. 이 코드에서 사용하는 컬렉션에 기존의 넓은 허용 규칙이 겹치면 접근 제한이 무효화될 수 있으므로 이 컬렉션은 새 규칙으로만 보호해야 합니다.

선택 사항으로 Firebase CLI에 로그인한 뒤 프로젝트 ID를 명시하여 규칙만 적용할 수 있습니다.

```powershell
npx firebase-tools login
npx firebase-tools deploy --project sonorous-stone-492010-j8 --only firestore:rules
```

프로젝트 ID가 다르면 명령의 프로젝트 ID도 변경합니다. 서버 함수 배포 명령은 사용하지 않습니다.

## 4. 프로젝트 연결값 입력

Firebase 프로젝트 설정의 내 앱에서 웹 앱을 선택합니다. 웹 앱이 없다면 웹 앱을 등록합니다. 제공되는 `firebaseConfig`의 값들을 사용합니다.

프로젝트 폴더의 `.env.local.example`을 `.env.local`로 복사하고 값을 입력하세요. 이미 `.env.local`이 있다면 덮어쓰지 말고 필요한 값을 수정합니다.

```text
REACT_APP_FIREBASE_API_KEY=apiKey 값
REACT_APP_FIREBASE_AUTH_DOMAIN=authDomain 값
REACT_APP_FIREBASE_PROJECT_ID=projectId 값
REACT_APP_FIREBASE_STORAGE_BUCKET=storageBucket 값
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=messagingSenderId 값
REACT_APP_FIREBASE_APP_ID=appId 값
```

`.env.local`은 Git에서 제외합니다. 웹 앱 설정값은 브라우저에도 포함되므로 Firebase 보안 규칙으로 실제 데이터 접근을 보호합니다.

값을 수정한 뒤 실행 중인 터미널에서 Ctrl+C로 종료하고 `npm start`를 다시 실행합니다. 환경변수 변경은 새로고침만으로 적용되지 않습니다.

Firebase 설정 전에는 다른 사람의 프로젝트로 요청을 보내지 않습니다. 일반참가용은 브라우저 저장으로 계속 사용할 수 있으며, 연결되지 않았다는 안내를 표시합니다.

## 5. 교수자 페이지 사용

`http://localhost:3000/admin`에 접속하고 `agnes626@hanyang.ac.kr` Google 계정으로 로그인합니다.

- 총괄 관리자는 교과목·인증번호를 설정하고 추가 교수자의 Google 이메일을 등록하거나 접근을 중지할 수 있습니다.
- 추가 교수자는 교과목과 참가 목록을 관리할 수 있습니다. 교수자 권한 변경은 총괄 관리자만 가능합니다.
- 추가 교수자와 총괄 관리자는 같은 관리자 페이지에서 모든 교과목·참가자를 함께 관리합니다. 교수자 계정 관리 영역은 총괄 관리자에게만 표시됩니다.
- Google 계정이 없는 교수자는 총괄 관리자가 등록한 이메일로 관리자 페이지의 `처음 이용: 계정 만들기`를 선택하고 비밀번호를 정합니다. 받은 인증 메일의 링크를 누른 뒤 `이메일로 로그인`을 사용합니다. 계정 만들기만으로 교수자 권한이 부여되지는 않습니다.
- 인증 메일이 도착하지 않으면 스팸함을 확인한 뒤 로그인 이메일과 비밀번호를 입력하고 `인증 메일 다시 보내기`를 선택합니다.
- 비밀번호를 잊으면 `비밀번호 재설정`에서 이메일을 입력합니다. 이미 Google 로그인으로 가입된 이메일도 계정을 새로 만들지 말고 비밀번호 재설정을 사용할 수 있습니다.
- 총괄 관리자는 접근 중지된 교수자의 `삭제` 버튼으로 등록을 해제할 수 있습니다. 확인 창에서 동의해야 삭제합니다. 교수자 등록만 삭제하며 Firebase Authentication 로그인 계정과 교과목·참가자 기록은 그대로 보관합니다. 재등록하면 같은 이메일로 다시 권한을 부여할 수 있습니다.
- 인증번호를 잊었다면 새 번호로 변경합니다. 기존 번호를 원문으로 조회하는 기능은 없습니다.
- 일반참가용은 인증번호 없이 입장합니다.
- 다른 기기에서 입장한 참가자를 교과목별로 필터하고 목록 새로고침으로 확인합니다.

## 저장 범위와 호환성

- 공개 교과목 정보와 비공개 인증번호 검증 값을 별도 컬렉션에 보관합니다. 학생은 검증 값이나 다른 참가자 목록을 읽을 수 없습니다.
- 교과목별 인증번호는 salt와 SHA-256 검증 값으로 저장합니다. 참가 기록의 `entryProof`도 검증 값이며 인증번호 원문은 보관하지 않습니다.
- Firestore 보안 규칙이 입력한 검증 값을 비교하여 참가 기록을 허용합니다. 화면의 확인 로직만으로 입장을 허용하지 않습니다.
- 교수자 이메일은 이메일 인증을 마친 Google 또는 이메일/비밀번호 로그인 정보와 Firestore 권한으로 검사합니다. 미인증·미등록·접근 중지 계정은 참가자 목록을 볼 수 없습니다.
- 교수자 삭제는 Firestore에서도 총괄 관리자가 접근 중지된 등록만 삭제할 수 있도록 검사합니다.
- `students` 프로필의 기존 필드와 저장 동작은 유지합니다.
- `experienceTitle`, `experienceSummary` 및 워크북 작성 내용은 기존 브라우저 자동 저장을 유지합니다. 교수자 통합 조회는 현재 참가 정보 범위입니다.
- 익명 인증은 기기·브라우저별 식별자입니다. 같은 기기에서 동일 교과목으로 재입장하면 기존 참가 기록을 갱신합니다. 다른 브라우저에서는 별도 참가 기록이 됩니다.
- Firebase 연결 실패 시 일반참가용은 브라우저 저장으로 계속 사용할 수 있습니다. 이 경우 교수자 목록에는 등록되지 않았다는 안내를 표시합니다.

## 검증

프로젝트에서 `npm test -- --watchAll=false --runInBand`와 `npm run build`를 실행합니다.

보안 규칙 테스트에는 Java 21 이상과 `tests/firestore`의 테스트 도구 설치가 필요합니다.

```powershell
npm --prefix tests/firestore ci
npm --prefix tests/firestore test
```

규칙 테스트는 `demo-resume-workbook`라는 로컬 에뮬레이터 프로젝트만 사용하며 실제 Firebase 데이터를 수정하지 않습니다.

## 공식 안내

- [Firebase 무료 요금제와 사용 한도](https://firebase.google.com/pricing)
- [Google 로그인](https://firebase.google.com/docs/auth/web/google-signin)
- [이메일·비밀번호 로그인](https://firebase.google.com/docs/auth/web/password-auth)
- [메일 인증과 비밀번호 재설정](https://firebase.google.com/docs/auth/web/manage-users)
- [익명 로그인](https://firebase.google.com/docs/auth/web/anonymous-auth)
- [Firestore 보안 규칙](https://firebase.google.com/docs/firestore/security/rules-conditions)

## Firebase Hosting 공유 주소

- 학생용: https://resume2026-ai-492010.web.app
- 교수자 관리: https://resume2026-ai-492010.web.app/admin
- Hosting 사이트 ID: `resume2026-ai-492010`
- Firebase 프로젝트: `sonorous-stone-492010-j8`

기존 기본 Hosting 사이트를 보존하기 위해 별도 사이트에 배포했습니다. 두 공유 도메인(`resume2026-ai-492010.web.app`, `resume2026-ai-492010.firebaseapp.com`)을 Authentication 승인 목록에 추가했습니다.

학생에게 학생용 주소와 해당 교과목의 인증번호를 안내하세요. 일반참가용은 번호 없이 입장할 수 있습니다. 교수자는 관리자 주소에서 등록된 Google 계정 또는 인증을 마친 이메일·비밀번호로 로그인합니다.

프로그램을 수정한 뒤 공유 사이트에 반영하려면 프로젝트 폴더에서 다음을 실행합니다. GitHub 변경만으로 자동 배포되지는 않습니다.

```powershell
npm run build
npx firebase-tools deploy --only hosting --project sonorous-stone-492010-j8
```

`firebase.json`은 학생 화면과 `/admin` 주소를 모두 React 앱으로 연결합니다. 환경변수 원본 파일, 소스맵, 관리용 소스 파일은 Hosting 배포 대상에 포함하지 않습니다. 무료 Spark 구성으로 운영하며 Firebase의 무료 사용 한도 안에서 사용할 수 있습니다.

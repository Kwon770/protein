# 단백하게 (Way to Go)

Astryx 기반의 웹·iOS·Android 단백질 기록 앱입니다. 오늘 화면의 즐겨찾기나 음식 검색에서 음식을 선택하고, 섭취한 양을 입력해 단백질을 기록합니다. 섭취 기록에서 날짜별 내역을 고치고 내 설정에서 하루 목표와 프로필을 관리합니다.

처음에는 하루 목표를 설정한 뒤 Google 또는 Apple로 로그인합니다. 섭취 기록, 목표와 설정은 현재 기기에 계정별로 저장합니다. **내 설정**에서 저녁 기록 알림을 관리하고 도움말, 개인정보 처리방침, 서비스 이용약관과 앱 정보를 확인할 수 있습니다. 저녁 기록 알림은 iOS·Android 앱에서 켜면 기기의 현지 시각 기준 매일 오후 8시쯤 표시됩니다. **앱 정보**의 **언어 확인**은 웹에서 브라우저 언어를, 네이티브 앱에서 기기 언어를 표시합니다.

## 웹에서 실행

Node.js 22.12 이상과 npm이 필요합니다.

```sh
npm ci
npm run dev
```

터미널에 표시된 `Local` 주소를 브라우저에서 여세요. 빌드한 웹 앱을 확인하려면 `npm run build` 후 `npm run preview`를 실행하세요.

```sh
npm run typecheck
npm run lint
npm run build
```

## iOS와 Android에서 실행

iOS는 Xcode, Android는 Android Studio와 Android SDK가 필요합니다.

```sh
npm run cap:sync
npm run cap:open:ios
npm run cap:open:android
```

`cap:sync`가 Vite의 `dist/` 번들을 두 네이티브 프로젝트에 복사합니다. Xcode 또는 Android Studio에서 실행할 기기를 선택하세요. 첫 화면과 언어 확인 기능은 개발 서버 없이 실행됩니다.

Android 패키지 ID와 iOS 번들 ID는 모두 `com.sckwon770.waytogo`입니다. 이전 ID로 출시하거나 설치한 앱과는 별개로 등록되고 설치됩니다. 기존 앱의 기기 내 섭취 기록과 설정은 새 앱으로 자동 이전되지 않습니다.

### Google Play 제출용 Android 빌드

JDK 21과 Android SDK 36을 설치하고 `JAVA_HOME`, `ANDROID_HOME`을 설정합니다. 같은 패키지 ID로 Play에 등록한 앱을 업데이트할 때는 해당 앱의 업로드 키를 사용하고, `android/app/build.gradle`의 `versionCode`를 기존 출시 버전보다 높입니다.

업로드 키 저장소와 아래 속성을 `android/signing/upload.properties`와 같은 디렉터리에 둡니다. 이 디렉터리는 Git에서 제외합니다. 키 파일과 비밀번호는 안전한 별도 위치에도 백업하세요.

```properties
storeFile=upload.p12
storePassword=<키 저장소 비밀번호>
keyAlias=upload
keyPassword=<키 비밀번호>
```

운영 Supabase 공개 설정을 적용한 뒤 `npm run android:release`를 실행합니다. 서명된 번들은 `android/app/build/outputs/bundle/release/app-release.aab`에 생성됩니다. Play Console에서 사용할 키와 일치하는지 `keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab`로 인증서 지문을 확인할 수 있습니다.

## Supabase 음식 카탈로그와 계정

`supabase/migrations`는 공용 카탈로그와 사용자 전용 음식 테이블을 구성합니다. 제품별 1포장 또는 1회분 단백질량과 출처는 공용 DB에 기록하고 앱의 오프라인 목록에도 포함합니다. 로컬에서는 `.env.example`을 `.env.local`로 복사한 뒤 아래 공개 설정을 입력합니다. Cloudflare Pages에서는 같은 변수를 빌드 환경에 지정합니다.

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

두 값은 브라우저와 네이티브 앱 번들에 포함됩니다. `VITE_SUPABASE_PUBLISHABLE_KEY`에는 Supabase의 `sb_publishable_` 키 또는 레거시 `anon` 키를 사용합니다. `sb_secret_` 및 `service_role` 키는 Supabase 함수 실행 환경에 보관하고, OAuth 클라이언트 Secret은 Supabase Auth의 공급자 설정에 보관합니다. 환경 파일은 `.env.example`만 커밋합니다.

검색 첫 화면, 즐겨찾기, 빠른 기록은 기기에 저장된 공용 카탈로그와 현재 계정의 음식 목록을 즉시 표시합니다. Supabase에서 해당 목록이 추가·변경·삭제되면 버전이 바뀌고 Realtime으로 앱에 전달됩니다. 전체 목록은 버전이 달라졌을 때 받아 옵니다. 앱을 다시 열거나 재연결할 때는 버전만 확인하며, 오프라인에서는 마지막 목록을 계속 표시합니다. 첫 공용 캐시가 없으면 앱에 포함된 기본 목록을 표시합니다. 직접 추가한 음식은 저장 성공 즉시 캐시에 반영합니다. 즐겨찾기, 빠른 기록 설정, 섭취 기록은 기기에 계정별로 저장합니다.

음식을 직접 추가하거나 삭제하려면 로그인과 인터넷 연결이 필요합니다. 추가한 음식은 로그인한 계정에 저장합니다. 음식 검색에서 개인 음식을 열어 삭제하면 새 기록 목록에서 사라지고, 이미 저장한 섭취 기록은 계속 볼 수 있습니다.

Google 로그인에는 Google Cloud의 **웹 애플리케이션** OAuth 클라이언트를 사용합니다. Google Cloud에 `https://<project-ref>.supabase.co/auth/v1/callback`을 승인된 리디렉션 URI로 등록하고, 클라이언트 ID와 Secret은 Supabase Auth의 Google 공급자 설정에 저장합니다. 앱은 Supabase에서 활성화된 Google 또는 Apple 로그인만 표시합니다.

Supabase Auth의 Redirect URLs에 앱을 실행하는 웹 주소와 `com.sckwon770.waytogo://auth/callback`을 등록합니다. 기존 설치본도 계속 지원하는 경우 해당 버전의 리디렉션 URL도 유지합니다. 로컬 웹에서 테스트할 때는 `http://localhost:5173/`도 등록합니다. 네이티브 번들의 Supabase 프로젝트를 바꾼 경우 `npm run cap:sync`로 다시 반영합니다.

회원 탈퇴 기능을 제공하려면 `supabase/functions/delete-account/index.ts`를 배포합니다. 이 함수는 로그인한 요청자 본인의 Auth 계정을 삭제합니다. 데이터베이스는 계정에 저장된 음식도 함께 삭제하고, 성공 응답을 받은 앱은 해당 기기의 기록과 설정을 지웁니다. 관리자 자격 증명은 함수 실행 환경에서만 사용합니다.

Play Console에 제출할 개인정보 처리방침과 외부 계정 삭제 요청 페이지는 웹으로 배포한 앱의 `/#profile/privacy`와 `/#profile/account-deletion`입니다. 계정 삭제 요청 페이지에서는 운영자에게 이메일로 삭제를 요청할 수 있습니다.

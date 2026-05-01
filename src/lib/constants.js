export const MEMBERS = [
  { id: 'maki', name: '馬來晴彦', kana: 'マキ ハルヒコ' },
  { id: 'yokokura', name: '横倉陸', kana: 'ヨコクラ リク' },
  { id: 'hashimoto', name: '橋本麻衣', kana: 'ハシモト マイ' },
  { id: 'otake', name: '大竹拓海', kana: 'オオタケ タクミ' },
]

export const DEPARTMENTS = [
  { id: 'construction', name: '工事部体験' },
  { id: 'sales_tech', name: '技術営業体験' },
  { id: 'sales_office', name: '営業事務体験' },
  { id: 'general', name: '総務部体験' },
]

export const PERIOD = {
  start: '2026-05',
  end: '2026-10',
  label: '上期（5月〜10月）',
}

const KOUJI_PROGRAMS = [
  { id: 'k01', no: '①', title: '搬入～現場に入るまでを知る', mission: '搬入から現場に入るまでの流れを理解する' },
  { id: 'k02', no: '②', title: '現場確認～部材の置き場を知る', mission: '現場確認と部材の置き場を理解する' },
  { id: 'k03', no: '③', title: '現調・依頼書の内容と実際の現場状況を知る', mission: '現調・依頼書の内容と実際の現場状況を照合して理解する' },
  { id: 'k04', no: '④', title: '現場に合わせた設置位置・高さを知る', mission: '現場に合わせた設置位置・高さの決め方を理解する' },
  { id: 'k05', no: '⑤', title: '設備・電気・大工との絡みを知る', mission: '設備・電気・大工との関係性と連携を理解する' },
  { id: 'k06', no: '⑥', title: '実際の現場種類の違いを知る', mission: '戸建て・MS・全面改修・部分改修・入居中・新築の違いを理解する' },
  { id: 'k07', no: '⑦', title: '組み立ての流れを知る', mission: 'ユニットバス組み立ての一連の流れを理解する' },
  { id: 'k08', no: '⑧', title: '組み立ての難易度を知る', mission: 'グレード・窓梁・特殊・３点などの難易度の違いを理解する' },
  { id: 'k09', no: '⑨', title: '職人というものの性質と価値を知る', mission: '職人の仕事の性質と社会的価値を理解する' },
  { id: 'k10', no: '⑩', title: 'メーカーや品番の違いを知る', mission: 'メーカーや品番の違いと特徴を理解する' },
]


const JIMU_PROGRAMS = [
  { id: 1,  no: '', title: '予定表・工事受付範囲の理解', mission: '予定表（工事＆現調）の理解（枠の数え方含む）、工事受付範囲の理解（UB・SKとの違い含む）／目標：予定表の枠数数えられるようにする' },
  { id: 2,  no: '', title: 'UB資料の基本的な見方', mission: 'UB資料（明細＆図面）の基本的な見方の理解、仕様変更期日の理解（代理店によって変わる事もあるなど含む）' },
  { id: 3,  no: '', title: 'メール出力・仕分け', mission: 'メール出力 種類別での仕分けを覚える／目標：種類別での仕分けを覚える、注番処理を覚える（過去・未来分）' },
  { id: 4,  no: '', title: 'FAX仕分け', mission: 'FAX仕分け／目標：過去+未来の施工現場の注番処理を覚える' },
  { id: 5,  no: '', title: '電話対応（施工依頼）', mission: '電話対応（主に施工依頼）／目標：新規依頼の電話を5回対応する' },
  { id: 6,  no: '', title: 'UB依頼書などの作成①', mission: 'UB依頼書などの作成①／目標：依頼書作成を5現場分作成する' },
  { id: 7,  no: '', title: '仕様確定後変現場の処理（代理店への依頼）', mission: '仕様確定後変現場の処理（代理店への依頼）／目標：代理店にメールまでする' },
  { id: 8,  no: '', title: 'UB見積もり', mission: 'UB見積もり／目標：見積もりを5回出す' },
  { id: 9,  no: '', title: 'TETRAとイイコネの使用', mission: 'TETRAとイイコネの使用／目標：図面出力をする' },
  { id: 10, no: '', title: '搬入屋の手配', mission: '搬入屋の手配／目標：搬入屋に3現場依頼をかける' },
  { id: 11, no: '', title: 'SK資料の理解・SK依頼受付', mission: 'SK資料（明細＆図面）の基本的な見方の理解、SK依頼受付及びSK職人への予定確認／目標：SK職人に依頼をかける' },
  { id: 12, no: '', title: '導入部分の復習', mission: '導入部分の復習' },
  { id: 13, no: '', title: '現調日のアポ取り', mission: '現調日のアポ取り／目標：1担当者分の現調行く日を伝える' },
  { id: 14, no: '', title: '現場状況の確認・現調可能日の確認', mission: '現場状況の確認＆現調可能日の確認／目標：5現場の確認をする' },
  { id: 15, no: '', title: '仕様確定後変現場の処理（元請への確認）', mission: '仕様確定後変現場の処理（元請への確認）／目標：3現場分確認する' },
  { id: 16, no: '', title: 'クレーム処理', mission: 'クレーム処理／目標：3現場分の処理をする' },
  { id: 17, no: '', title: 'LINE現場報告を予定表へ入力・変更', mission: 'LINE（現場報告）を予定表へ入力＆変更／目標：1日現調分の変更現場反映させる' },
  { id: 18, no: '', title: '部材の受け取り・内容把握', mission: '部材の受け取り+部材内容の把握（課長と一緒に）／目標：事務所で部材受取～完了までやる' },
  { id: 19, no: '', title: 'UB依頼書作成②・完了現場スキャン保存', mission: 'UB依頼書などの作成②、完了現場資料スキャン～保存方法／目標：依頼書作成を5現場分作成する、20現場分スキャンする' },
  { id: 20, no: '', title: '行動予定表の作成', mission: '行動予定表の作成／目標：3日分予定を組んでみる' },
]

export const EDUCATION_PROGRAMS = JIMU_PROGRAMS

export const EDUCATION_PROGRAM_GROUPS = [
  { id: 'kouji', label: '工事部体験',   programs: KOUJI_PROGRAMS },
  { id: 'eigyo', label: '技術営業体験', programs: [] },
  { id: 'jimu',  label: '営業事務体験', programs: JIMU_PROGRAMS },
]

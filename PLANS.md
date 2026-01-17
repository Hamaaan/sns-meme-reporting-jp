# Plans

## 目的
- Gemini API を使って、日本のSNSトレンドを月次CSVに追記する最小構成を整備する。
- GitHub Actions の定期実行で自動レポーティングが回る状態を作る。

## 現在の最小構成
- `scripts/run_report.py` が Gemini API を呼び出し、`data/YYYY/YYYY-MM_meme_trends.csv` に追記する。
- `.github/workflows/report.yml` が毎日JST 03:00に実行し、差分があれば commit/push する。
- プロンプトは `prompts/report_prompt.txt` で管理する。

## 必要な設定
- GitHub Secrets: `GEMINI_API_KEY`
- 任意環境変数: `GEMINI_MODEL`（既定: `gemini-2.5-flash`）, `LOOKBACK_DAYS`, `MAX_ITEMS`, `MAX_TOKENS`

## 実行手順（手動）
1. GitHub リポジトリの Settings → Secrets and variables → Actions で `GEMINI_API_KEY` を追加する。
2. Actions タブで `meme-report` ワークフローを開き、Run workflow から手動実行する。

## 次のステップ（短期）
- 出力フォーマットの検証（列数/区切り/空行）を強化する。
- `tests/` を追加し、CSVの破損検知とパース確認を自動化する。
- 収集対象SNSやトピック分類のガイドラインを `prompts/` に拡充する。

## 次のステップ（中期）
- 重複判定・名称正規化の精度向上。
- 失敗時の再試行やアラート（Slack/Email）を追加。
- 月次ファイルの整合性チェックとバックアップ運用の追加。

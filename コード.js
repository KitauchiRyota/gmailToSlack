// by Gemini (,Kitauchi) 2025

// ================================================================
// 設定項目
// ================================================================

// 条件1：この日付以降に受信したメールから検索
// このプログラムを作成したのが、2025/09のため、過去分も全て含めるといろいろと面倒だったので、この設定にしています。
const FIRST_DATE = '2025/09/01';

// 条件2:監視したい送信元のメールアドレスのドメイン（@以降）
// const TARGET_DOMAIN = 'manabi-web.net';
const TARGET_DOMAIN = 'gmail.com';

// 条件3：過去のプログラム実行時にSlackに送信したかを示すラベル
// Gmail側で手動でラベル作成後、ここにラベル名をコピペしてください。
const SENT_LABEL = 'Slack送信済';


// SlackのWebhook URL
const SLACK_WEBHOOK_URL = webhook;

// Slackに通知するときのアイコン絵文字
const SLACK_ICON_EMOJI = ':e-mail:';

// Slackに通知するときのボット名
const SLACK_BOT_NAME = 'まなびWebメール配信通知Bot';

// ================================================================
// メインの処理
// ================================================================

/**
 * 下の1~3の条件に合致するメールを検索、ヒットすればSlackに通知し、"Slack送信済"ラベルを付ける関数
 * 1. FIRST_DATE 以降に受信
 * 2. @以降が TARGET_DOMAIN
 * 3. SENT_LABEL のラベルがついていない
 */
function checkNewMailsAndNotifySlack() {

  // 検索クエリ
  const query = `after:${FIRST_DATE} from:@${TARGET_DOMAIN} -label:${SENT_LABEL}`;
  
  // クエリに一致するメールのスレッドを取得
  const threads = GmailApp.search(query);
  Logger.log('type-threads:'+typeof(threads));
  Logger.log(threads);

  const label = GmailApp.getUserLabelByName(SENT_LABEL);

  // 各スレッドをループ処理
  threads.forEach(thread => {
    const threadLabels = thread.getLabels();
    let isAlreadySent = false;
    for(const l of threadLabels){
      if(l.getName() === SENT_LABEL){
        isAlreadySent =true;
      }
    }
    if(!isAlreadySent){
      thread.getMessages().forEach(message => {
      sendToSlack(message);
      Logger.log('type-message:'+typeof(message));
      Logger.log(message.getPlainBody()); // 動作確認用
      // 送信済みラベルを追加
      thread.addLabel(label);
    });
    }
    Logger.log('type-thread:'+typeof(thread)); 
  });
}

/**
 * Slackにメッセージを送信する関数
 * @param {GmailMessage} message - Gmailのメッセージオブジェクト
 */
function sendToSlack(message) {
  const subject = message.getSubject(); // 件名
  const date = message.getDate();       // 受信日時
  const body = message.getPlainBody(); // 本文

  // 受信日時を、yy/mm/dd形式に変換
  const formattedDate = Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd hh:mm');

  // Slackに送信するメッセージを作成
  const payload = {
    username: SLACK_BOT_NAME,
    icon_emoji: SLACK_ICON_EMOJI,
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `${formattedDate}に、まなびWebで受講生に配信されたメールです`
        }
      },
      {
        "type": "divider"
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*件名:*\n${subject}`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*本文:*\n>${body.replace(/\n/g, '\n>').replace(/\s+$/, '')}`
          // 本文を引用形式で表示するため、改行をSlackでの引用文字に変換
          // 本文末尾の無駄な空白文字を削除
        }
      }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  // Webhook URLにPOSTリクエストを送信
  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);
}
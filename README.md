# AZ.js
AZ.jsは囲碁AIを使ったアプリ開発入門のためのサンプルアプリとソースコードです。
一緒に囲碁プログラミングしましょう！

## 特長
AZ.jsには以下の特長があります。
- プログラマー人口が多く、入門も比較的容易なプログラミング言語JavaScriptを採用しました
- 思考エンジンにDeepMind社のAlphaGo Zeroと同じアルゴリズムを採用しました
- ニューラルネットワークにFacebook社のELF OpenGoのウェイトなどを利用可能です
- APIドキュメントなどコメントが充実しています

## 遊び方
https://new3Rs.github.io/AZ.js/index.ja.html をクリックするとアプリが動きます。

## APIドキュメント
https://new3Rs.github.io/AZ.js/docs をクリックしてください。

## 開発の仕方
1. gitコマンドでこのレポジトリをcloneしてください。
```sh
git clone https://github.com/new3Rs/AZ.js.git
cd AZ.js
```

2. 必要なパッケージをインストールしてください。
```sh
npm install
```

3. ウェブサーバーを起動してください。
以下のコマンドでサーバーが起動し、デフォルトのブラウザでアプリが開きます。
```sh
npm run server
```

4. srcフォルダの中のコードを好きに変更してください。変更したらbuildしましょう。
```sh
npm run build
```

ブラウザで再読み込みすると変更が反映されているはずです。

不明な点があれば、Issuesでどんどんご質問ください。

## 自分アプリの公開の仕方
面白い変更ができたら公開したくなりますよね？
GitHubなら公開も簡単です。

1. もしまだ持っていなければGitHubアカウントを作ります。

2. このレポジトリをforkします。

3. forkしたレポジトリをcloneします。

4. SettingsでGitHub PagesのSourceを"master branch /docs folder"に設定します。

5. 「開発の仕方」で変更したファイルをcloneしたレポジトリに上書きコピーしてbuildします。

6. 変更をコミットします。
```sh
git commit -am "コメント"
```
7. forkしたレポジトリに反映させます。
```sh
git push
```

これであなたのアプリが公開されています。
https://<あなたのGitHubアカウント名>.github.io/AZ.js/index.ja.html
をアクセスしてみてください。

## ウェイトファイルの変換
Leela Zero用ウェイトファイルをWebDNN用に変換すると本アプリで使えるようになります。
変換するには、leela-zero-tf/convert_webdnn.py を利用してください。

```sh
cd leela-zero-tf
pip3 install -r requirements.txt
python3 convert_webdnn.py <weight_file_name>
```

## ライセンス
基本的にMITライセンスです。各ファイルに記述しています。

碁盤描画ライブラリに[jGoBoard](http://jgoboard.com/)の変更バージョンを使用しています。関連ファイル(docs/js/jgoboard-latest.js, docs/large/*)はjGoBoardのライセンスを参照してください。

ニューラネットワークの評価に[WebDNN](https://mil-tokyo.github.io/webdnn/ja/)を使用しています。関連ファイル(docs/js/webdnn.js*)はjGoBoardのライセンスを参照してください。

石音は[効果音ラボ](https://soundeffect-lab.info/sound/various/various3.html)様のフリー効果音素材を利用しています。関連ファイル(docs/audio/go-piece1.mp3)は効果音ラボ様のライセンスを参照してください。

leela-zero-tf/tfprocess.py, leela-zero-tf/net2net.py はLeela Zeroのコードを修正したものです。ライセンスはLeela Zeroのライセンスを参照してください。
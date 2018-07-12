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

## ライセンス
基本的にMITライセンスです。各ファイルに記述しています。

碁盤描画ライブラリに[jGoBoard](http://jgoboard.com/)の変更バージョンを使用しています。関連ファイル(docs/js/jgoboard-latest.js, docs/large/*)はjGoBoardのライセンスを参照してください。

ニューラネットワークの評価に[WebDNN](https://mil-tokyo.github.io/webdnn/ja/)を使用しています。関連ファイル(docs/js/webdnn.js*)はjGoBoardのライセンスを参照してください。

石音は[効果音ラボ](https://soundeffect-lab.info/sound/various/various3.html)様のフリー効果音素材を利用しています。関連ファイル(docs/audio/go-piece1.mp3)は効果音ラボ様のライセンスを参照してください。
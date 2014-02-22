Twinkle
=======

Twinkle是維基人用於快速執行常見維護工作（如提交刪除候選及清理破壞）的JavaScript庫和應用程式。

它構建於已被許多維基百科腳本和編輯工具使用的`morebits.js`庫之上。

查看中文維基百科上的[Wikipedia:Twinkle][]以獲取更多信息。

[AzaToth][]是本工具和`morebits.js`庫的的最初作者和維護者。

更新Wikipedia上的腳本
---------------------

要生成被貓過的Twinkle腳本，請使用以下`bash`命令：

    awk 'FNR==1{print ""}{print}' twinkle.header.js modules/*.js twinkle.footer.js > alltwinkle.js

然後就可以把`alltwinkle.js`上傳到[MediaWiki:Gadget-Twinkle.js][]。這並未包含`morebits.js`和`morebits.css`，它們需要被分開上傳。

如果`morebits.js`和/或`morebits.css`需要更新，它們應當被同步到這些地方：

* _morebits.js_ 至[MediaWiki:Gadget-morebits.js][]
* _morebits.css_ 至[MediaWiki:Gadget-morebits.css][]

[MediaWiki:Gadgets-definition][]應當包含這一行：

    * Twinkle[ResourceLoader|dependencies=jquery.ui.dialog,jquery.tipsy]|morebits.js|morebits.css|Twinkle.js

同步（給開發者）
----------------

存在一個名為`sync.pl`的同步腳本，可用於向維基百科上拉取和推送文件。

這個程序依賴於Perl 5.10和模塊[`Git::Repository`][Git::Repository]與[`MediaWiki::Bot`][MediaWiki::Bot]，可輕易用[`App::cpanminus`][App::cpanminus]安裝：

    cpanm --sudo install Git::Repository MediaWiki::Bot

在運行這個程序時，您可以在命令行中使用`--username`和`--password`參數提供您的憑據，但更推薦將它們保存到`~/.mwbotrc`的文件中，採用以下格式：

    username => "Username",
    password => "password",
    base     => "User::Username"

其中`base`是`pull`和`push`文件時的wiki路徑前綴。

留意您的工作目錄**不需要**是乾淨的；亦可以`stash`或`commit`您的修改。

要`pull`用戶Foobar的修改，做：

    ./sync.pl --base User:Foobar --pull morebits.js

要`push`您的修改到Foobar的wiki頁，做：

    ./sync.pl --base User:Foobar --push morebits.js

也有一`deploy`命令來部署新的文件。

    ./sync.pl --deploy twinkle.js
    make deploy

編輯摘要會包含分支和上次提交的SHA。

格式指引
--------

雖然舊的代碼有許多不同且不一致的格式，但我們已經決定要在代碼中使用更為一致的格式。

[jQuery Core Style Guideline][jq_style]是我們在此之後使用的格式指引。

[Wikipedia:Twinkle]: https://zh.wikipedia.org/wiki/Wikipedia:Twinkle
[AzaToth]: https://en.wikipedia.org/wiki/User:AzaToth
[MediaWiki:Gadget-Twinkle.js]: https://zh.wikipedia.org/wiki/MediaWiki:Gadget-Twinkle.js
[User:AzaToth/twinkle.js]: https://en.wikipedia.org/wiki/User:AzaToth/twinkle.js
[MediaWiki:Gadget-morebits.js]: https://zh.wikipedia.org/wiki/MediaWiki:Gadget-morebits.js
[User:AzaToth/morebits.js]: https://en.wikipedia.org/wiki/User:AzaToth/morebits.js
[MediaWiki:Gadget-morebits.css]: https://zh.wikipedia.org/wiki/MediaWiki:Gadget-morebits.css
[User:AzaToth/morebits.css]: https://en.wikipedia.org/wiki/User:AzaToth/morebits.css
[MediaWiki:Gadgets-definition]: https://zh.wikipedia.org/wiki/MediaWiki:Gadgets-definition
[Git::Repository]: http://search.cpan.org/perldoc?Git%3A%3ARepository
[MediaWiki::Bot]: http://search.cpan.org/perldoc?MediaWiki%3A%3ABot
[App::cpanminus]: http://search.cpan.org/perldoc?App%3A%3Acpanminus
[jq_style]: http://contribute.jquery.org/style-guide/js/

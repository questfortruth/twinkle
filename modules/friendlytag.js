//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** friendlytag.js: Tag module
 ****************************************
 * Mode of invocation:     Tab ("Tag")
 * Active on:              Existing articles; file pages with a corresponding file
 *                         which is local (not on Commons); existing subpages of
 *                         {Wikipedia|Wikipedia talk}:Articles for creation;
 *                         all redirects
 * Config directives in:   FriendlyConfig
 */

Twinkle.tag = function friendlytag() {
	// redirect tagging
	if( Morebits.wiki.isPageRedirect() ) {
		Twinkle.tag.mode = '重定向';
		Twinkle.addPortletLink( Twinkle.tag.callback, "標記", "friendly-tag", "標記重定向" );
	}
	// article tagging
	else if( ( mw.config.get('wgNamespaceNumber') === 0 && mw.config.get('wgCurRevisionId') ) || ( Morebits.pageNameNorm === 'Wikipedia:沙盒') ) {
		Twinkle.tag.mode = '條目';
		Twinkle.addPortletLink( Twinkle.tag.callback, "標記", "friendly-tag", "標記條目" );
	}
};

Twinkle.tag.callback = function friendlytagCallback( uid ) {
	var Window = new Morebits.simpleWindow( 630, (Twinkle.tag.mode === "條目") ? 450 : 400 );
	Window.setScriptName( "Twinkle" );
	// anyone got a good policy/guideline/info page/instructional page link??
	Window.addFooterLink( "Twinkle幫助", "WP:TW/DOC#tag" );

	var form = new Morebits.quickForm( Twinkle.tag.callback.evaluate );

	if (document.getElementsByClassName("patrollink").length) {
		form.append( {
			type: 'checkbox',
			list: [
				{
					label: '標記頁面為已巡查',
					value: 'patrolPage',
					name: 'patrolPage',
					checked: Twinkle.getFriendlyPref('markTaggedPagesAsPatrolled')
				}
			]
		} );
	}

	switch( Twinkle.tag.mode ) {
		case '條目':
			Window.setTitle( "條目維護標記" );

			form.append( {
					type: 'checkbox',
					list: [
						{
							label: '如可能，合併入{{multiple issues}}',
							value: 'group',
							name: 'group',
							tooltip: '如果添加{{multiple issues}}支持的三個以上的模板，所有支持的模板都會被合併入{{multiple issues}}模板中。',
							checked: Twinkle.getFriendlyPref('groupByDefault')
						}
					]
				}
			);

			form.append({
				type: 'select',
				name: 'sortorder',
				label: '察看列表：',
				tooltip: '您可以在Twinkle參數設置中更改此項。',
				event: Twinkle.tag.updateSortOrder,
				list: [
					{ type: 'option', value: 'cat', label: '按類別', selected: Twinkle.getFriendlyPref('tagArticleSortOrder') === 'cat' },
					{ type: 'option', value: 'alpha', label: '按字母', selected: Twinkle.getFriendlyPref('tagArticleSortOrder') === 'alpha' }
				]
			});

			form.append( { type: 'div', id: 'tagWorkArea' } );

			if( Twinkle.getFriendlyPref('customTagList').length ) {
				form.append( { type:'header', label:'自定義模板' } );
				form.append( { type: 'checkbox', name: 'articleTags', list: Twinkle.getFriendlyPref('customTagList') } );
			}
			break;

		case '重定向':
			Window.setTitle( "重定向標記" );

			form.append({ type: 'header', label:'拼寫、錯誤拼寫、時態和大小寫模板' });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.spellingList });

			form.append({ type: 'header', label:'其他名稱模板' });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.alternativeList });

			form.append({ type: 'header', label:'雜項和管理用重定向模板' });
			form.append({ type: 'checkbox', name: 'redirectTags', list: Twinkle.tag.administrativeList });
			break;

		default:
			alert("Twinkle.tag：未知模式 " + Twinkle.tag.mode);
			break;
	}

	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	if (Twinkle.tag.mode === "條目") {
		// fake a change event on the sort dropdown, to initialize the tag list
		var evt = document.createEvent("Event");
		evt.initEvent("change", true, true);
		result.sortorder.dispatchEvent(evt);
	}
};

Twinkle.tag.checkedTags = [];

Twinkle.tag.updateSortOrder = function(e) {
	var sortorder = e.target.value;
	var $workarea = $(e.target.form).find("div#tagWorkArea");

	Twinkle.tag.checkedTags = e.target.form.getChecked("articleTags");
	if (!Twinkle.tag.checkedTags) {
		Twinkle.tag.checkedTags = [];
	}

	// function to generate a checkbox, with appropriate subgroup if needed
	var makeCheckbox = function(tag, description) {
		var checkbox = { value: tag, label: "{{" + tag + "}}: " + description };
		if (Twinkle.tag.checkedTags.indexOf(tag) !== -1) {
			checkbox.checked = true;
		}
		switch (tag) {
			case "merge":
			case "merge from":
			case "merge to":
				var otherTagName = "merge";
				switch (tag)
				{
					case "merge from":
						otherTagName = "merge to";
						break;
					case "merge to":
						otherTagName = "merge from";
						break;
				}
				checkbox.subgroup = [
					{
						name: 'mergeTarget',
						type: 'input',
						label: '其他條目：',
						tooltip: '如指定多個條目，請用管道符分隔：條目甲|條目乙'
					},
					{
						name: 'mergeTagOther',
						type: 'checkbox',
						list: [
							{
								label: '用{{' + otherTagName + '}}標記其他條目',
								checked: true,
								tooltip: '僅在只輸入了一個條目名時可用'
							}
						]
					}
				];
				if (mw.config.get('wgNamespaceNumber') === 0) {
					checkbox.subgroup.push({
						name: 'mergeReason',
						type: 'textarea',
						label: '合併理由（會被貼上' +
							(tag === "merge to" ? '其他' : '這') + '條目的討論頁）：',
						tooltip: '可選，但強烈推薦。如不需要請留空。僅在只輸入了一個條目名時可用。'
					});
				}
				break;
			case "notability":
				checkbox.subgroup = {
					name: 'notability',
					type: 'select',
					list: [
						{ label: "{{notability}}：通用的關注度指引", value: "none" },
						{ label: "{{notability|Biographies}}：人物傳記", value: "Biographies" },
						{ label: "{{notability|Fiction}}：虛構事物", value: "Films" },
						{ label: "{{notability|Neologisms}}：發明、研究", value: "Neologisms" },
						{ label: "{{notability|Web}}：網站、網絡內容", value: "Web"}
					]
				};
				break;
			default:
				break;
		}
		return checkbox;
	};

	// categorical sort order
	if (sortorder === "cat") {
		var div = new Morebits.quickForm.element({
			type: "div",
			id: "tagWorkArea"
		});

		// function to iterate through the tags and create a checkbox for each one
		var doCategoryCheckboxes = function(subdiv, array) {
			var checkboxes = [];
			$.each(array, function(k, tag) {
				var description = Twinkle.tag.article.tags[tag];
				checkboxes.push(makeCheckbox(tag, description));
			});
			subdiv.append({
				type: "checkbox",
				name: "articleTags",
				list: checkboxes
			});
		};

		var i = 0;
		// go through each category and sub-category and append lists of checkboxes
		$.each(Twinkle.tag.article.tagCategories, function(title, content) {
			div.append({ type: "header", id: "tagHeader" + i, label: title });
			var subdiv = div.append({ type: "div", id: "tagSubdiv" + i++ });
			if ($.isArray(content)) {
				doCategoryCheckboxes(subdiv, content);
			} else {
				$.each(content, function(subtitle, subcontent) {
					subdiv.append({ type: "div", label: [ Morebits.htmlNode("b", subtitle) ] });
					doCategoryCheckboxes(subdiv, subcontent);
				});
			}
		});

		var rendered = div.render();
		$workarea.replaceWith(rendered);
		var $rendered = $(rendered);
		$rendered.find("h5").css({ 'font-size': '110%', 'margin-top': '1em' });
		$rendered.find("div").filter(":has(span.quickformDescription)").css({ 'margin-top': '0.4em' });
	}
	// alphabetical sort order
	else {
		var checkboxes = [];
		$.each(Twinkle.tag.article.tags, function(tag, description) {
			checkboxes.push(makeCheckbox(tag, description));
		});
		var tags = new Morebits.quickForm.element({
			type: "checkbox",
			name: "articleTags",
			list: checkboxes
		});
		$workarea.empty().append(tags.render());
	}
};


// Tags for ARTICLES start here

Twinkle.tag.article = {};

// A list of all article tags, in alphabetical order
// To ensure tags appear in the default "categorized" view, add them to the tagCategories hash below.

Twinkle.tag.article.tags = {
	"advert": "類似廣告或宣傳性內容",
	"autobiography": "類似一篇自傳，或內容主要由條目描述的當事人或組織撰寫、編輯",
	"blpdispute": "可能違反了維基百科關於生者傳記的方針",
	"blpsources": "生者傳記需要補充更多可供查證的來源",
	"blpunsourced": "生者傳記沒有列出任何參考或來源",
	"catimprove": "需要更多頁面分類",
	"citation style": "引用需要進行清理",
	"citecheck": "可能包含不適用或被曲解的引用資料，部分內容的準確性無法被證實",
	"cleanup": "可能需要進行清理，以符合維基百科的質量標準",
	"cleanup-jargon": "包含過多行話或專業術語，可能需要簡化或提出進一步解釋",
	"coi": "主要貢獻者與本條目所宣揚的內容可能存在利益衝突",
	"contradict": "內容自相矛盾",
	"copyedit": "需要編修，以確保文法、用詞、語氣、格式、標點等使用恰當",
	"dead end": "需要更多內部連接以構築百科全書的連結網絡",
	"disputed": "內容疑欠準確，有待查證",
	"expand": "需要擴充",
	"expert": "需要精通或熟悉本主題的專業人士參與及協助編輯",
	"external links": "使用外部連結的方式可能不符合維基百科的方針或指引",
	"fansite": "類似愛好者網頁",
	"globalize": "僅具有一部分地區的信息或觀點",
	"hoax": "真實性被質疑",
	"howto": "包含指南或教學內容",
	"in-universe": "使用小說故事內的觀點描述一個虛構事物",
	"inappropriate person": "使用不適當的第一人稱和第二人稱",
	"inappropriate tone": "語調或風格可能不適合百科全書的寫作方式",
	"lead section": "導言部分也許不足以概括其內容",
	"lead section too long": "導言部分也許過於冗長",
	"merge": "建議此頁面與頁面合併",
	"merge from": "建議將頁面併入本頁面",
	"merge to": "建議將此頁面併入頁面",
	"newsrelease": "閱讀起來像是新聞稿及包含過度的宣傳性語調",
	"no footnotes": "因為沒有內文引用而來源仍然不明",
	"non-free": "可能過多或不當地使用了受版權保護的文字、圖像或/及多媒體文件",
	"notability": "可能不符合通用關注度指引",
	"notmandarin": "包含過多不是現代標準漢語的內容",
	"onesource": "極大或完全地依賴於某個單一的來源",
	"original research": "可能包含原創研究或未查證內容",
	"orphan": "沒有或只有很少連入頁面",
	"overlinked": "含有過多、重複、或不必要的內部連結",
	"pov": "中立性有爭議。內容、語調可能帶有明顯的個人觀點或地方色彩",
	"primarysources": "依賴第一手來源",
	"prose": "使用了日期或時間列表式記述，需要改寫為連貫的敘述性文字",
	"refimprove": "需要補充更多來源",
	"review": "閱讀起來類似評論，需要清理",
	"rewrite": "不符合維基百科的質量標準，需要完全重寫",
	"roughtranslation": "翻譯品質不佳",
	"substub": "過於短小",
	"trivia": "應避免有陳列雜項、瑣碎資料的部分",
	"uncategorized": "缺少頁面分類",
	"unencyclopedic": "可能不適合寫入百科全書",
	"unreferenced": "沒有列出任何參考或來源",
	"update": "當前條目或章節需要更新",
	"verylong": "可能過於冗長",
	"weasel": "語意模稜兩可而損及其中立性或準確性"
};

// A list of tags in order of category
// Tags should be in alphabetical order within the categories
// Add new categories with discretion - the list is long enough as is!

Twinkle.tag.article.tagCategories = {
	"清理和維護模板": {
		"常規清理": [
			"cleanup",
			"cleanup-jargon",
			"copyedit"
		],
		"可能多餘的內容": [
			"external links",
			"non-free"
		],
		"結構和導言": [
			"lead section",
			"lead section too long",
			"verylong"
		],
		"小說相關清理": [
			"in-universe"
		]
	},
	"常規條目問題": {
		"重要性和知名度": [
			"notability"  // has subcategories and special-cased code
		],
		"寫作風格": [
			"advert",
			"fansite",
			"howto",
			"inappropriate person",
			"inappropriate tone",
			"newsrelease",
			"prose",
			"review"
		],
		"內容": [
			"expand",
			"substub",
			"unencyclopedic"
		],
		"信息和細節": [
			"expert",
			"trivia"
		],
		"時間性": [
			"update"
		],
		"中立、偏見和事實準確性": [
			"autobiography",
			"coi",
			"contradict",
			"disputed",
			"globalize",
			"hoax",
			"pov",
			"weasel"
		],
		"可供查證和來源": [
			"blpdispute",
			"blpsources",
			"blpunsourced",
			"citecheck",
			"no footnotes",
			"onesource",
			"original research",
			"primarysources",
			"refimprove",
			"unreferenced"
		]
	},
	"具體內容問題": {
		"語言": [
			"notmandarin",
			"roughtranslation"
		],
		"連結": [
			"dead end",
			"orphan",
			"overlinked"
		],
		"參考技術": [
			"citation style"
		],
		"分類": [
			"catimprove",
			"uncategorized"
		]
	},
	"合併": [  // these three have a subgroup with several options
		"merge",
		"merge from",
		"merge to"
	]
};

// Tags for REDIRECTS start here

Twinkle.tag.spellingList = [
	{
		label: "{{簡繁重定向}}: 引導簡體至繁體，或繁體至簡體",
		value: '簡繁重定向'
	},
	{
		label: "{{模板重定向}}: 指向模板",
		value: '模板重定向'
	},
	{
		label: "{{別名重定向}}: 標題的其他名稱、筆名、綽號、同義字等",
		value: '別名重定向'
	},
	{
		label: "{{縮寫重定向}}: 標題縮寫",
		value: '縮寫重定向'
	},
	{
		label: "{{拼寫重定向}}: 標題的其他不同拼寫",
		value: '拼寫重定向'
	},
	{
		label: "{{錯字重定向}}: 標題的常見錯誤拼寫或誤植",
		value: '錯字重定向'
	},
];

Twinkle.tag.alternativeList = [
	{
		label: "{{全名重定向}}: 標題的完整或更完整名稱",
		value: '全名重定向'
	},
	{
		label: "{{短名重定向}}: 完整標題名稱或人物全名的部分、不完整的名稱或簡稱",
		value: '短名重定向'
	},
	{
		label: "{{姓氏重定向}}: 人物姓氏",
		value: '姓氏重定向'
	},
	{
		label: "{{人名重定向}}: 人物人名",
		value: '人名重定向'
	},
	{
		label: "{{非中文重定向}}: 非中文標題",
		value: '非中文重定向'
	},
	{
		label: "{{日文重定向}}: 日語名稱",
		value: '日文重定向'
	}
];

Twinkle.tag.administrativeList = [
	{
		label: "{{角色重定向}}: 電視劇、電影、書籍等作品的角色",
		value: '角色重定向'
	},
	{
		label: "{{章節重定向}}: 導向至較高密度（散文般密集）組織的頁面",
		value: '章節重定向'
	},
	{
		label: "{{列表重定向}}: 導向至低密度的列表",
		value: '列表重定向'
	},
	{
		label: "{{可能性重定向}}: 導向至當前提供內容更為詳盡的目標頁面、或該頁面的章節段落",
		value: '可能性重定向'
	},
	{
		label: "{{關聯字重定向}}: 標題名稱關聯字",
		value: '關聯字重定向'
	},
	{
		label: "{{捷徑重定向}}: 維基百科捷徑",
		value: '捷徑重定向'
	},
	{
		label: "{{重定向模板用重定向}}: 重定向模板用",
		value: '重定向模板用重定向'
	},
	{
		label: "{{EXIF重定向}}: JPEG圖像包含EXIF信息",
		value: 'EXIF重定向'
	}
];


// Contains those article tags that *do not* work inside {{multiple issues}}.
Twinkle.tag.multipleIssuesExceptions = [
	'catimprove',
	'merge',
	'merge from',
	'merge to',
	'notmandarin',
	'roughtranslation',
	"substub",
	'uncategorized',
	'update'
];


Twinkle.tag.callbacks = {
	main: function( pageobj ) {
		var params = pageobj.getCallbackParameters(),
		    tagRe, tagText = '', summaryText = '添加',
		    tags = [], groupableTags = [], i, totalTags;

		// Remove tags that become superfluous with this action
		var pageText = pageobj.getPageText().replace(/\{\{\s*([Nn]ew unreviewed article|[Uu]nreviewed|[Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, "");

		var addTag = function friendlytagAddTag( tagIndex, tagName ) {
			var currentTag = "";
			if( tagName === 'uncategorized' || tagName === 'catimprove' ) {
				pageText += '\n\n{{' + tagName +
					'|time={{subst:#time:c}}}}';
			} else {
				currentTag += ( Twinkle.tag.mode === '重定向' ? '\n' : '' ) + '{{' + tagName;

				if( tagName === 'notability' && params.tagParameters.notability !== 'none' ) {
					currentTag += '|||' + params.tagParameters.notability;
				}

				// prompt for other parameters, based on the tag
				switch( tagName ) {
					case 'merge':
					case 'merge to':
					case 'merge from':
						if (params.mergeTarget) {
							// normalize the merge target for now and later
							params.mergeTarget = Morebits.string.toUpperCaseFirstChar(params.mergeTarget.replace(/_/g, ' '));

							currentTag += '|' + params.mergeTarget;

							// link to the correct section on the talk page, for article space only
							if (mw.config.get('wgNamespaceNumber') === 0 && (params.mergeReason || params.discussArticle)) {
								if (!params.discussArticle) {
									// discussArticle is the article whose talk page will contain the discussion
									params.discussArticle = (tagName === "merge to" ? params.mergeTarget : mw.config.get('wgTitle'));
									// nonDiscussArticle is the article which won't have the discussion
									params.nonDiscussArticle = (tagName === "merge to" ? mw.config.get('wgTitle') : params.mergeTarget);
									params.talkDiscussionTitle = '請求與' + params.nonDiscussArticle + '合併';
								}
								currentTag += '|discuss=Talk:' + params.discussArticle + '#' + params.talkDiscussionTitle;
							}
						}
						break;
					default:
						break;
				}

				currentTag += (Twinkle.tag.mode === '重定向') ? '}}' : '|time={{subst:#time:c}}}}\n';
				tagText += currentTag;
			}

			if ( tagIndex > 0 ) {
				if( tagIndex === (totalTags - 1) ) {
					summaryText += '和';
				} else if ( tagIndex < (totalTags - 1) ) {
					summaryText += '、';
				}
			}

			summaryText += '{{[[';
			summaryText += (tagName.indexOf(":") !== -1 ? tagName : ("T:" + tagName + "|" + tagName));
			summaryText += ']]}}';
		};

		if( Twinkle.tag.mode !== '重定向' ) {
			// Check for preexisting tags and separate tags into groupable and non-groupable arrays
			for( i = 0; i < params.tags.length; i++ ) {
				tagRe = new RegExp( '(\\{\\{' + params.tags[i] + '(\\||\\}\\})|\\|\\s*' + params.tags[i] + '\\s*=[a-z ]+\\d+)', 'im' );
				if( !tagRe.exec( pageText ) ) {
					if( params.tags[i] == 'notability' ) {
						wikipedia_page = new Morebits.wiki.page("Wikipedia:關注度/提報", "添加關注度記錄項");
						wikipedia_page.setFollowRedirect(true);
						wikipedia_page.setCallbackParameters(params);
						wikipedia_page.load(Twinkle.tag.callbacks.notabilityList);
					}
					if( Twinkle.tag.multipleIssuesExceptions.indexOf(params.tags[i]) === -1 ) {
						groupableTags = groupableTags.concat( params.tags[i] );
					} else {
						tags = tags.concat( params.tags[i] );
					}
				} else {
					Morebits.status.warn( '信息', '在頁面上找到{{' + params.tags[i] +
						'}}…跳過' );
					// don't do anything else with merge tags
					if (params.tags[i] === "merge" || params.tags[i] === "merge from" ||
						params.tags[i] === "merge to") {
						params.mergeTarget = params.mergeReason = params.mergeTagOther = false;
					}
				}
			}

			var miTest = /\{\{(multiple ?issues|article ?issues|mi)[^}]+\{/im.exec(pageText);
			var miOldStyleRegex = /\{\{(multiple ?issues|article ?issues|mi)\s*\|([^{]+)\}\}/im;
			var miOldStyleTest = miOldStyleRegex.exec(pageText);

			if( ( miTest || miOldStyleTest ) && groupableTags.length > 0 ) {
				Morebits.status.info( '信息', '添加支持的標記入已存在的{{multiple issues}}' );

				groupableTags.sort();
				tagText = "";

				totalTags = groupableTags.length;
				$.each(groupableTags, addTag);

				summaryText += '標記' + '（在{{[[T:multiple issues|multiple issues]]}}內）';
				if( tags.length > 0 ) {
					summaryText += '和';
				}

				if( miOldStyleTest ) {
					// convert tags from old-style to new-style
					var split = miOldStyleTest[2].split("|");
					$.each(split, function(index, val) {
						split[index] = val.replace("=", "|time=").trim();
					});
					pageText = pageText.replace(miOldStyleRegex, "{{$1|\n{{" + split.join("}}\n{{") + "}}\n" + tagText + "}}\n");
				} else {
					var miRegex = new RegExp("(\\{\\{\\s*" + miTest[1] + "\\s*(?:\\|(?:\\{\\{[^{}]*\\}\\}|[^{}])*)?)\\}\\}\\s*", "im");
					pageText = pageText.replace(miRegex, "$1" + tagText + "}}\n");
				}
				tagText = "";
			} else if( params.group && groupableTags.length >= 3 ) {
				Morebits.status.info( '信息', '合併支持的模板入{{multiple issues}}' );

				groupableTags.sort();
				tagText += '{{multiple issues|\n';

				totalTags = groupableTags.length;
				$.each(groupableTags, addTag);

				summaryText += '等標記（{{[[T:multiple issues|multiple issues]]}}）';
				if( tags.length > 0 ) {
					summaryText += '及';
				}
				tagText += '}}\n';
			} else {
				tags = tags.concat( groupableTags );
			}
		} else {
			// Redirect tagging: Check for pre-existing tags
			for( i = 0; i < params.tags.length; i++ ) {
				tagRe = new RegExp( '(\\{\\{' + params.tags[i] + '(\\||\\}\\}))', 'im' );
				if( !tagRe.exec( pageText ) ) {
					tags = tags.concat( params.tags[i] );
				} else {
					Morebits.status.warn( '信息', '在重定向上找到{{' + params.tags[i] +
						'}}…跳過' );
				}
			}
		}

		tags.sort();
		totalTags = tags.length;
		$.each(tags, addTag);

		if( Twinkle.tag.mode === '重定向' ) {
			pageText += tagText;
		} else {
			// smartly insert the new tags after any hatnotes. Regex is a bit more
			// complicated than it'd need to be, to allow templates as parameters,
			// and to handle whitespace properly.
			pageText = pageText.replace(/^\s*(?:((?:\s*\{\{\s*(?:about|correct title|dablink|distinguish|for|other\s?(?:hurricaneuses|people|persons|places|uses(?:of)?)|redirect(?:-acronym)?|see\s?(?:also|wiktionary)|selfref|the)\d*\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\})+(?:\s*\n)?)\s*)?/i,
				"$1" + tagText);
		}
		summaryText += ( tags.length > 0 ? '標記' : '' ) +
			'到' + Twinkle.tag.mode;

		// avoid truncated summaries
		if (summaryText.length > (254 - Twinkle.getPref('summaryAd').length)) {
			summaryText = summaryText.replace(/\[\[[^\|]+\|([^\]]+)\]\]/g, "$1");
		}

		pageobj.setPageText(pageText);
		pageobj.setEditSummary(summaryText + Twinkle.getPref('summaryAd'));
		pageobj.setWatchlist(Twinkle.getFriendlyPref('watchTaggedPages'));
		pageobj.setMinorEdit(Twinkle.getFriendlyPref('markTaggedPagesAsMinor'));
		pageobj.setCreateOption('nocreate');
		pageobj.save(function() {
			// special functions for merge tags
			if (params.mergeReason) {
				// post the rationale on the talk page (only operates in main namespace)
				var talkpageText = "\n\n== 請求與[[" + params.nonDiscussArticle + "]]合併 ==\n\n";
				talkpageText += params.mergeReason.trim() + "--~~~~";

				var talkpage = new Morebits.wiki.page("Talk:" + params.discussArticle, "將理由貼進討論頁");
				talkpage.setAppendText(talkpageText);
				talkpage.setEditSummary('請求將[[' + params.nonDiscussArticle + ']]' +
					'與' + '[[' + params.discussArticle + ']]合併' +
					Twinkle.getPref('summaryAd'));
				talkpage.setWatchlist(Twinkle.getFriendlyPref('watchMergeDiscussions'));
				talkpage.setCreateOption('recreate');
				talkpage.append();
			}
			if (params.mergeTagOther) {
				// tag the target page if requested
				var otherTagName = "merge";
				if (tags.indexOf("merge from") !== -1) {
					otherTagName = "merge to";
				} else if (tags.indexOf("merge to") !== -1) {
					otherTagName = "merge from";
				}
				var newParams = {
					tags: [otherTagName],
					mergeTarget: Morebits.pageNameNorm,
					discussArticle: params.discussArticle,
					talkDiscussionTitle: params.talkDiscussionTitle
				};
				var otherpage = new Morebits.wiki.page(params.mergeTarget, "標記其他頁面（" +
					params.mergeTarget + "）");
				otherpage.setCallbackParameters(newParams);
				otherpage.load(Twinkle.tag.callbacks.main);
			}
		});

		if( params.patrol ) {
			pageobj.patrol();
		}
	},

	notabilityList: function(pageobj) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();

		pageobj.setAppendText("\n{{subst:Wikipedia:關注度/提報/item|title=" + Morebits.pageNameNorm + "}}");
		pageobj.setEditSummary("添加[[" + Morebits.pageNameNorm + "]]。" + Twinkle.getPref('summaryAd'));
		pageobj.setCreateOption('recreate');
		pageobj.append();
	}
};

Twinkle.tag.callback.evaluate = function friendlytagCallbackEvaluate(e) {
	var form = e.target;
	var params = {};
	if (form.patrolPage) {
		params.patrol = form.patrolPage.checked;
	}

	switch (Twinkle.tag.mode) {
		case '條目':
			params.tags = form.getChecked( 'articleTags' );
			params.group = form.group.checked;
			params.tagParameters = {
				notability: form["articleTags.notability"] ? form["articleTags.notability"].value : null
			};
			// common to {{merge}}, {{merge from}}, {{merge to}}
			params.mergeTarget = form["articleTags.mergeTarget"] ? form["articleTags.mergeTarget"].value : null;
			params.mergeReason = form["articleTags.mergeReason"] ? form["articleTags.mergeReason"].value : null;
			params.mergeTagOther = form["articleTags.mergeTagOther"] ? form["articleTags.mergeTagOther"].checked : false;
			break;
		case '重定向':
			params.tags = form.getChecked( 'redirectTags' );
			break;
		default:
			alert("Twinkle.tag：未知模式 " + Twinkle.tag.mode);
			break;
	}

	// form validation
	if( !params.tags.length ) {
		alert( '必須選擇至少一個標記！' );
		return;
	}
	if( ((params.tags.indexOf("merge") !== -1) + (params.tags.indexOf("merge from") !== -1) +
		(params.tags.indexOf("merge to") !== -1)) > 1 ) {
		alert( '請在{{merge}}、{{merge from}}和{{merge to}}中選擇一個。如果需要多次合併，請使用{{merge}}並用管道符分隔條目名（但在這種情形中Twinkle不能自動標記其他條目）。' );
		return;
	}
	if( (params.mergeTagOther || params.mergeReason) && params.mergeTarget.indexOf('|') !== -1 ) {
		alert( '目前還不支持在一次合併中標記多個條目，與開啟關於多個條目的討論。請不要勾選「標記其他條目」和/或清理「理由」框，並重試。' );
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = Morebits.pageNameNorm;
	Morebits.wiki.actionCompleted.notice = "標記完成，在幾秒內刷新頁面";
	if (Twinkle.tag.mode === '重定向') {
		Morebits.wiki.actionCompleted.followRedirect = false;
	}

	var wikipedia_page = new Morebits.wiki.page(Morebits.pageNameNorm, "正在標記" + Twinkle.tag.mode);
	wikipedia_page.setCallbackParameters(params);
	switch (Twinkle.tag.mode) {
		case '條目':
			/* falls through */
		case '重定向':
			wikipedia_page.load(Twinkle.tag.callbacks.main);
			return;
		default:
			alert("Twinkle.tag：未知模式 " + Twinkle.tag.mode);
			break;
	}
};
})(jQuery);


//</nowiki>

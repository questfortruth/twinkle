//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklewarn.js: Warn module
 ****************************************
 * Mode of invocation:     Tab ("Warn")
 * Active on:              User talk pages
 * Config directives in:   TwinkleConfig
 */

Twinkle.warn = function twinklewarn() {
	if( mw.config.get('wgNamespaceNumber') === 3 ) {
			Twinkle.addPortletLink( Twinkle.warn.callback, "警告", "tw-warn", "警告或提醒用戶" );
	}

	// modify URL of talk page on rollback success pages
	if( mw.config.get('wgAction') === 'rollback' ) {
		var $vandalTalkLink = $("#mw-rollback-success").find(".mw-usertoollinks a").first();
		$vandalTalkLink.css("font-weight", "bold");
		$vandalTalkLink.wrapInner($("<span/>").attr("title", "如果合適，您可以用Twinkle在該用戶對話頁上做出警告。"));

		var extraParam = "vanarticle=" + mw.util.rawurlencode(Morebits.pageNameNorm);
		var href = $vandalTalkLink.attr("href");
		if (href.indexOf("?") === -1) {
			$vandalTalkLink.attr("href", href + "?" + extraParam);
		} else {
			$vandalTalkLink.attr("href", href + "&" + extraParam);
		}
	}
};

Twinkle.warn.callback = function twinklewarnCallback() {
	if( mw.config.get('wgTitle').split( '/' )[0] === mw.config.get('wgUserName') &&
			!confirm( '您將要警告自己！您確定要繼續嗎？' ) ) {
		return;
	}

	var Window = new Morebits.simpleWindow( 600, 440 );
	Window.setTitle( "警告、通知用戶" );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( "選擇警告級別", "WP:WARN" );
	Window.addFooterLink( "Twinkle幫助", "WP:TW/DOC#warn" );

	var form = new Morebits.quickForm( Twinkle.warn.callback.evaluate );
	var main_select = form.append( {
			type: 'field',
			label: '選擇要發送的警告或通知類別',
			tooltip: '首先選擇一組，再選擇具體的警告模板。'
		} );

	var main_group = main_select.append( {
			type: 'select',
			name: 'main_group',
			event:Twinkle.warn.callback.change_category
		} );

	var defaultGroup = parseInt(Twinkle.getPref('defaultWarningGroup'), 10);
	main_group.append( { type: 'option', label: '層級1', value: 'level1', selected: ( defaultGroup === 1 || defaultGroup < 1 || ( Morebits.userIsInGroup( 'sysop' ) ? defaultGroup > 8 : defaultGroup > 7 ) ) } );
	main_group.append( { type: 'option', label: '層級2', value: 'level2', selected: ( defaultGroup === 2 ) } );
	main_group.append( { type: 'option', label: '層級3', value: 'level3', selected: ( defaultGroup === 3 ) } );
	main_group.append( { type: 'option', label: '層級4', value: 'level4', selected: ( defaultGroup === 4 ) } );
	main_group.append( { type: 'option', label: '層級4im', value: 'level4im', selected: ( defaultGroup === 5 ) } );
	main_group.append( { type: 'option', label: '單層級通知', value: 'singlenotice', selected: ( defaultGroup === 6 ) } );
	main_group.append( { type: 'option', label: '單層級警告', value: 'singlewarn', selected: ( defaultGroup === 7 ) } );
	if( Twinkle.getPref( 'customWarningList' ).length ) {
		main_group.append( { type: 'option', label: '自定義警告', value: 'custom', selected: ( defaultGroup === 9 ) } );
	}
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		main_group.append( { type: 'option', label: '封禁', value: 'block', selected: ( defaultGroup === 8 ) } );
	}

	main_select.append( { type: 'select', name: 'sub_group', event:Twinkle.warn.callback.change_subcategory } ); //Will be empty to begin with.

	form.append( {
			type: 'input',
			name: 'article',
			label: '條目連結',
			value:( Morebits.queryString.exists( 'vanarticle' ) ? Morebits.queryString.get( 'vanarticle' ) : '' ),
			tooltip: '給模板中加入一條目連結，可留空。'
		} );

	var more = form.append( { type: 'field', name: 'reasonGroup', label: '警告信息' } );
	more.append( { type: 'textarea', label: '可選信息：', name: 'reason', tooltip: '理由或是附加信息' } );

	var previewlink = document.createElement( 'a' );
	$(previewlink).click(function(){
		Twinkle.warn.callbacks.preview(result);  // |result| is defined below
	});
	previewlink.style.cursor = "pointer";
	previewlink.textContent = '預覽';
	more.append( { type: 'div', id: 'warningpreview', label: [ previewlink ] } );
	more.append( { type: 'div', id: 'twinklewarn-previewbox', style: 'display: none' } );

	more.append( { type: 'submit', label: '提交' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();
	result.main_group.root = result;
	result.previewer = new Morebits.wiki.preview($(result).find('div#twinklewarn-previewbox').last()[0]);

	// We must init the first choice (General Note);
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.main_group.dispatchEvent( evt );
};

// This is all the messages that might be dispatched by the code
// Each of the individual templates require the following information:
//   label (required): A short description displayed in the dialog
//   summary (required): The edit summary used. If an article name is entered, the summary is postfixed with "on [[article]]", and it is always postfixed with ". $summaryAd"
//   suppressArticleInSummary (optional): Set to true to suppress showing the article name in the edit summary. Useful if the warning relates to attack pages, or some such.
Twinkle.warn.messages = {
	level1: {
		"不同類型的非建設編輯": {
			"uw-vandalism1": {
				label: "破壞",
				summary: "層級1：破壞"
			},
			"uw-test1": {
				label: "編輯測試",
				summary: "層級1：編輯測試"
			},
			"uw-delete1": {
				label: "清空頁面、移除內容或模板",
				summary: "層級1：清空頁面、移除內容或模板"
			},
			"uw-redirect1": {
				label: "創建惡意重定向",
				summary: "層級1：創建惡意重定向"
			},
			"uw-tdel1": {
				label: "移除維護性模板",
				summary: "層級1：移除維護性模板"
			},
			"uw-joke1": {
				label: "加入不當玩笑",
				summary: "層級1：加入不當玩笑"
			},
			"uw-create1": {
				label: "創建不當頁面",
				summary: "層級1：創建不當頁面"
			},
			"uw-upload1": {
				label: "上傳不當圖像",
				summary: "層級1：上傳不當圖像"
			},
			"uw-image1": {
				label: "與圖像相關之破壞",
				summary: "層級1：與圖像相關之破壞"
			}
		},
		"增加商品或政治廣告": {
			"uw-spam1": {
				label: "增加垃圾連結",
				summary: "層級1：增加垃圾連結"
			},
			"uw-advert1": {
				label: "利用維基百科來發佈廣告或推廣",
				summary: "層級1：利用維基百科來發佈廣告或推廣"
			},
			"uw-npov1": {
				label: "不遵守中立的觀點方針",
				summary: "層級1：不遵守中立的觀點方針"
			}
		},
		"加插不實及/或誹謗文字": {
			"uw-unsourced1": {
				label: "沒有使用適當的引用方法而增加沒有來源的資料",
				summary: "層級1：沒有使用適當的引用方法而增加沒有來源的資料"
			},
			"uw-error1": {
				label: "故意加入不實內容",
				summary: "層級1：故意加入不實內容"
			},
			"uw-biog1": {
				label: "加入有關在生人物而又缺乏來源的資料",
				summary: "層級1：加入有關在生人物而又缺乏來源的資料"
			},
			"uw-defamatory1": {
				label: "沒有特定目標的誹謗",
				summary: "層級1：沒有特定目標的誹謗"
			}
		},
		"翻譯品質": {
			"uw-roughtranslation1": {
				label: "粗劣翻譯",
				summary: "層級1：粗劣翻譯"
			}
		},
		"非能接受且違反方針或指引的單方面行為或操作": {
			"uw-notcensored1": {
				label: "資料的審查",
				summary: "層級1：資料的審查"
			},
			"uw-mos1": {
				label: "格式、日期、語言等",
				summary: "層級1：格式、日期、語言等"
			},
			"uw-move1": {
				label: "頁面移動",
				summary: "層級1：頁面移動"
			},
			"uw-cd1": {
				label: "把討論頁清空",
				summary: "層級1：把討論頁清空"
			},
			"uw-chat1": {
				label: "把討論頁當為論壇",
				summary: "層級1：把討論頁當為論壇"
			},
			"uw-tpv1": {
				label: "改寫其他用戶在討論頁留下的意見",
				summary: "層級1：改寫其他用戶在討論頁留下的意見"
			},
			"uw-afd1": {
				label: "移除{{afd}}模板",
				summary: "層級1：移除{{afd}}模板"
			},
			"uw-speedy1": {
				label: "移除{{delete}}模板",
				summary: "層級1：移除{{delete}}模板"
			}
		},
		"對其他用戶和條目的態度": {
			"uw-npa1": {
				label: "針對特定用戶的人身攻擊",
				summary: "層級1：針對特定用戶的人身攻擊"
			},
			"uw-agf1": {
				label: "沒有善意推定",
				summary: "層級1：沒有善意推定"
			},
			"uw-own1": {
				label: "條目的所有權",
				summary: "層級1：條目的所有權"
			},
			"uw-tempabuse1": {
				label: "不當使用警告或封鎖模板",
				summary: "層級1：不當使用警告或封鎖模板"
			}
		}
	},


	level2: {
		"不同類型的非建設編輯": {
			"uw-vandalism2": {
				label: "破壞",
				summary: "層級2：破壞"
			},
			"uw-test2": {
				label: "編輯測試",
				summary: "層級2：編輯測試"
			},
			"uw-delete2": {
				label: "清空頁面、移除內容或模板",
				summary: "層級2：清空頁面、移除內容或模板"
			},
			"uw-redirect2": {
				label: "創建惡意重定向",
				summary: "層級2：創建惡意重定向"
			},
			"uw-tdel2": {
				label: "移除維護性模板",
				summary: "層級2：移除維護性模板"
			},
			"uw-joke2": {
				label: "加入不當玩笑",
				summary: "層級2：加入不當玩笑"
			},
			"uw-create2": {
				label: "創建不當頁面",
				summary: "層級2：創建不當頁面"
			},
			"uw-upload2": {
				label: "上傳不當圖像",
				summary: "層級2：上傳不當圖像"
			},
			"uw-image2": {
				label: "與圖像相關之破壞",
				summary: "層級2：與圖像相關之破壞"
			}
		},
		"增加商品或政治廣告": {
			"uw-spam2": {
				label: "增加垃圾連結",
				summary: "層級2：增加垃圾連結"
			},
			"uw-advert2": {
				label: "利用維基百科來發佈廣告或推廣",
				summary: "層級2：利用維基百科來發佈廣告或推廣"
			},
			"uw-npov2": {
				label: "不遵守中立的觀點方針",
				summary: "層級2：不遵守中立的觀點方針"
			}
		},
		"加插不實及/或誹謗文字": {
			"uw-unsourced2": {
				label: "沒有使用適當的引用方法而增加沒有來源的資料",
				summary: "層級2：沒有使用適當的引用方法而增加沒有來源的資料"
			},
			"uw-error2": {
				label: "故意加入不實內容",
				summary: "層級2：故意加入不實內容"
			},
			"uw-biog2": {
				label: "加入有關在生人物而又缺乏來源的資料",
				summary: "層級2：加入有關在生人物而又缺乏來源的資料"
			},
			"uw-defamatory2": {
				label: "沒有特定目標的誹謗",
				summary: "層級2：沒有特定目標的誹謗"
			}
		},
		"翻譯品質": {
			"uw-roughtranslation2": {
				label: "粗劣翻譯",
				summary: "層級2：粗劣翻譯"
			}
		},
		"非能接受且違反方針或指引的單方面行為或操作": {
			"uw-notcensored2": {
				label: "資料的審查",
				summary: "層級2：資料的審查"
			},
			"uw-mos2": {
				label: "格式、日期、語言等",
				summary: "層級2：格式、日期、語言等"
			},
			"uw-move2": {
				label: "頁面移動",
				summary: "層級2：頁面移動"
			},
			"uw-cd2": {
				label: "把討論頁清空",
				summary: "層級2：把討論頁清空"
			},
			"uw-chat2": {
				label: "把討論頁當為論壇",
				summary: "層級2：把討論頁當為論壇"
			},
			"uw-tpv2": {
				label: "改寫其他用戶在討論頁留下的意見",
				summary: "層級2：改寫其他用戶在討論頁留下的意見"
			},
			"uw-afd2": {
				label: "移除{{afd}}模板",
				summary: "層級2：移除{{afd}}模板"
			},
			"uw-speedy2": {
				label: "移除{{delete}}模板",
				summary: "層級2：移除{{delete}}模板"
			}
		},
		"對其他用戶和條目的態度": {
			"uw-npa2": {
				label: "針對特定用戶的人身攻擊",
				summary: "層級2：針對特定用戶的人身攻擊"
			},
			"uw-agf2": {
				label: "沒有善意推定",
				summary: "層級2：沒有善意推定"
			},
			"uw-own2": {
				label: "條目的所有權",
				summary: "層級2：條目的所有權"
			},
			"uw-tempabuse2": {
				label: "不當使用警告或封鎖模板",
				summary: "層級2：不當使用警告或封鎖模板"
			}
		}
	},


	level3: {
		"不同類型的非建設編輯": {
			"uw-vandalism3": {
				label: "破壞",
				summary: "層級3：破壞"
			},
			"uw-test3": {
				label: "編輯測試",
				summary: "層級3：編輯測試"
			},
			"uw-delete3": {
				label: "清空頁面、移除內容或模板",
				summary: "層級3：清空頁面、移除內容或模板"
			},
			"uw-redirect3": {
				label: "創建惡意重定向",
				summary: "層級3：創建惡意重定向"
			},
			"uw-tdel3": {
				label: "移除維護性模板",
				summary: "層級3：移除維護性模板"
			},
			"uw-joke3": {
				label: "加入不當玩笑",
				summary: "層級3：加入不當玩笑"
			},
			"uw-create3": {
				label: "創建不當頁面",
				summary: "層級3：創建不當頁面"
			},
			"uw-upload3": {
				label: "上傳不當圖像",
				summary: "層級3：上傳不當圖像"
			},
			"uw-image3": {
				label: "與圖像相關之破壞",
				summary: "層級3：與圖像相關之破壞"
			}
		},
		"增加商品或政治廣告": {
			"uw-spam3": {
				label: "增加垃圾連結",
				summary: "層級3：增加垃圾連結"
			},
			"uw-advert3": {
				label: "利用維基百科來發佈廣告或推廣",
				summary: "層級3：利用維基百科來發佈廣告或推廣"
			},
			"uw-npov3": {
				label: "不遵守中立的觀點方針",
				summary: "層級3：不遵守中立的觀點方針"
			}
		},
		"加插不實及/或誹謗文字": {
			"uw-unsourced3": {
				label: "沒有使用適當的引用方法而增加沒有來源的資料",
				summary: "層級3：沒有使用適當的引用方法而增加沒有來源的資料"
			},
			"uw-error3": {
				label: "故意加入不實內容",
				summary: "層級3：故意加入不實內容"
			},
			"uw-biog3": {
				label: "加入有關在生人物而又缺乏來源的資料",
				summary: "層級3：加入有關在生人物而又缺乏來源的資料"
			},
			"uw-defamatory3": {
				label: "沒有特定目標的誹謗",
				summary: "層級3：沒有特定目標的誹謗"
			}
		},
		"翻譯品質": {
			"uw-roughtranslation3": {
				label: "粗劣翻譯",
				summary: "層級3：粗劣翻譯"
			}
		},
		"非能接受且違反方針或指引的單方面行為或操作": {
			"uw-notcensored3": {
				label: "資料的審查",
				summary: "層級3：資料的審查"
			},
			"uw-mos3": {
				label: "格式、日期、語言等",
				summary: "層級3：格式、日期、語言等"
			},
			"uw-move3": {
				label: "頁面移動",
				summary: "層級3：頁面移動"
			},
			"uw-cd3": {
				label: "把討論頁清空",
				summary: "層級3：把討論頁清空"
			},
			"uw-chat3": {
				label: "把討論頁當為論壇",
				summary: "層級3：把討論頁當為論壇"
			},
			"uw-tpv3": {
				label: "改寫其他用戶在討論頁留下的意見",
				summary: "層級3：改寫其他用戶在討論頁留下的意見"
			},
			"uw-afd3": {
				label: "移除{{afd}}模板",
				summary: "層級3：移除{{afd}}模板"
			},
			"uw-speedy3": {
				label: "移除{{delete}}模板",
				summary: "層級3：移除{{delete}}模板"
			}
		},
		"對其他用戶和條目的態度": {
			"uw-npa3": {
				label: "針對特定用戶的人身攻擊",
				summary: "層級3：針對特定用戶的人身攻擊"
			},
			"uw-agf3": {
				label: "沒有善意推定",
				summary: "層級3：沒有善意推定"
			},
			"uw-own3": {
				label: "條目的所有權",
				summary: "層級3：條目的所有權"
			},
			"uw-tempabuse3": {
				label: "不當使用警告或封鎖模板",
				summary: "層級3：不當使用警告或封鎖模板"
			}
		}
	},


	level4: {
		"不同類型的非建設編輯": {
			"uw-vandalism4": {
				label: "破壞",
				summary: "層級4：破壞"
			},
			"uw-test4": {
				label: "編輯測試",
				summary: "層級4：編輯測試"
			},
			"uw-delete4": {
				label: "清空頁面、移除內容或模板",
				summary: "層級4：清空頁面、移除內容或模板"
			},
			"uw-redirect4": {
				label: "創建惡意重定向",
				summary: "層級4：創建惡意重定向"
			},
			"uw-tdel4": {
				label: "移除維護性模板",
				summary: "層級4：移除維護性模板"
			},
			"uw-joke4": {
				label: "加入不當玩笑",
				summary: "層級4：加入不當玩笑"
			},
			"uw-create4": {
				label: "創建不當頁面",
				summary: "層級4：創建不當頁面"
			},
			"uw-upload4": {
				label: "上傳不當圖像",
				summary: "層級4：上傳不當圖像"
			},
			"uw-image4": {
				label: "與圖像相關之破壞",
				summary: "層級4：與圖像相關之破壞"
			}
		},
		"增加商品或政治廣告": {
			"uw-spam4": {
				label: "增加垃圾連結",
				summary: "層級4：增加垃圾連結"
			},
			"uw-advert4": {
				label: "利用維基百科來發佈廣告或推廣",
				summary: "層級4：利用維基百科來發佈廣告或推廣"
			},
			"uw-npov4": {
				label: "不遵守中立的觀點方針",
				summary: "層級4：不遵守中立的觀點方針"
			}
		},
		"加插不實及/或誹謗文字": {
			"uw-biog4": {
				label: "加入有關在生人物而又缺乏來源的資料",
				summary: "層級4：加入有關在生人物而又缺乏來源的資料"
			},
			"uw-defamatory4": {
				label: "沒有特定目標的誹謗",
				summary: "層級4：沒有特定目標的誹謗"
			}
		},
		"非能接受且違反方針或指引的單方面行為或操作": {
			"uw-mos4": {
				label: "格式、日期、語言等",
				summary: "層級4：格式、日期、語言等"
			},
			"uw-move4": {
				label: "頁面移動",
				summary: "層級4：頁面移動"
			},
			"uw-chat4": {
				label: "把討論頁當為論壇",
				summary: "層級4：把討論頁當為論壇"
			},
			"uw-afd4": {
				label: "移除{{afd}}模板",
				summary: "層級4：移除{{afd}}模板"
			},
			"uw-speedy4": {
				label: "移除{{delete}}模板",
				summary: "層級4：移除{{delete}}模板"
			}
		},
		"對其他用戶和條目的態度": {
			"uw-npa4": {
				label: "針對特定用戶的人身攻擊",
				summary: "層級4：針對特定用戶的人身攻擊"
			},
			"uw-tempabuse4": {
				label: "不當使用警告或封鎖模板",
				summary: "層級4：不當使用警告或封鎖模板"
			}
		}
	},


	level4im: {
		"不同類型的非建設編輯": {
			"uw-vandalism4im": {
				label: "破壞",
				summary: "層級4im：破壞"
			},
			"uw-delete4im": {
				label: "清空頁面、移除內容或模板",
				summary: "層級4im：清空頁面、移除內容或模板"
			},
			"uw-redirect4im": {
				label: "創建惡意重定向",
				summary: "層級4im：創建惡意重定向"
			},
			"uw-joke4im": {
				label: "加入不當玩笑",
				summary: "層級4im：加入不當玩笑"
			},
			"uw-create4im": {
				label: "創建不當頁面",
				summary: "層級4im：創建不當頁面"
			},
			"uw-upload4im": {
				label: "上傳不當圖像",
				summary: "層級4im：上傳不當圖像"
			},
			"uw-image4im": {
				label: "與圖像相關之破壞",
				summary: "層級4im：與圖像相關之破壞"
			}
		},
		"增加商品或政治廣告": {
			"uw-spam4im": {
				label: "增加垃圾連結",
				summary: "層級4im：增加垃圾連結"
			}
		},
		"加插不實及/或誹謗文字": {
			"uw-biog4im": {
				label: "加入有關在生人物而又缺乏來源的資料",
				summary: "層級4im：加入有關在生人物而又缺乏來源的資料"
			},
			"uw-defamatory4im": {
				label: "沒有特定目標的誹謗",
				summary: "層級4im：沒有特定目標的誹謗"
			}
		},
		"非能接受且違反方針或指引的單方面行為或操作": {
			"uw-move4im": {
				label: "頁面移動",
				summary: "層級4im：頁面移動"
			}
		},
		"對其他用戶和條目的態度": {
			"uw-npa4im": {
				label: "針對特定用戶的人身攻擊",
				summary: "層級4im：針對特定用戶的人身攻擊"
			},
			"uw-tempabuse4im": {
				label: "不當使用警告或封鎖模板",
				summary: "層級4im：不當使用警告或封鎖模板"
			}
		}
	},


	singlenotice: {
		"uw-2redirect": {
			label: "透過不適當的頁面移動建立雙重重定向",
			summary: "單層級通知：透過不適當的頁面移動建立雙重重定向"
		},
		"uw-aiv": {
			label: "不恰當的破壞回報",
			summary: "單層級通知：不恰當的破壞回報"
		},
		"uw-articlesig": {
			label: "在條目頁中籤名",
			summary: "單層級通知：在條目頁中籤名"
		},
		"uw-autobiography": {
			label: "建立自傳",
			summary: "單層級通知：建立自傳"
		},
		"uw-badcat": {
			label: "加入錯誤的頁面分類",
			summary: "單層級通知：加入錯誤的頁面分類"
		},
		"uw-bite": {
			label: "傷害新手",
			summary: "單層級通知：傷害新手"
		},
		"uw-booktitle": {
			label: "沒有使用書名號來標示書籍、電影、音樂專輯等",
			summary: "單層級通知：沒有使用書名號來標示書籍、電影、音樂專輯等"
		},
		"uw-c&pmove": {
			label: "剪貼移動",
			summary: "單層級通知：剪貼移動"
		},
		"uw-chinese": {
			label: "不是以中文進行溝通",
			summary: "單層級通知：不是以中文進行溝通"
		},
		"uw-coi": {
			label: "利益衝突",
			summary: "單層級通知：利益衝突"
		},
		"uw-copyright-friendly": {
			label: "初次加入侵犯版權的內容",
			summary: "單層級通知：初次加入侵犯版權的內容"
		},
		"uw-copyviorewrite": {
			label: "在侵權頁面直接重寫條目",
			summary: "單層級通知：在侵權頁面直接重寫條目"
		},
		"uw-date": {
			label: "不必要地更換日期格式",
			summary: "單層級通知：不必要地更換日期格式"
		},
		"uw-editsummary": {
			label: "沒有使用編輯摘要",
			summary: "單層級通知：沒有使用編輯摘要"
		},
		"uw-hangon": {
			label: "沒有在討論頁說明暫緩快速刪除理由",
			summary: "單層級通知：沒有在討論頁說明暫緩快速刪除理由"
		},
		"uw-lang": {
			label: "不必要地將條目所有文字換成簡體或繁體中文",
			summary: "單層級通知：不必要地將條目所有文字換成簡體或繁體中文"
		},
		"uw-langmove": {
			label: "不必要地將條目標題換成簡體或繁體中文",
			summary: "單層級通知：不必要地將條目標題換成簡體或繁體中文"
		},
		"uw-linking": {
			label: "過度加入紅字連結或重複藍字連結",
			summary: "單層級通知：過度加入紅字連結或重複藍字連結"
		},
		"uw-minor": {
			label: "不適當地使用小修改選項",
			summary: "單層級通知：不適當地使用小修改選項"
		},
		"uw-notaiv": {
			label: "不要向當前的破壞回報複雜的用戶紛爭",
			summary: "單層級通知：不要向當前的破壞回報複雜的用戶紛爭"
		},
		"uw-notvote": {
			label: "我們是以共識處事，不僅是投票",
			summary: "單層級通知：我們是以共識處事，不僅是投票"
		},
		"uw-preview": {
			label: "使用預覽按鈕來避免不必要的錯誤",
			summary: "單層級通知：使用預覽按鈕來避免不必要的錯誤"
		},
		"uw-sandbox": {
			label: "移除沙盒的置頂模板{{sandbox}}",
			summary: "單層級通知：移除沙盒的置頂模板{{sandbox}}"
		},
		"uw-selfrevert": {
			label: "回退個人的測試",
			summary: "單層級通知：回退個人的測試"
		},
		"uw-subst": {
			label: "謹記要替代模板",
			summary: "單層級通知：謹記要替代模板"
		},
		"uw-talkinarticle": {
			label: "在條目頁中留下意見",
			summary: "單層級通知：在條目頁中留下意見"
		},
		"uw-tilde": {
			label: "沒有在討論頁上簽名",
			summary: "單層級通知：沒有在討論頁上簽名"
		},
		"uw-uaa": {
			label: "向更改用戶名回報的用戶名稱並不違反方針",
			summary: "單層級通知：向更改用戶名回報的用戶名稱並不違反方針"
		},
		"uw-warn": {
			label: "警告破壞用戶",
			summary: "單層級通知：警告破壞用戶"
		}
	},


	singlewarn: {
		"uw-3rr": {
			label: "用戶潛在違反回退不過三原則的可能性",
			summary: "單層級警告：用戶潛在違反回退不過三原則的可能性"
		},
		"uw-attack": {
			label: "建立人身攻擊頁面",
			summary: "單層級警告：建立人身攻擊頁面",
			suppressArticleInSummary: true
		},
		"uw-bv": {
			label: "公然的破壞",
			summary: "單層級警告：公然的破壞"
		},
		"uw-canvass": {
			label: "不恰當的拉票",
			summary: "單層級警告：不恰當的拉票"
		},
		"uw-copyright": {
			label: "侵犯版權",
			summary: "單層級警告：侵犯版權"
		},
		"uw-copyright-link": {
			label: "連結到有版權的材料",
			summary: "單層級警告：連結到有版權的材料"
		},
		"uw-hoax": {
			label: "建立惡作劇",
			summary: "單層級警告：建立惡作劇"
		},
		"uw-legal": {
			label: "訴諸法律威脅",
			summary: "單層級警告：訴諸法律威脅"
		},
		"uw-longterm": {
			label: "長期的破壞",
			summary: "單層級警告：長期的破壞"
		},
		"uw-multipleIPs": {
			label: "使用多個IP地址",
			summary: "單層級警告：使用多個IP地址"
		},
		"uw-npov-tvd": {
			label: "在劇集條目中加入奸角等非中立描述",
			summary: "單層級警告：在劇集條目中加入奸角等非中立描述"
		},
		"uw-pinfo": {
			label: "個人資料",
			summary: "單層級警告：個人資料"
		},
		"uw-upv": {
			label: "用戶頁破壞",
			summary: "單層級警告：用戶頁破壞"
		},
		"uw-substub": {
			label: "創建小小作品",
			summary: "單層級警告：創建小小作品"
		},
		"uw-username": {
			label: "不恰當的用戶名",
			summary: "單層級警告：不恰當的用戶名"
		},
		"uw-wrongsummary": {
			label: "在編輯摘要製造不適當的內容",
			summary: "單層級警告：在編輯摘要製造不適當的內容"
		}
	},


	block: {
		"uw-block1": {
			label: "層級1封禁",
			summary: "層級1封禁",
			reasonParam: true
		},
		"uw-block2": {
			label: "層級2封禁",
			summary: "層級2封禁",
			reasonParam: true
		},
		"uw-block3": {
			label: "層級3封禁",
			summary: "層級3封禁",
			reasonParam: true,
			indefinite: true
		},
		"uw-3block": {
			label: "回退不過三原則封禁",
			summary: "回退不過三原則封禁",
			reasonParam: true,
		},
		"uw-ablock": {
			label: "匿名封禁",
			summary: "匿名封禁",
			reasonParam: true,
		},
		"uw-bblock": {
			label: "機器人失靈封禁",
			summary: "機器人失靈封禁"
		},
		"uw-dblock": {
			label: "刪除封禁",
			summary: "刪除封禁"
		},
		"uw-sblock": {
			label: "廣告封禁",
			summary: "廣告封禁"
		},
		"uw-ublock": {
			label: "用戶名稱封禁",
			summary: "用戶名稱封禁",
			indefinite: true
		},
		"uw-vblock": {
			label: "破壞封禁",
			summary: "破壞封禁"
		},
		"uw-cblock": {
			label: "用戶核查封禁",
			summary: "用戶核查封禁",
			indefinite: true
		}
	}
};

Twinkle.warn.prev_block_timer = null;
Twinkle.warn.prev_block_reason = null;
Twinkle.warn.prev_article = null;
Twinkle.warn.prev_reason = null;

Twinkle.warn.callback.change_category = function twinklewarnCallbackChangeCategory(e) {
	var value = e.target.value;
	var sub_group = e.target.root.sub_group;
	sub_group.main_group = value;
	var old_subvalue = sub_group.value;
	var old_subvalue_re;
	if( old_subvalue ) {
		old_subvalue = old_subvalue.replace(/\d*(im)?$/, '' );
		old_subvalue_re = new RegExp( $.escapeRE( old_subvalue ) + "(\\d*(?:im)?)$" );
	}

	while( sub_group.hasChildNodes() ){
		sub_group.removeChild( sub_group.firstChild );
	}

	// worker function to create the combo box entries
	var createEntries = function( contents, container ) {
		$.each( contents, function( itemKey, itemProperties ) {
			var key = (typeof itemKey === "string") ? itemKey : itemProperties.value;

			var selected = false;
			if( old_subvalue && old_subvalue_re.test( key ) ) {
				selected = true;
			}

			var elem = new Morebits.quickForm.element( {
				type: 'option',
				label: "{{" + key + "}}: " + itemProperties.label,
				value: key,
				selected: selected
			} );
			var elemRendered = container.appendChild( elem.render() );
			$(elemRendered).data("messageData", itemProperties);
		} );
	};

	if( value === "singlenotice" || value === "singlewarn" || value === "block" ) {
		// no categories, just create the options right away
		createEntries( Twinkle.warn.messages[ value ], sub_group );
	} else if( value === "custom" ) {
		createEntries( Twinkle.getPref("customWarningList"), sub_group );
	} else {
		// create the option-groups
		$.each( Twinkle.warn.messages[ value ], function( groupLabel, groupContents ) {
			var optgroup = new Morebits.quickForm.element( {
				type: 'optgroup',
				label: groupLabel
			} );
			optgroup = optgroup.render();
			sub_group.appendChild( optgroup );
			// create the options
			createEntries( groupContents, optgroup );
		} );
	}

	if( value === 'block' ) {
		// create the block-related fields
		var more = new Morebits.quickForm.element( { type: 'div', id: 'block_fields' } );
		more.append( {
			type: 'input',
			name: 'block_timer',
			label: '封禁時間： ',
			tooltip: '例如24小時、2天等…'
		} );
		more.append( {
			type: 'input',
			name: 'block_reason',
			label: '「由於……您已被封禁」',
			tooltip: '可選的理由。'
		} );
		e.target.root.insertBefore( more.render(), e.target.root.lastChild );

		// restore saved values of fields
		if(Twinkle.warn.prev_block_timer !== null) {
			e.target.root.block_timer.value = Twinkle.warn.prev_block_timer;
			Twinkle.warn.prev_block_timer = null;
		}
		if(Twinkle.warn.prev_block_reason !== null) {
			e.target.root.block_reason.value = Twinkle.warn.prev_block_reason;
			Twinkle.warn.prev_block_reason = null;
		}
		if(Twinkle.warn.prev_article === null) {
			Twinkle.warn.prev_article = e.target.root.article.value;
		}
		e.target.root.article.disabled = false;

		$(e.target.root.reason).parent().hide();
		e.target.root.previewer.closePreview();
	} else if( e.target.root.block_timer ) {
		// hide the block-related fields
		if(!e.target.root.block_timer.disabled && Twinkle.warn.prev_block_timer === null) {
			Twinkle.warn.prev_block_timer = e.target.root.block_timer.value;
		}
		if(!e.target.root.block_reason.disabled && Twinkle.warn.prev_block_reason === null) {
			Twinkle.warn.prev_block_reason = e.target.root.block_reason.value;
		}

		// hack to fix something really weird - removed elements seem to somehow keep an association with the form
		e.target.root.block_reason = null;

		$(e.target.root).find("#block_fields").remove();

		if(e.target.root.article.disabled && Twinkle.warn.prev_article !== null) {
			e.target.root.article.value = Twinkle.warn.prev_article;
			Twinkle.warn.prev_article = null;
		}
		e.target.root.article.disabled = false;

		$(e.target.root.reason).parent().show();
		e.target.root.previewer.closePreview();
	}

	// clear overridden label on article textbox
	Morebits.quickForm.setElementTooltipVisibility(e.target.root.article, true);
	Morebits.quickForm.resetElementLabel(e.target.root.article);

	// hide the big red notice
	$("#tw-warn-red-notice").remove();
};

Twinkle.warn.callback.change_subcategory = function twinklewarnCallbackChangeSubcategory(e) {
	var main_group = e.target.form.main_group.value;
	var value = e.target.form.sub_group.value;

	if( main_group === 'singlenotice' || main_group === 'singlewarn' ) {
		if( value === 'uw-bite' || value === 'uw-username' || value === 'uw-socksuspect' ) {
			if(Twinkle.warn.prev_article === null) {
				Twinkle.warn.prev_article = e.target.form.article.value;
			}
			e.target.form.article.notArticle = true;
			e.target.form.article.value = '';
		} else if( e.target.form.article.notArticle ) {
			if(Twinkle.warn.prev_article !== null) {
				e.target.form.article.value = Twinkle.warn.prev_article;
				Twinkle.warn.prev_article = null;
			}
			e.target.form.article.notArticle = false;
		}
	} else if( main_group === 'block' ) {
		if( Twinkle.warn.messages.block[value].indefinite ) {
			if(Twinkle.warn.prev_block_timer === null) {
				Twinkle.warn.prev_block_timer = e.target.form.block_timer.value;
			}
			e.target.form.block_timer.disabled = true;
			e.target.form.block_timer.value = 'indefinite';
		} else if( e.target.form.block_timer.disabled ) {
			if(Twinkle.warn.prev_block_timer !== null) {
				e.target.form.block_timer.value = Twinkle.warn.prev_block_timer;
				Twinkle.warn.prev_block_timer = null;
			}
			e.target.form.block_timer.disabled = false;
		}

		if( Twinkle.warn.messages.block[value].pageParam ) {
			if(Twinkle.warn.prev_article !== null) {
				e.target.form.article.value = Twinkle.warn.prev_article;
				Twinkle.warn.prev_article = null;
			}
			e.target.form.article.disabled = false;
		} else if( !e.target.form.article.disabled ) {
			if(Twinkle.warn.prev_article === null) {
				Twinkle.warn.prev_article = e.target.form.article.value;
			}
			e.target.form.article.disabled = true;
			e.target.form.article.value = '';
		}

		if( Twinkle.warn.messages.block[value].reasonParam ) {
			if(Twinkle.warn.prev_block_reason !== null) {
				e.target.form.block_reason.value = Twinkle.warn.prev_block_reason;
				Twinkle.warn.prev_block_reason = null;
			}
			e.target.form.block_reason.disabled = false;
		} else if( !e.target.form.block_reason.disabled ) {
			if(Twinkle.warn.prev_block_reason === null) {
				Twinkle.warn.prev_block_reason = e.target.form.block_reason.value;
			}
			e.target.form.block_reason.disabled = true;
			e.target.form.block_reason.value = '';
		}
	}

	// change form labels according to the warning selected
	if (value === "uw-socksuspect") {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, false);
		Morebits.quickForm.overrideElementLabel(e.target.form.article, "傀儡操縱者用戶名，如知曉（不含User:） ");
	} else if (value === "uw-username") {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, false);
		Morebits.quickForm.overrideElementLabel(e.target.form.article, "用戶名違反方針，因為… ");
	} else if (value === "uw-bite") {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, false);
		Morebits.quickForm.overrideElementLabel(e.target.form.article, "被「咬到」的用戶（不含User:） ");
	} else {
		Morebits.quickForm.setElementTooltipVisibility(e.target.form.article, true);
		Morebits.quickForm.resetElementLabel(e.target.form.article);
	}

	// add big red notice, warning users about how to use {{uw-[coi-]username}} appropriately
	$("#tw-warn-red-notice").remove();

	var $redWarning;
	if (value === "uw-username") {
		$redWarning = $("<div style='color: red;' id='tw-warn-red-notice'>{{uw-username}}<b>不應</b>被用於<b>明顯</b>違反用戶名方針的用戶。" +
			"明顯的違反方針應被報告給UAA。" +
			"{{uw-username}}應只被用在邊界情況下需要與用戶討論時。</div>");
		$redWarning.insertAfter(Morebits.quickForm.getElementLabelObject(e.target.form.reasonGroup));
	};
};

Twinkle.warn.callbacks = {
	getWarningWikitext: function(templateName, article, reason) {
		var text = "{{subst:" + templateName;

		if (article) {
			// add linked article for user warnings (non-block templates)
			text += '|1=' + article;
		}

		// add extra message for non-block templates
		if (reason) {
			text += "|2=" + reason;
		}
		text += '}}';

		return text;
	},
	getBlockNoticeWikitext: function(templateName, article, blockTime, blockReason, isIndefTemplate) {
		var text = "{{subst:" + templateName;

		if (article && Twinkle.warn.messages.block[templateName].pageParam) {
			text += '|page=' + article;
		}

		if (!/te?mp|^\s*$|min/.exec(blockTime) && !isIndefTemplate) {
			if (/indef|\*|max/.exec(blockTime)) {
				text += '|indef=yes';
			} else {
				text += '|time=' + blockTime;
			}
		}

		if (blockReason) {
			text += '|reason=' + blockReason;
		}

		text += "|sig=true}}";
		return text;
	},
	preview: function(form) {
		var templatename = form.sub_group.value;
		var linkedarticle = form.article.value;
		var templatetext;

		if (templatename in Twinkle.warn.messages.block) {
			templatetext = Twinkle.warn.callbacks.getBlockNoticeWikitext(templatename, linkedarticle, form.block_timer.value,
				form.block_reason.value, Twinkle.warn.messages.block[templatename].indefinite);
		} else {
			templatetext = Twinkle.warn.callbacks.getWarningWikitext(templatename, linkedarticle, form.reason.value);
		}

		form.previewer.beginRender(templatetext);
	},
	main: function( pageobj ) {
		var text = pageobj.getPageText();
		var params = pageobj.getCallbackParameters();
		var messageData = params.messageData;

		var history_re = /<!-- Template:(uw-.*?) -->.*?(\d{4})年(\d{1,2})月(\d{1,2})日 \([日一二三四五六]\) (\d{1,2}):(\d{1,2}) \(UTC\)/g;
		var history = {};
		var latest = { date: new Date( 0 ), type: '' };
		var current;

		while( ( current = history_re.exec( text ) ) ) {
			var current_date = new Date( current[2] + '-' + current[3] + '-' + current[4] + ' ' + current[5] + ':' + current[6] + ' UTC' );
			if( !( current[1] in history ) ||  history[ current[1] ] < current_date ) {
				history[ current[1] ] = current_date;
			}
			if( current_date > latest.date ) {
				latest.date = current_date;
				latest.type = current[1];
			}
		}

		var date = new Date();

		if( params.sub_group in history ) {
			var temp_time = new Date( history[ params.sub_group ] );
			temp_time.setUTCHours( temp_time.getUTCHours() + 24 );

			if( temp_time > date ) {
				if( !confirm( "近24小時內一個同樣的 " + params.sub_group + " 模板已被發出。\n是否繼續？" ) ) {
					pageobj.statelem.info( '用戶取消' );
					return;
				}
			}
		}

		latest.date.setUTCMinutes( latest.date.getUTCMinutes() + 1 ); // after long debate, one minute is max

		if( latest.date > date ) {
			if( !confirm( "近1分鐘內一個同樣的 " + latest.type + " 模板已被發出。\n是否繼續？" ) ) {
				pageobj.statelem.info( '用戶取消' );
				return;
			}
		}

		var headerRe = new RegExp( "^==+\\s*" + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月" + "\\s*==+", 'm' );

		if( text.length > 0 ) {
			text += "\n\n";
		}

		if( params.main_group === 'block' ) {
			if( Twinkle.getPref('blankTalkpageOnIndefBlock') && ( messageData.indefinite || (/indef|\*|max/).exec( params.block_timer ) ) ) {
				Morebits.status.info( '信息', '根據參數設置清空討論頁並創建新標題' );
				text = "== " + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月 " + " ==\n";
			} else if( !headerRe.exec( text ) ) {
				Morebits.status.info( '信息', '未找到當月標題，將創建新的' );
				text += "== " + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月 " + " ==\n";
			}

			text += Twinkle.warn.callbacks.getBlockNoticeWikitext(params.sub_group, params.article, params.block_timer, params.reason, messageData.indefinite);
		} else {
			if( !headerRe.exec( text ) ) {
				Morebits.status.info( '信息', '未找到當月標題，將創建新的' );
				text += "== " + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月 " + " ==\n";
			}
			text += Twinkle.warn.callbacks.getWarningWikitext(params.sub_group, params.article, params.reason) + "--~~~~";
		}

		if ( Twinkle.getPref('showSharedIPNotice') && Morebits.isIPAddress( mw.config.get('wgTitle') ) ) {
			Morebits.status.info( '信息', '添加共享IP說明' );
			text +=  "\n{{subst:SharedIPAdvice}}";
		}

		// build the edit summary
		var summary;
		if( params.main_group === 'custom' ) {
			switch( params.sub_group.substr( -1 ) ) {
				case "1":
					summary = "提醒";
					break;
				case "2":
					summary = "注意";
					break;
				case "3":
					summary = "警告";
					break;
				case "4":
					summary = "最後警告";
					break;
				case "m":
					if( params.sub_group.substr( -3 ) === "4im" ) {
						summary = "唯一警告";
						break;
					}
					summary = "提示";
					break;
				default:
					summary = "提示";
					break;
			}
			summary += "：" + Morebits.string.toUpperCaseFirstChar(messageData.label);
		} else {
			summary = messageData.summary;
			if ( messageData.suppressArticleInSummary !== true && params.article ) {
				if ( params.sub_group === "uw-socksuspect" ) {  // this template requires a username
					summary += "，[[User:" + params.article + "]]的";
				} else {
					summary += "，於[[" + params.article + "]]";
				}
			}
		}
		summary += "。" + Twinkle.getPref("summaryAd");

		pageobj.setPageText( text );
		pageobj.setEditSummary( summary );
		pageobj.setWatchlist( Twinkle.getPref('watchWarnings') );
		pageobj.save();
	}
};

Twinkle.warn.callback.evaluate = function twinklewarnCallbackEvaluate(e) {

	// First, check to make sure a reason was filled in if uw-username was selected

	if(e.target.sub_group.value === 'uw-username' && e.target.article.value.trim() === '') {
		alert("必須給{{uw-username}}提供理由。");
		return;
	}

	// Find the selected <option> element so we can fetch the data structure
	var selectedEl = $(e.target.sub_group).find('option[value="' + $(e.target.sub_group).val() + '"]');

	// Then, grab all the values provided by the form
	var params = {
		reason: e.target.block_reason ? e.target.block_reason.value : e.target.reason.value,
		main_group: e.target.main_group.value,
		sub_group: e.target.sub_group.value,
		article: e.target.article.value,  // .replace( /^(Image|Category):/i, ':$1:' ),  -- apparently no longer needed...
		block_timer: e.target.block_timer ? e.target.block_timer.value : null,
		messageData: selectedEl.data("messageData")
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "警告完成，將在幾秒後刷新";

	var wikipedia_page = new Morebits.wiki.page( mw.config.get('wgPageName'), '用戶對話頁修改' );
	wikipedia_page.setCallbackParameters( params );
	wikipedia_page.setFollowRedirect( true );
	wikipedia_page.load( Twinkle.warn.callbacks.main );
};
})(jQuery);


//</nowiki>
